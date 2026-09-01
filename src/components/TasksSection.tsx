import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { playNotificationSound } from '../utils/sound';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Plus, 
  Trash2, 
  Filter, 
  Search, 
  Calendar, 
  AlertCircle, 
  CheckSquare, 
  Sparkles, 
  Tag, 
  Briefcase, 
  X,
  ListTodo,
  TrendingUp,
  User,
  ShieldCheck,
  Send,
  Users,
  UserCheck,
  Paperclip,
  FileText,
  Upload,
  Eye,
  Download,
  Pencil,
  Save,
  ChevronUp,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import { SpellCheckInput, SpellCheckTextarea } from './SpellCheckField';
import { supabaseService } from '../lib/supabaseService';
import { formatUserName } from '../utils/userNameFormatter';

export interface AttachmentItem {
  id?: string;
  name: string;
  url: string;
  type?: string;
}

export interface Task {
  id: string;
  userId: string; // creator UID
  userEmail: string; // creator Email
  createdByName?: string; // creator Name
  title: string;
  description: string;
  category?: string;
  priority: 'baixa' | 'media' | 'alta';
  status: 'pendente' | 'em_andamento' | 'concluida';
  dueDate: string;
  createdAt?: string;
  createdByAdmin?: boolean;
  assignedToType: 'specific_user' | 'all' | 'me';
  assignedToName?: string;
  assignedToEmail?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentType?: string;
  attachments?: AttachmentItem[];
  // Completion / Delivery fields
  completionAttachmentName?: string;
  completionAttachmentUrl?: string;
  completionAttachmentType?: string;
  completionAttachments?: AttachmentItem[];
  completionNote?: string;
  completedAt?: string;
  completedByEmail?: string;
  completedByName?: string;
}

export const getTaskAttachments = (task: Task | null | undefined): AttachmentItem[] => {
  if (!task) return [];
  if (task.attachments && Array.isArray(task.attachments) && task.attachments.length > 0) {
    return task.attachments;
  }
  if (task.attachmentUrl) {
    return [{
      name: task.attachmentName || 'Documento Anexo',
      url: task.attachmentUrl,
      type: task.attachmentType
    }];
  }
  return [];
};

export const getTaskCompletionAttachments = (task: Task | null | undefined): AttachmentItem[] => {
  if (!task) return [];
  if (task.completionAttachments && Array.isArray(task.completionAttachments) && task.completionAttachments.length > 0) {
    return task.completionAttachments;
  }
  if (task.completionAttachmentUrl) {
    return [{
      name: task.completionAttachmentName || 'Documento de Entrega',
      url: task.completionAttachmentUrl,
      type: task.completionAttachmentType
    }];
  }
  return [];
};

