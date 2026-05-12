import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ShieldAlert, 
  Clock, 
  Trash2, 
  Settings,
  MoreHorizontal
} from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { UserRole } from '../types';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  created_at: string;
  read: boolean;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([
    { 
      id: '1', 
      title: 'Security Protocol Updated', 
      message: 'Network-wide MFA enforcement is now active for all administrative accounts.',
      type: 'ALERT',
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15m ago
      read: false
    },
    { 
      id: '2', 
      title: 'Ogera Deployment Successful', 
      message: 'Version 2.4.1 has been successfully merged and deployed to production nodes.',
      type: 'SUCCESS',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h ago
      read: false
    },
    { 
      id: '3', 
      title: 'Database Maintenance', 
      message: 'Scheduled backup and optimization cycle will commence at 02:00 UTC.',
      type: 'INFO',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5h ago
      read: true
    },
    { 
      id: '4', 
      title: 'Anomaly Detected', 
      message: 'Multiple failed login attempts detected from unrecognized IP range in Nairobi.',
      type: 'WARNING',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1d ago
      read: true
    }
  ]);

  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) return;

    // In a real app, subscribe to a 'notifications' table
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ALERT': return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case 'WARNING': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'SUCCESS': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">System Telemetry</div>
          <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase italic">
            Notifications
          </h1>
        </div>

        <div className="flex items-center gap-4">
           <button 
            onClick={markAllRead}
            className="px-6 py-2.5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 transition-all"
           >
             Mark All Read
           </button>
           <button className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all">
             <Settings className="w-5 h-5" />
           </button>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {notifications.map((notification) => (
            <motion.div 
              key={notification.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`group p-6 bg-[#0F1219] border rounded-[32px] transition-all relative overflow-hidden ${
                notification.read ? 'border-white/5 opacity-60' : 'border-white/10 shadow-xl'
              }`}
            >
              {!notification.read && (
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
              )}
              
              <div className="flex gap-6 items-start">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  notification.read ? 'bg-white/5' : 'bg-white/10'
                }`}>
                  {getIcon(notification.type)}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-bold tracking-tight ${notification.read ? 'text-white/60' : 'text-white'}`}>
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/20">
                      <Clock className="w-3 h-3" />
                      {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <p className="text-sm text-white/40 leading-relaxed pr-10">
                    {notification.message}
                  </p>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-white/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-white/20 hover:text-white transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {notifications.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
             <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                <Bell className="w-8 h-8 text-white/10" />
             </div>
             <p className="text-sm text-white/20 uppercase tracking-widest font-black italic">The silence of a perfect system.</p>
          </div>
        )}
      </div>
    </div>
  );
}
