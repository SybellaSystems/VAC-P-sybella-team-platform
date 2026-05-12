import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const projects = [
  {
    title: "National Logistics Hub",
    id: "OP-001",
    category: "Infrastructure",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1000",
    stats: ["84% Latency Reduction", "2M Daily Volume"]
  },
  {
    title: "FinConnect Gateway",
    id: "OP-002",
    category: "Financial Systems",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=1000",
    stats: ["99.99% Core Uptime", "East Africa nodes"]
  },
  {
    title: "EcoHarvest Ledger",
    id: "OP-003",
    category: "Agritech",
    image: "https://images.unsplash.com/photo-1595113316349-9fa4ee24f884?auto=format&fit=crop&q=80&w=1000",
    stats: ["Smart Contract Auto-Pay", "Blockchain-enabled"]
  }
];

export function Projects() {
  return (
    <div className="bg-[#050505] min-h-screen pt-32 pb-20 px-6">
      <Helmet>
        <title>Portfolio | Sybella Systems Operations Log</title>
        <meta name="description" content="A dossier of engineering excellence. Discover how Sybella Systems deploys high-concurrency infrastructure and secure financial systems across East Africa." />
      </Helmet>
      <div className="mx-auto max-w-7xl">
        <header className="mb-32">
          <h1 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-6">Operations Log</h1>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] text-white">
              Engineering <br />
              <span className="text-white/20">Portfolio.</span>
            </h2>
            <p className="max-w-xs text-white/40 text-sm font-medium leading-relaxed">
              Documenting the successful deployment of high-concurrency systems across the East African landscape.
            </p>
          </div>
        </header>

        <div className="space-y-40">
           {projects.map((project, idx) => (
             <motion.div 
               key={project.id}
               initial={{ opacity: 0, y: 50 }}
               whileInView={{ opacity: 1, y: 0 }}
               transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
               viewport={{ once: true }}
               className="group grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
             >
                <div className={`${idx % 2 === 0 ? 'lg:order-1' : 'lg:order-2'} lg:col-span-7 aspect-video bg-white/5 relative overflow-hidden`}>
                   <img 
                    src={project.image} 
                    alt={project.title} 
                    className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000"
                   />
                </div>
                <div className={`${idx % 2 === 0 ? 'lg:order-2' : 'lg:order-1'} lg:col-span-5`}>
                   <div className="flex items-center gap-4 mb-6">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{project.id}</span>
                      <div className="h-[1px] w-12 bg-white/10" />
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{project.category}</span>
                   </div>
                   <h3 className="text-4xl font-black uppercase tracking-tighter text-white mb-8">{project.title}</h3>
                   <div className="space-y-4 mb-10 text-white font-sans">
                      {project.stats.map(stat => (
                        <div key={stat} className="flex items-center gap-4 text-white/60">
                           <div className="w-1 h-1 bg-blue-500 rounded-full" />
                           <span className="text-sm font-medium">{stat}</span>
                        </div>
                      ))}
                   </div>
                   <Link to="/contact" className="inline-flex items-center gap-4 group/btn hover:bg-white hover:text-black px-6 py-3 rounded-sm transition-all duration-300">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Full Report</span>
                      <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-2 transition-transform" />
                   </Link>
                </div>
             </motion.div>
           ))}
        </div>
      </div>
    </div>
  );
}
