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
  },
  vendas: {
    buscarProdutoPorCodigo: (codigo) =>
      ipcRenderer.invoke('vendas:buscar-produto-codigo', codigo),
    buscarProdutos: (termo) =>
      ipcRenderer.invoke('vendas:buscar-produtos', termo),
    finalizar: (dadosVenda) =>
      ipcRenderer.invoke('vendas:finalizar', dadosVenda)
  },
  comandas: {
    listarAbertas: () => ipcRenderer.invoke('comandas:listar-abertas'),
    criar: (dados) => ipcRenderer.invoke('comandas:criar', dados),
    buscarDetalhe: (id) => ipcRenderer.invoke('comandas:buscar-detalhe', id),
    adicionarItem: (comandaId, item) =>
      ipcRenderer.invoke('comandas:adicionar-item', comandaId, item),
    removerItem: (itemId) =>
      ipcRenderer.invoke('comandas:remover-item', itemId),
    fechar: (comandaId, dadosPagamento) =>
      ipcRenderer.invoke('comandas:fechar', comandaId, dadosPagamento),
    cancelar: (comandaId) =>
      ipcRenderer.invoke('comandas:cancelar', comandaId)
  }
});