export interface MemberOption {
  uid: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

export const isDirectorOrPresidentRole = (role?: string): boolean => {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  return r.includes('diretor') || r.includes('presidente') || r.includes('diretoria');
};

const DEFAULT_MEMBERS: MemberOption[] = [
  {
    uid: 'u_lucas_dev',
    name: 'Lucas Rodrigues',
    email: 'lucasrodrigues@bahiaprev.com.br',
    role: 'Analista de Marketing'
  },
  {
    uid: 'u_jairo_dir',
    name: 'Jairo Queiroz',
    email: 'jairoqueiroz@bahiaprev.com.br',
    role: 'Diretor'
  },
  {
    uid: 'u_cauan_des',
    name: 'Cauan',
    email: 'cauan@bahiaprev.com.br',
    role: 'Designer Gráfico'
  },
  {
    uid: 'u_nilton',
    name: 'Nilton',
    email: 'nilton@bahiaprev.com.br',
    role: 'Colaborador'
  },
  {
    uid: 'u_thayan',
    name: 'Thayan',
    email: 'thayan@bahiaprev.com.br',
    role: 'Colaborador'
  },
  {
    uid: 'u_vitor',
    name: 'Vitor',
    email: 'vitor@bahiaprev.com.br',
    role: 'Colaborador'
  },
  {
    uid: 'u_paulo',
    name: 'Paulo',
    email: 'paulo@bahiaprev.com.br',
    role: 'Colaborador'
  }
];

export const TasksSection: React.FC = () => {
  const { user, profile, allUsers } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [collaborators, setCollaborators] = useState<MemberOption[]>(DEFAULT_MEMBERS);
  const [loading, setLoading] = useState(true);
  const knownTaskIdsRef = useRef<Set<string> | null>(null);
  const knownTaskStatusesRef = useRef<Map<string, string> | null>(null);
  
  // Filters and search
  const [statusFilter, setStatusFilter] = useState<'abertas' | 'atrasadas' | 'concluida'>('abertas');
  const [priorityFilter, setPriorityFilter] = useState<string>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'prazo_crescente' | 'prazo_decrescente' | 'prioridade'>('prazo_crescente');
  const [selectedUserFilterForCompleted, setSelectedUserFilterForCompleted] = useState<string>('minhas');
  const [selectedSentRecipientKey, setSelectedSentRecipientKey] = useState<string | null>(null);
  const [taskScopeMode, setTaskScopeMode] = useState<'minhas' | 'enviadas'>('minhas');
  const [isMyTasksMinimized, setIsMyTasksMinimized] = useState<boolean>(false);
  const [completionToast, setCompletionToast] = useState<{ title: string; subtitle: string } | null>(null);

  const triggerCompletionToast = useCallback((taskTitle: string, recipientOrCompletedByName?: string) => {
    setCompletionToast({
      title: taskTitle,
      subtitle: recipientOrCompletedByName ? `Concluída por/para ${recipientOrCompletedByName}` : 'Tarefa concluída com sucesso!'
    });
    setTimeout(() => {
      setCompletionToast(null);
    }, 4500);
  }, []);

  // Modal for viewing task details and submitting completion delivery
  const [selectedTaskForView, setSelectedTaskForView] = useState<Task | null>(null);
  const [completionAttachmentFiles, setCompletionAttachmentFiles] = useState<AttachmentItem[]>([]);
  const [completionNoteText, setCompletionNoteText] = useState<string>('');

  // Edit completed delivery state (for task recipient / completer)
  const [isEditingCompletion, setIsEditingCompletion] = useState(false);
  const [editCompletionNoteText, setEditCompletionNoteText] = useState<string>('');
  const [editCompletionAttachmentFiles, setEditCompletionAttachmentFiles] = useState<AttachmentItem[]>([]);
  const [isSavingCompletionEdit, setIsSavingCompletionEdit] = useState(false);

  // Edit task state
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<'baixa' | 'media' | 'alta'>('media');
  const [editStatus, setEditStatus] = useState<'pendente' | 'em_andamento' | 'concluida'>('pendente');
  const [editDueDate, setEditDueDate] = useState('');
  const [editRecipient, setEditRecipient] = useState<string>('me');
  const [editAttachmentFiles, setEditAttachmentFiles] = useState<AttachmentItem[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Modal and state for purging/clearing all tasks
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [isClearingTasks, setIsClearingTasks] = useState(false);
  const hasAttemptedAutoRestoreRef = useRef(false);

  // Modal for new task
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'baixa' | 'media' | 'alta'>('media');
  const [newDueDate, setNewDueDate] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('me'); // 'me' | 'all' | email
  const [attachmentFiles, setAttachmentFiles] = useState<AttachmentItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const completionFileInputRef = useRef<HTMLInputElement | null>(null);
  const editCompletionFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    processSelectedFiles(e, (newItems) => {
      setAttachmentFiles(prev => [...prev, ...newItems]);
    });
  };

  const processSelectedFiles = (e: React.ChangeEvent<HTMLInputElement>, onFilesLoaded: (items: AttachmentItem[]) => void) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        alert(`O arquivo "${file.name}" excede o limite de 10MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const readPromises = validFiles.map(file => {
      return new Promise<AttachmentItem>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            name: file.name,
            url: (event.target?.result as string) || '',
            type: file.type
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then(newItems => {
      onFilesLoaded(newItems);
    });

    e.target.value = '';
  };

  const handleCompletionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processSelectedFiles(e, (newItems) => {
      setCompletionAttachmentFiles(prev => [...prev, ...newItems]);
    });
  };

  const removeCompletionAttachmentFile = (index: number) => {
    setCompletionAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processSelectedFiles(e, (newItems) => {
      setAttachmentFiles(prev => [...prev, ...newItems]);
    });
  };

  const removeAttachmentFile = (index: number) => {
    setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const userRole = profile?.role || 'Colaborador';
  const userEmail = user?.email || 'colaborador@bahiaprev.com.br';
  const userId = user?.uid || 'guest';
  const userName = profile?.name || userEmail.split('@')[0];

  const isCauan = userEmail.toLowerCase().includes('cauan') || userName.toLowerCase().includes('cauan');

  const canCreateTasksPermission = profile?.canCreateTasks !== undefined
    ? Boolean(profile.canCreateTasks)
    : (!isCauan && (
        userRole.toLowerCase().includes('admin') || 
        userRole.toLowerCase().includes('diretor') || 
        userRole.toLowerCase().includes('marketing') ||
        userRole.toLowerCase().includes('analista') ||
        userRole.toLowerCase().includes('gerente') ||
        userEmail === 'marketing@bahiaprev.com.br' ||
        userEmail === 'lucasrodrigues@bahiaprev.com.br' ||
        userEmail === 'jairoqueiroz@bahiaprev.com.br' ||
        userEmail.toLowerCase().includes('nilton')
      ));

  const isAdmin = canCreateTasksPermission;

  // Derive registered team members from allUsers
  useEffect(() => {
    const map: Record<string, MemberOption> = {
      'lucas': {
        uid: 'u_lucas_dev',
        name: 'Lucas Rodrigues',
        email: 'lucasrodrigues@bahiaprev.com.br',
        role: 'Analista de Marketing'
      },
      'jairo': {
        uid: 'u_jairo_dir',
        name: 'Jairo Queiroz',
        email: 'jairoqueiroz@bahiaprev.com.br',
        role: 'Diretor'
      },
      'cauan': {
        uid: 'u_cauan_des',
        name: 'Cauan',
        email: 'cauan@bahiaprev.com.br',
        role: 'Designer Gráfico'
      },
      'nilton': {
        uid: 'u_nilton',
        name: 'Nilton',
        email: 'nilton@bahiaprev.com.br',
        role: 'Colaborador'
      },
      'thayan': {
        uid: 'u_thayan',
        name: 'Thayan',
        email: 'thayan@bahiaprev.com.br',
        role: 'Colaborador'
      },
      'vitor': {
        uid: 'u_vitor',
        name: 'Vitor',
        email: 'vitor@bahiaprev.com.br',
        role: 'Colaborador'
      },
      'paulo': {
        uid: 'u_paulo',
        name: 'Paulo',
        email: 'paulo@bahiaprev.com.br',
        role: 'Colaborador'
      }
    };

    allUsers.forEach((uData) => {
      const email = (uData.email || '').toLowerCase();
      const name = (uData.name || '').toLowerCase();

      if (email.includes('lucas') || name.includes('lucas') || name.includes('analista') || email === 'marketing@bahiaprev.com.br') {
        let resolvedName = uData.name || 'Lucas Rodrigues';
        if (resolvedName === 'Analista de Marketing' || resolvedName === 'Lucas' || resolvedName === 'marketing') {
          resolvedName = 'Lucas Rodrigues';
        }
        map['lucas'] = {
          uid: uData.uid || 'u_lucas_dev',
          name: resolvedName,
          email: 'lucasrodrigues@bahiaprev.com.br',
          role: uData.role || 'Analista de Marketing',
          avatarUrl: uData.avatarUrl || map['lucas']?.avatarUrl
        };
      } else if (email.includes('jairo') || name.includes('jairo')) {
        map['jairo'] = {
          uid: uData.uid,
          name: uData.name || 'Jairo Queiroz',
          email: 'jairoqueiroz@bahiaprev.com.br',
          role: uData.role || 'Diretor',
          avatarUrl: uData.avatarUrl || map['jairo']?.avatarUrl
        };
      } else if (email.includes('cauan') || name.includes('cauan')) {
        map['cauan'] = {
          uid: uData.uid,
          name: (uData.name && uData.name.toLowerCase() !== 'cauan' && uData.name.toLowerCase() !== 'colaborador' && !uData.name.includes('@')) ? uData.name : 'Cauan',
          email: 'cauan@bahiaprev.com.br',
          role: uData.role || 'Designer Gráfico',
          avatarUrl: uData.avatarUrl || map['cauan']?.avatarUrl
        };
      } else if (email.includes('nilton') || name.includes('nilton')) {
        map['nilton'] = {
          uid: uData.uid,
          name: (uData.name && !uData.name.includes('@')) ? uData.name : 'Nilton',
          email: uData.email || 'nilton@bahiaprev.com.br',
          role: uData.role || 'Colaborador',
          avatarUrl: uData.avatarUrl || map['nilton']?.avatarUrl
        };
      } else if (email.includes('thay') || name.includes('thay')) {
        map['thayan'] = {
          uid: uData.uid,
          name: (uData.name && !uData.name.includes('@')) ? uData.name : 'Thayan',
          email: uData.email || 'thayan@bahiaprev.com.br',
          role: uData.role || 'Colaborador',
          avatarUrl: uData.avatarUrl || map['thayan']?.avatarUrl
        };
      } else if (email.includes('vitor') || name.includes('vitor')) {
        map['vitor'] = {
          uid: uData.uid,
          name: (uData.name && !uData.name.includes('@')) ? uData.name : 'Vitor',
          email: uData.email || 'vitor@bahiaprev.com.br',
          role: uData.role || 'Colaborador',
          avatarUrl: uData.avatarUrl || map['vitor']?.avatarUrl
        };
      } else if (email.includes('paulo') || name.includes('paulo')) {
        map['paulo'] = {
          uid: uData.uid,
          name: (uData.name && uData.name.toLowerCase() !== 'paulo' && uData.name.toLowerCase() !== 'colaborador' && !uData.name.includes('@')) ? uData.name : 'Paulo',
          email: uData.email || 'paulo@bahiaprev.com.br',
          role: uData.role || 'Colaborador',
          avatarUrl: uData.avatarUrl || map['paulo']?.avatarUrl
        };
      } else {
        map[uData.uid] = {
          uid: uData.uid,
          name: formatUserName(uData.name, uData.email),
          email: uData.email,
          role: uData.role || 'Colaborador',
          avatarUrl: uData.avatarUrl
        };
      }
    });

    if (profile?.avatarUrl && user) {
      const pEmail = (profile.email || user.email || '').toLowerCase();
      const pName = (profile.name || '').toLowerCase();

      Object.keys(map).forEach(key => {
        const c = map[key];
        const cEmail = (c.email || '').toLowerCase();
        const cName = (c.name || '').toLowerCase();
        if ((pEmail && cEmail && pEmail === cEmail) || (pName && cName && (pName === cName || cName.includes(pName) || pName.includes(cName)))) {
          c.avatarUrl = profile.avatarUrl;
        }
      });
    }

    setCollaborators(Object.values(map));
  }, [allUsers, profile, user]);

  // Helper to retrieve user photo / avatarUrl across profile, collaborators, and allUsers
  const getAvatarForUser = useCallback((email?: string, name?: string, uid?: string): string | undefined => {
    const e = (email || '').toLowerCase().trim();
    const n = (name || '').toLowerCase().trim();

    // 1. Check logged in profile
    if (profile?.avatarUrl) {
      const pEmail = (profile.email || '').toLowerCase().trim();
      const pName = (profile.name || '').toLowerCase().trim();
      if ((e && pEmail && e === pEmail) ||
          (n && pName && (n === pName || pName.includes(n) || n.includes(pName))) ||
          (uid && user && uid === user.uid)) {
        return profile.avatarUrl;
      }
    }

    // 2. Check collaborators list
    const foundCollab = collaborators.find(c => {
      const cEmail = (c.email || '').toLowerCase().trim();
      const cName = (c.name || '').toLowerCase().trim();
      return (e && cEmail && e === cEmail) ||
             (n && cName && (n === cName || cName.includes(n) || n.includes(cName))) ||
             (uid && c.uid === uid);
    });
    if (foundCollab?.avatarUrl) return foundCollab.avatarUrl;

    // 3. Check allUsers
    const foundUser = allUsers.find(u => {
      const uEmail = (u.email || '').toLowerCase().trim();
      const uName = (u.name || '').toLowerCase().trim();
      return (e && uEmail && e === uEmail) ||
             (n && uName && (n === uName || uName.includes(n) || n.includes(uName))) ||
             (uid && u.uid === uid);
    });
    if (foundUser?.avatarUrl) return foundUser.avatarUrl;

    return undefined;
  }, [profile, user, collaborators, allUsers]);

  // Helper to identify Lucas / Marketing manager
  const isLucasUser = useCallback((email?: string, name?: string) => {
    const e = (email || '').toLowerCase().trim();
    const n = (name || '').toLowerCase().trim();
    return e.includes('lucas') || n.includes('lucas') || n.includes('analista') || e.includes('marketing') || e === 'marketing@bahiaprev.com.br' || e === 'institutojairoqueiroz@gmail.com';
  }, []);

  // Helper to check if a task should be visible to the current user
  const isTargetedToUser = useCallback((task: Task) => {
    const myEmail = (userEmail || '').toLowerCase().trim();
    const myName = (userName || '').toLowerCase().trim();
    const myUid = userId;
    const myFirstName = myName.split(' ')[0] || '';
    const emailPrefix = myEmail ? myEmail.split('@')[0] : '';

    const isMyLucas = isLucasUser(myEmail, myName);
    const myIsAdmin = isAdmin || isMyLucas || myEmail.includes('jairo') || userRole.toLowerCase().includes('admin') || userRole.toLowerCase().includes('diretor');

    // Administrators and Managers have full visibility to oversee all assignments and statuses
    if (myIsAdmin) {
      return true;
    }

    const assignedEmail = (task.assignedToEmail || '').toLowerCase().trim();
    const assignedName = (task.assignedToName || '').toLowerCase().trim();
    const creatorEmail = (task.userEmail || '').toLowerCase().trim();
    const creatorUid = task.userId;
    const createdByName = (task.createdByName || '').toLowerCase().trim();
    const completedByEmail = (task.completedByEmail || '').toLowerCase().trim();
    const completedByName = (task.completedByName || '').toLowerCase().trim();
    const rawAssignedTo = ((task as any).assignedTo || '').toLowerCase().trim();

    // 1. Task assigned to all
    if (task.assignedToType === 'all' || assignedEmail === 'todos@bahiaprev.com.br' || assignedName.includes('todos') || rawAssignedTo === 'all' || rawAssignedTo.includes('todos')) {
      return true;
    }

    // 2. Task created by this user (Sender)
    if ((myUid && creatorUid && creatorUid === myUid) || 
        (myEmail && creatorEmail && (creatorEmail === myEmail || creatorEmail.includes(myEmail) || myEmail.includes(creatorEmail)))) {
      return true;
    }

    if (myName && createdByName && (createdByName.includes(myName) || myName.includes(createdByName))) {
      return true;
    }

    if (myFirstName && myFirstName.length >= 2 && createdByName && (createdByName.includes(myFirstName) || myFirstName.includes(createdByName))) {
      return true;
    }

    // 3. Task assigned directly to this user (Recipient)
    if (myUid && (task as any).assignedToUid && (task as any).assignedToUid === myUid) {
      return true;
    }

    if (myEmail && assignedEmail && (assignedEmail === myEmail || assignedEmail.includes(myEmail) || myEmail.includes(assignedEmail))) {
      return true;
    }

    // Special alias matching for recipients: Nilton, Thayan/Thaya, Vitor, Paulo, Cauan, Jairo
    const isMyThayan = myEmail.includes('thay') || myName.includes('thay');
    const isTaskThayan = assignedEmail.includes('thay') || assignedName.includes('thay') || rawAssignedTo.includes('thay');
    if (isMyThayan && isTaskThayan) return true;

    const isMyNilton = myEmail.includes('nilton') || myName.includes('nilton');
    const isTaskNilton = assignedEmail.includes('nilton') || assignedName.includes('nilton') || rawAssignedTo.includes('nilton');
    if (isMyNilton && isTaskNilton) return true;

    const isMyVitor = myEmail.includes('vitor') || myName.includes('vitor');
    const isTaskVitor = assignedEmail.includes('vitor') || assignedName.includes('vitor') || rawAssignedTo.includes('vitor');
    if (isMyVitor && isTaskVitor) return true;

    const isMyPaulo = myEmail.includes('paulo') || myName.includes('paulo');
    const isTaskPaulo = assignedEmail.includes('paulo') || assignedName.includes('paulo') || rawAssignedTo.includes('paulo');
    if (isMyPaulo && isTaskPaulo) return true;

    const isMyCauan = myEmail.includes('cauan') || myName.includes('cauan');
    const isTaskCauan = assignedEmail.includes('cauan') || assignedName.includes('cauan') || rawAssignedTo.includes('cauan');
    if (isMyCauan && isTaskCauan) return true;

    const isMyJairo = myEmail.includes('jairo') || myName.includes('jairo');
    const isTaskJairo = assignedEmail.includes('jairo') || assignedName.includes('jairo') || rawAssignedTo.includes('jairo');
    if (isMyJairo && isTaskJairo) return true;

    if (myName && assignedName && (assignedName.includes(myName) || myName.includes(assignedName))) {
      return true;
    }

    if (myFirstName && myFirstName.length >= 2 && assignedName && (assignedName.includes(myFirstName) || myFirstName.includes(assignedName))) {
      return true;
    }

    if (emailPrefix && emailPrefix.length >= 2 && (assignedEmail.includes(emailPrefix) || assignedName.includes(emailPrefix) || rawAssignedTo.includes(emailPrefix))) {
      return true;
    }

    if (myFirstName && myFirstName.length >= 2 && rawAssignedTo.includes(myFirstName)) {
      return true;
    }

    // 4. Task completed by this user
    if (myEmail && completedByEmail && (completedByEmail === myEmail || completedByEmail.includes(myEmail) || myEmail.includes(completedByEmail))) {
      return true;
    }

    if (myName && completedByName && (completedByName.includes(myName) || myName.includes(completedByName))) {
      return true;
    }

    if (myFirstName && myFirstName.length >= 2 && completedByName && (completedByName.includes(myFirstName) || myFirstName.includes(completedByName))) {
      return true;
    }

    return false;
  }, [userEmail, userName, userId, isAdmin, userRole, isLucasUser]);

  // Default initial tasks (returns empty array to keep system completely clean when cleared)
  const getDefaultTasks = useCallback((): Task[] => {
    return [];
  }, []);

  // Safe localStorage helper to prevent QuotaExceededError
  const safeSaveTasksLocally = useCallback((uId: string | undefined, list: Task[]) => {
    try {
      // Strip large data: base64 URLs for localStorage cache to stay well below browser limit
      const cleanList = list.map(t => ({
        ...t,
        attachments: (t.attachments || []).map(a => ({
          name: a.name,
          url: (a.url && a.url.startsWith('data:')) ? '' : a.url,
          type: a.type
        })),
        completionAttachments: (t.completionAttachments || []).map(a => ({
          name: a.name,
          url: (a.url && a.url.startsWith('data:')) ? '' : a.url,
          type: a.type
        })),
        attachmentUrl: (t.attachmentUrl && t.attachmentUrl.startsWith('data:')) ? '' : t.attachmentUrl,
        completionAttachmentUrl: (t.completionAttachmentUrl && t.completionAttachmentUrl.startsWith('data:')) ? '' : t.completionAttachmentUrl
      }));

      const serialized = JSON.stringify(cleanList);
      if (uId) {
        localStorage.setItem(`tasks_v2_${uId}`, serialized);
      }
      localStorage.setItem('tasks_v2_global', serialized);
    } catch (e) {
      // If browser storage is full, quietly clear older cached tasks keys
      try {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('tasks_v1_') || k.startsWith('tasks_backup_')) {
            localStorage.removeItem(k);
          }
        });
      } catch {
        // ignore
      }
    }
  }, []);

  // Save local backup without throwing
  const saveTasksLocally = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    safeSaveTasksLocally(userId, updatedTasks);
  };

  // Sync tasks directly from Supabase
  const loadTasksFromSupabase = useCallback(async () => {
    try {
      const taskMap = new Map<string, Task>();

      // Fetch from Supabase
      try {
        const rawData = await supabaseService.fetchTasks();
        if (rawData && Array.isArray(rawData)) {
          rawData.forEach((item: Task) => {
            if (item && item.id) {
              taskMap.set(item.id, item);
            }
          });
        }
      } catch (err) {
        console.warn('Erro ao ler tarefas do Supabase:', err);
      }

      const loaded = Array.from(taskMap.values());
      loaded.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      if (knownTaskIdsRef.current === null) {
        knownTaskIdsRef.current = new Set(loaded.map((t) => t.id));
        knownTaskStatusesRef.current = new Map(loaded.map((t) => [t.id, t.status]));
      } else {
        const hasNewTask = loaded.some((t) => !knownTaskIdsRef.current!.has(t.id));
        const hasNewlyCompletedTask = loaded.some((t) => {
          const prevStatus = knownTaskStatusesRef.current?.get(t.id);
          return prevStatus && prevStatus !== 'concluida' && t.status === 'concluida';
        });

        if (hasNewlyCompletedTask) {
          playNotificationSound('task_complete');
          const newlyCompleted = loaded.find((t) => {
            const prevStatus = knownTaskStatusesRef.current?.get(t.id);
            return prevStatus && prevStatus !== 'concluida' && t.status === 'concluida';
          });
          if (newlyCompleted) {
            triggerCompletionToast(newlyCompleted.title, newlyCompleted.completedByName || newlyCompleted.assignedToName);
          }
        } else if (hasNewTask) {
          playNotificationSound('task');
        }

        knownTaskIdsRef.current = new Set(loaded.map((t) => t.id));
        knownTaskStatusesRef.current = new Map(loaded.map((t) => [t.id, t.status]));
      }

      setTasks((prevTasks) => {
        // Merge Supabase loaded tasks with any locally created tasks in prevTasks that are less than 60s old and not yet in Supabase result
        const mergedMap = new Map<string, Task>();
        loaded.forEach((t) => mergedMap.set(t.id, t));

        const now = Date.now();
        prevTasks.forEach((pt) => {
          if (!mergedMap.has(pt.id)) {
            const createdTime = new Date(pt.createdAt || 0).getTime();
            // Preserve recent local task (less than 60 seconds old) until Supabase sync confirms it
            if (now - createdTime < 60000) {
              mergedMap.set(pt.id, pt);
            }
          }
        });

        const finalTasks = Array.from(mergedMap.values());
        finalTasks.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        const hasChanged =
          prevTasks.length !== finalTasks.length ||
          prevTasks.some((pt, i) => {
            const ft = finalTasks[i];
            return (
              !ft ||
              pt.id !== ft.id ||
              pt.status !== ft.status ||
              pt.completedAt !== ft.completedAt ||
              pt.title !== ft.title ||
              pt.description !== ft.description ||
              pt.assignedToName !== ft.assignedToName ||
              pt.assignedToEmail !== ft.assignedToEmail ||
              pt.priority !== ft.priority
            );
          });

        if (hasChanged) {
          safeSaveTasksLocally(userId, finalTasks);
          return finalTasks;
        }
        return prevTasks;
      });
    } catch (err) {
      console.warn('Erro ao sincronizar tarefas:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, triggerCompletionToast, safeSaveTasksLocally]);

  useEffect(() => {
    const savedLocal = localStorage.getItem(`tasks_v2_${userId}`) || localStorage.getItem('tasks_v2_global');
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTasks(parsed);
        }
      } catch (e) {
        // ignore
      }
    }

    loadTasksFromSupabase();

    // Smart polling: every 15 seconds, only when tab is visible
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadTasksFromSupabase();
      }
    }, 15000);

    const handleFocus = () => {
      if (!document.hidden) {
        loadTasksFromSupabase();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [userId, loadTasksFromSupabase, isTargetedToUser]);

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateTasksPermission) {
      alert('Seu perfil não possui permissão para criar ou atribuir tarefas.');
      setIsModalOpen(false);
      return;
    }
    if (!newTitle.trim()) return;

    setSubmitting(true);

    if (selectedRecipient !== 'me' && selectedRecipient !== 'all') {
      const targetMember = collaborators.find(c => c.email === selectedRecipient);
      const targetUser = allUsers.find(u => u.email === selectedRecipient);
      const targetRole = targetMember?.role || targetUser?.role;
      if (isDirectorOrPresidentRole(targetRole) || selectedRecipient.toLowerCase().includes('jairo')) {
        alert('Nenhum usuário pode enviar tarefas para o cargo de Diretor/Presidente.');
        setSubmitting(false);
        return;
      }
    }

    let assignedType: 'specific_user' | 'all' | 'me' = 'me';
    let assignedName = userName;
    let assignedEmail = userEmail;

    if (selectedRecipient === 'all') {
      assignedType = 'all';
      assignedName = 'Todos os Colaboradores';
      assignedEmail = 'todos@bahiaprev.com.br';
    } else if (selectedRecipient !== 'me') {
      assignedType = 'specific_user';
      const targetMember = collaborators.find(c => c.email === selectedRecipient);
      if (targetMember) {
        assignedName = targetMember.name;
        assignedEmail = targetMember.email;
      } else {
        assignedName = selectedRecipient;
        assignedEmail = selectedRecipient;
      }
    }

    const newTaskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const createdTask: Task = {
      id: newTaskId,
      userId,
      userEmail,
      createdByName: `${userName} (${userRole})`,
      title: newTitle.trim(),
      description: newDescription.trim(),
      category: 'Geral',
      priority: newPriority,
      status: 'pendente',
      dueDate: newDueDate || new Date().toISOString().split('T')[0],
      createdByAdmin: isAdmin,
      assignedToType: assignedType,
      assignedToName: assignedName,
      assignedToEmail: assignedEmail,
      attachments: attachmentFiles,
      ...(attachmentFiles.length > 0 ? {
        attachmentName: attachmentFiles[0].name,
        attachmentUrl: attachmentFiles[0].url,
        attachmentType: attachmentFiles[0].type,
      } : {}),
      createdAt: new Date().toISOString()
    };

    saveTasksLocally([createdTask, ...tasks]);
    playNotificationSound('task');

    try {
      await supabaseService.saveTask(createdTask);
      loadTasksFromSupabase();
    } catch (err) {
      console.warn('Erro ao salvar tarefa no Supabase:', err);
    } finally {
      setSubmitting(false);
      setNewTitle('');
      setNewDescription('');
      setNewDueDate('');
      setSelectedRecipient('me');
      setAttachmentFiles([]);
      setIsModalOpen(false);
    }
  };

  // Handle Toggle Status (Marcar como Concluída ou Reabrir)
  const handleToggleStatus = async (task: Task) => {
    const isCompleting = task.status !== 'concluida';
    const now = new Date().toISOString();

    let updatedTask: Task;

    if (isCompleting) {
      updatedTask = {
        ...task,
        status: 'concluida',
        completedAt: now,
        completedByEmail: userEmail || '',
        completedByName: userName || 'Colaborador',
      };

      if (completionAttachmentFiles.length > 0) {
        updatedTask.completionAttachments = completionAttachmentFiles;
        updatedTask.completionAttachmentName = completionAttachmentFiles[0]?.name || '';
        updatedTask.completionAttachmentUrl = completionAttachmentFiles[0]?.url || '';
        updatedTask.completionAttachmentType = completionAttachmentFiles[0]?.type || '';
      }
      if (completionNoteText.trim()) {
        updatedTask.completionNote = completionNoteText.trim();
      }

      playNotificationSound('task_complete');
      triggerCompletionToast(task.title, userName || 'Colaborador');
      setCompletionAttachmentFiles([]);
      setCompletionNoteText('');
    } else {
      // Reopening task (reset completion fields)
      updatedTask = {
        ...task,
        status: 'pendente',
        completedAt: undefined,
        completedByEmail: undefined,
        completedByName: undefined,
        completionNote: undefined,
        completionAttachmentName: undefined,
        completionAttachmentUrl: undefined,
        completionAttachmentType: undefined,
        completionAttachments: undefined,
      };
    }

    const updatedTasksList = tasks.map((t) => (t.id === task.id ? updatedTask : t));
    saveTasksLocally(updatedTasksList);

    if (selectedTaskForView?.id === task.id) {
      setSelectedTaskForView(updatedTask);
    }

    try {
      await supabaseService.saveTask(updatedTask);
    } catch (err) {
      console.warn('Erro ao atualizar status da tarefa no Supabase:', err);
    }
  };

  // Handle Save Completion Delivery with attachment and note
  const handleSaveCompletionDelivery = async (task: Task) => {
    const now = new Date().toISOString();
    const updatePayload: Partial<Task> = {
      status: 'concluida',
      completedAt: now,
      completedByEmail: userEmail || '',
      completedByName: userName || 'Colaborador',
    };

    playNotificationSound('task_complete');
    triggerCompletionToast(task.title, userName || 'Colaborador');

    if (completionAttachmentFiles.length > 0) {
      updatePayload.completionAttachments = completionAttachmentFiles;
      updatePayload.completionAttachmentName = completionAttachmentFiles[0].name;
      updatePayload.completionAttachmentUrl = completionAttachmentFiles[0].url;
      updatePayload.completionAttachmentType = completionAttachmentFiles[0].type;
    }
    if (completionNoteText.trim()) {
      updatePayload.completionNote = completionNoteText.trim();
    }

    const updatedTask: Task = {
      ...task,
      ...updatePayload,
    };

    const updatedTasks = tasks.map((t) => (t.id === task.id ? updatedTask : t));
    saveTasksLocally(updatedTasks);

    if (selectedTaskForView?.id === task.id) {
      setSelectedTaskForView(updatedTask);
    }

    setCompletionAttachmentFiles([]);
    setCompletionNoteText('');

    try {
      await supabaseService.saveTask(updatedTask);
    } catch (err) {
      console.warn('Erro ao salvar entrega no Supabase:', err);
    }
  };

  const handleEditCompletionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processSelectedFiles(e, (newItems) => {
      setEditCompletionAttachmentFiles(prev => [...prev, ...newItems]);
    });
  };

  const removeEditCompletionFile = (index: number) => {
    setEditCompletionAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openEditCompletionMode = (task: Task) => {
    setSelectedTaskForView(task);
    setIsEditingTask(false);
    setEditCompletionNoteText(task.completionNote || '');
    setEditCompletionAttachmentFiles(getTaskCompletionAttachments(task));
    setIsEditingCompletion(true);
  };

  const handleSaveUpdatedCompletionDelivery = async (task: Task) => {
    setIsSavingCompletionEdit(true);

    const updatePayload: Record<string, any> = {
      completionNote: editCompletionNoteText.trim(),
      completionAttachments: editCompletionAttachmentFiles,
      completionAttachmentName: editCompletionAttachmentFiles[0]?.name || '',
      completionAttachmentUrl: editCompletionAttachmentFiles[0]?.url || '',
      completionAttachmentType: editCompletionAttachmentFiles[0]?.type || '',
    };

    const updatedTask: Task = {
      ...task,
      ...updatePayload,
    };

    const updatedTasks = tasks.map((t) => (t.id === task.id ? updatedTask : t));
    saveTasksLocally(updatedTasks);

    if (selectedTaskForView?.id === task.id) {
      setSelectedTaskForView(updatedTask);
    }

    try {
      await supabaseService.saveTask(updatedTask);
    } catch (err) {
      console.warn('Erro ao atualizar entrega no Supabase:', err);
    }

    setIsSavingCompletionEdit(false);
    setIsEditingCompletion(false);
  };

  // Helper to verify if the current user is the assigner/creator of the task
  const isTaskAssignedByMe = useCallback((task: Task | null) => {
    if (!task) return false;

    const myEmailClean = (userEmail || '').toLowerCase().trim();
    const myNameClean = (userName || '').toLowerCase().trim();
    const myFirstNameClean = myNameClean.split(' ')[0] || '';
    const myUid = userId;

    const creatorEmail = (task.userEmail || '').toLowerCase().trim();
    const creatorUid = task.userId;
    const createdByName = (task.createdByName || '').toLowerCase().trim();

    if (myUid && creatorUid && myUid === creatorUid) {
      return true;
    }

    if (myEmailClean && creatorEmail && (creatorEmail === myEmailClean || creatorEmail.includes(myEmailClean) || myEmailClean.includes(creatorEmail))) {
      return true;
    }

    if (myNameClean && myNameClean.length > 2 && createdByName && (createdByName.includes(myNameClean) || myNameClean.includes(createdByName))) {
      return true;
    }

    if (myFirstNameClean && myFirstNameClean.length >= 3 && createdByName && createdByName.includes(myFirstNameClean)) {
      return true;
    }

    const isMeLucas = isLucasUser(myEmailClean, myNameClean);
    const isCreatorLucas = isLucasUser(creatorEmail, createdByName);
    if (isMeLucas && isCreatorLucas) {
      return true;
    }

    return false;
  }, [userId, userEmail, userName, isLucasUser]);

  // Helper to verify if the current user has permission to delete the task (only creator or master admin)
  const canDeleteTask = useCallback((task: Task | null) => {
    if (!task) return false;
    return isTaskAssignedByMe(task) || isLucasUser(userEmail, userName);
  }, [isTaskAssignedByMe, isLucasUser, userEmail, userName]);

  // Open Task for Editing (only allowed for task creator/assigner)
  const openEditTask = (task: Task) => {
    if (!isTaskAssignedByMe(task)) {
      alert('Apenas o usuário que atribuiu esta tarefa tem permissão para editá-la.');
      return;
    }

    setSelectedTaskForView(task);
    setEditTitle(task.title || '');
    setEditDescription(task.description || '');
    setEditPriority(task.priority || 'media');
    setEditStatus(task.status || 'pendente');
    setEditDueDate(task.dueDate || '');
    setEditAttachmentFiles(getTaskAttachments(task));

    if (task.assignedToType === 'all') {
      setEditRecipient('all');
    } else if (task.assignedToType === 'me' || task.assignedToEmail === userEmail) {
      setEditRecipient('me');
    } else if (task.assignedToEmail) {
      setEditRecipient(task.assignedToEmail);
    } else {
      setEditRecipient('me');
    }

    setIsEditingTask(true);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processSelectedFiles(e, (newItems) => {
      setEditAttachmentFiles(prev => [...prev, ...newItems]);
    });
  };

  const removeEditFile = (index: number) => {
    setEditAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveTaskEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForView || !editTitle.trim()) return;

    if (!isTaskAssignedByMe(selectedTaskForView)) {
      alert('Apenas o usuário que atribuiu esta tarefa tem permissão para editá-la.');
      setIsEditingTask(false);
      return;
    }

    setIsSavingEdit(true);

    if (editRecipient !== 'me' && editRecipient !== 'all') {
      const targetMember = collaborators.find(c => c.email === editRecipient);
      const targetUser = allUsers.find(u => u.email === editRecipient);
      const targetRole = targetMember?.role || targetUser?.role;
      if (isDirectorOrPresidentRole(targetRole) || editRecipient.toLowerCase().includes('jairo')) {
        alert('Nenhum usuário pode enviar tarefas para o cargo de Diretor/Presidente.');
        setIsSavingEdit(false);
        return;
      }
    }

    let assignedType: 'specific_user' | 'all' | 'me' = 'me';
    let assignedName = userName;
    let assignedEmail = userEmail;

    if (editRecipient === 'all') {
      assignedType = 'all';
      assignedName = 'Todos os Colaboradores';
      assignedEmail = 'todos@bahiaprev.com.br';
    } else if (editRecipient !== 'me') {
      assignedType = 'specific_user';
      const targetMember = collaborators.find(c => c.email === editRecipient);
      if (targetMember) {
        assignedName = targetMember.name;
        assignedEmail = targetMember.email;
      } else {
        assignedName = editRecipient;
        assignedEmail = editRecipient;
      }
    }

    const updatePayload: Partial<Task> = {
      title: editTitle.trim(),
      description: editDescription.trim(),
      priority: editPriority,
      status: editStatus,
      dueDate: editDueDate,
      assignedToType: assignedType,
      assignedToName: assignedName,
      assignedToEmail: assignedEmail,
      attachments: editAttachmentFiles,
      attachmentName: editAttachmentFiles[0]?.name || '',
      attachmentUrl: editAttachmentFiles[0]?.url || '',
      attachmentType: editAttachmentFiles[0]?.type || '',
    };

    if (editStatus === 'concluida' && selectedTaskForView.status !== 'concluida') {
      const now = new Date().toISOString();
      updatePayload.completedAt = now;
      updatePayload.completedByEmail = userEmail;
      updatePayload.completedByName = userName;
      playNotificationSound('task_complete');
      triggerCompletionToast(editTitle, userName);
    } else if (editStatus !== 'concluida' && selectedTaskForView.status === 'concluida') {
      updatePayload.completedAt = undefined;
      updatePayload.completedByEmail = undefined;
      updatePayload.completedByName = undefined;
      updatePayload.completionNote = undefined;
      updatePayload.completionAttachmentName = undefined;
      updatePayload.completionAttachmentUrl = undefined;
      updatePayload.completionAttachmentType = undefined;
      updatePayload.completionAttachments = undefined;
    }

    const updatedTask: Task = {
      ...selectedTaskForView,
      ...updatePayload,
    };

    const updatedTasksList = tasks.map(t => t.id === selectedTaskForView.id ? updatedTask : t);
    saveTasksLocally(updatedTasksList);
    setSelectedTaskForView(updatedTask);

    try {
      await supabaseService.saveTask(updatedTask);
    } catch (err) {
      console.warn('Erro ao salvar edição no Supabase:', err);
    }

    setIsSavingEdit(false);
    setIsEditingTask(false);
  };

  // Handle Delete Task (strictly protected: only creator or master admin can delete)
  const handleDeleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    if (taskToDelete && !canDeleteTask(taskToDelete)) {
      alert('Apenas quem criou/atribuiu esta tarefa tem permissão para excluí-la.');
      return;
    }

    const updated = tasks.filter((t) => t.id !== taskId);
    saveTasksLocally(updated);
    if (selectedTaskForView?.id === taskId) {
      setSelectedTaskForView(null);
    }
    try {
      await supabaseService.deleteTask(taskId);
    } catch (err) {
      console.warn('Erro ao excluir tarefa no Supabase:', err);
    }
  };

  // Purge/Clear All Tasks
  const handleClearAllTasks = async () => {
    setIsClearingTasks(true);
    try {
      for (const task of tasks) {
        await supabaseService.deleteTask(task.id);
      }

      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('tasks_')) {
          localStorage.removeItem(key);
        }
      });

      setTasks([]);
      setSelectedTaskForView(null);
    } catch (err) {
      console.error('Erro ao excluir histórico de tarefas:', err);
      alert('Ocorreu um erro ao tentar limpar as tarefas.');
    } finally {
      setIsClearingTasks(false);
      setShowClearConfirmModal(false);
    }
  };

  // Overdue calculation helper
  const todayStr = new Date().toISOString().split('T')[0];
  const isTaskOverdue = (task: Task) => {
    if (task.status === 'concluida') return false;
    if (!task.dueDate) return false;
    return task.dueDate < todayStr;
  };

  // Filter tasks to only those the current user is authorized to view
  const visibleTasks = tasks.filter(isTargetedToUser);

  // Calculations
  const totalTasks = visibleTasks.length;
  const completedTasks = visibleTasks.filter((t) => t.status === 'concluida').length;
  const overdueTasksCount = visibleTasks.filter((t) => isTaskOverdue(t)).length;
  const openTasksCount = visibleTasks.filter((t) => t.status !== 'concluida' && !isTaskOverdue(t)).length;

  const myEmail = (userEmail || '').toLowerCase().trim();
  const myName = (userName || '').toLowerCase().trim();
  const myFirstName = myName.split(' ')[0] || '';

  const isTaskBelongsToMe = (task: Task) => {
    const assignedEmail = (task.assignedToEmail || '').toLowerCase().trim();
    const assignedName = (task.assignedToName || '').toLowerCase().trim();
    const completedEmail = (task.completedByEmail || '').toLowerCase().trim();
    const completedName = (task.completedByName || '').toLowerCase().trim();

    const isMeLucas = isLucasUser(myEmail, myName);
    const isAssignedLucas = isLucasUser(assignedEmail, assignedName);

    // If explicitly assigned to another specific user (collaborator), it does NOT belong to me
    if (task.assignedToType === 'specific_user') {
      if (isMeLucas && isAssignedLucas) {
        // Belongs to me
      } else {
        const isAssignedToOtherEmail = assignedEmail && myEmail && assignedEmail !== myEmail;
        const isAssignedToOtherName = assignedName && myName && !assignedName.includes(myName) && !myName.includes(assignedName);
        if (isAssignedToOtherEmail && isAssignedToOtherName) {
          return false;
        }
      }
    }

    // Check if task is assigned to me or completed by me
    if (task.assignedToType === 'me') {
      return true;
    }

    if (isMeLucas && isAssignedLucas) {
      return true;
    }

    if (myEmail && (assignedEmail === myEmail || completedEmail === myEmail)) {
      return true;
    }

    if (myName && myName.length > 2 && (assignedName.includes(myName) || completedName.includes(myName))) {
      return true;
    }

    if (myFirstName && myFirstName.length >= 3 && (assignedName.includes(myFirstName) || completedName.includes(myFirstName))) {
      return true;
    }

    // Direct alias matching for collaborators
    const isMyNilton = myEmail.includes('nilton') || myName.includes('nilton');
    if (isMyNilton && (assignedEmail.includes('nilton') || assignedName.includes('nilton'))) return true;

    const isMyCauan = myEmail.includes('cauan') || myName.includes('cauan');
    if (isMyCauan && (assignedEmail.includes('cauan') || assignedName.includes('cauan'))) return true;

    const isMyThayan = myEmail.includes('thay') || myName.includes('thay');
    if (isMyThayan && (assignedEmail.includes('thay') || assignedName.includes('thay'))) return true;

    const isMyVitor = myEmail.includes('vitor') || myName.includes('vitor');
    if (isMyVitor && (assignedEmail.includes('vitor') || assignedName.includes('vitor'))) return true;

    const isMyPaulo = myEmail.includes('paulo') || myName.includes('paulo');
    if (isMyPaulo && (assignedEmail.includes('paulo') || assignedName.includes('paulo'))) return true;

    return false;
  };


  const isTaskFromOtherAdminToMe = (task: Task) => {
    if (!isTaskBelongsToMe(task)) return false;

    const creatorEmail = (task.userEmail || '').toLowerCase().trim();
    const creatorName = (task.createdByName || '').toLowerCase().trim();

    const isCreatorOther = (creatorEmail && myEmail && creatorEmail !== myEmail) ||
      (creatorName && myName && !creatorName.includes(myName) && !myName.includes(creatorName));

    return (task.createdByAdmin === true || isCreatorOther) && isCreatorOther;
  };

  const isTaskOfCollaborator = (task: Task) => {
    return !isTaskBelongsToMe(task);
  };

  // Helper to check if a task belongs to or was assigned to a specific collaborator
  const isTaskAssociatedWithCollaborator = useCallback((task: Task, collab: MemberOption | null) => {
    if (!collab) return true;

    const cEmail = (collab.email || '').toLowerCase().trim();
    const cName = (collab.name || '').toLowerCase().trim();
    const cFirstName = cName.split(' ')[0] || '';

    const assignedEmail = (task.assignedToEmail || '').toLowerCase().trim();
    const assignedName = (task.assignedToName || '').toLowerCase().trim();
    const completedEmail = (task.completedByEmail || '').toLowerCase().trim();
    const completedName = (task.completedByName || '').toLowerCase().trim();

    // 1. Task assigned to everyone
    if (task.assignedToType === 'all' || assignedEmail === 'todos@bahiaprev.com.br' || assignedName.includes('todos')) {
      return true;
    }

    // 2. Direct email match on assignedToEmail or completedByEmail (strictly task assignee, NOT creator)
    if (cEmail && (assignedEmail === cEmail || completedEmail === cEmail)) {
      return true;
    }

    // 3. Alias matching for team members
    const isCollabLucas = isLucasUser(cEmail, cName);
    const isTaskAssignedLucas = isLucasUser(assignedEmail, assignedName) || isLucasUser(completedEmail, completedName);
    if (isCollabLucas && isTaskAssignedLucas) {
      return true;
    }

    const isCollabNilton = cEmail.includes('nilton') || cName.includes('nilton');
    const isTaskAssignedNilton = assignedEmail.includes('nilton') || assignedName.includes('nilton') || completedEmail.includes('nilton') || completedName.includes('nilton');
    if (isCollabNilton && isTaskAssignedNilton) return true;

    const isCollabThayan = cEmail.includes('thay') || cName.includes('thay');
    const isTaskAssignedThayan = assignedEmail.includes('thay') || assignedName.includes('thay') || completedEmail.includes('thay') || completedName.includes('thay');
    if (isCollabThayan && isTaskAssignedThayan) return true;

    const isCollabVitor = cEmail.includes('vitor') || cName.includes('vitor');
    const isTaskAssignedVitor = assignedEmail.includes('vitor') || assignedName.includes('vitor') || completedEmail.includes('vitor') || completedName.includes('vitor');
    if (isCollabVitor && isTaskAssignedVitor) return true;

    const isCollabPaulo = cEmail.includes('paulo') || cName.includes('paulo');
    const isTaskAssignedPaulo = assignedEmail.includes('paulo') || assignedName.includes('paulo') || completedEmail.includes('paulo') || completedName.includes('paulo');
    if (isCollabPaulo && isTaskAssignedPaulo) return true;

    const isCollabCauan = cEmail.includes('cauan') || cName.includes('cauan');
    const isTaskAssignedCauan = assignedEmail.includes('cauan') || assignedName.includes('cauan') || completedEmail.includes('cauan') || completedName.includes('cauan');
    if (isCollabCauan && isTaskAssignedCauan) return true;

    // 4. Name match on assignedToName or completedByName
    if (cName && cName.length > 2 && cName !== 'colaborador') {
      if ((assignedName && (assignedName.includes(cName) || cName.includes(assignedName))) ||
          (completedName && (completedName.includes(cName) || cName.includes(completedName)))) {
        return true;
      }
    }

    // 5. First name match on assignedToName or completedByName
    if (cFirstName && cFirstName.length >= 2 && cFirstName !== 'colaborador') {
      if ((assignedName && assignedName.includes(cFirstName)) ||
          (completedName && completedName.includes(cFirstName))) {
        return true;
      }
    }

    return false;
  }, [isLucasUser]);

  // Consolidate full list of team collaborators
  const allCollaboratorOptions = useMemo(() => {
    const map: Record<string, MemberOption> = {};

    (collaborators || []).forEach(c => {
      const key = (c.email || c.name || c.uid).toLowerCase().trim();
      map[key] = c;
    });

    DEFAULT_MEMBERS.forEach(m => {
      const key = (m.email || m.name || m.uid).toLowerCase().trim();
      if (!map[key]) {
        map[key] = m;
      }
    });

    visibleTasks.forEach(t => {
      if (t.assignedToName && t.assignedToType === 'specific_user') {
        const names = t.assignedToName.split(/,|\se\s|\se\/ou\s|\//i).map(s => s.trim()).filter(Boolean);
        const emails = (t.assignedToEmail || '').split(/,|\se\s|\//i).map(s => s.trim()).filter(Boolean);

        names.forEach((namePart, idx) => {
          const emailPart = emails[idx] || '';
          const key = (emailPart || namePart).toLowerCase();

          const existingKey = Object.keys(map).find(k => {
            const m = map[k];
            return k === key ||
              m.name.toLowerCase() === namePart.toLowerCase() ||
              m.name.toLowerCase().includes(namePart.toLowerCase()) ||
              namePart.toLowerCase().includes(m.name.toLowerCase()) ||
              (emailPart && m.email.toLowerCase() === emailPart.toLowerCase());
          });

          if (!existingKey) {
            map[key] = {
              uid: key,
              name: namePart,
              email: emailPart,
              role: 'Colaborador'
            };
          }
        });
      }
    });

    return Object.values(map);
  }, [collaborators, visibleTasks]);



  // Helper to check if a task matches a specific recipient
  const isTaskAssignedToRecipient = useCallback((task: Task, recipientKey: string | null) => {
    if (!recipientKey) return true;

    const rKey = recipientKey.toLowerCase().trim();
    const assignedEmail = (task.assignedToEmail || '').toLowerCase().trim();
    const assignedName = (task.assignedToName || '').toLowerCase().trim();

    if (rKey === 'todos@bahiaprev.com.br' || rKey === 'all' || rKey.includes('todos')) {
      return task.assignedToType === 'all' || assignedEmail === 'todos@bahiaprev.com.br' || assignedName.includes('todos');
    }

    if (assignedEmail && (assignedEmail === rKey || assignedEmail.includes(rKey) || rKey.includes(assignedEmail))) {
      return true;
    }

    if (assignedName && (assignedName === rKey || assignedName.includes(rKey) || rKey.includes(assignedName))) {
      return true;
    }

    // First name match
    const keyFirst = rKey.split(/[@\s._-]/)[0];
    const nameFirst = assignedName.split(/[@\s._-]/)[0];
    if (keyFirst && nameFirst && keyFirst === nameFirst && keyFirst.length >= 3) return true;

    // Direct recipient matching for team member names (Lucas, Cauan, Nilton, Thayan, Vitor, Paulo, etc.)
    if ((rKey.includes('lucas') || rKey.includes('marketing')) && (assignedEmail.includes('lucas') || assignedName.includes('lucas') || assignedEmail.includes('marketing') || assignedName.includes('marketing'))) return true;
    if (rKey.includes('cauan') && (assignedEmail.includes('cauan') || assignedName.includes('cauan'))) return true;
    if (rKey.includes('nilton') && (assignedEmail.includes('nilton') || assignedName.includes('nilton'))) return true;
    if (rKey.includes('thay') && (assignedEmail.includes('thay') || assignedName.includes('thay'))) return true;
    if (rKey.includes('vitor') && (assignedEmail.includes('vitor') || assignedName.includes('vitor'))) return true;
    if (rKey.includes('paulo') && (assignedEmail.includes('paulo') || assignedName.includes('paulo'))) return true;

    return false;
  }, []);

  const isTaskSentByMe = useCallback((task: Task) => {
    return isTaskAssignedByMe(task) && !isTaskBelongsToMe(task);
  }, [isTaskAssignedByMe, isTaskBelongsToMe]);

  // List of ONLY recipients who have ACTUALLY received tasks assigned by the logged-in user
  // If Lucas didn't assign any tasks to Jairo, Jairo will NEVER appear in this list!
  const sentRecipients = useMemo(() => {
    const map: Record<string, {
      key: string;
      name: string;
      email: string;
      role: string;
      avatarUrl?: string;
      total: number;
      open: number;
      overdue: number;
      completed: number;
    }> = {};

    const mySentTasks = visibleTasks.filter(t => isTaskAssignedByMe(t) && !isTaskBelongsToMe(t));

    mySentTasks.forEach(task => {
      let recEmail = (task.assignedToEmail || '').toLowerCase().trim();
      let recName = (task.assignedToName || '').trim();
      let recRole = 'Colaborador';

      if (task.assignedToType === 'all' || recEmail === 'todos@bahiaprev.com.br' || recName.toLowerCase().includes('todos')) {
        recEmail = 'todos@bahiaprev.com.br';
        recName = 'Todos os Colaboradores';
      }

      if (!recName) {
        recName = recEmail ? recEmail.split('@')[0] : 'Colaborador';
      }

      // Match with known members for role & avatar
      const matchedMember = allCollaboratorOptions.find(m => {
        const mEmail = (m.email || '').toLowerCase().trim();
        const mName = (m.name || '').toLowerCase().trim();
        return (recEmail && mEmail && recEmail === mEmail) ||
               (recName && mName && (mName === recName.toLowerCase() || mName.includes(recName.toLowerCase()) || recName.toLowerCase().includes(mName)));
      });

      if (matchedMember) {
        recName = matchedMember.name;
        recEmail = matchedMember.email || recEmail;
        recRole = matchedMember.role || recRole;
      }

      const key = (recEmail || recName).toLowerCase();
      if (!map[key]) {
        map[key] = {
          key,
          name: recName,
          email: recEmail,
          role: recRole,
          avatarUrl: matchedMember?.avatarUrl || getAvatarForUser(recEmail, recName),
          total: 0,
          open: 0,
          overdue: 0,
          completed: 0
        };
      }

      map[key].total += 1;
      const isOverdue = isTaskOverdue(task);
      if (task.status === 'concluida') {
        map[key].completed += 1;
      } else if (isOverdue) {
        map[key].overdue += 1;
      } else {
        map[key].open += 1;
      }
    });

    return Object.values(map);
  }, [visibleTasks, isTaskAssignedByMe, isTaskBelongsToMe, allCollaboratorOptions, getAvatarForUser, isTaskOverdue]);

  const selectedRecipientObj = useMemo(() => {
    if (!selectedSentRecipientKey) return null;
    return sentRecipients.find(r => r.key === selectedSentRecipientKey) || null;
  }, [selectedSentRecipientKey, sentRecipients]);

  const sentOpenTasksCount = useMemo(() => {
    return visibleTasks.filter(t => isTaskAssignedByMe(t) && !isTaskBelongsToMe(t) && t.status !== 'concluida' && !isTaskOverdue(t)).length;
  }, [visibleTasks, isTaskAssignedByMe, isTaskBelongsToMe]);

  const sentOverdueTasksCount = useMemo(() => {
    return visibleTasks.filter(t => isTaskAssignedByMe(t) && !isTaskBelongsToMe(t) && isTaskOverdue(t)).length;
  }, [visibleTasks, isTaskAssignedByMe, isTaskBelongsToMe]);

  const sentCompletedTasksCount = useMemo(() => {
    return visibleTasks.filter(t => isTaskAssignedByMe(t) && !isTaskBelongsToMe(t) && t.status === 'concluida').length;
  }, [visibleTasks, isTaskAssignedByMe, isTaskBelongsToMe]);

  const sentTotalTasksCount = useMemo(() => {
    return visibleTasks.filter(t => isTaskAssignedByMe(t) && !isTaskBelongsToMe(t)).length;
  }, [visibleTasks, isTaskAssignedByMe, isTaskBelongsToMe]);

  const activeSentOpenCount = useMemo(() => {
    if (selectedRecipientObj) return selectedRecipientObj.open;
    return sentOpenTasksCount;
  }, [selectedRecipientObj, sentOpenTasksCount]);

  const activeSentOverdueCount = useMemo(() => {
    if (selectedRecipientObj) return selectedRecipientObj.overdue;
    return sentOverdueTasksCount;
  }, [selectedRecipientObj, sentOverdueTasksCount]);

  const activeSentCompletedCount = useMemo(() => {
    if (selectedRecipientObj) return selectedRecipientObj.completed;
    return sentCompletedTasksCount;
  }, [selectedRecipientObj, sentCompletedTasksCount]);

  const activeSentTotalCount = useMemo(() => {
    if (selectedRecipientObj) return selectedRecipientObj.total;
    return sentTotalTasksCount;
  }, [selectedRecipientObj, sentTotalTasksCount]);

  const myOpenTasksCount = useMemo(() => {
    return visibleTasks.filter(t => isTaskBelongsToMe(t) && t.status !== 'concluida' && !isTaskOverdue(t)).length;
  }, [visibleTasks, isTaskBelongsToMe]);

  const myOverdueTasksCount = useMemo(() => {
    return visibleTasks.filter(t => isTaskBelongsToMe(t) && isTaskOverdue(t)).length;
  }, [visibleTasks, isTaskBelongsToMe]);

  const myTotalTasksCount = useMemo(() => {
    return visibleTasks.filter(t => isTaskBelongsToMe(t)).length;
  }, [visibleTasks, isTaskBelongsToMe]);

  const completedTasksListAll = visibleTasks.filter((t) => t.status === 'concluida');
  const myCompletedTasksCount = completedTasksListAll.filter((t) => isTaskBelongsToMe(t)).length;
  const fromOtherAdminsCompletedCount = completedTasksListAll.filter((t) => isTaskFromOtherAdminToMe(t)).length;
  const colaboradoresCompletedCount = completedTasksListAll.filter((t) => isTaskOfCollaborator(t)).length;

  // Completed Tasks User List Grouping (Collaborators only)
  const completedUsersMap: Record<string, { name: string; email: string; count: number }> = {};
  visibleTasks.filter(t => t.status === 'concluida').forEach(t => {
    const name = t.completedByName || t.assignedToName || 'Colaborador';
    const email = t.completedByEmail || t.assignedToEmail || name;
    const key = email.toLowerCase();
    if (!completedUsersMap[key]) {
      completedUsersMap[key] = { name, email, count: 0 };
    }
    completedUsersMap[key].count += 1;
  });
  const completedUsersList = Object.values(completedUsersMap);
  const collaboratorUsersList = completedUsersList.filter(usr => {
    const isMe = (usr.email && usr.email.toLowerCase() === myEmail) || 
                 (usr.name && myName && usr.name.toLowerCase().includes(myName)) ||
                 (usr.name && myFirstName && usr.name.toLowerCase().includes(myFirstName));
    return !isMe;
  });

  // Filtered Tasks
  const filteredTasks = visibleTasks.filter((task) => {
    const overdue = isTaskOverdue(task);

    const matchesStatus = 
      statusFilter === 'abertas' ? (task.status !== 'concluida' && !overdue) :
      statusFilter === 'atrasadas' ? overdue :
      statusFilter === 'concluida' ? (task.status === 'concluida') :
      (task.status !== 'concluida' && !overdue);

    const matchesPriority = priorityFilter === 'todas' || task.priority === priorityFilter;
    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.category && task.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.assignedToName && task.assignedToName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.createdByName && task.createdByName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesScope = 
      taskScopeMode === 'minhas'
        ? isTaskBelongsToMe(task)
        : (isTaskAssignedByMe(task) && !isTaskBelongsToMe(task)) && (
            selectedSentRecipientKey
              ? isTaskAssignedToRecipient(task, selectedSentRecipientKey)
              : false
          );

    return matchesStatus && matchesPriority && matchesSearch && matchesScope;
  });

  // Sorted Tasks (Ordered with OPEN / PENDING tasks FIRST, and completed tasks at the bottom)
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // 1. Primary Rule: Open/Pending/Overdue tasks ALWAYS come before completed tasks
      const aCompleted = a.status === 'concluida';
      const bCompleted = b.status === 'concluida';
      if (!aCompleted && bCompleted) return -1;
      if (aCompleted && !bCompleted) return 1;

      // 2. If both are completed: show most recently completed / created first
      if (aCompleted && bCompleted) {
        const aComp = a.completedAt || a.createdAt || '';
        const bComp = b.completedAt || b.createdAt || '';
        return bComp.localeCompare(aComp);
      }

      // 3. For open tasks: Apply selected sort order (Prazo crescente by default)
      const aDate = a.dueDate ? a.dueDate.trim() : '';
      const bDate = b.dueDate ? b.dueDate.trim() : '';

      if (sortOrder === 'prazo_crescente') {
        // Menor prazo primeiro (datas mais próximas / urgentes no topo)
        if (aDate && !bDate) return -1;
        if (!aDate && bDate) return 1;
        if (aDate && bDate) {
          const cmp = aDate.localeCompare(bDate);
          if (cmp !== 0) return cmp;
        }
      } else if (sortOrder === 'prazo_decrescente') {
        // Maior prazo primeiro (datas mais distantes no topo)
        if (aDate && !bDate) return -1;
        if (!aDate && bDate) return 1;
        if (aDate && bDate) {
          const cmp = bDate.localeCompare(aDate);
          if (cmp !== 0) return cmp;
        }
      } else if (sortOrder === 'prioridade') {
        const pMap = { alta: 1, media: 2, baixa: 3 };
        const pA = pMap[a.priority] || 2;
        const pB = pMap[b.priority] || 2;
        if (pA !== pB) return pA - pB;
      }

      // Desempate 1: Prioridade (alta > media > baixa)
      const pMap = { alta: 1, media: 2, baixa: 3 };
      const pA = pMap[a.priority] || 2;
      const pB = pMap[b.priority] || 2;
      if (pA !== pB) return pA - pB;

      // Desempate 2: Data de criação (mais recentes primeiro)
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [filteredTasks, sortOrder]);

  // Componente Auxiliar para Renderizar a Lista de Tarefas, Busca e Filtros
  const renderTaskListSection = () => (
    <div className="space-y-4 pt-3 border-t border-slate-200/60">
      {/* Action Bar: Search, Filters, Sort & New Task Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, colaborador responsável ou criador..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Sort Order Selector */}
        <div className="flex items-center gap-1.5 shrink-0 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-2xs">
          <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-slate-500 hidden sm:inline">Prazo:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="bg-transparent font-extrabold text-xs text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            <option value="prazo_crescente">Menor ao Maior Prazo (Urgentes Primeiro)</option>
            <option value="prazo_decrescente">Maior ao Menor Prazo</option>
            <option value="prioridade">Prioridade (Alta -&gt; Baixa)</option>
          </select>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {/* 1. Abertas */}
          <button
            onClick={() => setStatusFilter('abertas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'abertas'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Abertas ({taskScopeMode === 'minhas' ? myOpenTasksCount : activeSentOpenCount})</span>
          </button>

          {/* 2. Atrasadas */}
          <button
            onClick={() => setStatusFilter('atrasadas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'atrasadas'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            <span>Atrasadas ({taskScopeMode === 'minhas' ? myOverdueTasksCount : activeSentOverdueCount})</span>
          </button>

          {/* 3. Concluídas */}
          <button
            onClick={() => setStatusFilter('concluida')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'concluida'
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/30'
                : 'bg-emerald-50/50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100/60'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Concluídas ({taskScopeMode === 'minhas' ? myCompletedTasksCount : activeSentCompletedCount})</span>
          </button>
        </div>

        {/* Add New Task Button */}
        {canCreateTasksPermission && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Criar / Atribuir Tarefa</span>
          </button>
        )}
      </div>

      {/* Task Cards List */}
      <div className="space-y-3">
        {sortedTasks.length > 0 ? (
          sortedTasks.map((task) => {
            const isAssignedToMe = task.assignedToEmail?.toLowerCase() === userEmail.toLowerCase() || task.assignedToName?.toLowerCase().includes(userName.toLowerCase());
            const overdue = isTaskOverdue(task);

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 overflow-hidden ${
                  task.status === 'concluida'
                    ? 'border-emerald-200 bg-emerald-50/20 opacity-80'
                    : overdue
                    ? 'border-red-300 bg-red-50/20 shadow-sm ring-1 ring-red-400/30'
                    : isAssignedToMe
                    ? 'border-blue-300 bg-blue-50/20 shadow-md ring-1 ring-blue-400/30'
                    : 'border-slate-200/80 shadow-sm hover:border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Status Toggle Button */}
                  <button
                    onClick={() => handleToggleStatus(task)}
                    className="mt-0.5 shrink-0 transition-transform active:scale-90 cursor-pointer"
                    title="Clique para alterar status"
                  >
                    {task.status === 'concluida' ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 fill-emerald-100" />
                    ) : task.status === 'em_andamento' ? (
                      <Clock className="h-6 w-6 text-amber-500" />
                    ) : (
                      <Circle className="h-6 w-6 text-slate-300 hover:text-blue-500" />
                    )}
                  </button>

                  {/* Task Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        onClick={() => setSelectedTaskForView(task)}
                        className={`font-extrabold text-sm text-slate-900 leading-snug cursor-pointer hover:text-blue-600 transition-colors break-words max-w-full ${
                          task.status === 'concluida' ? 'line-through text-slate-400' : ''
                        }`}
                        title="Clique para abrir detalhes da tarefa"
                      >
                        {task.title}
                      </h4>

                      {/* Recipient Badge */}
                      {(() => {
                        const recipientAvatar = getAvatarForUser(task.assignedToEmail, task.assignedToName);
                        return (
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 shadow-xs max-w-full break-words ${
                            task.assignedToType === 'all'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : isAssignedToMe
                              ? 'bg-blue-100 text-blue-900 border-blue-300 font-extrabold'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}>
                            {recipientAvatar ? (
                              <img src={recipientAvatar} alt="" className="h-4 w-4 rounded-full object-cover shrink-0 border border-blue-400/60" />
                            ) : (
                              <UserCheck className="h-3 w-3 text-blue-600 shrink-0" />
                            )}
                            <span className="truncate max-w-[200px] sm:max-w-none">Destinado a: <strong>{formatUserName(task.assignedToName, task.assignedToEmail)}</strong></span>
                          </span>
                        );
                      })()}

                      {/* Priority Badge */}
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase shrink-0 ${
                        task.priority === 'alta'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : task.priority === 'media'
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {task.priority === 'alta' ? 'Alta' : task.priority === 'media' ? 'Média' : 'Baixa'}
                      </span>
                    </div>

                    {task.description && (
                      <p
                        onClick={() => setSelectedTaskForView(task)}
                        className={`text-xs text-slate-600 leading-relaxed cursor-pointer hover:text-slate-900 transition-colors break-words ${
                          task.status === 'concluida' ? 'line-through text-slate-400' : ''
                        }`}
                        title="Clique para abrir detalhes"
                      >
                        {task.description}
                      </p>
                    )}

                    {/* Attachments Links (Initial & Completion) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 max-w-full">
                      {getTaskAttachments(task).map((att, idx) => (
                        <a
                          key={`initial-att-${idx}`}
                          href={att.url}
                          download={att.name || `anexo_${idx + 1}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold text-blue-700 transition-colors shadow-2xs max-w-full"
                          title={`Documento anexado (${att.name})`}
                        >
                          <Paperclip className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span className="truncate max-w-[180px] sm:max-w-[240px]">{att.name}</span>
                        </a>
                      ))}

                      {getTaskCompletionAttachments(task).map((att, idx) => (
                        <a
                          key={`comp-att-${idx}`}
                          href={att.url}
                          download={att.name || `entrega_${idx + 1}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-black text-emerald-800 transition-colors shadow-2xs max-w-full"
                          title={`Documento de entrega (${att.name})`}
                        >
                          <Paperclip className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-[180px] sm:max-w-[240px]">Entrega: {att.name}</span>
                        </a>
                      ))}
                    </div>

                    {/* Creator & Due Date Metadata */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] text-slate-500 pt-0.5 max-w-full">
                      {task.createdByName && (
                        <span className="font-medium text-slate-600 flex items-center gap-1.5 break-words">
                          {getAvatarForUser(task.userEmail, task.createdByName, task.userId) ? (
                            <img src={getAvatarForUser(task.userEmail, task.createdByName, task.userId)} alt="" className="h-4 w-4 rounded-full object-cover shrink-0 border border-slate-300" />
                          ) : (
                            <User className="h-3 w-3 text-slate-400 shrink-0" />
                          )}
                          <span>Enviado por: <strong>{task.createdByName}</strong></span>
                        </span>
                      )}

                      {task.status === 'concluida' && task.completedByName && (
                        <span className="font-bold text-emerald-800 flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          {getAvatarForUser(task.completedByEmail, task.completedByName) ? (
                            <img src={getAvatarForUser(task.completedByEmail, task.completedByName)} alt="" className="h-4 w-4 rounded-full object-cover shrink-0 border border-emerald-400" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                          )}
                          <span>Concluído por: {task.completedByName}</span>
                        </span>
                      )}

                      {task.dueDate && (
                        <span className={`flex items-center gap-1 ${
                          overdue ? 'text-red-600 font-extrabold bg-red-50 px-2 py-0.5 rounded-lg border border-red-200' : 'text-slate-500'
                        }`}>
                          {overdue ? <AlertCircle className="h-3 w-3 text-red-600 shrink-0" /> : <Calendar className="h-3 w-3 shrink-0" />}
                          <span>Prazo: {task.dueDate.split('-').reverse().join('/')} {overdue ? '(Atrasada)' : ''}</span>
                        </span>
                      )}

                      <span className={`font-bold ${
                        task.status === 'concluida'
                          ? 'text-emerald-600'
                          : task.status === 'em_andamento'
                          ? 'text-amber-600'
                          : 'text-slate-500'
                      }`}>
                        • Status: {task.status === 'concluida' ? 'Concluída' : task.status === 'em_andamento' ? 'Em Andamento' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100/90 w-full sm:w-auto justify-start sm:justify-end shrink-0">
                  {task.status === 'concluida' && (
                    <button
                      onClick={() => openEditCompletionMode(task)}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                      title="Editar observações digitadas e anexo de entrega"
                    >
                      <Pencil className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Editar Observações</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleToggleStatus(task)}
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs ${
                      task.status === 'concluida'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                    title={task.status === 'concluida' ? 'Reabrir tarefa' : 'Marcar tarefa como concluída'}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{task.status === 'concluida' ? 'Reabrir' : 'Concluir'}</span>
                  </button>

                  {isTaskAssignedByMe(task) && (
                    <button
                      onClick={() => openEditTask(task)}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                      title="Editar tarefa e alterar destinatário"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedTaskForView(task);
                      setIsEditingTask(false);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                    title="Abrir tarefa e ver detalhes"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Abrir</span>
                  </button>

                  {canDeleteTask(task) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Deseja realmente excluir permanentemente a tarefa "${task.title}"?`)) {
                          handleDeleteTask(task.id);
                        }
                      }}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      title="Excluir esta tarefa (apenas quem criou)"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                      <span>Excluir</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 space-y-3">
            <CheckSquare className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-800 text-base">Nenhuma tarefa encontrada neste filtro</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Todas as tarefas atribuídas ao seu nome ou para a equipe aparecem aqui.
            </p>
            {canCreateTasksPermission && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Criar / Atribuir Nova Tarefa
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
            <ListTodo className="h-4 w-4 text-blue-400" />
            <span>PAINEL DE TAREFAS NOMINAIS E GERAIS</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Minhas Tarefas & Atribuições Nominais
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed">
            Envie e acompanhe tarefas atribuídas diretamente pelo nome do colaborador ou para toda a equipe do Bahia Prev.
          </p>

          {/* User Role Badge */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 flex items-center gap-2 text-xs font-bold text-white">
              <User className="h-4 w-4 text-cyan-400" />
              <span>Conectado como: <strong className="text-amber-300">{userName}</strong> ({userRole})</span>
            </div>

            {isAdmin && (
              <div className="bg-amber-500/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-400/30 flex items-center gap-2 text-xs font-bold text-amber-200">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                <span>Gestão: Atribua tarefas com o nome do colaborador selecionado</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Scope Navigation Tabs - 2 Clean Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Tab 1: Minhas Tarefas Recebidas */}
        <button
          onClick={() => {
            setTaskScopeMode('minhas');
            setSelectedSentRecipientKey(null);
            setStatusFilter('abertas');
          }}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-4 ${
            taskScopeMode === 'minhas'
              ? 'bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400/40'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-indigo-300 hover:bg-indigo-50/30 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
              taskScopeMode === 'minhas' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
            }`}>
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-sm sm:text-base block truncate">Minhas Tarefas</span>
              <span className={`text-xs block mt-0.5 truncate ${taskScopeMode === 'minhas' ? 'text-indigo-200' : 'text-slate-500'}`}>
                Recebidas para eu fazer
              </span>
            </div>
          </div>
          <span className={`text-xs font-black px-3 py-1 rounded-full shrink-0 ${
            taskScopeMode === 'minhas' ? 'bg-white/20 text-white border border-white/20' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
          }`}>
            {myTotalTasksCount}
          </span>
        </button>

        {/* Tab 2: Tarefas Enviadas / Atribuídas */}
        <button
          onClick={() => {
            setTaskScopeMode('enviadas');
            setSelectedSentRecipientKey(null);
            setStatusFilter('abertas');
          }}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-4 ${
            taskScopeMode === 'enviadas'
              ? 'bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 text-white border-blue-700 shadow-md ring-2 ring-blue-400/40'
              : 'bg-white text-slate-800 border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/30 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
              taskScopeMode === 'enviadas' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
            }`}>
              <Send className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-sm sm:text-base block truncate">Tarefas Enviadas</span>
              <span className={`text-xs block mt-0.5 truncate ${taskScopeMode === 'enviadas' ? 'text-blue-200' : 'text-slate-500'}`}>
                Atribuídas a colaboradores
              </span>
            </div>
          </div>
          <span className={`text-xs font-black px-3 py-1 rounded-full shrink-0 ${
            taskScopeMode === 'enviadas' ? 'bg-white/20 text-white border border-white/20' : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {sentTotalTasksCount}
          </span>
        </button>
      </div>

      {/* SEÇÃO 1: MINHAS TAREFAS (RECEBIDAS) */}
      {taskScopeMode === 'minhas' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shadow-2xs">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <span>Minhas Tarefas (Recebidas)</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                    {myTotalTasksCount} {myTotalTasksCount === 1 ? 'tarefa' : 'tarefas'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Tarefas destinadas a você (<strong>{userName}</strong>) para realização
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Metric 1: Minhas Abertas */}
            <button
              onClick={() => setStatusFilter('abertas')}
              className={`rounded-2xl p-4 border text-left transition-all cursor-pointer flex items-center justify-between ${
                statusFilter === 'abertas'
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400/30'
                  : 'bg-indigo-50/50 hover:bg-indigo-100/60 border-indigo-200/80 shadow-2xs'
              }`}
            >
              <div>
                <span className={`text-[10px] font-black uppercase tracking-wider block ${
                  statusFilter === 'abertas' ? 'text-indigo-100' : 'text-indigo-700'
                }`}>
                  Minhas Abertas
                </span>
                <span className={`text-2xl font-black mt-0.5 block ${
                  statusFilter === 'abertas' ? 'text-white' : 'text-slate-900'
                }`}>
                  {myOpenTasksCount}
                </span>
              </div>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${
                statusFilter === 'abertas' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
              }`}>
                <Clock className="h-5 w-5" />
              </div>
            </button>

            {/* Metric 2: Minhas Atrasadas */}
            <button
              onClick={() => setStatusFilter('atrasadas')}
              className={`rounded-2xl p-4 border text-left transition-all cursor-pointer flex items-center justify-between ${
                statusFilter === 'atrasadas'
                  ? 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-400/30'
                  : 'bg-red-50/50 hover:bg-red-100/60 border-red-200 shadow-2xs'
              }`}
            >
              <div>
                <span className={`text-[10px] font-black uppercase tracking-wider block ${
                  statusFilter === 'atrasadas' ? 'text-red-100' : 'text-red-700'
                }`}>
                  Minhas Atrasadas
                </span>
                <span className={`text-2xl font-black mt-0.5 block ${
                  statusFilter === 'atrasadas' ? 'text-white' : 'text-red-700'
                }`}>
                  {myOverdueTasksCount}
                </span>
              </div>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${
                statusFilter === 'atrasadas' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
              }`}>
                <AlertCircle className="h-5 w-5" />
              </div>
            </button>

            {/* Metric 3: Minhas Concluídas */}
            <button
              onClick={() => setStatusFilter('concluida')}
              className={`rounded-2xl p-4 border text-left transition-all cursor-pointer flex items-center justify-between ${
                statusFilter === 'concluida'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/30'
                  : 'bg-emerald-50/50 hover:bg-emerald-100/60 border-emerald-200 shadow-2xs'
              }`}
            >
              <div>
                <span className={`text-[10px] font-black uppercase tracking-wider block ${
                  statusFilter === 'concluida' ? 'text-emerald-100' : 'text-emerald-700'
                }`}>
                  Minhas Concluídas
                </span>
                <span className={`text-2xl font-black mt-0.5 block ${
                  statusFilter === 'concluida' ? 'text-white' : 'text-emerald-700'
                }`}>
                  {myCompletedTasksCount}
                </span>
              </div>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${
                statusFilter === 'concluida' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
              }`}>
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </button>
          </div>

          {renderTaskListSection()}
        </div>
      )}

      {/* SEÇÃO 2: TAREFAS ENVIADAS / ATRIBUÍDAS A OUTROS */}
      {taskScopeMode === 'enviadas' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shadow-2xs">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <span>Tarefas Atribuídas por Você</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                    {sentTotalTasksCount} {sentTotalTasksCount === 1 ? 'tarefa enviada' : 'tarefas enviadas'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Acompanhe em tempo real o status e entregas das tarefas que você enviou para os colaboradores
                </p>
              </div>
            </div>
          </div>

          {/* Destinatários que RECEBERAM tarefas suas (Se Lucas não enviou para Jairo, Jairo NÃO aparece) */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-600" />
                <span>Colaboradores com Tarefas Atribuídas ({sentRecipients.length})</span>
              </span>
              {selectedSentRecipientKey && (
                <button
                  onClick={() => {
                    setSelectedSentRecipientKey(null);
                    setStatusFilter('abertas');
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs hover:bg-blue-50 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Limpar seleção</span>
                </button>
              )}
            </div>

            {sentRecipients.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                Você ainda não enviou tarefas para nenhum colaborador.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {/* Cards Nominais Apenas dos Destinatários que Receberam Tarefas do Usuário */}
                {sentRecipients.map((rec) => {
                  const isSel = selectedSentRecipientKey === rec.key;
                  return (
                    <button
                      key={rec.key}
                      onClick={() => {
                        const nextKey = isSel ? null : rec.key;
                        setSelectedSentRecipientKey(nextKey);
                        if (!isSel) {
                          if (rec.open === 0 && rec.completed > 0) {
                            setStatusFilter('concluida');
                          } else if (rec.open === 0 && rec.overdue > 0) {
                            setStatusFilter('atrasadas');
                          } else {
                            setStatusFilter('abertas');
                          }
                        }
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSel
                          ? 'bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 text-white border-blue-800 shadow-md ring-2 ring-blue-500/40'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {rec.avatarUrl ? (
                          <img src={rec.avatarUrl} alt={rec.name} className="h-8 w-8 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs" />
                        ) : (
                          <div className={`h-8 w-8 rounded-lg font-black flex items-center justify-center text-xs shrink-0 ${
                            isSel ? 'bg-blue-500/30 text-white border border-blue-400/40' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {rec.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-extrabold text-xs block truncate leading-tight">
                            {rec.name}
                          </span>
                          <span className={`text-[10px] font-semibold block truncate mt-0.5 ${isSel ? 'text-blue-200' : 'text-slate-500'}`}>
                            {rec.role}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                          isSel ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {rec.total}
                        </span>
                        {rec.overdue > 0 && (
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                            isSel ? 'bg-red-500/30 text-red-200' : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {rec.overdue} atrasada{rec.overdue > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Se nenhum colaborador foi selecionado, exibe instrução amigável para clicar no nome */}
          {!selectedSentRecipientKey ? (
            <div className="text-center py-12 px-4 bg-slate-50/70 rounded-3xl border border-dashed border-slate-200/90 space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs border border-blue-100">
                <Users className="h-7 w-7" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="text-sm font-extrabold text-slate-800">
                  Selecione um colaborador acima
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Clique no nome do colaborador para visualizar as tarefas que você atribuiu para ele, acompanhar prazos e verificar entregas.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Cards de Métricas por Status para o colaborador selecionado */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Metric 1: Abertas */}
                <button
                  onClick={() => setStatusFilter('abertas')}
                  className={`rounded-2xl p-4 border text-left transition-all cursor-pointer flex items-center justify-between ${
                    statusFilter === 'abertas'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400/30'
                      : 'bg-blue-50/50 hover:bg-blue-100/60 border-blue-200/80 shadow-2xs'
                  }`}
                >
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-wider block ${
                      statusFilter === 'abertas' ? 'text-blue-100' : 'text-blue-700'
                    }`}>
                      Abertas / Em Andamento {selectedRecipientObj ? `(${selectedRecipientObj.name})` : ''}
                    </span>
                    <span className={`text-2xl font-black mt-0.5 block ${
                      statusFilter === 'abertas' ? 'text-white' : 'text-slate-900'
                    }`}>
                      {activeSentOpenCount}
                    </span>
                  </div>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${
                    statusFilter === 'abertas' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                  }`}>
                    <Clock className="h-5 w-5" />
                  </div>
                </button>

                {/* Metric 2: Atrasadas */}
                <button
                  onClick={() => setStatusFilter('atrasadas')}
                  className={`rounded-2xl p-4 border text-left transition-all cursor-pointer flex items-center justify-between ${
                    statusFilter === 'atrasadas'
                      ? 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-400/30'
                      : 'bg-red-50/50 hover:bg-red-100/60 border-red-200 shadow-2xs'
                  }`}
                >
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-wider block ${
                      statusFilter === 'atrasadas' ? 'text-red-100' : 'text-red-700'
                    }`}>
                      Atrasadas {selectedRecipientObj ? `(${selectedRecipientObj.name})` : ''}
                    </span>
                    <span className={`text-2xl font-black mt-0.5 block ${
                      statusFilter === 'atrasadas' ? 'text-white' : 'text-red-700'
                    }`}>
                      {activeSentOverdueCount}
                    </span>
                  </div>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${
                    statusFilter === 'atrasadas' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
                  }`}>
                    <AlertCircle className="h-5 w-5" />
                  </div>
                </button>

                {/* Metric 3: Concluídas */}
                <button
                  onClick={() => setStatusFilter('concluida')}
                  className={`rounded-2xl p-4 border text-left transition-all cursor-pointer flex items-center justify-between ${
                    statusFilter === 'concluida'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/30'
                      : 'bg-emerald-50/50 hover:bg-emerald-100/60 border-emerald-200 shadow-2xs'
                  }`}
                >
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-wider block ${
                      statusFilter === 'concluida' ? 'text-emerald-100' : 'text-emerald-700'
                    }`}>
                      Concluídas {selectedRecipientObj ? `(${selectedRecipientObj.name})` : ''}
                    </span>
                    <span className={`text-2xl font-black mt-0.5 block ${
                      statusFilter === 'concluida' ? 'text-white' : 'text-emerald-700'
                    }`}>
                      {activeSentCompletedCount}
                    </span>
                  </div>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${
                    statusFilter === 'concluida' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </button>
              </div>

              {renderTaskListSection()}
            </>
          )}
        </div>
      )}

    {/* Modal Nova Tarefa com Seleção Nominal de Colaborador (Disponível para todos os usuários) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-8 shadow-2xl border border-slate-200/80 relative space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Atribuir Nova Tarefa
                  </h3>
                  <p className="text-xs text-slate-500">
                    Selecione o nome do colaborador destinatário ou envie para toda a equipe
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                
                {/* Seleção de Colaborador Destinatário pelo Nome (Jairo nunca recebe tarefas) */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 space-y-2">
                  <label className="block text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                    <span>Colaborador Destinatário (Nome) *</span>
                  </label>

                  {/* Quick Avatar Picker Chips */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none">
                    {collaborators
                      .filter((member) => !isDirectorOrPresidentRole(member.role) && !(member.email && member.email.toLowerCase().includes('jairo')) && !(member.name && member.name.toLowerCase().includes('jairo')))
                      .map((member) => {
                        const isSel = selectedRecipient === member.email;
                        const avatar = member.avatarUrl || getAvatarForUser(member.email, member.name, member.uid);
                        return (
                          <button
                            key={member.email || member.uid}
                            type="button"
                            onClick={() => setSelectedRecipient(member.email)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${
                              isSel
                                ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-400/30'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                            }`}
                          >
                            {avatar ? (
                              <img src={avatar} alt={member.name} className="h-5 w-5 rounded-full object-cover shrink-0 border border-white/60 shadow-2xs" />
                            ) : (
                              <div className="h-5 w-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black flex items-center justify-center shrink-0">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="truncate max-w-[100px]">{member.name.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                  </div>

                  <select
                    value={selectedRecipient}
                    onChange={(e) => setSelectedRecipient(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    {!isDirectorOrPresidentRole(userRole) && (
                      <option value="me">👤 Mim mesmo ({userName})</option>
                    )}
                    <option value="all">👥 Todos os Colaboradores (Geral)</option>
                    
                    <optgroup label="Selecione o Colaborador por Nome:">
                      {collaborators
                        .filter((member) => !isDirectorOrPresidentRole(member.role) && !(member.email && member.email.toLowerCase().includes('jairo')) && !(member.name && member.name.toLowerCase().includes('jairo')))
                        .map((member) => (
                          <option key={member.email || member.uid} value={member.email}>
                            👤 {member.name} — ({member.role || 'Colaborador'})
                          </option>
                        ))}
                    </optgroup>
                  </select>

                  <p className="text-[11px] text-slate-500 leading-tight">
                    A tarefa será direcionada com o nome do colaborador selecionado no painel de controle.
                  </p>
                </div>

                <div>
                  <SpellCheckInput
                    label="Título da Tarefa *"
                    required
                    value={newTitle}
                    onChangeValue={(val) => setNewTitle(val)}
                    placeholder="Ex: Elaborar relatório de vendas ou Revisar POP"
                  />
                </div>

                <div>
                  <SpellCheckTextarea
                    label="Descrição Detalhada / Instruções"
                    rows={3}
                    value={newDescription}
                    onChangeValue={(val) => setNewDescription(val)}
                    placeholder="Instruções específicas para o colaborador realizar a tarefa..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Prioridade
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as 'baixa' | 'media' | 'alta')}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>

                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5 text-blue-600" />
                        <span>Anexar Arquivos ({attachmentFiles.length})</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">Pode selecionar múltiplos arquivos</span>
                    </label>

                    {attachmentFiles.length > 0 && (
                      <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto pr-1">
                        {attachmentFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                            <div className="flex items-center gap-2 min-w-0">
                              <Paperclip className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <span className="truncate font-bold" title={file.name}>
                                {file.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachmentFile(idx)}
                              className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-blue-100 cursor-pointer shrink-0"
                              title="Remover este arquivo"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <label className="flex items-center justify-center gap-1.5 p-2 bg-slate-50 border border-dashed border-slate-300 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-600 cursor-pointer transition-colors h-[38px]">
                      <Paperclip className="h-4 w-4 text-blue-600" />
                      <span>{attachmentFiles.length > 0 ? 'Adicionar Mais Arquivos' : 'Anexar Arquivos'}</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.ppt,.pptx"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Data Limite (Prazo Final)
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !newTitle.trim()}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{submitting ? 'Atribuindo...' : 'Atribuir Tarefa'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para Visualizar e Editar Detalhes da Tarefa Atribuída */}
      <AnimatePresence>
        {selectedTaskForView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative space-y-6 max-h-[90vh] overflow-y-auto text-left"
            >
              {isEditingTask ? (
                /* MODAL MODO EDIÇÃO COMPLETA DA TAREFA */
                <form onSubmit={handleSaveTaskEdit} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 inline-flex items-center gap-1">
                        <Pencil className="h-3 w-3 text-amber-700" />
                        <span>Modo Edição de Tarefa</span>
                      </span>
                      <h3 className="text-lg font-black text-slate-900 pt-1">
                        Editar Tarefa & Destinatário
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingTask(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Seleção de Colaborador Destinatário pelo Nome */}
                  <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 space-y-2">
                    <label className="block text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-amber-700" />
                      <span>Colaborador Destinatário (Para) *</span>
                    </label>

                    <select
                      value={editRecipient}
                      onChange={(e) => setEditRecipient(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      {!isDirectorOrPresidentRole(userRole) && (
                        <option value="me">👤 Mim mesmo ({userName})</option>
                      )}
                      <option value="all">👥 Todos os Colaboradores (Geral)</option>
                      
                      <optgroup label="Selecione o Colaborador por Nome:">
                        {collaborators
                          .filter((member) => !isDirectorOrPresidentRole(member.role) && !(member.email && member.email.toLowerCase().includes('jairo')) && !(member.name && member.name.toLowerCase().includes('jairo')))
                          .map((member) => (
                            <option key={member.email || member.uid} value={member.email}>
                              👤 {member.name} — ({member.role || 'Colaborador'})
                            </option>
                          ))}
                      </optgroup>
                    </select>

                    <p className="text-[11px] text-amber-900 font-medium leading-tight">
                      Você pode alterar para quem esta tarefa foi atribuída a qualquer momento.
                    </p>
                  </div>

                  <div>
                    <SpellCheckInput
                      label="Título da Tarefa *"
                      required
                      value={editTitle}
                      onChangeValue={(val) => setEditTitle(val)}
                      placeholder="Título da tarefa..."
                    />
                  </div>

                  <div>
                    <SpellCheckTextarea
                      label="Descrição Detalhada / Instruções"
                      rows={3}
                      value={editDescription}
                      onChangeValue={(val) => setEditDescription(val)}
                      placeholder="Instruções para o colaborador..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Prioridade
                      </label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as 'baixa' | 'media' | 'alta')}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Status da Tarefa
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as 'pendente' | 'em_andamento' | 'concluida')}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="concluida">Concluída</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Data Limite (Prazo Final)
                    </label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Anexo Inicial Edição */}
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5 text-blue-600" />
                        <span>Arquivos Anexados ({editAttachmentFiles.length})</span>
                      </span>
                      <span className="text-[10px] text-slate-500">Pode adicionar ou remover arquivos</span>
                    </label>

                    {editAttachmentFiles.length > 0 && (
                      <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto pr-1">
                        {editAttachmentFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                            <div className="flex items-center gap-2 min-w-0">
                              <Paperclip className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <span className="truncate font-bold" title={file.name}>
                                {file.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeEditFile(idx)}
                              className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-blue-100 cursor-pointer shrink-0"
                              title="Remover este arquivo"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <label className="flex items-center justify-center gap-1.5 p-2 bg-slate-50 border border-dashed border-slate-300 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-600 cursor-pointer transition-colors h-[38px]">
                      <Paperclip className="h-4 w-4 text-blue-600" />
                      <span>Adicionar Mais Arquivos</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleEditFileChange}
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.ppt,.pptx"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsEditingTask(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingEdit || !editTitle.trim()}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* MODAL MODO VISUALIZAÇÃO DE DETALHES */
                <>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 inline-block">
                        Detalhes da Tarefa Atribuída
                      </span>
                      <h3 className="text-xl font-black text-slate-900 leading-snug pt-1">
                        {selectedTaskForView.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isTaskAssignedByMe(selectedTaskForView) && (
                        <button
                          type="button"
                          onClick={() => openEditTask(selectedTaskForView)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                          title="Editar título, destinatário, prazo ou instruções"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Editar Tarefa</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedTaskForView(null);
                          setIsEditingTask(false);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Status and Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Priority */}
                    <span className={`text-xs font-black px-3 py-1 rounded-lg uppercase ${
                      selectedTaskForView.priority === 'alta'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : selectedTaskForView.priority === 'media'
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      Prioridade: {selectedTaskForView.priority === 'alta' ? 'Alta' : selectedTaskForView.priority === 'media' ? 'Média' : 'Baixa'}
                    </span>

                    {/* Status */}
                    <span className={`text-xs font-black px-3 py-1 rounded-lg ${
                      selectedTaskForView.status === 'concluida'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : selectedTaskForView.status === 'em_andamento'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      Status: {selectedTaskForView.status === 'concluida' ? 'Concluída' : selectedTaskForView.status === 'em_andamento' ? 'Em Andamento' : 'Pendente'}
                    </span>

                    {/* Destinado a */}
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg flex items-center gap-1.5">
                      {getAvatarForUser(selectedTaskForView.assignedToEmail, selectedTaskForView.assignedToName) ? (
                        <img src={getAvatarForUser(selectedTaskForView.assignedToEmail, selectedTaskForView.assignedToName)} alt="" className="h-4 w-4 rounded-full object-cover shrink-0 border border-blue-400" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      )}
                      <span>Para: <strong>{formatUserName(selectedTaskForView.assignedToName, selectedTaskForView.assignedToEmail)}</strong></span>
                    </span>
                  </div>

                  {/* Metadata Box */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-600">
                    {selectedTaskForView.createdByName && (
                      <div className="flex items-center gap-2">
                        {getAvatarForUser(selectedTaskForView.userEmail, selectedTaskForView.createdByName, selectedTaskForView.userId) ? (
                          <img src={getAvatarForUser(selectedTaskForView.userEmail, selectedTaskForView.createdByName, selectedTaskForView.userId)} alt="" className="h-4.5 w-4.5 rounded-full object-cover shrink-0 border border-slate-300" />
                        ) : (
                          <User className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                        <span>Enviado por: <strong className="text-slate-800">{selectedTaskForView.createdByName}</strong></span>
                      </div>
                    )}
                    {selectedTaskForView.dueDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>Prazo Final: <strong className="text-slate-800">{selectedTaskForView.dueDate.split('-').reverse().join('/')}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Description / Instructions */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span>Descrição e Instruções Escritas</span>
                    </h4>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium max-h-60 overflow-y-auto">
                      {selectedTaskForView.description || 'Nenhuma instrução adicional gravada para esta tarefa.'}
                    </div>
                  </div>

                  {/* Attachment Download Box (if initial attachments exist) */}
                  {getTaskAttachments(selectedTaskForView).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Paperclip className="h-4 w-4 text-blue-600" />
                        <span>Documentos Anexados ({getTaskAttachments(selectedTaskForView).length})</span>
                      </h4>
                      <div className="space-y-2">
                        {getTaskAttachments(selectedTaskForView).map((att, idx) => (
                          <div key={idx} className="p-3 bg-blue-50/60 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate" title={att.name}>
                                  {att.name}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Arquivo anexado na criação
                                </p>
                              </div>
                            </div>
                            <a
                              href={att.url}
                              download={att.name || `anexo_${idx + 1}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full sm:w-auto px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Baixar</span>
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completion Delivery Box (if delivered document or note exists or task is completed) */}
                  {(selectedTaskForView.status === 'concluida' || selectedTaskForView.completionAttachmentUrl || selectedTaskForView.completionNote || selectedTaskForView.completedByName) && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Entrega e Comprovante de Conclusão</span>
                        </h4>

                        {!isEditingCompletion && (
                          <button
                            type="button"
                            onClick={() => openEditCompletionMode(selectedTaskForView)}
                            className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-emerald-300"
                            title="Editar observações digitadas e substituir anexo de entrega"
                          >
                            <Pencil className="h-3 w-3 text-emerald-700" />
                            <span>Editar Observações / Anexo</span>
                          </button>
                        )}
                      </div>

                      {isEditingCompletion ? (
                        /* MODO DE EDIÇÃO DAS OBSERVAÇÕES E ANEXO DE ENTREGA */
                        <div className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-2xl space-y-3">
                          <p className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                            <Pencil className="h-3.5 w-3.5 text-emerald-700" />
                            <span>Editar Observações e Anexo da Entrega</span>
                          </p>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-emerald-900 uppercase">
                              Sua Observação / Anotação de Entrega:
                            </label>
                            <SpellCheckTextarea
                              value={editCompletionNoteText}
                              onChangeValue={(val) => setEditCompletionNoteText(val)}
                              placeholder="Digite ou edite suas observações sobre a entrega desta tarefa..."
                              rows={3}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-emerald-900 uppercase flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Paperclip className="h-3.5 w-3.5 text-emerald-700" />
                                <span>Documentos da Entrega ({editCompletionAttachmentFiles.length})</span>
                              </span>
                            </label>

                            {editCompletionAttachmentFiles.length > 0 && (
                              <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto pr-1">
                                {editCompletionAttachmentFiles.map((file, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-white border border-emerald-200 rounded-xl text-xs text-slate-800">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Paperclip className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                      <span className="truncate font-bold text-emerald-950" title={file.name}>
                                        {file.name}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeEditCompletionFile(idx)}
                                      className="text-red-600 hover:text-red-800 p-1 rounded-lg hover:bg-emerald-100 cursor-pointer shrink-0"
                                      title="Remover este anexo"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <label className="flex items-center justify-center gap-1.5 p-2 bg-white border border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl text-xs font-bold text-emerald-800 cursor-pointer transition-colors h-[38px]">
                              <Paperclip className="h-4 w-4 text-emerald-600" />
                              <span>Adicionar Arquivos de Entrega</span>
                              <input
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleEditCompletionFileChange}
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.ppt,.pptx"
                              />
                            </label>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200">
                            <button
                              type="button"
                              onClick={() => setIsEditingCompletion(false)}
                              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={isSavingCompletionEdit}
                              onClick={() => handleSaveUpdatedCompletionDelivery(selectedTaskForView)}
                              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                            >
                              <Save className="h-3.5 w-3.5" />
                              <span>{isSavingCompletionEdit ? 'Salvando...' : 'Salvar Alterações da Entrega'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* MODO VISUALIZAÇÃO DA ENTREGA */
                        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3">
                          {selectedTaskForView.completedByName && (
                            <p className="text-xs text-emerald-900 font-bold">
                              Entregue por: <strong className="text-slate-900">{selectedTaskForView.completedByName}</strong>
                              {selectedTaskForView.completedAt && (
                                <span className="font-normal text-emerald-700"> em {new Date(selectedTaskForView.completedAt).toLocaleString('pt-BR')}</span>
                              )}
                            </p>
                          )}

                          {selectedTaskForView.completionNote && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-emerald-800 uppercase">Observação de Entrega:</span>
                              <p className="text-xs text-slate-800 bg-white/90 p-3 rounded-xl border border-emerald-100 leading-relaxed font-medium">
                                "{selectedTaskForView.completionNote}"
                              </p>
                            </div>
                          )}

                          {getTaskCompletionAttachments(selectedTaskForView).length > 0 && (
                            <div className="space-y-2 pt-1">
                              <span className="text-[11px] font-bold text-emerald-800 uppercase">Documentos Entregues ({getTaskCompletionAttachments(selectedTaskForView).length}):</span>
                              <div className="space-y-2">
                                {getTaskCompletionAttachments(selectedTaskForView).map((att, idx) => (
                                  <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-2.5 bg-white border border-emerald-200 rounded-xl">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0">
                                        <FileText className="h-4 w-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 truncate" title={att.name}>
                                          {att.name}
                                        </p>
                                        <p className="text-[11px] text-emerald-700">
                                          Anexo de entrega #{idx + 1}
                                        </p>
                                      </div>
                                    </div>
                                    <a
                                      href={att.url}
                                      download={att.name || `entrega_${idx + 1}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-full sm:w-auto px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      <span>Baixar</span>
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Form to Attach Document and Deliver Completion (shows if task is NOT concluded) */}
                  {selectedTaskForView.status !== 'concluida' && (
                    <div className="space-y-3 pt-2 border-t border-slate-100 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Upload className="h-4 w-4 text-blue-600" />
                        <span>Anexar Documento(s) de Entrega / Resposta</span>
                      </h4>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        Anexe os documentos finais ou relatórios de conclusão para enviar a tarefa entregue ao criador.
                      </p>

                      <div className="space-y-2">
                        {completionAttachmentFiles.length > 0 && (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {completionAttachmentFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Paperclip className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                  <span className="truncate font-bold">{file.name}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeCompletionAttachmentFile(idx)}
                                  className="text-red-500 hover:text-red-700 font-black px-1 cursor-pointer shrink-0"
                                  title="Remover este anexo"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <input
                          type="file"
                          multiple
                          id="completion-file-input"
                          onChange={handleCompletionFileChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="completion-file-input"
                          className="w-full px-4 py-2.5 bg-white border border-dashed border-slate-300 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Paperclip className="h-4 w-4 text-blue-600" />
                          <span className="truncate">{completionAttachmentFiles.length > 0 ? 'Adicionar mais documentos de entrega' : 'Clique para escolher documento(s) de entrega (PDF, Imagem, Doc)'}</span>
                        </label>

                        <SpellCheckTextarea
                          value={completionNoteText}
                          onChangeValue={(val) => setCompletionNoteText(val)}
                          placeholder="Escreva uma observação de entrega (opcional)..."
                          rows={2}
                        />

                        <button
                          type="button"
                          onClick={() => handleSaveCompletionDelivery(selectedTaskForView)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>
                            {completionAttachmentFiles.length > 0 || completionNoteText.trim()
                              ? 'Enviar Anexo / Observação e Concluir Tarefa'
                              : 'Concluir Tarefa Agora'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bottom Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      {isTaskAssignedByMe(selectedTaskForView) && (
                        <button
                          type="button"
                          onClick={() => openEditTask(selectedTaskForView)}
                          className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Pencil className="h-4 w-4" />
                          <span>Editar Tarefa</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          handleToggleStatus(selectedTaskForView);
                        }}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                          selectedTaskForView.status === 'concluida'
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>
                          {selectedTaskForView.status === 'concluida'
                            ? 'Reabrir Tarefa'
                            : 'Marcar como Concluída'}
                        </span>
                      </button>

                      {canDeleteTask(selectedTaskForView) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Deseja realmente excluir permanentemente a tarefa "${selectedTaskForView.title}"?`)) {
                              handleDeleteTask(selectedTaskForView.id);
                              setSelectedTaskForView(null);
                            }
                          }}
                          className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-colors cursor-pointer border border-rose-200 flex items-center gap-1.5 shadow-2xs"
                          title="Excluir esta tarefa (apenas quem criou)"
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                          <span>Excluir Tarefa</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTaskForView(null);
                        setIsEditingTask(false);
                      }}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal to Clear/Purge All Tasks */}
      <AnimatePresence>
        {showClearConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-rose-600">
                  <div className="h-10 w-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Limpar Módulo de Tarefas</h3>
                    <p className="text-xs text-slate-500 font-medium">Ação de Limpeza de Históricos</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowClearConfirmModal(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 text-xs text-rose-900 space-y-2">
                <p className="font-bold text-rose-950 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>Atenção: Limpeza Completa de Banco e Históricos</span>
                </p>
                <p className="leading-relaxed">
                  Esta ação excluirá permanentemente <strong>TODAS as tarefas cadastradas e todo o histórico de entregas e conclusões</strong> do banco de dados Firestore e do armazenamento local.
                </p>
                <p className="font-semibold text-rose-800">
                  O sistema de tarefas ficará 100% limpo e zerado para os seus novos testes.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirmModal(false)}
                  disabled={isClearingTasks}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleClearAllTasks}
                  disabled={isClearingTasks}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isClearingTasks ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Limpando Banco...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Confirmar e Excluir Tudo</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Completion Toast Notification */}
      <AnimatePresence>
        {completionToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-emerald-500/30 flex items-center gap-3.5 max-w-sm pointer-events-auto"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎉 Tarefa Concluída!</span>
              </p>
              <p className="text-xs font-bold text-slate-100 truncate mt-0.5">{completionToast.title}</p>
              <p className="text-[11px] text-slate-400 font-medium truncate">{completionToast.subtitle}</p>
            </div>
            <button
              onClick={() => setCompletionToast(null)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
