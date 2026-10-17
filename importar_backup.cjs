/**
 * ============================================================
 *  BAHIA PREV HUB — IMPORTAÇÃO PARA NOVO SUPABASE
 *  Lê os JSONs do backup e insere no novo banco via upsert
 * ============================================================
 *  PRÉ-REQUISITO: rodar o schema SQL no novo banco antes!
 *  (Instruções no final do arquivo)
 * ============================================================
 */

const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');
require('dotenv').config();

// ── Config ────────────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Variáveis de ambiente não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Localiza a pasta de backup mais recente ──────────────────
function findLatestBackup() {
  const dir   = __dirname;
  const dirs  = fs.readdirSync(dir).filter(f =>
    f.startsWith('backup_') && fs.statSync(path.join(dir, f)).isDirectory()
  );
  if (dirs.length === 0) throw new Error('Nenhuma pasta de backup encontrada!');
  dirs.sort().reverse(); // mais recente primeiro
  return path.join(dir, dirs[0]);
}

// ── Tabelas na ordem correta (respeita FK: posts antes de comments) ──
// conflictCol: coluna PK usada no upsert (padrão: 'id')
const TABLES = [
  { name: 'users',                          conflictCol: 'uid',  batchSize: 20  },
  { name: 'posts',                          conflictCol: 'id',   batchSize: 50  },
  { name: 'posts_comments',                 conflictCol: 'id',   batchSize: 50  },
  { name: 'user_tasks',                     conflictCol: 'id',   batchSize: 10  },
  { name: 'pops',                           conflictCol: 'id',   batchSize: 50  },
  { name: 'funeraria_os',                   conflictCol: 'id',   batchSize: 20  },
  { name: 'funeraria_satisfaction_surveys', conflictCol: 'id',   batchSize: 20  },
];

// ── Helpers ───────────────────────────────────────────────────
function pad(v) { return String(v).padStart(2, '0'); }
function formatTs() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Espera N milissegundos */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Insere em lotes com delay entre eles para evitar timeout do Supabase */
async function upsertBatch(table, rows, { conflictCol = 'id', batchSize = 20 } = {}) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: conflictCol });
    if (error) throw new Error(`Erro em ${table} (lote ${i}): ${error.message}`);
    inserted += batch.length;
    process.stdout.write(`\r  ↳ ${inserted}/${rows.length} registros...`);
    if (i + batchSize < rows.length) await sleep(300); // pausa entre lotes
  }
  return inserted;
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   BAHIA PREV HUB — IMPORTAÇÃO PARA NOVO BANCO    ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`🎯 Destino: ${SUPABASE_URL}`);

  let backupDir;
  try {
    backupDir = findLatestBackup();
    console.log(`📁 Backup: ${backupDir}`);
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }

  console.log(`🕐 Início: ${formatTs()}`);
  console.log('');

  const results = {};

  for (const { name: table, conflictCol, batchSize } of TABLES) {
    const jsonFile = path.join(backupDir, `${table}.json`);

    if (!fs.existsSync(jsonFile)) {
      console.log(`  ⚠️  ${table.padEnd(36)} arquivo não encontrado, pulando`);
      continue;
    }

    const rows = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

    if (rows.length === 0) {
      console.log(`  ⏭️  ${table.padEnd(36)} vazio, pulando`);
      results[table] = 0;
      continue;
    }

    process.stdout.write(`  📥 Importando ${table.padEnd(32)} `);

    try {
      const count = await upsertBatch(table, rows, { conflictCol, batchSize });
      process.stdout.write(`\r  ✅ ${table.padEnd(36)} ${String(count).padStart(5)} registros\n`);
      results[table] = count;
    } catch (err) {
      process.stdout.write(`\r  ❌ ${table.padEnd(36)} ERRO\n`);
      console.error(`     ${err.message}`);
      results[table] = `ERRO: ${err.message}`;
    }
  }

  const total = Object.values(results).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);

  console.log('');
  console.log('──────────────────────────────────────────────────');
  console.log(`✅  Importação concluída às ${formatTs()}`);
  console.log(`📊  Total importado: ${total} registros`);
  console.log('──────────────────────────────────────────────────');
  console.log('');
}

main().catch(err => {
  console.error('\n❌ Falha crítica:', err.message);
  process.exit(1);
});
