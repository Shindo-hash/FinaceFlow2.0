-- ============================================
-- FINANCEFLOW 2.0 - DATABASE SCHEMA
-- ============================================

-- 1. TABELA: CATEGORIES (Categorias de Gasto)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT 'tag',
  color VARCHAR(7) DEFAULT '#8B5CF6',
  type VARCHAR(20) NOT NULL DEFAULT 'expense', -- 'income' ou 'expense'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- 2. TABELA: CARDS (Cartões de Crédito)
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  number VARCHAR(4) DEFAULT '',
  limit DECIMAL(12, 2) NOT NULL,
  limit_used DECIMAL(12, 2) DEFAULT 0,
  due_day INTEGER NOT NULL DEFAULT 15,
  closing_day INTEGER NOT NULL DEFAULT 1,
  color VARCHAR(7) DEFAULT '#8B5CF6',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. TABELA: PRETENSIONS (Limites Mensais por Categoria)
CREATE TABLE pretensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, category_id, month, year)
);

-- 4. TABELA: TRANSACTIONS (Transações do Usuário)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'expense', -- 'income' ou 'expense'
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
  installments INTEGER DEFAULT 1,
  current_installment INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. TABELA: INVOICES (Faturas de Cartão)
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total DECIMAL(12, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'closed', 'paid'
  due_date DATE NOT NULL,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(card_id, month, year)
);

-- 6. TABELA: INSTALLMENTS (Parcelamentos)
CREATE TABLE installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  installment_number INTEGER NOT NULL,
  total_installments INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid'
  due_date DATE NOT NULL,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. TABELA: NOTIFICATIONS (Notificações)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'pretension_warning', 'card_limit', 'invoice_due', etc
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_id UUID, -- ID da categoria, cartão, etc que gerou a notificação
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. TABELA: INSIGHTS (Análises e Sugestões)
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'spending_trend', 'savings_tip', 'comparison', etc
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pretensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- Políticas para CATEGORIES
CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para CARDS
CREATE POLICY "Users can view own cards"
  ON cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards"
  ON cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cards"
  ON cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cards"
  ON cards FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para PRETENSIONS
CREATE POLICY "Users can view own pretensions"
  ON pretensions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pretensions"
  ON pretensions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pretensions"
  ON pretensions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pretensions"
  ON pretensions FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para TRANSACTIONS
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para INVOICES
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas para INSTALLMENTS
CREATE POLICY "Users can view own installments"
  ON installments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own installments"
  ON installments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own installments"
  ON installments FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas para NOTIFICATIONS
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas para INSIGHTS
CREATE POLICY "Users can view own insights"
  ON insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights"
  ON insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_pretensions_user_id ON pretensions(user_id);
CREATE INDEX idx_pretensions_category_id ON pretensions(category_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_card_id ON invoices(card_id);
CREATE INDEX idx_installments_user_id ON installments(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_insights_user_id ON insights(user_id);
