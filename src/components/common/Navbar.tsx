import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bell,
  Menu,
  X,
  Sparkles,
  Heart,
  Scale,
  Calendar,
  LogOut,
  User as UserIcon,
  ChevronDown,
  LayoutDashboard,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    currentPath,
    navigate,
    logout,
    notifications,
    favorites,
    compareSalonIds,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Filter notifications for active user/role
  const userNotifications = notifications.filter((n) => {
    if (!currentUser) return n.targetRole === 'customer';
    if (currentUser.role === 'admin') return n.targetRole === 'admin' || n.targetRole === 'all';
    if (currentUser.role === 'owner') {
      return (
        n.targetRole === 'owner' &&
        (!n.targetSalonId || n.targetSalonId === currentUser.salonId)
      );
    }
    return n.targetRole === 'customer' && (!n.targetUserId || n.targetUserId === currentUser.id);
  });

  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const isCurrentActive = (path: string) => {
    if (path === '/' && currentPath === '/') return true;
    if (path !== '/' && currentPath.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ZONE 1: Single text element Brand Wordmark (per Top Bar Contract) */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 group text-left cursor-pointer"
          >
            <span className="w-8 h-8 rounded-lg bg-purple-700 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:bg-purple-800 transition-colors">
              S
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-display">
              Salonix
            </span>
          </button>

          {/* ZONE 2: 4-6 clean text navigation links with subtle hover underlines */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            {currentUser?.role === 'customer' ? (
              <>
                <button
                  onClick={() => navigate('/user/dashboard')}
                  className={`hover:text-purple-700 transition-colors cursor-pointer py-1 ${
                    isCurrentActive('/user/dashboard')
                      ? 'text-purple-700 font-semibold border-b-2 border-purple-700'
                      : ''
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/salons')}
                  className={`hover:text-purple-700 transition-colors cursor-pointer py-1 ${
                    isCurrentActive('/salons')
                      ? 'text-purple-700 font-semibold border-b-2 border-purple-700'
                      : ''
                  }`}
                >
                  Find Salons
                </button>
                <button
                  onClick={() => navigate('/compare')}
                  className={`hover:text-purple-700 transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
                    isCurrentActive('/compare')
                      ? 'text-purple-700 font-semibold border-b-2 border-purple-700'
                      : ''
                  }`}
                >
                  <span>Compare</span>
                  {compareSalonIds.length > 0 && (
                    <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.2 rounded-full font-mono">
                      {compareSalonIds.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => navigate('/user/appointments')}
                  className={`hover:text-purple-700 transition-colors cursor-pointer py-1 ${
                    isCurrentActive('/user/appointments')
                      ? 'text-purple-700 font-semibold border-b-2 border-purple-700'
                      : ''
                  }`}
                >
                  My Appointments
                </button>
                <button
                  onClick={() => navigate('/user/favorites')}
                  className={`hover:text-purple-700 transition-colors cursor-pointer py-1 flex items-center gap-1.5 ${
                    isCurrentActive('/user/favorites')
                      ? 'text-purple-700 font-semibold border-b-2 border-purple-700'
                      : ''
                  }`}
                >
                  <span>Favorites</span>
                  {favorites.length > 0 && (
                    <span className="bg-rose-100 text-rose-700 text-xs px-1.5 py-0.2 rounded-full font-mono">
                      {favorites.length}
                    </span>
                  )}
                </button>
              </>
            ) : currentUser?.role === 'owner' ? (
              <>
                <button
                  onClick={() => navigate('/owner/dashboard')}
                  className={`hover:text-purple-700 transition-colors cursor-pointer py-1 ${
                    isCurrentActive('/owner/dashboard')
                      ? 'text-purple-700 font-semibold border-b-2 border-purple-700'
                      : ''
                  }`}
                >
                  Owner Dashboard
                </button>
                <button
                  onClick={() => navigate('/owner/salon')}
                  className={`hover:text-purple-700 transition-colors cursor-pointer py-1 ${
                    isCurrentActive('/owner/salon')
                      ? 'text-purple-700 font-semibold border-b-2 border-purple-700'
                      : ''
                  }`}
                >
                  My Salon
                </button>
                <button
                  onClick={() => navigate('/owner/services')}
                  className={`hover:text-purple-700 transition-colors cursor-pointer py-1 ${
                    isCurrentActive('/owner/services')
                      ? 'text-purple-700 font-semibold border-b-2 border-purple-700'
                      : ''
                  }`}
                >
                  Services
                </button>
                <button
                  onClick={() => navigate('/owner/appointments')}
                  className={`hover:text-purple-700 transition-colors cursor-pointer py-1 ${
                    isCurrentActive('/owner/appointments')
                      ? 'text-purple-700 font-semibold border-b-2 border-purple-700'
                      : ''
                  }`}
                >
                  Appointments
                </button>
                <button
                  onClick={() => navigate('/owner/calendar')}
                  className={`hover:text-purple-700 transition-colors cursor-pointer py-1 ${
                    isCurrentActive('/owner/calendar')
                      ? 'text-purple-700 font-semibold border-b-2 border-purple-700'
                      : ''
                  }`}
                >
                  Calendar
                </button>
              </>
            ) : currentUser?.role === 'admin' ? (
              <>
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className={`hover:text-purple-700 transition-colors cursor-pointer py-1 ${
                    isCurrentActive('/admin/dashboard')
                      ? 'text-purple-700 font-semibold border-b-2 border-purple-700'
                      : ''
                  }`}
                >
                  Admin Overview
                </button>
                <button
                  onClick={() => navigate('/admin/salons')}
                  className={`hover:text-purple-700 transition-colors cursor-pointer py-1 ${
                    isCurrentActive('/admin/salons')
                      ? 'text-purple-700 font-semibold border-b-2 border-purple-700'
                      : ''
                  }`}
                >
                  Salons
                </button>
                <button
                  onClick={() => navigate('/admin/users')}
                  className={`hover:text-purple-700 transition-colors cursor-pointer py-1 ${
                    isCurrentActive('/admin/users')
                      ? 'text-purple-700 font-semibold border-b-2 border-purple-700'
                      : ''
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => navigate('/admin/appointments')}
                  className={`hover:text-purple-700 transition-colors cursor-pointer py-1 ${
                    isCurrentActive('/admin/appointments')
                      ? 'text-purple-700 font-semibold border-b-2 border-purple-700'
                      : ''
                  }`}
                >
                  Appointments
                </button>
                <button
                  onClick={() => navigate('/admin/reports')}
                  className={`hover:text-purple-700 transition-colors cursor-pointer py-1 ${
                    isCurrentActive('/admin/reports')
                      ? 'text-purple-700 font-semibold border-b-2 border-purple-700'
                      : ''
                  }`}
                >
                  Reports
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/salons')}
                  className="hover:text-purple-700 transition-colors cursor-pointer"
                >
                  Find Salons
                </button>
                <button
                  onClick={() => navigate('/compare')}
                  className="hover:text-purple-700 transition-colors cursor-pointer"
                >
                  Compare Prices
                </button>
                <button
                  onClick={() => {
                    navigate('/');
                    setTimeout(() => {
                      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="hover:text-purple-700 transition-colors cursor-pointer"
                >
                  How It Works
                </button>
                <button
                  onClick={() => {
                    navigate('/');
                    setTimeout(() => {
                      document.getElementById('for-owners')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="hover:text-purple-700 transition-colors cursor-pointer"
                >
                  For Salon Owners
                </button>
              </>
            )}
          </nav>

          {/* ZONE 3: 1-2 primary actions */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
                )}
              </button>

              {/* Notification Dropdown */}
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Notifications</h4>
                      <p className="text-xs text-slate-500">{unreadCount} unread</p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-xs text-purple-700 hover:text-purple-900 font-medium cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {userNotifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No notifications right now.
                      </div>
                    ) : (
                      userNotifications.slice(0, 6).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markNotificationAsRead(notif.id);
                            if (notif.actionRoute) {
                              navigate(notif.actionRoute);
                              setNotifDropdownOpen(false);
                            }
                          }}
                          className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer text-left ${
                            !notif.read ? 'bg-purple-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900">
                              {notif.title}
                            </span>
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Auth State */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-semibold flex items-center justify-center text-xs border border-purple-200">
                    {currentUser.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-xs font-medium text-slate-900 leading-none truncate max-w-[120px]">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                      {currentUser.role}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {currentUser.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        if (currentUser.role === 'admin') navigate('/admin/dashboard');
                        else if (currentUser.role === 'owner') navigate('/owner/dashboard');
                        else navigate('/user/dashboard');
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>My Dashboard</span>
                    </button>

                    {currentUser.role === 'customer' && (
                      <>
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            navigate('/user/appointments');
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>My Bookings</span>
                        </button>
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            navigate('/user/profile');
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2"
                        >
                          <UserIcon className="w-3.5 h-3.5" />
                          <span>Account Settings</span>
                        </button>
                      </>
                    )}

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/login')}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:text-purple-700 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Log In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2">
          {currentUser?.role === 'customer' ? (
            <>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/user/dashboard');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/salons');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                Find Salons
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/compare');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                Compare Salons ({compareSalonIds.length})
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/user/appointments');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                My Appointments
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/user/favorites');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                Favorites ({favorites.length})
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/user/profile');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                My Profile
              </button>
            </>
          ) : currentUser?.role === 'owner' ? (
            <>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/owner/dashboard');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                Owner Dashboard
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/owner/salon');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                My Salon Profile
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/owner/services');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                Manage Services
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/owner/appointments');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                Appointments & Requests
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/owner/calendar');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                Calendar Schedule
              </button>
            </>
          ) : currentUser?.role === 'admin' ? (
            <>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/admin/dashboard');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                Admin Overview
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/admin/salons');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                Manage Salons
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/admin/users');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                Manage Users
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/admin/appointments');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                Platform Appointments
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/admin/reports');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                Platform Reports
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/salons');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                Find Salons
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/compare');
                }}
                className="w-full text-left py-2 px-3 text-sm font-medium text-slate-800 hover:bg-purple-50 rounded-lg"
              >
                Compare Prices
              </button>
              <div className="pt-2 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  className="flex-1 py-2 text-center text-sm font-medium text-purple-700 bg-purple-50 rounded-lg"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/register');
                  }}
                  className="flex-1 py-2 text-center text-sm font-medium text-white bg-purple-700 rounded-lg"
                >
                  Sign Up
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
};
