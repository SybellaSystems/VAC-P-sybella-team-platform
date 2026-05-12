import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { name: 'About', path: '/about' },
  { name: 'Engineering', path: '/projects' },
  { name: 'Infrastructure', path: '/technologies' },
  { name: 'Ogera (Beta)', path: '/ogera' },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-12">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-6 w-6 border-2 border-blue-500 rounded-sm rotate-45 group-hover:rotate-90 transition-transform duration-500" />
            <span className="text-xl font-black tracking-[0.2em] uppercase text-white">sybella</span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:text-blue-400",
                location.pathname === item.path ? "text-blue-400" : "text-white/60"
              )}
            >
              {item.name}
            </Link>
          ))}
          <Link
            to="/contact"
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:bg-blue-600 hover:border-blue-600 transition-all font-sans"
          >
            Inquiry
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-white/60 hover:text-white"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <motion.div
        initial={false}
        animate={isOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
        className="md:hidden overflow-hidden bg-black border-b border-white/10"
      >
        <div className="flex flex-col gap-6 px-6 py-10">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={cn(
                "text-sm font-bold uppercase tracking-[0.2em]",
                location.pathname === item.path ? "text-blue-400" : "text-white/60"
              )}
            >
              {item.name}
            </Link>
          ))}
          <Link
            to="/contact"
            onClick={() => setIsOpen(false)}
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black"
          >
            Inquiry
          </Link>
        </div>
      </motion.div>
    </nav>
  );
}
