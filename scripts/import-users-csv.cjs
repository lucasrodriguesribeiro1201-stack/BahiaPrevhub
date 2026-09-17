const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseFullCSV(text) {
  const records = [];
  let row = [];
  let entry = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        entry += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(entry);
      entry = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      row.push(entry);
      entry = '';
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        records.push(row);
      }
      row = [];
    } else {
      entry += c;
    }
  }

  if (entry || row.length > 0) {
    row.push(entry);
    records.push(row);
  }

  return records;
}

async function importUsers() {
  console.log('--- IMPORTANDO TODOS OS USUÁRIOS REAIS DO SUPABASE (COM PARSER MULTILINHA) ---');
  const csvPath = path.join(__dirname, '../data_import/users.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = parseFullCSV(content);

  const headers = records[0];
  console.log('Colunas encontradas:', headers);

  const parsedUsers = [];

  for (let i = 1; i < records.length; i++) {
    const values = records[i];
    if (values.length < headers.length) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx].trim() : '';
    });

    const userObj = {
      uid: row.uid,
      name: row.name,
      email: row.email,
      role: row.role,
      unit: row.unit || null,
      phone: row.phone || null,
      avatar_url: row.avatar_url || null,
      can_post_feed: row.can_post_feed === 'true',
      can_create_tasks: row.can_create_tasks === 'true',
      can_access_funeraria: row.can_access_funeraria === 'true',
      is_online: row.is_online === 'true',
      last_seen: row.last_seen || new Date().toISOString()
    };

    parsedUsers.push(userObj);
  }

  console.log(`Total de usuários reais detectados: ${parsedUsers.length}`);

  // Limpar tabela users
  await supabase.from('users').delete().neq('uid', '___never___');

  // Inserir cada usuário
  for (const u of parsedUsers) {
    const { error } = await supabase.from('users').upsert(u, { onConflict: 'uid' });
    if (error) {
      console.error(`Erro ao inserir ${u.name} (${u.email}):`, error.message);
    } else {
      console.log(`✓ [${u.role}] ${u.name} (${u.email}) - Foto: ${u.avatar_url ? 'SIM' : 'NÃO'}`);
    }
  }

  // Atualizar sys_users_registry em user_tasks
  const registryPayload = {
    users: parsedUsers.map(u => ({
      uid: u.uid,
      name: u.name,
      email: u.email,
      role: u.role,
      unit: u.unit,
      phone: u.phone,
      avatarUrl: u.avatar_url,
      canPostFeed: u.can_post_feed,
      canCreateTasks: u.can_create_tasks,
      canAccessFuneraria: u.can_access_funeraria,
      createdAt: '2026-07-01T00:00:00.000Z'
    })),
    deletedEmails: [],
    deletedUids: []
  };

  await supabase.from('user_tasks').upsert({
    id: 'sys_users_registry',
    title: '__SYS_USERS_REGISTRY__',
    description: JSON.stringify(registryPayload),
    data_json: registryPayload,
    category: 'System',
    assigned_to: 'system',
    status: 'concluida',
    completed: true,
    created_by: 'system',
    created_at_iso: new Date().toISOString()
  }, { onConflict: 'id' });

  // Atualizar sys_team_roles_config em user_tasks
  const rolesPayload = {};
  parsedUsers.forEach(u => {
    if (u.email) {
      rolesPayload[u.email.toLowerCase()] = u.role;
    }
  });

  await supabase.from('user_tasks').upsert({
    id: 'sys_team_roles_config',
    title: '__SYS_ROLES_CONFIG__',
    description: JSON.stringify(rolesPayload),
    data_json: rolesPayload,
    category: 'System',
    assigned_to: 'system',
    status: 'concluida',
    completed: true,
    created_by: 'system',
    created_at_iso: new Date().toISOString()
  }, { onConflict: 'id' });

  console.log('\n======================================================');
  console.log(`✅ ${parsedUsers.length} USUÁRIOS REAIS IMPORTADOS COM SUCESSO!`);
  console.log('======================================================');
}

importUsers().catch(err => {
  console.error('Falha:', err);
  process.exit(1);
});
