const { ipcMain } = require('electron');
const { salvarConfiguracoes, carregarConfiguracoes } = require('./configuracoes.handler');

function registrarConfiguracoes() {
  ipcMain.handle('configuracoes:salvar', async (evento, dados) => {
    return salvarConfiguracoes(dados);
  });

  ipcMain.handle('configuracoes:carregar', async () => {
    return carregarConfiguracoes();
  });
}

module.exports = { registrarConfiguracoes };