import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SUPABASE_URL = "https://qxkxttfgzkccdkvvlldi.supabase.co";
const SUPABASE_KEY = "sb_publishable_qoWrYWM-0Q-dHR53fOhZ8w_it8rymzd";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Simples CSV parser para suportar aspas e quebras de linha
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentVal);
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal);
    rows.push(currentRow);
  }
  return rows;
}

async function importUsers() {
  console.log('--- Importando Usuários (data_import/users.csv) ---');
  const filePath = path.resolve('data_import', 'users.csv');
  if (!fs.existsSync(filePath)) {
    console.log('Arquivo users.csv não encontrado.');
    return;
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const [headers, ...rows] = parseCSV(raw);

  const records = rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (val === '') val = null;
      obj[h.trim()] = val;
    });
    return obj;
  }).filter(r => r.uid && r.email);

  console.log(`Encontrados ${records.length} usuários.`);
  for (const u of records) {
    const { error } = await supabase.from('users').upsert(u, { onConflict: 'uid' });
    if (error) console.error(`Erro ao importar usuário ${u.name}:`, error.message);
    else console.log(`✓ Usuário importado: ${u.name} (${u.email})`);
  }
}

async function importPosts() {
  console.log('\n--- Importando Posts (data_import/posts.csv) ---');
  const filePath = path.resolve('data_import', 'posts.csv');
  if (!fs.existsSync(filePath)) {
    console.log('Arquivo posts.csv não encontrado.');
    return;
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const [headers, ...rows] = parseCSV(raw);

  const records = rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (val === '') val = null;
      if (['likes', 'likes_count', 'comments_count'].includes(h.trim()) && val !== null) {
        val = parseInt(val, 10) || 0;
      }
      if (['liked_by', 'data_json'].includes(h.trim()) && val) {
        try {
          val = JSON.parse(val);
        } catch {}
      }
      obj[h.trim()] = val;
    });
    return obj;
  }).filter(r => r.id);

  console.log(`Encontrados ${records.length} posts.`);
  for (const p of records) {
    const { error } = await supabase.from('posts').upsert(p, { onConflict: 'id' });
    if (error) console.error(`Erro ao importar post ${p.id}:`, error.message);
    else console.log(`✓ Post importado: ${p.id}`);
  }
}

async function importPostComments() {
  console.log('\n--- Importando Comentários (data_import/posts_comments.csv) ---');
  const filePath = path.resolve('data_import', 'posts_comments.csv');
  if (!fs.existsSync(filePath)) {
    console.log('Arquivo posts_comments.csv não encontrado.');
    return;
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const [headers, ...rows] = parseCSV(raw);

  const records = rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val === '') val = null;
      obj[h.trim()] = val;
    });
    return obj;
  }).filter(r => r.id);

  console.log(`Encontrados ${records.length} comentários.`);
  for (const c of records) {
    const { error } = await supabase.from('posts_comments').upsert(c, { onConflict: 'id' });
    if (error) console.error(`Erro ao importar comentário ${c.id}:`, error.message);
    else console.log(`✓ Comentário importado: ${c.id}`);
  }
}

async function importUserTasks() {
  console.log('\n--- Importando Tarefas (user_tasks_rows.csv) ---');
  const filePath = path.resolve('user_tasks_rows.csv');
  if (!fs.existsSync(filePath)) {
    console.log('Arquivo user_tasks_rows.csv não encontrado.');
    return;
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const [headers, ...rows] = parseCSV(raw);

  const records = rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (val === '') val = null;
      if (h.trim() === 'data_json' && val) {
        try {
          val = JSON.parse(val);
        } catch {}
      }
      obj[h.trim()] = val;
    });
    return obj;
  }).filter(r => r.id && r.title);

  console.log(`Encontradas ${records.length} tarefas.`);
  // Inserir em lotes de 20 para não sobrecarregar
  for (let i = 0; i < records.length; i += 20) {
    const batch = records.slice(i, i + 20);
    const { error } = await supabase.from('user_tasks').upsert(batch, { onConflict: 'id' });
    if (error) console.error(`Erro ao importar lote de tarefas (${i} a ${i + batch.length}):`, error.message);
    else console.log(`✓ Lote de tarefas ${i + 1} a ${Math.min(i + 20, records.length)} importado com sucesso!`);
  }
}

async function run() {
  console.log('=== INICIANDO MIGRAÇÃO DE DADOS PARA O NOVO SUPABASE ===');
  await importUsers();
  await importPosts();
  await importPostComments();
  await importUserTasks();
  console.log('\n=== MIGRAÇÃO CONCLUÍDA COM SUCESSO! ===');
}

run().catch(console.error);
