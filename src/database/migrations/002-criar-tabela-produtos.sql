CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  descricao TEXT,
  codigo_barras TEXT UNIQUE,
  preco_venda REAL NOT NULL,
  preco_custo REAL,
  unidade TEXT DEFAULT 'unidade',
  categoria TEXT,
  estoque_atual REAL DEFAULT 0,
  estoque_minimo REAL DEFAULT 0,
  foto_path TEXT,
  ativo INTEGER DEFAULT 1,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);