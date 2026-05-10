-- ============================================================
-- Migration 002: RLS (Row Level Security) + Policies
-- ============================================================

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

-- Verifica se o usuário autenticado é membro ativo de um tenant
CREATE OR REPLACE FUNCTION is_tenant_member(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
      AND active = TRUE
  );
$$;

-- Retorna o role do usuário no tenant
CREATE OR REPLACE FUNCTION tenant_role(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM tenant_members
  WHERE tenant_id = p_tenant_id
    AND user_id = auth.uid()
    AND active = TRUE
  LIMIT 1;
$$;

-- ============================================================
-- HABILITAR RLS
-- ============================================================

ALTER TABLE tenants               ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images        ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_balances    ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses              ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES: tenants
-- ============================================================

DROP POLICY IF EXISTS "Membro pode ver seu tenant" ON tenants;
CREATE POLICY "Membro pode ver seu tenant" ON tenants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tenant_members tm
      WHERE tm.tenant_id = id AND tm.user_id = auth.uid() AND tm.active = TRUE)
  );

-- ============================================================
-- POLICIES: profiles
-- ============================================================

DROP POLICY IF EXISTS "Usuário vê próprio perfil" ON profiles;
CREATE POLICY "Usuário vê próprio perfil" ON profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Usuário atualiza próprio perfil" ON profiles;
CREATE POLICY "Usuário atualiza próprio perfil" ON profiles
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- POLICIES: tenant_members
-- ============================================================

