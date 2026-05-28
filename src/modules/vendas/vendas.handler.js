const { db } = require('../../database/db');

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

  const verificarEstoque = db.prepare('SELECT estoque_atual FROM produtos WHERE id = ? AND ativo = 1');

  const transacao = db.transaction(() => {
    for (const item of dadosVenda.itens) {
      const produto = verificarEstoque.get(item.produto_id);
      if (!produto) {
        throw new Error(`Produto ID ${item.produto_id} não encontrado`);
      }
      if (produto.estoque_atual < item.quantidade) {
        throw new Error(`Estoque insuficiente para "${item.nome_produto}" (disponível: ${produto.estoque_atual})`);
      }
    }

    const resultadoVenda = inserirVenda.run(
      dadosVenda.subtotal,
      dadosVenda.desconto,
      dadosVenda.total,
      dadosVenda.forma_pagamento,
      dadosVenda.valor_pago,
      dadosVenda.troco
    );

    const vendaId = resultadoVenda.lastInsertRowid;

    for (const item of dadosVenda.itens) {
      inserirItem.run(
        vendaId,
        item.produto_id,
        item.nome_produto,
        item.preco_unitario,
        item.quantidade,
        item.subtotal
      );
      atualizarEstoque.run(item.quantidade, item.produto_id);
    }

    return vendaId;
  });

  try {
    const vendaId = transacao();
    return { sucesso: true, dados: { venda_id: vendaId } };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

module.exports = {
  buscarProdutoPorCodigo,
  buscarProdutos,
  finalizarVenda
};