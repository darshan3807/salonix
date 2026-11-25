import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Appointment } from '../types/index.ts';
import { apiFetch } from '../lib/api.ts';
import { isDatePassed } from '../lib/slotUtils.ts';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Plus,
  UserCheck,
  History,
  Bell,
  User as UserIcon,
  CheckCheck,
  AlertTriangle,
  X,
  Save,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';

type CustomerTab = 'upcoming' | 'history' | 'notifications' | 'profile';
type HistoryFilter = 'all' | 'completed' | 'rejected' | 'cancelled';

export const CustomerDashboard: React.FC = () => {
  const {
    user,
    notifications,
    unreadNotificationsCount,
    navigateTo,
    goBack,
    updateUser,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useApp();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<CustomerTab>('upcoming');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');

  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cancellation Confirmation Modal
  const [cancellingApt, setCancellingApt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Customer Profile Form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    city: user?.city || 'Pune',
    currentPassword: '',
    newPassword: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfileForm((prev) => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || '',
        city: user.city || 'Pune',
      }));
    }
  }, [user]);

  const fetchAppointments = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/appointments');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
      refreshNotifications();
    } catch (e) {
      console.error('Error fetching appointments:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  const upcomingAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const st = String(apt.status || '').toLowerCase();
      return st === 'pending' || st === 'confirmed';
    });
  }, [appointments]);

  const historyAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const st = String(apt.status || '').toLowerCase();
      const passed = isDatePassed(apt.date);
      if ((st === 'pending' || st === 'confirmed') && !passed) return false;
      if (historyFilter === 'all') return true;
      if (historyFilter === 'completed') return st === 'completed' || passed;
      return st === historyFilter;
    });
  }, [appointments, historyFilter]);

  const handleConfirmCancel = async () => {
    if (!cancellingApt) return;
    setIsCancelling(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/api/appointments/${cancellingApt.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'cancelled',
          cancellationReason: cancelReason.trim() || 'Cancelled by customer',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('Appointment cancelled. The salon has been notified and the slot has been released.');
        setTimeout(() => setMessage(null), 5000);
        setCancellingApt(null);
        setCancelReason('');
        await fetchAppointments();
      } else {
        setErrorMsg(data.error || 'Failed to cancel appointment.');
      }
    } catch (e: any) {
      setErrorMsg('Network error: ' + e.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    if (profileForm.name.trim().length < 2) {
      setProfileError('Full name must be at least 2 characters.');
      return;
    }
    if (profileForm.newPassword && profileForm.newPassword.length < 6) {
      setProfileError('New password must be at least 6 characters.');
      return;
    }
    if (profileForm.newPassword && !profileForm.currentPassword) {
      setProfileError('Please enter your current password to set a new password.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const payload: Record<string, string> = {
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim(),
        city: profileForm.city.trim(),
      };
      if (profileForm.newPassword) {
        payload.currentPassword = profileForm.currentPassword;
        payload.newPassword = profileForm.newPassword;
      }

      const res = await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        updateUser(data.user);
        setProfileForm((prev) => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
        }));
        setProfileSuccess('Your profile details have been saved successfully.');
        setTimeout(() => setProfileSuccess(null), 5000);
      } else {
        setProfileError(data.error || 'Could not update profile.');
      }
    } catch (err: any) {
      setProfileError('Network error: ' + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const renderStatusBadge = (rawStatus: string, dateStr?: string) => {
    const st = rawStatus.toLowerCase();
    const passed = dateStr ? isDatePassed(dateStr) : false;

    if (st === 'cancelled') {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
          Cancelled
        </span>
      );
    }
    if (st === 'rejected') {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 whitespace-nowrap">
          Rejected
        </span>
      );
    }
    if (st === 'completed' || passed) {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
          Appointment Completed
        </span>
      );
    }
    if (st === 'pending') {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
          Pending Approval
        </span>
      );
    }
    if (st === 'confirmed') {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
          Confirmed
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
        {st}
      </span>
    );
  };

  const renderAppointmentCard = (apt: Appointment, showCancel: boolean) => {
    const st = String(apt.status || '').toLowerCase();
    const passed = isDatePassed(apt.date);
    const reasonText = apt.rejection_reason || apt.cancellation_reason;

    return (
      <div
        key={apt.id}
        className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-lg leading-snug">{apt.salon_name}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="line-clamp-1">
                  {apt.salon_city} {apt.salon_address && `• ${apt.salon_address}`}
                </span>
              </p>
            </div>
            {renderStatusBadge(st, apt.date)}
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700 border border-slate-200/60 tabular-nums">
            <div className="flex justify-between font-semibold">
              <span className="text-slate-500">Service:</span>
              <span className="text-slate-900 text-right">{apt.service_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span className="font-medium text-slate-800">{apt.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Time Slot:</span>
              <span className="font-mono font-medium text-purple-800">{apt.start_time}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-slate-200 font-bold">
              <span className="text-slate-700">Price:</span>
              <span className="text-slate-900">₹{apt.price}</span>
            </div>
          </div>

          {st === 'pending' && !passed && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Your slot is reserved and awaiting confirmation from the salon owner.
            </p>
          )}

          {reasonText && (st === 'rejected' || st === 'cancelled') && (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <span className="font-bold">{st === 'rejected' ? 'Salon note:' : 'Cancellation reason:'}</span>{' '}
              {reasonText}
            </p>
          )}
        </div>

        <div className="pt-2 flex items-center gap-2">
          {st !== 'cancelled' && st !== 'rejected' && (passed || st === 'completed') ? (
            <div className="w-full py-2.5 px-3 text-xs font-bold text-center text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Appointment Completed</span>
            </div>
          ) : showCancel && !passed && st !== 'cancelled' && st !== 'rejected' ? (
            <button
              type="button"
              onClick={() => {
                setCancelReason('');
                setCancellingApt(apt);
              }}
              className="w-full py-2 text-xs font-bold text-rose-700 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200 cursor-pointer"
            >
              Cancel Appointment
            </button>
          ) : (
            apt.salon_id && (
              <button
                type="button"
                onClick={() => navigateTo('salon-detail', apt.salon_id)}
                className="w-full py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200 cursor-pointer"
              >
                Book Again at This Salon
              </button>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Verified Customer Account</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white">
            Welcome back, {user?.name || 'Customer'}!
          </h1>
          <p className="text-sm text-slate-300 max-w-md">
            Track upcoming salon bookings, review your appointment history, check notifications, and manage your profile.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <button
            onClick={fetchAppointments}
            className="px-4 py-3 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => navigateTo('salons')}
            className="px-5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-600/30 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-emerald-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'upcoming'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Upcoming ({upcomingAppointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>History ({appointments.length - upcomingAppointments.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('notifications');
            refreshNotifications();
          }}
          className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
          {unreadNotificationsCount > 0 && (
            <span className="px-1.5 py-0.5 text-[11px] font-bold bg-purple-600 text-white rounded-full tabular-nums">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>My Profile</span>
        </button>
      </div>

      {/* TAB 1: Upcoming Appointments */}
      {activeTab === 'upcoming' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400">Loading appointments...</div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-serif font-bold text-slate-900">
                No Upcoming Appointments
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Browse verified salons, compare service prices side by side, and reserve your next time slot.
              </p>
              <button
                onClick={() => navigateTo('salons')}
                className="mt-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors cursor-pointer"
              >
                Explore Salons
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingAppointments.map((apt) => renderAppointmentCard(apt, true))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Appointment History */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-serif font-bold text-slate-900">Past & Closed Bookings</h2>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'All History' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'rejected', label: 'Rejected' },
                  { id: 'cancelled', label: 'Cancelled' },
                ] as { id: HistoryFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHistoryFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                    historyFilter === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {historyAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
              No past appointments found for this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {historyAppointments.map((apt) => renderAppointmentCard(apt, false))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Notifications */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-serif font-bold text-slate-900">Booking Notifications</h2>
              <p className="text-xs text-slate-500">
                Real-time updates when your booking requests are accepted, rejected, or completed.
              </p>
            </div>
            {unreadNotificationsCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No notifications yet. When you book an appointment, updates will appear here.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 sm:p-5 flex items-start justify-between gap-4 ${
                    !n.read ? 'bg-purple-50/40' : 'bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {!n.read && <span className="w-2 h-2 rounded-full bg-purple-600" />}
                      <h4 className="text-sm font-bold text-slate-900">{n.title}</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                    <p className="text-[11px] text-slate-400 tabular-nums">
                      {n.created_at ? new Date(n.created_at).toLocaleString('en-IN') : ''}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => markNotificationRead(n.id)}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 whitespace-nowrap cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: My Profile */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-2xl font-serif font-bold text-slate-900">Account Profile</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update your personal contact details used for salon appointments.
            </p>
          </div>

          {profileSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Email (Account ID)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-500 bg-slate-50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Change Password (Optional)</h3>
                <p className="text-xs text-slate-500">Leave blank to keep your existing password.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={profileForm.currentPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={profileForm.newPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingProfile ? 'Saving Profile...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cancel Appointment Confirmation Modal */}
      {cancellingApt && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Cancel Appointment?</h3>
              <button onClick={() => setCancellingApt(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-200 tabular-nums">
              <p className="font-bold text-slate-900">{cancellingApt.salon_name}</p>
              <p className="text-slate-600">
                {cancellingApt.service_name} • {cancellingApt.date} at {cancellingApt.start_time}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Reason for Cancellation (Optional)
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Change of schedule"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setCancellingApt(null)}
                className="px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Keep Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
