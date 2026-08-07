'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { WeeklyReportModal } from './WeeklyReportModal';
import { FileText, TriangleAlert as AlertTriangle, Clock } from 'lucide-react';

const EXEMPT_PATHS = ['/accountability', '/notifications', '/logout'];

export function WeeklyReportGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [needsReport, setNeedsReport] = useState(false);
  const [daysOverdue, setDaysOverdue] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [lastReportDate, setLastReportDate] = useState<string | null>(null);

  const checkReportStatus = useCallback(async () => {
    if (!profile?.id) return;
    setChecking(true);
    const { data } = await supabase
      .from('weekly_reports')
      .select('week_end, submitted_at')
      .eq('member_id', profile.id)
      .order('submitted_at', { ascending: false })
      .limit(1);

    const now = new Date();
    if (!data || data.length === 0) {
      // No report ever submitted — check if account is older than 6 days
      const joinedAt = new Date(profile.joined_at || profile.created_at);
      const daysSinceJoin = Math.floor((now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceJoin >= 6) {
        setDaysOverdue(daysSinceJoin - 5);
        setNeedsReport(true);
        setLastReportDate(null);
      } else {
        setNeedsReport(false);
      }
    } else {
      const lastReport = data[0] as { week_end: string; submitted_at: string };
      const lastDate = new Date(lastReport.submitted_at || lastReport.week_end);
      setLastReportDate(lastDate.toISOString());
      const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 6) {
        setDaysOverdue(daysSince - 5);
        setNeedsReport(true);
      } else {
        setNeedsReport(false);
      }
    }
    setChecking(false);
  }, [profile]);

  useEffect(() => {
    if (!loading && profile) {
      checkReportStatus();
    }
  }, [loading, profile, checkReportStatus]);

  // Block navigation if report is needed and user is not on an exempt page
  useEffect(() => {
    if (checking || !needsReport) return;
    const isExempt = EXEMPT_PATHS.some(p => pathname?.startsWith(p));
    if (!isExempt) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [checking, needsReport, pathname]);

  const handleSubmitted = () => {
    setShowModal(false);
    setNeedsReport(false);
    setDaysOverdue(0);
    checkReportStatus();
  };

  if (checking || !needsReport) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Block all content with an overlay when not on exempt pages */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-red-500 p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Weekly Report Overdue</h2>
                  <p className="text-sm text-white/80">Action required to continue</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
                <Clock size={18} className="text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">
                  {daysOverdue === 1
                    ? `Your weekly report is ${daysOverdue} day overdue.`
                    : `Your weekly report is ${daysOverdue} days overdue.`}
                </p>
              </div>

              <p className="text-sm text-slate-600">
                You haven&apos;t submitted a weekly report in over 6 days. This platform requires
                all team members — including administrators — to submit weekly reports regularly.
              </p>

              {lastReportDate && (
                <p className="text-xs text-slate-400">
                  Last report submitted: {new Date(lastReportDate).toLocaleDateString()}
                </p>
              )}

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  You can navigate to:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push('/accountability')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <FileText size={12} /> Submit Report
                  </button>
                  <button
                    onClick={() => router.push('/notifications')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Notifications
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-3 text-sm font-semibold bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <FileText size={16} /> Submit Weekly Report Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* The modal for submitting the report */}
      <WeeklyReportModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmitted={handleSubmitted}
        profileId={profile?.id || ''}
      />

      {/* Render children underneath but blocked by overlay */}
      <div className={showModal ? 'pointer-events-none select-none' : ''}>
        {children}
      </div>
    </>
  );
}
