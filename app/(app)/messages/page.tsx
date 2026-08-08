'use client';

import { useEffect, useState, useRef } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Channel, Message, Profile } from '@/lib/database.types';
import { Send, Hash, Search, TriangleAlert as AlertTriangle, X, ChevronDown } from 'lucide-react';

export default function MessagesPage() {
  const { profile } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Record<string, Profile>>({});
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [msgType, setMsgType] = useState<'text' | 'report' | 'escalation'>('text');
  const bottomRef = useRef<HTMLDivElement>(null);

  const [showChannelList, setShowChannelList] = useState(false);

  useEffect(() => {
    loadChannels();
    loadMembers();
  }, [profile?.id]);

  useEffect(() => {
    if (activeChannel) {
      loadMessages(activeChannel.id);
      const sub = supabase
        .channel(`messages:${activeChannel.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${activeChannel.id}` },
          payload => {
            setMessages(prev => [...prev, payload.new as Message]);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(sub);
      };
    }
  }, [activeChannel]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [messages]);

  const loadChannels = async () => {
    if (!profile?.id) return;

    const [chanRes, memberRes] = await Promise.all([
      supabase
        .from('channels')
        .select('*, project:projects(id, name)')
        .order('name'),
      supabase
        .from('channel_members')
        .select('channel_id')
        .eq('member_id', profile.id),
    ]);

    if (chanRes.error) console.error('Error loading channels:', chanRes.error.message);
    if (memberRes.error) console.error('Error loading channel members:', memberRes.error.message);

    const ch = (chanRes.data as (Channel & { project?: { id: string; name: string } | null; type?: string })[]) || [];
    const memberChannelIds = new Set(((memberRes.data as { channel_id: string }[]) || []).map(m => m.channel_id));

    // Filter rules:
    // 1. Public channels are visible to everyone.
    // 2. Private channels require explicit membership in channel_members.
    const accessibleChannels = ch.filter(c => {
      if (c.type === 'public' || !c.type) return true;
      if (memberChannelIds.has(c.id)) return true;
      return false;
    });

    setChannels(accessibleChannels);
    if (accessibleChannels.length > 0 && !activeChannel) setActiveChannel(accessibleChannels[0]);
  };

  const loadMembers = async () => {
    const { data } = await supabase.from('profiles').select('*');
    const map: Record<string, Profile> = {};
    ((data as Profile[]) || []).forEach(p => {
      map[p.id] = p;
    });
    setMembers(map);
  };

  const loadMessages = async (channelId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(100);
    setMessages((data as Message[]) || []);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeChannel || !profile) return;
    setSending(true);
    await supabase.from('messages').insert({
      channel_id: activeChannel.id,
      sender_id: profile.id,
      content: input.trim(),
      message_type: msgType,
    });
    setInput('');
    setMsgType('text');
    setSending(false);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
  };

  const groupedMessages = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    messages.forEach(msg => {
      const date = formatDate(msg.created_at);
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.date !== date) {
        groups.push({ date, messages: [msg] });
      } else {
        lastGroup.messages.push(msg);
      }
    });
    return groups;
  };

  const filteredChannels = channels.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const msgTypeColors: Record<string, string> = {
    text: '',
    report: 'bg-blue-50 border-l-2 border-blue-500',
    escalation: 'bg-red-50 border-l-2 border-red-500',
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
      <TopBar title="Messages" subtitle="Team Communication" />

      <div className="flex flex-1 overflow-hidden p-2 sm:p-4 gap-3 sm:gap-4 relative">
        {/* Floating Sidebar - Desktop */}
        <div className="hidden md:flex w-64 bg-white/90 backdrop-blur-md border border-border shadow-md rounded-2xl flex-col flex-shrink-0 h-[calc(100vh-110px)] sticky top-0 overflow-hidden">
          <div className="p-3 border-b border-border bg-white/50">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search channels..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/60 rounded-xl outline-none focus:ring-1 focus:ring-primary border border-transparent focus:border-border transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5 custom-scrollbar">
            <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Channels
            </p>
            {filteredChannels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm transition-all ${
                  activeChannel?.id === ch.id
                    ? 'bg-primary text-primary-foreground font-medium shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                <Hash size={14} className="flex-shrink-0 opacity-70" />
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile channel list overlay */}
        {showChannelList && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" onClick={() => setShowChannelList(false)}>
            <div className="absolute left-3 top-3 bottom-3 w-72 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-border" onClick={e => e.stopPropagation()}>
              <div className="p-3.5 border-b border-border flex items-center justify-between bg-slate-50/50">
                <span className="text-sm font-semibold">Channels</span>
                <button onClick={() => setShowChannelList(false)} className="p-1 rounded-lg hover:bg-muted">
                  <X size={16} />
                </button>
              </div>
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search channels..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted rounded-xl outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
                {filteredChannels.map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setActiveChannel(ch);
                      setShowChannelList(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm transition-colors ${
                      activeChannel?.id === ch.id
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                  >
                    <Hash size={14} className="flex-shrink-0 opacity-70" />
                    <span className="truncate">{ch.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main chat window */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white border border-border shadow-xs rounded-2xl">
          {activeChannel ? (
            <>
              {/* Channel Header + Mobile Menu Selector */}
              <div className="bg-white border-b border-border flex flex-col">
                {/* Mobile Quick Channel Selector Dropdown (Above Title) */}
                <div className="md:hidden px-3 pt-2.5 pb-1 border-b border-border/50 bg-slate-50/80">
                  <div className="relative flex items-center">
                    <Hash size={13} className="absolute left-3 text-muted-foreground pointer-events-none" />
                    <select
                      value={activeChannel.id}
                      onChange={e => {
                        const selected = channels.find(c => c.id === e.target.value);
                        if (selected) setActiveChannel(selected);
                      }}
                      className="w-full appearance-none pl-8 pr-8 py-1.5 bg-white border border-border rounded-xl text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-primary"
                    >
                      {channels.map(ch => (
                        <option key={ch.id} value={ch.id}>
                          #{ch.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Main Channel Title */}
                <div className="px-4 sm:px-5 py-3 flex items-center gap-3">
                  <button onClick={() => setShowChannelList(true)} className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                    <Hash size={18} />
                  </button>
                  <Hash size={18} className="text-muted-foreground hidden md:block" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">{activeChannel.name}</p>
                    <p className="text-xs text-muted-foreground">{activeChannel.description}</p>
                  </div>
                </div>
              </div>

              {/* Messages viewport */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
                {groupedMessages().map(({ date, messages: dayMsgs }) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-muted-foreground font-medium px-2.5 py-0.5 bg-muted/40 rounded-full border border-border">
                        {date}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="space-y-3">
                      {dayMsgs.map((msg, i) => {
                        const sender = members[msg.sender_id];
                        const isOwn = msg.sender_id === profile?.id;
                        const prevMsg = i > 0 ? dayMsgs[i - 1] : null;
                        const showHeader = !prevMsg || prevMsg.sender_id !== msg.sender_id;

                        return (
                          <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                            {showHeader && !isOwn && (
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                                <span className="text-white text-xs font-bold">
                                  {sender?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                                </span>
                              </div>
                            )}
                            {!showHeader && !isOwn && <div className="w-8 flex-shrink-0" />}
                            <div className={`max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                              {showHeader && (
                                <div className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-xs font-semibold text-foreground">
                                    {isOwn ? 'You' : sender?.full_name || 'Unknown'}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                                </div>
                              )}
                              <div
                                className={`px-3.5 py-2 rounded-2xl text-sm ${
                                  isOwn
                                    ? 'bg-primary text-primary-foreground rounded-tr-xs shadow-xs'
                                    : `bg-slate-50 border border-border rounded-tl-xs ${msgTypeColors[msg.message_type]}`
                                }`}
                              >
                                {msg.message_type === 'escalation' && !isOwn && (
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <AlertTriangle size={12} className="text-red-500" />
                                    <span className="text-[10px] font-semibold text-red-600 uppercase">Escalation</span>
                                  </div>
                                )}
                                {msg.message_type === 'report' && !isOwn && (
                                  <div className="mb-1">
                                    <span className="text-[10px] font-semibold text-blue-600 uppercase">Report</span>
                                  </div>
                                )}
                                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Hash size={32} className="text-muted-foreground mb-3 opacity-30" />
                    <p className="text-muted-foreground text-sm">No messages yet in #{activeChannel.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Be the first to say something!</p>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Message Input */}
              <div className="px-4 sm:px-5 py-3 bg-white border-t border-border">
                {msgType !== 'text' && (
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl mb-2 text-xs font-semibold ${
                      msgType === 'escalation' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    <AlertTriangle size={12} />
                    <span>{msgType === 'escalation' ? 'Escalation message' : 'Report message'}</span>
                    <button onClick={() => setMsgType('text')} className="ml-auto">
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setMsgType(msgType === 'report' ? 'text' : 'report')}
                      title="Send as report"
                      className={`p-2 rounded-xl transition-colors text-xs font-bold ${
                        msgType === 'report' ? 'bg-blue-100 text-blue-600' : 'hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      R
                    </button>
                    <button
                      onClick={() => setMsgType(msgType === 'escalation' ? 'text' : 'escalation')}
                      title="Send as escalation"
                      className={`p-2 rounded-xl transition-colors ${
                        msgType === 'escalation' ? 'bg-red-100 text-red-600' : 'hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <AlertTriangle size={15} />
                    </button>
                  </div>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={`Message #${activeChannel.name}...`}
                    rows={1}
                    className="flex-1 px-4 py-2.5 text-sm border border-input rounded-xl bg-muted/30 outline-none focus:ring-2 focus:ring-primary resize-none"
                    style={{ minHeight: 42, maxHeight: 120 }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !input.trim()}
                    className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-50 hover:bg-primary/90 transition-colors flex-shrink-0 shadow-xs"
                  >
                    <Send size={16} />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">Press Enter to send, Shift+Enter for new line</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Hash size={40} className="text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground">Select a channel to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}