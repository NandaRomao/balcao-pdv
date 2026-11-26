const { db } = require('../../database/db');
const { FORMAS_PAGAMENTO, arredondar } = require('../vendas/vendas.handler');

function listarComandasAbertas() {
  try {
    const comandas = db.prepare(`
      SELECT id, nome_cliente, mesa, aberta_em
      FROM comandas
      WHERE status = 'aberta'
      ORDER BY aberta_em ASC
    `).all();

    const resultado = comandas.map(comanda => {
      const itens = db.prepare(`
        SELECT subtotal FROM comanda_itens WHERE comanda_id = ?
      `).all(comanda.id);

      const totalParcial = itens.reduce((soma, item) => soma + item.subtotal, 0);
      const qtdItens = itens.length;

      return {
        id: comanda.id,
        nome_cliente: comanda.nome_cliente,
        mesa: comanda.mesa,
        total_parcial: totalParcial,
        qtd_itens: qtdItens,
        aberta_em: comanda.aberta_em
      };
    });

    return { sucesso: true, dados: resultado };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function criarComanda(dados) {
  try {
    if (!dados.nome_cliente && !dados.mesa) {
      return { sucesso: false, erro: 'Informe o nome do cliente ou a mesa' };
    }

    const inserir = db.prepare(`
      INSERT INTO comandas (nome_cliente, mesa, observacao)
      VALUES (?, ?, ?)
    `);
    const resultado = inserir.run(dados.nome_cliente, dados.mesa, dados.observacao);

    return { sucesso: true, dados: { id: resultado.lastInsertRowid } };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function buscarDetalheComanda(id) {
  try {
    const comanda = db.prepare(`
      SELECT * FROM comandas WHERE id = ?
    `).get(id);

    if (!comanda) {
      return { sucesso: false, erro: 'Comanda não encontrada' };
    }

    const itens = db.prepare(`
      SELECT * FROM comanda_itens
      WHERE comanda_id = ?
      ORDER BY adicionado_em ASC
    `).all(id);

    const totalParcial = itens.reduce((soma, item) => soma + item.subtotal, 0);

    return {
      sucesso: true,
      dados: {
        ...comanda,
        itens,
        total_parcial: totalParcial
      }
    };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function buscarComandaAberta(comandaId) {
  const comanda = db.prepare("SELECT id FROM comandas WHERE id = ? AND status = 'aberta'").get(comandaId);
  if (!comanda) {
    throw new Error('Comanda não encontrada ou já fechada');
  }
  return comanda;
}

function adicionarItemComanda(comandaId, item) {
  const transacao = db.transaction(() => {
    buscarComandaAberta(comandaId);

    const quantidade = Number(item.quantidade);
    if (!(quantidade > 0)) {
      throw new Error('Quantidade inválida');
    }

    // Item avulso: sem produto cadastrado, preço digitado, sem controle de estoque
    if (!item.produto_id) {
      const descricao = String(item.nome_produto || '').trim();
      const preco = Number(item.preco_unitario);
      if (!descricao) {
        throw new Error('Informe a descrição do item avulso');
      }
      if (!(preco > 0)) {
        throw new Error('Informe um valor válido para o item avulso');
      }

      db.prepare(`
        INSERT INTO comanda_itens
        (comanda_id, produto_id, nome_produto, preco_unitario, quantidade, subtotal)
        VALUES (?, NULL, ?, ?, ?, ?)
      `).run(comandaId, descricao, preco, quantidade, arredondar(preco * quantidade));
      return;
    }

    const produto = db.prepare(`
      SELECT nome, preco_venda, estoque_atual, ativo
      FROM produtos WHERE id = ?
    `).get(item.produto_id);

    if (!produto) {
      throw new Error('Produto não encontrado');
    }
    if (!produto.ativo) {
      throw new Error('Produto inativo');
    }

    const itemExistente = db.prepare(`
      SELECT id, quantidade FROM comanda_itens
      WHERE comanda_id = ? AND produto_id = ?
    `).get(comandaId, item.produto_id);

    const quantidadeAtual = itemExistente ? itemExistente.quantidade : 0;
    const quantidadeFinal = quantidadeAtual + quantidade;

    if (quantidadeFinal > produto.estoque_atual) {
      throw new Error(`Estoque insuficiente. Disponível: ${produto.estoque_atual}, já na comanda: ${quantidadeAtual}`);
    }

    const subtotal = arredondar(quantidadeFinal * produto.preco_venda);

    if (itemExistente) {
      db.prepare(`
        UPDATE comanda_itens
        SET quantidade = ?, subtotal = ?, preco_unitario = ?
        WHERE id = ?
      `).run(quantidadeFinal, subtotal, produto.preco_venda, itemExistente.id);
    } else {
      db.prepare(`
        INSERT INTO comanda_itens
        (comanda_id, produto_id, nome_produto, preco_unitario, quantidade, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(comandaId, item.produto_id, produto.nome, produto.preco_venda, quantidade, subtotal);
    }
  });

  try {
    transacao();
    return buscarDetalheComanda(comandaId);
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function removerItemComanda(itemId) {
  try {
    const item = db.prepare('SELECT comanda_id FROM comanda_itens WHERE id = ?').get(itemId);
    if (!item) {
      return { sucesso: false, erro: 'Item não encontrado' };
    }
    buscarComandaAberta(item.comanda_id);

    db.prepare('DELETE FROM comanda_itens WHERE id = ?').run(itemId);
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

// Soma (delta > 0) ou tira (delta < 0) unidades de um item. Chegando a zero, o item sai da comanda.
function alterarQuantidadeItem(itemId, delta) {
  const transacao = db.transaction(() => {
    const item = db.prepare('SELECT * FROM comanda_itens WHERE id = ?').get(itemId);
    if (!item) {
      throw new Error('Item não encontrado');
    }
    buscarComandaAberta(item.comanda_id);

    const novaQuantidade = item.quantidade + Number(delta);
    if (novaQuantidade <= 0) {
      db.prepare('DELETE FROM comanda_itens WHERE id = ?').run(itemId);
      return item.comanda_id;
    }

    if (item.produto_id && delta > 0) {
      const produto = db.prepare('SELECT estoque_atual FROM produtos WHERE id = ?').get(item.produto_id);
      if (!produto || novaQuantidade > produto.estoque_atual) {
        throw new Error(`Estoque insuficiente. Disponível: ${produto ? produto.estoque_atual : 0}`);
      }
    }

    db.prepare('UPDATE comanda_itens SET quantidade = ?, subtotal = ? WHERE id = ?')
      .run(novaQuantidade, arredondar(novaQuantidade * item.preco_unitario), itemId);
    return item.comanda_id;
  });

  try {
    const comandaId = transacao();
    return buscarDetalheComanda(comandaId);
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function fecharComanda(comandaId, dadosPagamento) {
  const inserirVenda = db.prepare(`
    INSERT INTO vendas (subtotal, desconto, total, forma_pagamento, valor_pago, troco)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const inserirItemVenda = db.prepare(`
    INSERT INTO venda_itens (venda_id, produto_id, nome_produto, preco_unitario, quantidade, subtotal)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const baixarEstoque = db.prepare(`
    UPDATE produtos SET estoque_atual = estoque_atual - ?, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const atualizarComanda = db.prepare(`
    UPDATE comandas
    SET status = 'fechada', fechada_em = CURRENT_TIMESTAMP, venda_id = ?
    WHERE id = ?
  `);

  const transacao = db.transaction(() => {
    const comanda = db.prepare("SELECT * FROM comandas WHERE id = ? AND status = 'aberta'").get(comandaId);
    if (!comanda) {
      throw new Error('Comanda não encontrada ou já fechada');
    }

    const itens = db.prepare('SELECT * FROM comanda_itens WHERE comanda_id = ?').all(comandaId);
    if (itens.length === 0) {
      throw new Error('Comanda sem itens — adicione produtos antes de fechar');
    }

    if (!FORMAS_PAGAMENTO.includes(dadosPagamento.forma_pagamento)) {
      throw new Error('Forma de pagamento inválida');
    }

    for (const item of itens) {
      if (!item.produto_id) continue;
      const produto = db.prepare('SELECT estoque_atual FROM produtos WHERE id = ?').get(item.produto_id);
      if (!produto) {
        throw new Error(`Produto ID ${item.produto_id} não encontrado`);
      }
      if (produto.estoque_atual < item.quantidade) {
        throw new Error(`Estoque insuficiente para "${item.nome_produto}" (disponível: ${produto.estoque_atual})`);
      }
    }

    const subtotal = arredondar(itens.reduce((soma, item) => soma + item.subtotal, 0));
    const desconto = arredondar(Number(dadosPagamento.desconto) || 0);
    if (desconto < 0 || desconto > subtotal) {
      throw new Error('Desconto inválido: deve estar entre zero e o subtotal da comanda');
    }
    const total = arredondar(subtotal - desconto);

    let valorPago = total;
    let troco = 0;
    if (dadosPagamento.forma_pagamento === 'dinheiro') {
      valorPago = arredondar(Number(dadosPagamento.valor_pago) || 0);
      if (valorPago < total) {
        throw new Error('Valor recebido é menor que o total da comanda');
      }
      troco = arredondar(valorPago - total);
    }

    const resultadoVenda = inserirVenda.run(subtotal, desconto, total, dadosPagamento.forma_pagamento, valorPago, troco);
    const vendaId = resultadoVenda.lastInsertRowid;

    for (const item of itens) {
      inserirItemVenda.run(vendaId, item.produto_id, item.nome_produto, item.preco_unitario, item.quantidade, item.subtotal);
      if (item.produto_id) {
        baixarEstoque.run(item.quantidade, item.produto_id);
      }
    }

    atualizarComanda.run(vendaId, comandaId);

    return vendaId;
  });

  try {
    const vendaId = transacao();
    return { sucesso: true, dados: { venda_id: vendaId } };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function cancelarComanda(comandaId) {
  try {
    const resultado = db.prepare(`
      UPDATE comandas
      SET status = 'cancelada', fechada_em = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'aberta'
    `).run(comandaId);

    if (resultado.changes === 0) {
      return { sucesso: false, erro: 'Comanda não encontrada ou já fechada' };
    }

    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

module.exports = {
  listarComandasAbertas,
  criarComanda,
  buscarDetalheComanda,
  adicionarItemComanda,
  removerItemComanda,
  alterarQuantidadeItem,
  fecharComanda,
  cancelarComanda
};