import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500">
            <ShieldAlert className="w-10 h-10" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-6xl font-black italic tracking-tighter text-white uppercase">4.0.4</h1>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Invalid Navigation Vector</div>
          <p className="text-white/40 text-sm font-medium uppercase leading-relaxed">
            The resource you are attempting to access does not exist within the Sybella Core platform or has been deprecated by system administrators.
          </p>
        </div>

        <div className="pt-8">
          <Link 
            to="/"
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black text-xs font-black uppercase tracking-widest rounded shadow-2xl shadow-white/5 hover:bg-red-500 hover:text-white transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Relocate to Core
          </Link>
        </div>
        
        <div className="pt-12 text-[9px] font-mono text-white/10 uppercase tracking-widest">
          ERR_CODE: PLATFORM_OBJECT_NOT_FOUND
        </div>
      </motion.div>
    </div>
  );
}
