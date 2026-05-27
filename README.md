# Balcão PDV

Sistema de ponto de venda para comércio de pequeno e médio porte, desenvolvido pela **Mokshyaa Soluções**.

Offline-first, personalizável e extensível — feito para funcionar de verdade no dia a dia do comércio de bairro.

---

## Visão Geral

O Balcão PDV nasce da observação de uma realidade comum: o pequeno comerciante que anota vendas no caderno, não controla estoque de forma confiável e depende de sistemas caros ou complexos demais para sua realidade.

Este sistema resolve isso com uma solução simples, acessível e que funciona **mesmo sem internet**.

---

## Screenshots

### Configurações do Sistema
![Tela de Configurações](docs/screen)

### Personalização de Cores
![Color Picker](docs/screenshots/color-picker.png)

---

## Funcionalidades Previstas

- **PDV** — venda direta com leitor de código de barras
- **Comandas** — consumo progressivo para atendimento presencial
- **Estoque** — controle de entrada, saída e alertas de mínimo
- **Fiado** — controle de clientes com histórico por data e item
- **Relatórios** — histórico por período e forma de pagamento
- **Fiscal** — emissão de NFC-e via API homologada
- **Pagamentos** — dinheiro, PIX, débito, crédito, Stone, Cielo, PagSeguro, Sicoob
- **Personalização** — logo, nome e paleta de cores por estabelecimento
- **Offline-first** — funciona sem internet, sincroniza quando a conexão volta

---

## Status do Projeto

| Sprint | Descrição | Status |
|--------|-----------|--------|
| 1 | Fundação — Electron, SQLite, Configurações | ✅ Concluído |
| 2 | Produtos e Estoque | 🔜 Próximo |
| 3 | PDV — Venda Direta | ⏳ Aguardando |
| 4 | Comandas | ⏳ Aguardando |
| 5 | Fiscal e Pagamentos Avançados | ⏳ Aguardando |
| 6 | Fiado e Clientes | ⏳ Aguardando |
| 7 | Relatórios | ⏳ Aguardando |
| 8 | Sincronização e Licenciamento | ⏳ Aguardando |
| 9 | Polish e Empacotamento | ⏳ Aguardando |

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Desktop | Electron |
| Interface | HTML5 / CSS3 / JavaScript ES6+ |
| Banco local | SQLite via better-sqlite3 |
| Sincronização | Supabase (Sprint 8) |
| Fiscal | Focus NFe API (Sprint 5) |
| Empacotamento | Electron Builder |

---

## Estrutura do Projeto

```
balcao-pdv/
├── main.js                          # Inicialização do Electron
├── preload.js                       # Ponte segura interface ↔ sistema
├── package.json
├── src/
│   ├── database/
│   │   ├── db.js                    # Conexão SQLite
│   │   └── migrations/
│   │       └── 001-setup-inicial.sql
│   ├── modules/
│   │   └── configuracoes/
│   │       ├── configuracoes.handler.js
│   │       └── configuracoes.ipc.js
│   └── ui/
│       ├── index.html
│       ├── css/
│       │   └── main.css
│       └── js/
│           └── configuracoes.js
└── docs/
    └── screenshots/
```

---

## Como Rodar Localmente

**Pré-requisitos:** Node.js instalado.

```bash
# Clone o repositório
git clone https://github.com/NandaRomao/balcao-pdv.git

# Entre na pasta
cd balcao-pdv

# Instale as dependências
npm install

# Rode o sistema
npm start
```

---

## Princípios do Projeto

**Separação de responsabilidades** — cada arquivo faz uma coisa. A interface nunca acessa o banco diretamente.

**Offline-first** — todas as operações principais funcionam sem internet.

**Extensível** — arquitetura modular permite adicionar novos módulos sem quebrar o que já existe.

**Acessível** — interface pensada para quem não tem familiaridade com tecnologia.

---

## Sobre

Desenvolvido por **Fernanda Romão**

[![GitHub](https://img.shields.io/badge/GitHub-NandaRomao-181717?style=flat&logo=github)](https://github.com/NandaRomao)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-romaonanda-0A66C2?style=flat&logo=linkedin)](https://www.linkedin.com/in/romaonanda/)
[![Email](https://img.shields.io/badge/Email-fer.romao@gmail.com-EA4335?style=flat&logo=gmail)](mailto:fer.romao@gmail.com)

---

*Balcão PDV — Mokshyaa Soluções*
