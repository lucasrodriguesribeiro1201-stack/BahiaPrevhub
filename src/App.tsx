/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Header, TabType } from './components/Header';
import { HomePortal } from './components/HomePortal';
import { FeedSection } from './components/FeedSection';
import { AboutCompanySection } from './components/AboutCompanySection';
import { PopsSection } from './components/PopsSection';
import { PartnerSection } from './components/PartnerSection';
import { MembersSection } from './components/MembersSection';
import { TasksSection } from './components/TasksSection';
import { FunerariaSection } from './components/FunerariaSection';
import { UserAdminSection } from './components/UserAdminSection';
import { PartnerDetailModal } from './components/PartnerDetailModal';
import { UserProfileModal } from './components/UserProfileModal';
import { Footer } from './components/Footer';
import { Partner } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { AuthForm } from './components/AuthForm';
import { LogOut, Camera, Home, AlertTriangle, Database, X, ShieldAlert } from 'lucide-react';
import { formatUserName } from './utils/userNameFormatter';

import { ErrorBoundary } from './components/ErrorBoundary';
import { MobileBottomNav } from './components/MobileBottomNav';
import { InstallPwaModal } from './components/InstallPwaModal';
import { InstallSection } from './components/InstallSection';
import { SupabaseMigrationModal } from './components/SupabaseMigrationModal';
import { checkFunerariaAccess } from './utils/permissions';

function MainAppContent() {
  const { user, profile, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  const userRole = (profile?.role || '').trim().toLowerCase();
  const isFinanceiroOrCpd = userRole.includes('financeiro') || userRole.includes('cpd');
  const hasFunerariaAccess = checkFunerariaAccess(profile, user?.email);
  const isLucasAdmin = Boolean(
    (user?.email || '').toLowerCase().trim() === 'lucasrodrigues@bahiaprev.com.br' ||
    (profile?.email || '').toLowerCase().trim() === 'lucasrodrigues@bahiaprev.com.br'
  );

  // Redirect users away from restricted modules
  useEffect(() => {
    if (!hasFunerariaAccess && activeTab === 'funeraria') {
      setActiveTab('home');
    }
    if (!isLucasAdmin && activeTab === 'admin') {
      setActiveTab('home');
    }
  }, [hasFunerariaAccess, isLucasAdmin, activeTab]);

  useEffect(() => {
    try {
      window.scrollTo(0, 0);
    } catch {
      // safe fallback for mobile
    }
  }, [activeTab]);

  const handleScrollToTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="h-10 w-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300 tracking-wide">Carregando Bahia Prev Hub...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const formattedDisplayName = formatUserName(profile?.name, user?.email || profile?.email);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-500/15 selection:text-blue-900 antialiased font-sans">
      {/* Top User Status & Info Bar */}
      <div className={`bg-slate-950 text-white text-xs py-2 px-3 sm:px-6 shadow-inner ${activeTab === 'home' ? '' : 'border-b border-slate-800/80'}`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
          
          {/* Top Left Collaborator Badge & Profile Info */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            <div 
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 sm:gap-3 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-sm cursor-pointer transition-colors group min-w-0"
              title="Clique para alterar sua foto de perfil"
            >
              <div className="relative shrink-0">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={formattedDisplayName}
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-cover border-2 border-blue-500 shadow-md group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-tr from-blue-600 to-red-500 text-white font-black text-xs flex items-center justify-center shadow-md">
                    {formattedDisplayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
              </div>

              <div className="flex flex-col text-left truncate">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-white font-bold text-xs tracking-tight group-hover:text-blue-300 transition-colors truncate max-w-[110px] xs:max-w-[160px] sm:max-w-none">
                    {formattedDisplayName}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-semibold shrink-0">
                    {profile?.role || 'Bahia Prev'}
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate hidden xs:inline">
                  Bahia Prev Hub Conectado
                </span>
              </div>
            </div>

            {/* Mobile Quick Action Buttons in single header row */}
            <div className="flex items-center gap-1.5 shrink-0 sm:hidden">
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Alterar Foto"
              >
                <Camera className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[10px]">Foto</span>
              </button>

              <button 
                onClick={logout}
                className="px-2 py-1 text-slate-300 hover:text-red-400 bg-slate-900 border border-slate-800 rounded-lg transition-colors font-semibold text-[11px] flex items-center gap-1"
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5 text-red-400" />
                <span className="text-[10px]">Sair</span>
              </button>
            </div>
          </div>

          {/* Desktop Top Right Controls & Logout */}
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Camera className="h-3 w-3 text-blue-400" />
              <span>Alterar Foto</span>
            </button>

            {activeTab !== 'home' && (
              <button
                onClick={() => setActiveTab('home')}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm border border-blue-400/30"
              >
                <Home className="h-3.5 w-3.5 text-blue-200" />
                <span>Página Inicial</span>
              </button>
            )}

            <span className="hidden md:inline text-slate-400 font-normal">
              E-mail: <strong className="text-slate-200 font-medium">{user?.email}</strong>
            </span>
            <span className="hidden sm:inline text-slate-800">|</span>
            <button 
              onClick={logout}
              className="text-slate-300 hover:text-red-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 font-semibold text-xs"
              title="Encerrar sessão no Bahia Prev Hub"
            >
              <LogOut className="h-3.5 w-3.5 text-red-400" />
              <span>Sair</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Header with Navigation Tabs */}
      <Header 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />
      
      {/* Tab Content Rendering */}
      <main className={`bg-slate-50 ${activeTab === 'home' ? 'py-0' : 'py-2'} min-h-[600px] pb-24 md:pb-8`}>
        <ErrorBoundary key={activeTab} onReset={() => setActiveTab('home')}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'home' && (
                <HomePortal 
                  onSelectTab={setActiveTab} 
                  onOpenProfileModal={() => setIsProfileModalOpen(true)}
                  onOpenInstallModal={() => setIsInstallModalOpen(true)}
                />
              )}
              {activeTab === 'feed' && <FeedSection />}
              {activeTab === 'members' && <MembersSection onOpenProfileModal={() => setIsProfileModalOpen(true)} />}
              {activeTab === 'tasks' && <TasksSection />}
              {activeTab === 'pops' && <PopsSection />}
              {activeTab === 'marketing' && <PartnerSection onSelectPartner={(partner) => setSelectedPartner(partner)} />}
              {activeTab === 'funeraria' && hasFunerariaAccess && <FunerariaSection />}
              {activeTab === 'about' && <AboutCompanySection />}
              {activeTab === 'install' && <InstallSection />}
              {activeTab === 'admin' && isLucasAdmin && <UserAdminSection />}
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      {/* Persistent Mobile Bottom Navigation Bar */}
      <MobileBottomNav 
        activeTab={activeTab} 
        onSelectTab={setActiveTab} 
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />

      {/* Main Footer */}
      <Footer onScrollToTop={handleScrollToTop} />

      {/* Modals */}
      <AnimatePresence>
        {selectedPartner && (
          <PartnerDetailModal 
            partner={selectedPartner} 
            onClose={() => setSelectedPartner(null)} 
          />
        )}
        {isProfileModalOpen && (
          <UserProfileModal
            onClose={() => setIsProfileModalOpen(false)}
          />
        )}
      </AnimatePresence>

      <InstallPwaModal 
        isOpen={isInstallModalOpen} 
        onClose={() => setIsInstallModalOpen(false)} 
      />

      <SupabaseMigrationModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

