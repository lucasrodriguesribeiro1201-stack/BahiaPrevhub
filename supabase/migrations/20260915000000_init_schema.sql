-- ============================================================
-- MIGRAÇÃO INICIAL SUPABASE LOCAL (BAHIA PREV HUB)
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

-- 2. Tabela de Pesquisas de Satisfação (NPS)
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

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.funeraria_os ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funeraria_satisfaction_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Politicas RLS Permissivas para Uso Local
CREATE POLICY "Permitir Leitura e Escrita OS" ON public.funeraria_os FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir Leitura e Escrita Surveys" ON public.funeraria_satisfaction_surveys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir Leitura e Escrita Tasks" ON public.user_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir Leitura e Escrita Pops" ON public.pops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir Leitura e Escrita Posts" ON public.posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir Leitura e Escrita Comments" ON public.posts_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir Leitura e Escrita Users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- Índices de Desempenho
CREATE INDEX IF NOT EXISTS idx_user_tasks_created_at ON public.user_tasks (created_at_iso DESC);
CREATE INDEX IF NOT EXISTS idx_user_tasks_id ON public.user_tasks (id);
CREATE INDEX IF NOT EXISTS idx_funeraria_os_created_at ON public.funeraria_os (created_at_iso DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at_iso DESC);
