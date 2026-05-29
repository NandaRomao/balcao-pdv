const { db } = require('../../database/db');

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

function adicionarItemComanda(comandaId, item) {
  try {
    const produto = db.prepare(`
      SELECT nome, preco_venda, estoque_atual, ativo
      FROM produtos WHERE id = ?
    `).get(item.produto_id);

    if (!produto) {
      return { sucesso: false, erro: 'Produto não encontrado' };
    }

    if (!produto.ativo) {
      return { sucesso: false, erro: 'Produto inativo' };
    }

    const itemExistente = db.prepare(`
      SELECT id, quantidade FROM comanda_itens
      WHERE comanda_id = ? AND produto_id = ?
    `).get(comandaId, item.produto_id);

    const quantidadeAtual = itemExistente ? itemExistente.quantidade : 0;
    const quantidadeFinal = quantidadeAtual + item.quantidade;

    if (quantidadeFinal > produto.estoque_atual) {
      return {
        sucesso: false,
        erro: `Estoque insuficiente. Disponível: ${produto.estoque_atual}, já na comanda: ${quantidadeAtual}`
      };
    }

    const subtotal = quantidadeFinal * produto.preco_venda;

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
      `).run(comandaId, item.produto_id, produto.nome, produto.preco_venda, item.quantidade, subtotal);
    }

    return buscarDetalheComanda(comandaId);
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function removerItemComanda(itemId) {
  try {
    db.prepare('DELETE FROM comanda_itens WHERE id = ?').run(itemId);
    return { sucesso: true };
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

    for (const item of itens) {
      const produto = db.prepare('SELECT estoque_atual FROM produtos WHERE id = ?').get(item.produto_id);
      if (!produto) {
        throw new Error(`Produto ID ${item.produto_id} não encontrado`);
      }
      if (produto.estoque_atual < item.quantidade) {
        throw new Error(`Estoque insuficiente para "${item.nome_produto}" (disponível: ${produto.estoque_atual})`);
      }
    }

    const subtotal = itens.reduce((soma, item) => soma + item.subtotal, 0);
    const desconto = dadosPagamento.desconto || 0;
    const total = Math.max(0, subtotal - desconto);
    const valorPago = dadosPagamento.forma_pagamento === 'dinheiro'
      ? (dadosPagamento.valor_pago || 0)
      : total;
    const troco = dadosPagamento.forma_pagamento === 'dinheiro'
      ? Math.max(0, valorPago - total)
      : 0;

    const resultadoVenda = inserirVenda.run(subtotal, desconto, total, dadosPagamento.forma_pagamento, valorPago, troco);
    const vendaId = resultadoVenda.lastInsertRowid;

    for (const item of itens) {
      inserirItemVenda.run(vendaId, item.produto_id, item.nome_produto, item.preco_unitario, item.quantidade, item.subtotal);
      baixarEstoque.run(item.quantidade, item.produto_id);
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
    db.prepare(`
      UPDATE comandas
      SET status = 'cancelada', fechada_em = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(comandaId);

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
  fecharComanda,
  cancelarComanda
};