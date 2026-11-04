import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../api/client';
import { ShieldCheck, AlertCircle, KeyRound, User as UserIcon, Lock } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.login(username.trim(), password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-center items-center p-6 selection:bg-accent-faint selection:text-accent">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Stamp */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-paper-surface border border-paper-border text-[11px] font-mono uppercase tracking-widest text-ink-faint">
            <ShieldCheck className="w-3.5 h-3.5 text-sage" />
            <span>SECURE ACCESS GATEWAY</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">
            OpsPilot Console
          </h1>
          <p className="font-sans text-xs text-ink-muted">
            AI-Powered Operations Dispatch & Human Governance Platform
          </p>
        </div>

        {/* Authentication Card */}
        <div className="bg-paper-card border border-paper-border p-8 shadow-panel space-y-6">
          <div className="border-b border-paper-border pb-3">
            <h2 className="font-serif text-lg font-bold text-ink">
              Operator Sign In
            </h2>
            <p className="font-mono text-[11px] text-ink-faint mt-0.5">
              Enter authorized enterprise credentials to establish authenticated session
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-opstatus-critical/10 border border-opstatus-critical/30 text-xs font-mono text-opstatus-critical flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="username" 
                className="block text-xs font-mono uppercase tracking-wider text-ink-muted mb-1 font-semibold"
              >
                Username or Identity Ref
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-ink-faint absolute left-3 top-2.5" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. operator, manager, approver"
                  className="w-full pl-9 pr-3 py-2 bg-paper border border-paper-border text-xs font-mono text-ink focus:outline-none focus:border-ink transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label 
                htmlFor="password" 
                className="block text-xs font-mono uppercase tracking-wider text-ink-muted mb-1 font-semibold"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-ink-faint absolute left-3 top-2.5" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-paper border border-paper-border text-xs font-mono text-ink focus:outline-none focus:border-ink transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-ink text-paper text-xs font-mono uppercase tracking-wider font-semibold hover:bg-ink-muted transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-subtle mt-2"
            >
              {submitting ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Authenticate Session</span>
                </>
              )}
            </button>
          </form>

          {/* Security & Evaluation Note */}
          <div className="pt-4 border-t border-paper-border text-[11px] font-sans text-ink-faint leading-relaxed">
            <span className="font-mono font-semibold uppercase text-ink-muted text-[10px] block mb-1">
              Security Protocol Notice:
            </span>
            Identity is verified against Argon2id server-side password hashes. Brute-force lockout is enforced after 5 failed attempts. Demonstration credentials for local evaluation are documented in README.md.
          </div>
        </div>

        {/* Footer */}
        <div className="text-center font-mono text-[10px] text-ink-faint uppercase tracking-widest">
          OpsPilot v1.0.0 • Production Security Controls Active
        </div>
      </div>
    </div>
  );
};
