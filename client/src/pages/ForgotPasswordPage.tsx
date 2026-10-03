import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ParulLogo } from '../components/common/ParulLogo';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import {
  KeyRound,
  Mail,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetData, setResetData] = useState<{
    token: string;
    resetUrl: string;
    email: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim()) {
      showError('Please enter your institutional email or username');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/auth/forgot-password', {
        identifier: identifier.trim(),
      });

      if (!res.success) {
        throw new Error(res.message || 'Unable to process reset request');
      }

      setResetData({
        token: res.token,
        resetUrl: res.resetUrl || `/reset-password?token=${res.token}`,
        email: res.email || identifier,
      });

      success('Password reset link generated successfully!');
    } catch (err: any) {
      showError(err.message || 'Account not found. Please verify your username or email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyToken = () => {
    if (resetData?.token) {
      navigator.clipboard.writeText(resetData.token);
      setCopied(true);
      success('Reset token copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-pu-mesh flex items-center justify-center p-4 sm:p-8 antialiased selection:bg-pu-gold selection:text-pu-navy">
      <div className="w-full max-w-lg rounded-3xl glass-dark border border-white/20 shadow-2xl overflow-hidden relative">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-pu-gold/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-pu-red/15 blur-3xl pointer-events-none" />

        <div className="p-8 sm:p-10 relative z-10">
          <div className="flex items-center justify-between mb-8">
            <ParulLogo size="md" />
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </Link>
          </div>

          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pu-gold/20 text-pu-gold border border-pu-gold/30 mb-3">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Account Recovery</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Reset your password
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Enter your registered username or university email address to retrieve or generate a secure reset token.
            </p>
          </div>

          {resetData ? (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Reset Authorization Created!</span>
                </div>
                <p className="text-xs text-emerald-200/90 leading-relaxed">
                  Security authorization token has been generated for{' '}
                  <strong className="text-white font-semibold">{resetData.email}</strong>.
                </p>
              </div>

              {/* Direct Reset Action Card */}
              <div className="p-4 rounded-2xl glass-subtle border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Direct Reset Access:</span>
                  <span className="text-emerald-400 font-mono text-[11px]">Valid for 60 mins</span>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => navigate(resetData.resetUrl)}
                  className="w-full font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <span>Proceed to Set New Password</span>
                  <ExternalLink className="w-4 h-4" />
                </Button>

                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>Or copy security reset token:</span>
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      className="text-pu-gold hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copied ? 'Copied!' : 'Copy Token'}</span>
                    </button>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/10 font-mono text-[11px] text-slate-300 break-all select-all">
                    {resetData.token}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                <ShieldCheck className="w-4 h-4 text-pu-gold shrink-0" />
                <span>In production, this recovery link is dispatched to your university email.</span>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => {
                  setResetData(null);
                  setIdentifier('');
                }}
                className="w-full text-slate-300 text-xs"
              >
                Reset for another account
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Username or Institutional Email"
                type="text"
                placeholder="e.g. manager, employee1 or pooja.s@paruluniversity.ac.in"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
                autoFocus
              />

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-pu-gold shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Quick Test Accounts:</span>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {['manager', 'employee1'].map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setIdentifier(id)}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-pu-gold text-[11px] font-mono transition-colors"
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full text-base font-bold shadow-lg shadow-amber-500/20"
              >
                Generate Password Reset Link
              </Button>

              <div className="text-center text-xs text-slate-300 pt-2">
                <Link to="/login" className="text-pu-gold hover:underline">
                  ← Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default ForgotPasswordPage;
