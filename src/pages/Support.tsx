import { motion } from 'motion/react';
import { MessageSquare, ShieldCheck, Clock, User, Filter, MoreHorizontal, Zap, Search } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Support() {
  const tickets = [
    { id: 'TKT-882', user: 'Eric M.', issue: 'SyCore™ API Timeout', priority: 'HIGH', status: 'OPEN', time: '12m ago' },
    { id: 'TKT-881', user: 'Aisha K.', issue: 'Ogera Login Loop', priority: 'MEDIUM', status: 'IN_PROGRESS', time: '1h ago' },
    { id: 'TKT-880', user: 'John D.', issue: 'Payment Gateway Delay', priority: 'URGENT', status: 'OPEN', time: '2m ago' },
    { id: 'TKT-879', user: 'Neema H.', issue: 'Profile Metadata Sync', priority: 'LOW', status: 'CLOSED', time: '5h ago' },
  ];

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">Global Resolution Nexus</span>
          </div>
          <h1 className="text-5xl font-light text-white tracking-tighter uppercase italic">
            Support <span className="font-black text-purple-500">Tickets</span>
          </h1>
        </div>
        
        <div className="flex gap-4">
           <div className="hidden md:flex items-center gap-3 bg-black/40 border border-white/5 px-4 h-12 rounded-2xl">
              <Search className="w-4 h-4 text-white/20" />
              <input type="text" placeholder="Search Tickets..." className="bg-transparent border-none outline-none text-xs text-white placeholder:text-white/20 w-48 font-mono" />
           </div>
           <button className="px-6 py-4 bg-purple-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 shadow-xl shadow-purple-900/20 active:scale-95 transition-all">
              Initialize Resolver
           </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 bg-[#11141B] border border-white/10 rounded-[40px] overflow-hidden">
           <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="flex gap-4">
                 {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map(filter => (
                   <button key={filter} className="text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors">{filter}</button>
                 ))}
              </div>
              <Filter className="w-4 h-4 text-white/20" />
           </div>

           <div className="divide-y divide-white/5">
              {tickets.map((ticket, i) => (
                <motion.div 
                  key={ticket.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-8 hover:bg-white/[0.02] transition-all flex items-center gap-8 group"
                >
                   <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                   <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{ticket.id}</span>
                         <span className={cn(
                           "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                           ticket.priority === 'URGENT' ? 'bg-red-500/10 text-red-500' : 
                           ticket.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'
                         )}>{ticket.priority}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-purple-500 transition-colors uppercase">{ticket.issue}</h4>
                   </div>

                   <div className="flex items-center gap-20">
                      <div className="flex items-center gap-4 w-40">
                         <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                            <User className="w-4 h-4" />
                         </div>
                         <span className="text-[10px] font-bold text-white/60 uppercase">{ticket.user}</span>
                      </div>
                      <div className="flex items-center gap-2 w-24">
                         <Clock className="w-3 h-3 text-white/20" />
                         <span className="text-[10px] font-mono text-white/20">{ticket.time}</span>
                      </div>
                      <button className="text-white/20 hover:text-white">
                         <MoreHorizontal className="w-4 h-4" />
                      </button>
                   </div>
                </motion.div>
              ))}
           </div>
        </div>

        <div className="space-y-8">
           <div className="p-8 bg-[#11141B] border border-white/10 rounded-[40px] space-y-8">
              <div className="space-y-2">
                 <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">Resolution Rate</div>
                 <div className="text-4xl font-black italic tracking-tighter text-white">99.4%</div>
              </div>
              <div className="space-y-2">
                 <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">Avg Pulse Time</div>
                 <div className="text-4xl font-black italic tracking-tighter text-white">1.8m</div>
              </div>
              <div className="pt-8 border-t border-white/5">
                 <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-purple-500" />
                    <span className="text-[10px] font-black uppercase text-white/40">AI Auto-Responder</span>
                 </div>
                 <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div animate={{ width: '85%' }} className="h-full bg-purple-500" />
                 </div>
              </div>
           </div>

           <div className="p-8 bg-purple-600 rounded-[40px] text-white space-y-4">
              <ShieldCheck className="w-8 h-8" />
              <div className="text-lg font-black italic tracking-tighter uppercase leading-none">Security <br/> Verification</div>
              <p className="text-[9px] font-bold text-purple-100 uppercase leading-normal opacity-60">All support interactions are recorded on the High-Integrity Ledger for compliance.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
