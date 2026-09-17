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
  console.log('--- IMPORTANDO COMENTÁRIOS DOS POSTS REAIS DO SUPABASE ---');
  const filePath = path.join(__dirname, '../data_import/posts_comments.csv');
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parseFullCSV(content);

  const headers = records[0].map(h => h.trim());
  console.log('Cabeçalhos:', headers);

  const comments = [];
  for (let i = 1; i < records.length; i++) {
    const vals = records[i];
    if (vals.length < headers.length) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = vals[idx] !== undefined ? vals[idx] : '';
    });

    if (!row.id || !row.id.trim()) continue;

    comments.push({
      id: row.id.trim(),
      post_id: row.post_id ? row.post_id.trim() : null,
      author_uid: row.author_uid ? row.author_uid.trim() : null,
      author_name: row.author_name ? row.author_name.trim() : '',
      author_role: row.author_role ? row.author_role.trim() : '',
      content: row.content || '',
      created_at_iso: row.created_at_iso ? row.created_at_iso.trim() : new Date().toISOString()
    });
  }

  console.log(`Total de comentários a importar: ${comments.length}`);

  for (const comm of comments) {
    const { error } = await supabase.from('posts_comments').upsert(comm, { onConflict: 'id' });
    if (error) {
      console.error(`Erro no comentário ${comm.id}:`, error.message);
    } else {
      console.log(`✓ Comentário importado: [Post: ${comm.post_id}] de ${comm.author_name} - "${comm.content}" (${comm.id})`);
    }
  }

  // Atualizar comments_count nos posts correspondentes
  const postIds = [...new Set(comments.map(c => c.post_id).filter(Boolean))];
  for (const postId of postIds) {
    const { count, error } = await supabase
      .from('posts_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (!error) {
      await supabase.from('posts').update({ comments_count: count }).eq('id', postId);
      console.log(`✓ Post ${postId} comments_count sincronizado para ${count}`);
    }
  }

  console.log('\n======================================================');
  console.log(`✅ ${comments.length} COMENTÁRIOS REAIS IMPORTADOS COM SUCESSO!`);
  console.log('======================================================');
}

main().catch(err => {
  console.error('Falha:', err);
  process.exit(1);
});
