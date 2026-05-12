import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Lock, 
  Zap, 
  ArrowRight, 
  Fingerprint,
  Cpu,
  Globe
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getSupabase } from '../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Platform Core Offline');

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Authentication Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMockLogin = () => {
    // This allows bypass for demo/testing environments
    window.dispatchEvent(new CustomEvent('mock-login', { 
      detail: { name: 'Demo Administrator', role: 'SUPERADMIN' } 
    }));
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] flex overflow-hidden">
      {/* Visual Side */}
      <div className="hidden lg:flex flex-1 relative bg-[#0D1016] border-r border-white/5 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent_70%)]" />
        <div className="relative z-10 max-w-lg text-center p-12">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl mb-12"
          >
            <Shield className="w-12 h-12 text-white" />
          </motion.div>
          <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase mb-6 leading-none">
            Secure Gateway <br />
            <span className="text-blue-500 underline decoration-white/5 decoration-[6px] underline-offset-[8px]">Sybella Core</span>
          </h2>
          <p className="text-white/40 leading-relaxed font-medium">
            Authorized personnel only. All access attempts are logged via high-integrity audit protocols.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-12">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center">
              <Fingerprint className="w-6 h-6 text-blue-500 mb-2" />
              <span className="text-[9px] font-black uppercase text-white/30">Biometric Sync</span>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center">
              <Globe className="w-6 h-6 text-blue-500 mb-2" />
              <span className="text-[9px] font-black uppercase text-white/30">Auth Node Alpha</span>
            </div>
          </div>
        </div>
        
        {/* Technical Grid Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0A0C10] to-transparent" />
      </div>

      {/* Auth Side */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#0A0C10]">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-sm space-y-10"
        >
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Identity Verification</span>
             </div>
             <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Enter Platform</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Entity Email</label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/5 border-white/10 border rounded-xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all"
                  placeholder="name@sybella-core.com"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Decryption Key</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/5 border-white/10 border rounded-xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all"
                  placeholder="••••••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest p-3 bg-red-500/10 border border-red-500/20 rounded">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-blue-600 text-white text-xs font-black uppercase tracking-[0.2em] rounded hover:bg-blue-500 transition-all active:scale-95 shadow-2xl shadow-blue-600/20"
            >
              Verify & Launch
              {isLoading ? <Cpu className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="pt-8 space-y-4">
             <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <div className="relative flex justify-center text-[9px] uppercase tracking-widest"><span className="bg-[#0A0C10] px-3 text-white/20">Development Bypass</span></div>
             </div>
             
             <button 
              onClick={handleMockLogin}
              className="w-full py-4 bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all rounded text-[10px] font-black uppercase tracking-widest"
             >
               Initialize Mock Session
             </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
