CREATE TABLE IF NOT EXISTS configuracoes (
  id INTEGER PRIMARY KEY,
  nome_comercio TEXT,
  cnpj TEXT,
  endereco TEXT,
  logo_path TEXT,
  cor_primaria TEXT DEFAULT '#1a1a2e',
  cor_secundaria TEXT DEFAULT '#2c3e7a',
  cor_destaque TEXT DEFAULT '#e8b84b',
  chave_licenca TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);