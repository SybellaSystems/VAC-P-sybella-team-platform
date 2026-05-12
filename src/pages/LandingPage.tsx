import { motion, useScroll, useTransform } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { 
  ArrowRight, 
  Globe, 
  ShieldCheck, 
  Zap, 
  Cpu, 
  Users,
  Compass,
  Briefcase,
  Settings,
  Layers,
  Code2,
  Terminal,
  Database,
  Cloud,
  Bot,
  ChevronRight,
  ExternalLink,
  Github,
  Twitter,
  Linkedin
} from 'lucide-react';
import { getSupabase } from '../lib/supabase';
import { useRef } from 'react';

const FloatingBlob = ({ className, color, size = "400px", delay = 0 }: { className?: string, color: string, size?: string, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ 
      opacity: [0.3, 0.5, 0.3],
      scale: [1, 1.1, 1],
      x: [0, 30, 0],
      y: [0, -30, 0]
    }}
    transition={{ 
      duration: 10, 
      repeat: Infinity, 
      delay,
      ease: "easeInOut" 
    }}
    className={cn("absolute rounded-full blur-[100px] pointer-events-none", className)}
    style={{ 
      backgroundColor: color,
      width: size,
      height: size,
    }}
  />
);

export default function LandingPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.9]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  const handleEnterPlatform = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      navigate('/login');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate('/admin');
    } else {
      navigate('/login');
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#000000] text-[#D1D5DB] font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="w-6 h-6 bg-blue-600 rounded-sm flex items-center justify-center">
                <div className="w-3 h-3 bg-white rotate-45" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">sybella</span>
            </div>
            
            <div className="hidden md:flex items-center gap-6 text-[11px] font-semibold text-white/50 uppercase tracking-wider">
              <a href="#products" className="hover:text-white transition-colors">Products</a>
              <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
              <a href="#customers" className="hover:text-white transition-colors">Customers</a>
              <a href="#resources" className="hover:text-white transition-colors">Resources</a>
              <a href="#company" className="hover:text-white transition-colors">Company</a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-[11px] font-semibold text-white/50 hover:text-white uppercase tracking-wider transition-colors px-4"
            >
              Log In
            </button>
            <button 
              onClick={handleEnterPlatform}
              className="px-4 py-2 bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-md hover:bg-blue-500 transition-all active:scale-95 whitespace-nowrap"
            >
              Book a Demo
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Background blobs */}
        <FloatingBlob color="#4f46e5" className="top-1/4 -left-20" delay={0} />
        <FloatingBlob color="#7c3aed" className="bottom-1/4 right-0" delay={2} />
        <FloatingBlob color="#2563eb" className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" size="600px" delay={4} />
        
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />

        <motion.div 
          style={{ scale: heroScale, opacity: heroOpacity }}
          className="max-w-5xl mx-auto text-center relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-white mb-8 leading-[1.05]">
              Power <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">African AI</span><br />
              With Your Data.
            </h1>
            
            <p className="text-lg md:text-xl text-white/50 leading-relaxed mb-10 max-w-2xl mx-auto font-medium">
              Sybella provides the high-performance data infrastructure 
              needed to build and scale your most ambitious AI models in Africa.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <button 
                onClick={handleEnterPlatform}
                className="group flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-md text-sm font-bold tracking-wide hover:bg-blue-500 transition-all active:scale-95 shadow-2xl shadow-blue-600/20"
              >
                Launch VAC-P
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 border border-white/10 rounded-md text-sm font-bold tracking-wide hover:bg-white/5 transition-all text-white">
                Contact Sales
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Scroll to Explore</span>
          <div className="w-px h-12 bg-gradient-to-b from-white/20 to-transparent" />
        </motion.div>
      </section>

      {/* Feature Section: Scale Data Engine style */}
      <section id="products" className="py-32 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center mb-24">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
                Engine One
             </div>
             <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">Sybella Data Engine</h2>
             <p className="text-white/40 max-w-2xl leading-relaxed text-lg">
                The AI lifecycle demands high-quality, ground-truth data. Sybella's data engine 
                orchestrates complex annotation and collection workflows with precision.
             </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
             <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-12 hover:border-blue-500/30 transition-all group overflow-hidden relative">
                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-600/5 blur-3xl rounded-full group-hover:bg-blue-600/10 transition-all" />
                <h3 className="text-2xl font-bold text-white mb-4">RLHF & Fine-Tuning</h3>
                <p className="text-white/40 mb-8 leading-relaxed">
                   Optimize your LLMs with high-integrity human feedback loops designed for African linguistic contexts.
                </p>
                <div className="flex items-center gap-2 text-blue-500 text-sm font-bold group-hover:gap-4 transition-all">
                  Learn More <ChevronRight className="w-4 h-4" />
                </div>
             </div>
             
             <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-12 hover:border-purple-500/30 transition-all group overflow-hidden relative">
                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-purple-600/5 blur-3xl rounded-full group-hover:bg-purple-600/10 transition-all" />
                <h3 className="text-2xl font-bold text-white mb-4">Data Labeling</h3>
                <p className="text-white/40 mb-8 leading-relaxed">
                   Computer vision, audio transcription, and sensor data labeling at hyperscale across the continent.
                </p>
                <div className="flex items-center gap-2 text-purple-500 text-sm font-bold group-hover:gap-4 transition-all">
                  Learn More <ChevronRight className="w-4 h-4" />
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* SyCore & Products Grid */}
      <section className="py-32 px-6 bg-[#050505]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">The Operating System for Modern Africa.</h2>
                <p className="text-white/40 text-lg leading-relaxed">
                  Bridge the digital divide with our suite of AI-driven SaaS platforms. 
                  Sybella Systems provides the backbone for education, finance, and operations.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                 {[
                   { title: 'SyCore™', icon: Cpu, desc: 'Enterprise ERP for logistics and retail.' },
                   { title: 'Ogera', icon: Users, desc: 'Flagship student employment platform.' },
                   { title: 'SyWeb™', icon: Code2, desc: 'High-performance custom web platforms.' },
                   { title: 'SyIntel™', icon: Database, desc: 'Advanced data analytics & insights.' },
                 ].map((item, i) => (
                   <div key={i} className="space-y-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                         <item.icon className="w-5 h-5 text-blue-500" />
                      </div>
                      <h4 className="text-white font-bold">{item.title}</h4>
                      <p className="text-xs text-white/40 uppercase tracking-wider font-bold">{item.desc}</p>
                   </div>
                 ))}
              </div>
            </div>

            <div className="relative">
               <div className="relative z-10 p-8 glass-card border border-white/10 rounded-[40px] shadow-2xl overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="space-y-4 p-8">
                     <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                        <span className="text-xs font-mono text-white/60">NODE_STATUS</span>
                        <span className="text-xs font-mono text-green-500 uppercase">Operational</span>
                     </div>
                     <div className="h-40 flex items-end gap-2 px-2">
                        {[40, 70, 45, 90, 65, 80, 50, 40, 85, 95].map((h, i) => (
                          <motion.div 
                            key={i}
                            initial={{ height: 0 }}
                            whileInView={{ height: `${h}%` }}
                            className="flex-1 bg-blue-600/20 rounded-t-sm"
                          />
                        ))}
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-xl">
                          <span className="block text-[8px] uppercase tracking-widest text-white/20 mb-1">Compute Load</span>
                          <span className="text-lg font-bold text-white font-mono">14.2%</span>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl">
                          <span className="block text-[8px] uppercase tracking-widest text-white/20 mb-1">Latency</span>
                          <span className="text-lg font-bold text-white font-mono">12ms</span>
                        </div>
                     </div>
                  </div>
               </div>
               
               {/* Decorative elements */}
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-600/20 blur-3xl rounded-full" />
               <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-600/20 blur-3xl rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-20">
            <div className="md:col-span-1 space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded-sm flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rotate-45" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">sybella</span>
              </div>
              <p className="text-sm text-white/40 leading-relaxed font-medium">
                Pioneering high-integrity data infrastructure for the African AI revolution.
              </p>
              <div className="flex gap-4">
                <Twitter className="w-4 h-4 text-white/20 hover:text-white cursor-pointer transition-colors" />
                <Github className="w-4 h-4 text-white/20 hover:text-white cursor-pointer transition-colors" />
                <Linkedin className="w-4 h-4 text-white/20 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
            
            <div>
              <h5 className="text-white text-sm font-bold mb-6">Product</h5>
              <ul className="space-y-4 text-xs font-bold text-white/30 uppercase tracking-widest">
                <li><a href="#" className="hover:text-blue-500 transition-colors">SyCore™ ERP</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Ogera Platform</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">SyWeb™ Custom</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">SyIntel™ Data</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white text-sm font-bold mb-6">Company</h5>
              <ul className="space-y-4 text-xs font-bold text-white/30 uppercase tracking-widest">
                <li><a href="#" className="hover:text-blue-500 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Our Team</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white text-sm font-bold mb-6">Legal</h5>
              <ul className="space-y-4 text-xs font-bold text-white/30 uppercase tracking-widest">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
              © 2025 Sybella Systems Ltd. Kigali, Rwanda.
            </p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

