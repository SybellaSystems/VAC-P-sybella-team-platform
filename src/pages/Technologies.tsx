import { motion } from 'motion/react';
import { Terminal, Database, Server, Cloud, Cpu, Globe } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const technologies = [
  {
    category: "Interface",
    icon: Terminal,
    desc: "React-native and high-concurrency browser systems.",
    stack: ["React 19", "TypeScript", "Next.js", "Motion"]
  },
  {
    category: "Core Eng",
    icon: Database,
    desc: "Distributed databases and real-time state synchronization.",
    stack: ["PostgreSQL", "Node.js", "Redis", "Elastic"]
  },
  {
    category: "Infrastructure",
    icon: Server,
    desc: "Auto-scaling clusters with zero-downtime persistence.",
    stack: ["AWS Aurora", "Docker", "Kubernetes", "Vercel"]
  }
];

export function Technologies() {
  return (
    <div className="bg-[#050505] min-h-screen pt-32 pb-40 px-6">
      <Helmet>
        <title>Tech Stack | The Sybella Manifest</title>
        <meta name="description" content="Our engineered stack: React 19, TypeScript, PostgreSQL, Rust, and AWS Aurora. High-reliability infrastructure for the African digital frontier." />
      </Helmet>
      <div className="mx-auto max-w-7xl">
        <header className="mb-32">
          <h1 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-6">Digital Infrastructure</h1>
          <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] text-white">
            The Sybella <br />
            <span className="text-white/20">Manifesto.</span>
          </h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
           {technologies.map((tech) => (
             <div key={tech.category} className="border border-white/5 bg-white/[0.02] p-12 hover:bg-white/[0.05] transition-all group">
                <tech.icon className="h-10 w-10 text-blue-500 mb-8 group-hover:scale-110 transition-transform" />
                <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-4">{tech.category}</h3>
                <p className="text-white/40 text-sm font-medium leading-relaxed mb-8">{tech.desc}</p>
                <div className="flex flex-wrap gap-2">
                   {tech.stack.map(s => (
                     <span key={s} className="text-[10px] font-black text-white/20 border border-white/10 px-3 py-1 uppercase tracking-widest group-hover:text-blue-400 group-hover:border-blue-400 group-hover:bg-blue-400/5 transition-colors">{s}</span>
                   ))}
                </div>
             </div>
           ))}
        </div>

        {/* Technical Summary / Samsung Style Detail */}
        <section className="mt-40 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
               <h3 className="text-4xl font-black uppercase tracking-tighter text-white mb-8">Engineering Integrity.</h3>
               <p className="text-white/40 text-lg font-medium leading-relaxed mb-12">
                  Our systems are designed with a "Safety-First" architecture. 
                  Every byte is accounted for, every migration is tested against a mirror production environment.
               </p>
               <div className="grid grid-cols-2 gap-8">
                  <div className="border-t border-white/10 pt-8">
                     <p className="text-3xl font-black text-white">82ms</p>
                     <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Global P95</p>
                  </div>
                  <div className="border-t border-white/10 pt-8">
                     <p className="text-3xl font-black text-white">99.99%</p>
                     <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Uptime Goal</p>
                  </div>
               </div>
            </div>
            <div className="relative aspect-square border border-white/10 bg-white/[0.01] flex items-center justify-center overflow-hidden">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)]" />
               <Cpu className="h-64 w-64 text-blue-500/10 animate-pulse" />
            </div>
        </section>

        {/* Technical Grid Divider */}
        <div className="mt-40 grid grid-cols-2 md:grid-cols-4 border-y border-white/5 py-20 grayscale opacity-40">
           <div className="flex flex-col items-center gap-4">
              <Globe className="h-8 w-8 text-white" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Edge Nodes</span>
           </div>
           <div className="flex flex-col items-center gap-4">
              <Server className="h-8 w-8 text-white" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Bare Metal</span>
           </div>
           <div className="flex flex-col items-center gap-4">
              <Cloud className="h-8 w-8 text-white" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Hybrid Cloud</span>
           </div>
           <div className="flex flex-col items-center gap-4">
              <Terminal className="h-8 w-8 text-white" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Zero Trust</span>
           </div>
        </div>
      </div>
    </div>
  );
}
