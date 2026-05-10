-- ============================================================
-- Migration: Dashboard RPCs and Performance Indexes
-- ============================================================

-- 1. Alterar tabela tenants para incluir timezone
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- 2. Índices de performance para o Dashboard
CREATE INDEX IF NOT EXISTS idx_sales_dashboard_metrics 
ON sales(tenant_id, status, created_at) 
WHERE status = 'pago';

CREATE INDEX IF NOT EXISTS idx_expenses_dashboard_metrics 
ON expenses(tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_inventory_balances_low_stock 
ON inventory_balances(tenant_id, qty);

-- 3. RPC: get_dashboard_summary
CREATE OR REPLACE FUNCTION get_dashboard_summary(
  p_tenant_id UUID,
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_receita NUMERIC;
  v_pedidos_pagos INT;
  v_cogs NUMERIC;
  v_despesas NUMERIC;
  v_estoque_baixo_count INT;
BEGIN
  -- Validar se o usuário pertence ao tenant
  IF NOT EXISTS (
    SELECT 1 FROM tenant_members 
    WHERE tenant_id = p_tenant_id 
    AND user_id = auth.uid() 
    AND active = TRUE
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- 1. Métricas de Vendas (Status: pago)
  SELECT 
    COALESCE(SUM(total), 0),
    COUNT(id)
  INTO v_receita, v_pedidos_pagos
  FROM sales
  WHERE tenant_id = p_tenant_id
    AND status = 'pago'
    AND created_at >= p_date_from
    AND created_at <= p_date_to;

  -- 2. COGS (Custo das Mercadorias Vendidas)
  SELECT 
    COALESCE(SUM(si.qty * si.cost_snapshot), 0)
  INTO v_cogs
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  WHERE s.tenant_id = p_tenant_id
    AND s.status = 'pago'
    AND s.created_at >= p_date_from
    AND s.created_at <= p_date_to;

  -- 3. Despesas
  SELECT 
    COALESCE(SUM(amount), 0)
  INTO v_despesas
  FROM expenses
  WHERE tenant_id = p_tenant_id
    AND date >= p_date_from::DATE
    AND date <= p_date_to::DATE;

  -- 4. Contador de Estoque Baixo
  SELECT COUNT(*)
  INTO v_estoque_baixo_count
  FROM inventory_balances ib
  JOIN products p ON p.id = ib.product_id
  WHERE ib.tenant_id = p_tenant_id
    AND ib.qty <= p.low_stock_threshold;

  -- 5. Montar Resultado Final
  v_result := jsonb_build_object(
    'metrics', jsonb_build_object(
      'receita', v_receita,
      'pedidos_pagos', v_pedidos_pagos,
      'ticket_medio', CASE WHEN v_pedidos_pagos > 0 THEN v_receita / v_pedidos_pagos ELSE 0 END,
      'cogs', v_cogs,
      'lucro_bruto', v_receita - v_cogs,
      'despesas', v_despesas,
      'lucro_liquido', (v_receita - v_cogs) - v_despesas,
      'estoque_baixo_count', v_estoque_baixo_count
    ),
    'recent_sales', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT 
          s.id,
          s.created_at,
          c.name as customer_name,
          s.total,
          s.status
        FROM sales s
        LEFT JOIN customers c ON c.id = s.customer_id
        WHERE s.tenant_id = p_tenant_id
        ORDER BY s.created_at DESC
        LIMIT 8
      ) t
    ),
    'low_stock_items', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT 
          p.id,
          p.name,
          ib.qty,
          p.low_stock_threshold
        FROM inventory_balances ib
        JOIN products p ON p.id = ib.product_id
        WHERE ib.tenant_id = p_tenant_id
          AND ib.qty <= p.low_stock_threshold
        ORDER BY ib.qty ASC
        LIMIT 8
      ) t
    )
  );

  RETURN v_result;
END;
$$;

-- 4. RPC: get_sales_timeseries
CREATE OR REPLACE FUNCTION get_sales_timeseries(
  p_tenant_id UUID,
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ,
  p_interval TEXT DEFAULT 'day'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validar acesso
  IF NOT EXISTS (SELECT 1 FROM tenant_members WHERE tenant_id = p_tenant_id AND user_id = auth.uid() AND active = TRUE) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
    FROM (
      SELECT 
        date_trunc(p_interval, created_at) as date,
        SUM(total) as revenue,
        COUNT(id) as orders_count
      FROM sales
      WHERE tenant_id = p_tenant_id
        AND status = 'pago'
        AND created_at >= p_date_from
        AND created_at <= p_date_to
      GROUP BY 1
      ORDER BY 1 ASC
    ) t
  );
END;
$$;

-- 5. RPC: get_top_products
CREATE OR REPLACE FUNCTION get_top_products(
  p_tenant_id UUID,
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ,
  p_limit INT DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validar acesso
  IF NOT EXISTS (SELECT 1 FROM tenant_members WHERE tenant_id = p_tenant_id AND user_id = auth.uid() AND active = TRUE) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
    FROM (
      SELECT 
        p.id,
        p.name,
        SUM(si.qty) as qty_sold,
        SUM(si.qty * si.price) as revenue,
        SUM(si.qty * (si.price - si.cost_snapshot)) as estimated_profit
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      WHERE s.tenant_id = p_tenant_id
        AND s.status = 'pago'
        AND s.created_at >= p_date_from
        AND s.created_at <= p_date_to
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
      LIMIT p_limit
    ) t
  );
END;
$$;
