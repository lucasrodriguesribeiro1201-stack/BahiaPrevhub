import { getSupabaseClient } from './supabase';
import { formatUserName } from '../utils/userNameFormatter';
import { checkFunerariaAccess } from '../utils/permissions';

// Helper to convert camelCase OS object to Supabase snake_case table row
export function mapOsToSupabaseRow(osData: any) {
  return {
    id: osData.id,
    os_number: osData.osNumber,
    status: osData.status || 'Aberto',
    prioridade: osData.prioridade || 'Normal',
    responsavel_name: osData.responsavelName || '',
    responsavel_email: osData.responsavelEmail || '',
    responsavel_uid: osData.responsavelUid || '',
    atendente_name: osData.atendenteName || '',
    unidade_atendimento: osData.unidadeAtendimento || '',
    form_data: osData.formData || null,
    checklist: osData.checklist || [],
    timeline: osData.timeline || [],
    agentes_acompanhamento: osData.agentesAcompanhamento || [],
    photos: osData.photos || [],
    audio_memos: osData.audioMemos || [],
    created_at_iso: osData.createdAtISO || new Date().toISOString(),
    date_formatted: osData.dateFormatted || '',
    time_formatted: osData.timeFormatted || '',
    updated_at_iso: osData.updatedAtISO || new Date().toISOString()
  };
}

// Helper to convert Supabase snake_case row back to app OS format
export function mapSupabaseRowToOs(row: any) {
  return {
    id: row.id,
    osNumber: row.os_number,
    status: row.status,
    prioridade: row.prioridade,
    responsavelName: row.responsavel_name,
    responsavelEmail: row.responsavel_email,
    responsavelUid: row.responsavel_uid,
    atendenteName: row.atendente_name,
    unidadeAtendimento: row.unidade_atendimento,
    formData: row.form_data,
    checklist: row.checklist || [],
    timeline: row.timeline || [],
    agentesAcompanhamento: row.agentes_acompanhamento || [],
    photos: row.photos || [],
    audioMemos: row.audio_memos || [],
    createdAtISO: row.created_at_iso,
    dateFormatted: row.date_formatted,
    timeFormatted: row.time_formatted,
    updatedAtISO: row.updated_at_iso
  };
}

// Helper to pack extra metadata into description if data_json column is absent
export function packTaskMetadata(description: string, task: any): string {
  const meta: Record<string, any> = {};
  if (task.userEmail) meta.userEmail = task.userEmail;
  if (task.userId) meta.userId = task.userId;
  if (task.createdByName) meta.createdByName = task.createdByName;
  if (task.assignedToEmail) meta.assignedToEmail = task.assignedToEmail;
  if (task.assignedToName) meta.assignedToName = task.assignedToName;
  if (task.assignedToType) meta.assignedToType = task.assignedToType;
  if (task.attachments && task.attachments.length > 0) meta.attachments = task.attachments;
  if (task.completionAttachments && task.completionAttachments.length > 0) meta.completionAttachments = task.completionAttachments;
  if (task.completionNote) meta.completionNote = task.completionNote;
  if (task.completedAt) meta.completedAt = task.completedAt;
  if (task.completedByEmail) meta.completedByEmail = task.completedByEmail;
  if (task.completedByName) meta.completedByName = task.completedByName;
  if (task.createdByAdmin) meta.createdByAdmin = task.createdByAdmin;

  const cleanDesc = (description || '').replace(/^<!-- TASK_META:[\s\S]*?-->\n?/i, '').trim();
  if (Object.keys(meta).length === 0) return cleanDesc;
  return `<!-- TASK_META:${JSON.stringify(meta)} -->\n${cleanDesc}`;
}

// Helper to unpack metadata from description
export function unpackTaskMetadata(description: string): { cleanDescription: string; meta: Record<string, any> } {
  if (!description) return { cleanDescription: '', meta: {} };
  const match = description.match(/^<!-- TASK_META:([\s\S]*?)-->\n?/i);
  if (match && match[1]) {
    try {
      const meta = JSON.parse(match[1]);
      const cleanDescription = description.replace(/^<!-- TASK_META:[\s\S]*?-->\n?/i, '');
      return { cleanDescription, meta };
    } catch {
      return { cleanDescription: description, meta: {} };
    }
  }
  return { cleanDescription: description, meta: {} };
}

// Helper to pack extra metadata into post content (attachments, category, announcement flag, comments, etc.)
export function packPostMetadata(content: string, post: any): string {
  const meta: Record<string, any> = {};
  if (post.category) meta.category = post.category;
  if (post.isAnnouncement !== undefined) meta.isAnnouncement = post.isAnnouncement;
  if (post.imageUrl) meta.imageUrl = post.imageUrl;
  if (post.attachmentUrl) meta.attachmentUrl = post.attachmentUrl;
  if (post.attachmentType) meta.attachmentType = post.attachmentType;
  if (post.attachmentName) meta.attachmentName = post.attachmentName;
  if (post.authorEmail) meta.authorEmail = post.authorEmail;
  if (post.likesCount !== undefined) meta.likesCount = post.likesCount;
  if (post.commentsCount !== undefined) meta.commentsCount = post.commentsCount;
  if (post.comments && Array.isArray(post.comments)) meta.comments = post.comments;

  const cleanContent = (content || '').replace(/^<!-- POST_META:[\s\S]*?-->\n?/i, '').trim();
  if (Object.keys(meta).length === 0) return cleanContent;
  return `<!-- POST_META:${JSON.stringify(meta)} -->\n${cleanContent}`;
}

