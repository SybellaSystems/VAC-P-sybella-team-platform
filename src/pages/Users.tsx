import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users as UsersIcon, 
  Search, 
  UserPlus, 
  Mail, 
  ShieldCheck, 
  Clock, 
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserRole } from '../types';
import { ROLE_CONFIG } from '../constants';

const MOCK_USERS = [
  { id: '1', name: 'Bessora Neema Hirwa', email: 'bessora@sybella.com', role: UserRole.CEO_FOUNDER, lastActive: '2m ago' },
  { id: '2', name: 'Kayla Elyse', email: 'kayla@sybella.com', role: UserRole.CEO_FOUNDER, lastActive: '14m ago' },
  { id: '3', name: 'Eric Munyaneza', email: 'eric@sybella.com', role: UserRole.OPERATIONS_MANAGER, lastActive: '1h ago' },
  { id: '4', name: 'Aisha Keza', email: 'aisha@sybella.com', role: UserRole.FINANCE, lastActive: '3h ago' },
  { id: '5', name: 'John Doe', email: 'dev@sybella.com', role: UserRole.DEVELOPER, lastActive: 'Active' },
];

export default function UsersList() {
  const [search, setSearch] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-purple-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">Personnel Identity Registry</span>
          </div>
          <h1 className="text-5xl font-light text-white tracking-tighter uppercase italic">
            Network <span className="font-black text-purple-500 text shadow-purple-500/20">Users</span>
          </h1>
        </div>

        <button 
          onClick={() => setIsAddingUser(true)}
          className="flex items-center gap-3 px-6 py-3 bg-purple-600 text-white text-xs font-black uppercase tracking-widest rounded shadow-xl shadow-purple-600/20 active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Onboard Entity
        </button>
      </div>

      <AnimatePresence>
        {isAddingUser && (
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
                    <div className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Identity Provisioning</div>
                    <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase italic">New User Entity</h2>
                 </div>

                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Full Name</label>
                       <input 
                        type="text" 
                        placeholder="e.g. Jean-Luc Bizimana"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Email Address</label>
                       <input 
                        type="email" 
                        placeholder="user@sybella.com"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Assigned Role</label>
                       <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:border-purple-500/50 transition-all font-mono">
                          {Object.values(UserRole).map(role => (
                            <option key={role} value={role} className="bg-[#0F1219]">{role}</option>
                          ))}
                       </select>
                    </div>
                 </div>

                 <button 
                  onClick={() => setIsAddingUser(false)}
                  className="w-full py-5 bg-purple-600 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-purple-900/20 active:scale-95 transition-all"
                 >
                    Onboard into Network
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-[#11141B] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center gap-4">
           <Search className="w-4 h-4 text-white/20" />
           <input 
            type="text" 
            placeholder="Query network identities..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-xs font-mono text-white/60 w-full placeholder:text-white/10"
           />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-black/40 text-[9px] uppercase text-white/30 font-black tracking-widest">
              <tr className="border-b border-white/5">
                <th className="px-8 py-5">Entity Information</th>
                <th className="px-8 py-5">Assigned Role</th>
                <th className="px-8 py-5">Last Telemetry</th>
                <th className="px-8 py-5 text-right">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {MOCK_USERS.filter(u => u.name.toLowerCase().includes(search.toLowerCase())).map((user, i) => {
                const roleConfig = ROLE_CONFIG[user.role];
                return (
                  <motion.tr 
                    key={user.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-white/5 to-white/10 border border-white/10 flex items-center justify-center shrink-0">
                          <UsersIcon className="w-5 h-5 text-white/20" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white mb-0.5">{user.name}</div>
                          <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-mono">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5 rounded-lg">
                        <roleConfig.icon className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60 italic">{roleConfig.label}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
                        <Clock className="w-3.5 h-3.5" />
                        {user.lastActive}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-white/20 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 border-t border-white/5 bg-black/20 flex justify-between items-center">
           <span className="text-[9px] font-mono text-white/20">TOTAL_ENTITIES: 1,842</span>
           <div className="flex gap-2">
              <button className="px-3 py-1 bg-white/5 border border-white/5 rounded text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors">Prev</button>
              <button className="px-3 py-1 bg-white/5 border border-white/5 rounded text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors">Next</button>
           </div>
        </div>
      </div>
    </div>
  );
}
