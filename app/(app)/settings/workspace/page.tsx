import React from 'react';
import { TopBar } from '@/components/layout/TopBar';
import WorkspaceSettingsForm from '@/components/WorkspaceSettingsForm';
import { createServerSupabase } from '@/lib/supabase';
import { requireUser, requireRole } from '@/lib/serverAuth';
import { redirect } from 'next/navigation';

export default async function WorkspaceSettingsPage() {
  try {
    const supabase = createServerSupabase();
    const user = await requireUser(supabase);
    await requireRole(supabase, user.id, ['admin', 'owner']);
  } catch (err) {
    return redirect('/unauthorized');
  }

  return (
    <div>
      <TopBar title="Workspace Settings" subtitle="Company & workspace configuration" />
      <div className="p-6">
        {/* WorkspaceSettingsForm is a client component that handles fetching/saving */}
        <WorkspaceSettingsForm />
      </div>
    </div>
  );
}
