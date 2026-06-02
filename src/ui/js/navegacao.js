const linksMenu = document.querySelectorAll('.menu-modulos a');
const modulos = document.querySelectorAll('.modulo');

const inicializadores = {
  configuracoes: null,
  produtos: () => window.inicializarProdutos(),
  vendas: () => window.inicializarVendas(),
  clientes: () => window.inicializarClientes()
};

function ativarModulo(nomeModulo) {
  linksMenu.forEach(link => {
    link.classList.toggle('ativo', link.dataset.modulo === nomeModulo);
  });
  modulos.forEach(modulo => {
    modulo.classList.toggle('ativo', modulo.id === `modulo-${nomeModulo}`);
  });
  const inicializar = inicializadores[nomeModulo];
  if (typeof inicializar === 'function') {
    inicializar();
  }
}

linksMenu.forEach(link => {
  link.addEventListener('click', (evento) => {
    evento.preventDefault();
    const nomeModulo = link.dataset.modulo;
    if (nomeModulo) {
      ativarModulo(nomeModulo);
    }
  });
});