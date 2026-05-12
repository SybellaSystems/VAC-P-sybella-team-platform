import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  AlertTriangle, 
  Activity, 
  Terminal,
  Zap,
  Globe,
  Database,
  Cpu,
  History,
  Workflow
} from 'lucide-react';
import { cn } from '../lib/utils';

const PROTOCOLS = [
  { 
    id: 'P-101', 
    name: 'Ghost Management', 
    status: 'ACTIVE', 
    trust: 99.8, 
    description: 'Autonomous decision-making protocol for resource allocation when C-level presence is < 5%.',
    icon: Eye 
  },
  { 
    id: 'P-302', 
    name: 'Entropy Wall', 
    status: 'ACTIVE', 
    trust: 100, 
    description: 'Dynamic firewall that restructures data topology every 400ms to prevent pattern discovery.',
    icon: Lock 
  },
  { 
    id: 'P-009', 
    name: 'Neural Continuity', 
    status: 'OPTIMIZING', 
    trust: 94.2, 
    description: 'Simulates executive decision-making based on 4 years of historical behavior patterns.',
    icon: Cpu 
  },
  { 
    id: 'P-777', 
    name: 'Asset Sanitization', 
    status: 'STANDBY', 
    trust: 88.5, 
    description: 'Emergency liquidation and data purging in the event of physically compromised hardware.',
    icon: ShieldCheck 
  },
];

const LOGS = [
  { time: '14:22:04', event: 'Ghost Protocol active: CEO offline detected', status: 'INITIATED' },
  { time: '14:23:12', event: 'Allocating 4.2M Credits to Infrastructure Grid 4', status: 'SUCCESS' },
  { time: '14:24:45', event: 'Neural behavior check: Match 98.4%', status: 'VERIFIED' },
  { time: '14:25:00', event: 'Rotating entropy salt for Asset Ledger', status: 'ACTIVE' },
];

export default function Protocols() {
  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">Autonomous Continuity Layer</span>
          </div>
          <h1 className="text-5xl font-light text-white tracking-tighter uppercase italic">
            System <span className="font-black text-blue-500">Protocols</span>
          </h1>
        </div>
        
        <div className="p-4 bg-blue-600/5 border border-blue-500/20 rounded-2xl flex items-center gap-4">
           <Activity className="w-6 h-6 text-blue-500 animate-pulse" />
           <div>
              <div className="text-[8px] font-black uppercase text-blue-500/60 tracking-widest">Global Integrity</div>
              <div className="text-sm font-mono font-bold text-white uppercase italic">97.8% Confirmed</div>
           </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="grid md:grid-cols-2 gap-6">
             {PROTOCOLS.map((p, i) => (
               <motion.div 
                 key={p.id}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: i * 0.1 }}
                 className="p-8 bg-[#11141B] border border-white/10 rounded-[32px] group hover:border-blue-500/30 transition-all"
               >
                 <div className="flex justify-between items-start mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                       <p.icon className="w-6 h-6" />
                    </div>
                    <div className="text-right">
                       <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">{p.id}</div>
                       <div className={cn("text-[10px] font-black uppercase tracking-widest", p.status === 'ACTIVE' ? 'text-green-500' : 'text-orange-500')}>
                          {p.status}
                       </div>
                    </div>
                 </div>

                 <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase mb-4 group-hover:text-blue-500 transition-colors">
                    {p.name}
                 </h3>
                 <p className="text-sm text-white/40 leading-relaxed font-medium mb-8">
                    {p.description}
                 </p>

                 <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase text-white/20">
                       <span>Autonomous Trust Factor</span>
                       <span>{p.trust}%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500" style={{ width: `${p.trust}%` }} />
                    </div>
                 </div>
               </motion.div>
             ))}
           </div>

           {/* Mission Continuity Log */}
           <div className="bg-[#11141B] border border-white/10 rounded-[40px] p-8 space-y-8">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <History className="w-5 h-5 text-blue-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/60 italic">Mission Continuity Log</h3>
                 </div>
                 <button className="text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors">Export Ledger</button>
              </div>

              <div className="space-y-4">
                 {LOGS.map((log, i) => (
                   <div key={i} className="flex items-center gap-4 py-4 border-b border-white/5 last:border-0 group">
                      <span className="text-[10px] font-mono text-white/20">{log.time}</span>
                      <div className="flex-1 text-[11px] font-bold text-white/60 group-hover:text-white transition-colors">{log.event}</div>
                      <span className={cn("text-[9px] font-black uppercase tracking-widest", log.status === 'SUCCESS' || log.status === 'VERIFIED' ? 'text-green-500' : 'text-blue-500')}>
                         {log.status}
                      </span>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                 <Workflow className="w-4 h-4 text-blue-500" />
                 <h3 className="text-xs font-black tracking-widest uppercase text-white/60 italic">Decision Engine</h3>
              </div>
              <p className="text-[11px] font-medium text-white/40 leading-relaxed">
                 Configure the thresholds for automated operational overrides when key stakeholders are unavailable for &gt; 12 hours.
              </p>
              
              <div className="space-y-4">
                 {[
                    { label: 'Fiscal Override Limit', val: '4.5M USD' },
                    { label: 'Infrastructure Auto-Scaling', val: '120 Nodes' },
                    { label: 'Hiring Pipeline Velocity', val: '0.4x Boost' },
                 ].map((d, i) => (
                   <div key={i} className="p-4 bg-black/40 rounded-2xl border border-white/5">
                      <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">{d.label}</div>
                      <div className="text-sm font-black text-white italic">{d.val}</div>
                   </div>
                 ))}
              </div>

              <button className="w-full py-4 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white mt-4 shadow-xl shadow-blue-900/20 active:scale-95 transition-all">
                 Update Directives
              </button>
           </div>

           <div className="p-8 bg-red-500/5 border border-red-500/20 rounded-[40px] flex flex-col gap-4">
              <div className="flex items-center gap-3">
                 <AlertTriangle className="w-5 h-5 text-red-500" />
                 <span className="text-[10px] font-black uppercase text-red-500 tracking-widest">Compromise Alert</span>
              </div>
              <p className="text-[11px] font-bold text-red-200/40 uppercase italic leading-tight">
                 Emergency Lockdown Protocol P-404 is ARMED. Manual input required to disengage.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
