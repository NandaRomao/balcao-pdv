// Funções compartilhadas entre os módulos da interface.
// Carregado antes dos demais scripts em index.html.

// Escapa texto vindo do banco (nomes, descrições, telefones...) antes de
// inseri-lo via innerHTML. Sem isso, um nome como "Coca <2L>" quebra a tela.
window.escaparHtml = function (valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// O SQLite grava CURRENT_TIMESTAMP em UTC ("2026-11-22 13:05:00"), sem indicar
// o fuso. new Date() leria isso como hora local (3h de diferença no Brasil),
// então convertemos explicitamente de UTC.
window.dataDoBanco = function (valor) {
  if (!valor) return null;
  const texto = String(valor);
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(texto)) return new Date(texto);
  return new Date(texto.replace(' ', 'T') + 'Z');
};

window.formatarMoeda = function (valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
};

window.NOMES_FORMA_PAGAMENTO = {
  dinheiro: 'Dinheiro',
  pix: 'PIX / QR Code',
  debito: 'Débito',
  credito: 'Crédito',
  voucher: 'Voucher',
  fiado: 'Fiado'
};

window.nomeFormaPagamento = function (forma) {
  return window.NOMES_FORMA_PAGAMENTO[forma] || forma;
};
