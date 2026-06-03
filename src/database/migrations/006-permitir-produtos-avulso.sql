CREATE TABLE IF NOT EXISTS venda_itens_nova (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venda_id INTEGER NOT NULL,
  produto_id INTEGER,
  nome_produto TEXT NOT NULL,
  preco_unitario REAL NOT NULL,
  quantidade REAL NOT NULL,
  subtotal REAL NOT NULL,
  FOREIGN KEY (venda_id) REFERENCES vendas(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

INSERT INTO venda_itens_nova (id, venda_id, produto_id, nome_produto, preco_unitario, quantidade, subtotal)
SELECT id, venda_id, produto_id, nome_produto, preco_unitario, quantidade, subtotal FROM venda_itens;

DROP TABLE venda_itens;

ALTER TABLE venda_itens_nova RENAME TO venda_itens;