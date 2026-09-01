import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, Radio, ChevronRight, Sparkles } from 'lucide-react';
import { useOnlinePresence } from '../hooks/useOnlinePresence';
import { OnlineTeamModal } from './OnlineTeamModal';

interface OnlineTeamButtonProps {
  className?: string;
}

export const OnlineTeamButton: React.FC<OnlineTeamButtonProps> = ({ className = '' }) => {
  const { onlineUsers, onlineCount, isConnected } = useOnlinePresence();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Take up to 3 avatars for preview stack
  const previewUsers = onlineUsers.slice(0, 3);
  const remainingCount = Math.max(0, onlineCount - previewUsers.length);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        onClick={() => setIsModalOpen(true)}
        className={`group relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900/90 via-slate-900/95 to-emerald-950/30 border border-emerald-500/30 hover:border-emerald-400/60 p-2.5 sm:p-3 shadow-lg hover:shadow-xl hover:shadow-emerald-500/10 backdrop-blur-xl cursor-pointer transition-all duration-300 select-none text-left ${className}`}
        title="Clique para ver a lista de colaboradores online"
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-6 -right-6 w-20 h-20 bg-emerald-500/15 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/25 transition-all duration-300" />
        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative flex items-center justify-between gap-3">
          {/* Left: Icon and Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Users className="h-4 w-4" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-900" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors">
                  Equipe Online
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-extrabold shrink-0">
                  {onlineCount} {onlineCount === 1 ? 'online' : 'online'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors truncate">
                Toque para ver colaboradores
              </p>
            </div>
          </div>

          {/* Right: Avatars stack preview + arrow */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
              {previewUsers.map((u, idx) => (
                <div
                  key={u.email || idx}
                  className="relative inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 bg-slate-800 shrink-0 overflow-hidden shadow-sm"
                  title={u.name}
                >
                  {u.avatarUrl ? (
                    <img
                      src={u.avatarUrl}
                      alt={u.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-tr from-slate-800 to-slate-700 text-[9px] font-bold text-slate-200">
                      {u.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
              {remainingCount > 0 && (
                <div className="relative inline-flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-slate-900 bg-slate-800 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                  +{remainingCount}
                </div>
              )}
            </div>

            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
          </div>
        </div>
      </motion.div>

      {/* Realtime Team Modal */}
      <OnlineTeamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onlineUsers={onlineUsers}
        isConnected={isConnected}
      />
    </>
  );
};
