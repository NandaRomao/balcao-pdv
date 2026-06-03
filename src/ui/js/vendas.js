(function () {
  let carrinho = [];
  let formaPagamento = '';
  let desconto = 0;
  let contadorIdCarrinho = 0;

  const inputBuscaPdv = document.getElementById('busca-pdv');
  const listaResultados = document.getElementById('lista-resultados');
  const listaCarrinho = document.getElementById('lista-carrinho');
  const contadorItens = document.getElementById('contador-itens');
  const subtotalEl = document.getElementById('subtotal-venda');
  const totalEl = document.getElementById('total-venda');
  const inputDesconto = document.getElementById('input-desconto');
  const botoesPagamento = document.querySelectorAll('.btn-pagamento');
  const areaTroco = document.getElementById('area-troco');
  const inputValorPago = document.getElementById('valor-pago');
  const valorTroco = document.getElementById('valor-troco');
  const btnFinalizar = document.getElementById('btn-finalizar');
  const btnCancelar = document.getElementById('btn-cancelar');
  const feedbackVendas = document.getElementById('feedback-vendas');

  const btnItemAvulso = document.getElementById('btn-item-avulso');
  const overlayModalAvulso = document.getElementById('overlay-modal-avulso');
  const descricaoAvulso = document.getElementById('descricao-avulso-pdv');
  const valorAvulsoPdv = document.getElementById('valor-avulso-pdv');
  const quantidadeAvulso = document.getElementById('quantidade-avulso-pdv');
  const btnConfirmarAvulso = document.getElementById('btn-confirmar-avulso-pdv');
  const btnCancelarAvulso = document.getElementById('btn-cancelar-avulso-pdv');
  const btnFecharAvulso = document.getElementById('btn-fechar-avulso-pdv');

  function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  }

  function mostrarFeedback(mensagem, tipo) {
    feedbackVendas.textContent = mensagem;
    feedbackVendas.className = `feedback-vendas ${tipo}`;
    setTimeout(() => {
      feedbackVendas.className = 'feedback-vendas hidden';
    }, 4000);
  }

  function limparBusca() {
    inputBuscaPdv.value = '';
    listaResultados.innerHTML = '';
    inputBuscaPdv.focus();
  }

  function renderizarResultados(produtos) {
    if (produtos.length === 0) {
      listaResultados.innerHTML = `
        <div class="estado-vazio-busca">
          <div class="icone">🔍</div>
          <p>Nenhum produto encontrado</p>
        </div>
      `;
      return;
    }

    listaResultados.innerHTML = produtos.map(produto => {
      const foto = produto.foto_path
        ? `<img src="${produto.foto_path}" class="foto-resultado" alt="">`
        : `<div class="foto-placeholder">📷</div>`;

      return `
        <li class="item-resultado" data-id="${produto.id}">
          ${foto}
          <div class="info-resultado">
            <div class="nome-resultado">${produto.nome}</div>
            <div class="meta-resultado">Estoque: ${produto.estoque_atual} ${produto.unidade}</div>
          </div>
          <div class="preco-resultado">${formatarMoeda(produto.preco_venda)}</div>
        </li>
      `;
    }).join('');

    listaResultados.querySelectorAll('.item-resultado').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.dataset.id);
        const produto = produtos.find(p => p.id === id);
        if (produto) adicionarAoCarrinho(produto);
      });
    });
  }

  async function buscarPorTermo() {
    const termo = inputBuscaPdv.value.trim();
    if (termo.length < 2) {
      listaResultados.innerHTML = '';
      return;
    }

    try {
      const resultado = await window.api.vendas.buscarProdutos(termo);
      if (resultado.sucesso) {
        renderizarResultados(resultado.dados);
      }
    } catch (erro) {
      mostrarFeedback('Erro na busca', 'erro');
    }
  }

  async function buscarPorCodigo() {
    const codigo = inputBuscaPdv.value.trim();
    if (!codigo) return;

    try {
      const resultado = await window.api.vendas.buscarProdutoPorCodigo(codigo);
      if (resultado.sucesso) {
        adicionarAoCarrinho(resultado.dados);
      } else {
        mostrarFeedback(resultado.erro, 'erro');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao buscar código', 'erro');
    }
  }

  function adicionarAoCarrinho(produto) {
    const existente = carrinho.find(item => item.produto_id === produto.id && item.produto_id !== null);

    if (existente) {
      if (existente.quantidade >= produto.estoque_atual) {
        mostrarFeedback(`Estoque insuficiente para "${produto.nome}"`, 'erro');
        return;
      }
      existente.quantidade += 1;
      existente.subtotal = existente.quantidade * existente.preco_unitario;
    } else {
      if (produto.estoque_atual < 1) {
        mostrarFeedback(`Estoque insuficiente para "${produto.nome}"`, 'erro');
        return;
      }
      contadorIdCarrinho += 1;
      carrinho.push({
        id_carrinho: contadorIdCarrinho,
        produto_id: produto.id,
        nome_produto: produto.nome,
        preco_unitario: produto.preco_venda,
        quantidade: 1,
        subtotal: produto.preco_venda,
        estoque_disponivel: produto.estoque_atual,
        avulso: false
      });
    }

    renderizarCarrinho();
    calcularTotais();
    limparBusca();
  }

  function adicionarItemAvulso(descricao, valor, quantidade) {
    contadorIdCarrinho += 1;
    carrinho.push({
      id_carrinho: contadorIdCarrinho,
      produto_id: null,
      nome_produto: descricao,
      preco_unitario: valor,
      quantidade: quantidade,
      subtotal: valor * quantidade,
      estoque_disponivel: Infinity,
      avulso: true
    });

    renderizarCarrinho();
    calcularTotais();
  }

  function alterarQuantidade(idCarrinho, delta) {
    const item = carrinho.find(i => i.id_carrinho === idCarrinho);
    if (!item) return;

    const novaQuantidade = item.quantidade + delta;

    if (novaQuantidade < 1) {
      removerDoCarrinho(idCarrinho);
      return;
    }

    if (!item.avulso && novaQuantidade > item.estoque_disponivel) {
      mostrarFeedback(`Estoque máximo: ${item.estoque_disponivel}`, 'erro');
      return;
    }

    item.quantidade = novaQuantidade;
    item.subtotal = item.quantidade * item.preco_unitario;

    renderizarCarrinho();
    calcularTotais();
  }

  function removerDoCarrinho(idCarrinho) {
    carrinho = carrinho.filter(item => item.id_carrinho !== idCarrinho);
    renderizarCarrinho();
    calcularTotais();
  }

  function renderizarCarrinho() {
    if (carrinho.length === 0) {
      listaCarrinho.innerHTML = `
        <div class="carrinho-vazio">
          <div class="icone">🛒</div>
          <p>Adicione produtos para iniciar a venda</p>
        </div>
      `;
      contadorItens.textContent = '0 itens';
      return;
    }

    listaCarrinho.innerHTML = carrinho.map(item => `
      <div class="item-carrinho">
        <div class="info-item-carrinho">
          <div class="nome-item-carrinho">${item.nome_produto}</div>
          <div class="preco-item-carrinho">${formatarMoeda(item.preco_unitario)} / un</div>
          <div class="controles-quantidade">
            <button class="btn-quantidade" onclick="window.alterarQuantidadeVenda(${item.id_carrinho}, -1)">−</button>
            <span class="valor-quantidade">${item.quantidade}</span>
            <button class="btn-quantidade" onclick="window.alterarQuantidadeVenda(${item.id_carrinho}, 1)">+</button>
          </div>
        </div>
        <div class="subtotal-item">
          <div class="valor-subtotal">${formatarMoeda(item.subtotal)}</div>
          <button class="btn-remover-item" onclick="window.removerDoCarrinhoVenda(${item.id_carrinho})">✕</button>
        </div>
      </div>
    `).join('');

    const totalItens = carrinho.reduce((soma, item) => soma + item.quantidade, 0);
    contadorItens.textContent = `${totalItens} item${totalItens > 1 ? 's' : ''}`;
  }

  function calcularTotais() {
    const subtotal = carrinho.reduce((soma, item) => soma + item.subtotal, 0);
    const descontoValor = parseFloat(inputDesconto.value) || 0;
    const total = Math.max(0, subtotal - descontoValor);

    subtotalEl.textContent = formatarMoeda(subtotal);
    totalEl.textContent = formatarMoeda(total);

    desconto = descontoValor;
    calcularTroco();
    validarVenda();
  }

  function selecionarFormaPagamento(forma) {
    formaPagamento = forma;
    botoesPagamento.forEach(btn => {
      btn.classList.toggle('selecionado', btn.dataset.forma === forma);
    });

    if (forma === 'dinheiro') {
      areaTroco.classList.remove('hidden');
      inputValorPago.focus();
    } else {
      areaTroco.classList.add('hidden');
      inputValorPago.value = '';
      valorTroco.textContent = formatarMoeda(0);
      valorTroco.className = '';
    }

    validarVenda();
  }

  function calcularTroco() {
    if (formaPagamento !== 'dinheiro') return;

    const total = carrinho.reduce((soma, item) => soma + item.subtotal, 0) - desconto;
    const pago = parseFloat(inputValorPago.value) || 0;
    const troco = pago - total;

    valorTroco.textContent = formatarMoeda(Math.abs(troco));
    valorTroco.className = troco >= 0 ? 'positivo' : 'negativo';

    validarVenda();
  }

  function validarVenda() {
    const total = carrinho.reduce((soma, item) => soma + item.subtotal, 0) - desconto;

    let valido = carrinho.length > 0 && formaPagamento !== '';

    if (formaPagamento === 'dinheiro') {
      const pago = parseFloat(inputValorPago.value) || 0;
      valido = valido && pago >= total;
    }

    btnFinalizar.disabled = !valido;
  }

  async function finalizarVenda() {
    if (!validarVendaSilencioso()) return;

    const subtotal = carrinho.reduce((soma, item) => soma + item.subtotal, 0);
    const total = Math.max(0, subtotal - desconto);
    const valorPago = formaPagamento === 'dinheiro' ? (parseFloat(inputValorPago.value) || 0) : total;
    const troco = formaPagamento === 'dinheiro' ? valorPago - total : 0;

    const dadosVenda = {
      itens: carrinho.map(item => ({
        produto_id: item.produto_id,
        nome_produto: item.nome_produto,
        preco_unitario: item.preco_unitario,
        quantidade: item.quantidade,
        subtotal: item.subtotal
      })),
      subtotal,
      desconto,
      total,
      forma_pagamento: formaPagamento,
      valor_pago: valorPago,
      troco
    };

    try {
      const resultado = await window.api.vendas.finalizar(dadosVenda);
      if (resultado.sucesso) {
        mostrarFeedback(`Venda #${resultado.dados.venda_id} finalizada!`, 'sucesso');
        limparVenda();
      } else {
        mostrarFeedback(resultado.erro, 'erro');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao finalizar venda', 'erro');
    }
  }

  function validarVendaSilencioso() {
    const total = carrinho.reduce((soma, item) => soma + item.subtotal, 0) - desconto;
    if (carrinho.length === 0) return false;
    if (!formaPagamento) return false;
    if (formaPagamento === 'dinheiro') {
      const pago = parseFloat(inputValorPago.value) || 0;
      return pago >= total;
    }
    return true;
  }

  function limparVenda() {
    carrinho = [];
    formaPagamento = '';
    desconto = 0;
    inputDesconto.value = '';
    inputValorPago.value = '';
    areaTroco.classList.add('hidden');
    botoesPagamento.forEach(btn => btn.classList.remove('selecionado'));
    renderizarCarrinho();
    calcularTotais();
    limparBusca();
  }

  function cancelarVenda() {
    if (carrinho.length > 0) {
      if (!confirm('Deseja cancelar a venda atual?')) return;
    }
    limparVenda();
  }

  function abrirModalAvulso() {
    descricaoAvulso.value = '';
    valorAvulsoPdv.value = '';
    quantidadeAvulso.value = '1';
    overlayModalAvulso.classList.add('aberto');
    descricaoAvulso.focus();
  }

  function fecharModalAvulso() {
    overlayModalAvulso.classList.remove('aberto');
  }

  function confirmarAvulso() {
    const descricao = descricaoAvulso.value.trim();
    const valor = parseFloat(valorAvulsoPdv.value);
    const quantidade = parseFloat(quantidadeAvulso.value) || 1;

    if (!descricao) {
      mostrarFeedback('Informe a descrição do item', 'erro');
      return;
    }
    if (!valor || valor <= 0) {
      mostrarFeedback('Informe um valor válido', 'erro');
      return;
    }
    if (quantidade <= 0) {
      mostrarFeedback('Quantidade inválida', 'erro');
      return;
    }

    adicionarItemAvulso(descricao, valor, quantidade);
    fecharModalAvulso();
  }

  function registrarAtalhos(evento) {
    if (evento.key === 'F9' && !btnFinalizar.disabled) {
      evento.preventDefault();
      finalizarVenda();
    }
  }

  function registrarEventListeners() {
    inputBuscaPdv.addEventListener('input', () => {
      clearTimeout(inputBuscaPdv.debounce);
      inputBuscaPdv.debounce = setTimeout(buscarPorTermo, 300);
    });

    inputBuscaPdv.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') {
        evento.preventDefault();
        buscarPorCodigo();
      }
    });

    inputDesconto.addEventListener('input', calcularTotais);
    inputValorPago.addEventListener('input', calcularTroco);

    botoesPagamento.forEach(btn => {
      btn.addEventListener('click', () => selecionarFormaPagamento(btn.dataset.forma));
    });

    btnFinalizar.addEventListener('click', finalizarVenda);
    btnCancelar.addEventListener('click', cancelarVenda);

    btnItemAvulso.addEventListener('click', abrirModalAvulso);
    btnConfirmarAvulso.addEventListener('click', confirmarAvulso);
    btnCancelarAvulso.addEventListener('click', fecharModalAvulso);
    btnFecharAvulso.addEventListener('click', fecharModalAvulso);
    overlayModalAvulso.addEventListener('click', (evento) => {
      if (evento.target === overlayModalAvulso) fecharModalAvulso();
    });

    document.addEventListener('keydown', registrarAtalhos);
  }

  window.alterarQuantidadeVenda = alterarQuantidade;
  window.removerDoCarrinhoVenda = removerDoCarrinho;

  function inicializarVendas() {
    carrinho = [];
    formaPagamento = '';
    desconto = 0;
    inputDesconto.value = '';
    inputValorPago.value = '';
    areaTroco.classList.add('hidden');
    botoesPagamento.forEach(btn => btn.classList.remove('selecionado'));
    listaResultados.innerHTML = '';
    renderizarCarrinho();
    calcularTotais();
    limparBusca();
  }

  registrarEventListeners();
  window.inicializarVendas = inicializarVendas;
})();