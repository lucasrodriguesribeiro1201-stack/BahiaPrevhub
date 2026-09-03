import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HeartHandshake, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  Star, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2, 
  FileText, 
  Trash2, 
  Eye, 
  Edit3, 
  ArrowLeft, 
  X, 
  Award, 
  MessageSquare, 
  ChevronRight, 
  ShieldAlert, 
  Download, 
  RefreshCw,
  HelpCircle,
  ThumbsUp,
  Sliders,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { SpellCheckInput, SpellCheckTextarea } from './SpellCheckField';
import { supabaseService } from '../lib/supabaseService';

export interface SatisfactionSurvey {
  id: string;
  surveyCode: string;
  createdAtISO: string;
  researcherUid: string;
  researcherEmail: string;

  // 1. Identificação
  surveyDate: string;
  surveyTime: string;
  deceasedName: string;
  familyMemberName: string;
  relationship: string;
  phone: string;
  unitResponsible: string;
  deathDate: string;
  funeralDate: string;
  wakeLocation: string;
  attendantName: string;
  funeralAgentTeam: string;
  researcherName: string;

  // 3. Primeiro Atendimento
  sec3_speed: string;
  sec3_cordiality: string;
  sec3_empathy: string;
  sec3_clarity: string;
  sec3_reassurance: string;
  sec3_obs: string;

  // 4. Organização do Funeral
  sec4_proceduralSpeed: string;
  sec4_punctuality: string;
  sec4_communication: string;
  sec4_generalOrg: string;
  sec4_hadDelay: string;
  sec4_delayDetails: string;

  // 5. Preparação do Falecido
  sec5_prepQuality: string;
  sec5_appearance: string;
  sec5_urnPresentation: string;
  sec5_ornamentation: string;
  sec5_familySatisfied: string;
  sec5_obs: string;

  // 6. Velório e Estrutura (opcional para retrocompatibilidade)
  sec6_cleanliness?: string;
  sec6_comfort?: string;
  sec6_restrooms?: string;
  sec6_amenities?: string;
  sec6_teamSupport?: string;
  sec6_obs?: string;

  // 7. Divulgação da Nota
  sec7_authorized: string;
  sec7_soundCarDone: string;
  sec7_infoCorrect: string;
  sec7_timing: string;
  sec7_generalRating: string;
  sec7_hadError: string;
  sec7_errorDetails: string;

  // 8. Veículo, Cortejo e Sepultamento
  sec8_cleanliness: string;
  sec8_punctuality: string;
  sec8_processionOrg: string;
  sec8_staffPostures: string;
  sec8_fullSupport: string;
  sec8_obs: string;

  // 9. Avaliação da Equipe
  sec9_overallStaffRating: string;
  sec9_positiveHighlight: string;
  sec9_positiveName: string;
  sec9_positiveReason: string;
  sec9_negativeBehavior: string;
  sec9_negativeName: string;
  sec9_negativeDetails: string;

  // 10. Controle de Qualidade
  sec10_fulfilled: string;
  sec10_unfulfilledDetails: string;
  sec10_hadComplaint: string;
  sec10_complaintDetails: string;
  sec10_problemResolved: string;
  sec10_unclearCharges: string;
  sec10_unclearDetails: string;

  // 11. Pergunta Essencial
  sec11_wasDissatisfied: string;
  sec11_dissatisfiedDetails: string;

  // 12. Avaliação Final
  sec12_npsScore: number;
  sec12_recommendation: string;
  sec12_bestThing: string;
  sec12_improvement: string;
  sec12_generalFeedback: string;

  // 13. Classificação Interna
  sec13_perception: string;
  sec13_faultIdentified: string;
  sec13_areas: string[];
  sec13_otherArea: string;
  sec13_needsReturn: string;
  sec13_returnResponsible: string;
  sec13_returnDeadline: string;
  sec13_returnStatus: string;
  sec13_occurrenceSummary: string;

  // 14. Alerta de Ocorrência Crítica
  sec14_criticalItems: string[];
  sec14_otherCritical: string;
  sec14_actionTaken: string;

  // 16. Uso Gerencial
  sec16_iqafScore: number;
  sec16_familyGrade: number;
  sec16_classification: 'Excelente' | 'Muito Bom' | 'Atenção' | 'Crítico';
  sec16_mainPositive: string;
  sec16_mainImprovement: string;
  sec16_needsActionPlan: string;
  sec16_analysisResponsible: string;
  sec16_analysisDate: string;

  // Observações opcionais por item
  itemNotes?: Record<string, string>;
}

