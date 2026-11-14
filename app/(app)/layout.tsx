'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { CelebrationOverlay } from '@/components/layout/CelebrationOverlay';
import { WorkspaceChrome } from '@/components/layout/WorkspaceChrome';
import { Menu } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || profile?.is_active === false || profile?.role === 'deleted')) {
      if (user && (profile?.is_active === false || profile?.role === 'deleted')) void signOut();
      router.replace('/login');
    }
  }, [user, profile?.is_active, profile?.role, loading, router, signOut]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading VAC-P...</p>
        </div>
      </div>
    );
  }

  if (!user || profile?.is_active === false || profile?.role === 'deleted') return null;

  return (
    <WorkspaceChrome>
      <div className="min-h-[65vh] md:flex">
        <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
        <div className="min-w-0 flex-1 md:ml-64">
        {/* Mobile menu button - visible only on small screens */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden fixed top-3 left-3 z-30 p-2 rounded-lg bg-white shadow-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        {children}
        <CelebrationOverlay />
        </div>
      </div>
    </WorkspaceChrome>
  );
}
