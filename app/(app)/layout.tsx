'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { CelebrationOverlay } from '@/components/layout/CelebrationOverlay';
import { WorkspaceChrome } from '@/components/layout/WorkspaceChrome';
import { SybellaLoadingState } from '@/components/ui/SybellaLoadingState';
import { Menu } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, profileError, loading, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || profile?.is_active === false || profile?.role === 'deleted')) {
      if (user && (profile?.is_active === false || profile?.role === 'deleted')) void signOut();
      router.replace('/login');
    }
  }, [user, profile?.is_active, profile?.role, loading, router, signOut]);

  if (loading) {
    return <SybellaLoadingState text="Loading VAC-P" />;
  }

  if (!user || profile?.is_active === false || profile?.role === 'deleted') return null;
  if (profileError || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="max-w-lg rounded-xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Unable to load your VAC-P profile</h1>
          <p role="alert" className="mt-2 text-sm text-slate-600">{profileError || 'Your account is signed in, but its profile is not available.'}</p>
          <button type="button" onClick={() => void refreshProfile()} className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
            Retry
          </button>
          <button type="button" onClick={() => void signOut()} className="ml-2 mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Sign out
          </button>
        </section>
      </main>
    );
  }

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
