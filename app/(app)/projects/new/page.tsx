'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProjectCreateWizard from '@/components/ProjectCreateWizard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function NewProjectPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleComplete(data: any) {
    if (!profile) {
      setError('You must be signed in to create a project.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: data.name || 'Untitled project',
        description: data.description || '',
        customer_id: data.customerId || null,
        start_date: data.startDate || null,
        end_date: data.endDate || null,
        status: 'planning',
        priority: 'medium',
        budget: 0,
        spent: 0,
        progress: 0,
        created_by: profile.id,
      };

      const { error: insertErr } = await supabase.from('projects').insert(payload);
      if (insertErr) throw new Error(insertErr.message);

      toast({ title: 'Project created', description: `Project "${payload.name}" created.` });

      router.push('/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">New Project</h2>
      {error && <div className="mb-3 text-red-600">{error}</div>}
      <ProjectCreateWizard onComplete={handleComplete} />
      {saving && <div className="mt-3 text-sm text-gray-600">Creating project…</div>}
    </div>
  );
}
