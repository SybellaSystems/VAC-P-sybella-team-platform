import { motion } from 'motion/react';
import { GraduationCap, PlayCircle, BookOpen, Trophy, Zap, Terminal, Globe, Cpu } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Academy() {
  const courses = [
    { name: 'Sybella Architecture 101', duration: '4h', level: 'BEGINNER', progress: 100 },
    { name: 'Supabase RLS Hardening', duration: '6h', level: 'ADVANCED', progress: 45 },
    { name: 'African SaaS Dynamics', duration: '2h', level: 'INTERMEDIATE', progress: 0 },
  ];

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">Knowledge Transfer Protocol</span>
          </div>
          <h1 className="text-5xl font-light text-white tracking-tighter uppercase italic">
            Sybella <span className="font-black text-blue-400">Academy</span>
          </h1>
        </div>
        
        <div className="flex gap-4">
           <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-end">
              <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">XP Points</div>
              <div className="text-xl font-mono font-bold text-blue-400 italic">4,200</div>
           </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="p-8 bg-[#11141B] border border-white/10 rounded-[40px] space-y-8">
              <div className="flex items-center gap-3">
                 <BookOpen className="w-5 h-5 text-blue-400" />
                 <h3 className="text-xs font-black uppercase tracking-widest text-white/60 italic">Active Learning Modules</h3>
              </div>

              <div className="space-y-4">
                 {courses.map((c, i) => (
                   <div key={i} className="p-8 bg-black/40 border border-white/5 rounded-[32px] group hover:border-blue-400/30 transition-all flex items-center justify-between">
                      <div className="flex items-center gap-8">
                         <div className="w-14 h-14 rounded-2xl bg-blue-400/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-400 group-hover:text-white transition-all">
                            <PlayCircle className="w-8 h-8" />
                         </div>
                         <div>
                            <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">{c.level} • {c.duration}</div>
                            <h4 className="text-lg font-black italic tracking-tighter text-white uppercase group-hover:text-blue-400 transition-colors">{c.name}</h4>
                         </div>
                      </div>
                      
                      <div className="w-32 space-y-2">
                         <div className="flex justify-between text-[8px] font-black uppercase text-white/20">
                            <span>Status</span>
                            <span>{c.progress}%</span>
                         </div>
                         <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${c.progress}%` }} className="h-full bg-blue-400" />
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="p-8 bg-blue-600 rounded-[40px] text-white flex items-center justify-between shadow-2xl shadow-blue-900/40">
              <div className="space-y-4">
                 <Trophy className="w-10 h-10" />
                 <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Certification <br/> Tier: GOLD</h3>
                 <p className="text-[10px] font-bold uppercase text-blue-100 opacity-60">Complete 3 more modules to reach PLATINUM status.</p>
              </div>
              <div className="w-32 h-32 border-4 border-white/20 rounded-full flex items-center justify-center font-black italic text-4xl">75%</div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="p-8 bg-[#11141B] border border-white/10 rounded-[40px] space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Training Node Overview</h3>
              <div className="space-y-4">
                 {[
                   { label: 'Latency Training', val: '99%', icon: Cpu },
                   { label: 'Cultural Context', val: '100%', icon: Globe },
                   { label: 'System Logic', val: '88%', icon: Zap },
                 ].map((stat, i) => (
                   <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <stat.icon className="w-4 h-4 text-blue-400" />
                      <div className="flex-1">
                         <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">{stat.label}</div>
                         <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <motion.div animate={{ width: stat.val }} className="h-full bg-blue-400" />
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="p-8 bg-black/40 border border-white/10 rounded-[40px] flex flex-col gap-4">
              <Terminal className="w-5 h-5 text-blue-400" />
              <div className="font-mono text-[9px] text-white/20">
                 &gt; Initializing local node... <br/>
                 &gt; Verifying credentials... <br/>
                 &gt; Ready for training.
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
