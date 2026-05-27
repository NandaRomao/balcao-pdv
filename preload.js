const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  configuracoes: {
    salvar: (dados) => ipcRenderer.invoke('configuracoes:salvar', dados),
    carregar: () => ipcRenderer.invoke('configuracoes:carregar')
  }
});