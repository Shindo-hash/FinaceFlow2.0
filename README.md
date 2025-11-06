# 💰 FinanceFlow 2.0 - Gerenciador Financeiro Inteligente

Bem-vindo ao **FinanceFlow 2.0**! Um aplicativo web completo para controle financeiro pessoal com suporte a cartões de crédito, parcelamentos automáticos e alertas inteligentes.

## 🎯 Funcionalidades

✅ **Dashboard Inteligente**
- Gráficos de gastos semanais e mensais
- Análise por categorias
- Resumo de receitas, despesas e saldo

✅ **Gerenciamento de Transações**
- Registrar receitas e despesas
- Filtros por tipo e categoria
- Suporte a parcelamentos automáticos

✅ **Cartões de Crédito**
- Cadastro de múltiplos cartões
- Acompanhamento de limite usado
- Faturas automáticas por mês

✅ **Sistema de Alertas**
- Notificações quando atingir 80% do limite
- Avisos ao ultrapassar limite mensal
- Sugestões de economia

✅ **Análise Financeira**
- Relatórios mensais automáticos
- Comparação entre meses
- Insights inteligentes de gastos

---

## 🚀 Início Rápido

### 1️⃣ Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn
- Conta no Supabase (https://supabase.com)

### 2️⃣ Instalação do Projeto

```bash
# Clone ou extraia o projeto
cd financeflow-v2

# Instale as dependências
npm install
```

### 3️⃣ Configuração do Supabase

#### A) Criar projeto no Supabase

1. Acesse https://supabase.com
2. Clique em "New Project"
3. Preencha:
   - **Project Name**: FinanceFlow
   - **Database Password**: Escolha uma senha forte
   - **Region**: Selecione mais próximo de você (ex: South America - São Paulo)
4. Clique em "Create new project" e aguarde (~2 minutos)

#### B) Criar as Tabelas

1. Na dashboard do Supabase, vá para **SQL Editor**
2. Cole o conteúdo de `001_create_tables.sql`
3. Clique em "Run"
4. Cola o conteúdo de `002_create_functions.sql`
5. Clique em "Run"

#### C) Pegar as Chaves

1. Vá para **Settings → API**
2. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`

### 4️⃣ Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_publica_aqui
```

### 5️⃣ Rodar o Projeto

```bash
npm run dev
```

O app abrirá em `http://localhost:5173`

---

## 📁 Estrutura do Projeto

```
financeflow-v2/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx          # Página principal
│   │   ├── Transactions.jsx       # Gerenciar transações
│   │   └── Cards.jsx              # Gerenciar cartões
│   ├── hooks/
│   │   ├── useAuth.js             # Autenticação
│   │   ├── useTransactions.js     # Transações
│   │   └── useCards.js            # Cartões
│   ├── pages/
│   │   ├── Login.jsx              # Tela de login
│   │   └── Notifications.jsx      # Notificações
│   ├── utils/
│   │   ├── supabase.js            # Configuração Supabase
│   │   └── formatting.js          # Funções auxiliares
│   ├── App.jsx                    # Componente principal
│   ├── main.jsx                   # Entry point
│   └── styles.css                 # Estilos globais
├── index.html                     # HTML base
├── package.json                   # Dependências
├── vite.config.js                 # Config Vite
├── tailwind.config.js             # Config Tailwind
├── postcss.config.js              # Config PostCSS
└── 001_create_tables.sql          # Schema do banco
└── 002_create_functions.sql       # Funções e triggers
```

---

## 🔧 Como Usar

### 1. Primeira Vez no App

1. Clique em "Cadastro"
2. Preencha email e senha
3. Clique em "Criar Conta"

### 2. Criar Categorias

1. Vá para **Configurações**
2. Clique em "Adicionar Categoria"
3. Preencha nome, ícone, cor e tipo (receita/despesa)
4. Clique em "Salvar"

### 3. Cadastrar Cartão de Crédito

1. Vá para **Cartões**
2. Clique em "Novo Cartão"
3. Preencha:
   - Nome (ex: Nubank)
   - Número (últimos 4 dígitos)
   - Limite
   - Dia de fechamento
   - Dia de vencimento
4. Clique em "Salvar"

### 4. Registrar Transação

1. Vá para **Transações**
2. Clique em "Adicionar"
3. Escolha:
   - Tipo (Receita/Despesa)
   - Descrição
   - Valor
   - Categoria
   - Se for no crédito, selecione o cartão
   - Se for parcelada, coloque o número de parcelas
4. Clique em "Salvar"

### 5. Acompanhar no Dashboard

- Visualize gráficos de gastos
- Veja resumo de receitas/despesas/saldo
- Acompanhe top 3 categorias

---

## 🗄️ Banco de Dados

### Tabelas Principais

| Tabela | Função |
|--------|--------|
| `users` | Autenticação (Supabase Auth) |
| `categories` | Categorias de gasto/receita |
| `cards` | Cartões de crédito |
| `transactions` | Transações do usuário |
| `invoices` | Faturas mensais |
| `installments` | Parcelas de compras |
| `pretensions` | Limites mensais por categoria |
| `notifications` | Alertas automáticos |
| `insights` | Análises e sugestões |

### Funções Automáticas

✅ **create_monthly_invoices()** - Cria faturas automaticamente
✅ **update_card_limit_used()** - Atualiza limite usado
✅ **create_installments_for_transaction()** - Cria parcelas
✅ **check_pretension_alert()** - Emite alertas de limite
✅ **release_card_limit_on_payment()** - Libera limite ao pagar

---

## 🚨 Troubleshooting

### "Cannot find module @supabase/supabase-js"

```bash
npm install @supabase/supabase-js
```

### "VITE_SUPABASE_URL is not defined"

Verifique se o arquivo `.env.local` está criado com as variáveis corretas.

### Erro 401 ao fazer login

Verifique se:
- Email e senha estão corretos
- Supabase Auth está habilitado
- Projeto Supabase está ativo

### Transações não aparecem

Verifique:
- Se RLS está habilitado nas tabelas
- Se você está logado com o usuário correto
- Se as políticas de segurança estão configuradas

---

## 📱 Deploy

### Vercel (Recomendado)

1. Push seu código para GitHub
2. Vá para https://vercel.com
3. Clique em "Import Project"
4. Selecione seu repositório
5. Configure as variáveis de ambiente
6. Clique em "Deploy"

### Netlify

1. Conecte seu GitHub
2. Selecione o repositório
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Configure as variáveis de ambiente
6. Deploy!

---

## 💡 Dicas

- **Sempre logout ao testar**: Para limpar o cache
- **Use nomes descritivos**: Facilita análise de gastos
- **Registre parcelas corretamente**: O sistema calcula automaticamente
- **Acompanhe categorias**: Identifique padrões de gasto

---

## 🔐 Segurança

✅ Autenticação Supabase (criptografia nativa)
✅ Row Level Security (RLS) em todas as tabelas
✅ Variáveis de ambiente protegidas
✅ Sem armazenamento de senhas em cliente

---

## 📞 Suporte

Se encontrar bugs ou tiver dúvidas:

1. Verifique a documentação do Supabase: https://supabase.com/docs
2. Consulte exemplos de React: https://react.dev
3. Veja ícones disponíveis: https://lucide.dev

---

## 📄 Licença

Projeto em desenvolvimento - Uso livre para fins educacionais e pessoais.

---

**Desenvolvido com ❤️ para controle financeiro inteligente**

🚀 **Boa sorte e sucesso financeiro!**
