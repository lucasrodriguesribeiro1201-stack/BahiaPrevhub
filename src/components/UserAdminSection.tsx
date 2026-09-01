import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserPlus, 
  ShieldCheck, 
  User, 
  Mail, 
  Lock, 
  Briefcase, 
  Radio, 
  ListTodo, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Search, 
  Sparkles,
  Users,
  Key,
  AlertCircle,
  RefreshCw,
  Check,
  X,
  Cross,
  Trash2
} from 'lucide-react';
import { checkFunerariaAccess } from '../utils/permissions';
import { useAuth } from './AuthContext';
import { supabaseService } from '../lib/supabaseService';
import { formatUserName } from '../utils/userNameFormatter';

interface ManagedUser {
  uid: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  canPostFeed?: boolean;
  canCreateTasks?: boolean;
  canAccessFuneraria?: boolean;
  createdAt?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

const PRESET_ROLES = [
  'CPD',
  'Gerente Funerário',
  'Gerente Geral',
  'Atendimento / Recepção',
  'Vendedor(a)',
  'Agente Funerário',
  'Designer Gráfico',
  'Analista de Marketing',
  'Financeiro',
  'Cobrador',
  'Diretor / Presidente',
  'Administrador',
  'Colaborador'
];

export const UserAdminSection: React.FC = () => {
  const { profile, user, allUsers, fetchUsers } = useAuth();

  useEffect(() => {
    fetchUsers().catch(() => {});
  }, []);

  // Verification: Exclusive access for lucasrodrigues@bahiaprev.com.br
  const isLucas = Boolean(
    (user?.email || '').toLowerCase().trim() === 'lucasrodrigues@bahiaprev.com.br' ||
    (profile?.email || '').toLowerCase().trim() === 'lucasrodrigues@bahiaprev.com.br'
  );

  // Users list from Supabase
  const [usersList, setUsersList] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State for New User
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('mkt@BP2025');
  const [newRole, setNewRole] = useState('Analista de Marketing');
  const [customRole, setCustomRole] = useState('');
  const [canPostFeed, setCanPostFeed] = useState(false);
  const [canCreateTasks, setCanCreateTasks] = useState(false);
  const [canAccessFuneraria, setCanAccessFuneraria] = useState(false);

  // Status & Feedback
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editCanPostFeed, setEditCanPostFeed] = useState(false);
  const [editCanCreateTasks, setEditCanCreateTasks] = useState(false);
  const [editCanAccessFuneraria, setEditCanAccessFuneraria] = useState(false);

  // Delete User Modal & State
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load all users from Supabase
  useEffect(() => {
    const loaded: ManagedUser[] = allUsers
      .filter(item => (item.email || '').toLowerCase().trim() !== 'marketing@bahiaprev.com.br')
      .map((item) => {
        const uEmail = (item.email || '').toLowerCase().trim();
        const finalName = formatUserName(item.name, uEmail);
        const finalEmail = item.email || '';
        const finalRole = item.role || 'Colaborador';
        const isLeaderRole = finalRole.toLowerCase().includes('admin') || finalRole.toLowerCase().includes('diretor') || finalRole.toLowerCase().includes('marketing') || finalRole.toLowerCase().includes('gerente') || uEmail.includes('lucas') || uEmail.includes('jairo') || uEmail.includes('nilton');
        const defaultCanPost = item.canPostFeed !== undefined ? Boolean(item.canPostFeed) : isLeaderRole;
        const defaultCanTasks = item.canCreateTasks !== undefined ? Boolean(item.canCreateTasks) : isLeaderRole;
        const defaultCanFuneraria = item.canAccessFuneraria !== undefined ? Boolean(item.canAccessFuneraria) : checkFunerariaAccess({ role: finalRole, email: uEmail }, uEmail);

        return {
          uid: item.uid,
          name: finalName,
          email: finalEmail,
          role: finalRole,
          avatarUrl: item.avatarUrl,
          canPostFeed: defaultCanPost,
          canCreateTasks: defaultCanTasks,
          canAccessFuneraria: defaultCanFuneraria,
          isOnline: item.isOnline,
          lastSeen: item.lastSeen,
          createdAt: item.createdAt
        };
      });

    // Sort users: Lucas & Directors first, then alphabetically
    loaded.sort((a, b) => {
      if (a.email.includes('lucas')) return -1;
      if (b.email.includes('lucas')) return 1;
      return a.name.localeCompare(b.name);
    });

    setUsersList(loaded);
    setLoadingUsers(false);
  }, [allUsers]);

