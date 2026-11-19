import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Sparkles,
  LogOut,
  LayoutDashboard,
  ArrowRight,
  Bell,
  CheckCheck,
  Compass,
  Clock,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    user,
    currentView,
    navigateTo,
    logout,
    pendingApprovalsCount,
    notifications,
    unreadNotificationsCount,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useApp();

  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDashboardView = () => {
    if (!user) return 'home';
    if (user.role === 'admin') return 'admin-dashboard';
    if (user.role === 'owner') return 'owner-dashboard';
    return 'customer-dashboard';
  };

  const handleToggleNotifications = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) {
      refreshNotifications();
    }
  };

  const handleNotificationClick = async (notifId: string, read: boolean) => {
    if (!read) {
      await markNotificationRead(notifId);
    }
    setNotifOpen(false);
    navigateTo(getDashboardView());
  };

  const formatNotifTime = (iso?: string) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-3">

          {/* Logo & Brand */}
          <div
            onClick={() => navigateTo('home')}
            className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
          >
            <div className="w-11 h-11 rounded-xl overflow-hidden shadow-md shadow-purple-600/20 group-hover:scale-105 transition-transform flex items-center justify-center bg-slate-900 border border-purple-200/50">
              <img
                src="/logo.png"
                alt="Salonix Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-serif font-bold tracking-tight text-slate-900 group-hover:text-purple-700 transition-colors">
                  Salonix
                </span>
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <p className="text-[11px] font-medium tracking-wider uppercase text-slate-400 hidden sm:block">
                Discover. Compare. Book.
              </p>
            </div>
          </div>

          {/* Right Action / Auth Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Discover Salons quick nav */}
            <button
              onClick={() => navigateTo('salons')}
              className={`px-3 sm:px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                currentView === 'salons' || currentView === 'salon-detail'
                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                  : 'text-slate-600 hover:text-purple-700 hover:bg-slate-50'
              }`}
            >
              <Compass className="w-4 h-4 text-purple-600" />
              <span className="hidden md:inline">Explore Salons</span>
              <span className="md:hidden">Salons</span>
            </button>

            {!user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => navigateTo('login')}
                  className="px-3.5 sm:px-4 py-2 text-sm font-semibold text-slate-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  Log In
                </button>
                <button
                  onClick={() => navigateTo('signup')}
                  className="px-4 sm:px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg shadow-sm shadow-purple-600/25 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>Sign Up</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Notification Bell & Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={handleToggleNotifications}
                    aria-label="Notifications"
                    className="relative p-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-purple-700 hover:border-purple-300 transition-all cursor-pointer"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center tabular-nums shadow-xs">
                        {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                          <p className="text-[11px] text-slate-500 tabular-nums">
                            {unreadNotificationsCount} unread
                          </p>
                        </div>
                        {unreadNotificationsCount > 0 && (
                          <button
                            type="button"
                            onClick={markAllNotificationsRead}
                            className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 cursor-pointer whitespace-nowrap"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Mark all read</span>
                          </button>
                        )}
                      </div>

                      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-500">
                            No notifications yet. Booking updates will appear here.
                          </div>
                        ) : (
                          notifications.slice(0, 15).map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => handleNotificationClick(n.id, Boolean(n.read))}
                              className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                                !n.read ? 'bg-purple-50/40' : 'bg-white'
                              }`}
                            >
                              <div
                                className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                                  !n.read ? 'bg-purple-600' : 'bg-slate-200'
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs ${!n.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                  {n.title}
                                </p>
                                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                                  {n.message}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 tabular-nums">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatNotifTime(n.created_at || n.createdAt)}</span>
                                </p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Role Badge & Dashboard Button */}
                <button
                  onClick={() => navigateTo(getDashboardView())}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer whitespace-nowrap ${
                    currentView.includes('dashboard')
                      ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-purple-400 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="hidden sm:inline">
                    {user.role === 'admin'
                      ? 'Admin Portal'
                      : user.role === 'owner'
                      ? 'Salon Dashboard'
                      : 'My Appointments'}
                  </span>
                  <span className="sm:hidden">Dashboard</span>
                  {user.role === 'admin' && pendingApprovalsCount > 0 && (
                    <span className="px-1.5 py-0.5 text-xs font-bold bg-purple-600 text-white rounded-full tabular-nums">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </button>

                {/* User Info Capsule */}
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
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
                  aria-label="Sign Out"
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
