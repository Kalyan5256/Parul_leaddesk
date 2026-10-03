import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { ParulLogo } from '../components/common/ParulLogo';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, [searchParams]);

  // Password strength calculations
  const hasMinLength = password.length >= 6;
  const hasLettersAndNumbers = /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      showError('Reset token is required. Please check your reset link.');
      return;
    }

    if (!hasMinLength) {
      showError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/auth/reset-password', {
        token: token.trim(),
        password,
      });

      if (!res.success) {
        throw new Error(res.message || 'Password reset failed');
      }

      setIsSuccess(true);
      success('Password successfully reset! You can now log in.');

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#cda250', '#8b1e2d', '#ffffff'],
      });
    } catch (err: any) {
      showError(err.message || 'Failed to reset password. The token may be expired or invalid.');
    } finally {
      setIsSubmitting(false);
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
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In →
            </Link>
          </div>

          {isSuccess ? (
            <div className="text-center space-y-6 py-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Password Updated!
                </h1>
                <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
                  Your Parul LeadDesk credentials have been securely updated. You can now proceed to log in with your new password.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Encrypted with standard bcrypt salt algorithm.</span>
              </div>

              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => navigate('/login')}
                className="w-full text-base font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pu-gold/20 text-pu-gold border border-pu-gold/30 mb-3">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Credential Update</span>
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Set new password
                </h1>
                <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Choose a new strong password for your university admission counselling desk account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Token Field (hidden or editable if not from URL) */}
                <div>
                  <Input
                    label="Security Reset Token"
                    type="text"
                    placeholder="rst_xxxx_xxxx"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                    helperText={token ? 'Valid authorization token detected' : 'Paste the reset token generated for your account'}
                  />
                </div>

                <div className="relative">
                  <Input
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-white"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    required
                    autoFocus
                  />
                </div>

                <div className="relative">
                  <Input
                    label="Confirm New Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-slate-400 hover:text-white"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                    required
                  />
                </div>

                {/* Password Criteria Checklist */}
                <div className="p-3.5 rounded-xl glass-subtle border border-white/10 space-y-1.5 text-xs">
                  <div className="text-slate-400 font-medium mb-1">Password Requirements:</div>
                  <div className="flex items-center gap-2">
                    {hasMinLength ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-500 shrink-0" />
                    )}
                    <span className={hasMinLength ? 'text-emerald-300' : 'text-slate-400'}>
                      At least 6 characters
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasLettersAndNumbers ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-500 shrink-0" />
                    )}
                    <span className={hasLettersAndNumbers ? 'text-emerald-300' : 'text-slate-400'}>
                      Contains letters and numbers (recommended)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {passwordsMatch ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-500 shrink-0" />
                    )}
                    <span className={passwordsMatch ? 'text-emerald-300' : 'text-slate-400'}>
                      Passwords match
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmitting}
                  disabled={!hasMinLength || (confirmPassword.length > 0 && !passwordsMatch)}
                  className="w-full text-base font-bold shadow-lg shadow-amber-500/20"
                >
                  Save New Password
                </Button>

                <div className="text-center pt-2 text-xs text-slate-400">
                  Need a new reset link?{' '}
                  <Link to="/forgot-password" className="text-pu-gold hover:underline font-semibold">
                    Request again
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default ResetPasswordPage;