// Helper to unpack metadata from post content
export function unpackPostMetadata(content: string): { cleanContent: string; meta: Record<string, any> } {
  if (!content) return { cleanContent: '', meta: {} };
  const match = content.match(/^<!-- POST_META:([\s\S]*?)-->\n?/i);
  if (match && match[1]) {
    try {
      const meta = JSON.parse(match[1]);
      const cleanContent = content.replace(/^<!-- POST_META:[\s\S]*?-->\n?/i, '');
      return { cleanContent, meta };
    } catch {
      return { cleanContent: content, meta: {} };
    }
  }
  return { cleanContent: content, meta: {} };
}

export const supabaseService = {
  // 1. FUNERARIA OS
  async fetchOrders(): Promise<any[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('funeraria_os')
        .select('*')
        .order('created_at_iso', { ascending: false })
        .limit(100);

      if (error) {
        console.warn('Erro ao buscar OS no Supabase:', error.message);
        return null;
      }

      return (data || []).map(mapSupabaseRowToOs);
    } catch (err) {
      console.warn('Falha na consulta do Supabase:', err);
      return null;
    }
  },

  async saveOrder(osData: any): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const row = mapOsToSupabaseRow(osData);
      const { error } = await supabase.from('funeraria_os').upsert(row, { onConflict: 'id' });

      if (error) {
        console.error('Erro ao salvar OS no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha ao salvar OS no Supabase:', err);
      return false;
    }
  },

  async deleteOrder(osId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('funeraria_os').delete().eq('id', osId);
      if (error) {
        console.error('Erro ao excluir OS no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  },

  // 2. USER TASKS
  async fetchTasks(): Promise<any[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      // Filter out system config rows (id starting with 'sys_') directly at DB query level to avoid heavy payloads and statement timeouts
      let res = await supabase
        .from('user_tasks')
        .select('*')
        .not('id', 'like', 'sys_%')
        .order('created_at_iso', { ascending: false })
        .limit(150);

      if (res.error) {
        console.warn('Filtro ordenado falhou no Supabase, tentando fallback sem ordenação:', res.error.message);
        res = await supabase
          .from('user_tasks')
          .select('*')
          .not('id', 'like', 'sys_%')
          .limit(150);
      }

      const data = res.data;
      if (res.error || !data) {
        console.warn('Erro ao buscar tarefas no Supabase:', res.error?.message);
        return null;
      }

      const taskRows = (data || []).filter((row: any) => row.id !== 'sys_team_roles_config' && row.title !== '__SYS_ROLES_CONFIG__' && row.id !== 'sys_users_registry');
      return taskRows.map((row: any) => {
        const { cleanDescription, meta } = unpackTaskMetadata(row.description || '');

        let assignedName = meta.assignedToName || row.assigned_to || '';
        let assignedEmail = meta.assignedToEmail || '';
        const rawAssigned = (row.assigned_to || '').toLowerCase().trim();

        // Auto-resolve known collaborator emails if missing
        if (!assignedEmail) {
          if (rawAssigned.includes('@')) {
            assignedEmail = row.assigned_to;
          } else if (rawAssigned.includes('cauan')) {
            assignedName = 'Cauan';
            assignedEmail = 'cauan@bahiaprev.com.br';
          } else if (rawAssigned.includes('lucas') || rawAssigned.includes('marketing')) {
            assignedName = 'Lucas Rodrigues';
            assignedEmail = 'lucasrodrigues@bahiaprev.com.br';
          } else if (rawAssigned.includes('jairo')) {
            assignedName = 'Jairo Queiroz';
            assignedEmail = 'jairoqueiroz@bahiaprev.com.br';
          } else if (rawAssigned.includes('nilton')) {
            assignedName = 'Nilton';
            assignedEmail = 'nilton@bahiaprev.com.br';
          } else if (rawAssigned.includes('thay')) {
            assignedName = 'Thayan';
            assignedEmail = 'thayan@bahiaprev.com.br';
          } else if (rawAssigned.includes('vitor')) {
            assignedName = 'Vitor';
            assignedEmail = 'vitor@bahiaprev.com.br';
          } else if (rawAssigned.includes('paulo')) {
            assignedName = 'Paulo';
            assignedEmail = 'paulo@bahiaprev.com.br';
          }
        }

        let createdName = meta.createdByName || row.created_by || 'Lucas Rodrigues';
        let creatorEmail = meta.userEmail || '';
        const rawCreator = (row.created_by || '').toLowerCase().trim();

        if (!creatorEmail) {
          if (rawCreator.includes('@')) {
            creatorEmail = row.created_by;
          } else if (rawCreator.includes('lucas') || rawCreator.includes('marketing')) {
            createdName = 'Lucas Rodrigues (Analista de Marketing)';
            creatorEmail = 'lucasrodrigues@bahiaprev.com.br';
          } else if (rawCreator.includes('jairo')) {
            createdName = 'Jairo Queiroz (Diretor)';
            creatorEmail = 'jairoqueiroz@bahiaprev.com.br';
          } else if (rawCreator.includes('nilton')) {
            createdName = 'Nilton (Colaborador)';
            creatorEmail = 'nilton@bahiaprev.com.br';
          }
        }

        let assignedType: 'specific_user' | 'all' | 'me' = meta.assignedToType || (rawAssigned === 'all' || rawAssigned.includes('todos') ? 'all' : (rawAssigned === 'me' ? 'me' : 'specific_user'));

        if (row.data_json && typeof row.data_json === 'object') {
          return {
            id: row.id,
            ...row.data_json,
            title: row.title || row.data_json.title,
            description: cleanDescription || row.data_json.description || '',
            category: row.category || row.data_json.category || 'Geral',
            priority: row.priority || row.data_json.priority || 'media',
            status: row.status || row.data_json.status || 'pendente',
            dueDate: row.due_date || row.data_json.dueDate || '',
            assignedToType: row.data_json.assignedToType || assignedType,
            assignedToName: row.data_json.assignedToName || assignedName,
            assignedToEmail: row.data_json.assignedToEmail || assignedEmail,
            createdByName: row.data_json.createdByName || createdName,
            userEmail: row.data_json.userEmail || creatorEmail,
            userId: row.data_json.userId || meta.userId || '',
            createdAt: row.created_at_iso || row.data_json.createdAt || new Date().toISOString(),
          };
        }

        return {
          id: row.id,
          userId: meta.userId || '',
          userEmail: creatorEmail,
          createdByName: createdName,
          title: row.title || '',
          description: cleanDescription,
          category: row.category || 'Geral',
          priority: (row.priority as any) || 'media',
          status: (row.status as any) || (row.completed ? 'concluida' : 'pendente'),
          dueDate: row.due_date || '',
          assignedToType: assignedType,
          assignedToName: assignedName,
          assignedToEmail: assignedEmail,
          createdByAdmin: meta.createdByAdmin || false,
          attachments: meta.attachments || [],
          attachmentName: meta.attachments?.[0]?.name,
          attachmentUrl: meta.attachments?.[0]?.url,
          attachmentType: meta.attachments?.[0]?.type,
          completionAttachments: meta.completionAttachments || [],
          completionAttachmentName: meta.completionAttachments?.[0]?.name,
          completionAttachmentUrl: meta.completionAttachments?.[0]?.url,
          completionAttachmentType: meta.completionAttachments?.[0]?.type,
          completionNote: meta.completionNote,
          completedAt: meta.completedAt || (row.completed ? row.created_at_iso : undefined),
          completedByEmail: meta.completedByEmail,
          completedByName: meta.completedByName,
          createdAt: row.created_at_iso || new Date().toISOString(),
        };
      });
    } catch (err) {
      console.warn('Falha na consulta de tarefas no Supabase:', err);
      return null;
    }
  },

  async saveTask(task: any): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const packedDescription = packTaskMetadata(task.description || '', task);

      const assignedDisplay = task.assignedToName || task.assignedToEmail || task.assignedTo || (task.assignedToType === 'all' ? 'Todos os Colaboradores' : 'Colaborador');
      const creatorDisplay = task.createdByName || task.userEmail || 'Lucas Rodrigues (Administrador)';

      const payload: any = {
        id: String(task.id),
        title: task.title || '',
        description: packedDescription,
        category: task.category || 'Geral',
        assigned_to: assignedDisplay,
        priority: task.priority || 'media',
        status: task.status || 'pendente',
        due_date: task.dueDate || '',
        completed: task.status === 'concluida',
        created_by: creatorDisplay,
        data_json: task,
        created_at_iso: task.createdAt || new Date().toISOString()
      };

      const { error } = await supabase.from('user_tasks').upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('Erro ao salvar tarefa no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Falha ao salvar tarefa no Supabase:', err);
      return false;
    }
  },

  async deleteTask(taskId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('user_tasks').delete().eq('id', taskId);
      if (error) {
        console.error('Erro ao excluir tarefa no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Falha ao excluir tarefa no Supabase:', err);
      return false;
    }
  },

  // 3. SATISFACTION SURVEYS
  async fetchSurveys(): Promise<any[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('funeraria_satisfaction_surveys')
        .select('*')
        .order('created_at_iso', { ascending: false })
        .limit(100);
      if (error) return null;
      return (data || []).map((row: any) => ({
        id: row.id,
        osNumber: row.os_number || '',
        falecidoNome: row.falecido_nome || '',
        familiarNome: row.familiar_nome || '',
        familiarTelefone: row.familiar_telefone || '',
        atendenteNome: row.atendente_nome || '',
        agenteNome: row.agente_nome || '',
        dataAtendimento: row.data_atendimento || '',
        statusPesquisa: row.status_pesquisa || 'Pendente',
        npsScore: row.nps_score ?? 10,
        avaliacaoAtendimento: row.avaliacao_atendimento ?? 5,
        avaliacaoRemocao: row.avaliacao_remocao ?? 5,
        avaliacaoVelorio: row.avaliacao_velorio ?? 5,
        avaliacaoGeral: row.avaliacao_geral ?? 5,
        observacoesFamiliar: row.observacoes_familiar || '',
        pontosMelhoria: row.pontos_melhoria || '',
        entrevistadorNome: row.entrevistador_nome || '',
        dataPesquisaRealizada: row.data_pesquisa_realizada || '',
        createdAtISO: row.created_at_iso
      }));
    } catch {
      return null;
    }
  },

  async saveSurvey(survey: any): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('funeraria_satisfaction_surveys').upsert({
        id: String(survey.id),
        os_number: survey.osNumber || '',
        falecido_nome: survey.falecidoNome || '',
        familiar_nome: survey.familiarNome || '',
        familiar_telefone: survey.familiarTelefone || '',
        atendente_nome: survey.atendenteNome || '',
        agente_nome: survey.agenteNome || '',
        data_atendimento: survey.dataAtendimento || '',
        status_pesquisa: survey.statusPesquisa || 'Pendente',
        nps_score: survey.npsScore ?? 10,
        avaliacao_atendimento: survey.avaliacaoAtendimento ?? 5,
        avaliacao_remocao: survey.avaliacaoRemocao ?? 5,
        avaliacao_velorio: survey.avaliacaoVelorio ?? 5,
        avaliacao_geral: survey.avaliacaoGeral ?? 5,
        observacoes_familiar: survey.observacoesFamiliar || '',
        pontos_melhoria: survey.pontosMelhoria || '',
        entrevistador_nome: survey.entrevistadorNome || '',
        data_pesquisa_realizada: survey.dataPesquisaRealizada || '',
        created_at_iso: survey.createdAtISO || new Date().toISOString()
      }, { onConflict: 'id' });

      return !error;
    } catch {
      return false;
    }
  },

  async deleteSurvey(surveyId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('funeraria_satisfaction_surveys').delete().eq('id', surveyId);
      return !error;
    } catch {
      return false;
    }
  },

  // 4. POPS
  async fetchPops(): Promise<any[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('pops')
        .select('*')
        .order('created_at_iso', { ascending: false })
        .limit(100);
      if (error) return null;
      return (data || []).map((row: any) => ({
        id: row.id,
        codigo: row.codigo || '',
        titulo: row.titulo || '',
        categoria: row.categoria || '',
        versao: row.versao || '1.0',
        conteudo: row.conteudo || '',
        autor: row.autor || '',
        dataAtualizacao: row.data_atualizacao || '',
        createdAtISO: row.created_at_iso
      }));
    } catch {
      return null;
    }
  },

  async savePop(pop: any): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('pops').upsert({
        id: String(pop.id),
        codigo: pop.codigo || '',
        titulo: pop.titulo || pop.title || '',
        categoria: pop.categoria || pop.category || '',
        versao: pop.versao || pop.version || '1.0',
        conteudo: pop.conteudo || pop.content || '',
        autor: pop.autor || pop.author || '',
        data_atualizacao: pop.dataAtualizacao || pop.updatedAt || new Date().toISOString(),
        created_at_iso: pop.createdAtISO || pop.createdAt || new Date().toISOString()
      }, { onConflict: 'id' });
      return !error;
    } catch {
      return false;
    }
  },

  async deletePop(popId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('pops').delete().eq('id', popId);
      return !error;
    } catch {
      return false;
    }
  },

  // 5. POSTS (FEED & COMUNICADOS)
  async fetchPosts(): Promise<any[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at_iso', { ascending: false })
        .limit(50);
      if (error) {
        console.warn('Erro ao buscar posts no Supabase:', error.message);
        return null;
      }
      return (data || []).map((row: any) => {
        const { cleanContent, meta } = unpackPostMetadata(row.content || '');
        const dataJson = row.data_json && typeof row.data_json === 'object' ? row.data_json : {};

        const category = row.category || dataJson.category || meta.category || (row.type === 'comunicado' || row.type === 'Comunicado' ? 'Comunicado' : (row.type || 'Geral'));
        const isAnnouncement = row.is_announcement !== undefined 
          ? Boolean(row.is_announcement) 
          : (dataJson.isAnnouncement !== undefined 
            ? Boolean(dataJson.isAnnouncement) 
            : (meta.isAnnouncement !== undefined 
              ? Boolean(meta.isAnnouncement) 
              : (category === 'Comunicado' || row.type === 'comunicado' || row.type === 'Comunicado')));

        const likedBy = Array.isArray(row.liked_by) ? row.liked_by : (Array.isArray(dataJson.likedBy) ? dataJson.likedBy : (Array.isArray(meta.likedBy) ? meta.likedBy : []));
        const likesCount = row.likes_count ?? row.likes ?? meta.likesCount ?? likedBy.length;
        const commentsCount = row.comments_count ?? meta.commentsCount ?? (Array.isArray(meta.comments) ? meta.comments.length : 0);

        return {
          id: row.id,
          authorUid: row.author_uid || dataJson.authorUid || meta.authorUid || '',
          authorEmail: row.author_email || dataJson.authorEmail || meta.authorEmail || '',
          authorName: row.author_name || dataJson.authorName || meta.authorName || '',
          authorRole: row.author_role || dataJson.authorRole || meta.authorRole || 'Colaborador',
          content: cleanContent,
          category: category,
          isAnnouncement: isAnnouncement,
          imageUrl: row.image_url || dataJson.imageUrl || meta.imageUrl || undefined,
          attachmentUrl: row.attachment_url || dataJson.attachmentUrl || meta.attachmentUrl || undefined,
          attachmentType: row.attachment_type || dataJson.attachmentType || meta.attachmentType || undefined,
          attachmentName: row.attachment_name || dataJson.attachmentName || meta.attachmentName || undefined,
          likesCount: likesCount,
          likedBy: likedBy,
          commentsCount: commentsCount,
          comments: meta.comments || [],
          createdAtISO: row.created_at_iso
        };
      });
    } catch (err) {
      console.warn('Falha na consulta de posts no Supabase:', err);
      return null;
    }
  },

  async savePost(post: any): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    try {
      const packedContent = packPostMetadata(post.content || '', post);
      const likesCount = post.likesCount ?? post.likes ?? (Array.isArray(post.likedBy) ? post.likedBy.length : 0);
      const likedBy = Array.isArray(post.likedBy) ? post.likedBy : (Array.isArray(post.liked_by) ? post.liked_by : []);

      const payload: any = {
        id: String(post.id),
        author_name: post.authorName || post.author_name || '',
        author_role: post.authorRole || post.author_role || '',
        author_uid: post.authorUid || post.author_uid || '',
        content: packedContent,
        type: post.category || post.type || (post.isAnnouncement ? 'Comunicado' : 'Geral'),
        likes: likesCount,
        liked_by: likedBy,
        created_at_iso: post.createdAtISO || post.createdAt || new Date().toISOString()
      };

      const { error } = await supabase.from('posts').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Erro ao salvar post no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Falha ao salvar post no Supabase:', err);
      return false;
    }
  },

  async deletePost(postId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) {
        console.error('Erro ao excluir post no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  },

  // 6. POST COMMENTS
  async fetchPostComments(postId: string): Promise<any[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    try {
      // 1. Try fetching from public.posts_comments table
      const { data, error } = await supabase
        .from('posts_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at_iso', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          postId: row.post_id,
          authorUid: row.author_uid || '',
          authorName: row.author_name || '',
          authorRole: row.author_role || '',
          content: row.content || '',
          createdAtISO: row.created_at_iso
        }));
      }

      // 2. Fallback: extract comments from post metadata in posts table
      const { data: postRow, error: postErr } = await supabase
        .from('posts')
        .select('content')
        .eq('id', postId)
        .single();

      if (!postErr && postRow?.content) {
        const { meta } = unpackPostMetadata(postRow.content);
        if (Array.isArray(meta.comments)) {
          return meta.comments;
        }
      }

      return [];
    } catch (err) {
      console.warn('Falha ao buscar comentários no Supabase:', err);
      return null;
    }
  },

  async fetchComments(postId: string): Promise<any[] | null> {
    return this.fetchPostComments(postId);
  },

  async savePostComment(comment: any): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const formattedComment = {
      id: String(comment.id),
      postId: String(comment.postId || comment.post_id),
      authorUid: comment.authorUid || comment.author_uid || '',
      authorName: comment.authorName || comment.author_name || '',
      authorRole: comment.authorRole || comment.author_role || '',
      content: comment.content || '',
      createdAtISO: comment.createdAtISO || comment.createdAt || new Date().toISOString()
    };

    try {
      await supabase.from('posts_comments').upsert({
        id: formattedComment.id,
        post_id: formattedComment.postId,
        author_uid: formattedComment.authorUid,
        author_name: formattedComment.authorName,
        author_role: formattedComment.authorRole,
        content: formattedComment.content,
        created_at_iso: formattedComment.createdAtISO
      }, { onConflict: 'id' });
    } catch {}

    // Also sync comment into post's metadata in posts table (acts as robust backup & updates comments_count)
    try {
      const { data: postRow } = await supabase
        .from('posts')
        .select('*')
        .eq('id', formattedComment.postId)
        .single();

      if (postRow) {
        const { cleanContent, meta } = unpackPostMetadata(postRow.content || '');
        const existingComments = Array.isArray(meta.comments) ? meta.comments : [];
        const commentIdx = existingComments.findIndex((c: any) => c.id === formattedComment.id);

        if (commentIdx >= 0) {
          existingComments[commentIdx] = formattedComment;
        } else {
          existingComments.push(formattedComment);
        }

        meta.comments = existingComments;
        meta.commentsCount = existingComments.length;

        const updatedContent = packPostMetadata(cleanContent, meta);
        await supabase.from('posts').update({ content: updatedContent }).eq('id', formattedComment.postId);
      }
    } catch {}

    return true;
  },

  async saveComment(comment: any): Promise<boolean> {
    return this.savePostComment(comment);
  },

  // 7. USERS & USER REGISTRY (Cloud-synchronized with local fallback)
  _usersTableMissing: false,

  async fetchUsersRegistry(): Promise<{
    users: any[];
    deletedEmails: string[];
    deletedUids: string[];
  }> {
    const defaultRegistry = {
      users: [
        { uid: 'u_lucas_dev', name: 'Lucas Rodrigues', email: 'lucasrodrigues@bahiaprev.com.br', role: 'Analista de Marketing', canPostFeed: true, canCreateTasks: true, createdAt: '2026-07-01T00:00:00.000Z' },
        { uid: 'u_jairo_dir', name: 'Jairo Queiroz', email: 'jairoqueiroz@bahiaprev.com.br', role: 'Diretor/Presidente', canPostFeed: true, canCreateTasks: true, createdAt: '2026-07-01T00:00:00.000Z' },
        { uid: 'u_cauan_des', name: 'Cauan', email: 'cauan@bahiaprev.com.br', role: 'Designer Gráfico', canPostFeed: true, canCreateTasks: true, createdAt: '2026-07-01T00:00:00.000Z' },
        { uid: 'u_nilton', name: 'Nilton', email: 'nilton@bahiaprev.com.br', role: 'Gerente Funerário', canPostFeed: true, canCreateTasks: true, createdAt: '2026-07-01T00:00:00.000Z' },
        { uid: 'u_thayan', name: 'Thayan', email: 'thayan@bahiaprev.com.br', role: 'CPD', canPostFeed: true, canCreateTasks: true, createdAt: '2026-07-01T00:00:00.000Z' },
        { uid: 'u_vitor', name: 'Vitor', email: 'vitor@bahiaprev.com.br', role: 'Financeiro', canPostFeed: true, canCreateTasks: true, createdAt: '2026-07-01T00:00:00.000Z' },
        { uid: 'u_paulo', name: 'Paulo', email: 'paulo@bahiaprev.com.br', role: 'Agente Funerário', canPostFeed: true, canCreateTasks: true, createdAt: '2026-07-01T00:00:00.000Z' }
      ],
      deletedEmails: [],
      deletedUids: []
    };

    let registry = { ...defaultRegistry };

    // 1. Check local storage cache
    try {
      const cached = localStorage.getItem('bahiaprev_sys_users_registry');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
          registry = {
            users: parsed.users,
            deletedEmails: Array.isArray(parsed.deletedEmails) ? parsed.deletedEmails : [],
            deletedUids: Array.isArray(parsed.deletedUids) ? parsed.deletedUids : []
          };
        }
      }
    } catch {}

    const supabase = getSupabaseClient();
    if (!supabase) return registry;

    // 2. Fetch cloud registry from user_tasks (id: sys_users_registry)
    try {
      const { data, error } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('id', 'sys_users_registry')
        .single();

      if (!error && data) {
        let parsed: any = null;
        if (data.data_json && typeof data.data_json === 'object' && Array.isArray(data.data_json.users)) {
          parsed = data.data_json;
        } else if (data.description) {
          try {
            parsed = JSON.parse(data.description);
          } catch {}
        }

        if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
          registry = {
            users: parsed.users,
            deletedEmails: Array.isArray(parsed.deletedEmails) ? parsed.deletedEmails : [],
            deletedUids: Array.isArray(parsed.deletedUids) ? parsed.deletedUids : []
          };
          try {
            localStorage.setItem('bahiaprev_sys_users_registry', JSON.stringify(registry));
          } catch {}
        }
      } else if (error && error.code === 'PGRST116') {
        // Record not created yet -> seed it to cloud
        await this.saveUsersRegistry(registry);
      }
    } catch (err) {
      console.warn('Erro ao carregar sys_users_registry do Supabase:', err);
    }

    // 3. Overlay DB users table if it exists
    if (!this._usersTableMissing) {
      try {
        const { data: dbUsers, error: dbErr } = await supabase.from('users').select('*');
        if (dbErr) {
          if (dbErr.code === '42P01' || dbErr.code === 'PGRST204' || dbErr.code === 'PGRST205' || dbErr.message?.includes('not exist')) {
            this._usersTableMissing = true;
          }
        } else if (Array.isArray(dbUsers) && dbUsers.length > 0) {
          dbUsers.forEach((row: any) => {
            const emailLower = (row.email || '').toLowerCase().trim();
            if (!emailLower || registry.deletedEmails.includes(emailLower) || registry.deletedUids.includes(row.uid)) return;

            const existingIdx = registry.users.findIndex(u => u.uid === row.uid || (u.email && u.email.toLowerCase() === emailLower));
            const existingUser = existingIdx >= 0 ? registry.users[existingIdx] : null;

            const isLeaderRole = row.role?.toLowerCase().includes('admin') || row.role?.toLowerCase().includes('diretor') || row.role?.toLowerCase().includes('marketing') || row.role?.toLowerCase().includes('gerente') || emailLower.includes('lucas') || emailLower.includes('jairo') || emailLower.includes('nilton');

            const resolvedCanPost = (row.can_post_feed !== undefined && row.can_post_feed !== null) 
              ? Boolean(row.can_post_feed) 
              : (existingUser?.canPostFeed !== undefined ? Boolean(existingUser.canPostFeed) : isLeaderRole);

            const resolvedCanTasks = (row.can_create_tasks !== undefined && row.can_create_tasks !== null) 
              ? Boolean(row.can_create_tasks) 
              : (existingUser?.canCreateTasks !== undefined ? Boolean(existingUser.canCreateTasks) : isLeaderRole);

            const resolvedCanFuneraria = (row.can_access_funeraria !== undefined && row.can_access_funeraria !== null) 
              ? Boolean(row.can_access_funeraria) 
              : ((existingUser as any)?.canAccessFuneraria !== undefined ? Boolean((existingUser as any).canAccessFuneraria) : checkFunerariaAccess({ role: row.role, email: emailLower }, emailLower));

            const formatted = {
              uid: row.uid,
              name: formatUserName(row.name, emailLower),
              email: emailLower,
              role: row.role || 'Colaborador',
              unit: row.unit || '',
              phone: row.phone || '',
              isOnline: Boolean(row.is_online),
              lastSeen: row.last_seen,
              avatarUrl: row.avatar_url || undefined,
              canPostFeed: resolvedCanPost,
              canCreateTasks: resolvedCanTasks,
              canAccessFuneraria: resolvedCanFuneraria,
              createdAt: row.created_at || row.created_at_iso || new Date().toISOString()
            };

            if (existingIdx >= 0) {
              registry.users[existingIdx] = { ...registry.users[existingIdx], ...formatted };
            } else {
              registry.users.push(formatted);
            }
          });
        }
      } catch {}
    }

    // Ensure Nilton / Gerente Funerário explicitly has feed and task creation permissions
    registry.users = registry.users.map((u: any) => {
      const emailLower = (u.email || '').toLowerCase().trim();
      const roleLower = (u.role || '').toLowerCase().trim();
      if (emailLower.includes('nilton') || roleLower.includes('gerente funerári') || roleLower.includes('gerente funerari')) {
        return {
          ...u,
          canPostFeed: true,
          canCreateTasks: true,
        };
      }
      return u;
    });

    return registry;
  },

  async saveUsersRegistry(registry: { users: any[]; deletedEmails: string[]; deletedUids: string[] }): Promise<boolean> {
    try {
      localStorage.setItem('bahiaprev_sys_users_registry', JSON.stringify(registry));
    } catch {}

    const supabase = getSupabaseClient();
    if (!supabase) return true;

    try {
      const payload = {
        id: 'sys_users_registry',
        title: '__SYS_USERS_REGISTRY__',
        description: JSON.stringify(registry),
        category: 'System',
        assigned_to: 'system',
        status: 'concluida',
        completed: true,
        created_by: 'system',
        created_at_iso: new Date().toISOString()
      };

      const { error } = await supabase.from('user_tasks').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Erro ao salvar sys_users_registry no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Falha ao gravar sys_users_registry:', err);
      return false;
    }
  },

  async fetchUsers(): Promise<any[] | null> {
    try {
      const [registry, teamRoles] = await Promise.all([
        this.fetchUsersRegistry(),
        this.fetchTeamRoles()
      ]);

      const deletedEmailsSet = new Set((registry.deletedEmails || []).map(e => e.toLowerCase().trim()));
      const deletedUidsSet = new Set(registry.deletedUids || []);

      const activeUsers: any[] = [];
      const seenEmails = new Set<string>();

      for (const u of registry.users) {
        const emailLower = (u.email || '').toLowerCase().trim();
        if (!emailLower || deletedEmailsSet.has(emailLower) || deletedUidsSet.has(u.uid) || emailLower === 'marketing@bahiaprev.com.br') {
          continue;
        }

        if (seenEmails.has(emailLower)) continue;
        seenEmails.add(emailLower);

        const effectiveRole = teamRoles[emailLower] || u.role || 'Colaborador';
        const formattedName = formatUserName(u.name, emailLower);

        activeUsers.push({
          uid: u.uid || `u_${emailLower.replace(/[^a-z0-9]/g, '_')}`,
          name: formattedName,
          email: emailLower,
          role: effectiveRole,
          unit: u.unit || '',
          phone: u.phone || '',
          avatarUrl: u.avatarUrl,
          canPostFeed: u.canPostFeed !== undefined ? Boolean(u.canPostFeed) : (effectiveRole.toLowerCase().includes('admin') || effectiveRole.toLowerCase().includes('diretor') || effectiveRole.toLowerCase().includes('marketing') || effectiveRole.toLowerCase().includes('gerente') || emailLower.includes('lucas') || emailLower.includes('jairo') || emailLower.includes('nilton')),
          canCreateTasks: u.canCreateTasks !== undefined ? Boolean(u.canCreateTasks) : (effectiveRole.toLowerCase().includes('admin') || effectiveRole.toLowerCase().includes('diretor') || effectiveRole.toLowerCase().includes('marketing') || effectiveRole.toLowerCase().includes('gerente') || emailLower.includes('lucas') || emailLower.includes('jairo') || emailLower.includes('nilton')),
          canAccessFuneraria: u.canAccessFuneraria !== undefined ? Boolean(u.canAccessFuneraria) : checkFunerariaAccess({ role: effectiveRole, email: emailLower }, emailLower),
          createdAt: u.createdAt || new Date().toISOString(),
          isOnline: Boolean(u.isOnline),
          lastSeen: u.lastSeen,
          password: u.password
        });
      }

      return activeUsers;
    } catch (err) {
      console.warn('Erro em fetchUsers:', err);
      return null;
    }
  },

  async saveUser(user: any): Promise<boolean> {
    return this.saveUserProfile(user);
  },

  async saveUserProfile(user: any): Promise<boolean> {
    const cleanEmail = (user.email || '').toLowerCase().trim();
    if (!cleanEmail) return false;

    const cleanRole = (user.role || 'Colaborador').trim();
    const formattedName = formatUserName(user.name || user.displayName, cleanEmail);
    const uid = String(user.uid || user.id || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);

    try {
      // 1. Update team role configuration
      await this.saveTeamRole(cleanEmail, cleanRole);

      // 2. Fetch current registry
      const registry = await this.fetchUsersRegistry();

      // Remove from deleted lists if previously deleted (reinstate user)
      registry.deletedEmails = (registry.deletedEmails || []).filter(e => e.toLowerCase().trim() !== cleanEmail);
      registry.deletedUids = (registry.deletedUids || []).filter(id => id !== uid);

      const userObject: any = {
        uid,
        name: formattedName,
        email: cleanEmail,
        role: cleanRole,
        unit: user.unit || '',
        phone: user.phone || '',
        avatarUrl: user.avatarUrl || undefined,
        canPostFeed: user.canPostFeed !== undefined ? Boolean(user.canPostFeed) : (cleanRole.toLowerCase().includes('admin') || cleanRole.toLowerCase().includes('diretor') || cleanRole.toLowerCase().includes('marketing') || cleanRole.toLowerCase().includes('gerente') || cleanEmail.includes('lucas') || cleanEmail.includes('jairo') || cleanEmail.includes('nilton')),
        canCreateTasks: user.canCreateTasks !== undefined ? Boolean(user.canCreateTasks) : (cleanRole.toLowerCase().includes('admin') || cleanRole.toLowerCase().includes('diretor') || cleanRole.toLowerCase().includes('marketing') || cleanRole.toLowerCase().includes('gerente') || cleanEmail.includes('lucas') || cleanEmail.includes('jairo') || cleanEmail.includes('nilton')),
        canAccessFuneraria: user.canAccessFuneraria !== undefined ? Boolean(user.canAccessFuneraria) : checkFunerariaAccess({ role: cleanRole, email: cleanEmail }, cleanEmail),
        createdAt: user.createdAt || new Date().toISOString(),
        isOnline: Boolean(user.isOnline),
        lastSeen: user.lastSeen || new Date().toISOString()
      };

      if (user.password) {
        userObject.password = user.password;
      }

      // Upsert into registry users array
      const existingIndex = registry.users.findIndex(u => 
        u.uid === uid || (u.email && u.email.toLowerCase().trim() === cleanEmail)
      );

      if (existingIndex >= 0) {
        registry.users[existingIndex] = {
          ...registry.users[existingIndex],
          ...userObject
        };
      } else {
        registry.users.push(userObject);
      }

      // 3. Save updated registry to cloud & localStorage
      await this.saveUsersRegistry(registry);

      // 4. Try updating public.users table if it exists in Supabase
      if (!this._usersTableMissing) {
        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            const { error } = await supabase.from('users').upsert({
              uid,
              name: formattedName,
              email: cleanEmail,
              role: cleanRole,
              unit: user.unit || '',
              phone: user.phone || '',
              avatar_url: user.avatarUrl || null,
              can_post_feed: userObject.canPostFeed,
              can_create_tasks: userObject.canCreateTasks,
              can_access_funeraria: userObject.canAccessFuneraria,
              is_online: Boolean(user.isOnline),
              last_seen: user.lastSeen || new Date().toISOString()
            }, { onConflict: 'uid' });

            if (error) {
              if (error.code === '42P01' || error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('not exist')) {
                this._usersTableMissing = true;
              } else if (error.message?.includes('column')) {
                // Retry without permission columns if table schema in DB doesn't have them yet
                await supabase.from('users').upsert({
                  uid,
                  name: formattedName,
                  email: cleanEmail,
                  role: cleanRole,
                  unit: user.unit || '',
                  phone: user.phone || '',
                  is_online: Boolean(user.isOnline),
                  last_seen: user.lastSeen || new Date().toISOString()
                }, { onConflict: 'uid' });
              }
            }
          } catch {}
        }
      }

      return true;
    } catch (err) {
      console.error('Erro ao salvar perfil do usuário:', err);
      return false;
    }
  },

  async deleteUser(uid: string, email?: string): Promise<boolean> {
    return this.deleteUserProfile(uid, email);
  },

  async deleteUserProfile(uid: string, email?: string): Promise<boolean> {
    if (!uid && !email) return false;

    try {
      const registry = await this.fetchUsersRegistry();
      const cleanEmail = email ? email.toLowerCase().trim() : '';

      // Find user to get both uid and email if only one was provided
      let targetUser = registry.users.find(u => 
        (uid && u.uid === uid) || (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail)
      );

      const targetUid = uid || targetUser?.uid;
      const targetEmail = cleanEmail || (targetUser?.email ? targetUser.email.toLowerCase().trim() : '');

      if (targetEmail && (targetEmail === 'lucasrodrigues@bahiaprev.com.br' || targetEmail === 'marketing@bahiaprev.com.br')) {
        console.warn('Não é permitido excluir o Administrador Principal.');
        return false;
      }

      // 1. Add to deleted lists
      if (targetUid && !registry.deletedUids.includes(targetUid)) {
        registry.deletedUids.push(targetUid);
      }
      if (targetEmail && !registry.deletedEmails.includes(targetEmail)) {
        registry.deletedEmails.push(targetEmail);
      }

      // 2. Remove from users array
      registry.users = registry.users.filter(u => {
        const uEmail = (u.email || '').toLowerCase().trim();
        const matchesUid = targetUid && u.uid === targetUid;
        const matchesEmail = targetEmail && uEmail === targetEmail;
        return !matchesUid && !matchesEmail;
      });

      // 3. Save updated registry to cloud & localStorage
      await this.saveUsersRegistry(registry);

      // 4. Remove from team roles config
      if (targetEmail) {
        try {
          const roles = await this.fetchTeamRoles();
          if (roles[targetEmail]) {
            delete roles[targetEmail];
            localStorage.setItem('bahiaprev_team_roles', JSON.stringify(roles));

            const supabase = getSupabaseClient();
            if (supabase) {
              await supabase.from('user_tasks').upsert({
                id: 'sys_team_roles_config',
                title: '__SYS_ROLES_CONFIG__',
                description: JSON.stringify(roles),
                category: 'System',
                assigned_to: 'system',
                status: 'concluida',
                completed: true,
                created_by: 'system',
                created_at_iso: new Date().toISOString()
              }, { onConflict: 'id' });
            }
          }
        } catch {}
      }

      // 5. Try deleting from public.users table if available
      if (!this._usersTableMissing) {
        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            if (targetUid) {
              await supabase.from('users').delete().eq('uid', targetUid);
            }
            if (targetEmail) {
              await supabase.from('users').delete().eq('email', targetEmail);
            }
          } catch {}
        }
      }

      return true;
    } catch (err) {
      console.error('Erro ao excluir usuário:', err);
      return false;
    }
  },

  // 8. TEAM ROLES & CARGOS CONFIGURATION (Synchronized across all devices)
  async fetchTeamRoles(): Promise<Record<string, string>> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      try {
        const cached = localStorage.getItem('bahiaprev_team_roles');
        return cached ? JSON.parse(cached) : {};
      } catch {
        return {};
      }
    }

    try {
      const { data, error } = await supabase.from('user_tasks').select('description').eq('id', 'sys_team_roles_config').single();
      if (error || !data || !data.description) {
        // Fallback to localStorage cache
        try {
          const cached = localStorage.getItem('bahiaprev_team_roles');
          return cached ? JSON.parse(cached) : {};
        } catch {
          return {};
        }
      }
      const parsed = JSON.parse(data.description);
      if (parsed && typeof parsed === 'object') {
        try {
          localStorage.setItem('bahiaprev_team_roles', JSON.stringify(parsed));
        } catch {}
        return parsed;
      }
      return {};
    } catch {
      try {
        const cached = localStorage.getItem('bahiaprev_team_roles');
        return cached ? JSON.parse(cached) : {};
      } catch {
        return {};
      }
    }
  },

  async saveTeamRole(email: string, role: string): Promise<boolean> {
    if (!email || !role) return false;
    const supabase = getSupabaseClient();

    const cleanEmail = email.toLowerCase().trim();
    const cleanRole = role.trim();

    try {
      // 1. Get current config & update locally immediately
      const currentRoles = await this.fetchTeamRoles();
      currentRoles[cleanEmail] = cleanRole;

      try {
        localStorage.setItem('bahiaprev_team_roles', JSON.stringify(currentRoles));
      } catch {}

      if (!supabase) return true;

      // 2. Persist to Supabase user_tasks config
      const payload = {
        id: 'sys_team_roles_config',
        title: '__SYS_ROLES_CONFIG__',
        description: JSON.stringify(currentRoles),
        category: 'System',
        assigned_to: 'system',
        status: 'concluida',
        completed: true,
        created_by: 'system',
        created_at_iso: new Date().toISOString()
      };

      await supabase.from('user_tasks').upsert(payload, { onConflict: 'id' });

      // 3. Also update users table if it exists
      if (!this._usersTableMissing) {
        try {
          await supabase.from('users').update({ role: cleanRole }).eq('email', cleanEmail);
        } catch {}
      }

      return true;
    } catch {
      return false;
    }
  }
};
