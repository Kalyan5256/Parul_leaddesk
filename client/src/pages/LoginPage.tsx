import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ParulLogo } from '../components/common/ParulLogo';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Eye, EyeOff, Lock, User, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { success, error: showError } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showError('Please enter both username/email and password');
      return;
    }

    setIsSubmitting(true);
    try {
      const userProfile = await login(username, password, rememberMe);
      success(`Welcome back, ${userProfile.full_name}!`);

      if (userProfile.role === 'employee') {
        navigate('/report');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      showError(err.message || 'Unable to authenticate. Check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-pu-mesh flex items-center justify-center p-4 sm:p-8 antialiased selection:bg-pu-gold selection:text-pu-navy">
      <div className="w-full max-w-5xl rounded-3xl glass-dark border border-white/20 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Column: Parul Branding & Value Proposition (Desktop) */}
        <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-pu-navy via-[#0c2e63] to-[#071a38] border-b lg:border-b-0 lg:border-r border-white/10">
          {/* Subtle Ambient Blobs */}
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-pu-gold/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-pu-red/15 blur-3xl pointer-events-none" />

          {/* Logo & Subtitle */}
          <div className="relative z-10">
            <ParulLogo size="lg" />
            <div className="mt-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pu-gold/20 text-pu-gold border border-pu-gold/30 mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Admission Intelligence Portal</span>
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-snug">
                Zero WhatsApp Chaos.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pu-gold via-amber-300 to-white">
                  Real-time Counselling Pipeline.
                </span>
              </h2>
              <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-md">
                Centralized student lead generation, dynamic multi-lead reporting,
                automated follow-up queues, and live conversion analytics for Parul University counsellors.
              </p>
            </div>
          </div>

          {/* Key Value Highlights */}
          <div className="relative z-10 mt-8 pt-6 border-t border-white/10 space-y-3">
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Instant additive daily reporting without overwriting records</span>
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Automated Indian 10-digit validation & duplicate detection</span>
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Strict counsellor isolation & manager command dashboard</span>
            </div>
          </div>

          <div className="relative z-10 text-[11px] text-slate-400 mt-6">
            © {new Date().getFullYear()} Parul University Admission Cell. All rights reserved.
          </div>
        </div>

        {/* Right Column: Clean Production Login Card */}
        <div className="lg:col-span-6 p-6 sm:p-12 flex flex-col justify-center bg-black/20">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Sign In to Portal
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Enter your credentials to access your counselling desk
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Username or Institutional Email"
                type="text"
                placeholder="Enter your email or username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                required
                autoComplete="username"
              />

              <div className="space-y-1">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-white transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-pu-gold focus:ring-pu-gold/30"
                  />
                  <span>Remember my workstation</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="text-slate-300 hover:text-pu-gold transition-colors font-medium hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                className="w-full text-base font-bold shadow-lg shadow-amber-500/20"
              >
                Sign In to LeadDesk
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
