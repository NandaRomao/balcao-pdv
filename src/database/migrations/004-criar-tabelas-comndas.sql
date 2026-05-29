CREATE TABLE IF NOT EXISTS comandas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_cliente TEXT,
  mesa TEXT,
  status TEXT DEFAULT 'aberta',
  observacao TEXT,
  aberta_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  fechada_em DATETIME,
  venda_id INTEGER,
  FOREIGN KEY (venda_id) REFERENCES vendas(id)
);

CREATE TABLE IF NOT EXISTS comanda_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comanda_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  nome_produto TEXT NOT NULL,
  preco_unitario REAL NOT NULL,
  quantidade REAL NOT NULL,
  subtotal REAL NOT NULL,
  adicionado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comanda_id) REFERENCES comandas(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);