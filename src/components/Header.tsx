import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Handshake, 
  Users, 
  Radio, 
  BookOpen, 
  ListTodo, 
  ArrowLeft, 
  Home, 
  ShieldCheck, 
  Cross, 
  Smartphone,
  ChevronRight
} from 'lucide-react';
import { BahiaPrevLogo } from './BahiaPrevLogo';
import { useAuth } from './AuthContext';
import { checkFunerariaAccess } from '../utils/permissions';

export type TabType = 'home' | 'feed' | 'pops' | 'marketing' | 'funeraria' | 'about' | 'members' | 'tasks' | 'admin' | 'install';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenInstallModal?: () => void;
}

const TAB_NAMES: Record<TabType, { name: string; shortName: string; icon: React.ElementType; color: string }> = {
  home: { name: 'Página Inicial', shortName: 'Início', icon: Home, color: 'text-blue-400' },
  feed: { name: 'Feed & Comunicados', shortName: 'Feed', icon: Radio, color: 'text-red-400' },
  tasks: { name: 'Minhas Tarefas', shortName: 'Tarefas', icon: ListTodo, color: 'text-emerald-400' },
  marketing: { name: 'Área de Marketing', shortName: 'Marketing', icon: Handshake, color: 'text-purple-400' },
  funeraria: { name: 'Gestão Funerária', shortName: 'Funerária', icon: Cross, color: 'text-purple-400' },
  pops: { name: 'Procedimentos POP', shortName: 'POP', icon: BookOpen, color: 'text-cyan-400' },
  members: { name: 'Nossa Equipe', shortName: 'Equipe', icon: Users, color: 'text-rose-400' },
  about: { name: 'Sobre Nós', shortName: 'Sobre', icon: Sparkles, color: 'text-yellow-400' },
  install: { name: 'Instalar App', shortName: 'Instalar', icon: Smartphone, color: 'text-emerald-400' },
  admin: { name: 'Gestão de Usuários', shortName: 'Usuários', icon: ShieldCheck, color: 'text-indigo-400' },
};

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, onOpenInstallModal }) => {
  const { profile, user } = useAuth();
  const userRole = (profile?.role || '').trim().toLowerCase();
  const isFinanceiroOrCpd = userRole.includes('financeiro') || userRole.includes('cpd');
  const hasFunerariaAccess = checkFunerariaAccess(profile, user?.email);

  const isLucas = Boolean(
    (user?.email || '').toLowerCase().trim() === 'lucasrodrigues@bahiaprev.com.br' ||
    (profile?.email || '').toLowerCase().trim() === 'lucasrodrigues@bahiaprev.com.br'
  );

  // When activeTab is 'home', hide the header module bar completely
  if (activeTab === 'home') {
    return null;
  }

  const handleTabSelect = (tab: TabType) => {
    try {
      window.scrollTo(0, 0);
    } catch {}
    onTabChange(tab);
  };

  const currentTabInfo = TAB_NAMES[activeTab] || TAB_NAMES.feed;
  const Icon = currentTabInfo.icon;

  const tabsList: { id: TabType; label: string; icon: React.ElementType; color: string; special?: boolean }[] = [
    { id: 'feed', label: 'Feed & Comunicados', icon: Radio, color: 'text-red-400' },
    { id: 'tasks', label: 'Tarefas', icon: ListTodo, color: 'text-emerald-400' },
    { id: 'marketing', label: 'Marketing', icon: Handshake, color: 'text-purple-400' },
    ...(hasFunerariaAccess ? [{ id: 'funeraria' as TabType, label: 'Gestão Funerária', icon: Cross, color: 'text-purple-400' }] : []),
    { id: 'pops', label: 'POP', icon: BookOpen, color: 'text-cyan-400' },
    { id: 'members', label: 'Equipe', icon: Users, color: 'text-rose-400' },
    { id: 'about', label: 'Sobre', icon: Sparkles, color: 'text-yellow-400' },
    ...(isLucas && !isFinanceiroOrCpd ? [{ id: 'admin' as TabType, label: 'Usuários', icon: ShieldCheck, color: 'text-indigo-400', special: true }] : []),
    { id: 'install', label: 'Instalar App', icon: Smartphone, color: 'text-emerald-400' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 shadow-2xl">
      {/* Top accent line */}
      <div className="h-0.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-4">
          
          {/* Left Side: Back Button + Logo + Breadcrumb & Current Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
            {/* Back Button */}
            <button
              onClick={() => handleTabSelect('home')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border border-blue-400/40 group"
              title="Voltar para a Página Inicial"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Início</span>
            </button>

            <div className="h-5 w-px bg-slate-800 hidden sm:block shrink-0" />

            {/* Logo */}
            <div 
              onClick={() => handleTabSelect('home')} 
              className="cursor-pointer shrink-0 hidden sm:block hover:opacity-90 transition-opacity"
            >
              <BahiaPrevLogo className="h-7 w-auto" />
            </div>

            {/* Current Module Title & Breadcrumbs */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                <Icon className={`h-4 w-4 ${currentTabInfo.color}`} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium leading-none mb-0.5">
                  <span 
                    onClick={() => handleTabSelect('home')}
                    className="hover:text-blue-300 cursor-pointer transition-colors"
                  >
                    Início
                  </span>
                  <ChevronRight className="h-2.5 w-2.5 text-slate-600" />
                  <span className="text-slate-300 truncate font-semibold">
                    {currentTabInfo.name}
                  </span>
                </div>
                <h1 className="text-sm sm:text-base font-black text-white tracking-tight leading-none truncate">
                  {currentTabInfo.name}
                </h1>
              </div>
            </div>
          </div>

          {/* Right Side: Clean Horizontal Modules Navigation Bar (Scrollable if needed, never overlaps) */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none bg-slate-900/80 p-1 sm:p-1.5 rounded-xl border border-slate-800/80 max-w-full">
            {tabsList.map((item) => {
              const ItemIcon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabSelect(item.id)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md border border-blue-400/40'
                      : item.special
                      ? 'text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 hover:bg-indigo-900/50 hover:text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/90 border border-transparent'
                  }`}
                >
                  <ItemIcon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : item.color}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

        </div>
      </div>
    </header>
  );
};
