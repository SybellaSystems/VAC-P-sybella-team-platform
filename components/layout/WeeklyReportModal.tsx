'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { X, FileText, Loader as Loader2, Check, ChevronLeft, ChevronRight } from 'lucide-react';

interface WeeklyReportModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  profileId: string;
}

export function WeeklyReportModal({ open, onClose, onSubmitted, profileId }: WeeklyReportModalProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    accomplishments: '',
    planned_tasks: '',
    blockers: '',
    highlights: '',
  });

  useEffect(() => {
    if (open) {
      setStep(0);
      setForm({ accomplishments: '', planned_tasks: '', blockers: '', highlights: '' });
    }
  }, [open]);

  const steps = [
    { key: 'accomplishments', label: 'Accomplishments', placeholder: 'What did you accomplish this week?', required: true },
    { key: 'planned_tasks', label: 'Planned Tasks', placeholder: 'What do you plan to work on next week?', required: true },
    { key: 'blockers', label: 'Blockers', placeholder: 'Any blockers or challenges? (Enter "None" if no blockers)', required: true },
    { key: 'highlights', label: 'Highlights', placeholder: 'Any highlights or wins to share?', required: false },
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;
  const isFirstStep = step === 0;
  const currentValue = form[currentStep.key as keyof typeof form];

  const handleSubmit = async () => {
    // Validate all required fields
    for (const s of steps) {
      if (s.required && !form[s.key as keyof typeof form].trim()) {
        toast.error(`Please fill in the "${s.label}" field`);
        setStep(steps.indexOf(s));
        return;
      }
    }

    setSaving(true);
    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 6);
      const weekEnd = new Date(now);

      const { error } = await supabase.from('weekly_reports').insert({
        member_id: profileId,
        week_start: weekStart.toISOString().split('T')[0],
        week_end: weekEnd.toISOString().split('T')[0],
        accomplishments: form.accomplishments.trim(),
        planned_tasks: form.planned_tasks.trim(),
        blockers: form.blockers.trim(),
        highlights: form.highlights.trim(),
        status: 'submitted',
        submitted_at: now.toISOString(),
      });

      if (error) throw error;
      toast.success('Weekly report submitted!');
      onSubmitted();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit report');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-5 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              <h2 className="text-base font-bold text-slate-900">Weekly Report</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <X size={16} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-slate-500">
              Step {step + 1} of {steps.length} · {currentStep.label}
              {!currentStep.required && <span className="ml-1 text-slate-400">(optional)</span>}
            </p>
            <span className="text-xs text-slate-500">{Math.round(((step + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{currentStep.label}</h3>
              {currentStep.required && <p className="text-xs text-red-500 mt-0.5">Required</p>}
            </div>
            <textarea
              value={currentValue}
              onChange={e => setForm({ ...form, [currentStep.key]: e.target.value })}
              placeholder={currentStep.placeholder}
              rows={6}
              autoFocus
              className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            {step > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase">Previous answers</p>
                {steps.slice(0, step).map((s, i) => (
                  <div key={s.key} className="text-xs text-slate-500">
                    <span className="font-medium">{s.label}:</span>{' '}
                    <span className="line-clamp-2">{form[s.key as keyof typeof form] || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={isFirstStep}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={15} /> Back
          </button>
          {isLastStep ? (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={16} />}
              {saving ? 'Submitting...' : 'Submit Report'}
            </button>
          ) : (
            <button
              onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
              disabled={currentStep.required && !currentValue.trim()}
              className="flex items-center gap-1 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60"
            >
              Next <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
