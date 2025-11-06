-- ============================================
-- FINANCEFLOW 2.0 - FUNCTIONS & TRIGGERS
-- ============================================

-- ============================================
-- 1. FUNCTION: Criar faturas automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION create_monthly_invoices()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um cartão é criado, criar faturas para próximos 3 meses
  INSERT INTO invoices (user_id, card_id, month, year, total, status, due_date)
  SELECT 
    NEW.user_id,
    NEW.id,
    EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month' * i)::int,
    EXTRACT(YEAR FROM CURRENT_DATE + INTERVAL '1 month' * i)::int,
    0,
    'open',
    (CURRENT_DATE + INTERVAL '1 month' * i)::date
  FROM generate_series(0, 2) AS i
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar faturas quando cartão é inserido
CREATE TRIGGER trigger_create_monthly_invoices
AFTER INSERT ON cards
FOR EACH ROW
EXECUTE FUNCTION create_monthly_invoices();

-- ============================================
-- 2. FUNCTION: Atualizar limite usado do cartão
-- ============================================
CREATE OR REPLACE FUNCTION update_card_limit_used()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cards
  SET limit_used = (
    SELECT COALESCE(SUM(i.amount), 0)
    FROM installments i
    WHERE i.card_id = NEW.card_id
    AND i.status = 'pending'
  )
  WHERE id = NEW.card_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar limite quando parcela é criada/atualizada
CREATE TRIGGER trigger_update_card_limit_used
AFTER INSERT OR UPDATE ON installments
FOR EACH ROW
EXECUTE FUNCTION update_card_limit_used();

-- ============================================
-- 3. FUNCTION: Criar parcelas automáticas
-- ============================================
CREATE OR REPLACE FUNCTION create_installments_for_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_installment_count INT;
  v_installment_amount DECIMAL;
  v_month INT;
  v_year INT;
  v_invoice_id UUID;
  i INT;
