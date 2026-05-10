-- ============================================================
-- Migration 003: RPCs atômicas — create_sale e cancel_sale
-- ============================================================

-- ============================================================
-- RPC: create_sale
-- Cria uma venda completa em transação:
-- 1. Valida estoque (se não permite negativo)
-- 2. Cria sale, sale_items, payments
-- 3. Gera inventory_movements de saída
-- 4. Atualiza inventory_balances
-- Retorna: UUID da venda criada
-- ============================================================

CREATE OR REPLACE FUNCTION create_sale(
  p_tenant_id   UUID,
  p_customer_id UUID,
  p_items       JSONB,   -- [{product_id, variant_id?, qty, price, discount, cost_snapshot}]
  p_payments    JSONB,   -- [{method, amount}]
  p_discount    NUMERIC,
  p_created_by  UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id       UUID;
  v_subtotal      NUMERIC := 0;
  v_total         NUMERIC;
  v_item          JSONB;
  v_payment       JSONB;
  v_balance_qty   NUMERIC;
  v_allow_neg     BOOLEAN;
  v_product_id    UUID;
  v_variant_id    UUID;
  v_qty           NUMERIC;
  v_price         NUMERIC;
  v_item_discount NUMERIC;
  v_cost          NUMERIC;
BEGIN
  -- Verificar se usuário é membro ativo do tenant
  IF NOT is_tenant_member(p_tenant_id) THEN
    RAISE EXCEPTION 'Acesso negado ao tenant';
  END IF;

  -- Buscar configuração de estoque negativo
  SELECT allow_negative_stock INTO v_allow_neg
    FROM tenant_settings WHERE tenant_id = p_tenant_id;

  -- Calcular subtotal e validar estoque
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id    := (v_item->>'product_id')::UUID;
    v_variant_id    := NULLIF(v_item->>'variant_id', '')::UUID;
    v_qty           := (v_item->>'qty')::NUMERIC;
    v_price         := (v_item->>'price')::NUMERIC;
    v_item_discount := COALESCE((v_item->>'discount')::NUMERIC, 0);
    v_cost          := COALESCE((v_item->>'cost_snapshot')::NUMERIC, 0);

    -- Validar qty positiva
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantidade deve ser positiva para o produto %', v_product_id;
    END IF;

    -- Acumular subtotal
    v_subtotal := v_subtotal + (v_price * v_qty) - v_item_discount;

    -- Verificar estoque (bloquear linha para evitar race condition)
    IF v_variant_id IS NOT NULL THEN
      SELECT qty INTO v_balance_qty
        FROM inventory_balances
        WHERE tenant_id = p_tenant_id
          AND product_id = v_product_id
          AND variant_id = v_variant_id
        FOR UPDATE;
    ELSE
      SELECT qty INTO v_balance_qty
        FROM inventory_balances
        WHERE tenant_id = p_tenant_id
          AND product_id = v_product_id
          AND variant_id IS NULL
        FOR UPDATE;
    END IF;

    v_balance_qty := COALESCE(v_balance_qty, 0);

    IF NOT v_allow_neg AND (v_balance_qty - v_qty) < 0 THEN
      RAISE EXCEPTION 'Estoque insuficiente para o produto %. Disponível: %, Solicitado: %',
        v_product_id, v_balance_qty, v_qty;
    END IF;
  END LOOP;

  -- Calcular total
  v_total := GREATEST(v_subtotal - COALESCE(p_discount, 0), 0);

  -- Criar venda
  INSERT INTO sales (
    tenant_id, customer_id, status, subtotal, discount, total,
    paid_at, created_by
  ) VALUES (
    p_tenant_id, p_customer_id, 'pago', v_subtotal,
    COALESCE(p_discount, 0), v_total, NOW(), p_created_by
  ) RETURNING id INTO v_sale_id;

  -- Criar itens + movimentações + atualizar saldo
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id    := (v_item->>'product_id')::UUID;
    v_variant_id    := NULLIF(v_item->>'variant_id', '')::UUID;
    v_qty           := (v_item->>'qty')::NUMERIC;
    v_price         := (v_item->>'price')::NUMERIC;
    v_item_discount := COALESCE((v_item->>'discount')::NUMERIC, 0);
    v_cost          := COALESCE((v_item->>'cost_snapshot')::NUMERIC, 0);

    -- Inserir item da venda
    INSERT INTO sale_items (
      tenant_id, sale_id, product_id, variant_id, qty, price, discount, cost_snapshot
    ) VALUES (
      p_tenant_id, v_sale_id, v_product_id, v_variant_id,
      v_qty, v_price, v_item_discount, v_cost
    );

    -- Registrar movimentação de saída
    INSERT INTO inventory_movements (
      tenant_id, product_id, variant_id, type, qty, reason,
      reference_sale_id, created_by
    ) VALUES (
      p_tenant_id, v_product_id, v_variant_id, 'saida', v_qty,
      'Venda #' || v_sale_id::TEXT, v_sale_id, p_created_by
    );

    -- Atualizar saldo (upsert)
    IF v_variant_id IS NOT NULL THEN
      INSERT INTO inventory_balances (tenant_id, product_id, variant_id, qty)
        VALUES (p_tenant_id, v_product_id, v_variant_id, -v_qty)
        ON CONFLICT (tenant_id, product_id, variant_id)
        DO UPDATE SET qty = inventory_balances.qty - v_qty;
    ELSE
      INSERT INTO inventory_balances (tenant_id, product_id, qty)
        VALUES (p_tenant_id, v_product_id, -v_qty)
        ON CONFLICT (tenant_id, product_id)
        DO UPDATE SET qty = inventory_balances.qty - v_qty
        WHERE inventory_balances.variant_id IS NULL;
    END IF;
  END LOOP;

  -- Criar pagamentos
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO payments (tenant_id, sale_id, method, amount)
    VALUES (
      p_tenant_id, v_sale_id,
      v_payment->>'method',
      (v_payment->>'amount')::NUMERIC
    );
  END LOOP;

  RETURN v_sale_id;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ============================================================
-- RPC: cancel_sale
-- Cancela uma venda em transação:
-- 1. Valida que não está já cancelada
-- 2. Marca como cancelada
-- 3. Estorna estoque (movement entrada + atualiza balance)
-- Retorna: TRUE em sucesso
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_sale(
  p_tenant_id  UUID,
  p_sale_id    UUID,
  p_reason     TEXT,
  p_canceled_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale      RECORD;
  v_item      RECORD;
BEGIN
  -- Verificar acesso
  IF NOT is_tenant_member(p_tenant_id) THEN
    RAISE EXCEPTION 'Acesso negado ao tenant';
  END IF;

  -- Bloquear e verificar venda
  SELECT * INTO v_sale
    FROM sales
    WHERE id = p_sale_id AND tenant_id = p_tenant_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada';
  END IF;

  IF v_sale.status = 'cancelado' THEN
    RAISE EXCEPTION 'Venda já está cancelada';
  END IF;

  -- Atualizar status da venda
  UPDATE sales SET
    status        = 'cancelado',
    canceled_at   = NOW(),
    canceled_by   = p_canceled_by,
    cancel_reason = p_reason
  WHERE id = p_sale_id;

  -- Estornar estoque por item
  FOR v_item IN
    SELECT product_id, variant_id, qty
    FROM sale_items
    WHERE sale_id = p_sale_id AND tenant_id = p_tenant_id
  LOOP
    -- Registrar movimento de estorno (entrada)
    INSERT INTO inventory_movements (
      tenant_id, product_id, variant_id, type, qty, reason,
      reference_sale_id, created_by
    ) VALUES (
      p_tenant_id, v_item.product_id, v_item.variant_id, 'entrada', v_item.qty,
      'Estorno cancelamento venda #' || p_sale_id::TEXT,
      p_sale_id, p_canceled_by
    );

    -- Atualizar saldo
    IF v_item.variant_id IS NOT NULL THEN
      INSERT INTO inventory_balances (tenant_id, product_id, variant_id, qty)
        VALUES (p_tenant_id, v_item.product_id, v_item.variant_id, v_item.qty)
        ON CONFLICT (tenant_id, product_id, variant_id)
        DO UPDATE SET qty = inventory_balances.qty + v_item.qty;
    ELSE
      INSERT INTO inventory_balances (tenant_id, product_id, qty)
        VALUES (p_tenant_id, v_item.product_id, v_item.qty)
        ON CONFLICT (tenant_id, product_id)
        DO UPDATE SET qty = inventory_balances.qty + v_item.qty
        WHERE inventory_balances.variant_id IS NULL;
    END IF;
  END LOOP;

  RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ============================================================
-- RPC: add_inventory_movement
-- Registra movimentação manual (entrada/ajuste) e atualiza saldo
-- ============================================================

CREATE OR REPLACE FUNCTION add_inventory_movement(
  p_tenant_id  UUID,
  p_product_id UUID,
  p_variant_id UUID,
  p_type       TEXT,
  p_qty        NUMERIC,
  p_reason     TEXT,
  p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_movement_id UUID;
  v_allow_neg   BOOLEAN;
  v_balance_qty NUMERIC;
BEGIN
  IF NOT is_tenant_member(p_tenant_id) THEN
    RAISE EXCEPTION 'Acesso negado ao tenant';
  END IF;

  IF tenant_role(p_tenant_id) NOT IN ('admin', 'gerente') THEN
    RAISE EXCEPTION 'Apenas Admin ou Gerente podem registrar movimentações manuais';
  END IF;

  SELECT allow_negative_stock INTO v_allow_neg
    FROM tenant_settings WHERE tenant_id = p_tenant_id;

  -- Para saída e ajuste negativo, verificar estoque
  IF p_type = 'saida' OR (p_type = 'ajuste' AND p_qty < 0) THEN
    IF p_variant_id IS NOT NULL THEN
      SELECT qty INTO v_balance_qty
        FROM inventory_balances
        WHERE tenant_id = p_tenant_id AND product_id = p_product_id AND variant_id = p_variant_id
        FOR UPDATE;
    ELSE
      SELECT qty INTO v_balance_qty
        FROM inventory_balances
        WHERE tenant_id = p_tenant_id AND product_id = p_product_id AND variant_id IS NULL
        FOR UPDATE;
    END IF;

    v_balance_qty := COALESCE(v_balance_qty, 0);

    IF NOT v_allow_neg AND (v_balance_qty + p_qty) < 0 THEN
      RAISE EXCEPTION 'Estoque insuficiente. Disponível: %', v_balance_qty;
    END IF;
  END IF;

  -- Inserir movimentação
  INSERT INTO inventory_movements (
    tenant_id, product_id, variant_id, type, qty, reason, created_by
  ) VALUES (
    p_tenant_id, p_product_id, p_variant_id, p_type, p_qty, p_reason, p_created_by
  ) RETURNING id INTO v_movement_id;

  -- Atualizar saldo
  IF p_variant_id IS NOT NULL THEN
    INSERT INTO inventory_balances (tenant_id, product_id, variant_id, qty)
      VALUES (p_tenant_id, p_product_id, p_variant_id, p_qty)
      ON CONFLICT (tenant_id, product_id, variant_id)
      DO UPDATE SET qty = inventory_balances.qty + p_qty;
  ELSE
    INSERT INTO inventory_balances (tenant_id, product_id, qty)
      VALUES (p_tenant_id, p_product_id, p_qty)
      ON CONFLICT (tenant_id, product_id)
      DO UPDATE SET qty = inventory_balances.qty + p_qty
      WHERE inventory_balances.variant_id IS NULL;
  END IF;

  RETURN v_movement_id;
END;
$$;
