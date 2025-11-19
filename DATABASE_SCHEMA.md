# FinanceFlow 2.0 - Documentação do Banco de Dados

## 📊 Visão Geral da Arquitetura

O FinanceFlow usa **PostgreSQL via Supabase** com as seguintes características:

- ✅ **Row Level Security (RLS)** para isolamento de dados por usuário
- ✅ **Triggers automáticos** para cálculos e notificações
- ✅ **Índices otimizados** para performance
- ✅ **Funções PL/pgSQL** para lógica de negócio

---

## 🗂️ Tabelas e Campos

### 1. `categories` - Categorias de Gasto/Receita

Armazena as categorias que o usuário cria.

```sql
id              UUID      - Chave primária
user_id         UUID      - Referência ao usuário (FK)
name            VARCHAR   - Nome da categoria (ex: "Lazer")
icon            VARCHAR   - Ícone (ex: "tag", "shopping", etc)
color           VARCHAR   - Cor em hex (ex: "#8B5CF6")
type            VARCHAR   - 'income' ou 'expense'
created_at      TIMESTAMP - Data de criação
```

**Exemplos:**
- Lazer (expense, roxo)
- Supermercado (expense, verde)
- Salário (income, verde)

---

### 2. `cards` - Cartões de Crédito

Armazena informações dos cartões cadastrados.

```sql
id              UUID      - Chave primária
user_id         UUID      - Referência ao usuário (FK)
name            VARCHAR   - Nome (ex: "Nubank")
number          VARCHAR   - Últimos 4 dígitos
limit           DECIMAL   - Limite total disponível
limit_used      DECIMAL   - Limite já utilizado
due_day         INTEGER   - Dia do vencimento (1-31)
closing_day     INTEGER   - Dia do fechamento (1-31)
color           VARCHAR   - Cor do cartão em hex
active          BOOLEAN   - Se está ativo
created_at      TIMESTAMP - Data de criação
updated_at      TIMESTAMP - Última atualização
```

**Lógica:**
- Dia de fechamento = quando a fatura fecha
- Dia de vencimento = quando deve ser paga
- Exemplo: Fecha no dia 1º, vence no dia 15º

---

### 3. `transactions` - Transações (Receitas e Despesas)

Registra todas as transações do usuário.

```sql
id              UUID      - Chave primária
user_id         UUID      - Referência ao usuário (FK)
category_id     UUID      - Referência à categoria (FK, opcional)
card_id         UUID      - Referência ao cartão (FK, opcional)
description     VARCHAR   - O que foi (ex: "Almoço na pizzaria")
amount          DECIMAL   - Valor da transação
type            VARCHAR   - 'income' ou 'expense'
date            DATE      - Data da transação
status          VARCHAR   - 'pending', 'completed', 'cancelled'
installments    INTEGER   - Número de parcelas (padrão 1)
current_inst.   INTEGER   - Parcela atual (para rastreamento)
created_at      TIMESTAMP - Data de criação
updated_at      TIMESTAMP - Última atualização
```

**Regras de Negócio:**
- Se `card_id` é NULL → Débito ou Transferência (imediato)
- Se `card_id` tem valor → Crédito (parcela futura)
- Se `installments > 1` → Cria parcelas automáticas

---

### 4. `invoices` - Faturas de Cartão

Agrupa transações em faturas mensais por cartão.

```sql
id              UUID      - Chave primária
user_id         UUID      - Referência ao usuário (FK)
card_id         UUID      - Referência ao cartão (FK)
month           INTEGER   - Mês (1-12)
year            INTEGER   - Ano (2024, etc)
total           DECIMAL   - Total da fatura (soma das parcelas)
status          VARCHAR   - 'open', 'closed', 'paid'
due_date        DATE      - Data de vencimento
paid_at         TIMESTAMP - Quando foi paga
created_at      TIMESTAMP - Data de criação
```

