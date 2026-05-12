import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black py-20 px-6 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-4 w-4 border border-blue-500 rounded-sm rotate-45" />
              <span className="text-sm font-black tracking-[0.3em] uppercase text-white">sybella systems</span>
            </Link>
            <p className="mt-8 text-sm text-white/40 max-w-md leading-relaxed font-medium">
              Headquartered in Kigali. Engineering hyper-efficient digital infrastructure for the global enterprise.
              Powering the next era of African technical excellence.
            </p>
          </div>
          <div>
            <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-6">Directory</h3>
            <ul className="space-y-3 text-sm font-medium">
              <li><Link to="/about" className="text-white/40 hover:text-blue-400 transition-colors">About Us</Link></li>
              <li><Link to="/projects" className="text-white/40 hover:text-blue-400 transition-colors">Engineering</Link></li>
              <li><Link to="/technologies" className="text-white/40 hover:text-blue-400 transition-colors">Infrastructure</Link></li>
              <li><Link to="/ogera" className="text-white/40 hover:text-blue-400 transition-colors">Ogera Beta</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-6">Global</h3>
            <ul className="space-y-3 text-sm font-medium">
              <li><a href="#" className="text-white/40 hover:text-blue-400 transition-colors">LinkedIn</a></li>
              <li><a href="#" className="text-white/40 hover:text-blue-400 transition-colors">X / Twitter</a></li>
              <li><a href="#" className="text-white/40 hover:text-blue-400 transition-colors">Kigali Hub</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
          <p>© {new Date().getFullYear()} Sybella systems. All systems functional.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Security</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Status</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
