const { db } = require('../../database/db');

function criarProduto(dados) {
  try {
    const inserir = db.prepare(`
      INSERT INTO produtos (
        nome, descricao, codigo_barras, preco_venda, preco_custo,
        unidade, categoria, estoque_atual, estoque_minimo, foto_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const resultado = inserir.run(
      dados.nome,
      dados.descricao,
      dados.codigo_barras,
      dados.preco_venda,
      dados.preco_custo,
      dados.unidade,
      dados.categoria,
      dados.estoque_atual,
      dados.estoque_minimo,
      dados.foto_path
    );
    return { sucesso: true, dados: { id: resultado.lastInsertRowid } };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function listarProdutos(filtros = {}) {
  try {
    let sql = 'SELECT * FROM produtos WHERE ativo = 1';
    const parametros = [];

    if (filtros.busca) {
      sql += ' AND (nome LIKE ? OR codigo_barras LIKE ?)';
      const termo = `%${filtros.busca}%`;
      parametros.push(termo, termo);
    }

    if (filtros.categoria) {
      sql += ' AND categoria = ?';
      parametros.push(filtros.categoria);
    }

    if (filtros.alertaEstoque) {
      sql += ' AND estoque_atual <= estoque_minimo';
    }

    sql += ' ORDER BY nome ASC';

    const produtos = db.prepare(sql).all(...parametros);
    return { sucesso: true, dados: produtos };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function buscarProduto(id) {
  try {
    const produto = db.prepare('SELECT * FROM produtos WHERE id = ? AND ativo = 1').get(id);
    if (!produto) {
      return { sucesso: false, erro: 'Produto não encontrado' };
    }
    return { sucesso: true, dados: produto };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function atualizarProduto(id, dados) {
  try {
    const atualizar = db.prepare(`
      UPDATE produtos
      SET nome = ?, descricao = ?, codigo_barras = ?, preco_venda = ?,
          preco_custo = ?, unidade = ?, categoria = ?, estoque_atual = ?,
          estoque_minimo = ?, foto_path = ?, atualizado_em = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    atualizar.run(
      dados.nome,
      dados.descricao,
      dados.codigo_barras,
      dados.preco_venda,
      dados.preco_custo,
      dados.unidade,
      dados.categoria,
      dados.estoque_atual,
      dados.estoque_minimo,
      dados.foto_path,
      id
    );
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function desativarProduto(id) {
  try {
    db.prepare('UPDATE produtos SET ativo = 0 WHERE id = ?').run(id);
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function ajustarEstoque(id, quantidade, tipo) {
  try {
    const produto = db.prepare('SELECT estoque_atual FROM produtos WHERE id = ? AND ativo = 1').get(id);
    if (!produto) {
      return { sucesso: false, erro: 'Produto não encontrado' };
    }

    let novoEstoque;
    if (tipo === 'entrada') {
      novoEstoque = produto.estoque_atual + quantidade;
    } else if (tipo === 'saida') {
      novoEstoque = produto.estoque_atual - quantidade;
      if (novoEstoque < 0) {
        return { sucesso: false, erro: 'Estoque não pode ficar negativo' };
      }
    } else {
      return { sucesso: false, erro: 'Tipo de ajuste inválido' };
    }

    db.prepare('UPDATE produtos SET estoque_atual = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?')
      .run(novoEstoque, id);

    return { sucesso: true, dados: { estoque_atual: novoEstoque } };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function listarCategorias() {
  try {
    const categorias = db.prepare(`
      SELECT DISTINCT categoria FROM produtos
      WHERE ativo = 1 AND categoria IS NOT NULL AND categoria != ''
      ORDER BY categoria ASC
    `).all();
    return { sucesso: true, dados: categorias.map(c => c.categoria) };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

module.exports = {
  criarProduto,
  listarProdutos,
  buscarProduto,
  atualizarProduto,
  desativarProduto,
  ajustarEstoque,
  listarCategorias
};