import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Radio, 
  Megaphone, 
  ListTodo, 
  Handshake, 
  BookOpen, 
  Users, 
  Sparkles, 
  ArrowRight,
  Shield,
  Layers,
  ChevronRight,
  ShieldCheck,
  Cross,
  Smartphone,
  Download,
  AlertTriangle,
  Database
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { BahiaPrevLogo } from './BahiaPrevLogo';
import { checkFunerariaAccess } from '../utils/permissions';
import { formatUserName } from '../utils/userNameFormatter';
import { DailyMotivationalQuote } from './DailyMotivationalQuote';

export type TabType = 'home' | 'feed' | 'pops' | 'marketing' | 'funeraria' | 'about' | 'members' | 'tasks' | 'admin' | 'install';

interface HomePortalProps {
  onSelectTab: (tab: TabType) => void;
  onOpenProfileModal: () => void;
  onOpenInstallModal?: () => void;
}

interface ModuleCard {
  id: TabType;
  title: string;
  badge: string;
  description: string;
  hoverDestination: string;
  icon: React.ElementType;
  iconBg: string;
  borderColor: string;
  hoverGlow: string;
  accentColor: string;
}

const MODULES: ModuleCard[] = [
  {
    id: 'feed',
    title: 'Feed & Comunicados',
    badge: 'Publicações & Notícias',
    description: 'Acompanhe novidades, comunicados oficiais da diretoria e interaja com as postagens da equipe Bahia Prev.',
    hoverDestination: 'Página do Feed de Notícias e Comunicados',
    icon: Radio,
    iconBg: 'from-blue-600 to-indigo-600 text-white',
    borderColor: 'border-blue-500/30 hover:border-blue-500',
    hoverGlow: 'hover:shadow-blue-500/20',
    accentColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  },
  {
    id: 'tasks',
    title: 'Minhas Tarefas',
    badge: 'Gestão & Demandas',
    description: 'Gerencie prazos, atribuições por colaborador, tarefas de equipe e acompanhe seu progresso.',
    hoverDestination: 'Painel completo de Gestão de Tarefas',
    icon: ListTodo,
    iconBg: 'from-emerald-500 to-teal-600 text-white',
    borderColor: 'border-emerald-500/30 hover:border-emerald-500',
    hoverGlow: 'hover:shadow-emerald-500/20',
    accentColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  },
  {
    id: 'funeraria',
    title: '⚰️ Gestão Funerária',
    badge: 'Operações & Atendimentos',
    description: 'Gerencie ordens de serviço, acompanhe atendimentos, registre etapas operacionais e monitore as ocorrências funerárias.',
    hoverDestination: 'Área de Acompanhamento Operacional dos Agentes Funerários',
    icon: Cross,
    iconBg: 'from-purple-600 to-slate-800 text-white',
    borderColor: 'border-purple-500/30 hover:border-purple-500',
    hoverGlow: 'hover:shadow-purple-500/20',
    accentColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
  },
  {
    id: 'marketing',
    title: 'Área de Marketing',
    badge: 'Mídia & Parceiros',
    description: 'Catálogo de parceiros oficiais, materiais de divulgação, artes institucionais e arquivos de mídia.',
    hoverDestination: 'Página de Materiais e Parceiros de Marketing',
    icon: Handshake,
    iconBg: 'from-purple-600 to-indigo-600 text-white',
    borderColor: 'border-purple-500/30 hover:border-purple-500',
    hoverGlow: 'hover:shadow-purple-500/20',
    accentColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
  },
  {
    id: 'pops',
    title: 'Procedimentos POP',
    badge: 'Normas & Manuais',
    description: 'Acesse o acervo de Procedimentos Operacionais Padrão, manuais de conduta e normas técnicas.',
    hoverDestination: 'Página de Procedimentos Operacionais (POP)',
    icon: BookOpen,
    iconBg: 'from-cyan-500 to-blue-600 text-white',
    borderColor: 'border-cyan-500/30 hover:border-cyan-500',
    hoverGlow: 'hover:shadow-cyan-500/20',
    accentColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
  },
  {
    id: 'members',
    title: 'Nossa Equipe',
    badge: 'Diretório Interno',
    description: 'Conheça todos os colaboradores, cargos, funções, contatos diretos e a estrutura da equipe.',
    hoverDestination: 'Página da Equipe e Organograma Bahia Prev',
    icon: Users,
    iconBg: 'from-rose-500 to-pink-600 text-white',
    borderColor: 'border-rose-500/30 hover:border-rose-500',
    hoverGlow: 'hover:shadow-rose-500/20',
    accentColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  },
  {
    id: 'about',
    title: 'Sobre a Empresa',
    badge: 'Institucional',
    description: 'História da Bahia Prev, missão, visão, pilares éticos e informações institucionais.',
    hoverDestination: 'Página Institucional Sobre Nós',
    icon: Sparkles,
    iconBg: 'from-amber-400 to-yellow-600 text-white',
    borderColor: 'border-yellow-500/30 hover:border-yellow-500',
    hoverGlow: 'hover:shadow-yellow-500/20',
    accentColor: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
  },
  {
    id: 'install',
    title: '📱 Instalar no Celular',
    badge: 'Tutoriais de Instalação',
    description: 'Guia completo passo a passo de como instalar o aplicativo BAHIAPREV HUB no seu iPhone (iOS) e smartphone Android.',
    hoverDestination: 'Página de Tutoriais para Instalação no iPhone e Android',
    icon: Smartphone,
    iconBg: 'from-emerald-600 to-teal-700 text-white',
    borderColor: 'border-emerald-500/30 hover:border-emerald-500',
    hoverGlow: 'hover:shadow-emerald-500/20',
    accentColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  }
];

