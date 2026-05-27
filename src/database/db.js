const Database = require('better-sqlite3');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const caminhoBanco = path.join(app.getPath('userData'), 'balcao.db');

const db = new Database(caminhoBanco);

function runMigrations() {
  const caminhoMigrations = path.join(__dirname, 'migrations');
  const arquivos = fs.readdirSync(caminhoMigrations)
    .filter(nome => nome.endsWith('.sql'))
    .sort();

  for (const arquivo of arquivos) {
    const caminhoArquivo = path.join(caminhoMigrations, arquivo);
    const sql = fs.readFileSync(caminhoArquivo, 'utf-8');
    db.exec(sql);
  }
}

module.exports = { db, runMigrations };