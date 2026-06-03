const { ipcMain } = require('electron');
const {
  resumoPeriodo,
  vendasPorFormaPagamento,
  produtosMaisVendidos,
  reposicaoEstoque,
  resumoFiado
} = require('./relatorios.handler');

function registrarRelatorios() {
  ipcMain.handle('relatorios:resumo-periodo', async (evento, periodo) => {
    return resumoPeriodo(periodo);
  });

  ipcMain.handle('relatorios:vendas-forma-pagamento', async (evento, periodo) => {
    return vendasPorFormaPagamento(periodo);
  });

  ipcMain.handle('relatorios:produtos-mais-vendidos', async (evento, periodo) => {
    return produtosMaisVendidos(periodo);
  });

  ipcMain.handle('relatorios:reposicao-estoque', async () => {
    return reposicaoEstoque();
  });

  ipcMain.handle('relatorios:resumo-fiado', async (evento, periodo) => {
    return resumoFiado(periodo);
  });
}

module.exports = { registrarRelatorios };