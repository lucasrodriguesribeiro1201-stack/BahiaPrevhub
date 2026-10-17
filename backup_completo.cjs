/**
 * ============================================================
 *  BAHIA PREV HUB — BACKUP COMPLETO DO BANCO DE DADOS
 *  Exporta TODAS as tabelas do Supabase Cloud para JSON e SQL
 *  Data: gerada automaticamente no nome da pasta
 * ============================================================
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ── Configuração ──────────────────────────────────────────────
const SUPABASE_URL  = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Tabelas a exportar (na ordem correta para re-importação) ──
const TABLES = [
  'users',
  'posts',
  'posts_comments',
  'user_tasks',
  'pops',
  'funeraria_os',
  'funeraria_satisfaction_surveys',
];

// ── Helpers ───────────────────────────────────────────────────
function timestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function pad(v) {
  return String(v).padStart(2, '0');
}

function formatTs() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Busca TODOS os registros de uma tabela paginando de 1000 em 1000 */
async function fetchAll(table) {
  const PAGE = 1000;
  let rows = [];
  let from  = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`Erro ao buscar ${table}: ${error.message}`);
    if (!data || data.length === 0) break;

    rows = rows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

/** Escapa string para SQL */
function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

/** Gera INSERT SQL para uma tabela */
function generateInserts(table, rows) {
  if (rows.length === 0) return `-- Tabela ${table}: sem registros\n`;

  const lines = [`-- ── ${table} (${rows.length} registros) ──`];
  lines.push(`TRUNCATE TABLE public.${table} CASCADE;`);

  for (const row of rows) {
    const cols = Object.keys(row).map(c => `"${c}"`).join(', ');
    const vals = Object.values(row).map(sqlEscape).join(', ');
    lines.push(`INSERT INTO public.${table} (${cols}) VALUES (${vals});`);
  }
  lines.push('');
  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  const ts        = timestamp();
  const backupDir = path.join(__dirname, `backup_${ts}`);
  fs.mkdirSync(backupDir, { recursive: true });

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║    BAHIA PREV HUB — BACKUP DO BANCO DE DADOS     ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`📁 Pasta: ${backupDir}`);
  console.log(`🕐 Início: ${formatTs()}`);
  console.log('');

  const summary = { gerado_em: formatTs(), tabelas: {} };
  const sqlParts = [
    '-- ============================================================',
    `-- BAHIA PREV HUB — BACKUP COMPLETO`,
    `-- Gerado em: ${formatTs()}`,
    `-- Supabase: ${SUPABASE_URL}`,
    '-- ============================================================',
    '',
    'BEGIN;',
    '',
  ];

  for (const table of TABLES) {
    process.stdout.write(`  📦 Exportando ${table.padEnd(34)} `);

    try {
      const rows = await fetchAll(table);

      // Salva JSON individual
      const jsonPath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), 'utf8');

      // Acumula SQL
      sqlParts.push(generateInserts(table, rows));

      summary.tabelas[table] = { registros: rows.length, arquivo: `${table}.json` };
      console.log(`✅ ${rows.length.toString().padStart(6)} registros`);
    } catch (err) {
      console.log(`❌ ERRO`);
      console.error(`     ${err.message}`);
      summary.tabelas[table] = { registros: 0, erro: err.message };
    }
  }

  sqlParts.push('COMMIT;');

  // Salva arquivo SQL unificado
  const sqlPath = path.join(backupDir, 'backup_completo.sql');
  fs.writeFileSync(sqlPath, sqlParts.join('\n'), 'utf8');

  // Salva resumo JSON
  const summaryPath = path.join(backupDir, 'resumo.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

  // Totais
  const total = Object.values(summary.tabelas).reduce((s, t) => s + (t.registros || 0), 0);

  console.log('');
  console.log('──────────────────────────────────────────────────');
  console.log(`✅  Backup concluído às ${formatTs()}`);
  console.log(`📊  Total de registros exportados: ${total}`);
  console.log('');
  console.log('📂 Arquivos gerados:');
  console.log(`   • backup_completo.sql  → Re-importação completa (SQL)`);
  for (const t of TABLES) {
    const info = summary.tabelas[t];
    if (info) console.log(`   • ${t}.json`.padEnd(45) + `(${info.registros || 0} registros)`);
  }
  console.log(`   • resumo.json          → Sumário do backup`);
  console.log('──────────────────────────────────────────────────');
  console.log('');
}

main().catch(err => {
  console.error('\n❌ Falha crítica no backup:', err.message);
  process.exit(1);
});
