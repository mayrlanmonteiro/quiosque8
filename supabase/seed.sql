-- ============================================================
-- Seed: Dados iniciais Quiosque8
-- ============================================================
-- ATENÇÃO: Este seed é para desenvolvimento local.
-- Em produção, use o painel do Supabase para criar o usuário admin.
-- ============================================================

-- 1. Criar tenant
INSERT INTO tenants (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Quiosque8 artesanato nordestino')
ON CONFLICT (id) DO NOTHING;

-- 2. Configurações do tenant
INSERT INTO tenant_settings (
  tenant_id, allow_negative_stock, global_low_stock_threshold,
  store_name, store_phone
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  FALSE, 5,
  'Quiosque8 artesanato nordestino',
  '(81) 99999-0001'
)
ON CONFLICT (tenant_id) DO NOTHING;

-- 3. Categorias de produto
INSERT INTO product_categories (id, tenant_id, name) VALUES
  ('c1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Artesanato em barro'),
  ('c1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Rendas e bordados'),
  ('c1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Cordel'),
  ('c1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Acessórios'),
  ('c1000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Decoração')
ON CONFLICT (id) DO NOTHING;

-- 4. Categorias de despesas
INSERT INTO expense_categories (id, tenant_id, name) VALUES
  ('e1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Aluguel'),
  ('e1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Energia elétrica'),
  ('e1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Materiais/Insumos'),
  ('e1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Transporte'),
  ('e1000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Marketing'),
  ('e1000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Outros')
ON CONFLICT (id) DO NOTHING;

-- 5. Produtos de exemplo (sem created_by pois o usuário é criado depois)
INSERT INTO products (id, tenant_id, category_id, name, description, sku, price, cost, active, low_stock_threshold) VALUES
  ('p1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000001',
   'Pote de Barro Nordestino', 'Pote artesanal de barro pintado à mão, perfeito para decoração', 'POT-BARRO-001', 45.00, 18.00, TRUE, 3),
  ('p1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000001',
   'Escultura de Cangaceiro', 'Escultura em barro representando cangaceiro nordestino', 'ESC-CANG-001', 89.00, 32.00, TRUE, 2),
  ('p1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000001',
   'Quartinha de Barro', 'Quartinha tradicional nordestina para água fresca', 'QUAR-BARRO-001', 35.00, 12.00, TRUE, 5),
  ('p1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000002',
   'Toalha de Renda Renascença', 'Toalha de mesa artesanal em renda renascença 1,5m x 1,5m', 'TOAL-RENDA-001', 120.00, 55.00, TRUE, 3),
  ('p1000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000002',
   'Caminho de Mesa Bordado', 'Caminho de mesa com bordado filé tradicional, 40cm x 1,5m', 'CAM-BORD-001', 75.00, 28.00, TRUE, 4),
  ('p1000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000003',
   'Folheto de Cordel - O Forró', 'Literatura de cordel clássica sobre o forró nordestino', 'CORD-FORRO-001', 8.00, 2.50, TRUE, 10),
  ('p1000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000003',
   'Coleção Cordel Premium', 'Coleção com 10 folhetos de cordel encadernados', 'CORD-COL-001', 65.00, 20.00, TRUE, 3),
  ('p1000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000004',
   'Colar de Sementes', 'Colar artesanal confeccionado com sementes do nordeste', 'COLAR-SEM-001', 28.00, 8.00, TRUE, 5),
  ('p1000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000004',
   'Brincos de Palha', 'Brincos artesanais feitos com palha de carnaúba', 'BRINC-PAL-001', 22.00, 6.00, TRUE, 8),
  ('p1000000-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000005',
   'Quadro Xilogravura', 'Xilogravura original em madeira, 30x40cm', 'QUAD-XILO-001', 150.00, 60.00, TRUE, 2),
  ('p1000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000005',
   'Tapete de Crochê', 'Tapete redondo de crochê em algodão colorido, 80cm diâmetro', 'TAP-CROCH-001', 95.00, 35.00, TRUE, 3),
  ('p1000000-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', 'c1000000-0000-0000-0000-000000000001',
   'Boneco de Barro São João', 'Conjunto com casal de bonecos de barro para festa junina', 'BON-BARRO-001', 58.00, 22.00, TRUE, 4)
ON CONFLICT (id) DO NOTHING;

-- 6. Estoque inicial via inventory_balances
-- (Em produção, seriam via inventory_movements para manter auditoria)
INSERT INTO inventory_balances (tenant_id, product_id, qty) VALUES
  ('11111111-1111-1111-1111-111111111111', 'p1000000-0000-0000-0000-000000000001', 12),
  ('11111111-1111-1111-1111-111111111111', 'p1000000-0000-0000-0000-000000000002', 5),
  ('11111111-1111-1111-1111-111111111111', 'p1000000-0000-0000-0000-000000000003', 8),
  ('11111111-1111-1111-1111-111111111111', 'p1000000-0000-0000-0000-000000000004', 6),
  ('11111111-1111-1111-1111-111111111111', 'p1000000-0000-0000-0000-000000000005', 10),
  ('11111111-1111-1111-1111-111111111111', 'p1000000-0000-0000-0000-000000000006', 50),
  ('11111111-1111-1111-1111-111111111111', 'p1000000-0000-0000-0000-000000000007', 7),
  ('11111111-1111-1111-1111-111111111111', 'p1000000-0000-0000-0000-000000000008', 15),
  ('11111111-1111-1111-1111-111111111111', 'p1000000-0000-0000-0000-000000000009', 20),
  ('11111111-1111-1111-1111-111111111111', 'p1000000-0000-0000-0000-000000000010', 3),
  ('11111111-1111-1111-1111-111111111111', 'p1000000-0000-0000-0000-000000000011', 4),
  ('11111111-1111-1111-1111-111111111111', 'p1000000-0000-0000-0000-000000000012', 9)
ON CONFLICT DO NOTHING;

-- 7. Clientes de exemplo
INSERT INTO customers (id, tenant_id, name, phone, email, city, state) VALUES
  ('cu100000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Maria das Graças Silva', '(81) 99111-0001', 'maria@email.com', 'Recife', 'PE'),
  ('cu100000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'José Ferreira Neto', '(83) 99222-0002', NULL, 'João Pessoa', 'PB'),
  ('cu100000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Ana Beatriz Souza', '(85) 99333-0003', 'ana@email.com', 'Fortaleza', 'CE')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- NOTA: O usuário admin deve ser criado via Supabase Auth.
-- Após criar o usuário, execute:
--
-- INSERT INTO profiles (user_id, name) VALUES ('<USER_UUID>', 'Admin Quiosque8');
-- INSERT INTO tenant_members (tenant_id, user_id, role, active) VALUES
--   ('11111111-1111-1111-1111-111111111111', '<USER_UUID>', 'admin', TRUE);
-- ============================================================
