const { db } = require('../../database/db');

function salvarConfiguracoes(dados) {
  const existe = db.prepare('SELECT id FROM configuracoes WHERE id = 1').get();

  if (existe) {
    const atualizar = db.prepare(`
      UPDATE configuracoes
      SET nome_comercio = ?, cnpj = ?, endereco = ?, logo_path = ?,
          cor_primaria = ?, cor_secundaria = ?, cor_destaque = ?,
          chave_licenca = ?, atualizado_em = CURRENT_TIMESTAMP
      WHERE id = 1
    `);
    atualizar.run(
      dados.nome_comercio,
      dados.cnpj,
      dados.endereco,
      dados.logo_path,
      dados.cor_primaria,
      dados.cor_secundaria,
      dados.cor_destaque,
      dados.chave_licenca
    );
  } else {
    const inserir = db.prepare(`
      INSERT INTO configuracoes (
        id, nome_comercio, cnpj, endereco, logo_path,
        cor_primaria, cor_secundaria, cor_destaque, chave_licenca
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    inserir.run(
      dados.nome_comercio,
      dados.cnpj,
      dados.endereco,
      dados.logo_path,
      dados.cor_primaria,
      dados.cor_secundaria,
      dados.cor_destaque,
      dados.chave_licenca
    );
  }

  return { sucesso: true };
}

function carregarConfiguracoes() {
  return db.prepare('SELECT * FROM configuracoes WHERE id = 1').get() || null;
}

module.exports = { salvarConfiguracoes, carregarConfiguracoes };