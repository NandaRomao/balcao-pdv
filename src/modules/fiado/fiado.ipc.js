const { ipcMain } = require('electron');
const {
  listarClientes,
  criarCliente,
  buscarCliente,
  atualizarCliente,
  desativarCliente,
  buscarExtrato,
  lancarDebitoProduto,
  lancarDebitoAvulso,
  registrarPagamento,
  removerLancamento,
  verificarLimite
} = require('./fiado.handler');

function registrarFiado() {
  ipcMain.handle('fiado:listar-clientes', async (evento, filtros) => {
    return listarClientes(filtros);
  });

  ipcMain.handle('fiado:criar-cliente', async (evento, dados) => {
    return criarCliente(dados);
  });

  ipcMain.handle('fiado:buscar-cliente', async (evento, id) => {
    return buscarCliente(id);
  });

  ipcMain.handle('fiado:atualizar-cliente', async (evento, id, dados) => {
    return atualizarCliente(id, dados);
  });

  ipcMain.handle('fiado:desativar-cliente', async (evento, id) => {
    return desativarCliente(id);
  });

  ipcMain.handle('fiado:buscar-extrato', async (evento, clienteId) => {
    return buscarExtrato(clienteId);
  });

  ipcMain.handle('fiado:lancar-debito-produto', async (evento, clienteId, item) => {
    return lancarDebitoProduto(clienteId, item);
  });

  ipcMain.handle('fiado:lancar-debito-avulso', async (evento, clienteId, dados) => {
    return lancarDebitoAvulso(clienteId, dados);
  });

  ipcMain.handle('fiado:registrar-pagamento', async (evento, clienteId, valor) => {
    return registrarPagamento(clienteId, valor);
  });

  ipcMain.handle('fiado:remover-lancamento', async (evento, lancamentoId) => {
    return removerLancamento(lancamentoId);
  });

  ipcMain.handle('fiado:verificar-limite', async (evento, clienteId, valorAdicional) => {
    return verificarLimite(clienteId, valorAdicional);
  });
}

module.exports = { registrarFiado };