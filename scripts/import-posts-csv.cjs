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

async function main() {
  console.log('--- IMPORTANDO POSTAGENS REAIS DO SUPABASE ---');
  const filePath = path.join(__dirname, '../data_import/posts.csv');
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parseFullCSV(content);

  const headers = records[0].map(h => h.trim());
  console.log('Cabeçalhos:', headers);

  const posts = [];
  for (let i = 1; i < records.length; i++) {
    const vals = records[i];
    if (vals.length < headers.length) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = vals[idx] !== undefined ? vals[idx] : '';
    });

    if (!row.id || !row.id.trim()) continue;

    let dataJson = null;
    if (row.data_json && row.data_json.trim()) {
      try {
        dataJson = JSON.parse(row.data_json);
      } catch (e) {
        dataJson = null;
      }
    }

    let likedBy = [];
    if (row.liked_by && row.liked_by.trim()) {
      try {
        likedBy = JSON.parse(row.liked_by);
      } catch (e) {
        likedBy = [];
      }
    }

    posts.push({
      id: row.id.trim(),
      author_name: row.author_name || '',
      author_role: row.author_role || '',
      author_uid: row.author_uid || '',
      author_email: row.author_email || '',
      content: row.content || '',
      type: row.type || 'Geral',
      category: row.category || 'Geral',
      is_announcement: row.is_announcement === 'true',
      image_url: row.image_url || null,
      attachment_url: row.attachment_url || null,
      attachment_type: row.attachment_type || null,
      attachment_name: row.attachment_name || null,
      likes: parseInt(row.likes || '0', 10),
      likes_count: parseInt(row.likes_count || '0', 10),
      liked_by: likedBy,
      comments_count: parseInt(row.comments_count || '0', 10),
      data_json: dataJson,
      created_at_iso: row.created_at_iso || new Date().toISOString()
    });
  }

  console.log(`Total de postagens a importar: ${posts.length}`);

  for (const post of posts) {
    const { error } = await supabase.from('posts').upsert(post, { onConflict: 'id' });
    if (error) {
      console.error(`Erro no post ${post.id}:`, error.message);
    } else {
      console.log(`✓ Post importado: [${post.category}] de ${post.author_name} (${post.id})`);
    }
  }

  console.log('\n======================================================');
  console.log(`✅ ${posts.length} POSTAGENS REAIS IMPORTADAS COM SUCESSO!`);
  console.log('======================================================');
}

main().catch(err => {
  console.error('Falha:', err);
  process.exit(1);
});
