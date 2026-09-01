import React, { useState } from 'react';
import { 
  Home, 
  Radio, 
  ListTodo, 
  BookOpen, 
  Cross, 
  Grid, 
  Handshake, 
  Users, 
  Sparkles, 
  ShieldCheck, 
  X,
  ChevronRight,
  Smartphone,
  Download
} from 'lucide-react';
import { TabType } from './Header';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { checkFunerariaAccess } from '../utils/permissions';

interface MobileBottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenInstallModal?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, onSelectTab, onOpenInstallModal }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { profile, user } = useAuth();

  const userRole = (profile?.role || '').trim().toLowerCase();
  const isFinanceiroOrCpd = userRole.includes('financeiro') || userRole.includes('cpd');
  const hasFunerariaAccess = checkFunerariaAccess(profile, user?.email);

  const isLucas = Boolean(
    (user?.email || '').toLowerCase().trim() === 'lucasrodrigues@bahiaprev.com.br' ||
    (profile?.email || '').toLowerCase().trim() === 'lucasrodrigues@bahiaprev.com.br'
  );

  const handleTabClick = (tab: TabType) => {
    onSelectTab(tab);
    setIsMenuOpen(false);
    try {
      window.scrollTo(0, 0);
    } catch {
      // safe fallback
    }
  };

  const navItems: { id: TabType; label: string; icon: React.ElementType; color: string }[] = hasFunerariaAccess
    ? [
        { id: 'home', label: 'Início', icon: Home, color: 'text-blue-400' },
        { id: 'feed', label: 'Feed', icon: Radio, color: 'text-red-400' },
        { id: 'tasks', label: 'Tarefas', icon: ListTodo, color: 'text-emerald-400' },
        { id: 'funeraria', label: 'Funerária', icon: Cross, color: 'text-purple-400' },
        { id: 'pops', label: 'POP', icon: BookOpen, color: 'text-cyan-400' },
      ]
    : [
        { id: 'home', label: 'Início', icon: Home, color: 'text-blue-400' },
        { id: 'feed', label: 'Feed', icon: Radio, color: 'text-red-400' },
        { id: 'tasks', label: 'Tarefas', icon: ListTodo, color: 'text-emerald-400' },
        { id: 'marketing', label: 'Marketing', icon: Handshake, color: 'text-purple-400' },
        { id: 'pops', label: 'POP', icon: BookOpen, color: 'text-cyan-400' },
      ];

  const rawModules: { id: TabType; label: string; desc: string; icon: React.ElementType; color: string; badge?: string }[] = [
    { id: 'home', label: 'Página Inicial', desc: 'Menu com todos os módulos', icon: Home, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { id: 'feed', label: 'Feed & Comunicados', desc: 'Postagens e comunicados oficiais', icon: Radio, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    { id: 'tasks', label: 'Minhas Tarefas', desc: 'Gestão e acompanhamento de prazos', icon: ListTodo, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { id: 'funeraria', label: 'Gestão Funerária', desc: 'Ordens de serviço e atendimentos', icon: Cross, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    { id: 'pops', label: 'Procedimentos POP', desc: 'Manuais e normas de conduta', icon: BookOpen, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    { id: 'marketing', label: 'Área de Marketing', desc: 'Parceiros e materiais de mídia', icon: Handshake, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    { id: 'members', label: 'Nossa Equipe', desc: 'Diretório de colaboradores e contatos', icon: Users, color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    { id: 'about', label: 'Sobre a Empresa', desc: 'História, missão e visão Bahia Prev', icon: Sparkles, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    { id: 'install', label: 'Instalar no Celular', desc: 'Tutoriais para iPhone e Android', icon: Smartphone, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  ];

  if (isLucas) {
    rawModules.push({
      id: 'admin',
      label: 'Gestão de Usuários',
      desc: 'Cadastro de equipe e permissões',
      icon: ShieldCheck,
      color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      badge: 'Exclusivo'
    });
  }

  const allModules = rawModules.filter(m => {
    if (m.id === 'funeraria' && !hasFunerariaAccess) return false;
    if (m.id === 'admin' && isFinanceiroOrCpd) return false;
    return true;
  });

  return (
    <>
      {/* Drawer Overlay Menu for Mobile */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 pb-24 text-white shadow-2xl"
            >
              {/* Header inside Mobile Drawer */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Grid className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Todos os Módulos</h3>
                    <p className="text-[11px] text-slate-400">Selecione para navegar pelo smartphone</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Install App Banner in Drawer */}
              {onOpenInstallModal && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenInstallModal();
                    }}
                    className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-between shadow-lg border border-blue-400/40 cursor-pointer active:scale-98 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <Smartphone className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-white font-black text-xs flex items-center gap-1.5">
                          <span>Instalar App no iPhone / Android</span>
                        </div>
                        <p className="text-[11px] text-blue-100 font-normal mt-0.5">Clique para adicionar o ícone à sua tela inicial</p>
                      </div>
                    </div>

                    <Download className="h-4 w-4 text-blue-200 shrink-0" />
                  </button>
                </div>
              )}

              {/* Modules List inside Drawer */}
              <div className="grid grid-cols-1 gap-2.5">
                {allModules.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg'
                          : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 ${item.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white truncate">{item.label}</span>
                            {item.badge && (
                              <span className="text-[9px] font-extrabold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 px-1.5 py-0.5 rounded">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate">{item.desc}</p>
                        </div>
                      </div>

                      <ChevronRight className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fixed Sticky Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 shadow-2xl safe-area-pb">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[56px] ${
                  isActive
                    ? 'text-white bg-blue-600/30 border border-blue-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'scale-110 ' + item.color : 'text-slate-400'}`} />
                <span className={`text-[10px] font-bold mt-1 tracking-tight ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Menu Button for More Modules */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[56px] ${
              isMenuOpen || !navItems.some(i => i.id === activeTab)
                ? 'text-white bg-blue-600/30 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="h-5 w-5 text-purple-400" />
            <span className="text-[10px] font-bold mt-1 text-slate-400 tracking-tight">
              Mais
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
