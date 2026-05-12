import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  MessageSquare, 
  Repeat, 
  Heart, 
  Share, 
  MoreHorizontal,
  Bot,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserRole } from '../types';

interface Directive {
  id: string;
  author: string;
  role: string;
  content: string;
  timestamp: string;
  type: 'AI' | 'HUMAN' | 'SYSTEM';
  metrics?: { label: string; value: string };
  interactions: { signals: number; repeats: number; efficiency: number };
}

const INITIAL_DIRECTIVES: Directive[] = [
  {
    id: '1',
    author: 'Sybella Alpha-1',
    role: 'Autonomous Core',
    content: 'Optimizing regional server distribution. Detected 14% latency spike in Northern sectors. Routing traffic through secondary mesh.',
    timestamp: '2m',
    type: 'AI',
    metrics: { label: 'LATENCY', value: '14ms' },
    interactions: { signals: 24, repeats: 5, efficiency: 98 }
  },
  {
    id: '2',
    author: 'Dr. Elias Sybella',
    role: 'Lead Architect',
    content: 'All teams: The VAC-P 2.0 migration is locked for Saturday 04:00. Ensure all workspace modules are checked for RLS integrity.',
    timestamp: '1h',
    type: 'HUMAN',
    interactions: { signals: 142, repeats: 42, efficiency: 100 }
  },
  {
    id: '3',
    author: 'Fiscal Sentinel',
    role: 'System Protocol',
    content: 'Daily burn rate optimized. Autonomous procurement paused for non-essential hardware units based on Q4 projections.',
    timestamp: '3h',
    type: 'SYSTEM',
    metrics: { label: 'BURN_RED', value: '2.4%' },
    interactions: { signals: 56, repeats: 12, efficiency: 94 }
  }
];

export default function Dashboard({ user }: { user: any }) {
  const [directives, setDirectives] = useState<Directive[]>(INITIAL_DIRECTIVES);
  const [newDirective, setNewDirective] = useState('');

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDirective.trim()) return;

    const directive: Directive = {
      id: Date.now().toString(),
      author: user.name,
      role: user.role.replace('_', ' '),
      content: newDirective,
      timestamp: 'Just now',
      type: 'HUMAN',
      interactions: { signals: 0, repeats: 0, efficiency: 0 }
    };

    setDirectives([directive, ...directives]);
    setNewDirective('');
  };

  return (
    <div className="max-w-5xl mx-auto flex gap-8">
      {/* Main Feed */}
      <div className="flex-1 space-y-6">
        {/* Publisher */}
        <div className="p-6 bg-[#11141B] border border-white/10 rounded-3xl shadow-2xl">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <form onSubmit={handlePublish} className="flex-1 space-y-4">
              <textarea 
                value={newDirective}
                onChange={(e) => setNewDirective(e.target.value)}
                placeholder="Issue a new organizational directive..."
                className="w-full bg-transparent border-none outline-none text-white text-lg placeholder:text-white/20 resize-none h-24"
              />
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div className="flex gap-4 text-blue-500">
                   <ShieldCheck className="w-4 h-4 cursor-pointer hover:text-blue-400" />
                   <TrendingUp className="w-4 h-4 cursor-pointer hover:text-blue-400" />
                   <AlertCircle className="w-4 h-4 cursor-pointer hover:text-blue-400" />
                </div>
                <button 
                  type="submit"
                  disabled={!newDirective.trim()}
                  className="px-6 py-2 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-full hover:bg-blue-500 transition-all disabled:opacity-50"
                >
                  Publish Directive
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Directives Stream */}
        <div className="space-y-4">
          <AnimatePresence>
            {directives.map((item) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-6 bg-[#11141B] border border-white/10 rounded-3xl hover:border-white/20 transition-all group"
              >
                <div className="flex gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                    item.type === 'AI' ? "bg-purple-600/20 text-purple-500 border border-purple-500/30" : 
                    item.type === 'SYSTEM' ? "bg-orange-600/20 text-orange-500 border border-orange-500/30" :
                    "bg-blue-600 text-white"
                  )}>
                    {item.type === 'AI' ? <Bot className="w-5 h-5" /> : 
                     item.type === 'SYSTEM' ? <ShieldCheck className="w-5 h-5" /> : 
                     <Zap className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                          <span className="font-black text-white italic mr-2">{item.author}</span>
                          <span className="text-[10px] uppercase font-black tracking-widest text-white/30">{item.role}</span>
                       </div>
                       <span className="text-[10px] font-mono text-white/20">{item.timestamp}</span>
                    </div>
                    
                    <p className="text-white/80 leading-relaxed mb-4">{item.content}</p>

                    {item.metrics && (
                      <div className="inline-flex items-center gap-4 px-4 py-2 bg-black/40 border border-white/5 rounded-xl mb-4">
                        <div className="text-[9px] font-black uppercase tracking-widest text-white/30">{item.metrics.label}:</div>
                        <div className="text-xs font-mono font-bold text-blue-500">{item.metrics.value}</div>
                      </div>
                    )}

                    <div className="flex items-center gap-8 text-white/30">
                       <button className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-[10px] font-bold">{item.interactions.signals} Signal</span>
                       </button>
                       <button className="flex items-center gap-2 hover:text-green-500 transition-colors">
                          <Repeat className="w-4 h-4" />
                          <span className="text-[10px] font-bold">{item.interactions.repeats} Redraw</span>
                       </button>
                       <button className="flex items-center gap-2 hover:text-red-500 transition-colors">
                          <Heart className="w-4 h-4" />
                          <span className="text-[10px] font-bold">{item.interactions.efficiency}% Eff.</span>
                       </button>
                       <button className="hover:text-white transition-colors ml-auto">
                          <Share className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Sidebar - Trending/Stats */}
      <div className="hidden lg:block w-80 space-y-6">
        <div className="p-6 bg-[#11141B] border border-white/10 rounded-3xl space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Market Trends</h3>
          <div className="space-y-4">
            {[
              { label: 'Cloud Infrastructure', trend: 'Bullish', val: '+$4.2M' },
              { label: 'AI Compute Cost', trend: 'Trending', val: '2.44% p.a.' },
              { label: 'Security Breach Delta', trend: 'Critical', val: '0 incidents' },
            ].map((trend, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">{trend.trend}</div>
                <div className="text-sm font-bold text-white group-hover:text-blue-500 transition-colors">{trend.label}</div>
                <div className="text-[10px] font-mono text-white/40">{trend.val} Action Units</div>
              </div>
            ))}
          </div>
          <button className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:underline">Show Intelligence Report</button>
        </div>

        <div className="p-6 bg-[#11141B] border border-white/10 rounded-3xl">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-6">Operational Continuity</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-white/60 font-bold uppercase">Uptime</span>
              <span className="text-[10px] font-mono text-green-500 font-bold">99.999%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 w-[99%]" />
            </div>
            <div className="pt-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Autonomous Protocols Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
