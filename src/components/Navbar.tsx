import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Scissors, Sparkles, User, LogOut, LayoutDashboard, ShieldCheck, Store, Calendar, ArrowRight } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, currentView, navigateTo, logout, pendingApprovalsCount } = useApp();

  const getDashboardView = () => {
    if (!user) return 'home';
    if (user.role === 'admin') return 'admin-dashboard';
    if (user.role === 'owner') return 'owner-dashboard';
    return 'customer-dashboard';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => navigateTo('home')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-purple-600/20 group-hover:scale-105 transition-transform">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-serif font-bold tracking-tight text-slate-900 group-hover:text-purple-700 transition-colors">
                  Salonix
                </span>
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <p className="text-[11px] font-medium tracking-wider uppercase text-slate-400">
                Salon & Grooming Hub
              </p>
            </div>
          </div>

          {/* Right Action / Auth Buttons */}
          <div className="flex items-center gap-3">
            {!user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigateTo('login')}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all cursor-pointer"
                >
                  Log In
                </button>
                <button
                  onClick={() => navigateTo('signup')}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg shadow-sm shadow-purple-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Sign Up</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* Role Badge & Dashboard Button */}
                <button
                  onClick={() => navigateTo(getDashboardView())}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer ${
                    currentView.includes('dashboard')
                      ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-purple-400 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-purple-600" />
                  <span>
                    {user.role === 'admin'
                      ? 'Admin Portal'
                      : user.role === 'owner'
                      ? 'Salon Dashboard'
                      : 'My Appointments'}
                  </span>
                  {user.role === 'admin' && pendingApprovalsCount > 0 && (
                    <span className="px-1.5 py-0.5 text-xs font-bold bg-purple-600 text-white rounded-full animate-pulse">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </button>

                {/* User Info Capsule */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                  <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left text-xs leading-tight">
                    <p className="font-semibold text-slate-800 truncate max-w-[120px]">{user.name}</p>
                    <p className="text-[10px] uppercase font-bold text-purple-700">{user.role}</p>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
