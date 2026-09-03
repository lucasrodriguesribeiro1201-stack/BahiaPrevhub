import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cross, 
  Plus, 
  CheckSquare, 
  Square, 
  Clock, 
  User, 
  Calendar, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Activity,
  Play,
  ShieldCheck,
  ChevronRight,
  Filter,
  RefreshCw,
  Trash2,
  Eye,
  Users,
  Lock,
  MapPin,
  ExternalLink,
  Search,
  Compass,
  Camera,
  MessageSquare,
  X,
  HeartHandshake,
  Image as ImageIcon,
  Phone,
  MessageCircle,
  Zap,
  Truck,
  Heart,
  Building,
  Flower2,
  FileCheck,
  Share2,
  Volume2,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Sparkles,
  UserCheck,
  UserMinus
} from 'lucide-react';
import { SatisfactionSurveySection } from './SatisfactionSurveySection';
import { NewFuneralOrderForm, OpeningFormData, AttachmentPhoto, AttachmentAudio } from './NewFuneralOrderForm';

function cleanFirestoreObject<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(cleanFirestoreObject) as unknown as T;
  } else if (obj !== null && typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj as any)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        cleaned[key] = cleanFirestoreObject(val);
      }
    }
    return cleaned as T;
  }
  return obj;
}

import { useAuth } from './AuthContext';
import { supabaseService } from '../lib/supabaseService';
import { SpellCheckInput, SpellCheckTextarea } from './SpellCheckField';
import { checkFunerariaAccess } from '../utils/permissions';

const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

export const CHECKLIST_ITEMS = [
  'Ocorrência recebida',
  'Saída da base',
  'Chegada ao local do óbito',
  'Corpo removido',
  'Chegada à sala de preparação',
  'Preparação concluída',
  'Ornamentação concluída',
  'Saída para o local do velório',
  'Chegada ao local do velório',
  'Velório montado',
  'Nota de falecimento realizada',
  'Saída para o cortejo',
  'Sepultamento realizado',
  'Materiais recolhidos',
  'Retorno à base',
  'Serviço encerrado',
];

export interface ChecklistItemData {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  completedLocation?: string;
  completedLat?: number;
  completedLng?: number;
  observations?: string;
  photoUrl?: string;
}

export interface TimelineEntry {
  id: string;
  timestampISO: string;
  dateFormatted: string;
  timeFormatted: string;
  userName: string;
  action: string;
  type?: 'status' | 'pickup' | 'checklist' | 'attachment' | 'system';
}

export interface AgenteAcompanhamento {
  name: string;
  email?: string;
  uid?: string;
  addedAtFormatted: string;
  addedAtISO: string;
}

export interface FunerariaOS {
  id: string;
  osNumber: string;
  seqNumber: number;
  status: 'Aberto' | 'Em remoção' | 'Em preparação' | 'Em velório' | 'Em sepultamento/cremação' | 'Finalizado' | 'Em Andamento' | 'Finalizada' | 'Serviço Encerrado';
  prioridade?: 'Normal' | 'Urgente' | 'Emergencial';
  responsavelName: string;
  responsavelEmail: string;
  responsavelUid: string;
  atendenteName?: string;
  unidadeAtendimento?: string;
  agentesAcompanhamento?: AgenteAcompanhamento[];
  createdAtISO: string;
  dateFormatted: string;
  timeFormatted: string;
  formData?: OpeningFormData;
  checklist: ChecklistItemData[];
  photos?: AttachmentPhoto[];
  audioMemos?: AttachmentAudio[];
  timeline?: TimelineEntry[];
  updatedAtISO?: string;
  updatedDateFormatted?: string;
  updatedTimeFormatted?: string;
  serviceAddress?: string;
  serviceLocationName?: string;
  serviceLat?: number;
  serviceLng?: number;
}