DROP POLICY IF EXISTS "Membro vê membros do tenant" ON tenant_members;
CREATE POLICY "Membro vê membros do tenant" ON tenant_members
  FOR SELECT USING (is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Admin gerencia membros" ON tenant_members;
CREATE POLICY "Admin gerencia membros" ON tenant_members
  FOR ALL USING (tenant_role(tenant_id) = 'admin');

-- ============================================================
-- POLICIES: tenant_settings
-- ============================================================

DROP POLICY IF EXISTS "Membro vê configurações" ON tenant_settings;
CREATE POLICY "Membro vê configurações" ON tenant_settings
  FOR SELECT USING (is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Admin altera configurações" ON tenant_settings;
CREATE POLICY "Admin altera configurações" ON tenant_settings
  FOR ALL USING (tenant_role(tenant_id) = 'admin');

-- ============================================================
-- POLICIES: product_categories
-- ============================================================

DROP POLICY IF EXISTS "Membro vê categorias" ON product_categories;
CREATE POLICY "Membro vê categorias" ON product_categories
  FOR SELECT USING (is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Admin/Gerente gerencia categorias" ON product_categories;
CREATE POLICY "Admin/Gerente gerencia categorias" ON product_categories
  FOR ALL USING (tenant_role(tenant_id) IN ('admin', 'gerente'));

-- ============================================================
-- POLICIES: products
-- ============================================================

DROP POLICY IF EXISTS "Membro vê produtos" ON products;
CREATE POLICY "Membro vê produtos" ON products
  FOR SELECT USING (is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Admin/Gerente insere/atualiza produto" ON products;
CREATE POLICY "Admin/Gerente insere/atualiza produto" ON products
  FOR INSERT WITH CHECK (tenant_role(tenant_id) IN ('admin', 'gerente'));

DROP POLICY IF EXISTS "Admin/Gerente atualiza produto" ON products;
CREATE POLICY "Admin/Gerente atualiza produto" ON products
  FOR UPDATE USING (tenant_role(tenant_id) IN ('admin', 'gerente'));

DROP POLICY IF EXISTS "Admin deleta produto" ON products;
CREATE POLICY "Admin deleta produto" ON products
  FOR DELETE USING (tenant_role(tenant_id) = 'admin');

-- ============================================================
-- POLICIES: product_images
-- ============================================================

DROP POLICY IF EXISTS "Membro vê imagens" ON product_images;
CREATE POLICY "Membro vê imagens" ON product_images
  FOR SELECT USING (is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Admin/Gerente gerencia imagens" ON product_images;
CREATE POLICY "Admin/Gerente gerencia imagens" ON product_images
  FOR ALL USING (tenant_role(tenant_id) IN ('admin', 'gerente'));

-- ============================================================
-- POLICIES: product_variants
-- ============================================================

DROP POLICY IF EXISTS "Membro vê variantes" ON product_variants;
CREATE POLICY "Membro vê variantes" ON product_variants
  FOR SELECT USING (is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Admin/Gerente gerencia variantes" ON product_variants;
CREATE POLICY "Admin/Gerente gerencia variantes" ON product_variants
  FOR ALL USING (tenant_role(tenant_id) IN ('admin', 'gerente'));

-- ============================================================
-- POLICIES: inventory_balances
-- ============================================================

DROP POLICY IF EXISTS "Membro vê saldo estoque" ON inventory_balances;
CREATE POLICY "Membro vê saldo estoque" ON inventory_balances
  FOR SELECT USING (is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Admin/Gerente gerencia saldo" ON inventory_balances;
CREATE POLICY "Admin/Gerente gerencia saldo" ON inventory_balances
  FOR ALL USING (tenant_role(tenant_id) IN ('admin', 'gerente'));

-- ============================================================
-- POLICIES: inventory_movements
-- ============================================================

DROP POLICY IF EXISTS "Membro vê movimentações" ON inventory_movements;
CREATE POLICY "Membro vê movimentações" ON inventory_movements
  FOR SELECT USING (is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Admin/Gerente insere movimentação" ON inventory_movements;
CREATE POLICY "Admin/Gerente insere movimentação" ON inventory_movements
  FOR INSERT WITH CHECK (tenant_role(tenant_id) IN ('admin', 'gerente'));

DROP POLICY IF EXISTS "Operador insere movimentação de saída" ON inventory_movements;
CREATE POLICY "Operador insere movimentação de saída" ON inventory_movements
  FOR INSERT WITH CHECK (
    tenant_role(tenant_id) = 'operador' AND type = 'saida'
  );

-- ============================================================
-- POLICIES: customers
-- ============================================================

DROP POLICY IF EXISTS "Membro vê clientes" ON customers;
CREATE POLICY "Membro vê clientes" ON customers
  FOR SELECT USING (is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Admin/Gerente gerencia clientes" ON customers;
CREATE POLICY "Admin/Gerente gerencia clientes" ON customers
  FOR ALL USING (tenant_role(tenant_id) IN ('admin', 'gerente'));

DROP POLICY IF EXISTS "Operador insere cliente" ON customers;
CREATE POLICY "Operador insere cliente" ON customers
  FOR INSERT WITH CHECK (tenant_role(tenant_id) = 'operador');

-- ============================================================
-- POLICIES: sales
-- ============================================================

DROP POLICY IF EXISTS "Membro vê vendas" ON sales;
CREATE POLICY "Membro vê vendas" ON sales
  FOR SELECT USING (is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Membro registra venda" ON sales;
CREATE POLICY "Membro registra venda" ON sales
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Admin/Gerente atualiza venda" ON sales;
CREATE POLICY "Admin/Gerente atualiza venda" ON sales
  FOR UPDATE USING (tenant_role(tenant_id) IN ('admin', 'gerente'));

DROP POLICY IF EXISTS "Operador atualiza própria venda" ON sales;
CREATE POLICY "Operador atualiza própria venda" ON sales
  FOR UPDATE USING (
    tenant_role(tenant_id) = 'operador' AND created_by = auth.uid()
  );

-- ============================================================
-- POLICIES: sale_items
-- ============================================================

DROP POLICY IF EXISTS "Membro vê itens de venda" ON sale_items;
CREATE POLICY "Membro vê itens de venda" ON sale_items
  FOR SELECT USING (is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Membro insere itens de venda" ON sale_items;
CREATE POLICY "Membro insere itens de venda" ON sale_items
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));

-- ============================================================
-- POLICIES: payments
-- ============================================================

DROP POLICY IF EXISTS "Membro vê pagamentos" ON payments;
CREATE POLICY "Membro vê pagamentos" ON payments
  FOR SELECT USING (is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Membro insere pagamento" ON payments;
CREATE POLICY "Membro insere pagamento" ON payments
  FOR INSERT WITH CHECK (is_tenant_member(tenant_id));

-- ============================================================
-- POLICIES: expense_categories
-- ============================================================

DROP POLICY IF EXISTS "Membro vê categorias de despesa" ON expense_categories;
CREATE POLICY "Membro vê categorias de despesa" ON expense_categories
  FOR SELECT USING (is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Admin/Gerente gerencia categorias de despesa" ON expense_categories;
CREATE POLICY "Admin/Gerente gerencia categorias de despesa" ON expense_categories
  FOR ALL USING (tenant_role(tenant_id) IN ('admin', 'gerente'));

-- ============================================================
-- POLICIES: expenses
-- ============================================================

DROP POLICY IF EXISTS "Membro vê despesas" ON expenses;
CREATE POLICY "Membro vê despesas" ON expenses
  FOR SELECT USING (is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "Admin/Gerente gerencia despesas" ON expenses;
CREATE POLICY "Admin/Gerente gerencia despesas" ON expenses
  FOR ALL USING (tenant_role(tenant_id) IN ('admin', 'gerente'));
