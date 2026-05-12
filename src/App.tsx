/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Projects } from './pages/Projects';
import { Technologies } from './pages/Technologies';
import { Contact } from './pages/Contact';
import { Ogera } from './pages/Ogera';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30 selection:text-emerald-400">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/technologies" element={<Technologies />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/ogera" element={<Ogera />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

