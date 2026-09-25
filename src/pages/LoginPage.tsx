import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Mail, Lock, LogIn, ArrowRight, ShieldCheck, Clock, AlertCircle, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, navigateTo } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingApprovalInfo, setPendingApprovalInfo] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setPendingApprovalInfo(false);

    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      if (result.status === 'pending_approval') {
        setPendingApprovalInfo(true);
      } else {
        setErrorMsg(result.message || 'Login failed. Please verify your credentials.');
      }
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FAFAFA]">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200">
        
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 mb-4 shadow-xs">
            <LogIn className="w-7 h-7" />
          </div>
          <h2 className="text-3xl font-serif font-bold tracking-tight text-slate-900">
            Welcome to Salonix
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to access your appointments and management dashboard
          </p>
        </div>

        {/* Pending Approval Notice */}
        {pendingApprovalInfo && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
              <Clock className="w-5 h-5 text-purple-600 shrink-0" />
              <span>Account Pending Administrator Approval</span>
            </div>
            <p className="text-xs text-purple-800 leading-relaxed">
              Your registration has been submitted and is currently awaiting administrator review. 
              To ensure safety and quality, all customers and salon owners must be verified before dashboard access is activated.
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs font-semibold text-purple-700">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>We will activate your access upon approval. Please check back shortly.</span>
            </div>
          </div>
        )}

        {/* Error Notice */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Password
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <div className="pt-2">
            <div className="text-center text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Or Try 1-Click Demo Accounts
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('user@salonix.com');
                  setPassword('password123');
                }}
                className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-xs font-semibold border border-purple-200 text-center transition-colors cursor-pointer"
              >
                👤 Customer
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('owner@salonix.com');
                  setPassword('password123');
                }}
                className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg text-xs font-semibold border border-indigo-200 text-center transition-colors cursor-pointer"
              >
                ✂️ Salon Owner
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@salonix.com');
                  setPassword('password123');
                }}
                className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold border border-amber-200 text-center transition-colors cursor-pointer"
              >
                🛡️ Admin
              </button>
            </div>
          </div>
        </form>

        {/* Footer / Switch to Signup */}
        <div className="pt-4 border-t border-slate-100 text-center space-y-3">
          <p className="text-sm text-slate-600">
            Don't have an account?{' '}
            <button
              onClick={() => navigateTo('signup')}
              className="font-bold text-purple-600 hover:text-purple-700 hover:underline cursor-pointer"
            >
              Register here
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};
