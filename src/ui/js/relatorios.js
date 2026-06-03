(function () {
  let periodoAtual = { inicio: '', fim: '' };
  let listenersRegistrados = false;

  const botoesPeriodo = document.querySelectorAll('.btn-periodo');
  const periodoPersonalizado = document.getElementById('periodo-personalizado');
  const inputDataInicio = document.getElementById('data-inicio');
  const inputDataFim = document.getElementById('data-fim');
  const btnAplicarPeriodo = document.getElementById('btn-aplicar-periodo');
  const btnImprimir = document.getElementById('btn-imprimir-relatorio');
  const periodoImpressao = document.querySelector('.periodo-impressao');

  const resumoTotal = document.getElementById('resumo-total');
  const resumoNumero = document.getElementById('resumo-numero');
  const resumoTicket = document.getElementById('resumo-ticket');
  const listaFormasPagamento = document.getElementById('lista-formas-pagamento');
  const listaProdutosVendidos = document.getElementById('lista-produtos-vendidos');
  const listaReposicao = document.getElementById('lista-reposicao');
  const fiadoReceber = document.getElementById('fiado-receber');
  const fiadoRecebido = document.getElementById('fiado-recebido');

  function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  }

  function formatarDataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  function formatarDataExibicao(dataISO) {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  function calcularPeriodo(tipo) {
    const hoje = new Date();
    const hojeISO = formatarDataISO(hoje);

    if (tipo === 'hoje') {
      return { inicio: hojeISO, fim: hojeISO };
    }

    if (tipo === '7dias') {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 6);
      return { inicio: formatarDataISO(inicio), fim: hojeISO };
    }

    if (tipo === 'mes') {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { inicio: formatarDataISO(inicio), fim: hojeISO };
    }

    return { inicio: hojeISO, fim: hojeISO };
  }

  function selecionarPeriodo(tipo) {
    botoesPeriodo.forEach(btn => {
      btn.classList.toggle('ativo', btn.dataset.periodo === tipo);
    });

    if (tipo === 'personalizado') {
      periodoPersonalizado.classList.remove('hidden');
      inputDataInicio.value = periodoAtual.inicio;
      inputDataFim.value = periodoAtual.fim;
    } else {
      periodoPersonalizado.classList.add('hidden');
      periodoAtual = calcularPeriodo(tipo);
      carregarTudo();
    }
  }

  function aplicarPeriodoPersonalizado() {
    const inicio = inputDataInicio.value;
    const fim = inputDataFim.value;

    if (!inicio || !fim) {
      return;
    }

    if (inicio > fim) {
      alert('A data inicial não pode ser maior que a final');
      return;
    }

    periodoAtual = { inicio, fim };
    carregarTudo();
  }

  async function carregarTudo() {
    periodoImpressao.textContent = `${formatarDataExibicao(periodoAtual.inicio)} a ${formatarDataExibicao(periodoAtual.fim)}`;

    try {
      const [resumo, formasPagamento, produtos, reposicao, fiado] = await Promise.all([
        window.api.relatorios.resumoPeriodo(periodoAtual),
        window.api.relatorios.vendasPorFormaPagamento(periodoAtual),
        window.api.relatorios.produtosMaisVendidos(periodoAtual),
        window.api.relatorios.reposicaoEstoque(),
        window.api.relatorios.resumoFiado(periodoAtual)
      ]);

      if (resumo.sucesso) renderResumo(resumo.dados);
      if (formasPagamento.sucesso) renderFormasPagamento(formasPagamento.dados);
      if (produtos.sucesso) renderProdutos(produtos.dados);
      if (reposicao.sucesso) renderReposicao(reposicao.dados);
      if (fiado.sucesso) renderFiado(fiado.dados);
    } catch (erro) {
      console.error('Erro ao carregar relatórios', erro);
    }
  }

  function renderResumo(dados) {
    resumoTotal.textContent = formatarMoeda(dados.total_vendido);
    resumoNumero.textContent = dados.numero_vendas;
    resumoTicket.textContent = formatarMoeda(dados.ticket_medio);
  }

  function traduzirFormaPagamento(forma) {
    const traducoes = {
      dinheiro: 'Dinheiro',
      pix: 'PIX',
      debito: 'Débito',
      credito: 'Crédito',
      fiado: 'Fiado'
    };
    return traducoes[forma] || forma;
  }

  function renderFormasPagamento(lista) {
    if (lista.length === 0) {
      listaFormasPagamento.innerHTML = '<div class="estado-vazio-relatorio"><p>Nenhuma venda no período</p></div>';
      return;
    }

    listaFormasPagamento.innerHTML = lista.map(item => `
      <div class="item-lista-relatorio">
        <span class="nome-item-lista">${traduzirFormaPagamento(item.forma_pagamento)}</span>
        <div class="valores-item-lista">
          <div class="valor-item-lista">
            <span class="rotulo">Quantidade</span>
            <span class="valor">${item.quantidade}</span>
          </div>
          <div class="valor-item-lista">
            <span class="rotulo">Total</span>
            <span class="valor">${formatarMoeda(item.total)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderProdutos(lista) {
    if (lista.length === 0) {
      listaProdutosVendidos.innerHTML = '<div class="estado-vazio-relatorio"><p>Nenhum produto vendido no período</p></div>';
      return;
    }

    listaProdutosVendidos.innerHTML = lista.map((item, indice) => `
      <div class="item-lista-relatorio">
        <span class="nome-item-lista">
          <strong>#${indice + 1}</strong> ${item.nome_produto}
        </span>
        <div class="valores-item-lista">
          <div class="valor-item-lista">
            <span class="rotulo">Quantidade</span>
            <span class="valor">${item.total_quantidade}</span>
          </div>
          <div class="valor-item-lista">
            <span class="rotulo">Total</span>
            <span class="valor">${formatarMoeda(item.total_valor)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderReposicao(dados) {
    const temAcabou = dados.acabou.length > 0;
    const temAcabando = dados.acabando.length > 0;

    if (!temAcabou && !temAcabando) {
      listaReposicao.innerHTML = `
        <div class="estado-vazio-relatorio">
          <div class="icone">✅</div>
          <p>Tudo em ordem! Nenhum produto em falta</p>
        </div>
      `;
      return;
    }

    let html = '';

    if (temAcabou) {
      html += `
        <div class="grupo-reposicao">
          <div class="titulo-grupo-reposicao acabou">Acabou</div>
          ${dados.acabou.map(item => `
            <div class="item-reposicao">
              <span class="tag-reposicao acabou">Esgotado</span>
              <div class="info-reposicao">
                <div class="nome-reposicao">${item.nome}</div>
                <div class="estoque-reposicao">${item.categoria || 'Sem categoria'} • ${item.unidade}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (temAcabando) {
      html += `
        <div class="grupo-reposicao">
          <div class="titulo-grupo-reposicao acabando">Acabando</div>
          ${dados.acabando.map(item => `
            <div class="item-reposicao">
              <span class="tag-reposicao acabando">Baixo</span>
              <div class="info-reposicao">
                <div class="nome-reposicao">${item.nome}</div>
                <div class="estoque-reposicao">${item.estoque_atual} / ${item.estoque_minimo} ${item.unidade} • ${item.categoria || 'Sem categoria'}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    listaReposicao.innerHTML = html;
  }

  function renderFiado(dados) {
    fiadoReceber.textContent = formatarMoeda(dados.total_a_receber);
    fiadoRecebido.textContent = formatarMoeda(dados.recebido_periodo);
  }

  function imprimirRelatorio() {
    const checkboxes = document.querySelectorAll('.check-bloco');

    checkboxes.forEach(checkbox => {
      const bloco = document.querySelector(`.bloco-relatorio[data-bloco="${checkbox.dataset.bloco}"]`);
      if (checkbox.checked) {
        bloco.classList.remove('nao-imprimir');
      } else {
        bloco.classList.add('nao-imprimir');
      }
    });

    window.print();

    setTimeout(() => {
      document.querySelectorAll('.bloco-relatorio').forEach(bloco => {
        bloco.classList.remove('nao-imprimir');
      });
    }, 500);
  }

  function registrarEventListeners() {
    if (listenersRegistrados) return;

    botoesPeriodo.forEach(btn => {
      btn.addEventListener('click', () => selecionarPeriodo(btn.dataset.periodo));
    });

    btnAplicarPeriodo.addEventListener('click', aplicarPeriodoPersonalizado);
    btnImprimir.addEventListener('click', imprimirRelatorio);

    listenersRegistrados = true;
  }

  function inicializarRelatorios() {
    registrarEventListeners();
    periodoAtual = calcularPeriodo('hoje');
    selecionarPeriodo('hoje');
  }

  window.inicializarRelatorios = inicializarRelatorios;
})();