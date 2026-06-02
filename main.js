const { app, BrowserWindow } = require('electron');
const path = require('path');
const { runMigrations } = require('./src/database/db');
const { registrarConfiguracoes } = require('./src/modules/configuracoes/configuracoes.ipc');
const { registrarProdutos } = require('./src/modules/produtos/produtos.ipc');
const { registrarVendas } = require('./src/modules/vendas/vendas.ipc');
const { registrarComandas } = require('./src/modules/comandas/comandas.ipc');
const { registrarFiado } = require('./src/modules/fiado/fiado.ipc');

let janelaPrincipal;

function criarJanela() {
  janelaPrincipal = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  janelaPrincipal.loadFile(path.join(__dirname, 'src', 'ui', 'index.html'));
  janelaPrincipal.on('closed', () => {
    janelaPrincipal = null;
  });
}

app.whenReady().then(() => {
  runMigrations();
  registrarConfiguracoes();
  registrarProdutos();
  registrarVendas();
  registrarComandas();
  registrarFiado();
  criarJanela();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      criarJanela();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});