import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Clock, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>('default');
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushStatus(Notification.permission);
    }
  }, [isOpen]);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res;
    },
    refetchInterval: 30000,
  });

  const notifications = data?.data || [];
  const unreadCount = data?.unreadCount || 0;

  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markSingleReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notif: any) => {
    if (!notif.is_read) {
      markSingleReadMutation.mutate(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-pu-gold/30"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-pu-red text-[10px] font-extrabold text-white shadow-sm shadow-red-500/50 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl glass-dark border border-white/20 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pu-gold/20 text-pu-gold border border-pu-gold/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-pu-gold hover:underline flex items-center gap-1 font-semibold"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No notifications right now.
              </div>
            ) : (
              notifications.map((notif: any) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 hover:bg-white/5 transition-colors cursor-pointer flex items-start gap-3 ${
                    !notif.is_read ? 'bg-white/[0.04]' : 'opacity-70'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-pu-gold/10 text-pu-gold shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className="text-xs font-bold text-white truncate">
                        {notif.title}
                      </h5>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(notif.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Web Push Management Footer */}
          <div className="p-3 bg-black/40 border-t border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className={`inline-block w-2 h-2 rounded-full ${
                pushStatus === 'granted' ? 'bg-emerald-400 animate-pulse' : pushStatus === 'denied' ? 'bg-rose-400' : 'bg-amber-400'
              }`} />
              <span className="text-[11px] font-medium">
                {pushStatus === 'granted' ? 'Push Alerts Active' : pushStatus === 'denied' ? 'Push Blocked in Browser' : 'Push Alerts Disabled'}
              </span>
            </div>

            {pushStatus === 'granted' ? (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsTestingPush(true);
                  const { sendTestPush } = await import('../../lib/push');
                  await sendTestPush();
                  setIsTestingPush(false);
                }}
                disabled={isTestingPush}
                className="text-[11px] font-semibold text-pu-gold hover:text-yellow-300 transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md border border-white/10"
              >
                {isTestingPush ? 'Sending...' : 'Send Test Push'}
              </button>
            ) : pushStatus === 'denied' ? (
              <span className="text-[10px] text-slate-500">Enable in URL bar</span>
            ) : (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsEnablingPush(true);
                  const { subscribeToPush } = await import('../../lib/push');
                  const res = await subscribeToPush();
                  if (res.success) {
                    setPushStatus('granted');
                  }
                  setIsEnablingPush(false);
                }}
                disabled={isEnablingPush}
                className="text-[11px] font-bold text-white bg-pu-red hover:bg-red-700 transition-colors px-2.5 py-1 rounded-md shadow-sm"
              >
                {isEnablingPush ? 'Enabling...' : 'Enable Alerts'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
