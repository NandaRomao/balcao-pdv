const formulario = document.getElementById('form-configuracoes');
const feedback = document.getElementById('feedback');
const botaoSalvar = document.getElementById('btn-salvar');
const textoBotao = botaoSalvar.querySelector('.texto-btn');
const spinner = botaoSalvar.querySelector('.spinner');
const logoPreview = document.getElementById('logo-preview');
const logoPlaceholder = document.querySelector('.logo-placeholder');
const nomeComercioDisplay = document.getElementById('nome-comercio-display');

const campoLogo = document.getElementById('logo');
let caminhoLogo = '';

function aplicarCores(cores) {
  const raiz = document.documentElement;
  raiz.style.setProperty('--cor-primaria', cores.cor_primaria);
  raiz.style.setProperty('--cor-secundaria', cores.cor_secundaria);
  raiz.style.setProperty('--cor-destaque', cores.cor_destaque);
}

function mostrarFeedback(mensagem, tipo) {
  feedback.textContent = mensagem;
  feedback.className = `feedback ${tipo}`;
  setTimeout(() => feedback.classList.add('hidden'), 4000);
}

function alternarCarregamento(carregando) {
  if (carregando) {
    textoBotao.classList.add('hidden');
    spinner.classList.remove('hidden');
    botaoSalvar.disabled = true;
  } else {
    textoBotao.classList.remove('hidden');
    spinner.classList.add('hidden');
    botaoSalvar.disabled = false;
  }
}

function aplicarMascaraCnpj(campo) {
  campo.addEventListener('input', (evento) => {
    let valor = evento.target.value.replace(/\D/g, '');
    valor = valor.replace(/^(\d{2})(\d)/, '$1.$2');
    valor = valor.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    valor = valor.replace(/\.(\d{3})(\d)/, '.$1/$2');
    valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
    evento.target.value = valor.substring(0, 18);
  });
}

function preencherFormulario(configuracoes) {
  if (!configuracoes) return;

  document.getElementById('nome-comercio').value = configuracoes.nome_comercio || '';
  document.getElementById('cnpj').value = configuracoes.cnpj || '';
  document.getElementById('endereco').value = configuracoes.endereco || '';
  document.getElementById('cor-primaria').value = configuracoes.cor_primaria || '#1a1a2e';
  document.getElementById('cor-secundaria').value = configuracoes.cor_secundaria || '#2c3e7a';
  document.getElementById('cor-destaque').value = configuracoes.cor_destaque || '#e8b84b';
  document.getElementById('chave-licenca').value = configuracoes.chave_licenca || '';

  caminhoLogo = configuracoes.logo_path || '';
  if (caminhoLogo) {
    logoPreview.src = caminhoLogo;
    logoPreview.classList.remove('hidden');
    logoPlaceholder.classList.add('hidden');
  }

  if (configuracoes.nome_comercio) {
    nomeComercioDisplay.textContent = configuracoes.nome_comercio;
  }

  aplicarCores({
    cor_primaria: configuracoes.cor_primaria,
    cor_secundaria: configuracoes.cor_secundaria,
    cor_destaque: configuracoes.cor_destaque
  });
}

async function carregarConfiguracoes() {
  try {
    const configuracoes = await window.api.configuracoes.carregar();
    preencherFormulario(configuracoes);
  } catch (erro) {
    mostrarFeedback('Erro ao carregar configurações', 'erro');
  }
}

async function salvarConfiguracoes(evento) {
  evento.preventDefault();

  alternarCarregamento(true);

  const dados = {
    nome_comercio: document.getElementById('nome-comercio').value,
    cnpj: document.getElementById('cnpj').value,
    endereco: document.getElementById('endereco').value,
    logo_path: caminhoLogo,
    cor_primaria: document.getElementById('cor-primaria').value,
    cor_secundaria: document.getElementById('cor-secundaria').value,
    cor_destaque: document.getElementById('cor-destaque').value,
    chave_licenca: document.getElementById('chave-licenca').value
  };

  try {
    const resultado = await window.api.configuracoes.salvar(dados);
    if (resultado.sucesso) {
      mostrarFeedback('Configurações salvas com sucesso!', 'sucesso');
      preencherFormulario(dados);
    }
  } catch (erro) {
    mostrarFeedback('Erro ao salvar configurações', 'erro');
  } finally {
    alternarCarregamento(false);
  }
}

campoLogo.addEventListener('change', (evento) => {
  const arquivo = evento.target.files[0];
  if (arquivo) {
    caminhoLogo = arquivo.path;
    logoPreview.src = caminhoLogo;
    logoPreview.classList.remove('hidden');
    logoPlaceholder.classList.add('hidden');
  }
});

formulario.addEventListener('submit', salvarConfiguracoes);

aplicarMascaraCnpj(document.getElementById('cnpj'));
carregarConfiguracoes();