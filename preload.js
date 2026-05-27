const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  configuracoes: {
    salvar: (dados) => ipcRenderer.invoke('configuracoes:salvar', dados),
    carregar: () => ipcRenderer.invoke('configuracoes:carregar')
  },
  produtos: {
    criar: (dados) => ipcRenderer.invoke('produtos:criar', dados),
    listar: (filtros) => ipcRenderer.invoke('produtos:listar', filtros),
    buscar: (id) => ipcRenderer.invoke('produtos:buscar', id),
    atualizar: (id, dados) => ipcRenderer.invoke('produtos:atualizar', id, dados),
    desativar: (id) => ipcRenderer.invoke('produtos:desativar', id),
    ajustarEstoque: (id, quantidade, tipo) =>
      ipcRenderer.invoke('produtos:ajustar-estoque', id, quantidade, tipo),
    listarCategorias: () => ipcRenderer.invoke('produtos:listar-categorias')
  }
});