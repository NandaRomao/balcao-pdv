const { ipcMain } = require('electron');
const {
  buscarProdutoPorCodigo,
  buscarProdutos,
  finalizarVenda,
  listarVendas,
  buscarItensVenda,
  cancelarVenda
} = require('./vendas.handler');

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

  ipcMain.handle('vendas:listar', async (evento, periodo) => {
    return listarVendas(periodo);
  });

  ipcMain.handle('vendas:buscar-itens', async (evento, vendaId) => {
    return buscarItensVenda(vendaId);
  });

  ipcMain.handle('vendas:cancelar', async (evento, vendaId, motivo) => {
    return cancelarVenda(vendaId, motivo);
  });
}

module.exports = { registrarVendas };
