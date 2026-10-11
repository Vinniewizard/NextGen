import React, { useState, useEffect } from 'react';
import { 
  X, Mail, Lock, Phone, ArrowRight, CheckCircle2, Eye, EyeOff, 
  ShieldCheck, Sparkles, KeyRound, AlertCircle, Check, Info 
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onSuccess: (user: any) => void;
  initialView?: 'login' | 'register' | 'forgot_password' | 'reset_password';
}

type AuthView = 'login' | 'register' | 'forgot_password' | 'reset_password';

export default function AuthModal({ isOpen, onClose, theme, onSuccess, initialView }: AuthModalProps) {
  const [view, setView] = useState<AuthView>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Form states
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Kenya');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    if (isOpen && initialView) {
      setView(initialView);
      if (initialView === 'reset_password') {
        const savedToken = localStorage.getItem('pending_reset_token');
        if (savedToken) {
          setResetToken(savedToken);
          localStorage.removeItem('pending_reset_token');
        }
      }
    }
  }, [isOpen, initialView]);

  // Google SSO Callback listener
  useEffect(() => {
    const handleGoogleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const { user, token } = event.data;
        if (user && token) {
          localStorage.setItem('knex_current_user', JSON.stringify(user));
          localStorage.setItem('knex_token', token);
          localStorage.setItem('knex_current_user', JSON.stringify(user));
          localStorage.setItem('knex_token', token);
          onSuccess(user);
          onClose();
        }
      }
    };
    window.addEventListener('message', handleGoogleMessage);
    return () => window.removeEventListener('message', handleGoogleMessage);
  }, [onSuccess, onClose]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  // Smart Password Strength Evaluation
  const calculatePasswordStrength = (pwd: string) => {
    let score = 0;
    if (!pwd) return { score: 0, label: 'None', color: 'bg-slate-700' };
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500', width: 'w-1/4' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500', width: 'w-2/4' };
    if (score === 3 || score === 4) return { score: 3, label: 'Good', color: 'bg-yellow-400', width: 'w-3/4' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500', width: 'w-full' };
  };

  const passwordStrength = calculatePasswordStrength(password);
  const isLengthValid = password.length >= 8;
  const hasLetterAndNumber = /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
  const isMatching = view !== 'register' && view !== 'reset_password' ? true : (password.length > 0 && password === confirmPassword);

  const countryFormats: Record<string, { code: string; length: number }> = {
    'Kenya': { code: '254', length: 12 },
    'Uganda': { code: '256', length: 12 },
    'Tanzania': { code: '255', length: 12 },
    'Nigeria': { code: '234', length: 13 },
    'South Africa': { code: '27', length: 11 },
    'United States': { code: '1', length: 11 },
    'United Kingdom': { code: '44', length: 12 },
    'Germany': { code: '49', length: 12 },
  };

  const handleGoogleSignIn = async () => {
    setFormError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/google/url');
      if (!res.ok) throw new Error('Failed to fetch authentication URL.');
      const data = await res.json();
      if (!data.success || !data.url) throw new Error('Could not initialize Google authentication.');
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;
      
      const popup = window.open(
        data.url,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=yes`
      );
      
      if (!popup) {
        setFormError('Popup blocked! Please allow popups for this site to sign in with Google.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to start Google sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const getDeviceDetails = () => {
    let deviceId = localStorage.getItem('knex_device_id');
    if (!deviceId) {
      deviceId = 'dev-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('knex_device_id', deviceId);
    }
    const deviceInfo = `${navigator.platform || 'Unknown OS'} | ${navigator.userAgent} | Screen: ${window.screen.width}x${window.screen.height}`;
    return { deviceId, deviceInfo };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const { deviceId, deviceInfo } = getDeviceDetails();
    
    if (view === 'register') {
      if (password.length < 8) {
        setFormError('Password must be at least 8 characters long.');
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Passwords do not match.');
        setIsLoading(false);
        return;
      }

      let cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '');
      const format = countryFormats[country];
      if (format && cleanPhone && !cleanPhone.startsWith(format.code)) {
        cleanPhone = format.code + cleanPhone;
      }

      const params = new URLSearchParams(window.location.search);
      const referredBy = params.get('ref');

      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: cleanEmail, 
          phone: cleanPhone, 
          password, 
          fullName: cleanEmail.split('@')[0], 
          country, 
          referredBy,
          rememberMe,
          deviceId,
          deviceInfo
        })
      })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Registration failed.');
        }
        return data;
      })
      .then((data) => {
        setSuccessMsg(data.message || 'Account created successfully! Welcome to Knex Trading.');
        setIsLoading(false);
        localStorage.setItem('knex_current_user', JSON.stringify(data.user));
        localStorage.setItem('knex_token', data.token);
        setTimeout(() => {
          onSuccess(data.user);
          onClose();
          setSuccessMsg('');
        }, 1200);
      })
      .catch((err) => {
        setFormError(err.message || 'Registration error occurred. Please verify your details.');
        setIsLoading(false);
      });

    } else if (view === 'login') {
      const endpoint = '/api/auth/login';
      const body = { email: cleanEmail, password, rememberMe, deviceId, deviceInfo };
      
      console.log('DEBUG: AuthModal Login Request Body', body);

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Invalid credentials.');
        }
        return data;
      })
      .then((data) => {
        setIsLoading(false);
        localStorage.setItem('knex_current_user', JSON.stringify(data.user || { role: 'admin' }));
        localStorage.setItem('knex_token', data.token || 'admin-token');
        onSuccess(data.user || { role: 'admin' });
        onClose();
      })
      .catch((err) => {
        setFormError(err.message || 'Invalid email or password.');
        setIsLoading(false);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Knex Security', { body: 'A login attempt was performed on your Knex account.' });
        }
      });

    } else if (view === 'forgot_password') {
      fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to request password reset.');
        }
        return data;
      })
      .then((data) => {
        setIsLoading(false);
        setSuccessMsg(data.message || 'Reset code sent to your email.');
        setTimeout(() => {
          setView('reset_password');
          setSuccessMsg('');
        }, 2000);
      })
      .catch((err) => {
        setFormError(err.message || 'Network error occurred. Please try again.');
        setIsLoading(false);
      });
      
    } else if (view === 'reset_password') {
      if (password.length < 8) {
        setFormError('New password must be at least 8 characters long.');
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Passwords do not match.');
        setIsLoading(false);
        return;
      }
      
      fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp: resetToken, newPassword: password })
      })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to reset password.');
        }
        return data;
      })
      .then((data) => {
        setIsLoading(false);
        setSuccessMsg(data.message || 'Password reset successfully!');
        setTimeout(() => {
          setView('login');
          setSuccessMsg('');
        }, 2000);
      })
      .catch((err) => {
        setFormError(err.message || 'Network error occurred. Please try again.');
        setIsLoading(false);
      });
    }
  };

  const switchView = (newView: AuthView) => {
    setView(newView);
    setSuccessMsg('');
    setFormError('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className={`relative w-full max-w-md overflow-hidden rounded-3xl shadow-2xl transition-all border ${
        isDark ? 'bg-[#181a20] border-[#2b313a] text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
      }`}>
        
        {/* Top Brand Banner */}
        <div className="relative p-6 pb-4 bg-gradient-to-b from-[#202630] to-[#181a20] border-b border-[#2b313a]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-yellow-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-yellow-500/20">
                K
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base text-white tracking-tight">Knex Trading</span>
                  <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-mono text-[9px] font-bold">
                    PRO
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>256-Bit SSL Encrypted Escrow & Brokerage</span>
                </div>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Selector */}
          {(view === 'login' || view === 'register') && (
            <div className="flex items-center p-1 mt-4 rounded-xl bg-[#0b0e11] border border-[#2b313a]">
              <button
                type="button"
                onClick={() => switchView('login')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  view === 'login'
                    ? 'bg-[#fcd535] text-[#0b0e11] font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => switchView('register')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  view === 'register'
                    ? 'bg-[#fcd535] text-[#0b0e11] font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Register</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px]">
                  +$10
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="p-6">
          {successMsg ? (
            <div className="flex flex-col items-center justify-center py-6 text-center animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 animate-bounce">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-black text-white">Action Confirmed</h3>
              <p className="mt-1 text-xs text-slate-300 max-w-xs">{successMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
              {formError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3 rounded-xl flex items-start gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Bonus / Demo Notice for Register View */}
              {view === 'register' && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-500/10 via-emerald-500/10 to-blue-500/10 border border-yellow-500/20 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-slate-300 leading-snug">
                    <span className="font-bold text-yellow-400 block">Instant Onboarding Package:</span>
                    Includes <span className="text-white font-bold">$10,000 Practice Demo</span> + <span className="text-emerald-400 font-bold">$10 Real Bonus</span> credited on registration.
                  </div>
                </div>
              )}

              {/* Reset Token Field */}
              {view === 'reset_password' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Reset Token / OTP
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      className="block w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#0b0e11] border border-[#2b313a] text-white focus:border-yellow-400 focus:outline-none transition-all font-mono"
                      placeholder="Paste 6-digit verification code"
                    />
                  </div>
                </div>
              )}

              {/* Email / Identifier Field */}
              {view !== 'reset_password' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>{view === 'login' ? 'Email or Registered Phone' : 'Email Address'}</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type={view === 'login' ? 'text' : 'email'}
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm bg-[#0b0e11] border border-[#2b313a] text-white focus:border-yellow-400 focus:outline-none transition-all"
                      placeholder={view === 'login' ? "trader@knextrading.com or +254..." : "your.email@domain.com"}
                    />
                  </div>
                </div>
              )}

              {/* Phone & Country (Register only) */}
              {view === 'register' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Country</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="block w-full px-3 py-2.5 rounded-xl text-xs bg-[#0b0e11] border border-[#2b313a] text-white focus:border-yellow-400 focus:outline-none cursor-pointer"
                    >
                      <option value="Kenya">Kenya (+254)</option>
                      <option value="Uganda">Uganda (+256)</option>
                      <option value="Tanzania">Tanzania (+255)</option>
                      <option value="Nigeria">Nigeria (+234)</option>
                      <option value="South Africa">South Africa (+27)</option>
                      <option value="United States">United States (+1)</option>
                      <option value="United Kingdom">United Kingdom (+44)</option>
                      <option value="Germany">Germany (+49)</option>
                      <option value="Other">Other Country</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Phone (for SMS OTP)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="h-3.5 w-3.5" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-[#0b0e11] border border-[#2b313a] text-white focus:border-yellow-400 focus:outline-none font-mono"
                        placeholder="712 345 678"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Password Field */}
              {(view === 'login' || view === 'register' || view === 'reset_password') && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      {view === 'register' || view === 'reset_password' ? 'Create Secure Password' : 'Password'}
                    </label>
                    {view === 'login' && (
                      <button 
                        type="button"
                        onClick={() => switchView('forgot_password')}
                        className="text-xs font-medium text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2.5 rounded-xl text-sm bg-[#0b0e11] border border-[#2b313a] text-white focus:border-yellow-400 focus:outline-none transition-all"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Smart Strength Meter on Register / Reset */}
                  {(view === 'register' || view === 'reset_password') && password.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Strength:</span>
                        <span className={`font-bold ${
                          passwordStrength.score >= 3 ? 'text-emerald-400' : passwordStrength.score === 2 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[#2b313a] rounded-full overflow-hidden">
                        <div className={`h-full ${passwordStrength.color} ${passwordStrength.width} transition-all duration-300`} />
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                        <span className={`flex items-center gap-1 ${isLengthValid ? 'text-emerald-400' : 'text-slate-500'}`}>
                          <Check className="w-3 h-3" /> 8+ Chars
                        </span>
                        <span className={`flex items-center gap-1 ${hasLetterAndNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                          <Check className="w-3 h-3" /> Letters & Numbers
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Password Field */}
              {(view === 'register' || view === 'reset_password') && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2.5 rounded-xl text-sm bg-[#0b0e11] border border-[#2b313a] text-white focus:border-yellow-400 focus:outline-none transition-all"
                      placeholder="Re-enter password"
                    />
                  </div>
                  {confirmPassword && (
                    <div className="text-[10px] pt-0.5">
                      {isMatching ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Passwords match
                        </span>
                      ) : (
                        <span className="text-rose-400">Passwords do not match</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Remember Me Checkbox */}
              {view === 'login' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded bg-[#0b0e11] border-[#2b313a] text-yellow-500 focus:ring-0 cursor-pointer"
                      />
                      <span>Remember me on this terminal</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading || ((view === 'register' || view === 'reset_password') && (!isLengthValid || !isMatching))}
                className="w-full mt-4 bg-gradient-to-r from-[#fcd535] to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20 cursor-pointer"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {view === 'login' && 'Sign In to Knex Terminal'}
                      {view === 'register' && 'Create Account & Claim $10 Bonus'}
                      {view === 'forgot_password' && 'Send Verification Code'}
                      {view === 'reset_password' && 'Confirm Password Change'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Google SSO */}
              {(view === 'login' || view === 'register') && (
                <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#2b313a]" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                      <span className="px-3 bg-[#181a20] text-slate-500">Or continue with</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all bg-[#0b0e11] hover:bg-[#2b313a] text-white border border-[#2b313a] shadow-sm cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 14.99 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.85 2.99C6.18 7.37 8.87 5.04 12 5.04z" />
                      <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.43c-.28 1.44-1.1 2.66-2.33 3.48v2.9l3.85 2.98c2.25-2.07 3.54-5.11 3.54-8.53z" />
                      <path fill="#FBBC05" d="M5.24 10.55c-.24-.71-.38-1.47-.38-2.25s.14-1.54.38-2.25L1.39 4.06C.5 5.84 0 7.82 0 9.9c0 2.08.5 4.06 1.39 5.84l3.85-2.99z" />
                      <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.85-2.9c-1.1.74-2.5 1.18-4.11 1.18-3.13 0-5.82-2.33-6.76-5.51L1.39 15.85C3.37 19.73 7.35 23 12 23z" />
                    </svg>
                    <span>Google One-Tap SSO</span>
                  </button>
                </>
              )}

              {/* Footer Switcher */}
              <div className="pt-2 text-center text-xs text-slate-400">
                {view === 'forgot_password' && (
                  <button 
                    type="button" 
                    onClick={() => switchView('login')}
                    className="font-bold text-yellow-400 hover:underline cursor-pointer"
                  >
                    ← Back to Log In
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
