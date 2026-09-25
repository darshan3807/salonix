import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { Lock, Mail, ArrowRight, ShieldCheck, Store, User as UserIcon, Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, isAuthLoading, navigate, quickLoginAs } = useApp();

  const [role, setRole] = useState<UserRole>('customer');
  const [email, setEmail] = useState('user@salonix.com');
  const [password, setPassword] = useState('User@123');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    if (selectedRole === 'customer') {
      setEmail('user@salonix.com');
      setPassword('User@123');
    } else if (selectedRole === 'owner') {
      setEmail('owner@salonix.com');
      setPassword('Owner@123');
    } else if (selectedRole === 'admin') {
      setEmail('admin@salonix.com');
      setPassword('Admin@123');
    }
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    const res = login(email, password);
    if (!res.success) {
      setError(res.error || 'Invalid credentials.');
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const res = await loginWithGoogle(role);
    if (!res.success && res.error) {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/60">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-700 text-white rounded-xl mx-auto flex items-center justify-center font-bold text-2xl shadow-sm mb-3">
            S
          </div>
          <h2 className="text-2xl font-bold text-slate-900 font-display">
            Welcome to Salonix
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Discover. Compare. Book appointments effortlessly.
          </p>
        </div>

        {/* Role Segmented Selector */}
        <div className="mt-6">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Select Your Role
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleRoleSelect('customer')}
              className={`py-2 px-3 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                role === 'customer'
                  ? 'bg-white text-purple-800 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Customer</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('owner')}
              className={`py-2 px-3 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                role === 'owner'
                  ? 'bg-white text-purple-800 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Owner</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('admin')}
              className={`py-2 px-3 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                role === 'admin'
                  ? 'bg-white text-purple-800 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* Google Sign In Button */}
        <div className="mt-5">
          <button
            type="button"
            disabled={isAuthLoading}
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isAuthLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-purple-700" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Sign in with Google ({role})</span>
          </button>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
            <span className="bg-white px-2 text-slate-400">or use demo accounts</span>
          </div>
        </div>

        {/* 1-Click Demo Shortcut */}
        <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-purple-900">
              Demo Credentials Loaded
            </span>
            <span className="text-[11px] text-purple-600 uppercase font-mono">
              {role}
            </span>
          </div>
          <p className="text-[11px] text-purple-700/90 leading-tight">
            Click <strong>Login to Dashboard</strong> to proceed immediately, or use the instant button below.
          </p>
          <button
            type="button"
            onClick={() => quickLoginAs(role)}
            className="mt-2 w-full py-1.5 px-3 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span>Instant Demo Sign-In as {role.toUpperCase()}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 focus:border-purple-700 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 focus:border-purple-700 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded text-purple-700 focus:ring-purple-700 border-slate-300 w-3.5 h-3.5"
              />
              <span className="text-xs text-slate-600">Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Login to Dashboard
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-purple-700 font-semibold hover:underline cursor-pointer"
          >
            Register now
          </button>
        </div>
      </div>
    </div>
  );
};
