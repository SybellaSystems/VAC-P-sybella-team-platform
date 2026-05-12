import { motion } from 'motion/react';
import { FlaskConical, Bug, ShieldCheck, Zap, Activity, Code, Terminal, Play } from 'lucide-react';
import { cn } from '../lib/utils';

export default function QA() {
  const tests = [
    { name: 'VAC-P Auth Handshake', type: 'SECURITY', status: 'PASS', time: '14ms' },
    { name: 'Ogera Payment Relay', type: 'FUNC', status: 'FAIL', time: '2040ms' },
    { name: 'SyCore™ RLS Verification', type: 'DATA', status: 'PASS', time: '8ms' },
    { name: 'Global Asset Integrity', type: 'INTEGRITY', status: 'PASS', time: '45ms' },
  ];

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-green-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">Integrity Verification Lab</span>
          </div>
          <h1 className="text-5xl font-light text-white tracking-tighter uppercase italic">
            QA <span className="font-black text-green-500">Sandbox</span>
          </h1>
        </div>
        
        <button className="px-6 py-4 bg-green-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 shadow-xl shadow-green-900/20 active:scale-95 transition-all">
          <Play className="w-4 h-4" />
          Initialize Batch Run
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="p-8 bg-[#11141B] border border-white/10 rounded-[40px] space-y-8">
              <div className="flex items-center justify-between">
                 <h3 className="text-xs font-black uppercase tracking-widest text-white/60 italic">Recent Test Cycles</h3>
                 <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-green-500 uppercase">3 Passed</span>
                    <span className="text-[10px] font-black text-red-500 uppercase">1 Failed</span>
                 </div>
              </div>

              <div className="space-y-4">
                 {tests.map((t, i) => (
                   <div key={i} className="p-6 bg-black/40 border border-white/5 rounded-3xl flex items-center justify-between group hover:border-green-500/30 transition-all">
                      <div className="flex items-center gap-6">
                         <div className={cn(
                           "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                           t.status === 'PASS' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                         )}>
                            <ShieldCheck className="w-6 h-6" />
                         </div>
                         <div>
                            <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">{t.type} // {t.time}</div>
                            <div className="text-sm font-bold text-white uppercase">{t.name}</div>
                         </div>
                      </div>
                      <div className={cn(
                        "text-[10px] font-black tracking-widest uppercase italic",
                        t.status === 'PASS' ? 'text-green-500' : 'text-red-500'
                      )}>{t.status}</div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="p-8 bg-[#11141B] border border-white/10 rounded-[40px] space-y-6">
              <div className="flex items-center gap-3">
                 <Bug className="w-5 h-5 text-green-500" />
                 <h3 className="text-xs font-black uppercase tracking-widest text-white/60 italic">Anomaly Registry</h3>
              </div>
              <div className="divide-y divide-white/5">
                 {[
                   { code: 'ERR-L22', desc: 'Latency spike in Kigali node' },
                   { code: 'ERR-S09', desc: 'Metadata drift in User Engine' },
                 ].map((e, i) => (
                   <div key={i} className="py-4 flex gap-4">
                      <span className="text-red-500 font-mono text-[10px] font-bold">{e.code}</span>
                      <span className="text-white/40 text-[10px] font-bold uppercase">{e.desc}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="p-8 bg-black/60 border border-white/10 rounded-[40px] h-full flex flex-col">
              <div className="flex items-center gap-2 mb-8">
                 <Terminal className="w-4 h-4 text-green-500" />
                 <h3 className="text-xs font-black tracking-widest uppercase text-white/40">Lab Console</h3>
              </div>
              <div className="flex-1 font-mono text-[9px] text-green-500/60 space-y-2 overflow-y-auto">
                 <div>&gt; SYBELLA_QA_INITIALIZED</div>
                 <div>&gt; VERIFYING_RLS_INTEGRITY...</div>
                 <div>&gt; [OK] SYSTEM_STABLE</div>
                 <div>&gt; RUNNING_SMOKE_TESTS...</div>
                 <div className="text-red-500">&gt; [FAIL] PAYMENT_RELAY_TIMEOUT (2040ms)</div>
                 <div className="animate-pulse">_</div>
              </div>
              <button className="mt-8 w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-all">Clear Registry</button>
           </div>
        </div>
      </div>
    </div>
  );
}
