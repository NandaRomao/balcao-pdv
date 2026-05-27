let produtoAtual = null;
let filtrosAtivos = { busca: '', categoria: '', alertaEstoque: false };
let categoriasCache = [];

const moduloProdutos = document.getElementById('modulo-produtos');
const gridProdutos = document.getElementById('grid-produtos');
const inputBusca = document.getElementById('busca-produtos');
const containerCategorias = document.getElementById('filtros-categoria');
const contadorProdutos = document.getElementById('contador-produtos');
const btnNovoProduto = document.getElementById('btn-novo-produto');
const btnLimparFiltros = document.getElementById('btn-limpar-filtros');

const overlayModal = document.getElementById('overlay-modal-produto');
const formProduto = document.getElementById('form-produto');
const tituloModal = document.getElementById('titulo-modal-produto');
const btnFecharModal = document.getElementById('btn-fechar-modal');
const btnCancelarModal = document.getElementById('btn-cancelar-modal');
const btnSalvarProduto = document.getElementById('btn-salvar-produto');

const overlayModalAjuste = document.getElementById('overlay-modal-ajuste');
const formAjuste = document.getElementById('form-ajuste');
const btnFecharAjuste = document.getElementById('btn-fechar-ajuste');
const btnCancelarAjuste = document.getElementById('btn-cancelar-ajuste');
const btnConfirmarAjuste = document.getElementById('btn-confirmar-ajuste');
const inputQuantidadeAjuste = document.getElementById('quantidade-ajuste');

const feedbackProdutos = document.getElementById('feedback-produtos');

let idProdutoAjuste = null;

function mostrarFeedback(mensagem, tipo) {
  feedbackProdutos.textContent = mensagem;
  feedbackProdutos.className = `feedback ${tipo}`;
  setTimeout(() => feedbackProdutos.classList.add('hidden'), 4000);
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor || 0);
}

function renderizarProdutos(produtos) {
  if (produtos.length === 0) {
    gridProdutos.innerHTML = `
      <div class="estado-vazio">
        <div class="icone">📦</div>
        <p>Nenhum produto encontrado</p>
      </div>
    `;
    contadorProdutos.textContent = '0 produtos';
    return;
  }

  gridProdutos.innerHTML = produtos.map(produto => {
    const alerta = produto.estoque_atual <= produto.estoque_minimo;
    const fotoHtml = produto.foto_path
      ? `<img src="${produto.foto_path}" alt="${produto.nome}" class="foto-produto">`
      : `<div class="foto-placeholder">📷</div>`;

    return `
      <div class="card-produto ${alerta ? 'alerta-estoque' : ''}" data-id="${produto.id}">
        ${alerta ? '<span class="badge-alerta">Estoque Baixo</span>' : ''}
        ${fotoHtml}
        <div class="info-produto">
          <div class="nome-produto">${produto.nome}</div>
          ${produto.categoria ? `<span class="categoria-produto">${produto.categoria}</span>` : ''}
        </div>
        <div class="preco-produto">${formatarMoeda(produto.preco_venda)}</div>
        <div class="estoque-produto ${alerta ? 'alerta' : ''}">
          Estoque: ${produto.estoque_atual} ${produto.unidade}${alerta ? ` (mín: ${produto.estoque_minimo})` : ''}
        </div>
        <div class="acoes-card">
          <button class="btn-acao primario" onclick="editarProduto(${produto.id})">Editar</button>
          <button class="btn-acao" onclick="abrirModalAjuste(${produto.id})">Estoque</button>
          <button class="btn-acao perigo" onclick="desativarProduto(${produto.id})">Desativar</button>
        </div>
      </div>
    `;
  }).join('');

  contadorProdutos.textContent = `${produtos.length} produto${produtos.length > 1 ? 's' : ''}`;
}

async function carregarProdutos() {
  try {
    const resultado = await window.api.produtos.listar(filtrosAtivos);
    if (resultado.sucesso) {
      renderizarProdutos(resultado.dados);
    } else {
      mostrarFeedback(resultado.erro, 'erro');
    }
  } catch (erro) {
    mostrarFeedback('Erro ao carregar produtos', 'erro');
  }
}

