const { db } = require('../../database/db');

function montarPeriodo(periodo) {
  const inicio = periodo.inicio + ' 00:00:00';
  const fim = periodo.fim + ' 23:59:59';
  return { inicio, fim };
}

function resumoPeriodo(periodo) {
  try {
    const { inicio, fim } = montarPeriodo(periodo);

    const resultado = db.prepare(`
      SELECT 
        COALESCE(SUM(total), 0) as total_vendido,
        COUNT(*) as numero_vendas
      FROM vendas
      WHERE datetime(data_hora, 'localtime') BETWEEN ? AND ?
    `).get(inicio, fim);

    const totalVendido = resultado.total_vendido;
    const numeroVendas = resultado.numero_vendas;
    const ticketMedio = numeroVendas > 0 ? totalVendido / numeroVendas : 0;

    return {
      sucesso: true,
      dados: {
        total_vendido: totalVendido,
        numero_vendas: numeroVendas,
        ticket_medio: ticketMedio
      }
    };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function vendasPorFormaPagamento(periodo) {
  try {
    const { inicio, fim } = montarPeriodo(periodo);

    const dados = db.prepare(`
      SELECT 
        forma_pagamento,
        COUNT(*) as quantidade,
        COALESCE(SUM(total), 0) as total
      FROM vendas
      WHERE datetime(data_hora, 'localtime') BETWEEN ? AND ?
      GROUP BY forma_pagamento
      ORDER BY total DESC
    `).all(inicio, fim);

    return { sucesso: true, dados };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function produtosMaisVendidos(periodo) {
  try {
    const { inicio, fim } = montarPeriodo(periodo);

    const dados = db.prepare(`
      SELECT 
        vi.nome_produto,
        COALESCE(SUM(vi.quantidade), 0) as total_quantidade,
        COALESCE(SUM(vi.subtotal), 0) as total_valor
      FROM venda_itens vi
      JOIN vendas v ON vi.venda_id = v.id
      WHERE datetime(v.data_hora, 'localtime') BETWEEN ? AND ?
      GROUP BY vi.nome_produto
      ORDER BY total_quantidade DESC
      LIMIT 20
    `).all(inicio, fim);

    return { sucesso: true, dados };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function reposicaoEstoque() {
  try {
    const produtos = db.prepare(`
      SELECT 
        id, nome, estoque_atual, estoque_minimo, unidade, categoria
      FROM produtos
      WHERE ativo = 1
      ORDER BY nome ASC
    `).all();

    const acabou = [];
    const acabando = [];

    for (const produto of produtos) {
      if (produto.estoque_atual <= 0) {
        acabou.push(produto);
      } else if (produto.estoque_minimo > 0 && produto.estoque_atual <= produto.estoque_minimo) {
        acabando.push(produto);
      }
    }

    return { sucesso: true, dados: { acabou, acabando } };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function resumoFiado(periodo) {
  try {
    const { inicio, fim } = montarPeriodo(periodo);

    const debitos = db.prepare(`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM fiado_lancamentos
      WHERE tipo = 'debito'
    `).get();

    const pagamentos = db.prepare(`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM fiado_lancamentos
      WHERE tipo = 'pagamento'
    `).get();

    const totalAReceber = (debitos.total || 0) - (pagamentos.total || 0);

    const recebidoPeriodo = db.prepare(`
      SELECT COALESCE(SUM(valor), 0) as total
      FROM fiado_lancamentos
      WHERE tipo = 'pagamento'
      AND datetime(criado_em, 'localtime') BETWEEN ? AND ?
    `).get(inicio, fim);

    return {
      sucesso: true,
      dados: {
        total_a_receber: totalAReceber,
        recebido_periodo: recebidoPeriodo.total || 0
      }
    };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

module.exports = {
  resumoPeriodo,
  vendasPorFormaPagamento,
  produtosMaisVendidos,
  reposicaoEstoque,
  resumoFiado
};