**Estados:**
- `open` = Fatura aberta, podem ser adicionadas transações
- `closed` = Fatura fechada (após dia de fechamento)
- `paid` = Fatura paga (limite é liberado)

---

### 5. `installments` - Parcelas

Registra cada parcela de uma compra parcelada.

```sql
id              UUID      - Chave primária
user_id         UUID      - Referência ao usuário (FK)
transaction_id  UUID      - Referência à transação (FK)
invoice_id      UUID      - Referência à fatura (FK)
amount          DECIMAL   - Valor dessa parcela
installment_#   INTEGER   - Número da parcela (ex: 1, 2, 3...)
total_inst.     INTEGER   - Total de parcelas (ex: 12)
status          VARCHAR   - 'pending' ou 'paid'
due_date        DATE      - Data de vencimento dessa parcela
paid_at         TIMESTAMP - Quando foi paga
created_at      TIMESTAMP - Data de criação
```

**Exemplo - Compra de R$1200 em 3x:**
1. Transação: R$1200 em 3 parcelas
2. Parcela 1: R$400 → Fatura Jan (status: pending)
3. Parcela 2: R$400 → Fatura Fev (status: pending)
4. Parcela 3: R$400 → Fatura Mar (status: pending)

---

### 6. `pretensions` - Limites Mensais por Categoria

Define quanto o usuário quer gastar em cada categoria por mês.

```sql
id              UUID      - Chave primária
user_id         UUID      - Referência ao usuário (FK)
category_id     UUID      - Referência à categoria (FK)
amount          DECIMAL   - Limite desejado (ex: R$300)
month           INTEGER   - Mês (1-12)
year            INTEGER   - Ano (2024, etc)
created_at      TIMESTAMP - Data de criação
```

**Exemplo:**
- Categoria: Lazer, Limite: R$300, Janeiro 2024
- Sistema avisa ao chegar em R$240 (80%)
- Sistema alerta ao ultrapassar R$300 (100%)

---

### 7. `notifications` - Notificações/Alertas

Armazena alertas gerados automaticamente pelo sistema.

```sql
id              UUID      - Chave primária
user_id         UUID      - Referência ao usuário (FK)
type            VARCHAR   - Tipo de alerta
title           VARCHAR   - Título da notificação
message         TEXT      - Mensagem descritiva
related_id      UUID      - ID da entidade relacionada (opcional)
read            BOOLEAN   - Se foi lida
created_at      TIMESTAMP - Data de criação
```

**Tipos de Notificações:**
- `pretension_warning` - Atingiu 80% do limite
- `pretension_exceeded` - Ultrapassou limite
- `invoice_due` - Fatura próxima do vencimento
- `invoice_paid` - Fatura paga com sucesso
- `card_limit_high` - Cartão com limite alto utilizado

---

### 8. `insights` - Análises e Sugestões

Armazena análises automáticas de gastos.

```sql
id              UUID      - Chave primária
user_id         UUID      - Referência ao usuário (FK)
type            VARCHAR   - Tipo de insight
title           VARCHAR   - Título da análise
message         TEXT      - Descrição da análise
metadata        JSONB     - Dados adicionais (JSON)
created_at      TIMESTAMP - Data de criação
```

**Tipos de Insights:**
- `spending_trend` - "Seus gastos aumentaram 20% esse mês"
- `savings_tip` - "Você pode economizar em Lanches"
- `comparison` - "Categoria X cresceu mais que o normal"

---

## 🔗 Relacionamentos

```
users (Supabase Auth)
├── categories (user_id)
├── cards (user_id)
│   ├── invoices (card_id)
│   │   └── installments (invoice_id)
├── transactions (user_id, category_id, card_id)
│   └── installments (transaction_id)
├── pretensions (user_id, category_id)
├── notifications (user_id)
└── insights (user_id)
```

---

## 🔐 Row Level Security (RLS)

Cada tabela possui políticas RLS que garantem:

