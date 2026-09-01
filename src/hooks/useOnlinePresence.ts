import { useEffect, useState, useRef } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from '../components/AuthContext';
import { formatUserName } from '../utils/userNameFormatter';

export interface OnlineUser {
  uid: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  onlineAt: string;
}

export function useOnlinePresence() {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const userEmail = (user?.email || profile?.email || '').toLowerCase().trim();
    if (!userEmail) {
      setOnlineUsers([]);
      return;
    }

    const currentUserName = formatUserName(profile?.name, userEmail);
    const currentUserRole = profile?.role || 'Colaborador';
    const currentUserAvatar = profile?.avatarUrl || '';
    const currentUserUid = profile?.uid || user?.uid || userEmail;

    // Default immediate entry for current user
    const selfUser: OnlineUser = {
      uid: currentUserUid,
      name: currentUserName,
      email: userEmail,
      role: currentUserRole,
      avatarUrl: currentUserAvatar,
      onlineAt: new Date().toISOString()
    };

    setOnlineUsers([selfUser]);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsConnected(false);
      return;
    }

    try {
      const channel = supabase.channel('bahiaprev_online_team_presence', {
        config: {
          presence: {
            key: userEmail
          }
        }
      });

      channelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const userMap = new Map<string, OnlineUser>();

          // Process presence state from Supabase Realtime
          Object.entries(state).forEach(([key, presences]: [string, any]) => {
            if (Array.isArray(presences) && presences.length > 0) {
              const p = presences[0];
              const email = (p.email || key).toLowerCase().trim();
              if (email) {
                userMap.set(email, {
                  uid: p.uid || email,
                  name: formatUserName(p.name, email),
                  email: email,
                  role: p.role || 'Colaborador',
                  avatarUrl: p.avatarUrl || '',
                  onlineAt: p.onlineAt || new Date().toISOString()
                });
              }
            }
          });

          // Ensure current user is always included in the list
          if (!userMap.has(userEmail)) {
            userMap.set(userEmail, selfUser);
          }

          // Sort current user first, then alphabetically by name
          const list = Array.from(userMap.values()).sort((a, b) => {
            if (a.email === userEmail) return -1;
            if (b.email === userEmail) return 1;
            return a.name.localeCompare(b.name);
          });

          setOnlineUsers(list);
        })
        .on('presence', { event: 'join' }, ({ newPresences }: any) => {
          if (Array.isArray(newPresences)) {
            setOnlineUsers(prev => {
              const map = new Map(prev.map(u => [u.email.toLowerCase(), u]));
              newPresences.forEach(p => {
                const email = (p.email || '').toLowerCase().trim();
                if (email) {
                  map.set(email, {
                    uid: p.uid || email,
                    name: formatUserName(p.name, email),
                    email: email,
                    role: p.role || 'Colaborador',
                    avatarUrl: p.avatarUrl || '',
                    onlineAt: p.onlineAt || new Date().toISOString()
                  });
                }
              });
              const sortedList = (Array.from(map.values()) as OnlineUser[]).sort((a: OnlineUser, b: OnlineUser) => {
                if (a.email === userEmail) return -1;
                if (b.email === userEmail) return 1;
                return a.name.localeCompare(b.name);
              });
              return sortedList;
            });
          }
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
          if (Array.isArray(leftPresences)) {
            setOnlineUsers(prev => {
              const leftEmails = new Set(leftPresences.map(p => (p.email || '').toLowerCase().trim()));
              // Never remove current user even if leave event fires briefly
              return prev.filter(u => u.email === userEmail || !leftEmails.has(u.email));
            });
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            try {
              await channel.track({
                uid: currentUserUid,
                name: currentUserName,
                email: userEmail,
                role: currentUserRole,
                avatarUrl: currentUserAvatar,
                onlineAt: new Date().toISOString()
              });
            } catch (err) {
              console.warn('Erro ao registrar presença no Realtime:', err);
            }
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
          }
        });

      return () => {
        try {
          channel.untrack();
          supabase.removeChannel(channel);
        } catch {}
      };
    } catch (err) {
      console.warn('Falha ao inicializar presença Supabase:', err);
      setIsConnected(false);
    }
  }, [user?.email, profile?.name, profile?.role, profile?.avatarUrl, profile?.uid]);

  return {
    onlineUsers,
    onlineCount: onlineUsers.length,
    isConnected,
    isUserOnline: (email: string) => {
      const clean = (email || '').toLowerCase().trim();
      return onlineUsers.some(u => u.email === clean);
    }
  };
}