async function carregarCategorias() {
  try {
    const resultado = await window.api.produtos.listarCategorias();
    if (resultado.sucesso) {
      categoriasCache = resultado.dados;
      renderizarCategorias();
    }
  } catch (erro) {
    console.error('Erro ao carregar categorias', erro);
  }
}

function renderizarCategorias() {
  const pillsHtml = categoriasCache.map(cat => `
    <button class="pill-categoria ${filtrosAtivos.categoria === cat ? 'ativo' : ''}" data-categoria="${cat}">
      ${cat}
    </button>
  `).join('');

  const alertaHtml = `
    <button class="pill-categoria pill-alerta ${filtrosAtivos.alertaEstoque ? 'ativo' : ''}" data-alerta="true">
      ⚠️ Estoque Baixo
    </button>
  `;

  containerCategorias.innerHTML = pillsHtml + alertaHtml;

  containerCategorias.querySelectorAll('.pill-categoria').forEach(pill => {
    pill.addEventListener('click', () => {
      const categoria = pill.dataset.categoria;
      const alerta = pill.dataset.alerta === 'true';

      if (alerta) {
        filtrosAtivos.alertaEstoque = !filtrosAtivos.alertaEstoque;
      } else {
        filtrosAtivos.categoria = filtrosAtivos.categoria === categoria ? '' : categoria;
      }

      renderizarCategorias();
      carregarProdutos();
    });
  });
}

function aplicarFiltros() {
  filtrosAtivos.busca = inputBusca.value.trim();
  carregarProdutos();
}

function limparFiltros() {
  filtrosAtivos = { busca: '', categoria: '', alertaEstoque: false };
  inputBusca.value = '';
  renderizarCategorias();
  carregarProdutos();
}

function abrirModal(produto = null) {
  produtoAtual = produto;
  tituloModal.textContent = produto ? 'Editar Produto' : 'Novo Produto';
  limparFormulario();

  if (produto) {
    preencherFormulario(produto);
  }

  overlayModal.classList.add('aberto');
  document.getElementById('codigo-barras').focus();
}

function fecharModal() {
  overlayModal.classList.remove('aberto');
  produtoAtual = null;
}

function preencherFormulario(produto) {
  document.getElementById('nome-produto').value = produto.nome || '';
  document.getElementById('descricao-produto').value = produto.descricao || '';
  document.getElementById('codigo-barras').value = produto.codigo_barras || '';
  document.getElementById('preco-venda').value = produto.preco_venda || '';
  document.getElementById('preco-custo').value = produto.preco_custo || '';
  document.getElementById('unidade').value = produto.unidade || 'unidade';
  document.getElementById('categoria-produto').value = produto.categoria || '';
  document.getElementById('estoque-atual').value = produto.estoque_atual || 0;
  document.getElementById('estoque-minimo').value = produto.estoque_minimo || 0;

  if (produto.foto_path) {
    document.getElementById('preview-foto-produto').src = produto.foto_path;
    document.getElementById('preview-foto-produto').classList.remove('hidden');
    document.getElementById('preview-foto-placeholder').classList.add('hidden');
  }
}

function limparFormulario() {
  formProduto.reset();
  document.getElementById('preview-foto-produto').classList.add('hidden');
  document.getElementById('preview-foto-placeholder').classList.remove('hidden');
}

async function salvarProduto(evento) {
  evento.preventDefault();

  const dados = {
    nome: document.getElementById('nome-produto').value,
    descricao: document.getElementById('descricao-produto').value,
    codigo_barras: document.getElementById('codigo-barras').value,
    preco_venda: parseFloat(document.getElementById('preco-venda').value) || 0,
    preco_custo: parseFloat(document.getElementById('preco-custo').value) || null,
    unidade: document.getElementById('unidade').value,
    categoria: document.getElementById('categoria-produto').value,
    estoque_atual: parseFloat(document.getElementById('estoque-atual').value) || 0,
    estoque_minimo: parseFloat(document.getElementById('estoque-minimo').value) || 0,
    foto_path: document.getElementById('preview-foto-produto').src || ''
  };

  try {
    let resultado;
    if (produtoAtual) {
      resultado = await window.api.produtos.atualizar(produtoAtual.id, dados);
    } else {
      resultado = await window.api.produtos.criar(dados);
    }

    if (resultado.sucesso) {
      mostrarFeedback(produtoAtual ? 'Produto atualizado!' : 'Produto criado!', 'sucesso');
      fecharModal();
      carregarProdutos();
      carregarCategorias();
    } else {
      mostrarFeedback(resultado.erro, 'erro');
    }
  } catch (erro) {
    mostrarFeedback('Erro ao salvar produto', 'erro');
  }
}

