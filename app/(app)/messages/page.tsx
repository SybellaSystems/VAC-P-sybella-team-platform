'use client';

import { useEffect, useState, useRef } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Channel, Message, Profile } from '@/lib/database.types';
import { Send, Hash, Plus, Search, TriangleAlert as AlertTriangle, X } from 'lucide-react';
import { logAudit } from '@/lib/audit';

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

  useEffect(() => {
    loadChannels();
    loadMembers();
  }, []);

  useEffect(() => {
    if (activeChannel) {
      loadMessages(activeChannel.id);
      const sub = supabase
        .channel(`messages:${activeChannel.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${activeChannel.id}` }, async (payload) => {
          const nm = payload.new as Message;
          let sender: Profile | undefined = members[nm.sender_id];
          if (!sender) {
            const { data: p } = await supabase.from('profiles').select('*').eq('id', nm.sender_id).maybeSingle();
            if (p) {
              sender = p as Profile;
              setMembers((prev) => ({ ...prev, [sender!.id]: sender! }));
            }
          }
          setMessages((prev) => [...prev, { ...nm, sender }]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        })
        .subscribe();
      return () => { supabase.removeChannel(sub); };
    }
  }, [activeChannel]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [messages]);

  const loadChannels = async () => {
    const { data } = await supabase.from('channels').select('*').order('name');
    const ch = (data as Channel[]) || [];
    setChannels(ch);
    if (ch.length > 0 && !activeChannel) setActiveChannel(ch[0]);
  };

  const loadMembers = async () => {
    const { data } = await supabase.from('profiles').select('*');
    const map: Record<string, Profile> = {};
    (data as Profile[] || []).forEach(p => { map[p.id] = p; });
    setMembers(map);
  };

  const resolveAssigneeFromToken = (token: string, list: Profile[]): string | null => {
    const raw = token.replace(/^@/, '').trim().toLowerCase();
    if (!raw) return null;
    const strip = (s: string) => s.toLowerCase().replace(/\s+/g, '');
    const hit = list.find((p) => {
      const emailLocal = (p.email || '').split('@')[0]?.toLowerCase();
      return (
        emailLocal === raw ||
        strip(p.full_name || '') === strip(raw) ||
        (p.full_name || '').toLowerCase().includes(raw)
      );
    });
    return hit?.id ?? null;
  };

  const createTasksFromMessageContent = async (content: string, channelName: string) => {
    if (!profile) return;
    const team = Object.values(members);
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      const arrow = trimmed.match(/^(?:->|→)\s*(.+)$/);
      if (!arrow) continue;
      let rest = arrow[1].trim();
      let assignee: string | null = null;
      const mentionMatch = rest.match(/@([\w.-]+)/);
      if (mentionMatch) {
        assignee = resolveAssigneeFromToken(mentionMatch[0], team);
        rest = rest.replace(/@[\w.-]+/, '').trim();
      }
      if (!rest) continue;
      const { data: created, error } = await supabase
        .from('tasks')
        .insert({
          title: rest.slice(0, 500),
          description: `Created from message in #${channelName}`,
          assigned_to: assignee,
          created_by: profile.id,
          status: 'todo',
          project_id: null,
        })
        .select('id')
        .maybeSingle();
      if (!error && created?.id) {
        await logAudit({
          event_type: 'task.created_from_message',
          entity_type: 'task',
          entity_id: created.id,
          action: 'insert',
          details: trimmed.slice(0, 240),
        });
      }
    }
  };

  const loadMessages = async (channelId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(200);
    const list = (data as Message[]) || [];
    const senderIds = Array.from(new Set(list.map((m) => m.sender_id)));
    let map: Record<string, Profile> = { ...members };
    if (senderIds.length) {
      const { data: rows } = await supabase.from('profiles').select('*').in('id', senderIds);
      (rows as Profile[] | null)?.forEach((p) => {
        map[p.id] = p;
      });
      setMembers((prev) => {
        const n = { ...prev };
        (rows as Profile[] | null)?.forEach((p) => {
          n[p.id] = p;
        });
        return n;
      });
    }
    setMessages(
      list.map((m) => ({
        ...m,
        sender: map[m.sender_id],
      }))
    );
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeChannel || !profile) return;
    setSending(true);
    const body = input.trim();
    await supabase.from('messages').insert({
      channel_id: activeChannel.id,
      sender_id: profile.id,
      content: body,
      message_type: msgType,
    });
    await createTasksFromMessageContent(body, activeChannel.name);
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
    <div className="flex flex-col h-full">
      <TopBar title="Messages" subtitle="Team Communication" />
      <div className="flex flex-1 overflow-hidden min-h-0 h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-4rem)]">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-border flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search channels..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted rounded-lg outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Channels</p>
            {filteredChannels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  activeChannel?.id === ch.id
                    ? 'bg-primary/8 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Hash size={13} className="flex-shrink-0" />
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeChannel ? (
            <>
              {/* Channel header */}
              <div className="px-5 py-3 bg-white border-b border-border flex items-center gap-3">
                <Hash size={16} className="text-muted-foreground" />
                <div>
                  <p className="font-semibold text-foreground text-sm">{activeChannel.name}</p>
                  <p className="text-xs text-muted-foreground">{activeChannel.description}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-4 bg-slate-50">
                {groupedMessages().map(({ date, messages: dayMsgs }) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-muted-foreground font-medium px-2 bg-background rounded-full border border-border">{date}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="space-y-3">
                      {dayMsgs.map((msg, i) => {
                        const sender = msg.sender || members[msg.sender_id];
                        const isOwn = msg.sender_id === profile?.id;
                        const displayName = isOwn ? 'You' : sender?.full_name?.trim() || 'Team member';
                        const roleLabel = !isOwn && sender?.role ? sender.role.replace('_', ' ') : '';
                        const prevMsg = i > 0 ? dayMsgs[i - 1] : null;
                        const showHeader = !prevMsg || prevMsg.sender_id !== msg.sender_id;

                        return (
                          <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                            {showHeader && !isOwn && (
                              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5 ring-2 ring-white shadow-sm">
                                <span className="text-white text-xs font-bold">
                                  {sender?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'}
                                </span>
                              </div>
                            )}
                            {!showHeader && !isOwn && <div className="w-9 flex-shrink-0" />}
                            <div className={`max-w-[min(100%,28rem)] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                              {showHeader && (
                                <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-0 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-xs font-semibold text-foreground">{displayName}</span>
                                  {roleLabel ? (
                                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-white px-1.5 py-0.5 rounded border border-border">
                                      {roleLabel}
                                    </span>
                                  ) : null}
                                  <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                                </div>
                              )}
                              <div className={`px-3.5 py-2 rounded-2xl text-sm ${
                                isOwn
                                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                  : `bg-white border border-border rounded-tl-sm ${msgTypeColors[msg.message_type]}`
                              }`}>
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

              {/* Input */}
              <div className="px-5 py-3 bg-white border-t border-border">
                {msgType !== 'text' && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2 text-xs font-semibold ${msgType === 'escalation' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                    <AlertTriangle size={12} />
                    <span>{msgType === 'escalation' ? 'Escalation message' : 'Report message'}</span>
                    <button onClick={() => setMsgType('text')} className="ml-auto"><X size={12} /></button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setMsgType(msgType === 'report' ? 'text' : 'report')}
                      title="Send as report"
                      className={`p-2 rounded-lg transition-colors text-xs ${msgType === 'report' ? 'bg-blue-100 text-blue-600' : 'hover:bg-muted text-muted-foreground'}`}
                    >
                      R
                    </button>
                    <button
                      onClick={() => setMsgType(msgType === 'escalation' ? 'text' : 'escalation')}
                      title="Send as escalation"
                      className={`p-2 rounded-lg transition-colors ${msgType === 'escalation' ? 'bg-red-100 text-red-600' : 'hover:bg-muted text-muted-foreground'}`}
                    >
                      <AlertTriangle size={15} />
                    </button>
                  </div>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={`Message #${activeChannel.name}...`}
                    rows={1}
                    className="flex-1 px-4 py-2.5 text-sm border border-input rounded-xl bg-muted/30 outline-none focus:ring-2 focus:ring-primary resize-none"
                    style={{ minHeight: 42, maxHeight: 120 }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !input.trim()}
                    className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-50 hover:bg-primary/90 transition-colors flex-shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Press Enter to send, Shift+Enter for new line. Start a line with <kbd className="px-1 rounded bg-muted">-&gt;</kbd> or{' '}
                  <kbd className="px-1 rounded bg-muted">→</kbd> to create a task; add <kbd className="px-1 rounded bg-muted">@name</kbd> to assign.
                </p>
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
