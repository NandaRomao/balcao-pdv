const Database = require('better-sqlite3');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const pastaDados = app.getPath('userData');
fs.mkdirSync(pastaDados, { recursive: true });
const caminhoBanco = path.join(pastaDados, 'balcao.db');

const db = new Database(caminhoBanco);

// WAL deixa o banco mais resistente a quedas de energia e permite leitura
// enquanto há escrita. foreign_keys precisa ser ligado a cada conexão no SQLite.
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Cada migration é aplicada uma única vez. A versão aplicada fica guardada em
// PRAGMA user_version (número do último arquivo executado, ex: 006 -> 6).
// Bancos antigos (anteriores a este controle) têm user_version = 0: como as
// migrations 001-006 são seguras para reexecução, elas rodam mais uma vez e
// o banco passa a ser controlado a partir daí.
function runMigrations() {
  const caminhoMigrations = path.join(__dirname, 'migrations');
  const arquivos = fs.readdirSync(caminhoMigrations)
    .filter(nome => /^\d+-.+\.sql$/.test(nome))
    .sort();

  // Desligado durante as migrations: recriar tabelas (padrão do SQLite para
  // alterar colunas) não pode disparar verificação de chave estrangeira no meio.
  db.pragma('foreign_keys = OFF');

  const versaoAtual = db.pragma('user_version', { simple: true });

  for (const arquivo of arquivos) {
    const versao = parseInt(arquivo.split('-')[0], 10);
    if (versao <= versaoAtual) continue;

    const sql = fs.readFileSync(path.join(caminhoMigrations, arquivo), 'utf-8');

    const aplicar = db.transaction(() => {
      db.exec(sql);
      db.pragma(`user_version = ${versao}`);
    });

    try {
      aplicar();
    } catch (erro) {
      throw new Error(`Falha ao aplicar migration ${arquivo}: ${erro.message}`);
    }
  }

  const violacoes = db.pragma('foreign_key_check');
  if (violacoes.length > 0) {
    console.warn(`[db] ${violacoes.length} referência(s) inválida(s) encontrada(s) no banco:`, violacoes);
  }

  db.pragma('foreign_keys = ON');
}

module.exports = { db, runMigrations };
