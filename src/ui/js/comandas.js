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

  const btnAvulsoComanda = document.getElementById('btn-avulso-comanda');
  const formAvulsoComanda = document.getElementById('form-avulso-comanda');
  const descricaoAvulsoComanda = document.getElementById('descricao-avulso-comanda');
  const valorAvulsoComanda = document.getElementById('valor-avulso-comanda');
  const quantidadeAvulsoComanda = document.getElementById('quantidade-avulso-comanda');
  const btnConfirmarAvulsoComanda = document.getElementById('btn-confirmar-avulso-comanda');
  const btnCancelarAvulsoComanda = document.getElementById('btn-cancelar-avulso-comanda');

  let itensAtuais = [];
  let ultimosResultadosBusca = [];

  function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  }

  function formatarHora(dataString) {
    if (!dataString) return '';
    const data = dataDoBanco(dataString);
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function tempoAberta(dataString) {
    const data = dataDoBanco(dataString);
    if (!data) return '';
    const minutos = Math.max(0, Math.floor((Date.now() - data.getTime()) / 60000));
    if (minutos < 1) return 'agora';
    if (minutos < 60) return `há ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return `há ${horas}h${resto ? String(resto).padStart(2, '0') : ''}`;
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
          <span class="nome-item-comanda">${escaparHtml(comanda.nome_cliente || 'Mesa ' + comanda.mesa)}</span>
          <span class="total-item-comanda">${formatarMoeda(comanda.total_parcial)}</span>
        </div>
        <div class="meta-item-comanda">
          ${comanda.qtd_itens} ite${comanda.qtd_itens !== 1 ? 'ns' : 'm'} • ${comanda.mesa ? 'Mesa ' + escaparHtml(comanda.mesa) : 'Balcão'} • aberta ${tempoAberta(comanda.aberta_em)}
        </div>
      </div>
    `).join('');
  }

  function selecionarComanda(id) {
    comandaSelecionadaId = id;
    detalheComanda.classList.remove('hidden');
    pagamentoComanda.classList.add('hidden');
    btnFecharComanda.classList.remove('hidden');
    esconderFormAvulso();

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
    itensAtuais = itens;
    if (itens.length === 0) {
      itensComanda.innerHTML = '<div class="estado-vazio-comandas"><p>Adicione produtos</p></div>';
      return;
    }

    itensComanda.innerHTML = itens.map(item => `
      <div class="item-comanda-detalhe">
        <div class="info-item-comanda-detalhe">
          <div class="nome-item-comanda-detalhe">${escaparHtml(item.nome_produto)}</div>
          <div class="hora-item-comanda">${formatarHora(item.adicionado_em)} • ${formatarMoeda(item.preco_unitario)} un${item.produto_id ? '' : ' • avulso'}</div>
        </div>
        <div class="controles-qtd-comanda">
          <button class="btn-qtd-comanda" title="Tirar 1" onclick="window.alterarQtdItemComandaPainel(${item.id}, -1)">−</button>
          <span class="qtd-item-comanda">${item.quantidade}</span>
          <button class="btn-qtd-comanda" title="Mais 1" onclick="window.alterarQtdItemComandaPainel(${item.id}, 1)">+</button>
        </div>
        <div class="valor-item-comanda-detalhe">${formatarMoeda(item.subtotal)}</div>
        <button class="btn-remover-item-comanda" title="Cancelar item" onclick="window.removerItemComandaPainel(${item.id})">✕</button>
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
    ultimosResultadosBusca = produtos;
    if (produtos.length === 0) {
      resultadosComanda.innerHTML = '';
      return;
    }

    resultadosComanda.innerHTML = produtos.map(produto => `
      <div class="resultado-comanda-item" data-id="${produto.id}">
        <strong>${escaparHtml(produto.nome)}</strong> — ${formatarMoeda(produto.preco_venda)}
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
        buscaProdutoComanda.focus();
      } else {
        mostrarFeedback(resultado.erro, 'erro');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao adicionar item', 'erro');
    }
  }

  // Enter na busca: tenta código de barras exato; senão, se só há um resultado, adiciona ele
  async function adicionarPorEnter() {
    const termo = buscaProdutoComanda.value.trim();
    if (!termo || !comandaSelecionadaId) return;
    clearTimeout(buscaProdutoComanda.debounce);

    try {
      const porCodigo = await window.api.vendas.buscarProdutoPorCodigo(termo);
      let produto = porCodigo.sucesso ? porCodigo.dados : null;

      if (!produto) {
        const busca = await window.api.vendas.buscarProdutos(termo);
        if (busca.sucesso && busca.dados.length === 1) {
          produto = busca.dados[0];
        } else if (busca.sucesso && busca.dados.length > 1) {
          renderizarResultadosComanda(busca.dados);
          mostrarFeedback('Mais de um produto encontrado: clique no certo', 'erro');
          return;
        }
      }

      if (!produto) {
        mostrarFeedback('Produto não encontrado', 'erro');
        return;
      }

      buscaProdutoComanda.value = '';
      resultadosComanda.innerHTML = '';
      await adicionarItem(produto.id);
    } catch (erro) {
      mostrarFeedback('Erro ao buscar produto', 'erro');
    }
  }

  async function alterarQuantidadeItem(itemId, delta) {
    const item = itensAtuais.find(i => i.id === itemId);
    if (item && delta < 0 && item.quantidade + delta <= 0) {
      removerItem(itemId);
      return;
    }

    try {
      const resultado = await window.api.comandas.alterarQuantidade(itemId, delta);
      if (resultado.sucesso) {
        carregarDetalhe(comandaSelecionadaId);
      } else {
        mostrarFeedback(resultado.erro, 'erro');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao alterar quantidade', 'erro');
    }
  }

  function mostrarFormAvulso() {
    formAvulsoComanda.classList.remove('hidden');
    descricaoAvulsoComanda.value = '';
    valorAvulsoComanda.value = '';
    quantidadeAvulsoComanda.value = '1';
    descricaoAvulsoComanda.focus();
  }

  function esconderFormAvulso() {
    formAvulsoComanda.classList.add('hidden');
  }

  async function confirmarAvulso() {
    if (!comandaSelecionadaId) return;

    const descricao = descricaoAvulsoComanda.value.trim();
    const valor = parseFloat(valorAvulsoComanda.value);
    const quantidade = parseFloat(quantidadeAvulsoComanda.value) || 1;

    if (!descricao) {
      mostrarFeedback('Informe a descrição do item', 'erro');
      descricaoAvulsoComanda.focus();
      return;
    }
    if (!(valor > 0)) {
      mostrarFeedback('Informe um valor válido', 'erro');
      valorAvulsoComanda.focus();
      return;
    }

    try {
      const resultado = await window.api.comandas.adicionarItem(comandaSelecionadaId, {
        produto_id: null,
        nome_produto: descricao,
        preco_unitario: valor,
        quantidade
      });
      if (resultado.sucesso) {
        esconderFormAvulso();
        carregarDetalhe(comandaSelecionadaId);
      } else {
        mostrarFeedback(resultado.erro, 'erro');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao adicionar item avulso', 'erro');
    }
  }

  async function removerItem(itemId) {
    const item = itensAtuais.find(i => i.id === itemId);
    const descricao = item ? `${item.quantidade}× ${item.nome_produto}` : 'este item';
    if (!confirm(`Cancelar ${descricao} da comanda?`)) return;

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
    const resumo = itensAtuais.length > 0
      ? `\n\n${itensAtuais.length} ite${itensAtuais.length !== 1 ? 'ns' : 'm'} • ${formatarMoeda(totalParcialAtual)} não serão cobrados.`
      : '';
    if (!confirm(`Cancelar a comanda "${tituloComanda.textContent}"?${resumo}`)) return;

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

    buscaProdutoComanda.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') {
        evento.preventDefault();
        adicionarPorEnter();
      }
    });

    btnAvulsoComanda.addEventListener('click', mostrarFormAvulso);
    btnConfirmarAvulsoComanda.addEventListener('click', confirmarAvulso);
    btnCancelarAvulsoComanda.addEventListener('click', esconderFormAvulso);
    [descricaoAvulsoComanda, valorAvulsoComanda, quantidadeAvulsoComanda].forEach(campo => {
      campo.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') confirmarAvulso();
        if (evento.key === 'Escape') esconderFormAvulso();
      });
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
  window.alterarQtdItemComandaPainel = alterarQuantidadeItem;

  // Mantém o "aberta há X min" atualizado enquanto o painel está visível
  setInterval(() => {
    if (painelComandas.classList.contains('aberto')) carregarComandasAbertas();
  }, 60000);

  registrarEventListeners();
})();