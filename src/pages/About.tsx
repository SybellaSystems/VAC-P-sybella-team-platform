import { motion } from 'motion/react';
import { Target, Heart, ShieldCheck, Rocket, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export function About() {
  return (
    <div className="bg-[#050505] min-h-screen pt-32 pb-40 px-6">
      <Helmet>
        <title>About Us | Sybella Systems Engineering</title>
        <meta name="description" content="Learn about our mission in Kigali, our core values of precision and innovation, and the engineering collective behind Sybella Systems." />
      </Helmet>
      <div className="mx-auto max-w-7xl">
        {/* Editorial Header */}
        <header className="mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-6">Mission Critical</h1>
            <div className="flex flex-col lg:flex-row items-end justify-between gap-12">
              <h2 className="text-6xl md:text-[9rem] font-black uppercase tracking-tighter leading-[0.8] text-white max-w-4xl">
                Engineering <br />
                <span className="text-white/20">The Future.</span>
              </h2>
              <p className="text-white/40 max-w-sm text-lg font-medium leading-relaxed">
                We are a technical collective dedicated to building the high-performance digital infrastructure of the African continent.
              </p>
            </div>
          </motion.div>
        </header>

        {/* Story Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center mb-40">
          <div className="relative aspect-[4/5] bg-white/5 border border-white/10 overflow-hidden group">
            <img 
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000" 
              alt="Engineering" 
              className="w-full h-full object-cover grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            <div className="absolute bottom-12 left-12">
              <p className="text-6xl font-black text-white leading-none">2026</p>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mt-2">Established in Kigali</p>
            </div>
          </div>
          
          <div className="space-y-12">
            <div>
              <h3 className="text-4xl font-black uppercase tracking-tighter text-white mb-6">Born in Rwanda. <br />Globally Validated.</h3>
              <p className="text-white/40 text-lg font-medium leading-relaxed">
                Founded in the heart of Kigali Innovation City, Sybella Systems was established to prove that African engineering could lead the global tech frontier. 
                Our mission is to eliminate the divide between complexity and clarity.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-12">
              <div className="border-t border-white/10 pt-10">
                <p className="text-4xl font-black text-white">50+</p>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-2">Systems Active</p>
              </div>
              <div className="border-t border-white/10 pt-10">
                <p className="text-4xl font-black text-white">100%</p>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-2">Retention Rate</p>
              </div>
            </div>

            <Link to="/contact" className="inline-flex items-center gap-4 group">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Partner with us</span>
              <ArrowRight className="h-4 w-4 text-blue-500 group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>
        </section>

        {/* Values: Functional Cards */}
        <section className="mb-40">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1">
            {[
              { icon: Target, title: "Precision", desc: "Every byte of data is accounted for. No filler, only function." },
              { icon: Rocket, title: "Innovation", desc: "Pushing the limits of what infrastructure can handle." },
              { icon: ShieldCheck, title: "Integrity", desc: "Transparent operations anchored in zero-trust security." },
              { icon: Heart, title: "Community", desc: "Building tools that empower the people of Rwanda." },
            ].map((value) => (
              <div key={value.title} className="bg-white/[0.02] border border-white/5 p-12 hover:bg-white/[0.05] transition-all group">
                <value.icon className="h-8 w-8 text-blue-500 mb-8" />
                <h4 className="text-xl font-black uppercase tracking-tighter text-white mb-4">{value.title}</h4>
                <p className="text-white/40 text-sm font-medium leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Leaders Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
          <div>
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-6">Personnel</h3>
            <h4 className="text-5xl font-black uppercase tracking-tighter text-white mb-12">The Engineering Collective.</h4>
            <div className="space-y-8">
              <div className="border-l-2 border-blue-600 pl-8">
                <p className="text-xl font-bold text-white mb-2">Systems Architects</p>
                <p className="text-white/40 font-medium">Specializing in high-concurrency distributed networks.</p>
              </div>
              <div className="border-l-2 border-white/10 pl-8">
                <p className="text-xl font-bold text-white mb-2">Product Designers</p>
                <p className="text-white/40 font-medium">Crafting frictionless interfaces for complex workflows.</p>
              </div>
              <div className="border-l-2 border-white/10 pl-8">
                <p className="text-xl font-bold text-white mb-2">Ops Engineers</p>
                <p className="text-white/40 font-medium">Ensuring zero-downtime persistence at scale.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="aspect-square bg-white/5 border border-white/10 grayscale hover:grayscale-0 transition-all duration-700">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=500" className="w-full h-full object-cover opacity-50 hover:opacity-100" />
             </div>
             <div className="aspect-square bg-white/5 border border-white/10 grayscale hover:grayscale-0 transition-all duration-700 mt-12">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=500" className="w-full h-full object-cover opacity-50 hover:opacity-100" />
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}
