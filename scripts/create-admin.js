const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey || serviceRoleKey.includes('your-service-role')) {
  console.error('❌ Erro: Você ainda não configurou as chaves no seu .env.local.');
  console.error('Substitua "your-anon-key-here" e "your-service-role-key-here" pelas chaves do seu Supabase.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setupAdmin() {
  console.log('🚀 Iniciando criação do usuário admin...');

  const email = 'admin@quiosque8.com';
  const password = 'admin123456';

  // 1. Criar o usuário no Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  let userId;

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log('ℹ️ O usuário admin@quiosque8.com já existe no Auth.');
      // Buscar o ID do usuário existente
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('❌ Erro ao listar usuários:', listError.message);
        return;
      }
      const existingUser = usersData.users.find(u => u.email === email);
      if (!existingUser) {
        console.error('❌ Não foi possível encontrar o ID do usuário existente.');
        return;
      }
      userId = existingUser.id;
    } else {
      console.error('❌ Erro ao criar usuário no Auth:', authError.message);
      return;
    }
  } else {
    userId = authData?.user?.id;
  }

  if (!userId) {
    console.error('❌ Erro: ID do usuário não encontrado.');
    return;
  }

  console.log(`✅ Usuário Auth OK (ID: ${userId})`);

  // 2. Criar perfil
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ 
      user_id: userId, 
      name: 'Admin Quiosque8' 
    });

  if (profileError) {
    console.error('❌ Erro ao criar perfil:', profileError.message);
  } else {
    console.log('✅ Perfil criado/atualizado.');
  }

  // 3. Vincular ao Tenant (ID padrão do seed)
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const { error: memberError } = await supabase
    .from('tenant_members')
    .upsert({
      tenant_id: tenantId,
      user_id: userId,
      role: 'admin',
      active: true
    });

  if (memberError) {
    console.error('❌ Erro ao vincular ao tenant:', memberError.message);
  } else {
    console.log('✅ Vinculado ao tenant como admin.');
  }

  console.log('\n✨ Tudo pronto! Agora você já pode fazer login com:');
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Senha: ${password}`);
}

setupAdmin().catch(err => {
  console.error('❌ Erro inesperado:', err);
});