  // Helper to register new user
  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!newName.trim()) {
      setStatusMessage({ type: 'error', text: 'Por favor, informe o nome completo do colaborador.' });
      return;
    }
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setStatusMessage({ type: 'error', text: 'Por favor, informe um e-mail válido.' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'A senha de acesso precisa ter pelo menos 6 caracteres.' });
      return;
    }

    const finalRole = newRole === 'Outro' ? (customRole.trim() || 'Colaborador') : newRole;
    const formattedName = formatUserName(newName, newEmail);

    setSubmitting(true);

    try {
      const existingUser = usersList.find(u => u.email.toLowerCase() === newEmail.trim().toLowerCase());
      const createdUid = existingUser ? existingUser.uid : `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      const userProfilePayload = {
        uid: createdUid,
        name: formattedName,
        email: newEmail.trim().toLowerCase(),
        role: finalRole,
        canPostFeed: canPostFeed,
        canCreateTasks: canCreateTasks,
        canAccessFuneraria: canAccessFuneraria,
        password: newPassword,
        createdAt: new Date().toISOString()
      };

      await supabaseService.saveUserProfile(userProfilePayload);
      await fetchUsers();

      setStatusMessage({ 
        type: 'success', 
        text: `Usuário ${newName.trim()} (${newEmail.trim()}) cadastrado e sincronizado com sucesso no sistema!` 
      });

      // Clear form
      setNewName('');
      setNewEmail('');
      setCustomRole('');
      setNewPassword('mkt@BP2025');
      setCanPostFeed(false);
      setCanCreateTasks(false);
      setCanAccessFuneraria(false);

    } catch (err: any) {
      console.error('Error registering user:', err);
      setStatusMessage({ 
        type: 'error', 
        text: err.message || 'Erro ao cadastrar novo usuário. Tente novamente.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle permission directly from table
  const handleTogglePermission = async (userUid: string, field: 'canPostFeed' | 'canCreateTasks' | 'canAccessFuneraria', currentValue: boolean) => {
    try {
      const u = usersList.find(item => item.uid === userUid);
      if (u) {
        await supabaseService.saveUserProfile({
          ...u,
          [field]: !currentValue
        });
        await fetchUsers();
      }
    } catch (err) {
      console.error('Error updating permission:', err);
    }
  };

  // Open Edit Modal
  const openEditModal = (u: ManagedUser) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditPassword('');
    setEditCanPostFeed(Boolean(u.canPostFeed));
    setEditCanCreateTasks(Boolean(u.canCreateTasks));
    setEditCanAccessFuneraria(Boolean(u.canAccessFuneraria));
  };

  // Save Edit User
  const [savingEdit, setSavingEdit] = useState(false);
  const handleSaveEditUser = async () => {
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      const payload: any = {
        ...editingUser,
        name: formatUserName(editName, editingUser.email),
        role: editRole.trim(),
        canPostFeed: editCanPostFeed,
        canCreateTasks: editCanCreateTasks,
        canAccessFuneraria: editCanAccessFuneraria
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }
      await supabaseService.saveUserProfile(payload);
      setEditingUser(null);
      await fetchUsers();
    } catch (err) {
      console.error('Error saving user edit:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  // Confirm Delete User
  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await supabaseService.deleteUserProfile(deletingUser.uid, deletingUser.email);
      await fetchUsers();

      setStatusMessage({
        type: 'success',
        text: `Usuário ${deletingUser.name} (${deletingUser.email}) foi excluído do sistema com sucesso.`
      });
      setDeletingUser(null);
      if (editingUser?.uid === deletingUser.uid) {
        setEditingUser(null);
      }
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setStatusMessage({
        type: 'error',
        text: `Erro ao excluir usuário: ${err.message || 'Tente novamente.'}`
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered users for search
  const filteredUsers = usersList.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isLucas) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-white shadow-2xl">
        <ShieldCheck className="h-16 w-16 text-red-500 mx-auto mb-4 animate-bounce" />
        <h2 className="text-2xl font-black text-white mb-2">Painel de Acesso Exclusivo</h2>
        <p className="text-slate-300 text-sm max-w-md mx-auto leading-relaxed">
          Esta aba é restrita e configurada exclusivamente para a conta de administrador do 
          <strong className="text-blue-400 font-bold"> {profile?.name || 'Analista de Marketing'}</strong>.
        </p>
      </div>
    );
  }

  const currentAdminName = profile?.name || 'Lucas Rodrigues';
  const currentAdminInitials = currentAdminName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'AM';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* Exclusive Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 text-xs font-bold">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              <span>Aba Exclusiva de Administração • {currentAdminName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Cadastro de Usuários & Permissões</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Cadastre novos colaboradores, defina seus cargos e gerencie exatamente quais permissões cada um possui no sistema (publicar no Feed e criar/atribuir tarefas).
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl shrink-0">
            {profile?.avatarUrl ? (
              <img 
                src={profile.avatarUrl} 
                alt={currentAdminName} 
                className="h-10 w-10 rounded-full object-cover border border-blue-400/50 shadow-md"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                {currentAdminInitials}
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-white">{currentAdminName}</p>
              <p className="text-[10px] text-blue-400 font-semibold">Administrador do Sistema</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Left, User List Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form to Register User */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xl space-y-6">
            
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5 text-slate-900 font-black text-lg">
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-600">
                  <UserPlus className="h-5 w-5" />
                </div>
                <h2>Cadastrar Novo Usuário</h2>
              </div>
              <p className="text-slate-500 text-xs mt-1">
                Preencha os dados abaixo para gerar as credenciais do novo colaborador.
              </p>
            </div>

            {/* Status Notification */}
            {statusMessage && (
              <div className={`p-4 rounded-2xl border text-xs font-medium flex items-start gap-3 ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <p className="font-bold text-sm">
                    {statusMessage.type === 'success' ? 'Sucesso!' : 'Atenção'}
                  </p>
                  <p>{statusMessage.text}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleRegisterUser} className="space-y-4">
              
              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-blue-500" />
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-500" />
                  E-mail de Acesso
                </label>
                <input
                  type="email"
                  required
                  placeholder="Ex: carlos@bahiaprev.com.br"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Senha */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-blue-500" />
                  Senha Inicial de Acesso
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">O colaborador utilizará este e-mail e senha para fazer login.</p>
              </div>

              {/* Cargo / Função */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-blue-500" />
                  Cargo / Função
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
                >
                  {PRESET_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="Outro">Outro (Digitar Cargo Customizado)</option>
                </select>

                {newRole === 'Outro' && (
                  <input
                    type="text"
                    required
                    placeholder="Digite o título do cargo..."
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    className="w-full mt-2 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                )}
              </div>

              {/* Permissões no Sistema */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Permissões do Sistema
                </p>

                {/* Permissão 1: Feed */}
                <div 
                  onClick={() => setCanPostFeed(!canPostFeed)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    canPostFeed 
                      ? 'bg-blue-50/70 border-blue-200 text-blue-950' 
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${canPostFeed ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <Radio className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Postar no Feed & Comunicados</p>
                      <p className="text-[10px] text-slate-500">Permite publicar comunicados oficiais e atualizações.</p>
                    </div>
                  </div>

                  <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${canPostFeed ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${canPostFeed ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* Permissão 2: Tarefas */}
                <div 
                  onClick={() => setCanCreateTasks(!canCreateTasks)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    canCreateTasks 
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${canCreateTasks ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <ListTodo className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Criar & Atribuir Tarefas</p>
                      <p className="text-[10px] text-slate-500">Permite criar tarefas e delegar para a equipe.</p>
                    </div>
                  </div>

                  <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${canCreateTasks ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${canCreateTasks ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* Permissão 3: Gestão Funerária */}
                <div 
                  onClick={() => setCanAccessFuneraria(!canAccessFuneraria)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    canAccessFuneraria 
                      ? 'bg-purple-50/70 border-purple-200 text-purple-950' 
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${canAccessFuneraria ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <Cross className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Acesso ao Módulo Gestão Funerária</p>
                      <p className="text-[10px] text-slate-500">Permite visualizar e gerenciar ordens de serviço e atendimentos.</p>
                    </div>
                  </div>

                  <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${canAccessFuneraria ? 'bg-purple-600' : 'bg-slate-300'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${canAccessFuneraria ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Cadastrando Usuário...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Cadastrar Colaborador no Sistema</span>
                  </>
                )}
              </button>

            </form>

          </div>
        </div>

        {/* Right Column: Registered Users List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xl space-y-6">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-slate-900 font-black text-lg">Usuários Cadastrados ({usersList.length})</h2>
                  <p className="text-slate-500 text-xs">Gerencie cargos e permissões ativas em tempo real.</p>
                </div>
              </div>

              {/* Search Field */}
              <div className="relative w-full sm:w-64">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar colaborador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Users Table / List */}
            {loadingUsers ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                <span>Carregando lista de usuários...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs font-medium">
                Nenhum colaborador encontrado com os termos pesquisados.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((u) => {
                  const isLucasUser = u.email.includes('lucas') || u.email === 'marketing@bahiaprev.com.br';

                  return (
                    <div 
                      key={u.uid}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        isLucasUser 
                          ? 'bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-blue-200 shadow-sm' 
                          : 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-100/80'
                      }`}
                    >
                      {/* Left: User Avatar & Details */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {u.avatarUrl ? (
                          <img 
                            src={u.avatarUrl} 
                            alt={u.name} 
                            className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-md shrink-0" 
                          />
                        ) : (
                          <div className={`h-10 w-10 rounded-full text-white font-black text-sm flex items-center justify-center shadow-md shrink-0 ${
                            isLucasUser ? 'bg-gradient-to-tr from-blue-600 to-indigo-600' : 'bg-slate-700'
                          }`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-sm truncate">{u.name}</span>
                            {isLucasUser && (
                              <span className="px-2 py-0.5 bg-blue-600 text-white font-extrabold text-[9px] rounded-full uppercase tracking-wider shrink-0">
                                Admin Principal
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-semibold text-blue-600 truncate">{u.role}</p>
                          <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>

                      {/* Right: Permissions Status & Action */}
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
                        
                        {/* Feed permission badge & button */}
                        <button
                          onClick={() => handleTogglePermission(u.uid, 'canPostFeed', Boolean(u.canPostFeed))}
                          title="Clique para alternar permissão do Feed"
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                            u.canPostFeed 
                              ? 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200' 
                              : 'bg-slate-200/70 border-slate-300 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          <Radio className="h-3 w-3 text-blue-600" />
                          <span>Feed: {u.canPostFeed ? '✅ Sim' : '🚫 Não'}</span>
                        </button>

                        {/* Tasks permission badge & button */}
                        <button
                          onClick={() => handleTogglePermission(u.uid, 'canCreateTasks', Boolean(u.canCreateTasks))}
                          title="Clique para alternar permissão de Tarefas"
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                            u.canCreateTasks 
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200' 
                              : 'bg-slate-200/70 border-slate-300 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          <ListTodo className="h-3 w-3 text-emerald-600" />
                          <span>Tarefas: {u.canCreateTasks ? '✅ Sim' : '🚫 Não'}</span>
                        </button>

                        {/* Funerária permission badge & button */}
                        <button
                          onClick={() => handleTogglePermission(u.uid, 'canAccessFuneraria', Boolean(u.canAccessFuneraria))}
                          title="Clique para alternar permissão de Gestão Funerária"
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                            u.canAccessFuneraria 
                              ? 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200' 
                              : 'bg-slate-200/70 border-slate-300 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          <Cross className="h-3 w-3 text-purple-600" />
                          <span>Funerária: {u.canAccessFuneraria ? '✅ Sim' : '🚫 Não'}</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors cursor-pointer"
                          title="Editar Nome, Cargo e Permissões"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        {/* Delete User Button - available for all accounts except active logged in account */}
                        {(user ? u.uid !== user.uid : !isLucasUser) && (
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="p-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer"
                            title="Excluir Usuário do Sistema"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}

                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 border border-slate-200"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-600">
                    <Edit3 className="h-4 w-4" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base">Editar Colaborador</h3>
                </div>
                <button 
                  onClick={() => setEditingUser(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cargo / Função</label>
                  <input
                    type="text"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    placeholder="Ex: CPD, Gerente Geral, Financeiro..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 mb-2"
                  />
                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                    {PRESET_ROLES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setEditRole(r)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                          editRole === r
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Redefinir Senha (Opcional):
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Deixe em branco para manter a senha atual"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Preencha este campo apenas se desejar redefinir a senha deste colaborador.</p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-extrabold text-slate-900">Permissões de Acesso</p>
                  
                  <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                    <span className="text-xs font-bold text-slate-800">Pode publicar no Feed & Comunicados</span>
                    <input
                      type="checkbox"
                      checked={editCanPostFeed}
                      onChange={(e) => setEditCanPostFeed(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                    <span className="text-xs font-bold text-slate-800">Pode criar e atribuir Tarefas</span>
                    <input
                      type="checkbox"
                      checked={editCanCreateTasks}
                      onChange={(e) => setEditCanCreateTasks(e.target.checked)}
                      className="h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                    <span className="text-xs font-bold text-slate-800">Acesso ao Módulo Gestão Funerária</span>
                    <input
                      type="checkbox"
                      checked={editCanAccessFuneraria}
                      onChange={(e) => setEditCanAccessFuneraria(e.target.checked)}
                      className="h-4 w-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                {(user ? editingUser.uid !== user.uid : (!editingUser.email.includes('lucas') && editingUser.email !== 'marketing@bahiaprev.com.br')) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingUser(editingUser);
                      setEditingUser(null);
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    <span>Excluir Usuário</span>
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEditUser}
                    disabled={savingEdit || !editName.trim()}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {savingEdit ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <span>Salvar Alterações</span>
                    )}
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Delete User Modal */}
      <AnimatePresence>
        {deletingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 border border-slate-200"
            >
              <div className="flex items-center gap-3 text-rose-600 border-b border-slate-100 pb-3">
                <div className="p-2.5 bg-rose-100 rounded-2xl">
                  <Trash2 className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Excluir Usuário do Sistema</h3>
                  <p className="text-xs text-rose-600 font-bold">Ação de Administrador • {currentAdminName}</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <p>
                  Tem certeza de que deseja excluir o usuário <strong className="text-slate-900">{deletingUser.name}</strong> ({deletingUser.email})?
                </p>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 font-medium text-[11px]">
                  ⚠️ Esta ação removerá o perfil do colaborador e suas permissões do banco de dados do sistema.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setDeletingUser(null)}
                  disabled={isDeleting}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDeleteUser}
                  disabled={isDeleting}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Sim, Excluir Usuário</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
