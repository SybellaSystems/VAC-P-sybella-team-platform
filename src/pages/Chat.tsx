import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Hash, MessageSquare, Plus, Search, MoreVertical, Paperclip, Smile } from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { UserRole } from '../types';

interface Message {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export default function Chat({ user }: { user: { name: string; role: UserRole; id?: string } }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) return;

    // Fetch existing messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (data) setMessages(data);
      setLoading(false);
      scrollToBottom();
    };

    fetchMessages();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !supabase) return;

    const { error } = await supabase.from('messages').insert([
      {
        user_id: user.id || 'anonymous',
        user_name: user.name,
        content: newMessage.trim(),
      },
    ]);

    if (error) {
       // Fallback for demo if table doesn't exist
       setMessages(prev => [...prev, {
         id: Math.random().toString(),
         user_id: user.id || 'anonymous',
         user_name: user.name,
         content: newMessage.trim(),
         created_at: new Date().toISOString()
       }]);
    }
    
    setNewMessage('');
  };

  return (
    <div className="h-[calc(100vh-160px)] flex gap-6">
      {/* Sidebar - Channels/Directs */}
      <div className="w-80 flex flex-col gap-6">
        <div className="p-6 bg-[#0F1219] border border-white/10 rounded-[32px] flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white tracking-tight uppercase italic">Channels</h2>
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <Plus className="w-4 h-4 text-white/40" />
            </button>
          </div>
          
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input 
              type="text" 
              placeholder="Search conversations..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div className="space-y-1 overflow-y-auto">
            {['announcements', 'engineering', 'operations', 'design-system'].map((channel) => (
              <button 
                key={channel}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                  channel === 'announcements' ? "bg-blue-600/10 text-blue-500" : "text-white/40 hover:bg-white/5 hover:text-white"
                )}
              >
                <Hash className="w-4 h-4 opacity-50" />
                <span className="text-sm font-bold tracking-tight">{channel}</span>
                {channel === 'announcements' && <div className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full" />}
              </button>
            ))}
          </div>

          <div className="mt-auto pt-8 border-t border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Direct Messages</h3>
            </div>
            <div className="space-y-1">
              {[
                { name: 'Bessora Neema', active: true },
                { name: 'Kayla Elyse', active: true },
                { name: 'Eric Munyaneza', active: false },
              ].map((contact, i) => (
                <button key={i} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:bg-white/5 hover:text-white transition-all group">
                  <div className="relative">
                    <User className="w-4 h-4" />
                    {contact.active && <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full border-2 border-[#0F1219]" />}
                  </div>
                  <span className="text-sm font-bold tracking-tight">{contact.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-[#0F1219] border border-white/10 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center">
              <Hash className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-white font-bold tracking-tight">announcements</h3>
              <p className="text-[10px] uppercase tracking-widest text-white/20 font-black">Official network-wide broadcasts</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-white/20 hover:text-white transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 text-white/20 hover:text-white transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
              Syncing Ledger...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
               <MessageSquare className="w-12 h-12 text-white/5" />
               <p className="text-sm text-white/20 uppercase tracking-widest font-black italic">End of History. Begin Transmission.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex gap-4 max-w-[80%]",
                  msg.user_name === user.name ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  msg.user_name === user.name ? "bg-blue-600 text-white" : "bg-white/5 text-white/40"
                )}>
                  <User className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className={cn("flex items-center gap-2", msg.user_name === user.name ? "flex-row-reverse" : "")}>
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">{msg.user_name}</span>
                    <span className="text-[8px] text-white/20 font-mono">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed",
                    msg.user_name === user.name 
                      ? "bg-blue-600/10 text-blue-100 rounded-tr-none border border-blue-500/20 shadow-lg shadow-blue-500/10" 
                      : "bg-white/5 text-white/80 rounded-tl-none border border-white/10"
                  )}>
                    {msg.content}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="p-8 border-t border-white/5 bg-white/[0.01]">
          <form 
            onSubmit={handleSendMessage}
            className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-2 pl-6 focus-within:border-blue-500/50 transition-all"
          >
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Transmit secure message..."
              className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none font-medium placeholder:text-white/10"
            />
            <div className="flex items-center gap-2 px-2">
               <button type="button" className="p-2 text-white/20 hover:text-white transition-colors">
                  <Paperclip className="w-5 h-5" />
               </button>
               <button type="button" className="p-2 text-white/20 hover:text-white transition-colors">
                  <Smile className="w-5 h-5" />
               </button>
               <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
               >
                 <Send className="w-4 h-4" />
               </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
