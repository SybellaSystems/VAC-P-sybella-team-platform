import { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { ROLE_CONFIG } from '../constants';
import { 
  User, 
  Mail, 
  Shield, 
  Lock, 
  Save, 
  RefreshCcw,
  KeyRound,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { getSupabase, updateUserProfile } from '../lib/supabase';

interface Props {
  user: { name: string; role: UserRole; email?: string; id?: string };
}

export default function Profile({ user }: Props) {
  const config = ROLE_CONFIG[user.role];
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email || '',
  });

  useEffect(() => {
    setFormData({
      name: user.name,
      email: user.email || '',
    });
  }, [user]);

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus(null);
    
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not initialized');

      const { error } = await supabase.auth.updateUser({
        data: { full_name: formData.name }
      });

      if (error) throw error;
      
      setStatus({ type: 'success', message: 'Profile updated successfully.' });
      setIsEditing(false);
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    
    setIsSaving(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not initialized');

      const { error } = await supabase.auth.updateUser({ 
        password: passwordData.new 
      });

      if (error) throw error;

      setStatus({ type: 'success', message: 'Password changed successfully.' });
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'Failed to change password.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-widest rounded">
            Security & Identity
          </div>
        </div>
        <h1 className="text-5xl font-light text-white tracking-tighter leading-none italic uppercase">
          User <span className="font-black text-blue-500 underline decoration-white/10 decoration-[8px] underline-offset-[12px]">Profile</span>
        </h1>
      </div>

      {status && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-xl border flex items-center gap-3 text-xs font-bold uppercase tracking-widest",
            status.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
          )}
        >
          {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {status.message}
        </motion.div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="space-y-6">
          <div className="bg-[#11141B] border border-white/10 rounded-3xl p-8 text-center shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-blue-600/20 to-transparent pointer-events-none" />
            
            <div className="relative mx-auto w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 p-1 mb-6 shadow-xl shadow-blue-600/20">
              <div className="w-full h-full rounded-full bg-[#0A0C10] flex items-center justify-center">
                <User className="w-10 h-10 text-white/50" />
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full border-2 border-[#11141B] text-white hover:bg-blue-500 transition-colors shadow-lg">
                <RefreshCcw className="w-3 h-3" />
              </button>
            </div>

            <h3 className="text-xl font-black text-white italic tracking-tight mb-1">{formData.name}</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-6">{formData.email}</p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
               <config.icon className="w-3.5 h-3.5 text-blue-500" />
               <span className="text-[10px] font-black uppercase tracking-widest text-[#D1D5DB]">{config.label}</span>
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/5 text-left">
              <div className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-4">Core Clearances</div>
              <div className="flex flex-wrap gap-2">
                {['AUTH_WRITE', 'WORKSPACE_READ', 'OPS_LOG'].map(tag => (
                  <span key={tag} className="text-[9px] px-2 py-1 bg-blue-500/5 text-blue-500/60 font-bold border border-blue-500/10 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Settings Forms */}
        <div className="md:col-span-2 space-y-8">
          {/* General Information */}
          <div className="bg-[#11141B] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-blue-500" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Account Identification</h3>
              </div>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:underline"
              >
                {isEditing ? 'Cancel Edit' : 'Modify Attributes'}
              </button>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Entity Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      disabled={!isEditing}
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className={cn(
                        "w-full bg-black/40 border-white/5 border rounded-xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-white/10",
                        !isEditing && "opacity-50 cursor-not-allowed"
                      )}
                      placeholder="Display Name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Primary Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      disabled={!isEditing}
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className={cn(
                        "w-full bg-black/40 border-white/5 border rounded-xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-white/10",
                        !isEditing && "opacity-50 cursor-not-allowed"
                      )}
                      placeholder="Email Address"
                    />
                  </div>
                </div>
              </div>
              
              {isEditing && (
                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded shadow-xl shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Commit Profile Changes
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Security / Password */}
          <div className="bg-[#11141B] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-red-500" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Hyper-Security Sync</h3>
              </div>
            </div>
            
            <form onSubmit={handleChangePassword} className="p-8 space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Current Encryption Key (Password)</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      type="password"
                      value={passwordData.current}
                      onChange={e => setPasswordData({...passwordData, current: e.target.value})}
                      className="w-full bg-black/40 border-white/5 border rounded-xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all"
                      placeholder="••••••••••••"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">New Identity Key</label>
                  <input 
                    type="password"
                    value={passwordData.new}
                    onChange={e => setPasswordData({...passwordData, new: e.target.value})}
                    className="w-full bg-black/40 border-white/5 border rounded-xl py-4 px-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    placeholder="New Password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Confirm Identity Key</label>
                  <input 
                    type="password"
                    value={passwordData.confirm}
                    onChange={e => setPasswordData({...passwordData, confirm: e.target.value})}
                    className="w-full bg-black/40 border-white/5 border rounded-xl py-4 px-4 text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all"
                    placeholder="Confirm Password"
                    required
                  />
                </div>
              </div>
              
              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
                >
                  Rotate Encryption Keys
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
