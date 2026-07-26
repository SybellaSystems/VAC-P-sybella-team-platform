'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEFAULT_WIZARD_DATA,
  WIZARD_STEPS,
  generateProjectCode,
  type ProjectWizardData,
} from '@/lib/wizard-types';
import { createProjectWithWizard } from '@/lib/wizard-create';
import {
  Step1ProjectType,
  Step2Owner,
  Step3Information,
  Step4Financial,
  Step5Documentation,
  Step6Requirements,
  Step7Team,
  Step8Timeline,
  Step9WBS,
  Step10Risks,
  Step11Communication,
  Step12Review,
} from '@/components/wizard/WizardSteps';
import { Briefcase, Building2, FileText, DollarSign, FolderOpen, ClipboardCheck, Users, Calendar, ListTree, TriangleAlert, MessageSquare, CircleCheck, ArrowLeft, ArrowRight, Check, X, Loader as Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STEP_ICONS: Record<string, React.ElementType> = {
  Briefcase,
  Building2,
  FileText,
  DollarSign,
  FolderOpen,
  ClipboardCheck,
  Users,
  Calendar,
  ListTree,
  TriangleAlert,
  MessageSquare,
  CircleCheck,
};

export default function ProjectWizardPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [data, setData] = useState<ProjectWizardData>(DEFAULT_WIZARD_DATA);
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ id: string; code: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !profile) {
      router.replace('/login');
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    if (!data.project_code) {
      setData((prev) => ({ ...prev, project_code: generateProjectCode() }));
    }
  }, [data.project_code]);

  const update = (patch: Partial<ProjectWizardData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  };

  const canAccess = (s: number) => s <= step;

  const next = () => {
    if (step < 12) setStep(step + 1);
  };
  const back = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCreate = async () => {
    if (!profile) return;
    if (!data.name.trim()) {
      toast.error('Project name is required');
      setStep(3);
      return;
    }
    setCreating(true);
    const result = await createProjectWithWizard(data, profile.id);
    setCreating(false);
    if (result.success && result.project_id) {
      setCreated({ id: result.project_id, code: result.project_code || '' });
      toast.success('Project created successfully!');
    } else {
      toast.error(result.error || 'Failed to create project');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Success screen
  if (created) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Project Created!</h2>
          <p className="text-sm text-slate-500 mb-1">
            Project &ldquo;{data.name}&rdquo; has been created successfully.
          </p>
          <p className="text-xs text-slate-400 mb-6">Code: {created.code}</p>
          <div className="space-y-2">
            <button
              onClick={() => router.push(`/projects/${created.id}`)}
              className="w-full py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              View Project
            </button>
            <button
              onClick={() => router.push('/projects')}
              className="w-full py-2.5 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentStep = WIZARD_STEPS.find((s) => s.id === step);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Step Navigation */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col fixed h-screen overflow-y-auto">
        <div className="px-5 py-5 border-b border-white/10">
          <button
            onClick={() => router.push('/projects')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-3"
          >
            <ArrowLeft size={16} /> Back to Projects
          </button>
          <h1 className="text-base font-bold">Project Creation Wizard</h1>
          <p className="text-xs text-slate-400 mt-0.5">VAC-P · Sybella Systems</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {WIZARD_STEPS.map((s) => {
            const Icon = STEP_ICONS[s.icon] || Briefcase;
            const isActive = step === s.id;
            const isComplete = s.id < step;
            return (
              <button
                key={s.id}
                onClick={() => s.id <= step && setStep(s.id)}
                disabled={s.id > step}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-primary text-white'
                    : isComplete
                    ? 'text-slate-300 hover:bg-white/5'
                    : 'text-slate-500 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'bg-white/20' : isComplete ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5'
                  }`}
                >
                  {isComplete ? <Check size={14} /> : <Icon size={14} />}
                </div>
                <span className="text-xs font-medium">{s.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Progress</span>
            <span className="font-semibold text-white">{Math.round((step / 12) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full mt-2">
            <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${(step / 12) * 100}%` }} />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Step content */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            {step === 1 && <Step1ProjectType data={data} update={update} />}
            {step === 2 && <Step2Owner data={data} update={update} />}
            {step === 3 && <Step3Information data={data} update={update} />}
            {step === 4 && <Step4Financial data={data} update={update} />}
            {step === 5 && <Step5Documentation data={data} update={update} />}
            {step === 6 && <Step6Requirements data={data} update={update} />}
            {step === 7 && <Step7Team data={data} update={update} />}
            {step === 8 && <Step8Timeline data={data} update={update} />}
            {step === 9 && <Step9WBS data={data} update={update} />}
            {step === 10 && <Step10Risks data={data} update={update} />}
            {step === 11 && <Step11Communication data={data} update={update} />}
            {step === 12 && <Step12Review data={data} update={update} />}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={back}
              disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={16} /> Back
            </button>

            {step < 12 ? (
              <button
                onClick={next}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                {creating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <Check size={16} /> Create Project
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
