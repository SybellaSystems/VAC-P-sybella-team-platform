'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Lock, Mail, CircleAlert as AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { signIn, signInWithProvider, sendPasswordResetEmail, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    if (forgotPassword) {
      const { error } = await sendPasswordResetEmail(email);
      if (error) {
        setError('Unable to send password reset email.');
      } else {
        setMessage('Password reset instructions have been sent if your email is registered.');
        setForgotPassword(false);
      }
      setSubmitting(false);
      return;
    }

    const { error } = await signIn(email, password);
    if (error) {
      setError('Invalid email or password. Please try again.');
      setSubmitting(false);
    } else {
      router.replace('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'linear-gradient(135deg, hsl(221, 83%, 53%) 0%, hsl(215, 25%, 27%) 100%)' }}>
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-border p-8">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-base">SS</span>
              </div>
              <div className="text-left">
                <p className="font-bold text-foreground text-base leading-tight">Sybella Systems</p>
                <p className="text-blue-600 text-[10px] font-semibold tracking-wide uppercase">VAC-P Platform</p>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Welcome back</h1>
            <p className="text-muted-foreground text-sm">Sign in to your VAC-P account</p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void signInWithProvider('google')}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted hover:border-primary/40"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>or use email</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-destructive/8 border border-destructive/20 mb-5 mt-4">
              <AlertCircle size={16} className="text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {message && (
            <div className="rounded-lg bg-emerald-100 border border-emerald-200 p-3.5 mb-5 text-sm text-emerald-900">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@sybellasystems.com" required
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-input rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" />
              </div>
            </div>

            {!forgotPassword && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required={!forgotPassword} disabled={forgotPassword}
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-input rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={submitting || (!email.trim() || (!forgotPassword && !password.trim()))}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">
              {submitting ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Working...</>) : forgotPassword ? 'Send reset email' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
            <button type="button" className="font-semibold text-primary hover:underline" onClick={() => { setForgotPassword((current) => !current); setError(''); setMessage(''); }}>
              {forgotPassword ? 'Back to sign in' : 'Forgot password?'}
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Access is restricted to Sybella Systems team members only.<br />
              Contact your administrator if you need access.
            </p>
            <p className="text-xs mt-2">
              <a href="https://sybellasystems.co.rw/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>
              <span className="mx-2 text-muted-foreground">·</span>
              <a href="https://sybellasystems.co.rw/terms-service" className="text-primary hover:underline">Terms of service</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
