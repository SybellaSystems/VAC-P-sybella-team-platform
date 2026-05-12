import { motion } from 'motion/react';
import { TrendingUp, Megaphone, Target, BarChart, Zap, Globe, Share2, Users } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Marketing() {
  const campaigns = [
    { name: 'Kigali Launch 2025', reach: '450k', growth: '+12%', budget: '$12,000', status: 'ACTIVE' },
    { name: 'Ogera Student Outreach', reach: '1.2M', growth: '+45%', budget: '$5,000', status: 'ACTIVE' },
    { name: 'SyCore™ B2B Webinar', reach: '12k', growth: '+2%', budget: '$1,500', status: 'COMPLETED' },
  ];

  return (
    <div className="space-y-12 pb-20">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-orange-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">Marketing Velocity Engine</span>
        </div>
        <h1 className="text-5xl font-light text-white tracking-tighter uppercase italic">
          Growth <span className="font-black text-orange-500">Analytics</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="p-8 bg-[#11141B] border border-white/10 rounded-[40px] space-y-8">
              <div className="flex items-center justify-between">
                 <h3 className="text-xs font-black uppercase tracking-widest text-white/60 italic">Active Campaigns</h3>
                 <button className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-500 hover:text-white transition-all">New Campaign</button>
              </div>
              
              <div className="space-y-4">
                 {campaigns.map((c, i) => (
                   <div key={i} className="p-6 bg-black/40 border border-white/5 rounded-3xl flex items-center justify-between group hover:border-orange-500/30 transition-all">
                      <div className="flex items-center gap-6">
                         <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:bg-orange-600 group-hover:text-white transition-all">
                            <Megaphone className="w-6 h-6" />
                         </div>
                         <div>
                            <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">{c.status}</div>
                            <div className="text-sm font-bold text-white group-hover:text-orange-500 transition-colors uppercase">{c.name}</div>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">Growth</div>
                         <div className="text-sm font-mono font-bold text-green-500">{c.growth}</div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 bg-[#11141B] border border-white/10 rounded-[40px] space-y-6">
                 <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-orange-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/60 italic">Conversion Hub</h3>
                 </div>
                 <div className="text-4xl font-black italic tracking-tighter text-white">4.2%</div>
                 <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest leading-relaxed">System-wide mean conversion rate across all SySaaS platforms.</p>
              </div>
              <div className="p-8 bg-[#11141B] border border-white/10 rounded-[40px] space-y-6">
                 <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-orange-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/60 italic">Region: Sub-Saharan</h3>
                 </div>
                 <div className="text-4xl font-black italic tracking-tighter text-white">88%</div>
                 <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest leading-relaxed">African market dominance index in core logistics sectors.</p>
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="p-8 bg-orange-600 rounded-[40px] text-white shadow-2xl shadow-orange-900/20">
              <Zap className="w-8 h-8 mb-6" />
              <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-4 leading-none">Social Graph <br/> Intelligence</h3>
              <p className="text-[10px] font-bold uppercase leading-relaxed text-orange-100 opacity-80 mb-8">
                 Aggregating signal data from 400+ African tech nodes to optimize ad-spend velocity.
              </p>
              <button className="w-full py-4 bg-white text-orange-600 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all">
                 Initialize Pulse Run
              </button>
           </div>

           <div className="p-8 bg-[#11141B] border border-white/10 rounded-[40px] space-y-6">
              <div className="flex items-center gap-3">
                 <Share2 className="w-5 h-5 text-white/40" />
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Brand Integrity Score</h3>
              </div>
              <div className="text-3xl font-black italic tracking-tighter text-white">99.9</div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                 <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '99.9%' }}
                  className="h-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                 />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
