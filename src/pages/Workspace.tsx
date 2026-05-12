import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Database, 
  Cpu, 
  Network, 
  Shield, 
  Activity, 
  Search,
  ArrowRight,
  ChevronRight,
  Terminal,
  Layers,
  Box,
  TrendingUp,
  Users,
  Anchor,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { OPERATIONAL_REGISTRY, OperationalNode, Sector } from '../lib/registry';

const SECTOR_ICONS: Record<Sector, any> = {
  FISCAL: TrendingUp,
  PERSONNEL: Users,
  INFRASTRUCTURE: Database,
  STRATEGY: Anchor,
  OPERATIONS: Box
};

const SECTOR_COLORS: Record<Sector, string> = {
  FISCAL: 'text-green-500',
  PERSONNEL: 'text-purple-500',
  INFRASTRUCTURE: 'text-blue-500',
  STRATEGY: 'text-orange-500',
  OPERATIONS: 'text-indigo-500'
};

export default function WorkspaceGenerator() {
  const { moduleType = 'index' } = useParams();
  const navigate = useNavigate();

  const selectedNode = OPERATIONAL_REGISTRY.find(n => n.id === moduleType);

  if (moduleType === 'index') {
    return (
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">Multibillion Booster Infrastructure</span>
            </div>
            <h1 className="text-5xl font-light text-white tracking-tighter uppercase italic">
              Central <span className="font-black text-blue-500">Registry</span>
            </h1>
          </div>
          
          <div className="flex gap-4">
            <div className="p-4 bg-[#11141B] border border-white/5 rounded-2xl flex flex-col items-end">
              <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">Active Nodes</div>
              <div className="text-xl font-mono font-bold text-white italic">200/200</div>
            </div>
            <div className="p-4 bg-[#11141B] border border-white/5 rounded-2xl flex flex-col items-end">
              <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">System Health</div>
              <div className="text-xl font-mono font-bold text-green-500 italic">94.8%</div>
            </div>
          </div>
        </div>

        {/* Dynamic Matrix Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-4">
          {OPERATIONAL_REGISTRY.map((node, i) => {
            const Icon = SECTOR_ICONS[node.sector];
            return (
              <motion.div 
                key={node.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (i % 50) * 0.01 }}
                onClick={() => navigate(`/admin/workspace/module/${node.id}`)}
                className="group p-6 bg-[#11141B] border border-white/10 rounded-[24px] hover:border-white/30 transition-all cursor-pointer relative overflow-hidden"
              >
                <div className={cn("absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity", SECTOR_COLORS[node.sector])}>
                  <Icon className="w-16 h-16" />
                </div>
                <div className="text-[7px] font-black text-white/20 tracking-tighter mb-4 uppercase italic">{node.id}</div>
                <Icon className={cn("w-4 h-4 mb-3", SECTOR_COLORS[node.sector])} />
                <h3 className="text-xs font-black text-white uppercase italic leading-tight group-hover:text-blue-500 transition-colors line-clamp-2">
                  {node.name}
                </h3>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!selectedNode) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
        <div className="text-red-500 font-mono text-xs uppercase tracking-[0.3em]">Module Index Corrupted</div>
        <Link to="/admin/workspace" className="text-blue-500 text-[10px] font-black uppercase tracking-widest hover:underline line">Return to Registry</Link>
      </div>
    );
  }

  const SectorIcon = SECTOR_ICONS[selectedNode.sector];

  return (
    <div className="space-y-12 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link to="/admin/workspace" className="p-2 bg-white/5 rounded-xl border border-white/10 text-white/40 hover:text-white transition-all">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </Link>
          <div className="h-8 w-px bg-white/10 mx-2" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SectorIcon className={cn("w-3 h-3", SECTOR_COLORS[selectedNode.sector])} />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20">{selectedNode.sector} NODE</span>
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase italic">
              {selectedNode.name}
            </h1>
          </div>
        </div>

        <div className="flex gap-4">
          <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all">
            Clone Component
          </button>
          <button className="px-6 py-3 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-blue-900/20 active:scale-95 transition-all">
            Direct Override
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 flex-1">
        <div className="lg:col-span-2 space-y-8">
           {/* Visual Telemetry */}
           <div className="aspect-[21/9] bg-black/60 rounded-[40px] border border-white/10 p-12 flex flex-col justify-between overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.05),transparent_70%)]" />
              
              <div className="relative z-10 space-y-12">
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[10px] font-black tracking-widest uppercase text-white/60">Live Operational Telemetry // ID: {selectedNode.id}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-12">
                   <div className="space-y-2">
                      <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">Booster Factor</div>
                      <div className="text-5xl font-black italic tracking-tighter text-white">{selectedNode.boosterFactor}</div>
                   </div>
                   <div className="space-y-2">
                      <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">System Integrity</div>
                      <div className="text-5xl font-black italic tracking-tighter text-green-500">OPTIMAL</div>
                   </div>
                   <div className="space-y-2">
                      <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">Network Load</div>
                      <div className="text-5xl font-black italic tracking-tighter text-white">{(Math.random() * 100).toFixed(1)}%</div>
                   </div>
                </div>
              </div>

              {/* Dynamic Waveform Simulation */}
              <div className="relative h-20 w-full flex items-end gap-1 px-2">
                {Array.from({ length: 120 }).map((_, i) => (
                  <motion.div 
                    key={i}
                    initial={{ height: 2 }}
                    animate={{ height: `${10 + Math.random() * 60}%` }}
                    transition={{ repeat: Infinity, duration: 1 + Math.random(), repeatType: 'mirror' }}
                    className="flex-1 bg-blue-500/10 rounded-full"
                  />
                ))}
              </div>
           </div>

           {/* Interconnectivity Matrix */}
           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">Interconnect Protocols</h3>
              <div className="grid md:grid-cols-2 gap-4">
                 {selectedNode.interconnects.map((nodeId, i) => {
                   const linkedNode = OPERATIONAL_REGISTRY.find(n => n.id === nodeId);
                   if (!linkedNode) return null;
                   const LinkedIcon = SECTOR_ICONS[linkedNode.sector];
                   
                   return (
                     <Link 
                       key={nodeId}
                       to={`/admin/workspace/module/${nodeId}`}
                       className="p-6 bg-[#11141B] border border-white/5 rounded-3xl flex items-center justify-between group hover:border-blue-500/30 transition-all"
                     >
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-blue-500 transition-colors">
                             <LinkedIcon className="w-5 h-5" />
                          </div>
                          <div>
                             <div className="text-[8px] font-black text-white/20 uppercase italic mb-0.5">{linkedNode.id}</div>
                             <div className="text-xs font-bold text-white group-hover:text-blue-500 transition-colors">{linkedNode.name}</div>
                          </div>
                       </div>
                       <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                     </Link>
                   );
                 })}
              </div>
           </div>
        </div>

        {/* Right Sidebar - Logic Terminal */}
        <div className="flex flex-col gap-6">
           <div className="bg-[#11141B] border border-white/10 rounded-[40px] p-8 flex flex-col flex-1 shadow-2xl">
              <div className="flex items-center gap-2 mb-8">
                 <Terminal className="w-4 h-4 text-blue-500" />
                 <h3 className="text-[10px] font-black tracking-widest uppercase text-white/40">Core Logic Terminal</h3>
              </div>
              
              <div className="flex-1 bg-black/40 rounded-3xl p-6 font-mono text-[10px] leading-relaxed text-blue-500/60 overflow-y-auto space-y-4">
                 <div className="text-white/20 italic">// SECTOR_{selectedNode.sector} INITIALIZED</div>
                 <div className="text-white/20 italic">// NODE_{selectedNode.id} HANDSHAKE...</div>
                 <div className="flex gap-2 text-white/60">
                    <span className="text-green-500 font-bold">[SUCCESS]</span>
                    <span>Directives Synced</span>
                 </div>
                 <div className="flex gap-2">
                    <span className="text-white/20">&gt;</span>
                    <span className="text-white/80">Booster Factor Verified at {selectedNode.boosterFactor}</span>
                 </div>
                 <div className="text-blue-500 animate-[pulse_2s_infinite]">_ Listening for system events...</div>
              </div>

              <div className="mt-8 space-y-3">
                 <div className="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/20 flex gap-3">
                    <Shield className="w-5 h-5 text-orange-500 shrink-0" />
                    <p className="text-[9px] font-bold text-orange-200/60 uppercase leading-normal">
                       Node access restricted to {selectedNode.sector === 'FISCAL' ? 'EXECUTIVE' : 'CORE'} role clearance levels.
                    </p>
                 </div>
              </div>
           </div>

           <div className="p-8 bg-blue-600/5 border border-blue-500/20 rounded-[40px] flex flex-col items-center text-center gap-4">
              <Zap className="w-8 h-8 text-blue-500" />
              <div className="space-y-1">
                 <div className="text-xs font-black text-white uppercase italic">Booster Active</div>
                 <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Optimizing Node Affinity</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
