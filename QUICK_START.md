# 🚀 GUIA RÁPIDO - FinanceFlow 2.0

## ⚡ Primeiros 5 Minutos

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Supabase
1. Vá em https://supabase.com e crie um projeto
2. Vá para SQL Editor
3. Cole e execute o arquivo `backend/migrations/001_create_tables.sql`
4. Cole e execute o arquivo `backend/migrations/002_create_functions.sql`
5. Vá para Settings → API e copie:
   - Project URL
   - anon public key

### 3. Criar .env.local
Abra `.env.example` e renomeie para `.env.local`, preenchendo:
```
VITE_SUPABASE_URL=sua_url
VITE_SUPABASE_ANON_KEY=sua_chave
```

### 4. Rodar o Projeto
```bash
npm run dev
```
Abrirá em http://localhost:5173

---

## 📁 Estrutura do Projeto

```
financeflow-v2/
├── src/
│   ├── components/      ← Componentes React
│   ├── hooks/          ← Hooks customizados
│   ├── pages/          ← Páginas
│   ├── utils/          ← Utilitários
│   ├── App.jsx         ← Componente principal
│   ├── main.jsx        ← Entry point
│   └── styles.css      ← Estilos
├── backend/migrations/  ← Scripts SQL
├── index.html          ← HTML base
├── package.json        ← Dependências
├── vite.config.js      ← Config Vite
├── tailwind.config.js  ← Config Tailwind
├── README.md           ← Documentação completa
└── DATABASE_SCHEMA.md  ← Documentação do banco
```

---

## 🔑 Principais Componentes

| Arquivo | Função |
|---------|--------|
| `App.jsx` | Layout principal com navegação |
| `Dashboard.jsx` | Gráficos e resumo |
| `Transactions.jsx` | CRUD de transações |
| `Cards.jsx` | Gerenciar cartões |
| `Login.jsx` | Autenticação |
| `useAuth.js` | Hook de autenticação |
| `useTransactions.js` | Hook de transações |
| `useCards.js` | Hook de cartões |
| `supabase.js` | Conexão com Supabase |
| `formatting.js` | Funções auxiliares |

---

## 📝 Como Usar

1. **Cadastrar** - Email e senha
2. **Criar categorias** - Em Configurações
3. **Cadastrar cartão** - Vá para Cartões
4. **Adicionar transação** - Vá para Transações
5. **Ver gráficos** - Dashboard

---

## 🔧 Build e Deploy

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
npm run preview
```

---

## 🐛 Troubleshooting

**Erro de módulo não encontrado?**
```bash
npm install
```

**Erro de variáveis de ambiente?**
- Verifique se `.env.local` existe
- Reinicie o servidor

**Erro de autenticação?**
- Verifique chaves do Supabase
- Confirme que RLS está configurado

---

## 📚 Documentação Completa

Leia `README.md` para guia completo
Leia `DATABASE_SCHEMA.md` para entender o banco

---

**Pronto para começar!** 🎉