const getLocationHref = (item: ChecklistItemData, os?: FunerariaOS): string => {
  if (typeof item.completedLat === 'number' && typeof item.completedLng === 'number') {
    return `https://www.google.com/maps?q=${item.completedLat},${item.completedLng}`;
  }
  if (typeof os?.serviceLat === 'number' && typeof os?.serviceLng === 'number') {
    return `https://www.google.com/maps?q=${os.serviceLat},${os.serviceLng}`;
  }
  if (item.completedLocation && item.completedLocation.startsWith('http')) {
    return item.completedLocation;
  }
  const query = 
    os?.formData?.enderecoRemocao 
    || os?.formData?.localVelorio 
    || os?.serviceLocationName 
    || os?.serviceAddress 
    || item.completedLocation 
    || '';
  if (query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  return 'https://maps.google.com';
};

const getLocationText = (item: ChecklistItemData, os?: FunerariaOS): string => {
  if (item.completedLocation && !item.completedLocation.startsWith('http')) {
    return item.completedLocation;
  }
  if (os?.formData?.enderecoRemocao) {
    return os.formData.enderecoRemocao;
  }
  if (os?.serviceLocationName) {
    return os.serviceLocationName;
  }
  if (os?.serviceAddress && !os.serviceAddress.startsWith('http')) {
    return os.serviceAddress;
  }
  if (typeof item.completedLat === 'number' && typeof item.completedLng === 'number') {
    return `Localização GPS (${item.completedLat.toFixed(3)}, ${item.completedLng.toFixed(3)})`;
  }
  return 'Google Maps';
};

export const FunerariaSection: React.FC = () => {
  const { user, profile } = useAuth();
  const hasAccess = checkFunerariaAccess(profile, user?.email);

  // Sub-module level inside Gestão Funerária: 'portal' | 'os' | 'satisfaction'
  const [subModule, setSubModule] = useState<'portal' | 'os' | 'satisfaction'>('portal');

  // Navigation state inside OS: 'list' | 'new' | 'detail' | 'track'
  const [view, setView] = useState<'list' | 'new' | 'detail' | 'track'>('list');
  const [selectedOsId, setSelectedOsId] = useState<string | null>(null);
  const [isReadOnlyView, setIsReadOnlyView] = useState<boolean>(false);

  // Sub-tab filter in list view: 'em_andamento' | 'todas' | 'finalizadas'
  const [listTab, setListTab] = useState<'em_andamento' | 'todas' | 'finalizadas'>('em_andamento');

  // Firestore sync state
  const [orders, setOrders] = useState<FunerariaOS[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // New OS form state
  const [isCreating, setIsCreating] = useState(false);
  const [currentRealTimeDate, setCurrentRealTimeDate] = useState<string>('');
  const [currentRealTimeClock, setCurrentRealTimeClock] = useState<string>('');

  // Toast / Feedback message
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Delete modal state
  const [osToDelete, setOsToDelete] = useState<{ id: string; osNumber: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Accordion toggle state for Form Data in detail view
  const [showFormDataDetails, setShowFormDataDetails] = useState(true);

  // GPS permission / modal trigger state
  const [gpsModalInfo, setGpsModalInfo] = useState<{
    isOpen: boolean;
    osId: string;
    itemId: string;
    itemLabel: string;
  } | null>(null);
  const [isCapturingModalGps, setIsCapturingModalGps] = useState(false);

  // Checklist Item completion / observation modal state
  const [checkitemModal, setCheckitemModal] = useState<{
    isOpen: boolean;
    osId: string;
    itemId: string;
    itemLabel: string;
    isCompleted: boolean;
    observations: string;
    photoUrl: string;
    isSaving: boolean;
    isReadOnly?: boolean;
    completedBy?: string;
    completedAt?: string;
  } | null>(null);

  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);

  // Logged in agent display name
  const loggedInAgentName = (
    profile?.name || 
    user?.displayName || 
    (user?.email ? user.email.split('@')[0] : 'Agente Funerário')
  ).trim();

  if (!hasAccess) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center text-white shadow-2xl space-y-4">
        <div className="h-16 w-16 bg-purple-500/20 border border-purple-500/30 rounded-2xl flex items-center justify-center mx-auto text-purple-400 shadow-inner">
          <Cross className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black text-white">Acesso Restrito - Gestão Funerária</h2>
        <p className="text-slate-300 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
          Este módulo é de acesso exclusivo para os cargos de <strong>Atendimento e Recepção</strong>, <strong>Diretor e Presidente</strong>, <strong>Gerente Funerário</strong>, <strong>Analista de Marketing</strong> e <strong>Agente Funerário</strong>.
        </p>
        <div className="pt-2">
          <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-700 inline-block">
            Seu cargo atual: <strong className="text-purple-300 font-semibold">{profile?.role || 'Colaborador'}</strong>
          </span>
        </div>
      </div>
    );
  }

  // Live timer
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentRealTimeDate(now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }));
      setCurrentRealTimeClock(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync OS list directly from Supabase
  const loadOrdersFromSupabase = useCallback(async () => {
    try {
      const list = await supabaseService.fetchOrders();
      if (list) {
        setOrders(list);
      }
    } catch (err) {
      console.error("Erro ao carregar ordens de serviço do Supabase:", err);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    loadOrdersFromSupabase();
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadOrdersFromSupabase();
      }
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [loadOrdersFromSupabase]);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 3500);
  };

  // Submit new Funeral Service Order with 14-section form
  const handleStartNewOSWithForm = async (
    formData: OpeningFormData,
    photos: AttachmentPhoto[],
    audioMemos: AttachmentAudio[]
  ) => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      const maxSeq = orders.reduce((max, o) => Math.max(max, o.seqNumber || 0), 0);
      const nextSeq = maxSeq + 1;
      const osNumber = `OS-${String(nextSeq).padStart(6, '0')}`;

      const now = new Date();
      const dateFormatted = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Initial 16 operational checklist items
      const initialChecklist: ChecklistItemData[] = CHECKLIST_ITEMS.map((label, index) => ({
        id: `item-${index + 1}`,
        label,
        completed: false,
        completedAt: '',
        completedBy: ''
      }));

      // Initial timeline entry
      const initialTimeline: TimelineEntry[] = [
        {
          id: `time-${Date.now()}`,
          timestampISO: now.toISOString(),
          dateFormatted,
          timeFormatted,
          userName: formData.nomeAtendente || loggedInAgentName,
          action: `Atendimento aberto no sistema (${formData.tipoAtendimento})`,
          type: 'system'
        }
      ];

      const newId = 'os_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

      const newOsData: FunerariaOS = {
        id: newId,
        osNumber,
        seqNumber: nextSeq,
        status: 'Aberto' as const,
        prioridade: formData.prioridade || 'Normal',
        responsavelName: 'Aguardando Agente',
        responsavelEmail: '',
        responsavelUid: '',
        atendenteName: formData.nomeAtendente || loggedInAgentName,
        unidadeAtendimento: formData.unidadeAtendimento || '',
        createdAtISO: now.toISOString(),
        dateFormatted,
        timeFormatted,
        formData: cleanFirestoreObject(formData),
        checklist: initialChecklist,
        photos: cleanFirestoreObject(photos),
        audioMemos: cleanFirestoreObject(audioMemos),
        timeline: initialTimeline,
        updatedAtISO: now.toISOString(),
        updatedDateFormatted: dateFormatted,
        updatedTimeFormatted: timeFormatted,
        serviceAddress: formData.enderecoRemocao || '',
        serviceLocationName: formData.nomeFalecido ? `Atendimento: ${formData.nomeFalecido}` : ''
      };

      await supabaseService.saveOrder(newOsData);
      setOrders(prev => [newOsData, ...prev]);

      showToast(`Ordem de Serviço ${osNumber} criada com sucesso! Aguardando agente.`);
      setSelectedOsId(newId);
      setView('detail');
    } catch (err) {
      console.error("Erro ao criar Ordem de Serviço:", err);
      alert("Ocorreu um erro ao registrar o formulário da Ordem de Serviço.");
    } finally {
      setIsCreating(false);
    }
  };

  // Agent Pickup Handler ("Iniciar Atendimento" pelo Agente Principal)
  const handlePickupOS = async (osId: string) => {
    const targetOS = orders.find((o) => o.id === osId);
    if (!targetOS) return;

    try {
      const now = new Date();
      const dateFormatted = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const newTimelineEntry: TimelineEntry = {
        id: `time-${Date.now()}`,
        timestampISO: now.toISOString(),
        dateFormatted,
        timeFormatted,
        userName: loggedInAgentName,
        action: `Atendimento iniciado pelo Agente Principal ${loggedInAgentName}`,
        type: 'pickup'
      };

      const existingTimeline = targetOS.timeline || [];
      const updatedTimeline = [...existingTimeline, newTimelineEntry];

      const updatedOS: FunerariaOS = {
        ...targetOS,
        responsavelName: loggedInAgentName,
        responsavelEmail: profile?.email || user?.email || '',
        responsavelUid: profile?.uid || user?.uid || 'guest',
        status: targetOS.status === 'Aberto' ? 'Em remoção' : targetOS.status,
        timeline: updatedTimeline,
        updatedAtISO: now.toISOString(),
        updatedDateFormatted: dateFormatted,
        updatedTimeFormatted: timeFormatted
      };

      await supabaseService.saveOrder(updatedOS);
      setOrders(prev => prev.map(o => o.id === osId ? updatedOS : o));

      showToast(`⚡ Você iniciou o atendimento da Ordem de Serviço ${targetOS.osNumber} como Agente Principal!`);
    } catch (err) {
      console.error("Erro ao iniciar atendimento:", err);
      showToast("Não foi possível iniciar o atendimento.");
    }
  };

  // Agent Accompany Handler ("Acompanhar / Adicionar Suporte do Agente 2")
  const handleAccompanyOS = async (osId: string) => {
    const targetOS = orders.find((o) => o.id === osId);
    if (!targetOS) return;

    try {
      const now = new Date();
      const dateFormatted = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const existingAcompanhamento = targetOS.agentesAcompanhamento || [];
      const alreadyInList = existingAcompanhamento.some(
        a => a.name.toLowerCase() === loggedInAgentName.toLowerCase()
      );

      if (alreadyInList) {
        showToast(`Você já está registrado como agente de acompanhamento desta OS.`);
        return;
      }

      const newAgentEntry: AgenteAcompanhamento = {
        name: loggedInAgentName,
        email: profile?.email || user?.email || '',
        uid: profile?.uid || user?.uid || 'guest',
        addedAtFormatted: `${dateFormatted} às ${timeFormatted}`,
        addedAtISO: now.toISOString()
      };

      const updatedAcompanhamento = [...existingAcompanhamento, newAgentEntry];

      const newTimelineEntry: TimelineEntry = {
        id: `time-${Date.now()}`,
        timestampISO: now.toISOString(),
        dateFormatted,
        timeFormatted,
        userName: loggedInAgentName,
        action: `Agente ${loggedInAgentName} entrou para dar continuidade e acompanhamento ao atendimento`,
        type: 'pickup'
      };

      const existingTimeline = targetOS.timeline || [];
      const updatedTimeline = [...existingTimeline, newTimelineEntry];

      const updatedOS: FunerariaOS = {
        ...targetOS,
        agentesAcompanhamento: updatedAcompanhamento,
        timeline: updatedTimeline,
        updatedAtISO: now.toISOString(),
        updatedDateFormatted: dateFormatted,
        updatedTimeFormatted: timeFormatted
      };

      await supabaseService.saveOrder(updatedOS);
      setOrders(prev => prev.map(o => o.id === osId ? updatedOS : o));

      showToast(`🤝 Você entrou para dar continuidade e acompanhamento na OS ${targetOS.osNumber}!`);
    } catch (err) {
      console.error("Erro ao registrar acompanhamento:", err);
      showToast("Não foi possível registrar o acompanhamento.");
    }
  };

  // Agent Accompany Removal Handler ("Retirar do Acompanhamento")
  const handleRemoveAccompanyOS = async (osId: string, agentNameToRemove?: string) => {
    const targetOS = orders.find((o) => o.id === osId);
    if (!targetOS) return;

    const nameToRemove = agentNameToRemove || loggedInAgentName;

    try {
      const now = new Date();
      const dateFormatted = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const existingAcompanhamento = targetOS.agentesAcompanhamento || [];
      const updatedAcompanhamento = existingAcompanhamento.filter(
        a => a.name.toLowerCase() !== nameToRemove.toLowerCase()
      );

      const newTimelineEntry: TimelineEntry = {
        id: `time-${Date.now()}`,
        timestampISO: now.toISOString(),
        dateFormatted,
        timeFormatted,
        userName: loggedInAgentName,
        action: `Agente ${nameToRemove} foi removido do acompanhamento da OS`,
        type: 'status'
      };

      const existingTimeline = targetOS.timeline || [];
      const updatedTimeline = [...existingTimeline, newTimelineEntry];

      const updatedOS: FunerariaOS = {
        ...targetOS,
        agentesAcompanhamento: updatedAcompanhamento,
        timeline: updatedTimeline,
        updatedAtISO: now.toISOString(),
        updatedDateFormatted: dateFormatted,
        updatedTimeFormatted: timeFormatted
      };

      await supabaseService.saveOrder(updatedOS);
      setOrders(prev => prev.map(o => o.id === osId ? updatedOS : o));

      showToast(`🚪 ${nameToRemove} foi removido do acompanhamento da OS ${targetOS.osNumber}!`);
    } catch (err) {
      console.error("Erro ao remover acompanhamento:", err);
      showToast("Não foi possível remover o acompanhamento.");
    }
  };

  // Update Status Handler
  const handleUpdateOSStatus = async (osId: string, newStatus: FunerariaOS['status']) => {
    const targetOS = orders.find((o) => o.id === osId);
    if (!targetOS) return;

    try {
      const now = new Date();
      const dateFormatted = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const newTimelineEntry: TimelineEntry = {
        id: `time-${Date.now()}`,
        timestampISO: now.toISOString(),
        dateFormatted,
        timeFormatted,
        userName: loggedInAgentName,
        action: `Status alterado para "${newStatus}"`,
        type: 'status'
      };

      const existingTimeline = targetOS.timeline || [];
      const updatedTimeline = [...existingTimeline, newTimelineEntry];

      const updatedOS: FunerariaOS = {
        ...targetOS,
        status: newStatus,
        timeline: updatedTimeline,
        updatedAtISO: now.toISOString(),
        updatedDateFormatted: dateFormatted,
        updatedTimeFormatted: timeFormatted
      };

      await supabaseService.saveOrder(updatedOS);
      setOrders(prev => prev.map(o => o.id === osId ? updatedOS : o));

      showToast(`Status da OS ${targetOS.osNumber} atualizado para "${newStatus}"`);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      showToast("Erro ao atualizar status do atendimento.");
    }
  };

  // Toggle checklist item
  const handleToggleCheckitem = async (osId: string, itemId: string, customObs?: string, customPhoto?: string) => {
    if (isReadOnlyView) {
      showToast("🔒 Esta ordem está em modo de apenas visualização.");
      return;
    }
    const currentOS = orders.find((o) => o.id === osId);
    if (!currentOS) return;

    const targetItem = currentOS.checklist.find((i) => i.id === itemId);
    const wasCompleted = targetItem?.completed || false;

    const now = new Date();
    const timeShortStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const readableLocationStr = 
      currentOS.formData?.enderecoRemocao 
      || currentOS.serviceLocationName 
      || (currentOS.serviceAddress && !currentOS.serviceAddress.startsWith('http') ? currentOS.serviceAddress : '');

    const updatedChecklist = currentOS.checklist.map((item) => {
      if (item.id === itemId) {
        const newCompleted = !item.completed;
        const newItem: any = {
          ...item,
          completed: newCompleted,
          completedAt: newCompleted ? timeShortStr : '',
          completedBy: newCompleted ? (loggedInAgentName || 'Agente') : '',
          completedLocation: newCompleted ? (readableLocationStr || '') : ''
        };

        if (newCompleted) {
          if (customObs && customObs.trim()) {
            newItem.observations = customObs.trim();
          } else if (item.observations) {
            newItem.observations = item.observations;
          }
          if (customPhoto) {
            newItem.photoUrl = customPhoto;
          } else if (item.photoUrl) {
            newItem.photoUrl = item.photoUrl;
          }
        } else {
          delete newItem.observations;
          delete newItem.photoUrl;
        }

        if (newCompleted && typeof currentOS.serviceLat === 'number') {
          newItem.completedLat = currentOS.serviceLat;
        } else {
          delete newItem.completedLat;
        }

        if (newCompleted && typeof currentOS.serviceLng === 'number') {
          newItem.completedLng = currentOS.serviceLng;
        } else {
          delete newItem.completedLng;
        }

        return newItem;
      }
      return item;
    });

    // Check if last step 'Serviço encerrado' was completed
    const isLastStepTarget = targetItem?.label === 'Serviço encerrado';
    let newOsStatus = currentOS.status;
    if (isLastStepTarget && !wasCompleted) {
      newOsStatus = 'Finalizado';
    }

    const newTimelineEntry: TimelineEntry = {
      id: `time-${Date.now()}`,
      timestampISO: now.toISOString(),
      dateFormatted: dateStr,
      timeFormatted: timeShortStr,
      userName: loggedInAgentName,
      action: !wasCompleted 
        ? `Etapa "${targetItem?.label}" concluída` 
        : `Etapa "${targetItem?.label}" desmarcada`,
      type: 'checklist'
    };

    const existingTimeline = currentOS.timeline || [];
    const updatedTimeline = [...existingTimeline, newTimelineEntry];

    const updatedOS: FunerariaOS = {
      ...currentOS,
      checklist: updatedChecklist,
      status: newOsStatus,
      timeline: updatedTimeline,
      updatedAtISO: now.toISOString(),
      updatedDateFormatted: dateStr,
      updatedTimeFormatted: timeShortStr
    };

    try {
      await supabaseService.saveOrder(updatedOS);
      setOrders(prev => prev.map(o => o.id === osId ? updatedOS : o));

      if (!wasCompleted) {
        showToast(`✓ Etapa "${targetItem?.label}" concluída por ${loggedInAgentName || 'Agente'}!`);
      } else {
        showToast(`Etapa "${targetItem?.label}" desmarcada.`);
      }
    } catch (err) {
      console.error("Erro ao atualizar checklist:", err);
      showToast("Erro ao salvar etapa do checklist.");
    }
  };

  // Open observation modal
  const openCheckitemModal = (osId: string, itemId: string, isReadOnly: boolean = false) => {
    const currentOS = orders.find((o) => o.id === osId);
    if (!currentOS) return;
    const item = currentOS.checklist.find((i) => i.id === itemId);
    if (!item) return;

    setCheckitemModal({
      isOpen: true,
      osId,
      itemId,
      itemLabel: item.label,
      isCompleted: !!item.completed,
      observations: item.observations || '',
      photoUrl: item.photoUrl || '',
      isSaving: false,
      isReadOnly,
      completedBy: item.completedBy || currentOS.responsavelName || 'Agente Funerário',
      completedAt: item.completedAt || currentOS.timeFormatted
    });
  };

  const handleSaveItemObservationsOnly = async () => {
    if (!checkitemModal) return;
    if (checkitemModal.isReadOnly) {
      showToast("🔒 Modo de apenas visualização ativo.");
      setCheckitemModal(null);
      return;
    }
    const { osId, itemId, observations, photoUrl } = checkitemModal;
    const currentOS = orders.find((o) => o.id === osId);
    if (!currentOS) return;

    setCheckitemModal((prev) => (prev ? { ...prev, isSaving: true } : null));

    const updatedChecklist = currentOS.checklist.map((item) => {
      if (item.id === itemId) {
        const newItem: any = { ...item };
        if (observations.trim()) {
          newItem.observations = observations.trim();
        } else {
          delete newItem.observations;
        }
        if (photoUrl) {
          newItem.photoUrl = photoUrl;
        } else {
          delete newItem.photoUrl;
        }
        return newItem;
      }
      return item;
    });

    const updatedOS: FunerariaOS = {
      ...currentOS,
      checklist: updatedChecklist,
      updatedAtISO: new Date().toISOString()
    };

    try {
      await supabaseService.saveOrder(updatedOS);
      setOrders(prev => prev.map(o => o.id === osId ? updatedOS : o));

      showToast("Observações atualizadas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar observações:", err);
      showToast("Erro ao salvar observações.");
    } finally {
      setCheckitemModal(null);
    }
  };

  // Delete OS Modal triggers
  const handleDeleteOS = (osId: string, osNumber: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOsToDelete({ id: osId, osNumber });
  };

  const executeDeleteOS = async () => {
    if (!osToDelete) return;
    setIsDeleting(true);
    try {
      await supabaseService.deleteOrder(osToDelete.id);
      setOrders(prev => prev.filter(o => o.id !== osToDelete.id));
      if (selectedOsId === osToDelete.id) {
        setSelectedOsId(null);
        setView('list');
      }
      showToast(`Ordem de Serviço ${osToDelete.osNumber} excluída com sucesso!`);
      setOsToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir Ordem de Serviço:", err);
      showToast("Erro ao excluir a Ordem de Serviço.");
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedOS = orders.find((o) => o.id === selectedOsId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Toast Feedback Notification */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-purple-500/40 flex items-center gap-3 text-xs font-semibold"
          >
            <CheckCircle2 className="h-5 w-5 text-purple-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Popup Modal */}
      <AnimatePresence>
        {osToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center relative overflow-hidden"
            >
              <div className="h-14 w-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
                <AlertCircle className="h-7 w-7" />
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-2">
                Tem certeza que deseja excluir?
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
                Você está prestes a excluir permanentemente a <strong className="text-slate-900 font-bold">Ordem de Serviço {osToDelete.osNumber}</strong>. Se você clicar em <strong>"Não"</strong>, voltará sem alterar nada.
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOsToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Não, voltar
                </button>

                <button
                  onClick={executeDeleteOS}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-2xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Sim, excluir</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Portal Main Grid View */}
      {subModule === 'portal' && (
        <div className="space-y-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white border border-slate-800 shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider">
                <span className="text-base">⚰️</span>
                <span>Módulo Gestão Funerária</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Módulos de Gestão Funerária
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                Selecione o módulo operacional para gerenciar ordens de serviço ou realizar pesquisas de satisfação e avaliação do atendimento com os familiares Bahia Prev.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
                <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                  Bahia Prev Operations
                </span>
                <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                  <User className="h-3.5 w-3.5 text-blue-400" />
                  Agente / Atendente: <strong className="text-white ml-0.5">{loggedInAgentName}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              whileHover={{ y: -4 }}
              onClick={() => setSubModule('os')}
              className="bg-slate-900 border border-purple-500/30 hover:border-purple-500 rounded-3xl p-6 sm:p-8 cursor-pointer transition-all duration-300 shadow-xl hover:shadow-purple-500/20 group relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform">
                    <Cross className="h-8 w-8" />
                  </div>
                  <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold rounded-full">
                    OS & Atendimentos
                  </span>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-purple-300 transition-colors">
                    Ordem de Serviço
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                    Abertura de formulário de atendimento interno, fila para agentes assumirem a OS, botões rápidos de Ligação, WhatsApp e Rota no Google Maps, fotos/áudios e checklist de 16 etapas.
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-purple-400 group-hover:text-purple-300">
                <span>Acessar Ordens de Serviço</span>
                <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              onClick={() => setSubModule('satisfaction')}
              className="bg-slate-900 border border-emerald-500/30 hover:border-emerald-500 rounded-3xl p-6 sm:p-8 cursor-pointer transition-all duration-300 shadow-xl hover:shadow-emerald-500/20 group relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3.5 bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-600/30 group-hover:scale-105 transition-transform">
                    <HeartHandshake className="h-8 w-8" />
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-full">
                    Atendimento & Qualidade
                  </span>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-300 transition-colors">
                    Pesquisa de Satisfação
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                    Pesquisa completa de avaliação do atendimento prestado às famílias, indicadores IQAF e NPS com cálculos matemáticos em tempo real.
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                <span>Acessar Pesquisa de Satisfação</span>
                <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Sub-module 2: Pesquisa de Satisfação */}
      {subModule === 'satisfaction' && (
        <SatisfactionSurveySection onBackToModules={() => setSubModule('portal')} />
      )}

      {/* Sub-module 1: Ordem de Serviço */}
      {subModule === 'os' && (
        <>
          <div className="mb-4">
            <button
              onClick={() => setSubModule('portal')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-2xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              <ArrowLeft className="h-4 w-4 text-purple-400" />
              <span>Voltar aos Módulos de Gestão Funerária</span>
            </button>
          </div>

          {/* Main Header Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white border border-slate-800 shadow-2xl mb-8">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider">
                  <span className="text-base">⚰️</span>
                  <span>Módulo Operacional – Bahia Prev</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                  <span>Ordens de Serviço Funerárias</span>
                </h1>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                  Abertura de chamados pelos atendentes, disponibilização para agentes assumirem os serviços, gerenciamento das 14 seções do atendimento, botões diretos de ligação/WhatsApp e acompanhamento de etapas.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
                  <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                    <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                    Bahia Prev Operations
                  </span>
                  <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                    <User className="h-3.5 w-3.5 text-blue-400" />
                    Usuário Logado: <strong className="text-white ml-0.5">{loggedInAgentName}</strong>
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center gap-3 w-full md:w-auto">
                {view === 'list' && (
                  <button
                    onClick={() => setView('new')}
                    className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-purple-600/25 border border-purple-400/30 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] cursor-pointer"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Nova Ordem de Serviço</span>
                  </button>
                )}

                {view !== 'list' && (
                  <button
                    onClick={() => setView('list')}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Voltar à Lista de OS</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* VIEW 1: NEW OS (Formulário de Abertura de Atendimento) */}
          {view === 'new' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <NewFuneralOrderForm
                initialAgentName={loggedInAgentName}
                onCancel={() => setView('list')}
                onSubmit={handleStartNewOSWithForm}
                isSubmitting={isCreating}
              />
            </motion.div>
          )}

          {/* VIEW 2: OS DETAIL & OPERATIONAL CHECKLIST */}
          {view === 'detail' && selectedOS && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 max-w-5xl mx-auto"
            >
              {/* Top Navigation */}
              <div className="space-y-3">
                {isReadOnlyView && (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-center gap-3 text-amber-950 shadow-2xs">
                    <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold shadow-2xs">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-amber-800 block">Modo Apenas Visualização</span>
                      <p className="text-xs font-medium text-amber-900">Você está visualizando esta Ordem de Serviço em modo de leitura. Nenhuma alteração pode ser realizada nesta ordem.</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <button
                    onClick={() => setView('list')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Lista de Ordens</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setView('track')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                      title="Acompanhar Atendimento"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Acompanhar Ordem</span>
                    </button>

                    {!isReadOnlyView && (
                      <button
                        onClick={(e) => handleDeleteOS(selectedOS.id, selectedOS.osNumber, e)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                        <span>Excluir</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Header OS Main Card */}
              {(() => {
                const isFinished = selectedOS.status === 'Finalizado' || selectedOS.status === 'Finalizada' || selectedOS.status === 'Serviço Encerrado';
                const isOpenAndWaiting = selectedOS.status === 'Aberto' || selectedOS.responsavelName === 'Aguardando Agente';

                return (
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                            Ordem de Serviço #{selectedOS.osNumber}
                          </span>

                          {isReadOnlyView && (
                            <span className="text-xs font-black text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Lock className="h-3.5 w-3.5 text-amber-700" />
                              Apenas Leitura
                            </span>
                          )}

                          {selectedOS.prioridade && (
                            <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                              selectedOS.prioridade === 'Emergencial'
                                ? 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse'
                                : selectedOS.prioridade === 'Urgente'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                              Prioridade: {selectedOS.prioridade}
                            </span>
                          )}
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                          {selectedOS.formData?.nomeFalecido || selectedOS.osNumber}
                        </h2>

                        {selectedOS.formData?.nomeFamiliar && (
                          <p className="text-xs text-slate-600 font-medium">
                            Familiar Responsável: <strong className="text-slate-900">{selectedOS.formData.nomeFamiliar}</strong> ({selectedOS.formData.parentesco || 'Responsável'})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Banners for Start Service or Accompany Service */}
                    {!isReadOnlyView && (
                      isOpenAndWaiting ? (
                        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border-2 border-amber-400/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-bounce">
                              <Zap className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900">Atendimento Aberto pelo Atendente ({selectedOS.atendenteName || 'Atendente'})</h4>
                              <p className="text-xs text-slate-600">
                                Clique no botão para iniciar o atendimento. Seu nome será registrado como o Agente Principal (Agente 1).
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handlePickupOS(selectedOS.id)}
                            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] cursor-pointer shrink-0"
                          >
                            <UserCheck className="h-4 w-4" />
                            <span>⚡ Iniciar Atendimento</span>
                          </button>
                        </div>
                      ) : !isFinished ? (
                        <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                              <UserCheck className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">Atendimento em Andamento por {selectedOS.responsavelName}</h4>
                              <p className="text-xs text-slate-600">
                                {selectedOS.agentesAcompanhamento && selectedOS.agentesAcompanhamento.some(a => a.name.toLowerCase() === loggedInAgentName.toLowerCase())
                                  ? `Você (${loggedInAgentName}) está registrado no acompanhamento deste atendimento.`
                                  : selectedOS.responsavelName.toLowerCase() === loggedInAgentName.toLowerCase()
                                  ? `Você é o Agente Principal responsável por esta ordem.`
                                  : `Clique no botão ao lado para dar continuidade ao atendimento e prestar suporte em equipe.`}
                              </p>
                            </div>
                          </div>

                          {selectedOS.responsavelName.toLowerCase() !== loggedInAgentName.toLowerCase() && (
                            selectedOS.agentesAcompanhamento && selectedOS.agentesAcompanhamento.some(a => a.name.toLowerCase() === loggedInAgentName.toLowerCase()) ? (
                              <button
                                onClick={() => handleRemoveAccompanyOS(selectedOS.id, loggedInAgentName)}
                                className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 shadow-2xs"
                                title="Retirar meu nome do acompanhamento desta OS"
                              >
                                <UserMinus className="h-4 w-4 text-rose-600" />
                                <span>🚪 Sair do Acompanhamento</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAccompanyOS(selectedOS.id)}
                                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
                              >
                                <UserCheck className="h-4 w-4" />
                                <span>🤝 Dar Continuidade ao Atendimento</span>
                              </button>
                            )
                          )}
                        </div>
                      ) : null
                    )}

                    {/* Contact Quick Action Bar (Call, WhatsApp, Maps Route) */}
                    {selectedOS.formData && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                        {/* Call Phone */}
                        <a
                          href={`tel:${selectedOS.formData.telefoneFamiliar || selectedOS.formData.whatsappFamiliar}`}
                          className="py-2.5 px-3 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200/80 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-2xs hover:shadow-xs"
                        >
                          <Phone className="h-4 w-4 text-blue-600" />
                          <span>Ligar ({selectedOS.formData.telefoneFamiliar || 'Sem fone'})</span>
                        </a>

                        {/* WhatsApp */}
                        {selectedOS.formData.whatsappFamiliar ? (
                          <a
                            href={`https://wa.me/55${selectedOS.formData.whatsappFamiliar.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Olá ${selectedOS.formData.nomeFamiliar}, me chamo ${loggedInAgentName} e sou da equipe Bahia Prev responsável pelo atendimento de ${selectedOS.formData.nomeFalecido}. Estou à disposição!`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs hover:shadow-md"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span>Abrir WhatsApp</span>
                          </a>
                        ) : (
                          <button disabled className="py-2.5 px-3 bg-slate-100 text-slate-400 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed">
                            <MessageCircle className="h-4 w-4" />
                            <span>Sem WhatsApp</span>
                          </button>
                        )}

                        {/* Maps Route */}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            selectedOS.formData.enderecoRemocao || selectedOS.formData.localVelorio || 'Salvador BA'
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200/80 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-2xs hover:shadow-xs"
                        >
                          <MapPin className="h-4 w-4 text-purple-600" />
                          <span>Rota no Google Maps</span>
                        </a>
                      </div>
                    )}

                    {/* Info Card Summary (Atendente, Agente 1, Agente 2) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-100/80">
                        <span className="text-purple-700 font-bold uppercase text-[10px] block">1. Atendente (Abertura OS)</span>
                        <span className="font-extrabold text-slate-900 text-sm block">{selectedOS.atendenteName || 'Atendente'}</span>
                        <span className="text-[10px] text-slate-500 block">Unidade: {selectedOS.unidadeAtendimento || 'Sede'}</span>
                      </div>

                      <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-100/80">
                        <span className="text-amber-800 font-bold uppercase text-[10px] block">2. Agente Principal (Iniciou OS)</span>
                        <span className="font-extrabold text-slate-900 text-sm block">{selectedOS.responsavelName}</span>
                        <span className="text-[10px] text-slate-500 block">{selectedOS.status === 'Aberto' ? 'Aguardando Início' : 'Atendimento Ativo'}</span>
                      </div>

                      <div className="p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-100/80">
                        <span className="text-indigo-700 font-bold uppercase text-[10px] block mb-1">3. Agente(s) Acompanhamento</span>
                        {selectedOS.agentesAcompanhamento && selectedOS.agentesAcompanhamento.length > 0 ? (
                          <div className="space-y-1">
                            {selectedOS.agentesAcompanhamento.map((agente, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs bg-white/80 px-2 py-1 rounded-lg border border-indigo-100/80">
                                <span className="font-extrabold text-indigo-950 truncate max-w-[120px]">{agente.name}</span>
                                <button
                                  onClick={() => handleRemoveAccompanyOS(selectedOS.id, agente.name)}
                                  className="text-rose-600 hover:text-rose-800 hover:bg-rose-100/70 px-1.5 py-0.5 rounded transition-colors text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  title={`Retirar ${agente.name} do acompanhamento`}
                                >
                                  <UserMinus className="h-3 w-3" />
                                  <span>Retirar</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="font-extrabold text-slate-500 text-sm block">Nenhum outro agente</span>
                        )}
                        <span className="text-[10px] text-indigo-600 font-medium block mt-1">Suporte Conjunto</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {(() => {
                      const total = selectedOS.checklist.length;
                      const completedCount = selectedOS.checklist.filter(i => i.completed).length;
                      const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
                      const pendingIndex = selectedOS.checklist.findIndex(i => !i.completed);
                      const currentStep = pendingIndex !== -1 ? selectedOS.checklist[pendingIndex] : null;

                      return (
                        <div className="pt-2 space-y-3">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                            <span className="flex items-center gap-1.5">
                              <CheckSquare className="h-4 w-4 text-purple-600" />
                              Progresso do Checklist Operacional
                            </span>
                            <span className="text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 font-extrabold">
                              {completedCount} de {total} concluídos ({pct}%)
                            </span>
                          </div>

                          {!isFinished && !isOpenAndWaiting && (
                            <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50/70 to-purple-50 border border-purple-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-9 w-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                                  {pendingIndex >= 0 ? pendingIndex + 1 : total}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 block">
                                    Status Atual: Em Andamento • Etapa {pendingIndex >= 0 ? pendingIndex + 1 : total} de {total}
                                  </span>
                                  <span className="font-extrabold text-slate-900 text-sm block truncate">
                                    {currentStep ? currentStep.label : 'Todas as etapas concluídas'}
                                  </span>
                                </div>
                              </div>
                              <span className="px-3.5 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-black shrink-0 shadow-xs flex items-center justify-center gap-1.5">
                                <Activity className="h-4 w-4 animate-pulse" />
                                <span>Em Andamento</span>
                              </span>
                            </div>
                          )}

                          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/80">
                            <div 
                              className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full transition-all duration-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* FORM DATA ACCORDION / EXPANDABLE DETAILS */}
              {selectedOS.formData && (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
                  <button
                    onClick={() => setShowFormDataDetails(!showFormDataDetails)}
                    className="w-full flex items-center justify-between gap-2 pb-3 border-b border-slate-100 text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                          Dados Completos do Formulário de Abertura (14 Seções)
                        </h3>
                        <p className="text-xs text-slate-500">Clique para expandir ou ocultar os detalhes preenchidos pelo atendente</p>
                      </div>
                    </div>

                    <div className="p-2 bg-slate-100 group-hover:bg-purple-100 rounded-xl transition-colors">
                      {showFormDataDetails ? <ChevronUp className="h-5 w-5 text-purple-700" /> : <ChevronDown className="h-5 w-5 text-slate-600" />}
                    </div>
                  </button>

                  {showFormDataDetails && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                      {/* 1. Falecido */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1.5">
                        <span className="font-extrabold text-purple-900 text-xs block border-b pb-1 mb-2">1. FALECIDO</span>
                        <p><strong>Nome:</strong> {selectedOS.formData.nomeFalecido}</p>
                        <p><strong>Idade / Nasc:</strong> {selectedOS.formData.idade} ({selectedOS.formData.dataNascimento || 'N/A'})</p>
                        <p><strong>Óbito:</strong> {selectedOS.formData.dataFalecimento} às {selectedOS.formData.horarioFalecimento}</p>
                        <p><strong>Local:</strong> {selectedOS.formData.localFalecimentoType} - {selectedOS.formData.nomeLocalFalecimento} ({selectedOS.formData.cidadeFalecimento})</p>
                        <p><strong>Causa:</strong> {selectedOS.formData.causaFalecimento}</p>
                        {selectedOS.formData.observacoesFalecido && <p className="italic text-slate-600 pt-1">"{selectedOS.formData.observacoesFalecido}"</p>}
                      </div>

                      {/* 2. Familiar */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1.5">
                        <span className="font-extrabold text-indigo-900 text-xs block border-b pb-1 mb-2">2. FAMILIAR RESPONSÁVEL</span>
                        <p><strong>Nome:</strong> {selectedOS.formData.nomeFamiliar}</p>
                        <p><strong>Parentesco:</strong> {selectedOS.formData.parentesco}</p>
                        <p><strong>Telefone / WhatsApp:</strong> {selectedOS.formData.telefoneFamiliar} / {selectedOS.formData.whatsappFamiliar}</p>
                        <p><strong>Decisor Principal:</strong> {selectedOS.formData.responsavelDecisoes}</p>
                        {selectedOS.formData.observacoesFamiliar && <p className="italic text-slate-600 pt-1">"{selectedOS.formData.observacoesFamiliar}"</p>}
                      </div>

                      {/* 3 & 4. Serviço e Remoção */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1.5">
                        <span className="font-extrabold text-blue-900 text-xs block border-b pb-1 mb-2">3 & 4. SERVIÇO E REMOÇÃO</span>
                        <p><strong>Tipo:</strong> {selectedOS.formData.tipoAtendimento} ({selectedOS.formData.numeroContrato || 'Sem contrato'})</p>
                        <p><strong>Endereço Remoção:</strong> {selectedOS.formData.enderecoRemocao}, {selectedOS.formData.cidadeRemocao}</p>
                        <p><strong>Corpo Liberado?</strong> {selectedOS.formData.corpoLiberado} | <strong>Horário:</strong> {selectedOS.formData.horarioPrevistoRemocao}</p>
                        {selectedOS.formData.observacoesRemocao && <p className="italic text-slate-600 pt-1">"{selectedOS.formData.observacoesRemocao}"</p>}
                      </div>

                      {/* 5 & 6. Velório e Sepultamento */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1.5">
                        <span className="font-extrabold text-emerald-900 text-xs block border-b pb-1 mb-2">5 & 6. VELÓRIO E DESTINO FINAL</span>
                        <p><strong>Haverá Velório?</strong> {selectedOS.formData.haveraVelorio} ({selectedOS.formData.localVelorio || 'N/A'})</p>
                        <p><strong>Data/Horário Velório:</strong> {selectedOS.formData.dataVelorio} às {selectedOS.formData.horarioVelorio}</p>
                        <p><strong>Destino Final:</strong> {selectedOS.formData.opcaoFinal} no {selectedOS.formData.localSepultamento}</p>
                        <p><strong>Horário Sepultamento:</strong> {selectedOS.formData.dataSepultamento} às {selectedOS.formData.horarioSepultamento}</p>
                      </div>

                      {/* 7 & 8. Preparação e Urna */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1.5">
                        <span className="font-extrabold text-rose-900 text-xs block border-b pb-1 mb-2">7 & 8. PREPARAÇÃO E URNA</span>
                        <p><strong>Procedimentos:</strong> Tanato ({selectedOS.formData.tanatopraxia}), Maquiagem ({selectedOS.formData.maquiagem}), Higienização ({selectedOS.formData.higienizacao})</p>
                        <p><strong>Roupa Família?</strong> {selectedOS.formData.roupaFamilia} ({selectedOS.formData.descricaoRoupa || 'Padrão'})</p>
                        <p><strong>Urna:</strong> Plano ({selectedOS.formData.urnaPlano}) | Upgrade ({selectedOS.formData.trocaUrna} {selectedOS.formData.modeloUrna})</p>
                      </div>

                      {/* 9, 10, 11, 12, 13, 14. Outros */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1.5">
                        <span className="font-extrabold text-amber-900 text-xs block border-b pb-1 mb-2">9 A 14. ORNAMENTAÇÃO & OBSERVAÇÕES</span>
                        <p><strong>Flores / Coroa:</strong> {selectedOS.formData.arranjosFlorais === 'Sim' ? `${selectedOS.formData.qtdArranjos} arranjos` : 'Sem flores'} | Coroa: {selectedOS.formData.coroaFlores}</p>
                        <p><strong>Faixa de Homenagem:</strong> "{selectedOS.formData.mensagemFaixa}"</p>
                        <p><strong>Translado:</strong> {selectedOS.formData.necessitaTranslado === 'Sim' ? `${selectedOS.formData.cidadeOrigemTranslado} -> ${selectedOS.formData.cidadeDestinoTranslado}` : 'Não necessita'}</p>
                        {selectedOS.formData.observacoesImportantes && <p className="font-bold text-amber-900 bg-amber-100 p-2 rounded-lg mt-1">Obs Importante: "{selectedOS.formData.observacoesImportantes}"</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PHOTOS & AUDIOS GALLERY */}
              {((selectedOS.photos && selectedOS.photos.length > 0) || (selectedOS.audioMemos && selectedOS.audioMemos.length > 0)) && (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Paperclip className="h-5 w-5 text-purple-600" />
                    <span>Anexos do Atendimento (Fotos e Áudios da Família)</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Photos */}
                    {selectedOS.photos && selectedOS.photos.length > 0 && (
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-slate-700 block">Fotos Anexadas:</span>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedOS.photos.map((ph) => (
                            <div
                              key={ph.id}
                              onClick={() => setPreviewPhotoModal(ph.photoUrl)}
                              className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer shadow-2xs hover:shadow-md transition-all"
                            >
                              <img src={ph.photoUrl} alt={ph.title} className="h-24 w-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="p-1.5 bg-slate-950/80 text-white text-[10px] font-bold truncate">
                                {ph.category}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audios */}
                    {selectedOS.audioMemos && selectedOS.audioMemos.length > 0 && (
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-slate-700 block">Áudios e Mensagens da Família:</span>
                        <div className="space-y-2">
                          {selectedOS.audioMemos.map((au) => (
                            <div key={au.id} className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-1">
                              <span className="text-xs font-bold text-indigo-950 block">{au.title}</span>
                              <audio controls src={au.audioUrl} className="w-full h-8" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CHECKLIST OPERACIONAL SECTION */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-purple-600" />
                    <span>Checklist Operacional de 16 Etapas</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Marque cada etapa conforme o andamento do serviço. As alterações e horários são salvos em tempo real.
                  </p>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
                  {selectedOS.checklist.map((item, idx) => {
                    const isLastItem = item.label === 'Serviço encerrado';
                    const isOSFinished = selectedOS.status === 'Finalizado' || selectedOS.status === 'Finalizada' || selectedOS.status === 'Serviço Encerrado';
                    const isOSOpenAndWaiting = selectedOS.status === 'Aberto' || selectedOS.responsavelName === 'Aguardando Agente';
                    const pendingIndex = selectedOS.checklist.findIndex(i => !i.completed);
                    const isCurrentActiveStep = !isOSFinished && !isOSOpenAndWaiting && !item.completed && idx === pendingIndex;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleCheckitem(selectedOS.id, item.id)}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all cursor-pointer select-none ${
                          item.completed 
                            ? 'bg-purple-50/40 hover:bg-purple-100/60' 
                            : isCurrentActiveStep
                            ? 'bg-purple-100/40 hover:bg-purple-100/80 border-l-4 border-l-purple-600 ring-1 ring-purple-300/80 shadow-2xs'
                            : 'hover:bg-slate-50/80 bg-white'
                        } ${isLastItem ? 'bg-amber-50/30' : ''}`}
                      >
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div className="shrink-0 mt-0.5">
                            {item.completed ? (
                              <div className="h-6 w-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                <CheckSquare className="h-4 w-4" />
                              </div>
                            ) : isCurrentActiveStep ? (
                              <div className="h-6 w-6 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs animate-pulse">
                                <Activity className="h-3.5 w-3.5" />
                              </div>
                            ) : (
                              <div className="h-6 w-6 rounded-lg border-2 border-slate-300 text-slate-300 hover:border-purple-400 flex items-center justify-center">
                                <Square className="h-4 w-4 opacity-0" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-bold block ${
                                item.completed ? 'text-slate-900 font-extrabold' : isCurrentActiveStep ? 'text-purple-950 font-black' : 'text-slate-800'
                              } ${isLastItem ? 'text-purple-950 font-black' : ''}`}>
                                <span className="text-slate-400 font-semibold mr-2">{idx + 1}.</span>
                                {item.label}
                              </span>

                              {isCurrentActiveStep && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-600 text-white font-black text-[10px] animate-pulse shadow-2xs">
                                  <Activity className="h-3 w-3" />
                                  Etapa Atual (Em Andamento)
                                </span>
                              )}
                            </div>

                            {item.completed && (
                              <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-950 border border-emerald-200/90 font-bold">
                                  <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Concluído por: <strong className="font-black text-emerald-950">{item.completedBy || loggedInAgentName || 'Agente'}</strong></span>
                                </span>
                                {item.completedAt && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200/70">
                                    <Clock className="h-3 w-3 text-slate-500" />
                                    <span>{item.completedAt}</span>
                                  </span>
                                )}
                              </div>
                            )}

                            {item.completed && (item.observations || item.photoUrl) && (
                              <div className="mt-2 p-2.5 bg-purple-50/80 border border-purple-100 rounded-xl space-y-1.5 text-xs text-slate-700">
                                {item.observations && (
                                  <div className="flex items-start gap-1.5">
                                    <MessageSquare className="h-3.5 w-3.5 text-purple-600 shrink-0 mt-0.5" />
                                    <p className="whitespace-pre-wrap leading-relaxed text-slate-800 font-medium">{item.observations}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCheckitemModal(selectedOS.id, item.id, isReadOnlyView);
                            }}
                            className="p-2 text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Adicionar / Editar observações ou fotos desta etapa"
                          >
                            <MessageSquare className="h-4 w-4 text-purple-600" />
                            <span className="hidden sm:inline">Obs / Foto</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW 3: TRACKING VIEW (PAINEL GERENCIAL) */}
          {view === 'track' && selectedOS && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <button
                  onClick={() => setView('list')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Voltar para Lista</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setView('detail')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Checklist Operacional</span>
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 rounded-3xl p-6 sm:p-8 text-white border border-indigo-800/60 shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/60 pb-6">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs font-bold mb-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Painel de Acompanhamento em Tempo Real</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                      {selectedOS.formData?.nomeFalecido || selectedOS.osNumber}
                    </h2>
                  </div>

                  <span className="px-4 py-2 rounded-2xl bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 font-bold text-xs">
                    Status: {selectedOS.status}
                  </span>
                </div>

                {/* Timeline History Log */}
                {selectedOS.timeline && selectedOS.timeline.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider block">Histórico do Atendimento</span>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {selectedOS.timeline.map((log) => (
                        <div key={log.id} className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-white block">{log.action}</span>
                            <span className="text-[10px] text-indigo-300">por {log.userName}</span>
                          </div>
                          <span className="text-[10px] font-mono text-indigo-200 bg-indigo-900/60 px-2 py-0.5 rounded-md shrink-0">
                            {log.dateFormatted} {log.timeFormatted}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* VIEW 4: ORDERS LIST / OVERVIEW */}
          {view === 'list' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    <span>Gestão de Ordens de Serviço Funerárias</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fila de atendimentos abertos e em andamento com a equipe Bahia Prev
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 self-start sm:self-auto overflow-x-auto max-w-full">
                  <button
                    onClick={() => setListTab('em_andamento')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                      listTab === 'em_andamento'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Activity className="h-3.5 w-3.5" />
                    <span>Em Andamento / Abertos</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                      listTab === 'em_andamento' ? 'bg-purple-700 text-purple-100' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {orders.filter(o => o.status !== 'Finalizado' && o.status !== 'Finalizada' && o.status !== 'Serviço Encerrado').length}
                    </span>
                  </button>

                  <button
                    onClick={() => setListTab('finalizadas')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                      listTab === 'finalizadas'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Finalizadas</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                      listTab === 'finalizadas' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {orders.filter(o => o.status === 'Finalizado' || o.status === 'Finalizada' || o.status === 'Serviço Encerrado').length}
                    </span>
                  </button>

                  <button
                    onClick={() => setListTab('todas')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                      listTab === 'todas'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Todas</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                      listTab === 'todas' ? 'bg-slate-900 text-slate-200' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {orders.length}
                    </span>
                  </button>
                </div>
              </div>

              {loadingOrders ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center">
                  <RefreshCw className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700">Carregando ordens de serviço...</p>
                </div>
              ) : (() => {
                const filteredOrders = orders.filter(os => {
                  if (listTab === 'em_andamento') return os.status !== 'Finalizado' && os.status !== 'Finalizada' && os.status !== 'Serviço Encerrado';
                  if (listTab === 'finalizadas') return os.status === 'Finalizado' || os.status === 'Finalizada' || os.status === 'Serviço Encerrado';
                  return true;
                });

                if (filteredOrders.length === 0) {
                  return (
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-10 sm:p-14 text-center max-w-xl mx-auto shadow-xs">
                      <div className="h-16 w-16 rounded-3xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-4">
                        <Cross className="h-8 w-8" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">
                        {listTab === 'em_andamento' && 'Nenhuma Ordem em Andamento'}
                        {listTab === 'finalizadas' && 'Nenhuma Ordem Finalizada'}
                        {listTab === 'todas' && 'Nenhuma Ordem de Serviço registrada'}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-4">
                        Clique em "Nova Ordem de Serviço" para abrir um novo atendimento funerário.
                      </p>
                      <button
                        onClick={() => setView('new')}
                        className="px-5 py-2.5 bg-purple-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-purple-700 transition-colors cursor-pointer inline-flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Nova Ordem de Serviço</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredOrders.map((os) => {
                      const totalChecklist = os.checklist.length;
                      const completedItems = os.checklist.filter(i => i.completed);
                      const completedCount = completedItems.length;
                      const pct = totalChecklist > 0 ? Math.round((completedCount / totalChecklist) * 100) : 0;
                      const isFinished = os.status === 'Finalizado' || os.status === 'Finalizada' || os.status === 'Serviço Encerrado';
                      const isOpenAndWaiting = os.status === 'Aberto' || os.responsavelName === 'Aguardando Agente';
                      const pendingIndex = os.checklist.findIndex(i => !i.completed);
                      const currentStepItem = pendingIndex !== -1 ? os.checklist[pendingIndex] : null;

                      return (
                        <motion.div
                          key={os.id}
                          whileHover={{ y: -2 }}
                          className={`bg-white border rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group ${
                            isOpenAndWaiting ? 'border-amber-300 ring-2 ring-amber-400/20' : 'border-slate-200/80 hover:border-purple-300'
                          }`}
                        >
                          <div>
                            {/* OS Top Header */}
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="text-lg font-black text-slate-900 group-hover:text-purple-600 transition-colors">
                                {os.osNumber}
                              </span>

                              {isOpenAndWaiting ? (
                                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] inline-flex items-center gap-1 animate-pulse">
                                  <Zap className="h-3.5 w-3.5 text-amber-600" />
                                  Aguardando Agente
                                </span>
                              ) : isFinished ? (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] inline-flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  Finalizada
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-950 border border-purple-300 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs">
                                  <Activity className="h-3.5 w-3.5 text-purple-600 animate-pulse" />
                                  Em Andamento
                                </span>
                              )}
                            </div>

                            {/* Status "Em Andamento" and Current Step Banner */}
                            {!isOpenAndWaiting && !isFinished && (
                              <div className="p-2.5 bg-purple-50/90 border border-purple-200/90 rounded-2xl mb-3 space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase text-purple-700 tracking-wider">
                                  <span className="flex items-center gap-1">
                                    <Activity className="h-3 w-3 text-purple-600 animate-pulse" />
                                    Em Andamento
                                  </span>
                                  <span className="bg-purple-200/80 text-purple-950 px-1.5 py-0.5 rounded-md font-extrabold">
                                    Etapa {pendingIndex >= 0 ? pendingIndex + 1 : totalChecklist} de {totalChecklist}
                                  </span>
                                </div>
                                <div className="text-xs font-extrabold text-slate-900 truncate flex items-center gap-1.5 pt-0.5">
                                  <span className="h-2 w-2 rounded-full bg-purple-600 animate-ping shrink-0" />
                                  <span className="truncate">{currentStepItem ? currentStepItem.label : 'Checklist concluído'}</span>
                                </div>
                              </div>
                            )}

                            {/* Falecido, Familiar, Atendente & Agentes info */}
                            <div className="space-y-2 text-xs text-slate-600 mb-4 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                              <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Falecido:</span>
                                <span className="font-extrabold text-slate-900 text-sm block truncate">
                                  {os.formData?.nomeFalecido || 'Não informado'}
                                </span>
                              </div>

                              {os.formData?.nomeFamiliar && (
                                <div className="border-t border-slate-200/60 pt-1.5">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Familiar:</span>
                                  <span className="font-bold text-slate-800 truncate block">
                                    {os.formData.nomeFamiliar} ({os.formData.telefoneFamiliar || 'Sem fone'})
                                  </span>
                                </div>
                              )}

                              <div className="border-t border-slate-200/60 pt-1.5 space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-500 font-semibold">Atendente:</span>
                                  <span className="font-bold text-slate-800 truncate max-w-[150px]">
                                    {os.atendenteName || 'Atendente'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-500 font-semibold">Agente 1 (Iniciou):</span>
                                  <span className={`font-bold truncate max-w-[150px] ${isOpenAndWaiting ? 'text-amber-800 font-extrabold' : 'text-slate-900'}`}>
                                    {os.responsavelName}
                                  </span>
                                </div>

                                {os.agentesAcompanhamento && os.agentesAcompanhamento.length > 0 && (
                                  <div className="flex items-center justify-between text-[11px] gap-1 pt-0.5">
                                    <span className="text-indigo-600 font-semibold shrink-0">Agente 2 (Acompanha):</span>
                                    <div className="flex items-center gap-1 flex-wrap justify-end">
                                      {os.agentesAcompanhamento.map((agente, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-950 border border-indigo-200/80 rounded-md font-bold text-[10px]"
                                        >
                                          <span className="truncate max-w-[100px]">{agente.name}</span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRemoveAccompanyOS(os.id, agente.name);
                                            }}
                                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded p-0.5 transition-colors cursor-pointer"
                                            title={`Retirar ${agente.name} do acompanhamento`}
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Quick Action Contact Buttons if phone */}
                            {os.formData?.telefoneFamiliar && (
                              <div className="flex items-center gap-1.5 mb-3">
                                <a
                                  href={`tel:${os.formData.telefoneFamiliar}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                                  title="Ligar para o Familiar"
                                >
                                  <Phone className="h-3.5 w-3.5 text-blue-600" />
                                  <span>Ligar</span>
                                </a>

                                {os.formData.whatsappFamiliar && (
                                  <a
                                    href={`https://wa.me/55${os.formData.whatsappFamiliar.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                                    title="WhatsApp"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                                    <span>Whats</span>
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Progress bar */}
                            <div className="pt-1">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                                <span>Checklist</span>
                                <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 text-[10px]">
                                  {completedCount}/{totalChecklist} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/80">
                                <div 
                                  className={`h-full transition-all duration-300 rounded-full ${
                                    isFinished ? 'bg-emerald-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* CTA Pickup / Open / Accompany buttons */}
                          <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col gap-2">
                            {isOpenAndWaiting ? (
                              <button
                                onClick={() => handlePickupOS(os.id)}
                                className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white font-black text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Zap className="h-4 w-4" />
                                <span>⚡ Iniciar Atendimento</span>
                              </button>
                            ) : !isFinished && os.responsavelName.toLowerCase() !== loggedInAgentName.toLowerCase() && !(os.agentesAcompanhamento && os.agentesAcompanhamento.some(a => a.name.toLowerCase() === loggedInAgentName.toLowerCase())) ? (
                              <button
                                onClick={() => handleAccompanyOS(os.id)}
                                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              >
                                <UserCheck className="h-4 w-4" />
                                <span>🤝 Dar Continuidade ao Atendimento</span>
                              </button>
                            ) : null}

                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                              <button
                                onClick={() => {
                                  setSelectedOsId(os.id);
                                  setIsReadOnlyView(false);
                                  setView('detail');
                                }}
                                className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs min-w-[110px]"
                                title="Abrir ordem para gerenciamento e edição"
                              >
                                <span>Ver Atendimento</span>
                                <ChevronRight className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedOsId(os.id);
                                  setIsReadOnlyView(true);
                                  setView('detail');
                                }}
                                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0"
                                title="Apenas visualizar a ordem sem permissão de alterar nada"
                              >
                                <Lock className="h-3.5 w-3.5 text-slate-500" />
                                <span>Apenas Visualizar</span>
                              </button>

                              <button
                                onClick={(e) => handleDeleteOS(os.id, os.osNumber, e)}
                                className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 rounded-xl transition-all cursor-pointer shrink-0"
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* MODAL FULLSCREEN PREVIEW DE FOTO */}
      {previewPhotoModal && (
        <div 
          onClick={() => setPreviewPhotoModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-3xl max-h-[90vh] p-2 bg-white rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewPhotoModal(null)}
              className="absolute -top-3 -right-3 bg-rose-600 text-white p-1.5 rounded-full shadow-lg hover:bg-rose-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={previewPhotoModal} alt="Foto expandida" className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain" />
          </div>
        </div>
      )}

      {/* MODAL DE OBSERVAÇÃO / FOTO DO CHECKLIST */}
      {checkitemModal && checkitemModal.isOpen && (
        <div 
          onClick={() => setCheckitemModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
        >
          <div 
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 border border-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-purple-600 block">Observação da Etapa</span>
                <h3 className="text-lg font-black text-slate-900">{checkitemModal.itemLabel}</h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckitemModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {checkitemModal.completedBy && (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs flex items-center justify-between text-emerald-900 font-semibold">
                <span>Concluído por: <strong className="font-extrabold text-emerald-950">{checkitemModal.completedBy}</strong></span>
                {checkitemModal.completedAt && <span className="text-emerald-700">às {checkitemModal.completedAt}</span>}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observações ou Anotações da Etapa:
                </label>
                <textarea
                  value={checkitemModal.observations}
                  onChange={(e) => setCheckitemModal(prev => prev ? { ...prev, observations: e.target.value } : null)}
                  disabled={checkitemModal.isReadOnly}
                  placeholder="Ex: Documentação entregue no cartório, ornamentação concluída com flores brancas..."
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL ou Link da Foto (opcional):
                </label>
                <input
                  type="text"
                  value={checkitemModal.photoUrl}
                  onChange={(e) => setCheckitemModal(prev => prev ? { ...prev, photoUrl: e.target.value } : null)}
                  disabled={checkitemModal.isReadOnly}
                  placeholder="https://exemplo.com/foto.jpg"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium disabled:opacity-80 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {checkitemModal.isReadOnly ? (
                <button
                  type="button"
                  onClick={() => setCheckitemModal(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Fechar (Modo Leitura)</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setCheckitemModal(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveItemObservationsOnly}
                    disabled={checkitemModal.isSaving}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {checkitemModal.isSaving ? 'Salvando...' : 'Salvar Observação'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
