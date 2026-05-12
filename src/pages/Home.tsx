import { motion } from 'motion/react';
import { ArrowRight, Terminal, Activity, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export function Home() {
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Sybella Systems",
    "operatingSystem": "Web-based",
    "applicationCategory": "EnterpriseSoftware",
    "description": "High-performance software engineering and digital infrastructure solutions for African enterprises.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5.0",
      "ratingCount": "24"
    },
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "USD"
    }
  };

  return (
    <div className="flex flex-col bg-[#050505]">
      <Helmet>
        <title>Sybella Systems | Future of African Digital Infrastructure</title>
        <meta name="description" content="Engage with Sybella Systems for enterprise-grade software engineering, cloud operations, and data analytics in Kigali, Rwanda. We build the digital backbone of Africa." />
        <meta name="keywords" content="Software Engineering Rwanda, Kigali Tech, Cloud Infrastructure Africa, Digital Transformation, Sybella Systems, Ogera SpeakEasy" />
        <link rel="canonical" href="https://sybellasystems.co.rw" />
        <script type="application/ld+json">
          {JSON.stringify(schemaMarkup)}
        </script>
      </Helmet>

      {/* Hero: Space X Style */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden px-6">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1614027164847-1b2809eb189d?auto=format&fit=crop&q=80&w=2000" 
            alt="African Tech Excellence - Developer with Glasses Celebrating Success" 
            className="w-full h-full object-cover opacity-30 grayscale hover:grayscale-0 transition-all duration-1000 brightness-50"
          />
          {/* Code Design Overlay: Matrix style particles */}
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden opacity-20">
            <div className="absolute inset-0 font-mono text-[8px] leading-none text-blue-500 whitespace-pre overflow-hidden select-none animate-marquee">
              {Array(100).fill(0).map(() => `010110101101 ${Math.random().toString(36).substring(7)}\n`).join('')}
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#050505]/95 to-[#050505]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.2)_0%,transparent_70%)]" />
        </div>
        
        <div className="relative z-10 text-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 mb-8">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Mission: Digital Sovereignty</span>
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Status:</span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Ready</span>
              </div>
            </div>
            
            <h1 className="text-6xl md:text-[10rem] font-black uppercase tracking-[-0.04em] leading-[0.8] text-white mb-10">
              BUILDING <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20">TOMORROW.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto font-medium leading-relaxed mb-12">
              Sybella Systems is the engineering foundation for high-performance enterprise architecture. 
              Built in Kigali, engineered for the global frontier.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                to="/contact"
                className="w-full sm:w-auto h-14 px-10 rounded-sm bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all duration-500"
              >
                Inquire
              </Link>
              <Link
                to="/projects"
                className="w-full sm:w-auto h-14 px-10 rounded-sm border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center hover:bg-white/5 transition-all duration-500"
              >
                Our Portofolio
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
        >
          <div className="h-12 w-[1px] bg-white/20" />
        </motion.div>
      </section>

      {/* Trust / Samsung Style Cleanliness */}
      <section className="py-24 border-y border-white/5 bg-black">
        <div className="mx-auto max-w-7xl px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 grayscale opacity-40 hover:opacity-100 hover:grayscale-0 transition-all duration-700">
            {['MTN', 'BANK OF KIGALI', 'RRA', 'VOLKSWAGEN', 'IHUB'].map((partner) => (
              <span key={partner} className="text-xl md:text-2xl font-black tracking-tighter text-white whitespace-nowrap">{partner}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Services: Interactive Detail */}
      <section className="py-32 px-6 lg:px-12 bg-black">
        <div className="mx-auto max-w-7xl">
          <div className="mb-24 flex flex-col md:flex-row items-end justify-between gap-8">
            <div className="max-w-2xl">
              <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Capabilities</h2>
              <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white leading-none">
                Engineering <br /> Efficiency.
              </h3>
            </div>
            <p className="text-white/40 max-w-sm text-sm font-medium">
              We eliminate friction between complex problems and elegant systems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            {[
              {
                title: "Custom Systems",
                icon: Terminal,
                desc: "High-concurrency backends and low-latency frontend architectures.",
                demo: "01"
              },
              {
                title: "Cloud Ops",
                icon: Layers,
                desc: "Autonomous infrastructure management and zero-downtime migrations.",
                demo: "02"
              },
              {
                title: "Deep Analytics",
                icon: Activity,
                desc: "Real-time data processing for enterprise-level decision intelligence.",
                demo: "03"
              }
            ].map((service) => (
              <div 
                key={service.title}
                className="group relative h-[400px] border border-white/10 bg-white/5 p-12 overflow-hidden hover:bg-white/10 transition-all duration-700"
              >
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <service.icon className="h-8 w-8 text-blue-500 mb-8" />
                    <h4 className="text-2xl font-black uppercase tracking-tighter text-white mb-4">{service.title}</h4>
                    <p className="text-white/50 text-sm font-medium leading-relaxed">{service.desc}</p>
                  </div>
                  <Link to="/ogera" className="flex items-center gap-4 group-hover:gap-6 transition-all duration-500 cursor-pointer">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 transition-colors">View Demo</span>
                    <ArrowRight className="h-4 w-4 text-blue-500" />
                  </Link>
                </div>
                <span className="absolute -bottom-10 -right-5 text-[15rem] font-black text-white/[0.02] -z-0 select-none group-hover:text-blue-500/5 transition-all duration-700">
                  {service.demo}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rwanda Focus CTA */}
      <section className="py-40 px-6 bg-black relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30rem] font-black text-white/[0.01] whitespace-nowrap select-none">
          KIGALI 2026
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter text-white mb-8">
            Powering the <br />Rwanda Tech Era.
          </h2>
          <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] mb-12">Kigali Innovation Hub • Rwanda</p>
          <Link
            to="/contact"
            className="inline-flex h-16 items-center justify-center px-12 bg-blue-500 text-black text-xs font-black uppercase tracking-[0.5em] hover:scale-105 transition-transform"
          >
            Connect
          </Link>
        </div>
      </section>
    </div>
  );
}
