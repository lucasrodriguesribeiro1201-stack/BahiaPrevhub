import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get credentials from VITE_ env or localStorage fallback or BahiaPrev defaults
export function getSupabaseCredentials(): { url: string; key: string } {
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '';
  const envKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : '';
  const localUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('supabase_url') : '';
  const localKey = typeof localStorage !== 'undefined' ? localStorage.getItem('supabase_anon_key') : '';

  let url = envUrl || localUrl || 'https://kualifdkjmpfzhsofvxc.supabase.co';
  let key = envKey || localKey || 'sb_publishable_AaQz8IBv0mNF0yJaMpcryg_8POenBSS';

  // Sanitize URL if user typed /rest/v1/ or trailing slash
  if (url) {
    url = url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  }
  if (key) {
    key = key.trim();
  }

  return { url, key };
}

export function saveSupabaseCredentials(url: string, key: string) {
  const cleanUrl = url ? url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '') : '';
  const cleanKey = key ? key.trim() : '';

  if (typeof localStorage !== 'undefined') {
    if (cleanUrl) localStorage.setItem('supabase_url', cleanUrl);
    else localStorage.removeItem('supabase_url');

    if (cleanKey) localStorage.setItem('supabase_anon_key', cleanKey);
    else localStorage.removeItem('supabase_anon_key');
  }
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key || url === 'https://your-supabase-project.supabase.co' || url.includes('your-supabase-project')) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key);
    } catch (err) {
      console.error('Erro ao inicializar cliente Supabase:', err);
      return null;
    }
  }
  return supabaseInstance;
}

export function resetSupabaseClient() {
  supabaseInstance = null;
}

export async function testSupabaseConnection(url?: string, key?: string): Promise<{ success: boolean; message: string }> {
  let targetUrl = url ? url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '') : getSupabaseCredentials().url;
  let targetKey = key ? key.trim() : getSupabaseCredentials().key;

  if (!targetUrl || !targetKey) {
    return { success: false, message: 'URL e Anon Key do Supabase são obrigatórios.' };
  }

  try {
    const tempClient = createClient(targetUrl, targetKey);
    // Simple fetch or RPC check
    const { error } = await tempClient.from('funeraria_os').select('id').limit(1);
    
    if (error && error.code !== 'PGRST116' && !error.message.includes('relation "public.funeraria_os" does not exist')) {
      return { success: false, message: `Erro no Supabase: ${error.message}` };
    }

    return { 
      success: true, 
      message: error?.message.includes('does not exist')
        ? 'Conectado ao Supabase com sucesso! (Atenção: Crie as tabelas executando o script SQL fornecido)'
        : 'Conexão com o Supabase estabelecida com sucesso e tabelas detectadas!' 
    };
  } catch (err: any) {
    return { success: false, message: `Falha na conexão: ${err.message || 'Verifique as credenciais.'}` };
  }
}

