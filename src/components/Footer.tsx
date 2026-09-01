import React from 'react';
import { 
  ArrowUp, 
  Instagram, 
  Globe, 
  Phone, 
  Radio, 
  ListTodo, 
  Handshake, 
  Cross, 
  BookOpen, 
  Users, 
  Sparkles
} from 'lucide-react';
import { BahiaPrevLogo } from './BahiaPrevLogo';
import { TabType } from './Header';
import { useAuth } from './AuthContext';
import { checkFunerariaAccess } from '../utils/permissions';

interface FooterProps {
  onScrollToTop: () => void;
  onSelectTab?: (tab: TabType) => void;
}

export const Footer: React.FC<FooterProps> = ({ onScrollToTop, onSelectTab }) => {
  const { profile, user } = useAuth();
  const hasFunerariaAccess = checkFunerariaAccess(profile, user?.email);

  const handleNav = (tab: TabType) => {
    if (onSelectTab) {
      onSelectTab(tab);
    }
    onScrollToTop();
  };

  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-[#070d1f] to-slate-950 text-slate-400 border-t border-slate-800/80">
      {/* Top Accent Gradient Border */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-red-500" />

      {/* Subtle Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        
        {/* Main Grid Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-12 border-b border-slate-800/80">
          
          {/* Column 1: Brand & Hub Identity (5 cols) */}
          <div className="lg:col-span-4 space-y-4 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <BahiaPrevLogo className="h-14 sm:h-16 w-auto shrink-0 drop-shadow-lg" />
              <div>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2 justify-center sm:justify-start">
                  Bahia Prev Hub
                </h3>
                <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full mt-0.5">
                  Portal Corporativo Integrado
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300/90 leading-relaxed max-w-sm mx-auto sm:mx-0">
              Plataforma unificada para comunicação interna, acompanhamento de ordens de serviço, normas operacionais (POPs), metas de equipe e gestão de parceiros credenciados.
            </p>

            {/* System Status Pill */}
            <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Hub Operacional • Versão 2.5</span>
              </div>
            </div>
          </div>

          {/* Column 2: Módulos & Recursos Rápidos (3 cols) */}
          <div className="lg:col-span-3 space-y-3 text-center sm:text-left">
            <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center justify-center sm:justify-start gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Módulos do Sistema
            </h4>

            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => handleNav('feed')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-2 mx-auto sm:mx-0 text-slate-300"
                >
                  <Radio className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  <span>Feed & Comunicados</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('tasks')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-2 mx-auto sm:mx-0 text-slate-300"
                >
                  <ListTodo className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Tarefas & Metas</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('marketing')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-2 mx-auto sm:mx-0 text-slate-300"
                >
                  <Handshake className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>Marketing & Parceiros</span>
                </button>
              </li>
              {hasFunerariaAccess && (
                <li>
                  <button
                    onClick={() => handleNav('funeraria')}
                    className="hover:text-blue-400 transition-colors flex items-center gap-2 mx-auto sm:mx-0 text-slate-300"
                  >
                    <Cross className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                    <span>Gestão Funerária</span>
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => handleNav('pops')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-2 mx-auto sm:mx-0 text-slate-300"
                >
                  <BookOpen className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span>Procedimentos POPs</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('members')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-2 mx-auto sm:mx-0 text-slate-300"
                >
                  <Users className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  <span>Nossa Equipe</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('about')}
                  className="hover:text-blue-400 transition-colors flex items-center gap-2 mx-auto sm:mx-0 text-slate-300"
                >
                  <Sparkles className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                  <span>Sobre a Empresa</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Canais Oficiais de Contato (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white text-center sm:text-left flex items-center justify-center sm:justify-start gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Canais Oficiais & Suporte
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Instagram Card */}
              <a 
                href="https://instagram.com/planobahiaprev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative overflow-hidden bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-pink-500/50 p-3 rounded-xl transition-all duration-300 flex flex-col items-center text-center shadow-md cursor-pointer"
              >
                <div className="h-8 w-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                  <Instagram className="h-4 w-4" />
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">Instagram</span>
                <span className="text-xs text-white font-semibold mt-0.5 group-hover:text-pink-300 transition-colors">@planobahiaprev</span>
              </a>

              {/* Website Card */}
              <a 
                href="https://www.bahiaprev.com.br" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative overflow-hidden bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/50 p-3 rounded-xl transition-all duration-300 flex flex-col items-center text-center shadow-md cursor-pointer"
              >
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <Globe className="h-4 w-4" />
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">Site Oficial</span>
                <span className="text-xs text-white font-semibold mt-0.5 group-hover:text-blue-300 transition-colors">bahiaprev.com.br</span>
              </a>

              {/* WhatsApp Card */}
              <a 
                href="https://wa.me/5574999675899" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative overflow-hidden bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 p-3 rounded-xl transition-all duration-300 flex flex-col items-center text-center shadow-md cursor-pointer"
              >
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Phone className="h-4 w-4" />
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">WhatsApp</span>
                <span className="text-xs text-white font-semibold mt-0.5 group-hover:text-emerald-300 transition-colors">(74) 99967-5899</span>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Sub-Footer Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <p className="font-medium text-slate-300">
              © {new Date().getFullYear()} Plano Bahia Prev. Todos os direitos reservados.
            </p>
            <span className="hidden sm:inline text-slate-700">•</span>
            <span className="text-slate-400 text-[11px]">
              Plataforma Bahia Prev Hub
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onScrollToTop}
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-all cursor-pointer bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 shadow-sm active:scale-95 group"
              title="Voltar ao início da página"
            >
              <span>Voltar ao Topo</span>
              <ArrowUp className="h-3.5 w-3.5 text-blue-400 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
