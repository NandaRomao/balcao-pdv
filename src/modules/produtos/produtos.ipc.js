const { ipcMain } = require('electron');
const {
  criarProduto,
  listarProdutos,
  buscarProduto,
  atualizarProduto,
  desativarProduto,
  ajustarEstoque,
  listarCategorias
} = require('./produtos.handler');

function registrarProdutos() {
  ipcMain.handle('produtos:criar', async (evento, dados) => {
    return criarProduto(dados);
  });

  ipcMain.handle('produtos:listar', async (evento, filtros) => {
    return listarProdutos(filtros);
  });

  ipcMain.handle('produtos:buscar', async (evento, id) => {
    return buscarProduto(id);
  });

  ipcMain.handle('produtos:atualizar', async (evento, id, dados) => {
    return atualizarProduto(id, dados);
  });

  ipcMain.handle('produtos:desativar', async (evento, id) => {
    return desativarProduto(id);
  });

  ipcMain.handle('produtos:ajustar-estoque', async (evento, id, quantidade, tipo) => {
    return ajustarEstoque(id, quantidade, tipo);
  });

  ipcMain.handle('produtos:listar-categorias', async () => {
    return listarCategorias();
  });
}

module.exports = { registrarProdutos };