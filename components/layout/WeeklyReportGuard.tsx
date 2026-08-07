'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Send, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const EXEMPT_PATHS = ['/check-in', '/login', '/unauthorized'];

function getWeekStart(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().split('T')[0];
}

export function WeeklyReportGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [needsReport, setNeedsReport] = useState(false);
  const [daysOverdue, setDaysOverdue] = useState(0);
  const [reportForm, setReportForm] = useState({
    accomplishments: '',
    planned_tasks: '',
    blockers: '',
    highlights: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [lastReportDate, setLastReportDate] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !profile) return;
    checkReportStatus();
  }, [loading, profile, pathname]);

  async function checkReportStatus() {
    if (!profile) return;
    const today = new Date();
    const currentWeekStart = getWeekStart(today);
    const lastWeekStart = getWeekStart(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));

    const { data } = await supabase
      .from('weekly_reports')
      .select('week_start, submitted_at')
      .eq('member_id', profile.id)
      .order('week_start', { ascending: false })
      .limit(1);

    const lastReport = data && data.length > 0 ? data[0] : null;

    if (lastReport) {
      setLastReportDate(lastReport.week_start);
      const reportWeekStart = lastReport.week_start;
      const daysSinceReport = Math.floor((today.getTime() - new Date(reportWeekStart).getTime()) / (24 * 60 * 60 * 1000));

      if (daysSinceReport >= 7) {
        setNeedsReport(true);
        setDaysOverdue(daysSinceReport - 6);
        setChecking(false);
        return;
      }
    } else {
      setDaysOverdue(7);
      setNeedsReport(true);
      setChecking(false);
      return;
    }

    setNeedsReport(false);
    setChecking(false);
  }

  async function submitReport() {
    if (!profile) return;
    setSubmitting(true);
    const today = new Date();
    const weekStart = getWeekStart(today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const { error } = await supabase.from('weekly_reports').insert({
      member_id: profile.id,
      week_start: weekStart,
      week_end: weekEnd.toISOString().split('T')[0],
      accomplishments: reportForm.accomplishments,
      planned_tasks: reportForm.planned_tasks,
      blockers: reportForm.blockers,
      highlights: reportForm.highlights,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === '23505') {
        const { error: updateError } = await supabase.from('weekly_reports').update({
          accomplishments: reportForm.accomplishments,
          planned_tasks: reportForm.planned_tasks,
          blockers: reportForm.blockers,
          highlights: reportForm.highlights,
          submitted_at: new Date().toISOString(),
        }).eq('member_id', profile.id).eq('week_start', weekStart);
        if (updateError) { toast.error('Failed to submit report'); setSubmitting(false); return; }
      } else {
        toast.error('Failed to submit report: ' + error.message);
        setSubmitting(false);
        return;
      }
    }

    toast.success('Weekly report submitted!');
    setNeedsReport(false);
    setChecking(false);
    setReportForm({ accomplishments: '', planned_tasks: '', blockers: '', highlights: '' });
    setSubmitting(false);
  }

  if (loading || checking) return <>{children}</>;

  const isExempt = EXEMPT_PATHS.some(p => pathname.startsWith(p));

  if (needsReport && !isExempt) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-red-600 px-6 py-5 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <AlertTriangle size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Weekly Report Overdue</h2>
              <p className="text-sm text-red-100">
                {daysOverdue === 1
                  ? 'Your report is 1 day overdue. You must submit it before continuing.'
                  : `Your report is ${daysOverdue} days overdue. You must submit it before continuing.`}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Clock size={16} className="text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                You cannot access other pages until you submit your weekly report. This applies to all team members including administrators.
              </p>
            </div>

            {lastReportDate && (
              <p className="text-xs text-slate-500">Your last report was for the week of {new Date(lastReportDate).toLocaleDateString()}.</p>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Accomplishments This Week *</label>
              <textarea
                value={reportForm.accomplishments}
                onChange={e => setReportForm({ ...reportForm, accomplishments: e.target.value })}
                rows={3}
                placeholder="What did you accomplish this week?"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Planned Tasks For Next Week *</label>
              <textarea
                value={reportForm.planned_tasks}
                onChange={e => setReportForm({ ...reportForm, planned_tasks: e.target.value })}
                rows={3}
                placeholder="What do you plan to work on next week?"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Blockers / Challenges</label>
              <textarea
                value={reportForm.blockers}
                onChange={e => setReportForm({ ...reportForm, blockers: e.target.value })}
                rows={2}
                placeholder="Any blockers or challenges faced?"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Highlights / Wins</label>
              <textarea
                value={reportForm.highlights}
                onChange={e => setReportForm({ ...reportForm, highlights: e.target.value })}
                rows={2}
                placeholder="Any highlights or wins to share?"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              onClick={submitReport}
              disabled={submitting || !reportForm.accomplishments.trim() || !reportForm.planned_tasks.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={16} /> Submit Weekly Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
