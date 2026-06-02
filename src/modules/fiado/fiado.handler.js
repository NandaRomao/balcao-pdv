const { db } = require('../../database/db');

function calcularSaldo(clienteId) {
  const debitos = db.prepare(`
    SELECT COALESCE(SUM(valor), 0) as total
    FROM fiado_lancamentos
    WHERE cliente_id = ? AND tipo = 'debito'
  `).get(clienteId);

  const pagamentos = db.prepare(`
    SELECT COALESCE(SUM(valor), 0) as total
    FROM fiado_lancamentos
    WHERE cliente_id = ? AND tipo = 'pagamento'
  `).get(clienteId);

  return (debitos.total || 0) - (pagamentos.total || 0);
}

function listarClientes(filtros = {}) {
  try {
    let sql = 'SELECT * FROM clientes WHERE ativo = 1';
    const parametros = [];

    if (filtros.busca) {
      sql += ' AND (nome LIKE ? OR telefone LIKE ?)';
      const termo = `%${filtros.busca}%`;
      parametros.push(termo, termo);
    }

    sql += ' ORDER BY nome ASC';

    const clientes = db.prepare(sql).all(...parametros);

    const resultado = clientes.map(cliente => {
      const saldo = calcularSaldo(cliente.id);
      return {
        ...cliente,
        saldo_devedor: saldo
      };
    });

    if (filtros.somenteDevedores) {
      return {
        sucesso: true,
        dados: resultado.filter(c => c.saldo_devedor > 0)
      };
    }

    return { sucesso: true, dados: resultado };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function criarCliente(dados) {
  try {
    if (!dados.nome || dados.nome.trim() === '') {
      return { sucesso: false, erro: 'Nome do cliente é obrigatório' };
    }

    const inserir = db.prepare(`
      INSERT INTO clientes (nome, telefone, foto_path, limite_credito, observacao)
      VALUES (?, ?, ?, ?, ?)
    `);
    const resultado = inserir.run(
      dados.nome,
      dados.telefone,
      dados.foto_path,
      dados.limite_credito || 0,
      dados.observacao
    );

    return { sucesso: true, dados: { id: resultado.lastInsertRowid } };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function buscarCliente(id) {
  try {
    const cliente = db.prepare('SELECT * FROM clientes WHERE id = ? AND ativo = 1').get(id);
    if (!cliente) {
      return { sucesso: false, erro: 'Cliente não encontrado' };
    }

    const saldo = calcularSaldo(id);
    return { sucesso: true, dados: { ...cliente, saldo_devedor: saldo } };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function atualizarCliente(id, dados) {
  try {
    const atualizar = db.prepare(`
      UPDATE clientes
      SET nome = ?, telefone = ?, foto_path = ?, limite_credito = ?, observacao = ?
      WHERE id = ?
    `);
    atualizar.run(
      dados.nome,
      dados.telefone,
      dados.foto_path,
      dados.limite_credito,
      dados.observacao,
      id
    );

    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function desativarCliente(id) {
  try {
    const saldo = calcularSaldo(id);
    if (saldo > 0) {
      return {
        sucesso: false,
        erro: `Cliente possui saldo devedor de ${saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Quite o débito antes de desativar.`
      };
    }

    db.prepare('UPDATE clientes SET ativo = 0 WHERE id = ?').run(id);
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function buscarExtrato(clienteId) {
  try {
    const cliente = db.prepare('SELECT * FROM clientes WHERE id = ? AND ativo = 1').get(clienteId);
    if (!cliente) {
      return { sucesso: false, erro: 'Cliente não encontrado' };
    }

    const lancamentos = db.prepare(`
      SELECT * FROM fiado_lancamentos
      WHERE cliente_id = ?
      ORDER BY criado_em DESC
    `).all(clienteId);

    const saldo = calcularSaldo(clienteId);

    return {
      sucesso: true,
      dados: {
        cliente,
        lancamentos,
        saldo_devedor: saldo
      }
    };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function lancarDebitoProduto(clienteId, item) {
  const inserirVenda = db.prepare(`
    INSERT INTO vendas (subtotal, desconto, total, forma_pagamento, valor_pago, troco)
    VALUES (?, 0, ?, 'fiado', ?, 0)
  `);

  const inserirItemVenda = db.prepare(`
    INSERT INTO venda_itens (venda_id, produto_id, nome_produto, preco_unitario, quantidade, subtotal)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const baixarEstoque = db.prepare(`
    UPDATE produtos SET estoque_atual = estoque_atual - ?, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const inserirLancamento = db.prepare(`
    INSERT INTO fiado_lancamentos (cliente_id, tipo, descricao, valor, contabiliza_receita, venda_id)
    VALUES (?, 'debito', ?, ?, 1, ?)
  `);

  const transacao = db.transaction(() => {
    const produto = db.prepare('SELECT nome, preco_venda, estoque_atual, ativo FROM produtos WHERE id = ?').get(item.produto_id);

    if (!produto) {
      throw new Error('Produto não encontrado');
    }
    if (!produto.ativo) {
      throw new Error('Produto inativo');
    }
    if (produto.estoque_atual < item.quantidade) {
      throw new Error(`Estoque insuficiente. Disponível: ${produto.estoque_atual}`);
    }

    const subtotal = item.quantidade * produto.preco_venda;

    const resultadoVenda = inserirVenda.run(subtotal, subtotal, subtotal);
    const vendaId = resultadoVenda.lastInsertRowid;

    inserirItemVenda.run(vendaId, item.produto_id, produto.nome, produto.preco_venda, item.quantidade, subtotal);
    baixarEstoque.run(item.quantidade, item.produto_id);
    inserirLancamento.run(clienteId, produto.nome, subtotal, vendaId);

    return { venda_id: vendaId, subtotal };
  });

  try {
    const dados = transacao();
    return { sucesso: true, dados };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function lancarDebitoAvulso(clienteId, dados) {
  try {
    if (!dados.descricao || dados.descricao.trim() === '') {
      return { sucesso: false, erro: 'Descrição é obrigatória' };
    }
    if (!dados.valor || dados.valor <= 0) {
      return { sucesso: false, erro: 'Valor deve ser maior que zero' };
    }

    const inserir = db.prepare(`
      INSERT INTO fiado_lancamentos (cliente_id, tipo, descricao, valor, contabiliza_receita, venda_id)
      VALUES (?, 'debito', ?, ?, ?, NULL)
    `);
    inserir.run(clienteId, dados.descricao, dados.valor, dados.contabiliza_receita ? 1 : 0);

    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function registrarPagamento(clienteId, valor) {
  try {
    if (!valor || valor <= 0) {
      return { sucesso: false, erro: 'Valor deve ser maior que zero' };
    }

    const saldoAtual = calcularSaldo(clienteId);
    if (valor > saldoAtual) {
      return {
        sucesso: false,
        erro: `Valor excede o saldo devedor. Máximo permitido: ${saldoAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
      };
    }

    const inserir = db.prepare(`
      INSERT INTO fiado_lancamentos (cliente_id, tipo, descricao, valor, contabiliza_receita, venda_id)
      VALUES (?, 'pagamento', 'Pagamento', ?, 1, NULL)
    `);
    inserir.run(clienteId, valor);

    const novoSaldo = calcularSaldo(clienteId);

    return { sucesso: true, dados: { saldo_atualizado: novoSaldo } };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function removerLancamento(lancamentoId) {
  try {
    const lancamento = db.prepare('SELECT * FROM fiado_lancamentos WHERE id = ?').get(lancamentoId);
    if (!lancamento) {
      return { sucesso: false, erro: 'Lançamento não encontrado' };
    }

    db.prepare('DELETE FROM fiado_lancamentos WHERE id = ?').run(lancamentoId);

    let aviso = '';
    if (lancamento.venda_id) {
      aviso = ' Este lançamento estava vinculado a uma venda. Ajuste o estoque manualmente se necessário.';
    }

    return { sucesso: true, dados: { aviso } };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

function verificarLimite(clienteId, valorAdicional) {
  try {
    const cliente = db.prepare('SELECT limite_credito FROM clientes WHERE id = ? AND ativo = 1').get(clienteId);
    if (!cliente) {
      return { sucesso: false, erro: 'Cliente não encontrado' };
    }

    const saldoAtual = calcularSaldo(clienteId);
    const saldoProjetado = saldoAtual + valorAdicional;
    const limite = cliente.limite_credito || 0;

    if (limite > 0 && saldoProjetado > limite) {
      return {
        sucesso: true,
        dados: {
          dentroLimite: false,
          saldo_atual: saldoAtual,
          saldo_projetado: saldoProjetado,
          limite: limite,
          excedente: saldoProjetado - limite
        }
      };
    }

    return {
      sucesso: true,
      dados: {
        dentroLimite: true,
        saldo_atual: saldoAtual,
        saldo_projetado: saldoProjetado,
        limite: limite
      }
    };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

module.exports = {
  listarClientes,
  criarCliente,
  buscarCliente,
  atualizarCliente,
  desativarCliente,
  buscarExtrato,
  lancarDebitoProduto,
  lancarDebitoAvulso,
  registrarPagamento,
  removerLancamento,
  verificarLimite
};