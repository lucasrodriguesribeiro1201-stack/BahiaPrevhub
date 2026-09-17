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
  console.log('--- LENDO ARQUIVO user_tasks_rows.csv (22MB) ---');
  const filePath = path.join(__dirname, '../user_tasks_rows.csv');
  if (!fs.existsSync(filePath)) {
    console.error('Arquivo user_tasks_rows.csv não encontrado no diretório raiz!');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  console.log('Conteúdo carregado. Iniciando análise sintática do CSV...');

  const records = parseFullCSV(fileContent);
  if (records.length < 2) {
    console.error('Nenhum registro encontrado no CSV.');
    process.exit(1);
  }

  const headers = records[0].map(h => h.trim());
  console.log('Cabeçalhos identificados:', headers);

  const parsedRows = [];
  for (let i = 1; i < records.length; i++) {
    const vals = records[i];
    if (vals.length < headers.length) {
      // Linha vazia ou truncada
      continue;
    }

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
        dataJson = row.data_json;
      }
    }

    let completedVal = false;
    if (row.completed === 'true' || row.completed === 't' || row.completed === '1' || row.status === 'concluida') {
      completedVal = true;
    }

    parsedRows.push({
      id: row.id.trim(),
      title: row.title || 'Sem título',
      description: row.description || '',
      category: row.category || 'Geral',
      assigned_to: row.assigned_to || '',
      priority: row.priority || 'media',
      status: row.status || 'pendente',
      due_date: row.due_date || '',
      completed: completedVal,
      created_by: row.created_by || '',
      data_json: dataJson,
      created_at_iso: row.created_at_iso || new Date().toISOString()
    });
  }

  console.log(`Total de tarefas reais extraídas do CSV: ${parsedRows.length}`);

  // Inserir em lotes de 10 para suportar grandes anexos base64 sem timeout de payload
  const BATCH_SIZE = 10;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
    const batch = parsedRows.slice(i, i + BATCH_SIZE);
    
    // Tenta upsert em lote
    const { error } = await supabase.from('user_tasks').upsert(batch, { onConflict: 'id' });

    if (error) {
      console.warn(`Lote ${i / BATCH_SIZE + 1} falhou no upsert em lote (${error.message}). Tentando individualmente...`);
      for (const item of batch) {
        const { error: singleErr } = await supabase.from('user_tasks').upsert(item, { onConflict: 'id' });
        if (singleErr) {
          console.error(`  Erro na tarefa ${item.id} (${item.title}):`, singleErr.message);
          errorCount++;
        } else {
          successCount++;
        }
      }
    } else {
      successCount += batch.length;
      console.log(`✓ Lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(parsedRows.length / BATCH_SIZE)} importado (${successCount}/${parsedRows.length})`);
    }
  }

  console.log('\n======================================================');
  console.log(`✅ IMPORTAÇÃO CONCLUÍDA! Sucesso: ${successCount} tarefas | Falhas: ${errorCount}`);
  console.log('======================================================');
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
