# Roadmap — Balcão PDV

Objetivo: colocar o Balcão PDV em uso real e gerar renda o quanto antes, com segurança.
Ordem: **usar todo dia sem medo → poder vender → crescer.**

Público inicial: bares, botecos, lanchonetes e mercearias de bairro (de preferência MEI, que não precisa emitir NFC-e para venda a pessoa física). Primeira cliente: a própria loja.

*Atualizado em 22/11/2026.*

---

## ✅ Já feito

- [x] PDV, produtos e estoque, comandas, clientes e fiado, relatórios e reposição (Sprints 1–4, 6, 7)
- [x] Migrations com controle de versão e transação; banco em modo WAL
- [x] Preços e totais recalculados no backend (a tela não define valores)
- [x] Cancelamento de venda com motivo e devolução de estoque
- [x] Tela **Vendas** (histórico por período, origem, itens, cancelamento)
- [x] Comandas: leitor de código de barras, botões −/+, item avulso, tempo aberta
- [x] Formas de pagamento: dinheiro, PIX / QR Code, débito, crédito, voucher
- [x] Correção de fuso horário e proteção de textos na tela
- [x] Produtos em **Lista** ou **Cartões** (automático pela quantidade), com situação do estoque, ordenação, valor em estoque e impressão para conferência

---

## Etapa 1 — Usar na própria loja com segurança

- [ ] **Juntar o ramo `feat/correcoes-comandas-historico` na `main`** (depois de testar)
- [ ] **Backup automático**: diário e ao fechar o app, para pasta ou pendrive, com botão "Restaurar"
- [ ] **Abertura e fechamento de caixa**: troco inicial, sangria, suprimento, conferência do dinheiro no fim do dia
- [ ] **Login, PIN do dono e auditoria**: perfis dono/operador; cancelar, dar desconto e apagar fiado pedem PIN; registro permanente de quem fez o quê e quando
- [ ] **Histórico de movimentação de estoque**: cada entrada, saída, venda e cancelamento registrado por produto (para descobrir onde o estoque "sumiu")
- [ ] **Blindagem do app**: Content-Security-Policy, bloquear navegação para sites externos, tirar os `onclick` do HTML
- [ ] **Impressora térmica**: cupom da venda e extrato da comanda para o cliente conferir antes de pagar

## Etapa 2 — Poder vender e cobrar

- [ ] **Instalador do Windows** (electron-builder; certificado de assinatura pode vir depois)
- [ ] **Licença e período de teste** (15–30 dias grátis, chave de ativação offline)
- [ ] **Atualização automática** (corrigir um bug e todos os clientes receberem)
- [ ] **Primeira execução guiada** e **importação de produtos por planilha** (CSV/Excel)
- [ ] **Testes automáticos no projeto** (rodar tudo com um comando antes de cada atualização)
- [ ] **Parte legal e comercial**: termos de uso, política de privacidade (LGPD), WhatsApp de suporte, preço, página com vídeo de demonstração

> ⚠️ Antes de cobrar: conversar com um contador sobre a formalização. Desenvolvimento de software geralmente não é permitido no MEI; talvez seja preciso abrir uma ME.

## Etapa 3 — Crescer e subir o preço

- [ ] **Banco de dados criptografado**
- [ ] **NFC-e** (Focus NFe), com o certificado A1 guardado com segurança (abre o mercado do Simples Nacional)
- [ ] **PIX com QR Code na tela** e integração com maquininhas
- [ ] **Painel online** (Supabase): o dono acompanha as vendas pelo celular, como plano mais caro

---

## Segurança — vale para todas as etapas

O sistema lida com dinheiro, dívidas de clientes e dados que o contador usa. Toda funcionalidade nova deve considerar:

- Validar tudo no backend, nunca confiar no que a tela envia
- Registrar quem fez operações sensíveis (cancelamento, desconto, fiado)
- Nunca colocar senhas, chaves ou certificados no código ou no GitHub
- Backups criptografados
- LGPD: guardar só o necessário dos clientes e permitir apagar os dados de um cliente quando ele pedir
