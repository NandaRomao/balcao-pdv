CREATE TABLE IF NOT EXISTS vendas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
  subtotal REAL NOT NULL,
  desconto REAL DEFAULT 0,
  total REAL NOT NULL,
  forma_pagamento TEXT NOT NULL,
  valor_pago REAL,
  troco REAL DEFAULT 0,
  status TEXT DEFAULT 'concluida',
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS venda_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venda_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  nome_produto TEXT NOT NULL,
  preco_unitario REAL NOT NULL,
  quantidade REAL NOT NULL,
  subtotal REAL NOT NULL,
  FOREIGN KEY (venda_id) REFERENCES vendas(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);