async function editarProduto(id) {
  try {
    const resultado = await window.api.produtos.buscar(id);
    if (resultado.sucesso) {
      abrirModal(resultado.dados);
    } else {
      mostrarFeedback(resultado.erro, 'erro');
    }
  } catch (erro) {
    mostrarFeedback('Erro ao buscar produto', 'erro');
  }
}

async function desativarProduto(id) {
  if (!confirm('Tem certeza que deseja desativar este produto?')) return;

  try {
    const resultado = await window.api.produtos.desativar(id);
    if (resultado.sucesso) {
      mostrarFeedback('Produto desativado', 'sucesso');
      carregarProdutos();
      carregarCategorias();
    } else {
      mostrarFeedback(resultado.erro, 'erro');
    }
  } catch (erro) {
    mostrarFeedback('Erro ao desativar produto', 'erro');
  }
}

function abrirModalAjuste(id) {
  idProdutoAjuste = id;
  formAjuste.reset();
  overlayModalAjuste.classList.add('aberto');
  inputQuantidadeAjuste.focus();
}

function fecharModalAjuste() {
  overlayModalAjuste.classList.remove('aberto');
  idProdutoAjuste = null;
}

async function confirmarAjuste(evento) {
  evento.preventDefault();

  const quantidade = parseFloat(inputQuantidadeAjuste.value);
  const tipo = document.querySelector('input[name="tipo-ajuste"]:checked')?.value;

  if (!quantidade || quantidade <= 0) {
    mostrarFeedback('Informe uma quantidade válida', 'erro');
    return;
  }

  if (!tipo) {
    mostrarFeedback('Selecione o tipo de ajuste', 'erro');
    return;
  }

  try {
    const resultado = await window.api.produtos.ajustarEstoque(idProdutoAjuste, quantidade, tipo);
    if (resultado.sucesso) {
      mostrarFeedback('Estoque ajustado com sucesso!', 'sucesso');
      fecharModalAjuste();
      carregarProdutos();
    } else {
      mostrarFeedback(resultado.erro, 'erro');
    }
  } catch (erro) {
    mostrarFeedback('Erro ao ajustar estoque', 'erro');
  }
}

function registrarEventListeners() {
  btnNovoProduto.addEventListener('click', () => abrirModal());
  btnFecharModal.addEventListener('click', fecharModal);
  btnCancelarModal.addEventListener('click', fecharModal);
  formProduto.addEventListener('submit', salvarProduto);

  btnFecharAjuste.addEventListener('click', fecharModalAjuste);
  btnCancelarAjuste.addEventListener('click', fecharModalAjuste);
  formAjuste.addEventListener('submit', confirmarAjuste);

  inputBusca.addEventListener('input', () => {
    clearTimeout(inputBusca.debounce);
    inputBusca.debounce = setTimeout(aplicarFiltros, 300);
  });

  btnLimparFiltros.addEventListener('click', limparFiltros);

  document.getElementById('foto-produto').addEventListener('change', (evento) => {
    const arquivo = evento.target.files[0];
    if (arquivo) {
      const preview = document.getElementById('preview-foto-produto');
      preview.src = arquivo.path;
      preview.classList.remove('hidden');
      document.getElementById('preview-foto-placeholder').classList.add('hidden');
    }
  });

  document.querySelectorAll('input[name="tipo-ajuste"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.opcao-tipo').forEach(op => op.classList.remove('selecionado'));
      radio.closest('.opcao-tipo').classList.add('selecionado');
    });
  });

  document.getElementById('codigo-barras').addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      document.getElementById('nome-produto').focus();
    }
  });

  overlayModal.addEventListener('click', (evento) => {
    if (evento.target === overlayModal) fecharModal();
  });

  overlayModalAjuste.addEventListener('click', (evento) => {
    if (evento.target === overlayModalAjuste) fecharModalAjuste();
  });
}

function inicializarProdutos() {
  carregarProdutos();
  carregarCategorias();
}

registrarEventListeners();
window.inicializarProdutos = inicializarProdutos;