export const HomePortal: React.FC<HomePortalProps> = ({ onSelectTab, onOpenProfileModal, onOpenInstallModal }) => {
  const { profile, user } = useAuth();
  const [hoveredModule, setHoveredModule] = useState<ModuleCard | null>(null);

  const isAdmin = Boolean(
    (user?.email || '').toLowerCase().trim() === 'lucasrodrigues@bahiaprev.com.br' ||
    (profile?.email || '').toLowerCase().trim() === 'lucasrodrigues@bahiaprev.com.br'
  );

  const adminModule: ModuleCard = {
    id: 'admin',
    title: 'Gestão de Usuários',
    badge: 'Acesso Exclusivo Lucas Rodrigues (Analista de Marketing)',
    description: 'Cadastre novos colaboradores, configure cargos e defina permissões de publicação no Feed e criação de tarefas.',
    hoverDestination: 'Painel do Administrador Lucas Rodrigues',
    icon: ShieldCheck,
    iconBg: 'from-indigo-600 to-purple-600 text-white',
    borderColor: 'border-indigo-500/40 hover:border-indigo-500',
    hoverGlow: 'hover:shadow-indigo-500/20',
    accentColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
  };

  const userRole = (profile?.role || '').trim().toLowerCase();
  const isFinanceiroOrCpd = userRole.includes('financeiro') || userRole.includes('cpd');
  const hasFunerariaAccess = checkFunerariaAccess(profile, user?.email);

  let activeModules = isAdmin ? [...MODULES, adminModule] : MODULES;
  if (!hasFunerariaAccess) {
    activeModules = activeModules.filter(m => m.id !== 'funeraria');
  }
  if (isFinanceiroOrCpd) {
    activeModules = activeModules.filter(m => m.id !== 'admin');
  }

  return (
    <div className="w-full">
      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-white py-8 sm:py-16 px-3 sm:px-6 lg:px-8 border-b border-slate-800 shadow-2xl">
        {/* Background ambient accents */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-25" />
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative flex flex-col items-center text-center">
          {/* Daily Motivational Quote Card (Positioned on the Left where circled on Desktop, and centered at top on Mobile) */}
          <div className="w-full lg:w-auto lg:absolute lg:left-0 lg:top-0 lg:max-w-xs xl:max-w-sm mb-4 lg:mb-0 z-20 flex justify-center lg:justify-start">
            <DailyMotivationalQuote className="w-full max-w-sm sm:max-w-md lg:max-w-xs xl:max-w-sm" />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="mb-3 sm:mb-4"
          >
            <BahiaPrevLogo className="h-14 sm:h-20 lg:h-24 drop-shadow-2xl hover:scale-105 transition-transform cursor-pointer" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 rounded-full bg-white/10 backdrop-blur-md px-3 sm:px-4 py-1 sm:py-1.5 text-xs font-bold text-white border border-white/15 shadow-lg mb-3 sm:mb-4 max-w-full"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="tracking-wider uppercase text-[10px] sm:text-[11px] text-blue-300 font-extrabold">Portal do Sistema Bahia Prev Hub</span>
            <span className="text-white/30 hidden xs:inline">•</span>
            <span className="text-slate-200 font-medium text-[10px] sm:text-xs">Página Inicial</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight max-w-4xl"
          >
            Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-300">{formatUserName(profile?.name, user?.email || profile?.email)}</span>!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-2 text-xs sm:text-base text-slate-300 max-w-2xl leading-relaxed font-normal px-2"
          >
            Selecione abaixo o módulo do sistema que você deseja acessar. Cada opção abrirá uma página exclusiva e dedicada com todas as ferramentas e informações.
          </motion.p>

          {/* Active Hover / Touch Destination Preview Callout Box */}
          <div className="mt-4 sm:mt-6 min-h-[48px] flex items-center justify-center px-2">
            {hoveredModule ? (
              <motion.div
                key={hoveredModule.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-400/40 text-blue-200 text-xs sm:text-sm font-semibold backdrop-blur-md shadow-lg max-w-full text-left sm:text-center"
              >
                <ChevronRight className="h-4 w-4 text-blue-400 animate-pulse shrink-0" />
                <span className="truncate">Destino ao clicar: <strong className="text-white font-bold">{hoveredModule.hoverDestination}</strong></span>
              </motion.div>
            ) : (
              <span className="text-[11px] sm:text-xs text-slate-400/80 font-medium tracking-wide">
                Toque em qualquer módulo para abrir a página correspondente no seu celular
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Main Grid of Square / Rectangular Module Cards */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-14">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 pb-3 border-b border-slate-200 gap-2">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              <span>Módulos do Sistema</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
              Toque em um módulo para abrir o painel correspondente
            </p>
          </div>
          <span className="inline-block self-start sm:self-auto text-[11px] sm:text-xs font-bold text-white bg-[#458dee] px-2.5 py-1 rounded-lg shadow-sm">
            {activeModules.length} Páginas Disponíveis
          </span>
        </div>

        {/* Square Cards Grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {activeModules.map((mod, index) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                onMouseEnter={() => setHoveredModule(mod)}
                onMouseLeave={() => setHoveredModule(null)}
                onClick={() => {
                  try {
                    window.scrollTo(0, 0);
                  } catch {
                    // safe fallback
                  }
                  onSelectTab(mod.id);
                }}
                className={`group relative bg-white rounded-2xl p-4 sm:p-6 border ${mod.borderColor} shadow-sm active:scale-95 sm:active:scale-100 hover:shadow-xl ${mod.hoverGlow} transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[190px] sm:min-h-[220px] select-none touch-manipulation`}
              >
                {/* Top Card Header */}
                <div>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr ${mod.iconBg} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <span className={`text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border ${mod.accentColor} uppercase tracking-wider truncate max-w-[140px]`}>
                      {mod.badge}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight flex items-center justify-between">
                    <span>{mod.title}</span>
                  </h3>

                  <p className="text-[11px] sm:text-xs text-slate-600 mt-1.5 sm:mt-2 leading-relaxed font-normal">
                    {mod.description}
                  </p>
                </div>

                {/* Bottom Action Bar inside Card */}
                <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 flex items-center justify-end text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                  <div className="flex items-center gap-1 text-blue-600 opacity-90 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                    <span className="text-[10px] sm:text-[11px] font-extrabold">Acessar Módulo</span>
                    <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                </div>

                {/* Subtle Hover Border Highlight */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500/30 rounded-2xl pointer-events-none transition-colors" />
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
