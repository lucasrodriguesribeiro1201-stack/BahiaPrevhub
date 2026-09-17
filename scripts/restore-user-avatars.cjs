const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const csvPath = path.join(__dirname, '../data_import/users.csv');
const content = fs.readFileSync(csvPath, 'utf-8');

function parseCSV(text) {
  const records = [];
  let row = [];
  let entry = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') { entry += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      row.push(entry);
      entry = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      row.push(entry);
      entry = '';
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) records.push(row);
      row = [];
    } else {
      entry += c;
    }
  }
  if (entry || row.length > 0) { row.push(entry); records.push(row); }
  return records;
}

async function main() {
  console.log('--- RESTAURANDO FOTOS DE PERFIL DOS USUÁRIOS ---');
  const records = parseCSV(content);
  const headers = records[0].map(h => h.trim());

  let updatedCount = 0;
  const avatarMap = {};

  for (let i = 1; i < records.length; i++) {
    const row = {};
    headers.forEach((h, idx) => { row[h] = records[i][idx]; });

    if (row.uid && row.avatar_url && row.avatar_url.trim()) {
      avatarMap[row.uid] = row.avatar_url.trim();
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: row.avatar_url.trim() })
        .eq('uid', row.uid);

      if (error) {
        console.error(`Erro ao atualizar avatar de ${row.name}:`, error.message);
      } else {
        console.log(`✓ Foto restaurada para: ${row.name} (${row.role}) [Tamanho: ${(row.avatar_url.length / 1024).toFixed(1)} KB]`);
        updatedCount++;
      }
    }
  }

  // Também atualizar o sys_users_registry em user_tasks para manter sincronizado
  const { data: sysTask } = await supabase
    .from('user_tasks')
    .select('raw_payload')
    .eq('id', 'sys_users_registry')
    .single();

  if (sysTask && sysTask.raw_payload) {
    let registry = typeof sysTask.raw_payload === 'string' ? JSON.parse(sysTask.raw_payload) : sysTask.raw_payload;
    if (registry && Array.isArray(registry.users)) {
      registry.users = registry.users.map(u => {
        if (avatarMap[u.uid]) {
          return { ...u, avatarUrl: avatarMap[u.uid] };
        }
        return u;
      });

      const { error: regErr } = await supabase
        .from('user_tasks')
        .update({ raw_payload: registry })
        .eq('id', 'sys_users_registry');

      if (!regErr) {
        console.log('✓ sys_users_registry atualizado com as novas fotos de perfil!');
      } else {
        console.error('Erro ao atualizar sys_users_registry:', regErr.message);
      }
    }
  }

  console.log('\n======================================================');
  console.log(`✅ ${updatedCount} FOTOS DE PERFIL RESTAURADAS COM SUCESSO!`);
  console.log('======================================================');
}

main().catch(err => {
  console.error('Falha:', err);
  process.exit(1);
});
