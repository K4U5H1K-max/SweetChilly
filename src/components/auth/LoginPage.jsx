import React, { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { login, isAuthenticated, isAdmin, isUser, authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const successMessage = location.state?.message || '';

  // If already authenticated, redirect intelligently
  if (!authLoading && isAuthenticated) {
    if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
    if (isUser) return <Navigate to="/user/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both your official email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login(trimmedEmail, password);
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/user/dashboard', { replace: true });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Background Geodetic Ambient Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none"></div>

      {/* Top Header Datum Strip */}
      <header className="relative z-10 max-w-7xl mx-auto w-full flex items-center justify-between py-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-mono font-bold text-xs tracking-tight shadow-md">
            NER
          </div>
          <div>
            <span className="font-heading font-bold text-sm tracking-tight text-white block">
              Project Brahmaputra
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Govt. of India • North Eastern Region
            </span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Operations Gateway v1.0</span>
        </div>
      </header>

      {/* Main Login Form Container */}
      <main className="relative z-10 max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* Card Branding */}
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-[10px] uppercase font-bold tracking-wider mb-2">
              Secure Operations Access
            </span>
            <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">
              Sign In to Command
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Logistics intelligence & emergency accessibility platform
            </p>
          </div>

          {/* Success Banner (e.g. post-registration) */}
          {successMessage && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-fade-in" role="alert">
              <span className="text-rose-400 font-bold">⚠</span>
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Official Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@brahmaputra.gov.in"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors focus:outline-hidden"
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In to Platform</span>
              )}
            </button>
          </form>

          {/* Registration Navigation */}
          <div className="mt-6 pt-5 border-t border-slate-700/60 text-center">
            <p className="text-xs text-slate-400">
              Fleet operator without credentials?{' '}
              <Link
                to="/register"
                className="font-semibold text-blue-400 hover:text-blue-300 transition-colors underline-offset-4 hover:underline"
              >
                Create Operator Account
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer System Strip */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full py-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
        <span>Project Brahmaputra • National Logistics Grid</span>
        <span>Secure TLS • Dual-Role Authentication Guard</span>
      </footer>
    </div>
  );
}
