const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const users = [
  {
    uid: 'u_cauan_bahiaprev_com_br',
    name: 'Cauan',
    email: 'cauan@bahiaprev.com.br',
    role: 'Designer Gráfico',
    unit: null,
    phone: null,
    can_post_feed: false,
    can_create_tasks: false,
    can_access_funeraria: false,
    is_online: true,
    last_seen: '2026-08-21T18:42:29.364Z'
  },
  {
    uid: 'u_jairoqueiroz',
    name: 'Jairo Queiroz',
    email: 'jairoqueiroz@bahiaprev.com.br',
    role: 'Diretor/Presidente',
    unit: null,
    phone: null,
    can_post_feed: true,
    can_create_tasks: true,
    can_access_funeraria: true,
    is_online: true,
    last_seen: '2026-09-01T13:56:15.974Z'
  },
  {
    uid: 'u_lucasrodrigues_bahiaprev_com_br',
    name: 'Lucas Rodrigues',
    email: 'lucasrodrigues@bahiaprev.com.br',
    role: 'Analista de Marketing',
    unit: null,
    phone: null,
    can_post_feed: true,
    can_create_tasks: true,
    can_access_funeraria: true,
    is_online: true,
    last_seen: '2026-08-20T17:14:03.315Z'
  },
  {
    uid: 'u_marketing_bahiaprev',
    name: 'Marketing',
    email: 'marketing@bahiaprev.com.br',
    role: 'Analista de Marketing',
    unit: null,
    phone: null,
    can_post_feed: true,
    can_create_tasks: true,
    can_access_funeraria: false,
    is_online: false,
    last_seen: '2026-09-01T13:56:16.639Z'
  },
  {
    uid: 'u_nilton_bahiaprev_com_br',
    name: 'Nilton',
    email: 'nilton@bahiaprev.com.br',
    role: 'Gerente Funerário',
    unit: null,
    phone: null,
    can_post_feed: true,
    can_create_tasks: true,
    can_access_funeraria: true,
    is_online: true,
    last_seen: '2026-08-20T14:20:31.024Z'
  },
  {
    uid: 'u_paulo_bahiaprev_com_br',
    name: 'Paulo',
    email: 'paulo@bahiaprev.com.br',
    role: 'Agente Funerário',
    unit: null,
    phone: null,
    can_post_feed: true,
    can_create_tasks: true,
    can_access_funeraria: true,
    is_online: false,
    last_seen: '2026-09-01T13:56:17.353Z'
  },
  {
    uid: 'u_thayan_bahiaprev_com_br',
    name: 'Thayan',
    email: 'thayan@bahiaprev.com.br',
    role: 'CPD',
    unit: null,
    phone: null,
    can_post_feed: false,
    can_create_tasks: false,
    can_access_funeraria: false,
    is_online: true,
    last_seen: '2026-08-21T11:15:01.520Z'
  },
  {
    uid: 'usr_1788274769621_plb66',
    name: 'Elisnã',
    email: 'elisna@bahiaprev.com.br',
    role: 'Gerente Geral',
    unit: null,
    phone: null,
    can_post_feed: true,
    can_create_tasks: true,
    can_access_funeraria: true,
    is_online: true,
    last_seen: '2026-09-01T14:59:32.391Z'
  },
  {
    uid: 'usr_1788278976288_55jy9',
    name: 'Aurivanda Pereira',
    email: 'aurivanda@bahiaprev.com.br',
    role: 'Atendimento / Recepção',
    unit: null,
    phone: null,
    can_post_feed: false,
    can_create_tasks: false,
    can_access_funeraria: false,
    is_online: true,
    last_seen: '2026-09-01T16:09:39.471Z'
  },
  {
    uid: 'usr_1788279028771_cmaun',
    name: 'Bruna Ramalho',
    email: 'bruna@bahiaprev.com.br',
    role: 'Atendimento / Recepção',
    unit: null,
    phone: null,
    can_post_feed: false,
    can_create_tasks: false,
    can_access_funeraria: false,
    is_online: true,
    last_seen: '2026-09-01T16:10:31.583Z'
  },
  {
    uid: 'usr_1788279052927_fqdws',
    name: 'Deiza Oliveira',
    email: 'deiza@bahiaprev.com.br',
    role: 'Atendimento / Recepção',
    unit: null,
    phone: null,
    can_post_feed: false,
    can_create_tasks: false,
    can_access_funeraria: false,
    is_online: false,
    last_seen: '2026-09-01T16:10:55.863Z'
  },
  {
    uid: 'usr_1788279076868_10ywu',
    name: 'Elione Teles',
    email: 'elione@bahiaprev.com.br',
    role: 'Atendimento / Recepção',
    unit: null,
    phone: null,
    can_post_feed: false,
    can_create_tasks: false,
    can_access_funeraria: false,
    is_online: false,
    last_seen: '2026-09-01T16:11:19.919Z'
  },
  {
    uid: 'usr_1788279120913_17v61',
    name: 'Geiziane Benício',
    email: 'geiziane@bahiaprev.com.br',
    role: 'Atendimento / Recepção',
    unit: null,
    phone: null,
    can_post_feed: false,
    can_create_tasks: false,
    can_access_funeraria: false,
    is_online: false,
    last_seen: '2026-09-01T16:12:04.301Z'
  },
  {
    uid: 'usr_1788279164044_yhql9',
    name: 'Gildevania Barreto',
    email: 'gildevania@bahiaprev.com.br',
    role: 'Atendimento / Recepção',
    unit: null,
    phone: null,
    can_post_feed: false,
    can_create_tasks: false,
    can_access_funeraria: false,
    is_online: false,
    last_seen: '2026-09-01T16:12:47.122Z'
  },
  {
    uid: 'usr_1788279213909_b0iu0',
    name: 'Caroliny Caetane',
    email: 'caroliny@bahiaprev.com.br',
    role: 'Atendimento / Recepção',
    unit: null,
    phone: null,
    can_post_feed: false,
    can_create_tasks: false,
    can_access_funeraria: false,
    is_online: false,
    last_seen: '2026-09-01T16:13:36.873Z'
  },
  {
    uid: 'usr_1788279234579_z0spd',
    name: 'Gleice Pereira',
    email: 'gleice@bahiaprev.com.br',
    role: 'Atendimento / Recepção',
    unit: null,
    phone: null,
    can_post_feed: false,
    can_create_tasks: false,
    can_access_funeraria: false,
    is_online: false,
    last_seen: '2026-09-01T16:13:57.519Z'
  },
  {
    uid: 'usr_1788279271402_o7ong',
    name: 'Tatiane de Jesus',
    email: 'tatiane@bahiaprev.com.br',
    role: 'Atendimento / Recepção',
    unit: null,
    phone: null,
    can_post_feed: false,
    can_create_tasks: false,
    can_access_funeraria: false,
    is_online: false,
    last_seen: '2026-09-01T16:14:34.236Z'
  },
  {
    uid: 'usr_1788279302744_x8ubp',
    name: 'Osmarina Augusto',
    email: 'osmarina@bahiaprev.com.br',
    role: 'Atendimento / Recepção',
    unit: null,
    phone: null,
    can_post_feed: false,
    can_create_tasks: false,
    can_access_funeraria: false,
    is_online: false,
    last_seen: '2026-09-01T16:15:05.662Z'
  },
  {
    uid: 'usr_1788279329630_q472j',
    name: 'Patrícia Lima',
    email: 'patricia@bahiaprev.com.br',
    role: 'Atendimento / Recepção',
    unit: null,
    phone: null,
    can_post_feed: false,
    can_create_tasks: false,
    can_access_funeraria: false,
    is_online: true,
    last_seen: '2026-09-01T16:15:32.573Z'
  },
  {
    uid: 'usr_1788376516054_2qe48',
    name: 'Leticia Aveloes',
    email: 'leticia@bahiaprev.com.br',
    role: 'Atendimento / Recepção',
    unit: null,
    phone: null,
    can_post_feed: false,
    can_create_tasks: false,
    can_access_funeraria: false,
    is_online: false,
    last_seen: '2026-09-02T19:15:19.568Z'
  },
  {
    uid: 'usr_1788376589867_5wzry',
    name: 'Suyanndre',
    email: 'suyanndre@bahiaprev.com.br',
    role: 'Financeiro',
    unit: null,
    phone: null,
    can_post_feed: true,
    can_create_tasks: true,
    can_access_funeraria: false,
    is_online: false,
    last_seen: '2026-09-02T19:16:33.309Z'
  },
  {
    uid: 'usr_1788376633657_ak5qa',
    name: 'Kevin Machado',
    email: 'kevin@bahiaprev.com.br',
    role: 'Vendedor(a)',
    unit: null,
    phone: null,
    can_post_feed: false,
    can_create_tasks: false,
    can_access_funeraria: false,
    is_online: true,
    last_seen: '2026-09-02T19:17:16.841Z'
  }
];

