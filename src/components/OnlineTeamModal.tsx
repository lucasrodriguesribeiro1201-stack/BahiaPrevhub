import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, X } from 'lucide-react';
import { OnlineUser } from '../hooks/useOnlinePresence';
import { useAuth } from './AuthContext';

interface OnlineTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onlineUsers: OnlineUser[];
  isConnected: boolean;
}

export const OnlineTeamModal: React.FC<OnlineTeamModalProps> = ({
  isOpen,
  onClose,
  onlineUsers
}) => {
  const { user, profile } = useAuth();

  if (!isOpen) return null;

  const currentEmail = (user?.email || profile?.email || '').toLowerCase().trim();

  // Get user role badge style
  const getRoleBadgeStyle = (role: string = '') => {
    const r = role.toLowerCase();
    if (r.includes('admin') || r.includes('diretor') || r.includes('gerente')) {
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    }
    if (r.includes('marketing')) {
      return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }
    if (r.includes('financeiro') || r.includes('cpd')) {
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
    if (r.includes('funer') || r.includes('plant')) {
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    }
    return 'bg-slate-700/50 text-slate-300 border-slate-600/40';
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top ambient glow */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-20 -left-20 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="relative p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Equipe Online
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    {onlineUsers.length} online
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Membros conectados no momento
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User List Content */}
          <div className="max-h-[380px] overflow-y-auto p-4 sm:p-5 space-y-3 divide-y divide-slate-800/50">
            {onlineUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-300">Nenhum colaborador online no momento</p>
              </div>
            ) : (
              onlineUsers.map((onlineUser) => {
                const isMe = onlineUser.email.toLowerCase() === currentEmail;
                return (
                  <div
                    key={onlineUser.email}
                    className="pt-3 first:pt-0 flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar with live green pulse dot */}
                      <div className="relative shrink-0">
                        {onlineUser.avatarUrl ? (
                          <img
                            src={onlineUser.avatarUrl}
                            alt={onlineUser.name}
                            className="h-10 w-10 rounded-full object-cover border border-emerald-500/40 shadow-sm"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-emerald-500/40 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                            {onlineUser.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-xs ring-1 ring-emerald-400 animate-pulse" />
                      </div>

                      {/* Name and role */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[160px] sm:max-w-[200px]">
                            {onlineUser.name}
                          </span>
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-bold">
                              Você
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(onlineUser.role)}`}>
                            {onlineUser.role}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                            {onlineUser.email}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Online Status badge */}
                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-lg">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Online
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
