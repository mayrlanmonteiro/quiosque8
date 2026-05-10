-- ============================================================
-- Migration 004: Storage Buckets e Policies
-- ============================================================

-- Bucket para imagens de produtos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  FALSE,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket para assets do tenant (logo etc)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-assets',
  'tenant-assets',
  FALSE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE POLICIES: product-images
-- Path esperado: {tenant_id}/{product_id}/{filename}
-- ============================================================

DROP POLICY IF EXISTS "Membro lê imagens de produto" ON storage.objects;
CREATE POLICY "Membro lê imagens de produto" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'product-images'
    AND is_tenant_member((storage.foldername(name))[1]::UUID)
  );

DROP POLICY IF EXISTS "Admin/Gerente faz upload de imagens" ON storage.objects;
CREATE POLICY "Admin/Gerente faz upload de imagens" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND tenant_role((storage.foldername(name))[1]::UUID) IN ('admin', 'gerente')
  );

DROP POLICY IF EXISTS "Admin/Gerente deleta imagens" ON storage.objects;
CREATE POLICY "Admin/Gerente deleta imagens" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images'
    AND tenant_role((storage.foldername(name))[1]::UUID) IN ('admin', 'gerente')
  );

-- ============================================================
-- STORAGE POLICIES: tenant-assets
-- Path esperado: {tenant_id}/{filename}
-- ============================================================

DROP POLICY IF EXISTS "Membro lê assets do tenant" ON storage.objects;
CREATE POLICY "Membro lê assets do tenant" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'tenant-assets'
    AND is_tenant_member((storage.foldername(name))[1]::UUID)
  );

DROP POLICY IF EXISTS "Admin faz upload de assets" ON storage.objects;
CREATE POLICY "Admin faz upload de assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tenant-assets'
    AND tenant_role((storage.foldername(name))[1]::UUID) = 'admin'
  );

DROP POLICY IF EXISTS "Admin deleta assets" ON storage.objects;
CREATE POLICY "Admin deleta assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tenant-assets'
    AND tenant_role((storage.foldername(name))[1]::UUID) = 'admin'
  );