const RATING_OPTIONS = [
  { val: '5', label: '5 – Excelente', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  { val: '4', label: '4 – Bom', color: 'bg-blue-50 text-blue-800 border-blue-300' },
  { val: '3', label: '3 – Regular', color: 'bg-amber-50 text-amber-800 border-amber-300' },
  { val: '2', label: '2 – Ruim', color: 'bg-orange-50 text-orange-800 border-orange-300' },
  { val: '1', label: '1 – Péssimo', color: 'bg-red-50 text-red-800 border-red-300' },
  { val: 'N/A', label: 'N/A – Não se aplica', color: 'bg-slate-100 text-slate-600 border-slate-300' },
];

const CRITICAL_ALERT_OPTIONS = [
  'Desrespeito ou tratamento inadequado à família',
  'Problema grave na preparação/apresentação do ente querido',
  'Atraso grave ou não cumprimento de horário',
  'Erro na identificação do ente querido ou documentação',
  'Erro grave na nota de falecimento/divulgação',
  'Cobrança indevida ou conflito financeiro relevante',
  'Serviço prometido e não realizado',
  'Conduta inadequada de funcionário',
  'Problema com veículo que comprometeu o atendimento',
  'Reclamação grave com risco à imagem da Bahia Prev'
];

const AREA_OPTIONS = [
  'Atendimento inicial',
  'Acolhimento/Comunicação',
  'Tempo/Atraso',
  'Preparação do ente querido',
  'Urna/Ornamentação',
  'Velório/Estrutura',
  'Nota de falecimento/Divulgação',
  'Veículo funerário',
  'Cortejo/Sepultamento',
  'Funcionário/Postura',
  'Cobrança/Financeiro',
  'Documentação'
];

interface SatisfactionSurveySectionProps {
  onBackToModules?: () => void;
}

export const SatisfactionSurveySection: React.FC<SatisfactionSurveySectionProps> = ({ onBackToModules }) => {
  const { user, profile } = useAuth();
  const [surveys, setSurveys] = useState<SatisfactionSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [filterCriticalOnly, setFilterCriticalOnly] = useState<boolean>(false);

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<SatisfactionSurvey | null>(null);
  const [selectedSurveyForView, setSelectedSurveyForView] = useState<SatisfactionSurvey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete Modal State
  const [surveyToDelete, setSurveyToDelete] = useState<SatisfactionSurvey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Form Initial Data State
  const getTodayFormatted = () => new Date().toISOString().split('T')[0];
  const getCurrentTimeFormatted = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const initialFormState = (): Omit<SatisfactionSurvey, 'id' | 'createdAtISO' | 'researcherUid' | 'researcherEmail'> => ({
    surveyCode: '',
    surveyDate: getTodayFormatted(),
    surveyTime: getCurrentTimeFormatted(),
    deceasedName: '',
    familyMemberName: '',
    relationship: '',
    phone: '',
    unitResponsible: '',
    deathDate: getTodayFormatted(),
    funeralDate: getTodayFormatted(),
    wakeLocation: '',
    attendantName: '',
    funeralAgentTeam: '',
    researcherName: profile?.name || 'Pesquisador Bahia Prev',

    sec3_speed: '5',
    sec3_cordiality: '5',
    sec3_empathy: '5',
    sec3_clarity: '5',
    sec3_reassurance: '5',
    sec3_obs: '',

    sec4_proceduralSpeed: '5',
    sec4_punctuality: '5',
    sec4_communication: '5',
    sec4_generalOrg: '5',
    sec4_hadDelay: 'nao',
    sec4_delayDetails: '',

    sec5_prepQuality: '5',
    sec5_appearance: '5',
    sec5_urnPresentation: '5',
    sec5_ornamentation: '5',
    sec5_familySatisfied: 'sim_total',
    sec5_obs: '',

    sec7_authorized: 'sim',
    sec7_soundCarDone: 'sim',
    sec7_infoCorrect: 'sim_total',
    sec7_timing: '5',
    sec7_generalRating: '5',
    sec7_hadError: 'nao',
    sec7_errorDetails: '',

    sec8_cleanliness: '5',
    sec8_punctuality: '5',
    sec8_processionOrg: '5',
    sec8_staffPostures: '5',
    sec8_fullSupport: '5',
    sec8_obs: '',

    sec9_overallStaffRating: '5',
    sec9_positiveHighlight: 'nao',
    sec9_positiveName: '',
    sec9_positiveReason: '',
    sec9_negativeBehavior: 'nao',
    sec9_negativeName: '',
    sec9_negativeDetails: '',

    sec10_fulfilled: 'sim_total',
    sec10_unfulfilledDetails: '',
    sec10_hadComplaint: 'nao',
    sec10_complaintDetails: '',
    sec10_problemResolved: 'nao_houve',
    sec10_unclearCharges: 'nao',
    sec10_unclearDetails: '',

    sec11_wasDissatisfied: 'nao',
    sec11_dissatisfiedDetails: '',

    sec12_npsScore: 10,
    sec12_recommendation: 'sim_certeza',
    sec12_bestThing: '',
    sec12_improvement: '',
    sec12_generalFeedback: '',

    sec13_perception: 'muito_satisfeita',
    sec13_faultIdentified: 'nao',
    sec13_areas: [],
    sec13_otherArea: '',
    sec13_needsReturn: 'nao',
    sec13_returnResponsible: '',
    sec13_returnDeadline: '',
    sec13_returnStatus: 'aberto',
    sec13_occurrenceSummary: '',

    sec14_criticalItems: [],
    sec14_otherCritical: '',
    sec14_actionTaken: '',

    sec16_iqafScore: 100,
    sec16_familyGrade: 10,
    sec16_classification: 'Excelente',
    sec16_mainPositive: '',
    sec16_mainImprovement: '',
    sec16_needsActionPlan: 'nao',
    sec16_analysisResponsible: profile?.name || '',
    sec16_analysisDate: getTodayFormatted(),
    itemNotes: {},
  });

  const [formData, setFormData] = useState(initialFormState());
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Fetch satisfaction surveys from Supabase
  const loadSurveysFromSupabase = useCallback(async () => {
    try {
      const list = await supabaseService.fetchSurveys();
      if (list) {
        setSurveys(list);
      }
    } catch (err) {
      console.error('Erro ao carregar pesquisas de satisfação do Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSurveysFromSupabase();
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadSurveysFromSupabase();
      }
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [loadSurveysFromSupabase]);

  // Compute IQAF (Índice de Qualidade do Atendimento Funerário) & Classification
  const calculateIQAF = (data: typeof formData) => {
    const ratings = [
      data.sec3_speed, data.sec3_cordiality, data.sec3_empathy, data.sec3_clarity, data.sec3_reassurance,
      data.sec4_proceduralSpeed, data.sec4_punctuality, data.sec4_communication, data.sec4_generalOrg,
      data.sec5_prepQuality, data.sec5_appearance, data.sec5_urnPresentation, data.sec5_ornamentation,
      data.sec7_timing, data.sec7_generalRating,
      data.sec8_cleanliness, data.sec8_punctuality, data.sec8_processionOrg, data.sec8_staffPostures, data.sec8_fullSupport,
      data.sec9_overallStaffRating
    ];

    let totalPoints = 0;
    let validCount = 0;

    ratings.forEach((val) => {
      if (val && val !== 'N/A') {
        const num = parseInt(val, 10);
        if (!isNaN(num)) {
          totalPoints += num;
          validCount++;
        }
      }
    });

    // NPS adjustment (0..10 score converts to percentage weight)
    const npsVal = Number(data.sec12_npsScore);
    if (typeof data.sec12_npsScore !== 'undefined' && data.sec12_npsScore !== null && !isNaN(npsVal)) {
      const npsPoints = (npsVal / 10) * 5; // scaled to 5 max
      totalPoints += npsPoints;
      validCount++;
    }

    if (validCount === 0) return { score: 100, classif: 'Excelente' as const };

    const avg5 = totalPoints / validCount;
    const score = Math.min(100, Math.round((avg5 / 5) * 100));

    let classif: 'Excelente' | 'Muito Bom' | 'Atenção' | 'Crítico' = 'Excelente';
    if (score >= 90) classif = 'Excelente';
    else if (score >= 75) classif = 'Muito Bom';
    else if (score >= 60) classif = 'Atenção';
    else classif = 'Crítico';

    if (data.sec14_criticalItems && data.sec14_criticalItems.length > 0) {
      classif = 'Crítico';
    }

    return { score, classif };
  };

  const handleOpenNewForm = () => {
    setEditingSurvey(null);
    setShowValidationAlert(false);
    setAttemptedSubmit(false);
    const surveyCode = `PS-${String(surveys.length + 1).padStart(6, '0')}`;
    setFormData({
      ...initialFormState(),
      surveyCode,
      researcherName: profile?.name || 'Pesquisador Bahia Prev',
    });
    setIsFormOpen(true);
  };

  const handleEditSurvey = (survey: SatisfactionSurvey) => {
    setEditingSurvey(survey);
    setShowValidationAlert(false);
    setAttemptedSubmit(false);
    const { id, createdAtISO, researcherUid, researcherEmail, ...rest } = survey;
    setFormData(rest);
    setIsFormOpen(true);
  };

  const handleDeleteSurvey = (survey: SatisfactionSurvey) => {
    setSurveyToDelete(survey);
    setDeleteErrorMessage(null);
  };

  const confirmDeleteSurvey = async () => {
    if (!surveyToDelete) return;
    setDeleting(true);
    setDeleteErrorMessage(null);
    try {
      await supabaseService.deleteSurvey(surveyToDelete.id);
      setSurveys(prev => prev.filter(s => s.id !== surveyToDelete.id));
      if (selectedSurveyForView?.id === surveyToDelete.id) {
        setIsDetailModalOpen(false);
      }
      setSurveyToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir pesquisa:', err);
      setDeleteErrorMessage('Erro ao excluir do banco de dados. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    setSaveErrorMessage(null);

    const isDeceasedMissing = !formData.deceasedName.trim();
    const isFamilyMemberMissing = !formData.familyMemberName.trim();
    const isSurveyDateMissing = !formData.surveyDate.trim();

    if (isDeceasedMissing || isFamilyMemberMissing || isSurveyDateMissing) {
      setShowValidationAlert(true);
      const modalContainer = document.getElementById('survey-form-modal-container');
      if (modalContainer) {
        modalContainer.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    setShowValidationAlert(false);
    setSubmitting(true);

    const { score, classif } = calculateIQAF(formData);

    const finalPayload = {
      ...formData,
      sec16_iqafScore: score,
      sec16_familyGrade: formData.sec12_npsScore,
      sec16_classification: classif,
      updatedAtISO: new Date().toISOString()
    };

    try {
      const targetId = editingSurvey ? editingSurvey.id : 'surv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const surveyObject: SatisfactionSurvey = {
        id: targetId,
        ...finalPayload,
        createdAtISO: editingSurvey ? editingSurvey.createdAtISO : new Date().toISOString(),
        researcherUid: editingSurvey ? editingSurvey.researcherUid : (user?.uid || ''),
        researcherEmail: editingSurvey ? editingSurvey.researcherEmail : (user?.email || ''),
      };

      await supabaseService.saveSurvey(surveyObject);

      if (editingSurvey) {
        setSurveys(prev => prev.map(s => s.id === targetId ? surveyObject : s));
      } else {
        setSurveys(prev => [surveyObject, ...prev]);
      }

      setIsFormOpen(false);
      setEditingSurvey(null);
    } catch (err) {
      console.error('Erro ao salvar pesquisa de satisfação:', err);
      setSaveErrorMessage('Ocorreu um erro ao salvar a pesquisa no banco de dados. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter logic
  const filteredSurveys = surveys.filter((item) => {
    const matchesSearch = 
      item.deceasedName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.familyMemberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.surveyCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.attendantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.wakeLocation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClassif = 
      filterClassification === 'all' || item.sec16_classification === filterClassification;

    const matchesCritical = 
      !filterCriticalOnly || (item.sec14_criticalItems && item.sec14_criticalItems.length > 0);

    return matchesSearch && matchesClassif && matchesCritical;
  });

  // Analytics Metrics
  const totalSurveys = surveys.length;
  const avgNps = totalSurveys > 0 ? (surveys.reduce((acc, curr) => acc + (Number(curr.sec12_npsScore) || 0), 0) / totalSurveys).toFixed(1) : '0.0';
  const avgIqaf = totalSurveys > 0 ? Math.round(surveys.reduce((acc, curr) => acc + (Number(curr.sec16_iqafScore) || 0), 0) / totalSurveys) : 0;
  const criticalCount = surveys.filter(s => s.sec14_criticalItems && s.sec14_criticalItems.length > 0).length;

  const renderRatingField = (label: string, fieldKey: keyof typeof formData) => {
    const val = String(formData[fieldKey] || '');
    const isBelowExcelente = val !== '' && val !== '5';
    const currentNote = (formData.itemNotes as Record<string, string>)?.[fieldKey as string] || '';

    return (
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <span className="text-xs font-bold text-slate-800 block">{label}</span>
        <div className="flex flex-wrap gap-2">
          {RATING_OPTIONS.map((opt) => (
            <label
              key={opt.val}
              className={`px-3 py-1.5 border rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                formData[fieldKey] === opt.val
                  ? `${opt.color} ring-2 ring-indigo-500/30 scale-102`
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name={fieldKey as string}
                value={opt.val}
                checked={formData[fieldKey] === opt.val}
                onChange={(e) => setFormData({ ...formData, [fieldKey]: e.target.value })}
                className="hidden"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>

        {isBelowExcelente && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-2 border-t border-slate-200/80 mt-2 space-y-1"
          >
            <label className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
              <MessageSquare className="h-3 w-3 text-amber-600" />
              <span>Observação / Motivo (Opcional)</span>
            </label>
            <SpellCheckInput
              value={currentNote}
              onChangeValue={(text) => {
                setFormData((prev) => ({
                  ...prev,
                  itemNotes: {
                    ...(prev.itemNotes || {}),
                    [fieldKey as string]: text,
                  },
                }));
              }}
              placeholder="Digite uma observação sobre este item (opcional)..."
              className="w-full p-2 bg-amber-50/50 border border-amber-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:border-amber-400"
            />
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 space-y-6">
      
      {/* Top Breadcrumb & Portal Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-4 sm:p-6 text-white shadow-xl border border-slate-700/80 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {onBackToModules && (
                <button
                  onClick={onBackToModules}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-slate-200 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Voltar aos Módulos</span>
                </button>
              )}
              <span className="px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 rounded-full text-[11px] font-bold tracking-wide uppercase">
                Módulo Gestão Funerária
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white flex items-center gap-2.5 tracking-tight">
              <HeartHandshake className="h-7 w-7 text-indigo-400 shrink-0" />
              <span>Pesquisa de Satisfação do Atendimento</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Avaliação contínua da experiência de acolhimento e qualidade dos serviços prestados às famílias pela equipe Bahia Prev.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleOpenNewForm}
              className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30"
            >
              <Plus className="h-5 w-5" />
              <span>Nova Pesquisa de Satisfação</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total de Pesquisas</span>
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalSurveys}</p>
          <span className="text-[11px] font-semibold text-slate-500">Entrevistas Registradas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Média Nota (0-10)</span>
            <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
          </div>
          <p className="text-2xl font-black text-slate-900">{avgNps} <span className="text-xs text-slate-500 font-normal">/ 10</span></p>
          <span className="text-[11px] font-semibold text-emerald-600">Avaliação Geral Famílias</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Índice IQAF</span>
            <Award className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-900">{avgIqaf} <span className="text-xs text-slate-500 font-normal">/ 100</span></p>
          <span className="text-[11px] font-semibold text-indigo-600">Qualidade Funerária</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Alertas Críticos</span>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-2xl font-black text-red-600">{criticalCount}</p>
          <span className="text-[11px] font-semibold text-red-500">Ocorrências que exigem ação</span>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por ente querido, familiar, código, atendente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-bold">Classificação:</span>
            <select
              value={filterClassification}
              onChange={(e) => setFilterClassification(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">Todas</option>
              <option value="Excelente">Excelente</option>
              <option value="Muito Bom">Muito Bom</option>
              <option value="Atenção">Atenção</option>
              <option value="Crítico">Crítico</option>
            </select>
          </div>

          <button
            onClick={() => setFilterCriticalOnly(!filterCriticalOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              filterCriticalOnly 
                ? 'bg-red-500 text-white border-red-600 shadow-xs' 
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Apenas Alertas Críticos</span>
          </button>
        </div>
      </div>

      {/* List of Surveys */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
          <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Carregando pesquisas de satisfação...</p>
        </div>
      ) : filteredSurveys.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900">Nenhuma pesquisa encontrada</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || filterClassification !== 'all' || filterCriticalOnly
                ? 'Nenhum registro corresponde aos filtros selecionados.'
                : 'Ainda não há pesquisas de satisfação cadastradas. Clique no botão acima para registrar a primeira.'}
            </p>
          </div>
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setFilterClassification('all'); setFilterCriticalOnly(false); }}
              className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSurveys.map((survey) => {
            const hasCritical = survey.sec14_criticalItems && survey.sec14_criticalItems.length > 0;
            return (
              <div
                key={survey.id}
                className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden relative ${
                  hasCritical ? 'border-red-300 ring-2 ring-red-500/20' : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                {/* Header Badge & Code */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-indigo-100 text-indigo-900 font-black text-[11px] rounded-lg">
                      {survey.surveyCode}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {survey.surveyDate}
                    </span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    survey.sec16_classification === 'Excelente' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    survey.sec16_classification === 'Muito Bom' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                    survey.sec16_classification === 'Atenção' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    'bg-red-100 text-red-800 border border-red-300'
                  }`}>
                    {survey.sec16_classification}
                  </span>
                </div>

                {/* Body Details */}
                <div className="p-4 space-y-3 flex-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ente Querido</span>
                    <h4 className="text-sm font-black text-slate-900 truncate" title={survey.deceasedName}>
                      {survey.deceasedName}
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Familiar Entrevistado</span>
                      <span className="font-semibold text-slate-800 truncate block" title={survey.familyMemberName}>
                        {survey.familyMemberName}
                      </span>
                      <span className="text-[10px] text-slate-500">({survey.relationship || 'Familiar'})</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Atendente / Unidade</span>
                      <span className="font-semibold text-slate-800 truncate block" title={survey.attendantName || survey.unitResponsible}>
                        {survey.attendantName || survey.unitResponsible}
                      </span>
                    </div>
                  </div>

                  {/* Scores Bar */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Nota da Família</span>
                      <span className="font-black text-slate-900 text-sm flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                        {survey.sec12_npsScore} / 10
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-bold block">Índice IQAF</span>
                      <span className="font-black text-indigo-900 text-sm">
                        {survey.sec16_iqafScore} %
                      </span>
                    </div>
                  </div>

                  {hasCritical && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-bold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                      <span className="truncate">Contém {survey.sec14_criticalItems.length} Alerta(s) Crítico(s)</span>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => { setSelectedSurveyForView(survey); setIsDetailModalOpen(true); }}
                    className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Ver Pesquisa</span>
                  </button>

                  <button
                    onClick={() => handleEditSurvey(survey)}
                    className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-colors cursor-pointer"
                    title="Editar Pesquisa"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteSurvey(survey)}
                    className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition-colors cursor-pointer"
                    title="Excluir Pesquisa"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal View Detail */}
      <AnimatePresence>
        {isDetailModalOpen && selectedSurveyForView && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col"
            >
              {/* Header */}
              <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-20 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                    <HeartHandshake className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-indigo-300 text-sm">{selectedSurveyForView.surveyCode}</span>
                      <span className="text-xs text-slate-400">• {selectedSurveyForView.surveyDate}</span>
                    </div>
                    <h3 className="text-lg font-black text-white">{selectedSurveyForView.deceasedName}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const surveyToEdit = selectedSurveyForView;
                      setIsDetailModalOpen(false);
                      handleEditSurvey(surveyToEdit);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Editar esta pesquisa"
                  >
                    <Edit3 className="h-4 w-4 text-indigo-400" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>

                  <button
                    onClick={() => handleDeleteSurvey(selectedSurveyForView)}
                    className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-200 text-xs font-bold rounded-xl border border-red-800/80 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Excluir esta pesquisa"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                    <span className="hidden sm:inline">Excluir</span>
                  </button>

                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* View Body - All Survey Points */}
              <div className="p-4 sm:p-8 space-y-6">
                
                {/* 1. Identificação */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3">
                  <h4 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                    <User className="h-4 w-4 text-indigo-600" />
                    <span>1. Identificação do Atendimento</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div><strong className="text-slate-500 block text-[10px]">Código Pesquisa:</strong> <span className="font-bold text-slate-900">{selectedSurveyForView.surveyCode || 'Não informado'}</span></div>
                    <div><strong className="text-slate-500 block text-[10px]">Data / Horário:</strong> <span className="font-bold text-slate-900">{selectedSurveyForView.surveyDate || 'Não informado'} {selectedSurveyForView.surveyTime ? `(${selectedSurveyForView.surveyTime})` : ''}</span></div>
                    <div><strong className="text-slate-500 block text-[10px]">Ente Querido:</strong> <span className="font-bold text-slate-900">{selectedSurveyForView.deceasedName || 'Não informado'}</span></div>
                    <div><strong className="text-slate-500 block text-[10px]">Familiar Entrevistado:</strong> <span className="font-bold text-slate-900">{selectedSurveyForView.familyMemberName || 'Não informado'}</span></div>
                    <div><strong className="text-slate-500 block text-[10px]">Parentesco:</strong> <span className="font-bold text-slate-900">{selectedSurveyForView.relationship || 'Não informado'}</span></div>
                    <div><strong className="text-slate-500 block text-[10px]">Telefone / WhatsApp:</strong> <span className="font-bold text-slate-900">{selectedSurveyForView.phone || 'Não informado'}</span></div>
                    <div><strong className="text-slate-500 block text-[10px]">Unidade Responsável:</strong> <span className="font-bold text-slate-900">{selectedSurveyForView.unitResponsible || 'Não informado'}</span></div>
                    <div><strong className="text-slate-500 block text-[10px]">Data Óbito / Funeral:</strong> <span className="font-bold text-slate-900">{selectedSurveyForView.deathDate || 'Não informado'} / {selectedSurveyForView.funeralDate || 'Não informado'}</span></div>
                    <div><strong className="text-slate-500 block text-[10px]">Local do Velório:</strong> <span className="font-bold text-slate-900">{selectedSurveyForView.wakeLocation || 'Não informado'}</span></div>
                    <div><strong className="text-slate-500 block text-[10px]">Atendente:</strong> <span className="font-bold text-slate-900">{selectedSurveyForView.attendantName || 'Não informado'}</span></div>
                    <div><strong className="text-slate-500 block text-[10px]">Equipe Funerária:</strong> <span className="font-bold text-slate-900">{selectedSurveyForView.funeralAgentTeam || 'Não informado'}</span></div>
                    <div><strong className="text-slate-500 block text-[10px]">Pesquisador Responsável:</strong> <span className="font-bold text-slate-900">{selectedSurveyForView.researcherName || 'Não informado'}</span></div>
                  </div>
                </div>

                {/* Ratings Overview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  
                  {/* 3. Primeiro Atendimento */}
                  <div className="p-4 border border-slate-200 rounded-2xl bg-white space-y-2">
                    <h5 className="font-extrabold text-slate-900 border-b pb-1">3. Primeiro Atendimento e Acolhimento</h5>
                    <ul className="space-y-1 text-slate-700">
                      <li>• Rapidez no atendimento: <strong>{selectedSurveyForView.sec3_speed || 'Não informado'}</strong></li>
                      <li>• Cordialidade e educação: <strong>{selectedSurveyForView.sec3_cordiality || 'Não informado'}</strong></li>
                      <li>• Empatia e sensibilidade: <strong>{selectedSurveyForView.sec3_empathy || 'Não informado'}</strong></li>
                      <li>• Clareza das informações: <strong>{selectedSurveyForView.sec3_clarity || 'Não informado'}</strong></li>
                      <li>• Segurança transmitida: <strong>{selectedSurveyForView.sec3_reassurance || 'Não informado'}</strong></li>
                    </ul>
                    <p className="text-[11px] text-slate-500 italic border-t pt-1 mt-1">
                      Obs: {selectedSurveyForView.sec3_obs || 'Nenhuma observação informada'}
                    </p>
                  </div>

                  {/* 4. Organização */}
                  <div className="p-4 border border-slate-200 rounded-2xl bg-white space-y-2">
                    <h5 className="font-extrabold text-slate-900 border-b pb-1">4. Organização e Preparação do Funeral</h5>
                    <ul className="space-y-1 text-slate-700">
                      <li>• Agilidade nos procedimentos: <strong>{selectedSurveyForView.sec4_proceduralSpeed || 'Não informado'}</strong></li>
                      <li>• Cumprimento de horários: <strong>{selectedSurveyForView.sec4_punctuality || 'Não informado'}</strong></li>
                      <li>• Comunicação com a família: <strong>{selectedSurveyForView.sec4_communication || 'Não informado'}</strong></li>
                      <li>• Organização geral: <strong>{selectedSurveyForView.sec4_generalOrg || 'Não informado'}</strong></li>
                      <li>• Houve atraso/problema: <strong className={selectedSurveyForView.sec4_hadDelay === 'sim' ? 'text-red-600 font-black' : ''}>{selectedSurveyForView.sec4_hadDelay === 'sim' ? 'SIM' : selectedSurveyForView.sec4_hadDelay === 'nao' ? 'NÃO' : 'Não informado'}</strong></li>
                    </ul>
                    <p className="text-[11px] text-slate-500 italic border-t pt-1 mt-1">
                      Detalhes do Atraso: {selectedSurveyForView.sec4_delayDetails || 'Sem detalhes registrados'}
                    </p>
                  </div>

                  {/* 5. Preparação do Ente Querido */}
                  <div className="p-4 border border-slate-200 rounded-2xl bg-white space-y-2">
                    <h5 className="font-extrabold text-slate-900 border-b pb-1">5. Preparação e Apresentação do Ente Querido</h5>
                    <ul className="space-y-1 text-slate-700">
                      <li>• Cuidado na preparação: <strong>{selectedSurveyForView.sec5_prepQuality || 'Não informado'}</strong></li>
                      <li>• Aparência do ente querido: <strong>{selectedSurveyForView.sec5_appearance || 'Não informado'}</strong></li>
                      <li>• Apresentação da urna: <strong>{selectedSurveyForView.sec5_urnPresentation || 'Não informado'}</strong></li>
                      <li>• Ornamentação e acabamento: <strong>{selectedSurveyForView.sec5_ornamentation || 'Não informado'}</strong></li>
                      <li>• Satisfação da família: <strong>
                        {selectedSurveyForView.sec5_familySatisfied === 'sim_total' ? 'Sim, totalmente' : 
                         selectedSurveyForView.sec5_familySatisfied === 'parcial' ? 'Parcialmente' : 
                         selectedSurveyForView.sec5_familySatisfied === 'nao' ? 'Não' : 
                         selectedSurveyForView.sec5_familySatisfied === 'nao_soube' ? 'Não soube avaliar' : 'Não informado'}
                      </strong></li>
                    </ul>
                    <p className="text-[11px] text-slate-500 italic border-t pt-1 mt-1">
                      Obs: {selectedSurveyForView.sec5_obs || 'Nenhuma observação informada'}
                    </p>
                  </div>

                  {/* 6. Divulgação da Nota */}
                  <div className="p-4 border border-slate-200 rounded-2xl bg-white space-y-2">
                    <h5 className="font-extrabold text-slate-900 border-b pb-1">6. Divulgação da Nota de Falecimento</h5>
                    <ul className="space-y-1 text-slate-700">
                      <li>• Autorizou divulgação: <strong>{selectedSurveyForView.sec7_authorized === 'sim' ? 'Sim' : selectedSurveyForView.sec7_authorized === 'nao' ? 'Não' : 'Não informado'}</strong></li>
                      <li>• Carro de som/funerário: <strong>{selectedSurveyForView.sec7_soundCarDone === 'sim' ? 'Sim' : selectedSurveyForView.sec7_soundCarDone === 'nao' ? 'Não' : 'N/A'}</strong></li>
                      <li>• Divulgação no tempo adequado: <strong>{selectedSurveyForView.sec7_timing || 'Não informado'}</strong></li>
                      <li>• Avaliação geral da divulgação: <strong>{selectedSurveyForView.sec7_generalRating || 'Não informado'}</strong></li>
                      <li>• Houve erro de informação: <strong className={selectedSurveyForView.sec7_hadError === 'sim' ? 'text-red-600 font-black' : ''}>{selectedSurveyForView.sec7_hadError === 'sim' ? 'SIM' : selectedSurveyForView.sec7_hadError === 'nao' ? 'NÃO' : 'Não informado'}</strong></li>
                    </ul>
                    <p className="text-[11px] text-slate-500 italic border-t pt-1 mt-1">
                      Detalhes do Erro: {selectedSurveyForView.sec7_errorDetails || 'Nenhum erro relatado'}
                    </p>
                  </div>

                  {/* 7. Veículo Funerário, Cortejo e Sepultamento */}
                  <div className="p-4 border border-slate-200 rounded-2xl bg-white space-y-2">
                    <h5 className="font-extrabold text-slate-900 border-b pb-1">7. Veículo Funerário, Cortejo e Sepultamento</h5>
                    <ul className="space-y-1 text-slate-700">
                      <li>• Limpeza e conservação do veículo: <strong>{selectedSurveyForView.sec8_cleanliness || 'Não informado'}</strong></li>
                      <li>• Pontualidade do veículo e equipe: <strong>{selectedSurveyForView.sec8_punctuality || 'Não informado'}</strong></li>
                      <li>• Organização e condução do cortejo: <strong>{selectedSurveyForView.sec8_processionOrg || 'Não informado'}</strong></li>
                      <li>• Postura, apresentação e respeito: <strong>{selectedSurveyForView.sec8_staffPostures || 'Não informado'}</strong></li>
                      <li>• Acompanhamento até finalização: <strong>{selectedSurveyForView.sec8_fullSupport || 'Não informado'}</strong></li>
                    </ul>
                    <p className="text-[11px] text-slate-500 italic border-t pt-1 mt-1">
                      Obs: {selectedSurveyForView.sec8_obs || 'Nenhuma observação informada'}
                    </p>
                  </div>

                  {/* 8. Avaliação da Equipe */}
                  <div className="p-4 border border-slate-200 rounded-2xl bg-white space-y-2">
                    <h5 className="font-extrabold text-slate-900 border-b pb-1">8. Avaliação da Equipe Bahia Prev</h5>
                    <ul className="space-y-1 text-slate-700">
                      <li>• Avaliação geral dos funcionários: <strong>{selectedSurveyForView.sec9_overallStaffRating || 'Não informado'}</strong></li>
                      <li>• Funcionário com destaque positivo: <strong>{selectedSurveyForView.sec9_positiveHighlight === 'sim' ? 'SIM' : 'NÃO'}</strong></li>
                      {selectedSurveyForView.sec9_positiveHighlight === 'sim' && (
                        <li className="text-[11px] text-emerald-700 pl-2">➔ {selectedSurveyForView.sec9_positiveName ? `${selectedSurveyForView.sec9_positiveName}: ` : ''}{selectedSurveyForView.sec9_positiveReason || 'Sem detalhes'}</li>
                      )}
                      <li>• Comportamento que desagradou: <strong className={selectedSurveyForView.sec9_negativeBehavior === 'sim' ? 'text-red-600' : ''}>{selectedSurveyForView.sec9_negativeBehavior === 'sim' ? 'SIM' : 'NÃO'}</strong></li>
                      {selectedSurveyForView.sec9_negativeBehavior === 'sim' && (
                        <li className="text-[11px] text-red-700 pl-2">➔ {selectedSurveyForView.sec9_negativeName ? `${selectedSurveyForView.sec9_negativeName}: ` : ''}{selectedSurveyForView.sec9_negativeDetails || 'Sem detalhes'}</li>
                      )}
                    </ul>
                  </div>

                  {/* 9. Controle de Qualidade */}
                  <div className="p-4 border border-slate-200 rounded-2xl bg-white space-y-2">
                    <h5 className="font-extrabold text-slate-900 border-b pb-1">9. Controle de Qualidade</h5>
                    <ul className="space-y-1 text-slate-700">
                      <li>• Tudo combinado foi cumprido: <strong>
                        {selectedSurveyForView.sec10_fulfilled === 'sim_total' ? 'Sim, totalmente' : 
                         selectedSurveyForView.sec10_fulfilled === 'parcial' ? 'Parcialmente' : 
                         selectedSurveyForView.sec10_fulfilled === 'nao' ? 'Não' : 'Não informado'}
                      </strong></li>
                      {selectedSurveyForView.sec10_unfulfilledDetails && (
                        <li className="text-[11px] text-amber-800 pl-2">Detalhes: {selectedSurveyForView.sec10_unfulfilledDetails}</li>
                      )}
                      <li>• Houve problema que gerou reclamação: <strong className={selectedSurveyForView.sec10_hadComplaint === 'sim' ? 'text-red-600' : ''}>{selectedSurveyForView.sec10_hadComplaint === 'sim' ? 'SIM' : 'NÃO'}</strong></li>
                      {selectedSurveyForView.sec10_complaintDetails && (
                        <li className="text-[11px] text-red-700 pl-2">Reclamação: {selectedSurveyForView.sec10_complaintDetails}</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* 10. Pergunta Essencial de Experiência */}
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                  <h5 className="font-black text-amber-950 uppercase text-xs">10. Pergunta Essencial de Experiência</h5>
                  <p className="text-xs text-slate-700 font-semibold">
                    Ficou insatisfeito, preocupado ou sentiu que poderíamos ter feito melhor? <strong>{selectedSurveyForView.sec11_wasDissatisfied === 'sim' ? 'SIM' : 'NÃO'}</strong>
                  </p>
                  <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-xl border border-amber-100">
                    Relato: {selectedSurveyForView.sec11_dissatisfiedDetails || 'Nenhum relato de insatisfação registrado'}
                  </p>
                </div>

                {/* 11. Avaliação Final */}
                <div className="p-5 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3">
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">11. Avaliação, Nota de Satisfação e Recomendação</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div><span className="text-slate-500 block text-[10px]">Nota Geral (0 a 10):</span> <span className="font-black text-lg text-indigo-900">{selectedSurveyForView.sec12_npsScore ?? 'Não informado'}</span></div>
                    <div><span className="text-slate-500 block text-[10px]">Recomendaria a Bahia Prev:</span> <span className="font-bold text-slate-900">{selectedSurveyForView.sec12_recommendation === 'sim_certeza' ? 'Sim, com certeza' : selectedSurveyForView.sec12_recommendation === 'talvez' ? 'Talvez' : selectedSurveyForView.sec12_recommendation === 'nao' ? 'Não' : 'Não informado'}</span></div>
                    <div><span className="text-slate-500 block text-[10px]">Classificação Interna:</span> <span className="font-extrabold text-indigo-700">{selectedSurveyForView.sec16_classification || 'Não classificado'}</span></div>
                  </div>
                  <div>
                    <strong className="text-slate-600 block text-[10px]">O que fez de MELHOR:</strong>
                    <p className="text-slate-800 font-medium bg-white p-2 rounded-xl border border-indigo-100 mt-0.5">{selectedSurveyForView.sec12_bestThing || 'Não informado'}</p>
                  </div>
                  <div>
                    <strong className="text-slate-600 block text-[10px]">O que PODE MELHORAR:</strong>
                    <p className="text-slate-800 font-medium bg-white p-2 rounded-xl border border-indigo-100 mt-0.5">{selectedSurveyForView.sec12_improvement || 'Não informado'}</p>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW SURVEY FORM MODAL */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <motion.div
              id="survey-form-modal-container"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col"
            >
              {/* Form Sticky Header */}
              <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between sticky top-0 z-30 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-500/30">
                    <HeartHandshake className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">Formulário de Qualidade</span>
                    <h2 className="text-lg sm:text-xl font-black text-white">
                      {editingSurvey ? `Editar Pesquisa (${formData.surveyCode})` : 'Nova Pesquisa de Satisfação'}
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmitForm} className="p-4 sm:p-8 space-y-8">
                
                {/* Validation Warning Alert */}
                {showValidationAlert && (
                  <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl flex items-start gap-3.5 text-red-900 shadow-lg animate-pulse">
                    <AlertCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-red-900">
                        Atenção: Existem informações obrigatórias a serem preenchidas!
                      </h4>
                      <p className="text-xs font-semibold text-red-800 leading-relaxed">
                        Por favor, preencha os campos obrigatórios marcados com asterisco (<span className="text-red-600 font-extrabold text-sm">*</span>) destacados em vermelho abaixo antes de salvar a pesquisa.
                      </p>
                    </div>
                  </div>
                )}

                {/* Save Error Alert */}
                {saveErrorMessage && (
                  <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl flex items-start gap-3.5 text-red-900 shadow-lg">
                    <AlertCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-red-900">Erro ao salvar no banco de dados</h4>
                      <p className="text-xs font-semibold text-red-800">{saveErrorMessage}</p>
                    </div>
                  </div>
                )}

                {/* 1. IDENTIFICAÇÃO DO ATENDIMENTO */}
                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <h3 className="text-sm font-black text-indigo-950 uppercase tracking-wide flex items-center gap-2 border-b pb-2">
                    <User className="h-4 w-4 text-indigo-600" />
                    <span>1. Identificação do Atendimento</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${
                        attemptedSubmit && !formData.surveyDate.trim() ? 'text-red-600 font-extrabold' : 'text-slate-700'
                      }`}>
                        Data da Pesquisa <span className="text-red-500 font-black text-sm ml-0.5">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.surveyDate}
                        onChange={(e) => {
                          setFormData({ ...formData, surveyDate: e.target.value });
                          if (e.target.value) setShowValidationAlert(false);
                        }}
                        className={`w-full p-2.5 rounded-xl text-xs font-semibold transition-all ${
                          attemptedSubmit && !formData.surveyDate.trim()
                            ? 'bg-red-50 border-2 border-red-500 text-red-900 focus:ring-2 focus:ring-red-400'
                            : 'bg-white border border-slate-300 text-slate-800 focus:border-indigo-500'
                        }`}
                      />
                      {attemptedSubmit && !formData.surveyDate.trim() && (
                        <span className="text-[11px] font-bold text-red-600 flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          Campo obrigatório
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Horário</label>
                      <input
                        type="time"
                        value={formData.surveyTime}
                        onChange={(e) => setFormData({ ...formData, surveyTime: e.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Código / Reg.</label>
                      <input
                        type="text"
                        value={formData.surveyCode}
                        onChange={(e) => setFormData({ ...formData, surveyCode: e.target.value })}
                        className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-black text-indigo-900"
                        readOnly
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className={`block text-xs font-bold mb-1 ${
                        attemptedSubmit && !formData.deceasedName.trim() ? 'text-red-600 font-extrabold' : 'text-slate-700'
                      }`}>
                        Nome do Ente Querido <span className="text-red-500 font-black text-sm ml-0.5">*</span>
                      </label>
                      <SpellCheckInput
                        value={formData.deceasedName}
                        onChangeValue={(val) => {
                          setFormData({ ...formData, deceasedName: val });
                          if (val.trim()) setShowValidationAlert(false);
                        }}
                        placeholder="Nome completo do ente querido"
                        className={`w-full p-2.5 rounded-xl text-xs font-semibold transition-all ${
                          attemptedSubmit && !formData.deceasedName.trim()
                            ? 'bg-red-50 border-2 border-red-500 text-red-900 placeholder-red-400 focus:ring-2 focus:ring-red-400'
                            : 'bg-white border border-slate-300 text-slate-800 focus:border-indigo-500'
                        }`}
                      />
                      {attemptedSubmit && !formData.deceasedName.trim() && (
                        <span className="text-[11px] font-bold text-red-600 flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          Campo obrigatório! Preencha o nome do ente querido.
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Cidade do Ente Querido</label>
                      <SpellCheckInput
                        value={formData.unitResponsible}
                        onChangeValue={(val) => setFormData({ ...formData, unitResponsible: val })}
                        placeholder="Ex: Jequié - BA"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-bold mb-1 ${
                        attemptedSubmit && !formData.familyMemberName.trim() ? 'text-red-600 font-extrabold' : 'text-slate-700'
                      }`}>
                        Nome do Familiar Entrevistado <span className="text-red-500 font-black text-sm ml-0.5">*</span>
                      </label>
                      <SpellCheckInput
                        value={formData.familyMemberName}
                        onChangeValue={(val) => {
                          setFormData({ ...formData, familyMemberName: val });
                          if (val.trim()) setShowValidationAlert(false);
                        }}
                        placeholder="Nome do familiar entrevistado"
                        className={`w-full p-2.5 rounded-xl text-xs font-semibold transition-all ${
                          attemptedSubmit && !formData.familyMemberName.trim()
                            ? 'bg-red-50 border-2 border-red-500 text-red-900 placeholder-red-400 focus:ring-2 focus:ring-red-400'
                            : 'bg-white border border-slate-300 text-slate-800 focus:border-indigo-500'
                        }`}
                      />
                      {attemptedSubmit && !formData.familyMemberName.trim() && (
                        <span className="text-[11px] font-bold text-red-600 flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          Campo obrigatório! Preencha o nome do familiar.
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Parentesco</label>
                      <SpellCheckInput
                        value={formData.relationship}
                        onChangeValue={(val) => setFormData({ ...formData, relationship: val })}
                        placeholder="Ex: Filho(a), Esposo(a)"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(73) 99999-9999"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Data do Falecimento</label>
                      <input
                        type="date"
                        value={formData.deathDate}
                        onChange={(e) => setFormData({ ...formData, deathDate: e.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Data do Funeral</label>
                      <input
                        type="date"
                        value={formData.funeralDate}
                        onChange={(e) => setFormData({ ...formData, funeralDate: e.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Local do Velório</label>
                      <SpellCheckInput
                        value={formData.wakeLocation}
                        onChangeValue={(val) => setFormData({ ...formData, wakeLocation: val })}
                        placeholder="Ex: Cerimonial PAF"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Atendente Responsável</label>
                      <SpellCheckInput
                        value={formData.attendantName}
                        onChangeValue={(val) => setFormData({ ...formData, attendantName: val })}
                        placeholder="Nome do atendente"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Equipe / Agente Funerário</label>
                      <SpellCheckInput
                        value={formData.funeralAgentTeam}
                        onChangeValue={(val) => setFormData({ ...formData, funeralAgentTeam: val })}
                        placeholder="Nome do agente/equipe"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Pesquisador Responsável</label>
                      <SpellCheckInput
                        value={formData.researcherName}
                        onChangeValue={(val) => setFormData({ ...formData, researcherName: val })}
                        placeholder="Nome do pesquisador"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. ABERTURA DA LIGAÇÃO — SCRIPT */}
                <div className="bg-indigo-50/70 border border-indigo-200 p-5 rounded-2xl space-y-2">
                  <h3 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-indigo-600" />
                    <span>2. Abertura da Ligação — Script de Orientação</span>
                  </h3>
                  <div className="p-3.5 bg-white border border-indigo-100 rounded-xl text-xs text-slate-800 leading-relaxed italic shadow-2xs">
                    “Olá, Sr.(a) <strong className="text-indigo-900">{formData.familyMemberName || '___________'}</strong>. Meu nome é <strong className="text-indigo-900">{formData.researcherName || '___________'}</strong>, falo em nome da Bahia Prev. Primeiramente, prestamos nossos mais sinceros sentimentos a você e sua família, e agradecemos pela confiança em nosso trabalho. Se o(a) senhor(a) se sentir confortável, gostaria de fazer breves perguntas sobre o nosso atendimento. Caso prefira não falar sobre isso agora, respeitamos totalmente o seu tempo.”
                  </div>
                  <div className="text-[11px] font-bold text-indigo-800 bg-indigo-100/80 px-3 py-1.5 rounded-lg border border-indigo-200">
                    PADRÃO DE AVALIAÇÃO: 5 – Excelente | 4 – Bom | 3 – Regular | 2 – Ruim | 1 – Péssimo | N/A – Não se aplica ou não soube avaliar
                  </div>
                </div>

                {/* 3. PRIMEIRO ATENDIMENTO E ACOLHIMENTO */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-2">
                    3. Primeiro Atendimento e Acolhimento
                  </h3>

                  {renderRatingField('3.1 Rapidez no primeiro atendimento', 'sec3_speed')}
                  {renderRatingField('3.2 Cordialidade e educação da equipe', 'sec3_cordiality')}
                  {renderRatingField('3.3 Empatia, respeito e sensibilidade com a família', 'sec3_empathy')}
                  {renderRatingField('3.4 Clareza das informações e orientações fornecidas', 'sec3_clarity')}
                  {renderRatingField('3.5 Segurança e tranquilidade transmitidas pela equipe', 'sec3_reassurance')}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Observações importantes (Atendimento)</label>
                    <SpellCheckTextarea
                      value={formData.sec3_obs}
                      onChangeValue={(val) => setFormData({ ...formData, sec3_obs: val })}
                      placeholder="Anote detalhes citados pelo familiar..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* 4. ORGANIZAÇÃO E PREPARAÇÃO DO FUNERAL */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-2">
                    4. Organização e Preparação do Funeral
                  </h3>

                  {renderRatingField('4.1 Agilidade na organização dos procedimentos', 'sec4_proceduralSpeed')}
                  {renderRatingField('4.2 Cumprimento dos horários combinados', 'sec4_punctuality')}
                  {renderRatingField('4.3 Comunicação da equipe com a família durante todo o processo', 'sec4_communication')}
                  {renderRatingField('4.4 Organização geral do serviço funerário', 'sec4_generalOrg')}

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <span className="text-xs font-bold text-slate-800 block">Houve algum atraso ou problema durante a organização?</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="sec4_hadDelay"
                          value="nao"
                          checked={formData.sec4_hadDelay === 'nao'}
                          onChange={() => setFormData({ ...formData, sec4_hadDelay: 'nao' })}
                        />
                        <span>Não</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-red-600 cursor-pointer">
                        <input
                          type="radio"
                          name="sec4_hadDelay"
                          value="sim"
                          checked={formData.sec4_hadDelay === 'sim'}
                          onChange={() => setFormData({ ...formData, sec4_hadDelay: 'sim' })}
                        />
                        <span>Sim</span>
                      </label>
                    </div>

                    {formData.sec4_hadDelay === 'sim' && (
                      <SpellCheckTextarea
                        value={formData.sec4_delayDetails}
                        onChangeValue={(val) => setFormData({ ...formData, sec4_delayDetails: val })}
                        placeholder="Descreva qual atraso ou problema ocorreu..."
                        rows={2}
                      />
                    )}
                  </div>
                </div>

                {/* 5. PREPARAÇÃO E APRESENTAÇÃO DO ENTE QUERIDO */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-2">
                    5. Preparação e Apresentação do Ente Querido
                  </h3>

                  {renderRatingField('5.1 Qualidade e cuidado na preparação do ente querido', 'sec5_prepQuality')}
                  {renderRatingField('5.2 Aparência e apresentação do ente querido', 'sec5_appearance')}
                  {renderRatingField('5.3 Organização e apresentação da urna funerária', 'sec5_urnPresentation')}
                  {renderRatingField('5.4 Ornamentação, flores e acabamento geral', 'sec5_ornamentation')}

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">A família ficou satisfeita com a apresentação do ente querido?</span>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { val: 'sim_total', label: 'Sim, totalmente' },
                        { val: 'parcial', label: 'Parcialmente' },
                        { val: 'nao', label: 'Não' },
                        { val: 'nao_soube', label: 'Não soube avaliar' },
                      ].map((item) => (
                        <label key={item.val} className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                          <input
                            type="radio"
                            name="sec5_familySatisfied"
                            value={item.val}
                            checked={formData.sec5_familySatisfied === item.val}
                            onChange={(e) => setFormData({ ...formData, sec5_familySatisfied: e.target.value })}
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Observações (Apresentação do Ente Querido)</label>
                    <SpellCheckTextarea
                      value={formData.sec5_obs}
                      onChangeValue={(val) => setFormData({ ...formData, sec5_obs: val })}
                      placeholder="Observações da família sobre a preparação..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* 6. DIVULGAÇÃO DA NOTA DE FALECIMENTO */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-2">
                    6. Divulgação da Nota de Falecimento
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 border rounded-xl space-y-1">
                      <span className="text-xs font-bold text-slate-800 block">6.1 Autorizou divulgação da nota?</span>
                      <div className="flex gap-3 text-xs font-semibold">
                        {['sim', 'nao', 'nao_soube'].map((val) => (
                          <label key={val} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="sec7_authorized"
                              value={val}
                              checked={formData.sec7_authorized === val}
                              onChange={(e) => setFormData({ ...formData, sec7_authorized: e.target.value })}
                            />
                            <span>{val === 'sim' ? 'Sim' : val === 'nao' ? 'Não' : 'Não soube'}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border rounded-xl space-y-1">
                      <span className="text-xs font-bold text-slate-800 block">6.2 Divulgação por carro de som/funerário realizada?</span>
                      <div className="flex gap-3 text-xs font-semibold">
                        {['sim', 'nao', 'N/A'].map((val) => (
                          <label key={val} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="sec7_soundCarDone"
                              value={val}
                              checked={formData.sec7_soundCarDone === val}
                              onChange={(e) => setFormData({ ...formData, sec7_soundCarDone: e.target.value })}
                            />
                            <span>{val}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {renderRatingField('6.3 A divulgação ocorreu em tempo adequado?', 'sec7_timing')}
                  {renderRatingField('6.4 Avaliação geral da divulgação da nota', 'sec7_generalRating')}

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">Houve algum erro de nome, horário, local ou outra informação?</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="sec7_hadError"
                          value="nao"
                          checked={formData.sec7_hadError === 'nao'}
                          onChange={() => setFormData({ ...formData, sec7_hadError: 'nao' })}
                        />
                        <span>Não</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-red-600 cursor-pointer">
                        <input
                          type="radio"
                          name="sec7_hadError"
                          value="sim"
                          checked={formData.sec7_hadError === 'sim'}
                          onChange={() => setFormData({ ...formData, sec7_hadError: 'sim' })}
                        />
                        <span>Sim</span>
                      </label>
                    </div>

                    {formData.sec7_hadError === 'sim' && (
                      <SpellCheckTextarea
                        value={formData.sec7_errorDetails}
                        onChangeValue={(val) => setFormData({ ...formData, sec7_errorDetails: val })}
                        placeholder="Especifique qual erro ocorreu na nota..."
                        rows={2}
                      />
                    )}
                  </div>
                </div>

                {/* 7. VEÍCULO FUNERÁRIO, CORTEJO E SEPULTAMENTO */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-2">
                    7. Veículo Funerário, Cortejo e Sepultamento
                  </h3>

                  {renderRatingField('7.1 Limpeza e conservação do veículo funerário', 'sec8_cleanliness')}
                  {renderRatingField('7.2 Pontualidade do veículo e da equipe', 'sec8_punctuality')}
                  {renderRatingField('7.3 Organização e condução do cortejo', 'sec8_processionOrg')}
                  {renderRatingField('7.4 Postura, apresentação e respeito demonstrados', 'sec8_staffPostures')}
                  {renderRatingField('7.5 Acompanhamento e suporte até a finalização', 'sec8_fullSupport')}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Observações (Veículo / Sepultamento)</label>
                    <SpellCheckTextarea
                      value={formData.sec8_obs}
                      onChangeValue={(val) => setFormData({ ...formData, sec8_obs: val })}
                      placeholder="Observações do cortejo e sepultamento..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* 8. AVALIAÇÃO DA EQUIPE */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-2">
                    8. Avaliação da Equipe Bahia Prev
                  </h3>

                  {renderRatingField('8.1 De modo geral, como foi o atendimento dos funcionários?', 'sec9_overallStaffRating')}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                      <span className="text-xs font-bold text-emerald-950 block">8.2 Algum funcionário se destacou positivamente?</span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                          <input type="radio" name="sec9_positiveHighlight" value="nao" checked={formData.sec9_positiveHighlight === 'nao'} onChange={() => setFormData({ ...formData, sec9_positiveHighlight: 'nao' })} />
                          <span>Não</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 cursor-pointer">
                          <input type="radio" name="sec9_positiveHighlight" value="sim" checked={formData.sec9_positiveHighlight === 'sim'} onChange={() => setFormData({ ...formData, sec9_positiveHighlight: 'sim' })} />
                          <span>Sim</span>
                        </label>
                      </div>

                      {formData.sec9_positiveHighlight === 'sim' && (
                        <div className="space-y-2 pt-1">
                          <SpellCheckInput value={formData.sec9_positiveName} onChangeValue={(val) => setFormData({ ...formData, sec9_positiveName: val })} placeholder="Nome do funcionário (se souber)" className="w-full p-2 bg-white border rounded-lg text-xs" />
                          <SpellCheckTextarea value={formData.sec9_positiveReason} onChangeValue={(val) => setFormData({ ...formData, sec9_positiveReason: val })} placeholder="Por quê se destacou?" rows={2} />
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                      <span className="text-xs font-bold text-red-950 block">8.3 Houve algum comportamento que desagradou à família?</span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                          <input type="radio" name="sec9_negativeBehavior" value="nao" checked={formData.sec9_negativeBehavior === 'nao'} onChange={() => setFormData({ ...formData, sec9_negativeBehavior: 'nao' })} />
                          <span>Não</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-red-800 cursor-pointer">
                          <input type="radio" name="sec9_negativeBehavior" value="sim" checked={formData.sec9_negativeBehavior === 'sim'} onChange={() => setFormData({ ...formData, sec9_negativeBehavior: 'sim' })} />
                          <span>Sim</span>
                        </label>
                      </div>

                      {formData.sec9_negativeBehavior === 'sim' && (
                        <div className="space-y-2 pt-1">
                          <SpellCheckInput value={formData.sec9_negativeName} onChangeValue={(val) => setFormData({ ...formData, sec9_negativeName: val })} placeholder="Nome do funcionário (se souber)" className="w-full p-2 bg-white border rounded-lg text-xs" />
                          <SpellCheckTextarea value={formData.sec9_negativeDetails} onChangeValue={(val) => setFormData({ ...formData, sec9_negativeDetails: val })} placeholder="O que aconteceu?" rows={2} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 9. PERGUNTAS DE CONTROLE DE QUALIDADE */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-2">
                    9. Perguntas de Controle de Qualidade
                  </h3>

                  <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">9.1 Tudo o que foi combinado/informado à família foi cumprido?</span>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { val: 'sim_total', label: 'Sim, totalmente' },
                        { val: 'parcial', label: 'Parcialmente' },
                        { val: 'nao', label: 'Não' },
                        { val: 'nao_soube', label: 'Não soube avaliar' },
                      ].map((item) => (
                        <label key={item.val} className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                          <input
                            type="radio"
                            name="sec10_fulfilled"
                            value={item.val}
                            checked={formData.sec10_fulfilled === item.val}
                            onChange={(e) => setFormData({ ...formData, sec10_fulfilled: e.target.value })}
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>

                    {(formData.sec10_fulfilled === 'parcial' || formData.sec10_fulfilled === 'nao') && (
                      <SpellCheckTextarea
                        value={formData.sec10_unfulfilledDetails}
                        onChangeValue={(val) => setFormData({ ...formData, sec10_unfulfilledDetails: val })}
                        placeholder="O que não foi cumprido?"
                        rows={2}
                      />
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">9.2 Houve algum problema que a família precisou reclamar?</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                        <input type="radio" name="sec10_hadComplaint" value="nao" checked={formData.sec10_hadComplaint === 'nao'} onChange={() => setFormData({ ...formData, sec10_hadComplaint: 'nao' })} />
                        <span>Não</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-red-600 cursor-pointer">
                        <input type="radio" name="sec10_hadComplaint" value="sim" checked={formData.sec10_hadComplaint === 'sim'} onChange={() => setFormData({ ...formData, sec10_hadComplaint: 'sim' })} />
                        <span>Sim</span>
                      </label>
                    </div>

                    {formData.sec10_hadComplaint === 'sim' && (
                      <SpellCheckTextarea
                        value={formData.sec10_complaintDetails}
                        onChangeValue={(val) => setFormData({ ...formData, sec10_complaintDetails: val })}
                        placeholder="Qual problema foi reclamado?"
                        rows={2}
                      />
                    )}
                  </div>
                </div>

                {/* 10. PERGUNTA ESSENCIAL DE EXPERIÊNCIA */}
                <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                  <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-amber-600" />
                    <span>10. Pergunta Essencial de Experiência</span>
                  </h3>
                  <p className="text-xs text-amber-900 italic font-medium">
                    “Em algum momento do atendimento o(a) senhor(a) ou alguém da família ficou insatisfeito, preocupado ou sentiu que a Bahia Prev poderia ter feito algo melhor?”
                  </p>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                      <input type="radio" name="sec11_wasDissatisfied" value="nao" checked={formData.sec11_wasDissatisfied === 'nao'} onChange={() => setFormData({ ...formData, sec11_wasDissatisfied: 'nao' })} />
                      <span>Não</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-amber-900 cursor-pointer">
                      <input type="radio" name="sec11_wasDissatisfied" value="sim" checked={formData.sec11_wasDissatisfied === 'sim'} onChange={() => setFormData({ ...formData, sec11_wasDissatisfied: 'sim' })} />
                      <span>Sim</span>
                    </label>
                  </div>

                  {formData.sec11_wasDissatisfied === 'sim' && (
                    <SpellCheckTextarea
                      value={formData.sec11_dissatisfiedDetails}
                      onChangeValue={(val) => setFormData({ ...formData, sec11_dissatisfiedDetails: val })}
                      placeholder="Registrar com o máximo de fidelidade as palavras do cliente sem interromper..."
                      rows={3}
                    />
                  )}
                </div>

                {/* 11. AVALIAÇÃO FINAL */}
                <div className="space-y-4 p-5 bg-indigo-50/50 border border-indigo-200 rounded-2xl">
                  <h3 className="text-sm font-black text-indigo-950 uppercase tracking-wide border-b pb-2">
                    11. Avaliação, Nota de Satisfação e Recomendação
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-indigo-900 mb-2">
                      De 0 a 10, qual nota o(a) senhor(a) daria para toda a experiência com a Bahia Prev?
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setFormData({ ...formData, sec12_npsScore: num })}
                          className={`w-9 h-9 rounded-xl font-black text-xs transition-all cursor-pointer ${
                            formData.sec12_npsScore === num
                              ? 'bg-indigo-600 text-white shadow-md scale-105'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-indigo-100'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-indigo-900 mb-1">
                      O que a Bahia Prev fez de MELHOR durante o atendimento?
                    </label>
                    <SpellCheckTextarea
                      value={formData.sec12_bestThing}
                      onChangeValue={(val) => setFormData({ ...formData, sec12_bestThing: val })}
                      placeholder="Principais pontos elogiados..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-indigo-900 mb-1">
                      Qual é a PRINCIPAL coisa que poderíamos melhorar?
                    </label>
                    <SpellCheckTextarea
                      value={formData.sec12_improvement}
                      onChangeValue={(val) => setFormData({ ...formData, sec12_improvement: val })}
                      placeholder="Sugestões de melhoria..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Form Buttons Footer */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 sticky bottom-0 bg-white p-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {submitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                    <span>{editingSurvey ? 'Salvar Alterações' : 'Finalizar e Registrar Pesquisa'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {surveyToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 text-red-600 rounded-2xl shrink-0">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Excluir Pesquisa?</h3>
                  <p className="text-xs text-slate-500">Esta ação não poderá ser desfeita.</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
                <p><strong>Código da Pesquisa:</strong> <span className="font-bold text-indigo-700">{surveyToDelete.surveyCode}</span></p>
                <p><strong>Ente Querido:</strong> <span className="font-bold text-slate-900">{surveyToDelete.deceasedName || 'Não informado'}</span></p>
                <p><strong>Familiar:</strong> <span className="font-bold text-slate-900">{surveyToDelete.familyMemberName || 'Não informado'}</span></p>
              </div>

              {deleteErrorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold">
                  {deleteErrorMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSurveyToDelete(null)}
                  disabled={deleting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteSurvey}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-red-500/20"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Sim, Excluir</span>
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
