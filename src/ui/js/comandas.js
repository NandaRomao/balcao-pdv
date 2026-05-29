(function () {
  let comandaSelecionadaId = null;
  let formaPagamentoComanda = '';
  let totalParcialAtual = 0;

  const painelComandas = document.getElementById('painel-comandas');
  const wrapperConteudo = document.getElementById('wrapper-conteudo');
  const btnToggleComandas = document.getElementById('btn-toggle-comandas');
  const btnFecharPainel = document.getElementById('btn-fechar-painel');
  const badgeComandas = document.getElementById('badge-comandas');

  const btnNovaComanda = document.getElementById('btn-nova-comanda');
  const formNovaComanda = document.getElementById('form-nova-comanda');
  const inputNomeCliente = document.getElementById('input-nome-cliente');
  const inputMesa = document.getElementById('input-mesa');
  const btnConfirmarComanda = document.getElementById('btn-confirmar-comanda');
  const btnCancelarFormComanda = document.getElementById('btn-cancelar-form-comanda');

  const listaComandas = document.getElementById('lista-comandas');
  const detalheComanda = document.getElementById('detalhe-comanda');
  const tituloComanda = document.getElementById('titulo-comanda');
  const btnCancelarComanda = document.getElementById('btn-cancelar-comanda');

  const buscaProdutoComanda = document.getElementById('busca-produto-comanda');
  const resultadosComanda = document.getElementById('resultados-comanda');
  const itensComanda = document.getElementById('itens-comanda');
  const totalComandaValor = document.getElementById('total-comanda-valor');

  const btnFecharComanda = document.getElementById('btn-fechar-comanda');
  const pagamentoComanda = document.getElementById('pagamento-comanda');
  const botoesPagComanda = document.querySelectorAll('.btn-pag-comanda');
  const descontoComanda = document.getElementById('desconto-comanda');
  const areaPagoComanda = document.getElementById('area-pago-comanda');
  const valorPagoComanda = document.getElementById('valor-pago-comanda');
  const trocoComanda = document.getElementById('troco-comanda');
  const trocoComandaValor = document.getElementById('troco-comanda-valor');
  const btnConfirmarPagamento = document.getElementById('btn-confirmar-pagamento');
  const btnVoltarPagamento = document.getElementById('btn-voltar-pagamento');

  const feedbackComanda = document.getElementById('feedback-comanda');

  function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  }

  function formatarHora(dataString) {
    if (!dataString) return '';
    const data = new Date(dataString);
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function mostrarFeedback(mensagem, tipo) {
    feedbackComanda.textContent = mensagem;
    feedbackComanda.className = `feedback-comanda ${tipo}`;
    setTimeout(() => {
      feedbackComanda.className = 'feedback-comanda hidden';
    }, 3000);
  }

  function alternarPainel() {
    painelComandas.classList.toggle('aberto');
    wrapperConteudo.classList.toggle('painel-aberto');

    if (painelComandas.classList.contains('aberto')) {
      carregarComandasAbertas();
    }
  }

  function fecharPainel() {
    painelComandas.classList.remove('aberto');
    wrapperConteudo.classList.remove('painel-aberto');
  }

  function mostrarFormNovaComanda() {
    formNovaComanda.classList.remove('hidden');
    inputNomeCliente.focus();
  }

  function esconderFormNovaComanda() {
    formNovaComanda.classList.add('hidden');
    inputNomeCliente.value = '';
    inputMesa.value = '';
  }

  async function criarComanda() {
    const nome = inputNomeCliente.value.trim();
    const mesa = inputMesa.value.trim();

    if (!nome && !mesa) {
      mostrarFeedback('Informe o nome ou a mesa', 'erro');
      return;
    }

    try {
      const resultado = await window.api.comandas.criar({ nome_cliente: nome, mesa, observacao: '' });
      if (resultado.sucesso) {
        mostrarFeedback('Comanda criada!', 'sucesso');
        esconderFormNovaComanda();
        await carregarComandasAbertas();
        selecionarComanda(resultado.dados.id);
      } else {
        mostrarFeedback(resultado.erro, 'erro');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao criar comanda', 'erro');
    }
  }

  async function carregarComandasAbertas() {
    try {
      const resultado = await window.api.comandas.listarAbertas();
      if (resultado.sucesso) {
        renderizarComandas(resultado.dados);
        atualizarBadge(resultado.dados.length);
      }
    } catch (erro) {
      mostrarFeedback('Erro ao carregar comandas', 'erro');
    }
  }

  function atualizarBadge(quantidade) {
    if (quantidade > 0) {
      badgeComandas.textContent = quantidade;
      badgeComandas.classList.remove('hidden');
    } else {
      badgeComandas.classList.add('hidden');
    }
  }

  function renderizarComandas(comandas) {
    if (comandas.length === 0) {
      listaComandas.innerHTML = `
        <div class="estado-vazio-comandas">
          <div class="icone">🍽️</div>
          <p>Nenhuma comanda aberta</p>
        </div>
      `;
      return;
    }

    listaComandas.innerHTML = comandas.map(comanda => `
      <div class="item-comanda ${comanda.id === comandaSelecionadaId ? 'selecionado' : ''}"
           data-id="${comanda.id}"
           onclick="window.selecionarComandaPainel(${comanda.id})">
        <div class="cabecalho-item-comanda">
          <span class="nome-item-comanda">${comanda.nome_cliente || 'Mesa ' + comanda.mesa}</span>
          <span class="total-item-comanda">${formatarMoeda(comanda.total_parcial)}</span>
        </div>
        <div class="meta-item-comanda">
          ${comanda.qtd_itens} item${comanda.qtd_itens !== 1 ? 's' : ''} • ${comanda.mesa ? 'Mesa ' + comanda.mesa : 'Balcão'}
        </div>
      </div>
    `).join('');
  }

  function selecionarComanda(id) {
    comandaSelecionadaId = id;
    detalheComanda.classList.remove('hidden');
    pagamentoComanda.classList.add('hidden');
    btnFecharComanda.classList.remove('hidden');

    document.querySelectorAll('.item-comanda').forEach(el => {
      el.classList.toggle('selecionado', parseInt(el.dataset?.id || 0) === id);
    });

    carregarDetalhe(id);
  }

  async function carregarDetalhe(id) {
    try {
      const resultado = await window.api.comandas.buscarDetalhe(id);
      if (resultado.sucesso) {
        const comanda = resultado.dados;
        tituloComanda.textContent = comanda.nome_cliente || 'Mesa ' + comanda.mesa;
        totalParcialAtual = comanda.total_parcial;
        totalComandaValor.textContent = formatarMoeda(comanda.total_parcial);
        renderizarItens(comanda.itens);
        carregarComandasAbertas();
      }
    } catch (erro) {
      mostrarFeedback('Erro ao carregar detalhe', 'erro');
    }
  }

  function renderizarItens(itens) {
    if (itens.length === 0) {
      itensComanda.innerHTML = '<div class="estado-vazio-comandas"><p>Adicione produtos</p></div>';
      return;
    }

    itensComanda.innerHTML = itens.map(item => `
      <div class="item-comanda-detalhe">
        <div class="info-item-comanda-detalhe">
          <div class="nome-item-comanda-detalhe">${item.nome_produto}</div>
          <div class="hora-item-comanda">${formatarHora(item.adicionado_em)} • ${item.quantidade} un</div>
        </div>
        <div class="valor-item-comanda-detalhe">${formatarMoeda(item.subtotal)}</div>
        <button class="btn-remover-item-comanda" onclick="window.removerItemComandaPainel(${item.id})">✕</button>
      </div>
    `).join('');
  }

  async function buscarProdutosComanda() {
    const termo = buscaProdutoComanda.value.trim();
    if (termo.length < 2) {
      resultadosComanda.innerHTML = '';
      return;
    }

    try {
      const resultado = await window.api.vendas.buscarProdutos(termo);
      if (resultado.sucesso) {
        renderizarResultadosComanda(resultado.dados);
      }
    } catch (erro) {
      mostrarFeedback('Erro na busca', 'erro');
    }
  }

  function renderizarResultadosComanda(produtos) {
    if (produtos.length === 0) {
      resultadosComanda.innerHTML = '';
      return;
    }

    resultadosComanda.innerHTML = produtos.map(produto => `
      <div class="resultado-comanda-item" data-id="${produto.id}">
        <strong>${produto.nome}</strong> — ${formatarMoeda(produto.preco_venda)}
      </div>
    `).join('');

    resultadosComanda.querySelectorAll('.resultado-comanda-item').forEach(el => {
      el.addEventListener('click', () => {
        adicionarItem(parseInt(el.dataset.id));
        buscaProdutoComanda.value = '';
        resultadosComanda.innerHTML = '';
      });
    });
  }

  async function adicionarItem(produtoId) {
    if (!comandaSelecionadaId) return;

    try {
      const resultado = await window.api.comandas.adicionarItem(comandaSelecionadaId, {
        produto_id: produtoId,
        quantidade: 1
      });

      if (resultado.sucesso) {
        carregarDetalhe(comandaSelecionadaId);
      } else {
        mostrarFeedback(resultado.erro, 'erro');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao adicionar item', 'erro');
    }
  }

  async function removerItem(itemId) {
    if (!confirm('Remover este item?')) return;

    try {
      const resultado = await window.api.comandas.removerItem(itemId);
      if (resultado.sucesso) {
        carregarDetalhe(comandaSelecionadaId);
      } else {
        mostrarFeedback(resultado.erro, 'erro');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao remover item', 'erro');
    }
  }

  function mostrarPagamento() {
    if (totalParcialAtual <= 0) {
      mostrarFeedback('Adicione itens antes de fechar', 'erro');
      return;
    }

    pagamentoComanda.classList.remove('hidden');
    btnFecharComanda.classList.add('hidden');
    formaPagamentoComanda = '';
    descontoComanda.value = '0';
    valorPagoComanda.value = '';
    trocoComanda.classList.add('hidden');
    areaPagoComanda.classList.add('hidden');
    botoesPagComanda.forEach(btn => btn.classList.remove('selecionado'));
  }

  function esconderPagamento() {
    pagamentoComanda.classList.add('hidden');
    btnFecharComanda.classList.remove('hidden');
  }

  function selecionarFormaPagamento(forma) {
    formaPagamentoComanda = forma;
    botoesPagComanda.forEach(btn => {
      btn.classList.toggle('selecionado', btn.dataset.forma === forma);
    });

    if (forma === 'dinheiro') {
      areaPagoComanda.classList.remove('hidden');
      calcularTrocoComanda();
    } else {
      areaPagoComanda.classList.add('hidden');
      trocoComanda.classList.add('hidden');
    }
  }

  function calcularTrocoComanda() {
    if (formaPagamentoComanda !== 'dinheiro') return;

    const desconto = parseFloat(descontoComanda.value) || 0;
    const total = Math.max(0, totalParcialAtual - desconto);
    const pago = parseFloat(valorPagoComanda.value) || 0;
    const troco = pago - total;

    trocoComandaValor.textContent = formatarMoeda(Math.abs(troco));
    trocoComanda.classList.remove('hidden');

    if (troco >= 0) {
      trocoComanda.style.color = 'var(--cor-sucesso)';
    } else {
      trocoComanda.style.color = 'var(--cor-erro)';
    }
  }

  async function confirmarPagamento() {
    if (!formaPagamentoComanda) {
      mostrarFeedback('Selecione a forma de pagamento', 'erro');
      return;
    }

    const desconto = parseFloat(descontoComanda.value) || 0;
    const total = Math.max(0, totalParcialAtual - desconto);
    const valorPago = formaPagamentoComanda === 'dinheiro'
      ? (parseFloat(valorPagoComanda.value) || 0)
      : total;

    if (formaPagamentoComanda === 'dinheiro' && valorPago < total) {
      mostrarFeedback('Valor pago insuficiente', 'erro');
      return;
    }

    const troco = formaPagamentoComanda === 'dinheiro'
      ? Math.max(0, valorPago - total)
      : 0;

    const dadosPagamento = {
      forma_pagamento: formaPagamentoComanda,
      desconto,
      valor_pago: valorPago,
      troco
    };

    try {
      const resultado = await window.api.comandas.fechar(comandaSelecionadaId, dadosPagamento);
      if (resultado.sucesso) {
        mostrarFeedback(`Comanda fechada! Venda #${resultado.dados.venda_id}`, 'sucesso');
        detalheComanda.classList.add('hidden');
        comandaSelecionadaId = null;
        totalParcialAtual = 0;
        carregarComandasAbertas();
      } else {
        mostrarFeedback(resultado.erro, 'erro');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao fechar comanda', 'erro');
    }
  }

  async function cancelarComanda() {
    if (!comandaSelecionadaId) return;
    if (!confirm('Cancelar esta comanda?')) return;

    try {
      const resultado = await window.api.comandas.cancelar(comandaSelecionadaId);
      if (resultado.sucesso) {
        mostrarFeedback('Comanda cancelada', 'sucesso');
        detalheComanda.classList.add('hidden');
        comandaSelecionadaId = null;
        totalParcialAtual = 0;
        carregarComandasAbertas();
      } else {
        mostrarFeedback(resultado.erro, 'erro');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao cancelar comanda', 'erro');
    }
  }

  function registrarEventListeners() {
    btnToggleComandas.addEventListener('click', alternarPainel);
    btnFecharPainel.addEventListener('click', fecharPainel);

    btnNovaComanda.addEventListener('click', mostrarFormNovaComanda);
    btnConfirmarComanda.addEventListener('click', criarComanda);
    btnCancelarFormComanda.addEventListener('click', esconderFormNovaComanda);

    btnCancelarComanda.addEventListener('click', cancelarComanda);
    btnFecharComanda.addEventListener('click', mostrarPagamento);

    buscaProdutoComanda.addEventListener('input', () => {
      clearTimeout(buscaProdutoComanda.debounce);
      buscaProdutoComanda.debounce = setTimeout(buscarProdutosComanda, 300);
    });

    botoesPagComanda.forEach(btn => {
      btn.addEventListener('click', () => selecionarFormaPagamento(btn.dataset.forma));
    });

    descontoComanda.addEventListener('input', calcularTrocoComanda);
    valorPagoComanda.addEventListener('input', calcularTrocoComanda);

    btnConfirmarPagamento.addEventListener('click', confirmarPagamento);
    btnVoltarPagamento.addEventListener('click', esconderPagamento);
  }

  window.selecionarComandaPainel = selecionarComanda;
  window.removerItemComandaPainel = removerItem;

  registrarEventListeners();
})();