'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

type Workspace = {
  id: string;
  name: string;
  domain?: string;
  timezone?: string;
  billing_contact_email?: string;
  settings?: Record<string, any>;
};

export default function WorkspaceSettingsForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Partial<Workspace>>({});

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('workspaces').select('*').limit(1).single();
        if (error && error.code !== 'PGRST102') {
          console.error(error);
          toast({ title: 'Failed to load workspace', variant: 'destructive' });
        } else if (data) {
          setWorkspace(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [toast]);

  const handleChange = (k: string, v: any) => setWorkspace((s) => ({ ...s, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (workspace.id) {
        const { error } = await supabase.from('workspaces').update({
          name: workspace.name,
          domain: workspace.domain,
          timezone: workspace.timezone,
          billing_contact_email: workspace.billing_contact_email,
          settings: workspace.settings || {},
        }).eq('id', workspace.id);
        if (error) throw error;
        toast({ title: 'Workspace updated' });
      } else {
        const { data, error } = await supabase.from('workspaces').insert([{
          name: workspace.name || 'My Workspace',
          domain: workspace.domain,
          timezone: workspace.timezone,
          billing_contact_email: workspace.billing_contact_email,
          settings: workspace.settings || {},
        }]).select().single();
        if (error) throw error;
        setWorkspace(data);
        toast({ title: 'Workspace created' });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to save workspace', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
      <div>
        <label className="block text-sm font-medium">Workspace name</label>
        <input value={workspace.name || ''} onChange={(e) => handleChange('name', e.target.value)} className="mt-1 w-full" />
      </div>

      <div>
        <label className="block text-sm font-medium">Domain (optional)</label>
        <input value={workspace.domain || ''} onChange={(e) => handleChange('domain', e.target.value)} className="mt-1 w-full" />
      </div>

      <div>
        <label className="block text-sm font-medium">Timezone</label>
        <input value={workspace.timezone || 'UTC'} onChange={(e) => handleChange('timezone', e.target.value)} className="mt-1 w-full" />
      </div>

      <div>
        <label className="block text-sm font-medium">Billing contact email</label>
        <input value={workspace.billing_contact_email || ''} onChange={(e) => handleChange('billing_contact_email', e.target.value)} className="mt-1 w-full" />
      </div>

      <div className="pt-4">
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Save Workspace'}</button>
      </div>
    </form>
  );
}
