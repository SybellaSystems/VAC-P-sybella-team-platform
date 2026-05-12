import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Mic, Share2, Users, Radio, Sparkles } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export function Ogera() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="bg-[#050505] min-h-screen pt-32 pb-40 overflow-hidden">
      <Helmet>
        <title>Ogera Beta | Join the Voice Speakeasy</title>
        <meta name="description" content="Join the private beta for Ogera SpeakEasy. A voice-first platform for African storytelling. Built by Sybella Systems." />
      </Helmet>
      {/* Hero Section */}
      <section className="relative px-6 flex flex-col items-center justify-center text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)]" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 mb-8">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Beta Launching Soon</span>
          </div>

          <h1 className="text-7xl md:text-[9rem] font-black uppercase tracking-tighter leading-[0.8] mb-12 text-white">
            OGERA. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20">SPEAKEASY.</span>
          </h1>

          {submitted ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-blue-500/10 border border-blue-500/30 p-12 rounded-sm"
            >
              <Sparkles className="h-12 w-12 text-blue-500 mx-auto mb-6" />
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">You're on the list.</h3>
              <p className="text-white/60 mb-8">Verification sent to your inbox. Early access begins Q3 2026.</p>
              <button 
                onClick={() => setSubmitted(false)}
                className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-all"
              >
                Sign up another account
              </button>
            </motion.div>
          ) : (
            <>
              <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto font-medium leading-relaxed mb-12">
                The next evolution of African storytelling. A voice-first platform built to amplify the narratives that matter. 
                Engineered by Sybella Systems.
              </p>

              <form 
                onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto"
              >
                <input 
                  type="email" 
                  required
                  placeholder="Enter your email"
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-sm px-6 text-sm font-medium text-white focus:border-blue-500 outline-none transition-all"
                />
                <button 
                  type="submit"
                  className="w-full sm:w-auto h-14 px-8 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap hover:bg-blue-500 transition-all font-sans"
                >
                  Join Beta
                </button>
              </form>
            </>
          )}
        </motion.div>

        {/* Floating Icons Background */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
          <motion.div 
            animate={{ y: [0, -20, 0] }} 
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-1/4 left-1/4"
          >
            <Mic className="h-12 w-12 text-blue-500" />
          </motion.div>
          <motion.div 
            animate={{ y: [0, 20, 0] }} 
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute top-1/3 right-1/4"
          >
            <Share2 className="h-10 w-10 text-white" />
          </motion.div>
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }} 
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute bottom-1/4 left-1/3"
          >
            <Radio className="h-16 w-16 text-blue-900" />
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mt-40 px-6 lg:px-12">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-1">
          {[
            {
              title: "Voice First",
              icon: Mic,
              desc: "Crystal-clear audio processing designed for mobile-first storytelling."
            },
            {
              title: "Social Graph",
              icon: Users,
              desc: "Connect through shared oral traditions and modern narratives."
            },
            {
              title: "AI Insights",
              icon: Sparkles,
              desc: "Automated transcription and topic extraction across 15+ African languages."
            }
          ].map((feature) => (
            <div key={feature.title} className="bg-white/[0.02] border border-white/5 p-12 hover:bg-white/[0.05] transition-all">
              <feature.icon className="h-10 w-10 text-blue-500 mb-8" />
              <h3 className="text-2xl font-black uppercase tracking-tighter text-white mb-4">{feature.title}</h3>
              <p className="text-white/40 text-sm font-medium leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Beta CTA */}
      <section className="mt-40 px-6">
        <div className="mx-auto max-w-4xl border border-blue-500/30 bg-blue-500/5 p-12 md:p-24 text-center rounded-sm">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white mb-8">
            Shape the Future <br />of African Voice.
          </h2>
          <p className="text-white/60 text-lg mb-12 font-medium">Limited spots available for the private beta. Sign up to secure your handle.</p>
          <button className="h-16 px-12 bg-white text-black text-[10px] font-black uppercase tracking-[0.4em] hover:bg-blue-600 hover:text-white transition-all">
            Apply for Access
            <ArrowRight className="inline-block ml-4 h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
