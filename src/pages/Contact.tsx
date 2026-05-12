import { motion } from 'motion/react';
import { Send, ArrowRight, Mail, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';

export function Contact() {
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setFormState({ name: '', email: '', message: '' });
    }, 1500);
  };

  return (
    <div className="bg-[#050505] min-h-screen pt-32 pb-20 px-6">
      <Helmet>
        <title>Initiate Contact | Sybella Systems Hub</title>
        <meta name="description" content="Connect with our engineering team in Kigali. We are ready to architect your next high-performance enterprise solution." />
      </Helmet>
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-6">Contact</h2>
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] mb-12 text-white">
              Sybella <br />
              <span className="text-white/20 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10">Inquiry.</span>
            </h1>
            
            <div className="space-y-12 mt-20">
              <div className="flex gap-8 group">
                <div className="h-14 w-14 border border-white/10 rounded-sm flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-black transition-all">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Direct Line</p>
                  <p className="text-xl font-bold text-white tracking-tight">hello@sybella.rw</p>
                </div>
              </div>
              <div className="flex gap-8 group">
                <div className="h-14 w-14 border border-white/10 rounded-sm flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-black transition-all">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Operations Base</p>
                  <p className="text-xl font-bold text-white tracking-tight">Kigali Innovation Hub, Block B</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white/5 border border-white/10 p-10 md:p-16 rounded-sm relative overflow-hidden"
          >
            {submitted ? (
              <div className="py-20 text-center">
                <div className="mb-8 flex justify-center">
                   <div className="h-20 w-20 bg-blue-500 rounded-full flex items-center justify-center text-black">
                      <Send className="h-8 w-8" />
                   </div>
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tighter text-white mb-4">Transmission Received</h3>
                <p className="text-white/40 text-sm font-medium">Our engineers will review your inquiry within 24 hours.</p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="mt-12 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-white transition-colors"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formState.name}
                    onChange={(e) => setFormState({...formState, name: e.target.value})}
                    placeholder="Enter name"
                    className="w-full bg-transparent border-b border-white/20 py-4 focus:border-blue-500 outline-none transition-all text-white font-medium placeholder:text-white/10"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Work Email</label>
                  <input
                    required
                    type="email"
                    value={formState.email}
                    onChange={(e) => setFormState({...formState, email: e.target.value})}
                    placeholder="email@organization.com"
                    className="w-full bg-transparent border-b border-white/20 py-4 focus:border-blue-500 outline-none transition-all text-white font-medium placeholder:text-white/10"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Project Brief</label>
                  <textarea
                    required
                    rows={4}
                    value={formState.message}
                    onChange={(e) => setFormState({...formState, message: e.target.value})}
                    placeholder="Describe the problem to solve..."
                    className="w-full bg-transparent border-b border-white/20 py-4 focus:border-blue-500 outline-none transition-all text-white font-medium placeholder:text-white/10 resize-none"
                  />
                </div>
                <button
                  disabled={isSubmitting}
                  className="w-full h-16 bg-white text-black text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-4 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Processing..." : "Initiate Contact"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