async function main() {
  console.log(`Iniciando inserção de ${users.length} usuários reais no Supabase Docker...`);

  // Limpa tabela users
  await supabase.from('users').delete().neq('uid', '___never___');

  for (const u of users) {
    const { error } = await supabase.from('users').upsert(u, { onConflict: 'uid' });
    if (error) {
      console.error(`Erro ao inserir ${u.name}:`, error.message);
    } else {
      console.log(`✓ [${u.role}] ${u.name} (${u.email})`);
    }
  }

  // Atualiza sys_users_registry
  const registryPayload = {
    users: users.map(u => ({
      uid: u.uid,
      name: u.name,
      email: u.email,
      role: u.role,
      unit: u.unit,
      phone: u.phone,
      canPostFeed: u.can_post_feed,
      canCreateTasks: u.can_create_tasks,
      canAccessFuneraria: u.can_access_funeraria,
      createdAt: u.last_seen
    })),
    deletedEmails: [],
    deletedUids: []
  };

  await supabase.from('user_tasks').upsert({
    id: 'sys_users_registry',
    title: '__SYS_USERS_REGISTRY__',
    description: JSON.stringify(registryPayload),
    data_json: registryPayload,
    category: 'System',
    assigned_to: 'system',
    status: 'concluida',
    completed: true,
    created_by: 'system',
    created_at_iso: new Date().toISOString()
  }, { onConflict: 'id' });

  // Atualiza sys_team_roles_config
  const rolesPayload = {};
  users.forEach(u => {
    rolesPayload[u.email.toLowerCase()] = u.role;
  });

  await supabase.from('user_tasks').upsert({
    id: 'sys_team_roles_config',
    title: '__SYS_ROLES_CONFIG__',
    description: JSON.stringify(rolesPayload),
    data_json: rolesPayload,
    category: 'System',
    assigned_to: 'system',
    status: 'concluida',
    completed: true,
    created_by: 'system',
    created_at_iso: new Date().toISOString()
  }, { onConflict: 'id' });

  console.log(`\n✅ ${users.length} USUÁRIOS REAIS CADASTRADOS COM SUCESSO NO DOCKER!`);
}

main().catch(err => {
  console.error('Falha:', err);
  process.exit(1);
});