BEGIN
  -- Se é uma compra parcelada no crédito
  IF NEW.card_id IS NOT NULL AND NEW.installments > 1 THEN
    v_installment_amount := NEW.amount / NEW.installments;
    v_month := EXTRACT(MONTH FROM NEW.date)::int;
    v_year := EXTRACT(YEAR FROM NEW.date)::int;

    -- Criar parcelas para cada mês
    FOR i IN 0..(NEW.installments - 1) LOOP
      -- Ajustar mês/ano se necessário
      IF v_month + i > 12 THEN
        v_month := (v_month + i) - 12;
        v_year := v_year + 1;
      ELSE
        v_month := v_month + i;
      END IF;

      -- Buscar ou criar fatura
      SELECT id INTO v_invoice_id
      FROM invoices
      WHERE card_id = NEW.card_id
      AND month = v_month
      AND year = v_year
      LIMIT 1;

      IF v_invoice_id IS NULL THEN
        INSERT INTO invoices (user_id, card_id, month, year, total, status, due_date)
        VALUES (NEW.user_id, NEW.card_id, v_month, v_year, 0, 'open', CURRENT_DATE)
        RETURNING id INTO v_invoice_id;
      END IF;

      -- Criar parcela
      INSERT INTO installments (
        user_id,
        transaction_id,
        invoice_id,
        amount,
        installment_number,
        total_installments,
        status,
        due_date
      ) VALUES (
        NEW.user_id,
        NEW.id,
        v_invoice_id,
        v_installment_amount,
        i + 1,
        NEW.installments,
        'pending',
        CURRENT_DATE
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar parcelas quando transação é inserida
CREATE TRIGGER trigger_create_installments
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION create_installments_for_transaction();

-- ============================================
-- 4. FUNCTION: Atualizar total da fatura
-- ============================================
CREATE OR REPLACE FUNCTION update_invoice_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices
  SET total = (
    SELECT COALESCE(SUM(amount), 0)
    FROM installments
    WHERE invoice_id = NEW.invoice_id
    AND status = 'pending'
  )
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar total da fatura
CREATE TRIGGER trigger_update_invoice_total
AFTER INSERT OR UPDATE ON installments
FOR EACH ROW
EXECUTE FUNCTION update_invoice_total();

-- ============================================
-- 5. FUNCTION: Liberar limite ao pagar fatura
-- ============================================
CREATE OR REPLACE FUNCTION release_card_limit_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- Marcar todas as parcelas da fatura como pagas
    UPDATE installments
    SET status = 'paid', paid_at = NOW()
    WHERE invoice_id = NEW.id
    AND status = 'pending';

    -- Recalcular limite usado do cartão
    UPDATE cards
    SET limit_used = (
      SELECT COALESCE(SUM(i.amount), 0)
      FROM installments i
      WHERE i.card_id = NEW.card_id
      AND i.status = 'pending'
    )
    WHERE id = NEW.card_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para liberar limite ao pagar
CREATE TRIGGER trigger_release_limit_on_payment
AFTER UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION release_card_limit_on_payment();

-- ============================================
-- 6. FUNCTION: Criar notificação de pretensão
-- ============================================
CREATE OR REPLACE FUNCTION check_pretension_alert()
RETURNS TRIGGER AS $$
DECLARE
  v_pretension DECIMAL;
  v_spent DECIMAL;
  v_percentage DECIMAL;
  v_category_name VARCHAR;
BEGIN
  -- Se é uma despesa em uma categoria
  IF NEW.type = 'expense' AND NEW.category_id IS NOT NULL THEN
    -- Buscar pretensão da categoria no mês atual
    SELECT amount INTO v_pretension
    FROM pretensions
    WHERE category_id = NEW.category_id
    AND month = EXTRACT(MONTH FROM NEW.date)::int
    AND year = EXTRACT(YEAR FROM NEW.date)::int
    AND user_id = NEW.user_id;

    IF v_pretension IS NOT NULL THEN
      -- Calcular gasto total da categoria neste mês
      SELECT COALESCE(SUM(amount), 0) INTO v_spent
      FROM transactions
      WHERE category_id = NEW.category_id
      AND type = 'expense'
      AND EXTRACT(MONTH FROM date)::int = EXTRACT(MONTH FROM NEW.date)::int
      AND EXTRACT(YEAR FROM date)::int = EXTRACT(YEAR FROM NEW.date)::int
      AND user_id = NEW.user_id;

      v_percentage := (v_spent / v_pretension) * 100;

      SELECT name INTO v_category_name FROM categories WHERE id = NEW.category_id;

      -- Notificação de 80% atingido
      IF v_percentage >= 80 AND v_percentage < 100 THEN
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES (
          NEW.user_id,
          'pretension_warning',
          'Atenção: ' || v_category_name || ' em aviso',
          'Você atingiu 80% do limite mensal de ' || v_category_name || '!',
          NEW.category_id
        );
      END IF;

      -- Notificação de limite ultrapassado
      IF v_percentage >= 100 THEN
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES (
          NEW.user_id,
          'pretension_exceeded',
          'Limite ultrapassado: ' || v_category_name,
          'Você ultrapassou o limite mensal de ' || v_category_name || '!',
          NEW.category_id
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para alertar sobre pretensões
CREATE TRIGGER trigger_check_pretension_alert
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION check_pretension_alert();

-- ============================================
-- 7. FUNCTION: Limpar notificações antigas
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND read = TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. FUNCTION: Gerar insights automáticos
-- ============================================
CREATE OR REPLACE FUNCTION generate_spending_insights()
RETURNS void AS $$
DECLARE
  v_user RECORD;
  v_this_month DECIMAL;
  v_last_month DECIMAL;
  v_diff_percent DECIMAL;
BEGIN
  FOR v_user IN SELECT DISTINCT user_id FROM transactions LOOP
    -- Comparar gasto deste mês com mês anterior
    SELECT COALESCE(SUM(amount), 0) INTO v_this_month
    FROM transactions
    WHERE user_id = v_user.user_id
    AND type = 'expense'
    AND EXTRACT(MONTH FROM date)::int = EXTRACT(MONTH FROM CURRENT_DATE)::int
    AND EXTRACT(YEAR FROM date)::int = EXTRACT(YEAR FROM CURRENT_DATE)::int;

    SELECT COALESCE(SUM(amount), 0) INTO v_last_month
    FROM transactions
    WHERE user_id = v_user.user_id
    AND type = 'expense'
    AND EXTRACT(MONTH FROM date)::int = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::int
    AND EXTRACT(YEAR FROM date)::int = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::int;

    IF v_last_month > 0 THEN
      v_diff_percent := ((v_this_month - v_last_month) / v_last_month) * 100;

      IF ABS(v_diff_percent) > 10 THEN
        INSERT INTO insights (user_id, type, title, message, metadata)
        VALUES (
          v_user.user_id,
          'spending_trend',
          CASE WHEN v_diff_percent > 0 THEN 'Gasto aumentou' ELSE 'Gasto diminuiu' END,
          'Seu gasto este mês ' || CASE WHEN v_diff_percent > 0 THEN 'aumentou' ELSE 'diminuiu' END || ' ' || ABS(v_diff_percent)::int || '% comparado ao mês passado.',
          jsonb_build_object('this_month', v_this_month, 'last_month', v_last_month, 'difference_percent', v_diff_percent)
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
