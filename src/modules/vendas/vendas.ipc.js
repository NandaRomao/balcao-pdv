const { ipcMain } = require('electron');
const { buscarProdutoPorCodigo, buscarProdutos, finalizarVenda } = require('./vendas.handler');

function registrarVendas() {
  ipcMain.handle('vendas:buscar-produto-codigo', async (evento, codigo) => {
    return buscarProdutoPorCodigo(codigo);
  });

  ipcMain.handle('vendas:buscar-produtos', async (evento, termo) => {
    return buscarProdutos(termo);
  });

  ipcMain.handle('vendas:finalizar', async (evento, dadosVenda) => {
    return finalizarVenda(dadosVenda);
  });
}

module.exports = { registrarVendas };