// SQL Script ready to copy and paste into Supabase SQL Editor
export const SUPABASE_SQL_SCHEMA = `-- ============================================================
-- SCRIPT DE CRIAÇÃO DAS TABELAS NO SUPABASE (MIGRAÇÃO BAHIA PREV)
-- Cole este código no SQL Editor do seu Dashboard Supabase e clique em RUN
-- ============================================================

-- 1. Tabela de Ordens de Serviço (OS Funeral)
CREATE TABLE IF NOT EXISTS public.funeraria_os (
  id TEXT PRIMARY KEY,
  os_number TEXT NOT NULL,
  status TEXT DEFAULT 'Aberto',
  prioridade TEXT DEFAULT 'Normal',
  responsavel_name TEXT,
  responsavel_email TEXT,
  responsavel_uid TEXT,
  atendente_name TEXT,
  unidade_atendimento TEXT,
  form_data JSONB,
  checklist JSONB,
  timeline JSONB,
  agentes_acompanhamento JSONB,
  photos JSONB,
  audio_memos JSONB,
  created_at_iso TIMESTAMPTZ DEFAULT NOW(),
  date_formatted TEXT,
  time_formatted TEXT,
  updated_at_iso TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Pesquisas de Satisfação
CREATE TABLE IF NOT EXISTS public.funeraria_satisfaction_surveys (
  id TEXT PRIMARY KEY,
  os_number TEXT,
  falecido_nome TEXT,
  familiar_nome TEXT,
  familiar_telefone TEXT,
  atendente_nome TEXT,
  agente_nome TEXT,
  data_atendimento TEXT,
  status_pesquisa TEXT DEFAULT 'Pendente',
  nps_score INTEGER DEFAULT 10,
  avaliacao_atendimento INTEGER DEFAULT 5,
  avaliacao_remocao INTEGER DEFAULT 5,
  avaliacao_velorio INTEGER DEFAULT 5,
  avaliacao_geral INTEGER DEFAULT 5,
  observacoes_familiar TEXT,
  pontos_melhoria TEXT,
  entrevistador_nome TEXT,
  data_pesquisa_realizada TEXT,
  created_at_iso TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Tarefas e Metas (User Tasks)
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  assigned_to TEXT,
  priority TEXT DEFAULT 'Media',
  status TEXT DEFAULT 'pendente',
  due_date TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_by TEXT,
  data_json JSONB,
  created_at_iso TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de POPs (Procedimentos Operacionais Padrão)
CREATE TABLE IF NOT EXISTS public.pops (
  id TEXT PRIMARY KEY,
  codigo TEXT,
  titulo TEXT NOT NULL,
  categoria TEXT,
  versao TEXT,
  conteudo TEXT,
  autor TEXT,
  data_atualizacao TEXT,
  created_at_iso TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Posts do Feed / Mural
CREATE TABLE IF NOT EXISTS public.posts (
  id TEXT PRIMARY KEY,
  author_name TEXT,
  author_role TEXT,
  author_uid TEXT,
  author_email TEXT,
  content TEXT,
  type TEXT DEFAULT 'comunicado',
  category TEXT DEFAULT 'Geral',
  is_announcement BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  attachment_name TEXT,
  likes INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  liked_by JSONB DEFAULT '[]'::jsonb,
  comments_count INTEGER DEFAULT 0,
  data_json JSONB,
  created_at_iso TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Comentários do Feed
CREATE TABLE IF NOT EXISTS public.posts_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES public.posts(id) ON DELETE CASCADE,
  author_uid TEXT,
  author_name TEXT,
  author_role TEXT,
  content TEXT,
  created_at_iso TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Usuários / Membros
CREATE TABLE IF NOT EXISTS public.users (
  uid TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  role TEXT,
  unit TEXT,
  phone TEXT,
  avatar_url TEXT,
  can_post_feed BOOLEAN DEFAULT TRUE,
  can_create_tasks BOOLEAN DEFAULT TRUE,
  can_access_funeraria BOOLEAN DEFAULT FALSE,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Migrações incrementais caso tabelas já existam
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS can_post_feed BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS can_create_tasks BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS can_access_funeraria BOOLEAN DEFAULT FALSE;

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_email TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_announcement BOOLEAN DEFAULT FALSE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS attachment_type TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS data_json JSONB;

ALTER TABLE public.posts_comments ADD COLUMN IF NOT EXISTS author_uid TEXT;
ALTER TABLE public.posts_comments ADD COLUMN IF NOT EXISTS author_role TEXT;

-- Habilitar RLS e criar políticas públicas permissivas para teste
ALTER TABLE public.funeraria_os ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funeraria_satisfaction_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir Leitura e Escrita Geral" ON public.funeraria_os FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir Leitura e Escrita Geral" ON public.funeraria_satisfaction_surveys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir Leitura e Escrita Geral" ON public.user_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir Leitura e Escrita Geral" ON public.pops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir Leitura e Escrita Geral" ON public.posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir Leitura e Escrita Geral" ON public.posts_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir Leitura e Escrita Geral" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- Índices de Performance para evitar timeouts
CREATE INDEX IF NOT EXISTS idx_user_tasks_created_at ON public.user_tasks (created_at_iso DESC);
CREATE INDEX IF NOT EXISTS idx_user_tasks_id ON public.user_tasks (id);
`;
