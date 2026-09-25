import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthBackgroundLandscape from './AuthBackgroundLandscape';
import { IconMail, IconLock, IconUser, IconArrowRight, IconShieldOutline, IconEye, IconEyeOff } from '../common/AppIcons';

export default function RegisterPage() {
  const { register, isAuthenticated, isAdmin, isUser, authLoading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // If already authenticated, redirect intelligently
  if (!authLoading && isAuthenticated) {
    if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
    if (isUser) return <Navigate to="/user/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter your full legal name or organization contact.');
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid official email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Public registration strictly registers a USER account
      const user = await register(trimmedName, trimmedEmail, password);
      if (user) {
        navigate('/user/dashboard', { replace: true });
      } else {
        navigate('/login', {
          state: { message: 'Account created successfully. Please sign in with your credentials.' },
        });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F7FC] text-[#0F1E36] flex flex-col justify-between items-center px-4 py-6 sm:py-10 font-sans selection:bg-[#1D4ED8] selection:text-white relative overflow-x-hidden">
      {/* Visual Reference-Accurate Background & Bottom Regional Logistics Landscape */}
      <AuthBackgroundLandscape />

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-[460px] mx-auto flex flex-col items-center my-auto">
        
        {/* Top Brand Header matching reference exactly */}
        <header className="w-full flex items-center justify-start gap-3.5 mb-6 px-1">
          {/* Circular NER Emblem */}
          <div className="w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full bg-[#0A1629] text-white flex items-center justify-center font-bold text-sm sm:text-base tracking-tight shrink-0 shadow-md">
            NER
          </div>

          {/* Thin Vertical Divider */}
          <div className="w-[1.5px] h-9 bg-[#1E293B]/40 shrink-0 self-center"></div>

          {/* Brand Stack */}
          <div className="flex flex-col justify-center">
            <h1 className="font-bold text-base sm:text-lg text-[#0A1629] leading-tight tracking-tight">
              Project Brahmaputra
            </h1>
            <p className="text-[11px] sm:text-xs text-[#556987] font-medium leading-normal mt-0.5">
              Govt. of India &bull; North Eastern Region
            </p>
          </div>
        </header>

        {/* Central White Elevated Auth Card */}
        <main className="w-full bg-white border border-[#D5E3F2] rounded-3xl sm:rounded-[28px] p-6 sm:p-9 shadow-[0_12px_40px_rgba(15,30,60,0.08)] backdrop-blur-sm">
          
          {/* Top Security/Operator Pill Badge */}
          <div className="flex justify-center mb-4 sm:mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#EAF2FC] border border-[#D4E4F7] text-[#0F294D] text-[10.5px] sm:text-[11px] font-bold tracking-wider uppercase">
              <IconShieldOutline className="w-3.5 h-3.5 text-[#0F294D] shrink-0" />
              <span>LOGISTICS OPERATOR ACCESS</span>
            </div>
          </div>

          {/* Card Header & Subtitle */}
          <div className="text-center mb-6 sm:mb-7">
            <h2 className="text-2xl sm:text-[28px] font-extrabold text-[#0A1629] tracking-tight leading-tight">
              Create Operator Account
            </h2>
            <p className="text-xs sm:text-[13px] text-[#556987] font-medium mt-1.5 max-w-[300px] mx-auto leading-relaxed">
              Join the North Eastern regional logistics intelligence grid
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div
              className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-fade-in"
              role="alert"
              aria-live="polite"
            >
              <span className="text-rose-600 font-bold shrink-0 mt-0.5">⚠</span>
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            
            {/* Full Name Field */}
            <div>
              <label
                htmlFor="reg-fullname"
                className="flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-[#0A1629] mb-1.5"
              >
                <IconUser className="w-4 h-4 text-[#0A1629]" />
                <span>Full Name / Operator Contact</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-[#7E93AE] pointer-events-none">
                  <IconUser className="w-4 h-4" />
                </div>
                <input
                  id="reg-fullname"
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kalita"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-3.5 py-3 bg-[#F9FBFE] border border-[#D0DFEF] rounded-xl sm:rounded-2xl text-xs sm:text-sm text-[#0A1629] font-medium placeholder-[#8FA5C0] focus:outline-hidden focus:border-[#1D4ED8] focus:bg-white focus:ring-3 focus:ring-[#1D4ED8]/15 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="reg-email"
                className="flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-[#0A1629] mb-1.5"
              >
                <IconMail className="w-4 h-4 text-[#0A1629]" />
                <span>Official Email Address</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-[#7E93AE] pointer-events-none">
                  <IconMail className="w-4 h-4" />
                </div>
                <input
                  id="reg-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@brahmaputra.gov.in"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-3.5 py-3 bg-[#F9FBFE] border border-[#D0DFEF] rounded-xl sm:rounded-2xl text-xs sm:text-sm text-[#0A1629] font-medium placeholder-[#8FA5C0] focus:outline-hidden focus:border-[#1D4ED8] focus:bg-white focus:ring-3 focus:ring-[#1D4ED8]/15 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="reg-password"
                className="flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-[#0A1629] mb-1.5"
              >
                <IconLock className="w-4 h-4 text-[#0A1629]" />
                <span>Create Password (min. 6 chars)</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-[#7E93AE] pointer-events-none">
                  <IconLock className="w-4 h-4" />
                </div>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-12 py-3 bg-[#F9FBFE] border border-[#D0DFEF] rounded-xl sm:rounded-2xl text-xs sm:text-sm text-[#0A1629] font-medium placeholder-[#8FA5C0] focus:outline-hidden focus:border-[#1D4ED8] focus:bg-white focus:ring-3 focus:ring-[#1D4ED8]/15 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 sm:right-1.5 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-[#7E93AE] hover:text-[#1D4ED8] hover:bg-slate-100/80 active:bg-slate-200/80 rounded-xl transition-all focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]/30 cursor-pointer touch-target"
                  tabIndex={0}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEye className="w-5 h-5 text-[#1D4ED8]" /> : <IconEyeOff className="w-5 h-5 text-[#7E93AE]" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="reg-confirm-password"
                className="flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-[#0A1629] mb-1.5"
              >
                <IconLock className="w-4 h-4 text-[#0A1629]" />
                <span>Confirm Password</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-[#7E93AE] pointer-events-none">
                  <IconLock className="w-4 h-4" />
                </div>
                <input
                  id="reg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-12 py-3 bg-[#F9FBFE] border border-[#D0DFEF] rounded-xl sm:rounded-2xl text-xs sm:text-sm text-[#0A1629] font-medium placeholder-[#8FA5C0] focus:outline-hidden focus:border-[#1D4ED8] focus:bg-white focus:ring-3 focus:ring-[#1D4ED8]/15 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 sm:right-1.5 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-[#7E93AE] hover:text-[#1D4ED8] hover:bg-slate-100/80 active:bg-slate-200/80 rounded-xl transition-all focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]/30 cursor-pointer touch-target"
                  tabIndex={0}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEye className="w-5 h-5 text-[#1D4ED8]" /> : <IconEyeOff className="w-5 h-5 text-[#7E93AE]" />}
                </button>
              </div>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3.5 px-5 bg-[#152A54] hover:bg-[#0E1F3F] active:bg-[#09152C] text-white font-semibold text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-md shadow-[#152A54]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  <span>Enrolling Account...</span>
                </>
              ) : (
                <>
                  <IconArrowRight className="w-4 h-4 text-white shrink-0" />
                  <span>Register Operator Account</span>
                </>
              )}
            </button>
          </form>

          {/* Thin Divider */}
          <div className="my-6 border-t border-[#E5EFF8]"></div>

          {/* Back to Login Link */}
          <div className="text-center">
            <p className="text-xs sm:text-[13px] text-[#556987]">
              Already registered?{' '}
              <Link
                to="/login"
                className="font-bold text-[#1D4ED8] hover:text-[#1E40AF] transition-colors underline-offset-2 hover:underline"
              >
                Sign In to Command
              </Link>
            </p>
          </div>
        </main>
      </div>

      {/* Decorative Minimal Footer Note */}
      <footer className="relative z-10 text-center py-2 text-[10px] sm:text-[11px] text-[#64748B]/80 font-medium">
        Project Brahmaputra &bull; Logistics Command & Emergency Infrastructure
      </footer>
    </div>
  );
}
