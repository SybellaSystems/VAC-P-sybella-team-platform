'use client';

import React from 'react';
import { TopBar } from '@/components/layout/TopBar';
import SettingsForm from '@/components/SettingsForm';

export default function SettingsPage() {
  return (
    <div>
      <TopBar title="Settings" subtitle="Profile & workspace settings" />
      <div className="p-6">
        <SettingsForm />
      </div>
    </div>
  );
}
