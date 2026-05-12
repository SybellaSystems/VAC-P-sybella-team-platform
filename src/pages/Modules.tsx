import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Box, 
  Search, 
  Filter, 
  MoreVertical, 
  ToggleLeft as Toggle, 
  Settings, 
  ExternalLink,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserRole } from '../types';

const MODULES = [
  { key: 'sycore_erp', name: 'SyCore™ ERP', status: 'ACTIVE', version: '2.4.1', integrity: '99.9%' },
  { key: 'ogera_platform', name: 'Ogera Employment', status: 'ACTIVE', version: '1.2.0', integrity: '100%' },
  { key: 'syweb_platforms', name: 'SyWeb™ Custom', status: 'ACTIVE', version: '3.0.4', integrity: '98.2%' },
  { key: 'syintel_analytics', name: 'SyIntel™ Data', status: 'ACTIVE', version: '4.2.0', integrity: '99.9%' },
  { key: 'symobile_apps', name: 'SyMobile™ Native', status: 'DEVELOPMENT', version: '1.1.0', integrity: '100%' },
  { key: 'identity_engine', name: 'Core Identity', status: 'ACTIVE', version: '0.5.2', integrity: '94.5%' },
];

export default function Modules() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">Modular Infrastructure Registry</span>
          </div>
          <h1 className="text-5xl font-light text-white tracking-tighter uppercase italic">
            Workspace <span className="font-black text-blue-500">Modules</span>
          </h1>
        </div>

        <button className="flex items-center gap-3 px-6 py-3 bg-white text-black text-xs font-black uppercase tracking-widest rounded shadow-xl shadow-white/5 active:scale-95 transition-all">
          <Plus className="w-4 h-4" />
          Deploy New Module
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex items-center gap-4 py-4 px-6 bg-[#11141B] border border-white/10 rounded-2xl shadow-2xl">
        <Search className="w-4 h-4 text-white/20" />
        <input 
          type="text" 
          placeholder="Filter modules by key or status..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-xs font-mono text-white/60 w-full placeholder:text-white/10"
        />
        <div className="h-6 w-px bg-white/5" />
        <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
          <Filter className="w-3 h-3" />
          Filter
        </button>
      </div>

      {/* Modules Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MODULES.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.key.includes(search)).map((module, i) => (
          <motion.div 
            key={module.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group bg-[#11141B] border border-white/10 rounded-3xl p-8 relative overflow-hidden hover:border-blue-500/30 transition-all shadow-2xl"
          >
            <div className="absolute top-0 right-0 p-4">
               <button className="p-2 text-white/10 hover:text-white transition-colors">
                  <MoreVertical className="w-4 h-4" />
               </button>
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                 <div className={cn("w-2 h-2 rounded-full", module.status === 'ACTIVE' ? "bg-green-500" : "bg-orange-500")} />
                 <span className="text-[9px] font-black uppercase tracking-widest text-white/30">{module.status}</span>
              </div>
              <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase group-hover:text-blue-500 transition-colors">{module.name}</h3>
              <p className="text-[10px] font-mono text-white/20 mt-1 uppercase">KEY: {module.key}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Integrity</div>
                <div className="text-sm font-bold text-white font-mono">{module.integrity}</div>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Version</div>
                <div className="text-sm font-bold text-white font-mono">v{module.version}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-white/5">
              <div className="flex gap-2">
                <button className="p-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors text-white/40">
                  <Settings className="w-4 h-4" />
                </button>
                <button className="p-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors text-white/40">
                  <Toggle className="w-4 h-4" />
                </button>
              </div>
              <button className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-blue-500 hover:underline">
                View Log
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
