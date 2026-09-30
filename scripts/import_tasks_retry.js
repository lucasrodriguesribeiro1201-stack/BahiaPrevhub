import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = "https://qxkxttfgzkccdkvvlldi.supabase.co";
const SUPABASE_KEY = "sb_publishable_qoWrYWM-0Q-dHR53fOhZ8w_it8rymzd";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

async function importRemainingTasks() {
  const filePath = path.resolve('user_tasks_rows.csv');
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

  console.log(`Reenviando tarefas individualmente para garantir 100% de sucesso... Total: ${records.length}`);
  let successCount = 0;
  for (const t of records) {
    const { error } = await supabase.from('user_tasks').upsert(t, { onConflict: 'id' });
    if (error) {
      console.error(`Erro na tarefa ${t.title}:`, error.message);
    } else {
      successCount++;
    }
  }
  console.log(`✓ ${successCount} de ${records.length} tarefas salvas com sucesso no Supabase!`);
}

importRemainingTasks().catch(console.error);