✅ Usuário só vê seus próprios dados
✅ Usuário pode INSERT seus dados
✅ Usuário pode UPDATE seus dados
✅ Usuário pode DELETE seus dados

**Exemplo de Policy:**
```sql
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);
```

---

## ⚡ Triggers Automáticos

### 1. `trigger_create_monthly_invoices`
**Quando:** Novo cartão é adicionado
**Ação:** Cria faturas para próximos 3 meses

### 2. `trigger_update_card_limit_used`
**Quando:** Nova parcela é criada/atualizada
**Ação:** Recalcula limite utilizado do cartão

### 3. `trigger_create_installments`
**Quando:** Nova transação com parcelamento
**Ação:** Cria automaticamente as parcelas em faturas futuras

### 4. `trigger_update_invoice_total`
**Quando:** Parcela é adicionada/atualizada
**Ação:** Recalcula total da fatura

### 5. `trigger_release_limit_on_payment`
**Quando:** Fatura é marcada como "paid"
**Ação:** Libera limite do cartão

### 6. `trigger_check_pretension_alert`
**Quando:** Nova despesa é adicionada
**Ação:** Verifica se atingiu 80% ou 100% e emite alerta

---

## 📈 Índices para Performance

Criados automaticamente para otimizar consultas:

```sql
user_id         - Rápidas buscas por usuário
date            - Filtros por período
card_id         - Associação com cartões
category_id     - Filtros por categoria
```

---

## 🧪 Exemplos de Uso

### Exemplo 1: Compra à Vista (Débito)
```
1. Usuario adiciona transação:
   - Descrição: "Almoço"
   - Valor: R$50
   - Tipo: expense
   - Card: NULL (débito)

2. Sistema:
   - Registra transação como 'completed'
   - Não cria faturas
   - Atualiza imediatamente as pretensões
   - Emite alerta se necessário
```

### Exemplo 2: Compra Parcelada
```
1. Usuário adiciona transação:
   - Descrição: "Notebook"
   - Valor: R$3000
   - Tipo: expense
   - Card: Nubank
   - Parcelas: 12

2. Sistema:
   - Cria transação com 12 parcelas
   - Cria 12 registros em installments (R$250 cada)
   - Distribui em 12 faturas (Jan-Dez)
   - Atualiza limite utilizado do cartão (+R$3000)

3. Quando fatura de Janeiro é paga:
   - Marca parcela 1 como 'paid'
   - Libera R$250 do limite
   - Limita continua bloqueado (faltam 11 parcelas)
```

### Exemplo 3: Alertas de Limite
```
1. Usuário define pretensão:
   - Categoria: Lazer
   - Limite: R$300 para Janeiro

2. Usuário adiciona despesas:
   - R$50 (16%) - Sem alerta
   - R$100 (49%) - Sem alerta  
   - R$80 (75%) - Sem alerta
   - R$30 (85%) - ⚠️ ALERTA 80%!
   - R$50 (100%) - 🚨 LIMITE ATINGIDO!
```

---

## 🔄 Fluxo Automático Completo

```
Usuário adiciona transação
        ↓
Registra em transactions
        ↓
É uma compra parcelada?
   ├─ SIM → Cria installments em faturas futuras
   │         ↓
   │        Atualiza limite do cartão
   │         ↓
   │        Emite alerta de pretensão
   └─ NÃO → Débito imediato
             ↓
            Atualiza pretensões
             ↓
            Emite alerta se necessário
```

---

## 📞 Dúvidas Comuns

**P: Por que minha compra não aparece na pretensão?**
R: Compras no crédito só contam quando a fatura é marcada como paga.

**P: Quando o limite é liberado?**
R: Quando a fatura é marcada como "paid".

**P: Posso ter múltiplos cartões?**
R: Sim! Cada cartão tem suas próprias faturas e limites.

**P: Os alertas são automáticos?**
R: Sim! Triggers automáticos emitem alertas em tempo real.

---

**Última atualização:** Novembro 2024
**Versão do Schema:** 2.0
