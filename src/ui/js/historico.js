// Histórico de vendas: lista as vendas do período, mostra os itens e permite cancelar.
(function () {
  let periodoAtual = { inicio: '', fim: '' };
  let vendasCarregadas = [];
  let vendaParaCancelar = null;
  const itensCarregados = new Map();
  const vendasAbertas = new Set();

  const botoesPeriodo = document.querySelectorAll('.btn-periodo-historico');
  const inputDia = document.getElementById('data-historico');
  const resumoHistorico = document.getElementById('resumo-historico');
  const listaHistorico = document.getElementById('lista-historico');
  const feedbackHistorico = document.getElementById('feedback-historico');

  const overlayCancelar = document.getElementById('overlay-modal-cancelar-venda');
  const tituloCancelar = document.getElementById('titulo-cancelar-venda');
  const resumoCancelar = document.getElementById('resumo-cancelar-venda');
  const avisoFiado = document.getElementById('aviso-fiado-cancelar');
  const inputMotivo = document.getElementById('motivo-cancelar-venda');
  const btnConfirmarCancelar = document.getElementById('btn-confirmar-cancelar-venda');
  const btnVoltarCancelar = document.getElementById('btn-voltar-cancelar-venda');
  const btnFecharCancelar = document.getElementById('btn-fechar-cancelar-venda');

  function mostrarFeedback(mensagem, tipo) {
    feedbackHistorico.textContent = mensagem;
    feedbackHistorico.className = `feedback ${tipo}`;
    setTimeout(() => {
      feedbackHistorico.className = 'feedback hidden';
    }, 4000);
  }

  function dataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  function calcularPeriodo(tipo) {
    const hoje = new Date();
    if (tipo === 'ontem') {
      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);
      return { inicio: dataISO(ontem), fim: dataISO(ontem) };
    }
    if (tipo === '7dias') {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 6);
      return { inicio: dataISO(inicio), fim: dataISO(hoje) };
    }
    return { inicio: dataISO(hoje), fim: dataISO(hoje) };
  }

  function selecionarPeriodo(tipo) {
    botoesPeriodo.forEach(btn => btn.classList.toggle('ativo', btn.dataset.periodo === tipo));
    periodoAtual = calcularPeriodo(tipo);
    inputDia.value = periodoAtual.inicio === periodoAtual.fim ? periodoAtual.inicio : '';
    carregarVendas();
  }

  function selecionarDia() {
    if (!inputDia.value) return;
    botoesPeriodo.forEach(btn => btn.classList.remove('ativo'));
    periodoAtual = { inicio: inputDia.value, fim: inputDia.value };
    carregarVendas();
  }

  async function carregarVendas() {
    try {
      const resultado = await window.api.vendas.listar(periodoAtual);
      if (!resultado.sucesso) {
        mostrarFeedback(resultado.erro, 'erro');
        return;
      }
      vendasCarregadas = resultado.dados;
      renderizarResumo();
      renderizarLista();
    } catch (erro) {
      mostrarFeedback('Erro ao carregar vendas', 'erro');
    }
  }

  function renderizarResumo() {
    const validas = vendasCarregadas.filter(v => v.status !== 'cancelada');
    const canceladas = vendasCarregadas.length - validas.length;
    const total = validas.reduce((soma, v) => soma + v.total, 0);

    resumoHistorico.innerHTML = `
      <span><strong>${validas.length}</strong> venda${validas.length !== 1 ? 's' : ''}</span>
      <span>Total <strong>${formatarMoeda(total)}</strong></span>
      ${canceladas > 0 ? `<span class="resumo-canceladas">${canceladas} cancelada${canceladas !== 1 ? 's' : ''}</span>` : ''}
    `;
  }

  function descreverOrigem(venda) {
    if (venda.comanda_cliente || venda.comanda_mesa) {
      const nome = venda.comanda_cliente || `Mesa ${venda.comanda_mesa}`;
      return `Comanda · ${nome}`;
    }
    if (venda.fiado_cliente) {
      return `Fiado · ${venda.fiado_cliente}`;
    }
    if (venda.forma_pagamento === 'fiado') {
      return 'Fiado';
    }
    return 'Balcão';
  }

  function formatarDataHoraVenda(valor) {
    const data = dataDoBanco(valor);
    if (!data) return '';
    const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (periodoAtual.inicio === periodoAtual.fim) return hora;
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + hora;
  }

  function renderizarItens(vendaId) {
    const itens = itensCarregados.get(vendaId);
    if (!itens) return '<div class="itens-venda-historico carregando">Carregando...</div>';

    return `
      <div class="itens-venda-historico">
        ${itens.map(item => `
          <div class="item-venda-historico">
            <span class="qtd">${item.quantidade}×</span>
            <span class="nome">${escaparHtml(item.nome_produto)}${item.produto_id ? '' : ' <em>(avulso)</em>'}</span>
            <span class="valor">${formatarMoeda(item.subtotal)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderizarLista() {
    if (vendasCarregadas.length === 0) {
      listaHistorico.innerHTML = `
        <div class="estado-vazio-relatorio">
          <div class="icone">🧾</div>
          <p>Nenhuma venda neste período</p>
        </div>
      `;
      return;
    }

    listaHistorico.innerHTML = vendasCarregadas.map(venda => {
      const cancelada = venda.status === 'cancelada';
      const aberta = vendasAbertas.has(venda.id);
      const detalhesPagamento = [];
      if (venda.desconto > 0) detalhesPagamento.push(`Desconto ${formatarMoeda(venda.desconto)}`);
      if (venda.forma_pagamento === 'dinheiro' && venda.troco > 0) {
        detalhesPagamento.push(`Recebido ${formatarMoeda(venda.valor_pago)} · Troco ${formatarMoeda(venda.troco)}`);
      }

      return `
        <div class="venda-historico ${cancelada ? 'cancelada' : ''} ${aberta ? 'aberta' : ''}" data-id="${venda.id}">
          <div class="linha-venda-historico" data-acao="alternar">
            <span class="hora-venda">${formatarDataHoraVenda(venda.data_hora)}</span>
            <div class="info-venda">
              <span class="numero-venda">#${venda.id}</span>
              <span class="origem-venda">${escaparHtml(descreverOrigem(venda))}</span>
              <span class="meta-venda">${venda.qtd_itens} ite${venda.qtd_itens !== 1 ? 'ns' : 'm'} · ${escaparHtml(nomeFormaPagamento(venda.forma_pagamento))}</span>
            </div>
            <span class="total-venda-historico">${formatarMoeda(venda.total)}</span>
            ${cancelada
              ? '<span class="tag-cancelada">Cancelada</span>'
              : `<button class="btn-acao perigo btn-cancelar-venda-historico" data-acao="cancelar">Cancelar</button>`}
          </div>
          ${aberta ? `
            <div class="detalhe-venda-historico">
              ${renderizarItens(venda.id)}
              ${detalhesPagamento.length ? `<div class="pagamento-venda-historico">${detalhesPagamento.join(' · ')}</div>` : ''}
              ${cancelada ? `<div class="motivo-cancelamento">Cancelada às ${formatarDataHoraVenda(venda.cancelada_em)}${venda.motivo_cancelamento ? ` — ${escaparHtml(venda.motivo_cancelamento)}` : ''}</div>` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  async function alternarDetalhe(vendaId) {
    if (vendasAbertas.has(vendaId)) {
      vendasAbertas.delete(vendaId);
      renderizarLista();
      return;
    }

    vendasAbertas.add(vendaId);
    renderizarLista();

    if (!itensCarregados.has(vendaId)) {
      const resultado = await window.api.vendas.buscarItens(vendaId);
      if (resultado.sucesso) {
        itensCarregados.set(vendaId, resultado.dados);
        renderizarLista();
      }
    }
  }

  function abrirModalCancelar(vendaId) {
    const venda = vendasCarregadas.find(v => v.id === vendaId);
    if (!venda || venda.status === 'cancelada') return;

    vendaParaCancelar = venda;
    tituloCancelar.textContent = `Cancelar venda #${venda.id}`;
    resumoCancelar.textContent = `${descreverOrigem(venda)} · ${formatarDataHoraVenda(venda.data_hora)} · ${nomeFormaPagamento(venda.forma_pagamento)} · ${formatarMoeda(venda.total)}`;
    avisoFiado.classList.toggle('hidden', venda.forma_pagamento !== 'fiado');
    inputMotivo.value = '';
    overlayCancelar.classList.add('aberto');
    inputMotivo.focus();
  }

  function fecharModalCancelar() {
    overlayCancelar.classList.remove('aberto');
    vendaParaCancelar = null;
  }

  async function confirmarCancelamento() {
    if (!vendaParaCancelar) return;

    const motivo = inputMotivo.value.trim();
    if (!motivo) {
      inputMotivo.focus();
      inputMotivo.classList.add('campo-invalido');
      setTimeout(() => inputMotivo.classList.remove('campo-invalido'), 1500);
      return;
    }

    btnConfirmarCancelar.disabled = true;
    try {
      const vendaId = vendaParaCancelar.id;
      const resultado = await window.api.vendas.cancelar(vendaId, motivo);
      if (resultado.sucesso) {
        fecharModalCancelar();
        mostrarFeedback(`Venda #${vendaId} cancelada. Estoque devolvido.`, 'sucesso');
        await carregarVendas();
      } else {
        mostrarFeedback(resultado.erro, 'erro');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao cancelar venda', 'erro');
    } finally {
      btnConfirmarCancelar.disabled = false;
    }
  }

  function registrarEventListeners() {
    botoesPeriodo.forEach(btn => {
      btn.addEventListener('click', () => selecionarPeriodo(btn.dataset.periodo));
    });
    inputDia.addEventListener('change', selecionarDia);

    listaHistorico.addEventListener('click', (evento) => {
      const alvo = evento.target.closest('[data-acao]');
      const cartao = evento.target.closest('.venda-historico');
      if (!alvo || !cartao) return;

      const vendaId = parseInt(cartao.dataset.id, 10);
      if (alvo.dataset.acao === 'cancelar') {
        evento.stopPropagation();
        abrirModalCancelar(vendaId);
      } else {
        alternarDetalhe(vendaId);
      }
    });

    btnConfirmarCancelar.addEventListener('click', confirmarCancelamento);
    btnVoltarCancelar.addEventListener('click', fecharModalCancelar);
    btnFecharCancelar.addEventListener('click', fecharModalCancelar);
    overlayCancelar.addEventListener('click', (evento) => {
      if (evento.target === overlayCancelar) fecharModalCancelar();
    });
    inputMotivo.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') confirmarCancelamento();
      if (evento.key === 'Escape') fecharModalCancelar();
    });
  }

  function inicializarHistorico() {
    vendasAbertas.clear();
    itensCarregados.clear();
    selecionarPeriodo('hoje');
  }

  registrarEventListeners();
  window.inicializarHistorico = inicializarHistorico;
})();
