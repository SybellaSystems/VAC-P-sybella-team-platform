import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  BarChart3, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart,
  Target,
  Rocket,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';

const METRICS = [
  { label: 'Q3 Projected Growth', value: '$24.8B', trend: '+142%', color: 'text-green-500' },
  { label: 'Network Liquidity', value: '$840.2M', trend: '-2.4%', color: 'text-orange-500' },
  { label: 'Market Dominance', value: '64.2%', trend: '+8.1%', color: 'text-blue-500' },
  { label: 'Bootstrap Vector', value: '9.8x', trend: 'STABLE', color: 'text-purple-500' },
];

export default function FiscalIntelligence() {
  const [isRecordingRevenue, setIsRecordingRevenue] = useState(false);

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">Multibillion Booster Core</span>
          </div>
          <h1 className="text-5xl font-light text-white tracking-tighter uppercase italic">
            Fiscal <span className="font-black text-green-500">Intelligence</span>
          </h1>
        </div>

        <div className="flex gap-4">
           <button 
            onClick={() => setIsRecordingRevenue(true)}
            className="flex items-center gap-3 px-6 py-3 bg-white text-black text-xs font-black uppercase tracking-widest rounded shadow-xl hover:bg-green-500 hover:text-white transition-all"
           >
             <Plus className="w-4 h-4" />
             Record Revenue
           </button>
           <button className="flex items-center gap-3 px-6 py-3 bg-green-600/20 border border-green-500/20 text-green-500 text-xs font-black uppercase tracking-widest rounded shadow-xl shadow-green-600/20 active:scale-95 transition-all">
             <Rocket className="w-4 h-4" />
             Deploy Capital
           </button>
        </div>
      </div>

      <AnimatePresence>
        {isRecordingRevenue && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="w-full max-w-xl bg-[#0F1219] border border-white/10 rounded-[40px] p-12 relative shadow-2xl"
            >
              <div className="space-y-8">
                 <div className="space-y-2">
                    <div className="text-[10px] font-black text-green-500 uppercase tracking-widest">Financial Ingestion</div>
                    <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase italic">New Revenue Entry</h2>
                 </div>

                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Source Entity</label>
                       <input 
                        type="text" 
                        placeholder="e.g. MTN Rwanda / Gateway Fees"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-green-500/50 transition-all font-mono"
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Amount (USD)</label>
                          <input 
                            type="number" 
                            placeholder="0.00"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-green-500/50 transition-all font-mono"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Sync Protocol</label>
                          <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-green-500/50 transition-all font-mono">
                             <option className="bg-[#0F1219]">Standard ACH</option>
                             <option className="bg-[#0F1219]">Mobile Money Bridge</option>
                             <option className="bg-[#0F1219]">Crypto / Stablecoin</option>
                          </select>
                       </div>
                    </div>
                 </div>

                 <button 
                  onClick={() => setIsRecordingRevenue(false)}
                  className="w-full py-5 bg-green-600 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-green-900/20 active:scale-95 transition-all"
                 >
                    Incorporate Revenue
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* High-Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {METRICS.map((metric, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 bg-[#11141B] border border-white/10 rounded-[32px] shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <TrendingUp className="w-12 h-12" />
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">{metric.label}</div>
            <div className="text-4xl font-light text-white tracking-tighter mb-2 italic">{metric.value}</div>
            <div className={cn("text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1", metric.color)}>
              {metric.trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {metric.trend}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Growth Projection Chart Placeholder */}
        <div className="bg-[#11141B] border border-white/10 rounded-[40px] p-8 shadow-2xl space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Expansion Trajectory</h3>
            <div className="flex gap-2">
              {['1D', '1W', '1M', '1Y'].map(t => (
                <button key={t} className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors">{t}</button>
              ))}
            </div>
          </div>
          
          <div className="aspect-[16/9] w-full flex items-end gap-2 px-2">
            {[40, 65, 45, 80, 55, 90, 70, 100, 85, 120, 110].map((h, i) => (
              <motion.div 
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.5 + (i * 0.05), duration: 1 }}
                className="flex-1 bg-gradient-to-t from-green-600/5 to-green-500 rounded-t-sm relative group"
              >
                 <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white text-black font-mono text-[10px] px-2 py-1 rounded">
                   +${h}M
                 </div>
              </motion.div>
            ))}
          </div>
          
          <div className="pt-8 border-t border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Market Distribution Synced</span>
            </div>
            <button className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:underline">Download Report</button>
          </div>
        </div>

        {/* Strategy Matrix */}
        <div className="bg-[#11141B] border border-white/10 rounded-[40px] p-8 shadow-2xl">
          <h3 className="text-sm font-black uppercase tracking-widest text-white/60 mb-8">Strategic Growth Vectors</h3>
          <div className="space-y-6">
            {[
              { label: 'Global Market Penetration', progress: 84, color: 'bg-blue-500' },
              { label: 'Operational Efficiency', progress: 92, color: 'bg-green-500' },
              { label: 'R&D Innovation Pipeline', progress: 68, color: 'bg-purple-500' },
              { label: 'Customer Retention Rate', progress: 95, color: 'bg-indigo-500' },
            ].map((strategy, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-white/40">{strategy.label}</span>
                  <span className="text-white">{strategy.progress}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${strategy.progress}%` }}
                    transition={{ delay: 0.8 + (i * 0.1), duration: 1 }}
                    className={cn("h-full", strategy.color)} 
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-4">
             <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <Target className="w-6 h-6 text-orange-500" />
             </div>
             <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-white">Next Milestone: $50B Market Cap</h4>
                <p className="text-[10px] font-medium text-white/30 uppercase mt-1 tracking-wider">PROJECTED COMPLETION: Q4 2026</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
