const { db } = require('../../database/db');

// 'fiado' não entra aqui: venda no fiado só é criada pelo módulo de fiado
const FORMAS_PAGAMENTO = ['dinheiro', 'pix', 'debito', 'credito', 'voucher'];

// Arredonda para centavos, evitando acúmulo de erro de ponto flutuante (0.1 + 0.2)
function arredondar(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function buscarProdutoPorCodigo(codigo) {
  try {
    const produto = db.prepare(
      'SELECT * FROM produtos WHERE codigo_barras = ? AND ativo = 1'
    ).get(codigo);

    if (!produto) {
      return { sucesso: false, erro: 'Produto não encontrado' };
    }

    return { sucesso: true, dados: produto };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function buscarProdutos(termo) {
  try {
    const busca = `%${termo}%`;
    const produtos = db.prepare(`
      SELECT * FROM produtos
      WHERE ativo = 1
      AND (nome LIKE ? OR codigo_barras LIKE ?)
      ORDER BY nome ASC
      LIMIT 20
    `).all(busca, busca);

    return { sucesso: true, dados: produtos };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

// A interface envia apenas o que o operador escolheu (produto, quantidade,
// desconto, forma de pagamento, valor recebido). Preços e totais são sempre
// recalculados aqui a partir do banco.
function finalizarVenda(dadosVenda) {
  const inserirVenda = db.prepare(`
    INSERT INTO vendas (subtotal, desconto, total, forma_pagamento, valor_pago, troco)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const inserirItem = db.prepare(`
    INSERT INTO venda_itens (venda_id, produto_id, nome_produto, preco_unitario, quantidade, subtotal)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const atualizarEstoque = db.prepare(`
    UPDATE produtos SET estoque_atual = estoque_atual - ?, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const buscarProduto = db.prepare(
    'SELECT nome, preco_venda, estoque_atual FROM produtos WHERE id = ? AND ativo = 1'
  );

  const transacao = db.transaction(() => {
    if (!Array.isArray(dadosVenda.itens) || dadosVenda.itens.length === 0) {
      throw new Error('A venda não tem itens');
    }
    if (!FORMAS_PAGAMENTO.includes(dadosVenda.forma_pagamento)) {
      throw new Error('Forma de pagamento inválida');
    }

    // Soma a quantidade por produto: o mesmo produto pode aparecer em mais de uma linha
    const quantidadePorProduto = new Map();
    const itens = [];

    for (const item of dadosVenda.itens) {
      const quantidade = Number(item.quantidade);
      if (!(quantidade > 0)) {
        throw new Error(`Quantidade inválida para "${item.nome_produto}"`);
      }

      if (item.produto_id) {
        const produto = buscarProduto.get(item.produto_id);
        if (!produto) {
          throw new Error(`Produto "${item.nome_produto}" não encontrado ou inativo`);
        }

        const totalProduto = (quantidadePorProduto.get(item.produto_id) || 0) + quantidade;
        if (produto.estoque_atual < totalProduto) {
          throw new Error(`Estoque insuficiente para "${produto.nome}" (disponível: ${produto.estoque_atual})`);
        }
        quantidadePorProduto.set(item.produto_id, totalProduto);

        itens.push({
          produto_id: item.produto_id,
          nome_produto: produto.nome,
          preco_unitario: produto.preco_venda,
          quantidade,
          subtotal: arredondar(produto.preco_venda * quantidade)
        });
      } else {
        // Item avulso: o preço é digitado pelo operador, não existe no banco
        const descricao = String(item.nome_produto || '').trim();
        const preco = Number(item.preco_unitario);
        if (!descricao) {
          throw new Error('Item avulso sem descrição');
        }
        if (!(preco > 0)) {
          throw new Error(`Valor inválido para o item avulso "${descricao}"`);
        }

        itens.push({
          produto_id: null,
          nome_produto: descricao,
          preco_unitario: preco,
          quantidade,
          subtotal: arredondar(preco * quantidade)
        });
      }
    }

    const subtotal = arredondar(itens.reduce((soma, item) => soma + item.subtotal, 0));
    const desconto = arredondar(Number(dadosVenda.desconto) || 0);
    if (desconto < 0 || desconto > subtotal) {
      throw new Error('Desconto inválido: deve estar entre zero e o subtotal da venda');
    }
    const total = arredondar(subtotal - desconto);

    let valorPago = total;
    let troco = 0;
    if (dadosVenda.forma_pagamento === 'dinheiro') {
      valorPago = arredondar(Number(dadosVenda.valor_pago) || 0);
      if (valorPago < total) {
        throw new Error('Valor recebido é menor que o total da venda');
      }
      troco = arredondar(valorPago - total);
    }

    const resultadoVenda = inserirVenda.run(
      subtotal, desconto, total, dadosVenda.forma_pagamento, valorPago, troco
    );
    const vendaId = resultadoVenda.lastInsertRowid;

    for (const item of itens) {
      inserirItem.run(vendaId, item.produto_id, item.nome_produto, item.preco_unitario, item.quantidade, item.subtotal);
      if (item.produto_id) {
        atualizarEstoque.run(item.quantidade, item.produto_id);
      }
    }

    return { venda_id: vendaId, total, troco };
  });

  try {
    const dados = transacao();
    return { sucesso: true, dados };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function listarVendas(periodo) {
  try {
    const inicio = periodo.inicio + ' 00:00:00';
    const fim = periodo.fim + ' 23:59:59';

    // origem: de onde a venda veio (PDV, comanda ou fiado), para o operador reconhecer
    const vendas = db.prepare(`
      SELECT
        v.id, v.data_hora, v.subtotal, v.desconto, v.total, v.forma_pagamento,
        v.valor_pago, v.troco, v.status, v.cancelada_em, v.motivo_cancelamento,
        (SELECT COUNT(*) FROM venda_itens vi WHERE vi.venda_id = v.id) AS qtd_itens,
        c.nome_cliente AS comanda_cliente,
        c.mesa AS comanda_mesa,
        (SELECT cl.nome FROM fiado_lancamentos fl
           JOIN clientes cl ON cl.id = fl.cliente_id
          WHERE fl.venda_id = v.id LIMIT 1) AS fiado_cliente
      FROM vendas v
      LEFT JOIN comandas c ON c.venda_id = v.id
      WHERE datetime(v.data_hora, 'localtime') BETWEEN ? AND ?
      ORDER BY v.data_hora DESC, v.id DESC
    `).all(inicio, fim);

    return { sucesso: true, dados: vendas };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function buscarItensVenda(vendaId) {
  try {
    const itens = db.prepare('SELECT * FROM venda_itens WHERE venda_id = ? ORDER BY id').all(vendaId);
    return { sucesso: true, dados: itens };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

// Executa o cancelamento dentro de uma transação já aberta. Usado também pelo
// módulo de fiado ao remover um débito vinculado a uma venda.
function cancelarVendaInterno(vendaId, motivo) {
  const venda = db.prepare('SELECT id, status FROM vendas WHERE id = ?').get(vendaId);
  if (!venda) {
    throw new Error('Venda não encontrada');
  }
  if (venda.status === 'cancelada') {
    throw new Error('Esta venda já foi cancelada');
  }

  const itens = db.prepare('SELECT produto_id, quantidade FROM venda_itens WHERE venda_id = ?').all(vendaId);
  const devolverEstoque = db.prepare(`
    UPDATE produtos SET estoque_atual = estoque_atual + ?, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  for (const item of itens) {
    if (item.produto_id) {
      devolverEstoque.run(item.quantidade, item.produto_id);
    }
  }

  // Venda no fiado: o débito do cliente deixa de existir. Pagamentos já feitos
  // pelo cliente não são tocados (eles abatem o saldo geral, não uma venda).
  db.prepare("DELETE FROM fiado_lancamentos WHERE venda_id = ? AND tipo = 'debito'").run(vendaId);

  db.prepare(`
    UPDATE vendas
    SET status = 'cancelada', cancelada_em = CURRENT_TIMESTAMP, motivo_cancelamento = ?
    WHERE id = ?
  `).run(motivo || null, vendaId);
}

function cancelarVenda(vendaId, motivo) {
  try {
    db.transaction(() => cancelarVendaInterno(vendaId, motivo))();
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

module.exports = {
  FORMAS_PAGAMENTO,
  arredondar,
  buscarProdutoPorCodigo,
  buscarProdutos,
  finalizarVenda,
  listarVendas,
  buscarItensVenda,
  cancelarVenda,
  cancelarVendaInterno
};
