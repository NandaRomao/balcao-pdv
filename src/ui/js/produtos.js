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

// ----- Visualização em lista (controle de estoque) -----
const areaEstoque = document.getElementById('area-estoque');
const corpoTabelaEstoque = document.getElementById('corpo-tabela-estoque');
const resumoEstoque = document.getElementById('resumo-estoque');
const botoesVisualizacao = document.querySelectorAll('.btn-visualizacao');
const cabecalhosOrdenaveis = document.querySelectorAll('.tabela-estoque th[data-ordenar]');

// Até a pessoa escolher, o modo é automático: poucos produtos -> cartões, muitos -> lista
const LIMITE_MODO_AUTOMATICO = 20;
let modoVisualizacao = localStorage.getItem('produtos.modoVisualizacao') || 'cartoes';
let ordenacao = { campo: 'situacao', crescente: true };
let produtosCarregados = [];

function formatarQuantidade(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

// 0 = esgotado, 1 = baixo, 2 = ok (mesma regra do relatório de reposição)
function situacaoEstoque(produto) {
  if (produto.estoque_atual <= 0) return { ordem: 0, classe: 'esgotado', texto: 'Esgotado' };
  if (produto.estoque_minimo > 0 && produto.estoque_atual <= produto.estoque_minimo) {
    return { ordem: 1, classe: 'baixo', texto: 'Baixo' };
  }
  return { ordem: 2, classe: 'ok', texto: 'OK' };
}

function valorEmEstoque(produto) {
  if (!produto.preco_custo || produto.estoque_atual <= 0) return 0;
  return produto.preco_custo * produto.estoque_atual;
}

function valorParaOrdenar(produto, campo) {
  if (campo === 'situacao') return situacaoEstoque(produto).ordem;
  if (campo === 'valor_estoque') return valorEmEstoque(produto);
  if (campo === 'nome') return (produto.nome || '').toLocaleLowerCase('pt-BR');
  return produto[campo] || 0;
}

function ordenarProdutos(produtos) {
  const { campo, crescente } = ordenacao;
  return [...produtos].sort((a, b) => {
    const va = valorParaOrdenar(a, campo);
    const vb = valorParaOrdenar(b, campo);
    let comparacao = typeof va === 'string' ? va.localeCompare(vb, 'pt-BR') : va - vb;
    // Desempate sempre por nome, para a lista não "pular"
    if (comparacao === 0 && campo !== 'nome') {
      comparacao = (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
      return comparacao;
    }
    return crescente ? comparacao : -comparacao;
  });
}

function renderizarResumoEstoque(produtos) {
  const esgotados = produtos.filter(p => situacaoEstoque(p).ordem === 0).length;
  const baixos = produtos.filter(p => situacaoEstoque(p).ordem === 1).length;
  const valorTotal = produtos.reduce((soma, p) => soma + valorEmEstoque(p), 0);
  const semCusto = produtos.filter(p => !p.preco_custo && p.estoque_atual > 0).length;

  resumoEstoque.innerHTML = `
    <span class="item-resumo-estoque esgotado"><strong>${esgotados}</strong> esgotado${esgotados !== 1 ? 's' : ''}</span>
    <span class="item-resumo-estoque baixo"><strong>${baixos}</strong> com estoque baixo</span>
    <span class="item-resumo-estoque" title="Soma de custo × quantidade dos produtos com custo cadastrado">
      Valor em estoque: <strong>${formatarMoeda(valorTotal)}</strong>
      ${semCusto > 0 ? `<em>(${semCusto} sem custo cadastrado)</em>` : ''}
    </span>
  `;
}

function renderizarListaEstoque(produtos) {
  renderizarResumoEstoque(produtos);

  cabecalhosOrdenaveis.forEach(th => {
    th.classList.toggle('ordenado', th.dataset.ordenar === ordenacao.campo);
    th.classList.toggle('decrescente', th.dataset.ordenar === ordenacao.campo && !ordenacao.crescente);
  });

  if (produtos.length === 0) {
    corpoTabelaEstoque.innerHTML = `
      <tr><td colspan="9" class="estado-vazio-tabela">
        Nenhum produto encontrado. Use <strong>+ Novo Produto</strong> para cadastrar.
      </td></tr>
    `;
    return;
  }

  corpoTabelaEstoque.innerHTML = ordenarProdutos(produtos).map(produto => {
    const situacao = situacaoEstoque(produto);
    const valor = valorEmEstoque(produto);
    const detalhes = [produto.categoria, produto.codigo_barras].filter(Boolean).map(escaparHtml).join(' · ');

    return `
      <tr class="linha-estoque situacao-${situacao.classe}" data-id="${produto.id}">
        <td class="col-produto">
          <div class="nome-linha-estoque">${escaparHtml(produto.nome)}</div>
          ${detalhes ? `<div class="detalhe-linha-estoque">${detalhes}</div>` : ''}
        </td>
        <td class="col-num qtd-estoque">${formatarQuantidade(produto.estoque_atual)} <span class="unidade-estoque">${escaparHtml(produto.unidade)}</span></td>
        <td class="col-num">${produto.estoque_minimo > 0 ? formatarQuantidade(produto.estoque_minimo) : '—'}</td>
        <td><span class="tag-situacao ${situacao.classe}">${situacao.texto}</span></td>
        <td class="col-num col-tela">${produto.preco_custo ? formatarMoeda(produto.preco_custo) : '—'}</td>
        <td class="col-num">${formatarMoeda(produto.preco_venda)}</td>
        <td class="col-num col-tela">${valor > 0 ? formatarMoeda(valor) : '—'}</td>
        <td class="col-contagem"></td>
        <td class="col-acoes col-tela">
          <button class="btn-acao" data-acao="estoque" title="Entrada ou saída de estoque">Estoque</button>
          <button class="btn-acao primario" data-acao="editar">Editar</button>
        </td>
      </tr>
    `;
  }).join('');
}

function aplicarModoVisualizacao() {
  const lista = modoVisualizacao === 'lista';
  areaEstoque.classList.toggle('hidden', !lista);
  gridProdutos.classList.toggle('hidden', lista);
  moduloProdutos.classList.toggle('modo-lista', lista);
  botoesVisualizacao.forEach(btn => btn.classList.toggle('ativo', btn.dataset.modo === modoVisualizacao));
}

function trocarModoVisualizacao(modo) {
  modoVisualizacao = modo;
  localStorage.setItem('produtos.modoVisualizacao', modo);
  aplicarModoVisualizacao();
  renderizarProdutos(produtosCarregados);
}

function ordenarPor(campo) {
  if (ordenacao.campo === campo) {
    ordenacao.crescente = !ordenacao.crescente;
  } else {
    ordenacao = { campo, crescente: true };
  }
  renderizarListaEstoque(produtosCarregados);
}

function imprimirEstoque() {
  document.getElementById('data-impressao-estoque').textContent =
    new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  document.body.classList.add('imprimindo-estoque');
  window.print();
  setTimeout(() => document.body.classList.remove('imprimindo-estoque'), 500);
}

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
  produtosCarregados = produtos;

  // Modo automático só com a lista completa (sem busca/filtro), para não ficar trocando enquanto digita
  const semFiltro = !filtrosAtivos.busca && !filtrosAtivos.categoria && !filtrosAtivos.alertaEstoque;
  if (!localStorage.getItem('produtos.modoVisualizacao') && semFiltro) {
    const modoAutomatico = produtos.length > LIMITE_MODO_AUTOMATICO ? 'lista' : 'cartoes';
    if (modoAutomatico !== modoVisualizacao) {
      modoVisualizacao = modoAutomatico;
      aplicarModoVisualizacao();
    }
  }

  contadorProdutos.textContent = `${produtos.length} produto${produtos.length !== 1 ? 's' : ''}`;

  if (modoVisualizacao === 'lista') {
    renderizarListaEstoque(produtos);
    return;
  }

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
      ? `<img src="${escaparHtml(produto.foto_path)}" alt="${escaparHtml(produto.nome)}" class="foto-produto">`
      : `<div class="foto-placeholder">📷</div>`;

    return `
      <div class="card-produto ${alerta ? 'alerta-estoque' : ''}" data-id="${produto.id}">
        ${alerta ? '<span class="badge-alerta">Estoque Baixo</span>' : ''}
        ${fotoHtml}
        <div class="info-produto">
          <div class="nome-produto">${escaparHtml(produto.nome)}</div>
          ${produto.categoria ? `<span class="categoria-produto">${escaparHtml(produto.categoria)}</span>` : ''}
        </div>
        <div class="preco-produto">${formatarMoeda(produto.preco_venda)}</div>
        <div class="estoque-produto ${alerta ? 'alerta' : ''}">
          Estoque: ${produto.estoque_atual} ${escaparHtml(produto.unidade)}${alerta ? ` (mín: ${produto.estoque_minimo})` : ''}
        </div>
        <div class="acoes-card">
          <button class="btn-acao primario" onclick="editarProduto(${produto.id})">Editar</button>
          <button class="btn-acao" onclick="abrirModalAjuste(${produto.id})">Estoque</button>
          <button class="btn-acao perigo" onclick="desativarProduto(${produto.id})">Desativar</button>
        </div>
      </div>
    `;
  }).join('');

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

  botoesVisualizacao.forEach(btn => {
    btn.addEventListener('click', () => trocarModoVisualizacao(btn.dataset.modo));
  });
  cabecalhosOrdenaveis.forEach(th => {
    th.addEventListener('click', () => ordenarPor(th.dataset.ordenar));
  });
  corpoTabelaEstoque.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button[data-acao]');
    const linha = evento.target.closest('tr[data-id]');
    if (!botao || !linha) return;
    const id = parseInt(linha.dataset.id, 10);
    if (botao.dataset.acao === 'estoque') abrirModalAjuste(id);
    if (botao.dataset.acao === 'editar') editarProduto(id);
  });
  document.getElementById('btn-imprimir-estoque').addEventListener('click', imprimirEstoque);

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
  aplicarModoVisualizacao();
  carregarProdutos();
  carregarCategorias();
}

registrarEventListeners();
window.inicializarProdutos = inicializarProdutos;