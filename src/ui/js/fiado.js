(function () {
  let clienteAtual = null;
  let clienteExtratoId = null;
  let filtroDevedores = false;
  let modoLancamento = 'produto';
  let produtoSelecionadoFiado = null;
  let precoSelecionadoFiado = 0;

  const gridClientes = document.getElementById('grid-clientes');
  const inputBuscaClientes = document.getElementById('busca-clientes');
  const filtroDevedoresBtn = document.getElementById('filtro-devedores');
  const contadorClientes = document.getElementById('contador-clientes');
  const feedbackClientes = document.getElementById('feedback-clientes');

  const btnNovoCliente = document.getElementById('btn-novo-cliente');
  const overlayModalCliente = document.getElementById('overlay-modal-cliente');
  const tituloModalCliente = document.getElementById('titulo-modal-cliente');
  const formCliente = document.getElementById('form-cliente');
  const btnFecharModalCliente = document.getElementById('btn-fechar-modal-cliente');
  const btnCancelarCliente = document.getElementById('btn-cancelar-cliente');
  const btnSalvarCliente = document.getElementById('btn-salvar-cliente');

  const overlayModalExtrato = document.getElementById('overlay-modal-extrato');
  const tituloModalExtrato = document.getElementById('titulo-modal-extrato');
  const btnFecharExtrato = document.getElementById('btn-fechar-extrato');
  const saldoExtratoValor = document.getElementById('saldo-extrato-valor');
  const limiteExtrato = document.getElementById('limite-extrato');
  const limiteExtratoValor = document.getElementById('limite-extrato-valor');
  const btnLancarFiado = document.getElementById('btn-lancar-fiado');
  const btnRegistrarPagamento = document.getElementById('btn-registrar-pagamento');
  const areaLancamento = document.getElementById('area-lancamento');
  const areaPagamento = document.getElementById('area-pagamento');
  const listaExtrato = document.getElementById('lista-extrato');

  const btnModoProduto = document.getElementById('btn-modo-produto');
  const btnModoAvulso = document.getElementById('btn-modo-avulso');
  const lancamentoProduto = document.getElementById('lancamento-produto');
  const lancamentoAvulso = document.getElementById('lancamento-avulso');
  const buscaProdutoFiado = document.getElementById('busca-produto-fiado');
  const resultadosFiado = document.getElementById('resultados-fiado');
  const quantidadeFiado = document.getElementById('quantidade-fiado');
  const descricaoAvulso = document.getElementById('descricao-avulso');
  const valorAvulso = document.getElementById('valor-avulso');
  const contabilizaReceita = document.getElementById('contabiliza-receita');
  const btnConfirmarLancamento = document.getElementById('btn-confirmar-lancamento');
  const btnCancelarLancamento = document.getElementById('btn-cancelar-lancamento');

  const valorPagamento = document.getElementById('valor-pagamento');
  const btnConfirmarPagamentoExtrato = document.getElementById('btn-confirmar-pagamento-extrato');
  const btnCancelarPagamentoExtrato = document.getElementById('btn-cancelar-pagamento-extrato');

  function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  }

  function formatarDataHora(dataString) {
    if (!dataString) return '';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
      data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function mostrarFeedback(mensagem, tipo) {
    feedbackClientes.textContent = mensagem;
    feedbackClientes.className = `feedback ${tipo}`;
    setTimeout(() => feedbackClientes.classList.add('hidden'), 4000);
  }

  async function carregarClientes() {
    try {
      const filtros = {
        busca: inputBuscaClientes.value.trim(),
        somenteDevedores: filtroDevedores
      };
      const resultado = await window.api.fiado.listarClientes(filtros);
      if (resultado.sucesso) {
        renderizarClientes(resultado.dados);
        contadorClientes.textContent = `${resultado.dados.length} cliente${resultado.dados.length !== 1 ? 's' : ''}`;
      }
    } catch (erro) {
      mostrarFeedback('Erro ao carregar clientes', 'erro');
    }
  }

  function renderizarClientes(clientes) {
    if (clientes.length === 0) {
      gridClientes.innerHTML = `
        <div class="estado-vazio" style="grid-column: 1 / -1;">
          <div class="icone">👥</div>
          <p>Nenhum cliente encontrado</p>
        </div>
      `;
      return;
    }

    gridClientes.innerHTML = clientes.map(cliente => {
      const foto = cliente.foto_path
        ? `<img src="${cliente.foto_path}" class="foto-cliente" alt="">`
        : `<div class="foto-cliente-placeholder">👤</div>`;

      const devendo = cliente.saldo_devedor > 0;
      const saldoClasse = devendo ? 'devendo' : 'quite';

      return `
        <div class="card-cliente" onclick="window.abrirExtratoCliente(${cliente.id})">
          ${devendo ? '<span class="badge-devendo">DEVENDO</span>' : ''}
          ${foto}
          <div class="nome-cliente">${cliente.nome}</div>
          ${cliente.telefone ? `<div class="telefone-cliente">${cliente.telefone}</div>` : ''}
          <div class="saldo-cliente ${saldoClasse}">${formatarMoeda(cliente.saldo_devedor)}</div>
          <div class="acoes-cliente">
            <button class="btn-acao primario" onclick="event.stopPropagation(); window.editarCliente(${cliente.id})">Editar</button>
            <button class="btn-acao perigo" onclick="event.stopPropagation(); window.desativarClientePainel(${cliente.id})">Desativar</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function abrirModalCliente(cliente = null) {
    clienteAtual = cliente;
    tituloModalCliente.textContent = cliente ? 'Editar Cliente' : 'Novo Cliente';
    limparFormCliente();

    if (cliente) {
      document.getElementById('nome-cliente').value = cliente.nome || '';
      document.getElementById('telefone-cliente').value = cliente.telefone || '';
      document.getElementById('limite-credito').value = cliente.limite_credito || 0;
      document.getElementById('observacao-cliente').value = cliente.observacao || '';

      if (cliente.foto_path) {
        document.getElementById('preview-foto-cliente').src = cliente.foto_path;
        document.getElementById('preview-foto-cliente').classList.remove('hidden');
        document.getElementById('preview-foto-cliente-placeholder').classList.add('hidden');
      }
    }

    overlayModalCliente.classList.add('aberto');
  }

  function fecharModalCliente() {
    overlayModalCliente.classList.remove('aberto');
    clienteAtual = null;
  }

  function limparFormCliente() {
    formCliente.reset();
    document.getElementById('preview-foto-cliente').classList.add('hidden');
    document.getElementById('preview-foto-cliente-placeholder').classList.remove('hidden');
  }

  async function salvarCliente(evento) {
    evento.preventDefault();

    const dados = {
      nome: document.getElementById('nome-cliente').value,
      telefone: document.getElementById('telefone-cliente').value,
      limite_credito: parseFloat(document.getElementById('limite-credito').value) || 0,
      observacao: document.getElementById('observacao-cliente').value,
      foto_path: document.getElementById('preview-foto-cliente').src || ''
    };

    try {
      let resultado;
      if (clienteAtual) {
        resultado = await window.api.fiado.atualizarCliente(clienteAtual.id, dados);
      } else {
        resultado = await window.api.fiado.criarCliente(dados);
      }

      if (resultado.sucesso) {
        mostrarFeedback(clienteAtual ? 'Cliente atualizado!' : 'Cliente criado!', 'sucesso');
        fecharModalCliente();
        carregarClientes();
      } else {
        mostrarFeedback(resultado.erro, 'erro');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao salvar cliente', 'erro');
    }
  }

  async function editarCliente(id) {
    try {
      const resultado = await window.api.fiado.buscarCliente(id);
      if (resultado.sucesso) {
        abrirModalCliente(resultado.dados);
      } else {
        mostrarFeedback(resultado.erro, 'erro');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao buscar cliente', 'erro');
    }
  }

  async function desativarCliente(id) {
    if (!confirm('Desativar este cliente?')) return;

    try {
      const resultado = await window.api.fiado.desativarCliente(id);
      if (resultado.sucesso) {
        mostrarFeedback('Cliente desativado', 'sucesso');
        carregarClientes();
      } else {
        mostrarFeedback(resultado.erro, 'erro');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao desativar cliente', 'erro');
    }
  }

  async function abrirExtrato(clienteId) {
    clienteExtratoId = clienteId;
    try {
      const resultado = await window.api.fiado.buscarExtrato(clienteId);
      if (resultado.sucesso) {
        const dados = resultado.dados;
        tituloModalExtrato.textContent = dados.cliente.nome;
        saldoExtratoValor.textContent = formatarMoeda(dados.saldo_devedor);
        saldoExtratoValor.className = 'valor-saldo ' + (dados.saldo_devedor > 0 ? '' : 'quite');

        if (dados.cliente.limite_credito > 0) {
          limiteExtrato.classList.remove('hidden');
          limiteExtratoValor.textContent = formatarMoeda(dados.cliente.limite_credito);
        } else {
          limiteExtrato.classList.add('hidden');
        }

        renderizarExtrato(dados.lancamentos, dados.saldo_devedor);
        esconderAreasExtrato();
        overlayModalExtrato.classList.add('aberto');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao carregar extrato', 'erro');
    }
  }

  function renderizarExtrato(lancamentos, saldo) {
    if (lancamentos.length === 0) {
      listaExtrato.innerHTML = '<div class="estado-vazio-extrato">Nenhum lançamento</div>';
      return;
    }

    listaExtrato.innerHTML = lancamentos.map(lanc => {
      const isDebito = lanc.tipo === 'debito';
      const classeValor = isDebito ? 'debito' : 'pagamento';
      const prefixo = isDebito ? '+' : '−';

      return `
        <div class="item-extrato">
          <span class="data-extrato">${formatarDataHora(lanc.criado_em)}</span>
          <span class="descricao-extrato">${lanc.descricao || 'Pagamento'}</span>
          <span class="valor-extrato ${classeValor}">${prefixo} ${formatarMoeda(lanc.valor)}</span>
          <button class="btn-remover-lancamento" onclick="window.removerLancamentoPainel(${lanc.id})">✕</button>
        </div>
      `;
    }).join('');
  }

  function esconderAreasExtrato() {
    areaLancamento.classList.add('hidden');
    areaPagamento.classList.add('hidden');
  }

  function mostrarAreaLancamento() {
    areaLancamento.classList.remove('hidden');
    areaPagamento.classList.add('hidden');
    alternarModo('produto');
    buscaProdutoFiado.value = '';
    resultadosFiado.innerHTML = '';
    quantidadeFiado.value = '1';
    descricaoAvulso.value = '';
    valorAvulso.value = '';
    buscaProdutoFiado.focus();
  }

  function mostrarAreaPagamento() {
    areaPagamento.classList.remove('hidden');
    areaLancamento.classList.add('hidden');
    valorPagamento.value = '';
    valorPagamento.focus();
  }

  function alternarModo(modo) {
    modoLancamento = modo;
    btnModoProduto.classList.toggle('ativo', modo === 'produto');
    btnModoAvulso.classList.toggle('ativo', modo === 'avulso');
    lancamentoProduto.classList.toggle('hidden', modo !== 'produto');
    lancamentoAvulso.classList.toggle('hidden', modo !== 'avulso');
    produtoSelecionadoFiado = null;
    precoSelecionadoFiado = 0;
  }

  async function buscarProdutosFiado() {
    const termo = buscaProdutoFiado.value.trim();
    if (termo.length < 2) {
      resultadosFiado.innerHTML = '';
      return;
    }

    try {
      const resultado = await window.api.vendas.buscarProdutos(termo);
      if (resultado.sucesso) {
        renderizarResultadosFiado(resultado.dados);
      }
    } catch (erro) {
      mostrarFeedback('Erro na busca', 'erro');
    }
  }

  function renderizarResultadosFiado(produtos) {
    resultadosFiado.innerHTML = produtos.map(produto => `
      <div class="resultado-comanda-item" data-id="${produto.id}">
        <strong>${produto.nome}</strong> — ${formatarMoeda(produto.preco_venda)}
      </div>
    `).join('');

    resultadosFiado.querySelectorAll('.resultado-comanda-item').forEach(el => {
      el.addEventListener('click', () => {
        produtoSelecionadoFiado = parseInt(el.dataset.id);
        const produto = produtos.find(p => p.id === produtoSelecionadoFiado);
        precoSelecionadoFiado = produto ? produto.preco_venda : 0;
        buscaProdutoFiado.value = el.querySelector('strong').textContent;
        resultadosFiado.innerHTML = '';
      });
    });
  }

  async function confirmarLancamento() {
    if (!clienteExtratoId) return;

    try {
      let resultado;
      if (modoLancamento === 'produto') {
        if (!produtoSelecionadoFiado) {
          mostrarFeedback('Selecione um produto', 'erro');
          return;
        }
        const quantidade = parseFloat(quantidadeFiado.value) || 1;

        const valorTotal = precoSelecionadoFiado * quantidade;
        const verificacao = await window.api.fiado.verificarLimite(clienteExtratoId, valorTotal);
        if (verificacao.sucesso && !verificacao.dados.dentroLimite) {
          if (!confirm(`Limite de crédito será ultrapassado em ${formatarMoeda(verificacao.dados.excedente)}. Continuar?`)) {
            return;
          }
        }

        resultado = await window.api.fiado.lancarDebitoProduto(clienteExtratoId, {
          produto_id: produtoSelecionadoFiado,
          quantidade
        });
      } else {
        const descricao = descricaoAvulso.value.trim();
        const valor = parseFloat(valorAvulso.value);

        if (!descricao) {
          mostrarFeedback('Informe a descrição', 'erro');
          return;
        }
        if (!valor || valor <= 0) {
          mostrarFeedback('Informe um valor válido', 'erro');
          return;
        }

        resultado = await window.api.fiado.lancarDebitoAvulso(clienteExtratoId, {
          descricao,
          valor,
          contabiliza_receita: contabilizaReceita.checked
        });
      }

      if (resultado.sucesso) {
        mostrarFeedback('Lançamento registrado!', 'sucesso');
        esconderAreasExtrato();
        await abrirExtrato(clienteExtratoId);
        carregarClientes();
      } else {
        mostrarFeedback(resultado.erro, 'erro');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao lançar', 'erro');
    }
  }

  async function confirmarPagamento() {
    if (!clienteExtratoId) return;

    const valor = parseFloat(valorPagamento.value);
    if (!valor || valor <= 0) {
      mostrarFeedback('Informe um valor válido', 'erro');
      return;
    }

    try {
      const resultado = await window.api.fiado.registrarPagamento(clienteExtratoId, valor);
      if (resultado.sucesso) {
        mostrarFeedback('Pagamento registrado!', 'sucesso');
        esconderAreasExtrato();
        await abrirExtrato(clienteExtratoId);
        carregarClientes();
      } else {
        mostrarFeedback(resultado.erro, 'erro');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao registrar pagamento', 'erro');
    }
  }

  async function removerLancamento(lancamentoId) {
    if (!confirm('Remover este lançamento?')) return;

    try {
      const resultado = await window.api.fiado.removerLancamento(lancamentoId);
      if (resultado.sucesso) {
        if (resultado.dados.aviso) {
          mostrarFeedback('Lançamento removido. ' + resultado.dados.aviso, 'sucesso');
        } else {
          mostrarFeedback('Lançamento removido', 'sucesso');
        }
        await abrirExtrato(clienteExtratoId);
        carregarClientes();
      } else {
        mostrarFeedback(resultado.erro, 'erro');
      }
    } catch (erro) {
      mostrarFeedback('Erro ao remover lançamento', 'erro');
    }
  }

  function fecharExtrato() {
    overlayModalExtrato.classList.remove('aberto');
    clienteExtratoId = null;
    produtoSelecionadoFiado = null;
    precoSelecionadoFiado = 0;
    esconderAreasExtrato();
  }

  function registrarEventListeners() {
    btnNovoCliente.addEventListener('click', () => abrirModalCliente());
    btnFecharModalCliente.addEventListener('click', fecharModalCliente);
    btnCancelarCliente.addEventListener('click', fecharModalCliente);
    formCliente.addEventListener('submit', salvarCliente);

    document.getElementById('foto-cliente').addEventListener('change', (evento) => {
      const arquivo = evento.target.files[0];
      if (arquivo) {
        const preview = document.getElementById('preview-foto-cliente');
        preview.src = arquivo.path;
        preview.classList.remove('hidden');
        document.getElementById('preview-foto-cliente-placeholder').classList.add('hidden');
      }
    });

    inputBuscaClientes.addEventListener('input', () => {
      clearTimeout(inputBuscaClientes.debounce);
      inputBuscaClientes.debounce = setTimeout(carregarClientes, 300);
    });

    filtroDevedoresBtn.addEventListener('click', () => {
      filtroDevedores = !filtroDevedores;
      filtroDevedoresBtn.classList.toggle('ativo', filtroDevedores);
      carregarClientes();
    });

    btnFecharExtrato.addEventListener('click', fecharExtrato);
    btnLancarFiado.addEventListener('click', mostrarAreaLancamento);
    btnRegistrarPagamento.addEventListener('click', mostrarAreaPagamento);

    btnModoProduto.addEventListener('click', () => alternarModo('produto'));
    btnModoAvulso.addEventListener('click', () => alternarModo('avulso'));

    buscaProdutoFiado.addEventListener('input', () => {
      clearTimeout(buscaProdutoFiado.debounce);
      buscaProdutoFiado.debounce = setTimeout(buscarProdutosFiado, 300);
    });

    btnConfirmarLancamento.addEventListener('click', confirmarLancamento);
    btnCancelarLancamento.addEventListener('click', esconderAreasExtrato);

    btnConfirmarPagamentoExtrato.addEventListener('click', confirmarPagamento);
    btnCancelarPagamentoExtrato.addEventListener('click', esconderAreasExtrato);

    overlayModalCliente.addEventListener('click', (evento) => {
      if (evento.target === overlayModalCliente) fecharModalCliente();
    });

    overlayModalExtrato.addEventListener('click', (evento) => {
      if (evento.target === overlayModalExtrato) fecharExtrato();
    });
  }

  window.editarCliente = editarCliente;
  window.desativarClientePainel = desativarCliente;
  window.abrirExtratoCliente = abrirExtrato;
  window.removerLancamentoPainel = removerLancamento;

  function inicializarClientes() {
    carregarClientes();
  }

  registrarEventListeners();
  window.inicializarClientes = inicializarClientes;
})();