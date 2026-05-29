const { ipcMain } = require('electron');
const {
  listarComandasAbertas,
  criarComanda,
  buscarDetalheComanda,
  adicionarItemComanda,
  removerItemComanda,
  fecharComanda,
  cancelarComanda
} = require('./comandas.handler');

function registrarComandas() {
  ipcMain.handle('comandas:listar-abertas', async () => {
    return listarComandasAbertas();
  });

  ipcMain.handle('comandas:criar', async (evento, dados) => {
    return criarComanda(dados);
  });

  ipcMain.handle('comandas:buscar-detalhe', async (evento, id) => {
    return buscarDetalheComanda(id);
  });

  ipcMain.handle('comandas:adicionar-item', async (evento, comandaId, item) => {
    return adicionarItemComanda(comandaId, item);
  });

  ipcMain.handle('comandas:remover-item', async (evento, itemId) => {
    return removerItemComanda(itemId);
  });

  ipcMain.handle('comandas:fechar', async (evento, comandaId, dadosPagamento) => {
    return fecharComanda(comandaId, dadosPagamento);
  });

  ipcMain.handle('comandas:cancelar', async (evento, comandaId) => {
    return cancelarComanda(comandaId);
  });
}

module.exports = { registrarComandas };