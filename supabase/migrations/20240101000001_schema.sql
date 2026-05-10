-- ============================================================
-- Migration 001: Schema inicial completo Quiosque8 CRM/SaaS
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELAS BASE
-- ============================================================

-- Tenants (lojas)
CREATE TABLE IF NOT EXISTS tenants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles (dados extra do usuário auth)
CREATE TABLE IF NOT EXISTS profiles (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Membros por tenant (RBAC)
CREATE TABLE IF NOT EXISTS tenant_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'gerente', 'operador')),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON tenant_members(tenant_id);

-- Configurações por tenant
CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id                   UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  allow_negative_stock        BOOLEAN NOT NULL DEFAULT FALSE,
  global_low_stock_threshold  INT NOT NULL DEFAULT 5,
  store_name                  TEXT NOT NULL,
  store_phone                 TEXT,
  store_logo_path             TEXT,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATÁLOGO
-- ============================================================

-- Categorias de produto
CREATE TABLE IF NOT EXISTS product_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_categories_tenant_id ON product_categories(tenant_id);

-- Produtos
CREATE TABLE IF NOT EXISTS products (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id           UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  name                  TEXT NOT NULL,
  description           TEXT,
  sku                   TEXT,
  price                 NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  cost                  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  low_stock_threshold   INT NOT NULL DEFAULT 5,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_created ON products(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(tenant_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(to_tsvector('portuguese', name));

-- Imagens de produto
CREATE TABLE IF NOT EXISTS product_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  path        TEXT NOT NULL,
  is_cover    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- Variantes de produto
CREATE TABLE IF NOT EXISTS product_variants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku         TEXT,
  price       NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  cost        NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  attributes  JSONB NOT NULL DEFAULT '{}',
  active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

-- ============================================================
-- ESTOQUE
-- ============================================================

-- Saldo de estoque (por produto/variante)
CREATE TABLE IF NOT EXISTS inventory_balances (
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  qty         NUMERIC(12,3) NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::UUID))
);

-- Unique sem variant
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_balances_no_variant
  ON inventory_balances(tenant_id, product_id)
  WHERE variant_id IS NULL;

-- Unique com variant
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_balances_with_variant
  ON inventory_balances(tenant_id, product_id, variant_id)
  WHERE variant_id IS NOT NULL;

-- Movimentações de estoque (auditoria)
CREATE TABLE IF NOT EXISTS inventory_movements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id        UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  type              TEXT NOT NULL CHECK (type IN ('entrada', 'saida', 'ajuste')),
  qty               NUMERIC(12,3) NOT NULL,
  reason            TEXT,
  reference_sale_id UUID,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_tenant_product ON inventory_movements(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_tenant_created ON inventory_movements(tenant_id, created_at DESC);

-- ============================================================
-- CLIENTES
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  city        TEXT,
  state       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers USING gin(to_tsvector('portuguese', name));

-- ============================================================
-- VENDAS
-- ============================================================

CREATE TABLE IF NOT EXISTS sales (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  subtotal      NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  discount      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total         NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  paid_at       TIMESTAMPTZ,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  canceled_at   TIMESTAMPTZ,
  canceled_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cancel_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_sales_tenant_id ON sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_created ON sales(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_status ON sales(tenant_id, status);

-- Itens da venda
CREATE TABLE IF NOT EXISTS sale_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id       UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id    UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  qty           NUMERIC(12,3) NOT NULL CHECK (qty > 0),
  price         NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  discount      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  cost_snapshot NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_snapshot >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- Pagamentos da venda
CREATE TABLE IF NOT EXISTS payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id     UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  method      TEXT NOT NULL CHECK (method IN ('dinheiro', 'pix', 'cartao', 'outros')),
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments(sale_id);

-- ============================================================
-- DESPESAS
-- ============================================================

CREATE TABLE IF NOT EXISTS expense_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_tenant_id ON expense_categories(tenant_id);

CREATE TABLE IF NOT EXISTS expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  date            DATE NOT NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description     TEXT NOT NULL,
  payment_method  TEXT,
  recurring       BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date ON expenses(tenant_id, date DESC);

-- ============================================================
-- TRIGGER: atualiza updated_at de products
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tenant_settings_updated_at ON tenant_settings;
CREATE TRIGGER tenant_settings_updated_at
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
