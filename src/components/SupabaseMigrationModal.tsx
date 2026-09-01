import { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  X, 
  Copy, 
  Check, 
  Server, 
  Key, 
  ExternalLink, 
  RefreshCw, 
  Terminal, 
  ShieldCheck, 
  AlertCircle,
  Code,
  Download,
  UploadCloud
} from 'lucide-react';
import { 
  getSupabaseCredentials, 
  saveSupabaseCredentials, 
  testSupabaseConnection, 
  resetSupabaseClient,
  SUPABASE_SQL_SCHEMA 
} from '../lib/supabase';

interface SupabaseMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupabaseMigrationModal({ isOpen, onClose }: SupabaseMigrationModalProps) {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [status, setStatus] = useState<{ loading: boolean; success?: boolean; message?: string }>({ loading: false });
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'sql' | 'guide' | 'backup'>('config');

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setSupabaseUrl(creds.url);
      setSupabaseKey(creds.key);

      if (creds.url && creds.key) {
        handleTestConnection(creds.url, creds.key);
      }
    }
  }, [isOpen]);

  const handleTestConnection = async (urlToTest?: string, keyToTest?: string) => {
    const url = urlToTest || supabaseUrl;
    const key = keyToTest || supabaseKey;

    setStatus({ loading: true });
    resetSupabaseClient();

    const res = await testSupabaseConnection(url, key);
    setStatus({
      loading: false,
      success: res.success,
      message: res.message
    });
  };

  const handleSave = async () => {
    saveSupabaseCredentials(supabaseUrl, supabaseKey);
    resetSupabaseClient();
    await handleTestConnection(supabaseUrl, supabaseKey);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };



  const handleDownloadBackupJson = () => {
    const backupData = {
      tasks: JSON.parse(localStorage.getItem('tasks_v2_global') || '[]'),
      orders: JSON.parse(localStorage.getItem('funeraria_os_v1') || '[]'),
      surveys: JSON.parse(localStorage.getItem('funeraria_satisfaction_surveys_v1') || '[]'),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_sistema_bahiaprev_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white p-6 sm:p-8 flex items-center justify-between relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <Database className="h-64 w-64 text-white" />
          </div>

          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Database className="h-3 w-3 text-emerald-400" />
                Painel de Migração de Banco de Dados
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Integração & Migração para Supabase</span>
            </h2>
            <p className="text-xs text-emerald-100/80 max-w-xl">
              Migre e sincronize seus dados da funerária com um banco de dados relacional PostgreSQL de altíssimo desempenho no Supabase.
            </p>
          </div>

          <button
            onClick={onClose}
            className="relative z-10 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-2.5 px-4 font-bold text-xs rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'config'
                ? 'bg-white border-t-2 border-emerald-600 text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="h-4 w-4 text-emerald-600" />
            <span>1. Credenciais & Conexão</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`py-2.5 px-4 font-bold text-xs rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'sql'
                ? 'bg-white border-t-2 border-emerald-600 text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code className="h-4 w-4 text-emerald-600" />
            <span>2. Script SQL (Tabelas)</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`py-2.5 px-4 font-bold text-xs rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'guide'
                ? 'bg-white border-t-2 border-emerald-600 text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="h-4 w-4 text-emerald-600" />
            <span>3. Passo a Passo</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`py-2.5 px-4 font-bold text-xs rounded-t-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'backup'
                ? 'bg-white border-t-2 border-emerald-600 text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>4. Backup & Exportar</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* TAB 1: CREDENCIAIS & CONEXÃO */}
          {activeTab === 'config' && (
            <div className="space-y-6">

              {/* Status Banner */}
              <div className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
                status.loading 
                  ? 'bg-slate-50 border-slate-200 text-slate-700' 
                  : status.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}>
                {status.loading ? (
                  <RefreshCw className="h-5 w-5 text-emerald-600 animate-spin shrink-0 mt-0.5" />
                ) : status.success ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                )}

                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    {status.loading 
                      ? 'Testando conexão...' 
                      : status.success 
                      ? 'Supabase Conectado!' 
                      : 'Aguardando Configuração do Supabase'}
                  </h4>
                  <p className="text-xs leading-relaxed opacity-90">
                    {status.message || 'Insira a URL e a Anon Key do seu projeto Supabase abaixo para conectar.'}
                  </p>
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Server className="h-3.5 w-3.5 text-emerald-600" />
                      URL do Projeto Supabase (Project URL)
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">ex: https://xyz.supabase.co</span>
                  </label>
                  <input
                    type="url"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://sua-instancia.supabase.co"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-emerald-600" />
                      Chave Pública Anônima (Anon / Public Key)
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">eyJhbGciOi...</span>
                  </label>
                  <input
                    type="password"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR..."
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Abrir Dashboard Supabase</span>
                </a>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleTestConnection()}
                    disabled={status.loading || !supabaseUrl || !supabaseKey}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${status.loading ? 'animate-spin' : ''}`} />
                    <span>Testar Conexão</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={status.loading || !supabaseUrl || !supabaseKey}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Salvar Configuração</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCRIPT SQL SCHEMA */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-100 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Script SQL DDL para criação das tabelas</h4>
                  <p className="text-[11px] text-slate-500">
                    Copie o código abaixo, abra o <strong>SQL Editor</strong> no Supabase e clique em <strong>RUN</strong>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-200" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copiar SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-4">
                <pre className="text-[11px] font-mono text-emerald-300 leading-relaxed overflow-x-auto max-h-80 select-all p-2">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: PASSO A PASSO */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-600">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 space-y-2">
                <h4 className="font-extrabold text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Como migrar e usar o Supabase em 3 passos:</span>
                </h4>
                <p className="text-xs leading-relaxed">
                  O Supabase é um banco de dados relacional (PostgreSQL) seguro, rápido e com backups automáticos em nuvem.
                </p>
              </div>

              <ol className="space-y-3 pl-2">
                <li className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="h-6 w-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div>
                    <strong className="text-slate-900 block font-bold">Crie uma conta gratuita e um Projeto no Supabase:</strong>
                    <span>Acesse <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-semibold">supabase.com</a>, clique em "New Project", escolha um nome e uma senha.</span>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="h-6 w-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div>
                    <strong className="text-slate-900 block font-bold">Execute o Script SQL no Supabase:</strong>
                    <span>Vá na aba <strong>SQL Editor</strong> no Supabase, clique em "New Query", cole o código da aba "2. Script SQL" e clique em <strong>RUN</strong> para criar as 7 tabelas do sistema.</span>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="h-6 w-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div>
                    <strong className="text-slate-900 block font-bold">Copie a URL e a Anon Key:</strong>
                    <span>Em <strong>Project Settings &gt; API</strong> no Supabase, copie a <strong>Project URL</strong> e a <strong>anon / public key</strong> e cole na aba "1. Credenciais" deste aplicativo.</span>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {/* TAB 4: BACKUP & EXPORTAR DADOS */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 space-y-2">
                <h4 className="font-extrabold text-sm flex items-center gap-2">
                  <Download className="h-5 w-5 text-emerald-600" />
                  <span>Backup & Exportação de Dados</span>
                </h4>
                <p className="text-xs leading-relaxed opacity-90">
                  Faça o download de uma cópia de segurança completa de todas as tarefas, Ordens de Serviço (OS) e pesquisas salvas no sistema em formato JSON para arquivamento local seguro.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                  <h5 className="font-extrabold text-xs text-slate-800">Exportar Backup Completo</h5>
                  <p className="text-[11px] text-slate-500">Gera um arquivo .json estruturado com todo o banco de dados.</p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadBackupJson}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Baixar Backup JSON</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Suporta sincronização relacional e modo híbrido com fallback
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
