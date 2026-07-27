'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, LogOut, X, CircleCheck as CheckCircle } from 'lucide-react';

export function CheckInPrompt() {
  const { profile } = useAuth();
  const [show, setShow] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const dismissedToday = localStorage.getItem(`checkin-dismissed-${new Date().toISOString().split('T')[0]}`);
    if (dismissedToday === 'true') {
      setDismissed(true);
      return;
    }
    checkStatus();
  }, [profile]);

  const checkStatus = async () => {
    if (!profile) return;
    const today = new Date().toISOString().split('T')[0];
    const [cinRes, coutRes] = await Promise.all([
      supabase.from('daily_check_ins').select('status').eq('member_id', profile.id).eq('check_in_date', today).maybeSingle(),
      supabase.from('daily_check_outs').select('status').eq('member_id', profile.id).eq('check_out_date', today).maybeSingle(),
    ]);
    const cinDone = (cinRes.data as any)?.status === 'submitted';
    const coutDone = (coutRes.data as any)?.status === 'submitted';
    setCheckedIn(cinDone);
    setCheckedOut(coutDone);

    const hour = new Date().getHours();
    const morning = hour >= 5 && hour < 12;
    const evening = hour >= 12 && hour < 23;

    if (morning && !cinDone) setShow(true);
    else if (evening && !coutDone) setShow(true);
    else if (!cinDone || !coutDone) setShow(true);
  };

  const dismiss = () => {
    localStorage.setItem(`checkin-dismissed-${new Date().toISOString().split('T')[0]}`, 'true');
    setDismissed(true);
    setShow(false);
  };

  if (!show || dismissed || (!profile)) return null;

  const hour = new Date().getHours();
  const isMorning = hour >= 5 && hour < 12;
  const needsCheckIn = !checkedIn;
  const needsCheckOut = !checkedOut;

  const promptType = isMorning
    ? (needsCheckIn ? 'checkin' : (needsCheckOut ? 'checkout' : null))
    : (needsCheckOut ? 'checkout' : (needsCheckIn ? 'checkin' : null));

  if (!promptType) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-xl shadow-2xl border border-blue-200 overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${promptType === 'checkin' ? 'bg-blue-50' : 'bg-amber-50'}`}>
            {promptType === 'checkin' ? <LogIn size={18} className="text-blue-600" /> : <LogOut size={18} className="text-amber-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {promptType === 'checkin' ? 'Good morning!' : 'Before you wrap up...'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {promptType === 'checkin'
                ? "You haven't checked in yet. Let your team know your plan for today."
                : "You haven't checked out yet. Share what you accomplished today."}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <a
                href="/check-in"
                className="px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {promptType === 'checkin' ? 'Check In Now' : 'Check Out Now'}
              </a>
              <button
                onClick={dismiss}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          <button onClick={dismiss} className="p-1 rounded-lg hover:bg-muted text-muted-foreground flex-shrink-0">
            <X size={14} />
          </button>
        </div>
        {(checkedIn || checkedOut) && (
          <div className="px-4 pb-3 flex gap-3 text-[10px] text-muted-foreground">
            {checkedIn && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle size={10} /> Checked in
              </span>
            )}
            {checkedOut && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle size={10} /> Checked out
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
