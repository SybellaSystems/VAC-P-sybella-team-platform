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
    <div className="min-h-screen flex" style={{ background: 'hsl(215, 25%, 96%)' }}>
     
      {/* Centered panel */}
      <div className="w-full flex items-center justify-center p-8">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-6 lg:hidden">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">SS</span>
                </div>
                <span className="font-bold text-foreground">Sybella Systems</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Welcome back</h1>
              <p className="text-muted-foreground text-sm">Sign in to your VAC-P account</p>
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Google', provider: 'google' as const },
                  { label: 'GitHub', provider: 'github' as const },
                  { label: 'Microsoft', provider: 'azure' as const },
                ].map((provider) => (
                  <button
                    key={provider.provider}
                    type="button"
                    onClick={() => void signInWithProvider(provider.provider)}
                    className="rounded-2xl border border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/70"
                  >
                    Continue with {provider.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>or use email</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-destructive/8 border border-destructive/20 mb-5">
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
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@sybellasystems.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-input rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {!forgotPassword && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required={!forgotPassword}
                      disabled={forgotPassword}
                      className="w-full pl-10 pr-10 py-2.5 text-sm border border-input rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || (!email.trim() || (!forgotPassword && !password.trim()))}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Working...
                  </>
                ) : forgotPassword ? 'Send reset email' : 'Sign In'}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => {
                  setForgotPassword((current) => !current);
                  setError('');
                  setMessage('');
                }}
              >
                {forgotPassword ? 'Back to sign in' : 'Forgot password?'}
              </button>
            </div>

            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Access is restricted to Sybella Systems team members only.<br />
                Contact your administrator if you need access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
