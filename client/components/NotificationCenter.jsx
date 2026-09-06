import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Trash2, ShoppingBag, Truck, Info, X, Zap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function NotificationCenter({ role = 'customer', phone = '', className = '' }) {
  const { isHindi } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  const prevUnreadRef = useRef(0);

  const fetchNotifications = async () => {
    try {
      let url = `/api/notifications?role=${role}`;
      if (phone) url += `&phone=${encodeURIComponent(phone)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const newUnread = data.unreadCount || 0;
        
        // Play audio chime sound if unread count increased
        if (newUnread > prevUnreadRef.current && prevUnreadRef.current !== 0) {
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch (e) {}
        }
        prevUnreadRef.current = newUnread;

        setNotifications(data.notifications || []);
        setUnreadCount(newUnread);
      }
    } catch (err) {
      console.warn("Notification polling error:", err);
    }
  };

  useEffect(() => {
    // For customers, only poll if they are logged in with a phone number
    if (role === 'customer' && !phone) return;

    fetchNotifications();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchNotifications();
      }
    }, 30000); // Smart 30s polling
    return () => clearInterval(interval);
  }, [role, phone]);

  // When user opens the dropdown, fetch immediately for fresh data
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, phone })
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkSingleRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all cursor-pointer flex items-center justify-center shadow-sm active:scale-95"
        title={isHindi ? "इन-ऐप लाइव सूचनाएं" : "In-App Live Notifications"}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto mt-2 w-[calc(100vw-1rem)] max-w-sm sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 text-slate-100 overflow-hidden animate-fade-in">
          
          {/* Panel Header */}
          <div className="p-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-slate-100 flex items-center gap-1.5">
                  <span>{isHindi ? "लाइव सूचनाएं" : "Live Notifications"}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {role.toUpperCase()}
                  </span>
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold">
                  {unreadCount > 0 
                    ? (isHindi ? `${unreadCount} अनपढ़ी सूचनाएं` : `${unreadCount} Unread Notifications`)
                    : (isHindi ? "सभी सूचनाएं पढ़ी जा चुकी हैं" : "All caught up!")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-400 hover:bg-slate-700 transition-all text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  title={isHindi ? "सभी को पढ़ा हुआ चिन्हित करें" : "Mark all as read"}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{isHindi ? "सब पढ़ें" : "Read All"}</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notifications List Body */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80 p-2 space-y-1.5">
            {notifications.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Info className="h-8 w-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400 font-semibold">
                  {isHindi ? "कोई नई सूचना उपलब्ध नहीं है।" : "No notifications yet."}
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isNew = !notif.isRead;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkSingleRead(notif.id)}
                    className={`p-3 rounded-xl transition-all cursor-pointer space-y-1.5 ${
                      isNew 
                        ? 'bg-cyan-950/50 border border-cyan-500/40 text-slate-100 hover:bg-cyan-900/40 shadow-sm' 
                        : 'bg-slate-800/40 text-slate-300 hover:bg-slate-800/80 border border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {notif.type === 'new_order' ? (
                          <ShoppingBag className="h-4 w-4 text-cyan-400 shrink-0" />
                        ) : notif.type === 'order_update' ? (
                          <Truck className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                        )}
                        <span className="text-xs font-bold leading-snug text-slate-100">
                          {isHindi ? notif.titleHi : notif.titleEn}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 shrink-0">
                        {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-200 leading-relaxed font-medium pl-6">
                      {isHindi ? notif.messageHi : notif.messageEn}
                    </p>

                    {notif.orderId && (
                      <div className="pl-6 pt-1 flex items-center justify-between">
                        <span className="text-[9.5px] font-mono text-cyan-300 font-bold bg-slate-950 px-2 py-0.5 rounded border border-cyan-500/40">
                          Order #{notif.orderId}
                        </span>
                        {isNew && (
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                            NEW
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-center text-[9px] font-mono text-slate-400 flex justify-between items-center px-4">
            <span>Swastik Real-Time Push Gateway</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active 5s Auto Sync
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
