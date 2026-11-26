-- Comandas passam a aceitar item avulso (sem produto cadastrado)
CREATE TABLE comanda_itens_nova (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comanda_id INTEGER NOT NULL,
  produto_id INTEGER,
  nome_produto TEXT NOT NULL,
  preco_unitario REAL NOT NULL,
  quantidade REAL NOT NULL,
  subtotal REAL NOT NULL,
  adicionado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comanda_id) REFERENCES comandas(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

INSERT INTO comanda_itens_nova (id, comanda_id, produto_id, nome_produto, preco_unitario, quantidade, subtotal, adicionado_em)
SELECT id, comanda_id, produto_id, nome_produto, preco_unitario, quantidade, subtotal, adicionado_em FROM comanda_itens;

DROP TABLE comanda_itens;

ALTER TABLE comanda_itens_nova RENAME TO comanda_itens;

-- Cancelamento de venda (status = 'cancelada')
ALTER TABLE vendas ADD COLUMN cancelada_em DATETIME;
ALTER TABLE vendas ADD COLUMN motivo_cancelamento TEXT;

CREATE INDEX IF NOT EXISTS idx_vendas_data_hora ON vendas(data_hora);
CREATE INDEX IF NOT EXISTS idx_venda_itens_venda ON venda_itens(venda_id);
CREATE INDEX IF NOT EXISTS idx_comanda_itens_comanda ON comanda_itens(comanda_id);
CREATE INDEX IF NOT EXISTS idx_fiado_cliente ON fiado_lancamentos(cliente_id);
