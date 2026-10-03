import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { ParulLogo } from '../components/common/ParulLogo';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import {
  UserPlus,
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { success, error: showError } = useToast();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [team, setTeam] = useState('Team A');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !username.trim() || !email.trim() || !password) {
      showError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/auth/register', {
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
        team,
      });

      if (!res.success) {
        throw new Error(res.message || 'Registration failed');
      }

      success(`Welcome to Parul LeadDesk, ${fullName}! Your counsellor desk is ready.`);

      // Log in with the newly registered credentials
      await login(username.trim().toLowerCase(), password);
      navigate('/report');
    } catch (err: any) {
      showError(err.message || 'Unable to complete registration. Check your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-pu-mesh flex items-center justify-center p-4 sm:p-8 antialiased selection:bg-pu-gold selection:text-pu-navy">
      <div className="w-full max-w-5xl rounded-3xl glass-dark border border-white/20 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Column: Brand & Security Info */}
        <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-pu-navy via-[#0c2e63] to-[#071a38] border-b lg:border-b-0 lg:border-r border-white/10">
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-pu-gold/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-pu-red/15 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <ParulLogo size="lg" />
            <div className="mt-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pu-gold/20 text-pu-gold border border-pu-gold/30 mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Counsellor Onboarding</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                Join the Parul
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pu-gold via-amber-300 to-white">
                  Admission Counselling Desk.
                </span>
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Register your counsellor account to track inquiries, schedule candidate follow-ups,
                and submit daily admission reports without manual WhatsApp mess.
              </p>
            </div>
          </div>

          {/* Security Notice on Roles */}
          <div className="relative z-10 mt-8 p-4 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-pu-gold font-bold">
              <ShieldCheck className="w-4 h-4 text-pu-gold" />
              <span>Role Security Notice</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Self-registration is available exclusively for <strong>Admission Counsellors (Employees)</strong>.
              Manager and Team Lead accounts are issued and provisioned securely by the central administration.
            </p>
          </div>

          <div className="relative z-10 text-[11px] text-slate-400 mt-6">
            Already have an active account?{' '}
            <Link to="/login" className="text-pu-gold hover:underline font-bold">
              Sign In to Portal
            </Link>
          </div>
        </div>

        {/* Right Column: Registration Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-black/20">
          <div className="max-w-md w-full mx-auto space-y-5">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-pu-gold" />
                <span>Create Counsellor Account</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Enter your details to initialize your workstation
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <Input
                label="Full Name"
                placeholder="e.g. Diya Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Username"
                  placeholder="e.g. diya_s"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                  helperText="Lowercase letters, numbers, _"
                  required
                />

                <Input
                  label="Contact Phone"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  leftIcon={<Phone className="w-4 h-4" />}
                />
              </div>

              <Input
                label="Institutional or Personal Email"
                type="email"
                placeholder="diya.s@paruluniversity.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-white"
                      aria-label="Toggle password"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                />

                <Select
                  label="Assigned Team"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  options={[
                    { value: 'Team A', label: 'Team A' },
                    { value: 'Team B', label: 'Team B' },
                  ]}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmitting}
                  className="w-full text-base font-bold shadow-lg shadow-amber-500/20"
                >
                  Register as Counsellor
                </Button>
              </div>
            </form>

            <div className="text-center pt-2 border-t border-white/10 text-xs text-slate-300">
              Already registered?{' '}
              <Link to="/login" className="text-pu-gold hover:underline font-bold">
                Sign in to your desk
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
