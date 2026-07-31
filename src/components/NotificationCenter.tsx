import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getUserNotifications, 
  fetchUserNotificationsFromFirestore,
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  clearUserNotifications, 
  NOTIFICATION_EVENT 
} from '../lib/notifications';
import { AppNotification } from '../types';
import { Bell, Heart, MessageSquare, Star, Sparkles, Check, Trash2, X } from 'lucide-react';

interface NotificationCenterProps {
  onSelectArtwork?: (artId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onSelectArtwork }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeUserId = user?.uid || 'guest';

  const loadNotifs = async () => {
    if (user?.uid) {
      const list = await fetchUserNotificationsFromFirestore(user.uid);
      setNotifications(list);
    } else {
      const list = getUserNotifications('guest');
      setNotifications(list);
    }
  };

  useEffect(() => {
    loadNotifs();

    const handleUpdate = () => {
      loadNotifs();
    };

    window.addEventListener(NOTIFICATION_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(NOTIFICATION_EVENT, handleUpdate);
    };
  }, [activeUserId]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead(activeUserId);
    loadNotifs();
  };

  const handleClearAll = () => {
    clearUserNotifications(activeUserId);
    loadNotifs();
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.read) {
      markNotificationAsRead(notif.id);
      loadNotifs();
    }
    if (notif.artId && onSelectArtwork) {
      onSelectArtwork(notif.artId);
      setIsOpen(false);
    }
  };

  const formatTimeAgo = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSecs < 60) return 'الآن';
      if (diffSecs < 3600) return `منذ ${Math.floor(diffSecs / 60)} دقيقة`;
      if (diffSecs < 86400) return `منذ ${Math.floor(diffSecs / 3600)} ساعة`;
      return `منذ ${Math.floor(diffSecs / 86400)} يوم`;
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center shadow-sm"
        title="الإشعارات"
      >
        <Bell className="w-5 h-5 text-slate-700 dark:text-slate-200" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-[var(--bg-card)] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-80 sm:w-96 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-2xl z-50 overflow-hidden transition-all duration-200 animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-[var(--border-card)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[var(--color-primary)]" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-serif">
                مركز الإشعارات
              </h3>
              {unreadCount > 0 && (
                <span className="text-xs bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} جديد
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="p-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                  title="تحديد الكل كقراءة"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline text-[11px]">قراءة الكل</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="p-1.5 text-xs text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="مسح الكل"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-medium">لا توجد إشعارات حالية</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  ستظهر هنا التفاعلات والإعجابات والتعليقات على الأعمال الفنية.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                let notifIcon = <Sparkles className="w-4 h-4 text-amber-500" />;
                if (notif.type === 'like') {
                  notifIcon = <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />;
                } else if (notif.type === 'comment') {
                  notifIcon = <MessageSquare className="w-4 h-4 text-blue-500 fill-blue-500/20" />;
                } else if (notif.type === 'rating') {
                  notifIcon = <Star className="w-4 h-4 text-amber-400 fill-amber-400" />;
                }

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex items-start gap-3 relative ${
                      !notif.read ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                    }`}
                  >
                    {!notif.read && (
                      <span className="absolute top-4 right-2 w-2 h-2 rounded-full bg-rose-500" />
                    )}

                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                      {notifIcon}
                    </div>

                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {notif.message}
                      </p>

                      {notif.artTitle && (
                        <span className="inline-block mt-1 text-[11px] font-semibold text-[var(--color-primary)] truncate max-w-full">
                          🖼️ {notif.artTitle}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
