import { ReactNode, useState } from 'react';
import { UserRole } from '../types';
import { ROLE_CONFIG } from '../constants';
import { 
  LogOut, 
  Menu, 
  X, 
  ChevronLeft, 
  LayoutDashboard, 
  Box, 
  Users as UsersIcon,
  Bell,
  Search,
  Command,
  UserCircle,
  ShieldAlert,
  Compass as GlobeIcon,
  Cpu,
  BarChart4,
  Briefcase,
  Layers,
  Heart,
  TrendingUp,
  MessageSquare,
  Zap,
  Target,
  FlaskConical,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface Props {
  user: { name: string; role: UserRole; id?: string };
  onLogout: () => void;
  children: ReactNode;
}

export default function AdminShell({ user, onLogout, children }: Props) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const config = ROLE_CONFIG[user.role];

  const menuItems = [
    { label: 'Strategic Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Autonomous Core', path: '/admin/protocols', icon: Cpu, roles: [UserRole.SUPERADMIN, UserRole.CEO_FOUNDER] },
    { label: 'Mission Pipeline', path: '/admin/projects', icon: Briefcase, roles: [UserRole.SUPERADMIN, UserRole.PROJECT_MANAGER, UserRole.EXECUTIVE, UserRole.CEO_FOUNDER, UserRole.DEVELOPER, UserRole.DESIGNER] },
    { label: 'Fiscal Intelligence', path: '/admin/fiscal', icon: BarChart4, roles: [UserRole.SUPERADMIN, UserRole.EXECUTIVE, UserRole.CEO_FOUNDER, UserRole.ANALYST, UserRole.FINANCE] },
    { label: 'Intra-Team Comms', path: '/admin/chat', icon: MessageSquare },
    { label: 'Active Notifications', path: '/admin/notifications', icon: Bell },
    { label: 'Identity Engine', path: '/admin/users', icon: UsersIcon, roles: [UserRole.SUPERADMIN, UserRole.HR, UserRole.EXECUTIVE, UserRole.CEO_FOUNDER] },
    { label: 'Workspace Engine', path: '/admin/workspace', icon: Box, roles: [UserRole.SUPERADMIN, UserRole.PRODUCT_MANAGER, UserRole.DEVELOPER, UserRole.QA_TESTER, UserRole.INTERN] },
    { label: 'Market Velocity', path: '/admin/marketing', icon: TrendingUp, roles: [UserRole.SUPERADMIN, UserRole.SALES_MARKETING, UserRole.ANALYST] },
    { label: 'Support Nexus', path: '/admin/support', icon: MessageSquare, roles: [UserRole.SUPERADMIN, UserRole.SUPPORT] },
    { label: 'QA Sandbox', path: '/admin/qa', icon: FlaskConical, roles: [UserRole.SUPERADMIN, UserRole.QA_TESTER] },
    { label: 'Audit Protocol', path: '/admin/audit', icon: ShieldAlert, roles: [UserRole.SUPERADMIN, UserRole.QA_TESTER, UserRole.ANALYST, UserRole.OPERATIONS_MANAGER] },
    { label: 'Cloud Topology', path: '/admin/cloud', icon: GlobeIcon, roles: [UserRole.SUPERADMIN, UserRole.DEVELOPER] },
    { label: 'Academy / Training', path: '/admin/academy', icon: GraduationCap, roles: [UserRole.SUPERADMIN, UserRole.INTERN] },
    { label: 'Profile Settings', path: '/admin/profile', icon: UserCircle },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || item.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#D1D5DB] font-sans flex overflow-hidden">
      {/* Sidebar - Desktop */}
      <motion.aside 
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="hidden md:flex flex-col border-r border-white/10 bg-[#0F1219] relative z-40 shrink-0 shadow-2xl"
      >
        <div className="p-6 h-20 flex items-center justify-between overflow-hidden whitespace-nowrap border-b border-white/5">
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
                S
              </div>
              <div className="leading-none">
                <span className="block text-[8px] uppercase tracking-[0.2em] opacity-40 mb-1">Sybella Systems</span>
                <span className="font-bold text-lg tracking-tighter">VAC-P</span>
              </div>
            </motion.div>
          )}
          {!isSidebarOpen && (
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 mx-auto">
              S
            </div>
          )}
        </div>

        <nav className="flex-1 p-6 space-y-1">
          <div className={cn("text-[8px] uppercase tracking-widest text-white/30 mb-4 font-black transition-opacity", !isSidebarOpen && "opacity-0")}>
            Core Infrastructure
          </div>
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all group relative border",
                  isActive 
                    ? "bg-blue-600/10 text-white border-blue-500/30 shadow-lg shadow-blue-500/5" 
                    : "text-white/60 border-transparent hover:bg-white/5 hover:text-white"
                )}
              >
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0 transition-all",
                  isActive ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-transparent border border-white/20"
                )} />
                {isSidebarOpen && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xs font-semibold tracking-wide"
                  >
                    {item.label}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border border-white/20 shadow-lg" />
            {isSidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="leading-none">
                <div className="text-xs font-bold text-white">{user.name}</div>
                <div className="text-[9px] text-blue-400 font-black uppercase mt-1 tracking-widest">{config.label}</div>
              </motion.div>
            )}
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-3 w-full px-3 py-2 text-white/30 hover:text-white hover:bg-white/5 rounded-md transition-all text-xs font-bold uppercase tracking-widest"
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform", !isSidebarOpen && "rotate-180")} />
            {isSidebarOpen && <span>Collapse Ops</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0A0C10]">
        {/* Header */}
        <header className="h-16 bg-[#0D1016] border-b border-white/10 px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 hover:bg-white/5 rounded-lg border border-white/10"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Strategic Overview</h2>
              <span className="h-4 w-px bg-white/10 hidden sm:block"></span>
              <span className="text-[10px] text-white/30 uppercase tracking-widest font-mono italic hidden sm:block">
                Context: Global Workspace / Sybella-Core
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 bg-black/40 border border-white/5 px-4 h-9 rounded-md">
              <Search className="w-3.5 h-3.5 text-white/30" />
              <input 
                type="text" 
                placeholder="EXEC_QUERY_ENGINE..." 
                className="bg-transparent border-none outline-none text-[10px] w-48 font-mono text-white/60 placeholder:text-white/20"
              />
            </div>
            
            <div className="h-4 w-px bg-white/10" />
            
            <div className="flex gap-2">
              <button className="relative w-9 h-9 flex items-center justify-center bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors text-white/40 hover:text-white">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              </button>
              <button 
                onClick={onLogout}
                className="w-9 h-9 flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-500/60 hover:text-red-500 rounded hover:bg-red-500/20 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        
        {/* Technical Footer */}
        <footer className="h-10 border-t border-white/10 bg-[#0D1016] flex items-center justify-between px-8 text-[9px] font-mono text-white/20">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span>CORE_UPTIME: 99.98%</span>
            </div>
            <span>SESSION: {Math.random().toString(16).slice(2, 10).toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>RLS_POLICIES: ACTIVE</span>
            <span>ENCRYPTION: AES-256</span>
          </div>
        </footer>
      </div>
      
      {/* Mobile Drawer (Applying Theme) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[50] md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-80 bg-[#0F1219] border-r border-white/10 z-[60] md:hidden flex flex-col p-8"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white">S</div>
                  <span className="font-black tracking-tighter uppercase text-sm italic">VAC-P Mobile</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-white/40 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex-1 space-y-2">
                {filteredMenuItems.map((item) => (
                  <Link 
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 rounded border transition-all text-sm font-bold",
                      location.pathname === item.path ? "bg-blue-600/10 text-blue-500 border-blue-500/30" : "text-white/40 border-transparent hover:text-white"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto p-6 bg-white/[0.03] border border-white/10 rounded-2xl">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600" />
                    <div>
                      <p className="text-sm font-bold text-white">{user.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">{config.label}</p>
                    </div>
                 </div>
                 <button onClick={onLogout} className="w-full py-3 bg-red-500 text-white font-bold rounded-lg text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95">
                   Terminate Session
                 </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
