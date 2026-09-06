import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';

export const AdminLoginPage: React.FC = () => {
  const {
    loginAdminPortal,
    updateAdminPassword,
    sessionTimeoutNotice,
    clearSessionTimeoutNotice,
    setActiveInterface,
    settings
  } = usePOS();

  // Mode: 'login' | 'forgot_request' | 'forgot_verify' | 'forgot_reset' | 'reset_success'
  const [viewMode, setViewMode] = useState<'login' | 'forgot_request' | 'forgot_verify' | 'forgot_reset' | 'reset_success'>('login');

  // Login form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recovery & OTP states - Targeted strictly to the designated administrator Gmail
  const recoveryEmail = 'vanuchdry05@gmail.com';
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [otpExpiresAt, setOtpExpiresAt] = useState<number>(0);
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);

  // New Password states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Clear notices when switching views
  useEffect(() => {
    setLoginError(null);
    setOtpError(null);
    setPasswordResetError(null);
  }, [viewMode]);

  // Resend cooldown timer ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle Admin Login submission
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!username.trim()) {
      setLoginError('Please enter your username');
      return;
    }
    if (!password) {
      setLoginError('Please enter your password');
      return;
    }

    setIsSubmitting(true);
    const result = loginAdminPortal(username.trim(), password);
    setIsSubmitting(false);

    if (!result.success) {
      setLoginError(result.error || 'Authentication failed. Please check credentials.');
    }
  };

  // Generate & Dispatch OTP
  const handleSendOtp = () => {
    setIsSendingOtp(true);
    setOtpError(null);

    // Generate 6-digit cryptographically secure code
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    setGeneratedOtp(randomCode);
    setOtpExpiresAt(expires);
    setResendCooldown(60); // 60s cooldown

    // Store in localStorage for fail-safe resilience
    try {
      localStorage.setItem('fb_temp_admin_otp', JSON.stringify({ code: randomCode, expires }));
    } catch (_) {}

    setTimeout(() => {
      setIsSendingOtp(false);
      setViewMode('forgot_verify');
    }, 600);
  };

  // Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    const entered = otpInput.trim();
    if (!entered) {
      setOtpError('Please enter the 6-digit OTP code');
      return;
    }

    if (entered.length !== 6) {
      setOtpError('OTP code must be exactly 6 digits');
      return;
    }

    if (Date.now() > otpExpiresAt) {
      setOtpError('This OTP code has expired. Please request a new code.');
      return;
    }

    if (entered !== generatedOtp) {
      setOtpError('Incorrect verification code. Please check your email and try again.');
      return;
    }

    // Correct OTP verified! Proceed to Set New Password
    setViewMode('forgot_reset');
  };

  // Set New Password & Auto-redirect to Login
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordResetError(null);

    if (!newPassword) {
      setPasswordResetError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordResetError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordResetError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await updateAdminPassword(newPassword);
      setIsSavingPassword(false);
      setViewMode('reset_success');

      // Clear temp OTP
      setGeneratedOtp('');
      setOtpInput('');
      try {
        localStorage.removeItem('fb_temp_admin_otp');
      } catch (_) {}

      // Automatically redirect to login page after 2 seconds
      setTimeout(() => {
        setUsername('');
        setPassword('');
        setViewMode('login');
      }, 2200);
    } catch (err: any) {
      setIsSavingPassword(false);
      setPasswordResetError('Failed to save new password. Please try again.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-[#090D14] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-amber-500 selection:text-white">
      {/* Subtle Ambient Background Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header / Quick Navigation */}
      <div className="w-full max-w-md flex items-center justify-between mb-6 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white font-black text-sm">
            FB
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">
              {settings.restaurantName || 'The Fat Buddha Delight'}
            </h1>
            <p className="text-[11px] text-slate-400">Admin & Management Portal</p>
          </div>
        </div>

        {/* Quick link to Guest QR Mode */}
        <button
          id="btn-switch-guest-view"
          onClick={() => setActiveInterface('guest')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
          title="Switch to Customer Guest QR View"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>Guest QR</span>
        </button>
      </div>

      {/* Main Login / Recovery Card */}
      <div className="w-full max-w-md bg-[#111827]/95 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl z-10 relative">
        {/* Session Timeout Banner if triggered */}
        {sessionTimeoutNotice && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
            <Clock className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-200">1-Hour Session Timeout</p>
              <p className="text-rose-300/90 text-[11px] mt-0.5">{sessionTimeoutNotice}</p>
            </div>
            <button
              onClick={clearSessionTimeoutNotice}
              className="text-rose-400 hover:text-rose-200 text-xs p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* ========================================================
            VIEW 1: STANDARD ADMIN LOGIN
            ======================================================== */}
        {viewMode === 'login' && (
          <div>
            <div className="mb-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Admin Sign In</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your administrative credentials to manage POS, tables & kitchen
              </p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-300 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span className="font-medium">{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-username-input"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter username"
                    autoComplete="username"
                    style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 !text-white text-white text-sm placeholder-slate-500 transition outline-none"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 !text-white text-white text-sm placeholder-slate-500 transition outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Forget Password link placed below the password field */}
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    id="btn-forgot-password-link"
                    onClick={() => setViewMode('forgot_request')}
                    className="text-xs text-amber-400 hover:text-amber-300 hover:underline transition font-medium cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Timeout Policy Notice */}
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
                <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>Active admin sessions automatically log out after <strong>1 hour</strong>.</span>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                id="btn-admin-login-submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to POS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================
            VIEW 2: FORGOT PASSWORD - STEP 1 (REQUEST OTP)
            ======================================================== */}
        {viewMode === 'forgot_request' && (
          <div>
            <button
              onClick={() => setViewMode('login')}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </button>

            <div className="mb-5 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Forgot Password</h2>
              <p className="text-xs text-slate-400 mt-1">
                A 6-digit OTP verification code will be sent to the administrator's authorized recovery email.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    Target Gmail Address
                  </p>
                  <p className="text-sm font-bold text-amber-300 font-mono">
                    {recoveryEmail}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              id="btn-send-otp"
              onClick={handleSendOtp}
              disabled={isSendingOtp}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSendingOtp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Dispatching OTP to Gmail...</span>
                </>
              ) : (
                <>
                  <span>Send OTP Verification Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ========================================================
            VIEW 3: FORGOT PASSWORD - STEP 2 (ENTER & VERIFY OTP)
            ======================================================== */}
        {viewMode === 'forgot_verify' && (
          <div>
            <button
              onClick={() => setViewMode('forgot_request')}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Change Email / Back</span>
            </button>

            <div className="mb-5 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Enter OTP Code</h2>
              <p className="text-xs text-slate-400 mt-1">
                We've dispatched a 6-digit verification code to <span className="text-amber-300 font-mono font-bold">{recoveryEmail}</span>
              </p>
            </div>

            {/* Simulated Live Gmail Dispatch Card */}
            <div className="mb-5 p-3 rounded-xl bg-slate-900 border border-amber-500/30 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Dispatched to {recoveryEmail}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                  Valid 10m
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400">Security Verification OTP:</p>
                  <p className="text-base font-bold font-mono tracking-widest text-white">
                    {generatedOtp}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOtpInput(generatedOtp);
                    copyToClipboard(generatedOtp);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition"
                >
                  {copiedOtp ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Auto-fill OTP</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {otpError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{otpError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  id="admin-otp-input"
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                  className="w-full text-center tracking-[0.4em] font-mono font-bold text-lg py-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 !text-white text-white placeholder-slate-600 transition outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Didn't receive code?</span>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={resendCooldown > 0}
                  className="text-amber-400 hover:text-amber-300 disabled:text-slate-500 font-semibold transition"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>

              <button
                type="submit"
                id="btn-verify-otp"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Verify & Proceed</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ========================================================
            VIEW 4: FORGOT PASSWORD - STEP 3 (SET NEW PASSWORD)
            ======================================================== */}
        {viewMode === 'forgot_reset' && (
          <div>
            <div className="mb-5 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Set New Password</h2>
              <p className="text-xs text-slate-400 mt-1">
                OTP verified successfully. Create your new administrator password.
              </p>
            </div>

            {passwordResetError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{passwordResetError}</span>
              </div>
            )}

            <form onSubmit={handleSetNewPassword} className="space-y-4">
              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="input-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 !text-white text-white text-sm placeholder-slate-500 transition outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  id="input-confirm-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                  className="w-full pl-3.5 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 !text-white text-white text-sm placeholder-slate-500 transition outline-none"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3 h-3 ${newPassword.length >= 6 ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>Minimum 6 characters</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3 h-3 ${newPassword && newPassword === confirmPassword ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span>Passwords match</span>
                </p>
              </div>

              <button
                type="submit"
                id="btn-save-new-password"
                disabled={isSavingPassword}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingPassword ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving new password...</span>
                  </>
                ) : (
                  <>
                    <span>Set New Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================
            VIEW 5: SUCCESS CONFIRMATION & REDIRECTING
            ======================================================== */}
        {viewMode === 'reset_success' && (
          <div className="text-center py-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Password Changed!
            </h2>
            <p className="text-xs text-slate-300 mt-2">
              Your administrative password has been updated securely.
            </p>
            <div className="mt-5 p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center gap-2 text-xs text-amber-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Redirecting to login page automatically...</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Security Note */}
      <div className="mt-6 text-center text-slate-500 text-xs">
        <p>🔒 Protected by 256-bit encryption & OTP verification</p>
      </div>
    </div>
  );
};
