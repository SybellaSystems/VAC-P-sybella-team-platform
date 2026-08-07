'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { CheckInPrompt } from '@/components/layout/CheckInPrompt';
import { CelebrationOverlay } from '@/components/layout/CelebrationOverlay';
import { WeeklyReportGuard } from '@/components/layout/WeeklyReportGuard';
import { Menu } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <div className="md:ml-64">
        {/* Mobile menu button - visible only on small screens */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden fixed top-3 left-3 z-30 p-2 rounded-lg bg-white shadow-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        {children}
        <CheckInPrompt />
        <CelebrationOverlay />
      </div>
    </div>
  );
}
