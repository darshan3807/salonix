import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Salon, Service, Appointment } from '../types/index.ts';
import { apiFetch } from '../lib/api.ts';
import { isDatePassed } from '../lib/slotUtils.ts';
import {
  Store,
  Clock,
  MapPin,
  Calendar,
  Scissors,
  Plus,
  CheckCircle,
  Check,
  X,
  AlertTriangle,
  Settings,
  Phone,
  Save,
  RefreshCw,
  Pencil,
  Trash2,
  Bell,
  CheckCheck,
  ArrowLeft,
} from 'lucide-react';

const ALL_DAYS = [
  { id: 'Mon', label: 'Monday' },
  { id: 'Tue', label: 'Tuesday' },
  { id: 'Wed', label: 'Wednesday' },
  { id: 'Thu', label: 'Thursday' },
  { id: 'Fri', label: 'Friday' },
  { id: 'Sat', label: 'Saturday' },
  { id: 'Sun', label: 'Sunday' },
];

type OwnerTab = 'appointments' | 'services' | 'settings' | 'notifications';
type BookingFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'closed';

export const SalonOwnerDashboard: React.FC = () => {
  const {
    user,
    categories,
    notifications,
    unreadNotificationsCount,
    goBack,
    refreshSalons,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useApp();

  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<OwnerTab>('appointments');
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('all');

  // Add / Edit / Delete Service state
  const [showAddService, setShowAddService] = useState<boolean>(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('30');
  const [newServiceCategory, setNewServiceCategory] = useState('cat-hair');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);
  const [serviceModalError, setServiceModalError] = useState<string | null>(null);

  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editServiceForm, setEditServiceForm] = useState({
    name: '',
    price: '',
    duration: '30',
    categoryId: 'cat-hair',
    description: '',
  });
  const [isUpdatingService, setIsUpdatingService] = useState(false);

  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [isDeletingService, setIsDeletingService] = useState(false);

  // Reject / Cancel appointment modal state
  const [decisionModal, setDecisionModal] = useState<{
    appointment: Appointment;
    action: 'rejected' | 'cancelled';
  } | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  // Salon Settings form state
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    tagline: '',
    description: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    openingTime: '09:00',
    closingTime: '20:00',
    breakStartTime: '',
    breakEndTime: '',
    hasBreak: false,
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    startingPrice: 250,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsErrors, setSettingsErrors] = useState<Record<string, string>>({});
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsGlobalError, setSettingsGlobalError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setErrorFeedback(null);
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4500);
  };

  const showErrorToast = (msg: string) => {
    setFeedback(null);
    setErrorFeedback(msg);
    setTimeout(() => setErrorFeedback(null), 5000);
  };

  const populateSettings = (currentSalon: Salon) => {
    let parsedDays: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const wd = currentSalon.working_days || currentSalon.workingDays;
    if (Array.isArray(wd)) {
      parsedDays = wd;
    } else if (typeof wd === 'string') {
      try {
        if (wd.startsWith('[')) {
          parsedDays = JSON.parse(wd);
        } else {
          parsedDays = wd.split(',').map((s) => s.trim()).filter(Boolean);
        }
      } catch {
        parsedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      }
    }

    const bStart = currentSalon.break_start_time || currentSalon.breakStartTime || '';
    const bEnd = currentSalon.break_end_time || currentSalon.breakEndTime || '';
    const hasBreak = Boolean(bStart && bEnd);

    setSettingsForm({
      name: currentSalon.name || '',
      tagline: currentSalon.tagline || '',
      description: currentSalon.description || '',
      address: currentSalon.address || '',
      city: currentSalon.city || 'Pune',
      state: currentSalon.state || 'Maharashtra',
      pincode: currentSalon.pincode || '',
      phone: currentSalon.phone || '',
      email: currentSalon.email || '',
      openingTime: currentSalon.opening_time || currentSalon.openingTime || '09:00',
      closingTime: currentSalon.closing_time || currentSalon.closingTime || '20:00',
      breakStartTime: bStart,
      breakEndTime: bEnd,
      hasBreak,
      workingDays: parsedDays,
      startingPrice: Number(currentSalon.starting_price || currentSalon.startingPrice || 250),
    });
    setSettingsErrors({});
    setSettingsGlobalError(null);
  };

  const fetchSalonData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const salonsRes = await apiFetch('/api/salons?all=true');
      if (salonsRes.ok) {
        const data = await salonsRes.json();
        const found = (data.salons || []).find(
          (s: Salon) => s.owner_id === user.uid || s.id === (user.salon_id || user.salonId)
        );

        if (found) {
          setSalon(found);
          populateSettings(found);

          const [detailsRes, aptRes] = await Promise.all([
            apiFetch(`/api/salons/${found.id}`),
            apiFetch(`/api/appointments?salonId=${found.id}`),
          ]);

          if (detailsRes.ok) {
            const details = await detailsRes.json();
            setServices(details.services || []);
          }
          if (aptRes.ok) {
            const aptData = await aptRes.json();
            setAppointments(aptData.appointments || []);
          }
        } else {
          setSalon(null);
          setServices([]);
          setAppointments([]);
        }
      }
      refreshNotifications();
    } catch (e) {
      console.error('Error fetching salon owner data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalonData();
  }, [user]);

  const bookingCounts = useMemo(() => {
    const counts = { all: appointments.length, pending: 0, confirmed: 0, completed: 0, closed: 0 };
    for (const apt of appointments) {
      const st = String(apt.status || '').toLowerCase();
      if (st === 'pending') counts.pending++;
      else if (st === 'confirmed') counts.confirmed++;
      else if (st === 'completed') counts.completed++;
      else counts.closed++;
    }
    return counts;
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const st = String(apt.status || '').toLowerCase();
      if (bookingFilter === 'all') return true;
      if (bookingFilter === 'closed') return st === 'cancelled' || st === 'rejected';
      return st === bookingFilter;
    });
  }, [appointments, bookingFilter]);

  const handleUpdateStatus = async (
    appointmentId: string,
    status: 'confirmed' | 'rejected' | 'completed' | 'cancelled',
    reason?: string
  ) => {
    setIsUpdatingStatus(appointmentId);
    try {
      const payload: Record<string, any> = { status };
      if (status === 'rejected' && reason) payload.rejectionReason = reason;
      if (status === 'cancelled' && reason) payload.cancellationReason = reason;

      const res = await apiFetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const label =
          status === 'confirmed'
            ? 'accepted and confirmed'
            : status === 'rejected'
              ? 'rejected'
              : status === 'completed'
                ? 'marked as completed'
                : 'cancelled';
        showToast(`Appointment ${label}. Customer has been notified.`);
        setDecisionModal(null);
        setDecisionReason('');
        await fetchSalonData();
      } else {
        showErrorToast(data.error || 'Could not update appointment status.');
      }
    } catch (e: any) {
      showErrorToast('Network error updating status: ' + e.message);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon) return;
    setServiceModalError(null);

    const priceNum = Number(newServicePrice);
    const durNum = Number(newServiceDuration);
    if (!newServiceName.trim()) {
      setServiceModalError('Service name is required.');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setServiceModalError('Price must be a valid non-negative number.');
      return;
    }
    if (!Number.isFinite(durNum) || durNum < 5 || durNum > 480) {
      setServiceModalError('Duration must be between 5 and 480 minutes.');
      return;
    }

    setIsAddingService(true);
    try {
      const res = await apiFetch('/api/services', {
        method: 'POST',
        body: JSON.stringify({
          salonId: salon.id,
          name: newServiceName.trim(),
          price: priceNum,
          duration: durNum,
          categoryId: newServiceCategory || categories[0]?.id || 'cat-hair',
          description: newServiceDesc.trim(),
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(`Service "${newServiceName.trim()}" added to your menu.`);
        setShowAddService(false);
        setNewServiceName('');
        setNewServicePrice('');
        setNewServiceDuration('30');
        setNewServiceDesc('');
        await Promise.all([fetchSalonData(), refreshSalons()]);
      } else {
        setServiceModalError(data.error || 'Failed to add service.');
      }
    } catch (e: any) {
      setServiceModalError('Network error: ' + e.message);
    } finally {
      setIsAddingService(false);
    }
  };

  const openEditService = (srv: Service) => {
    setServiceModalError(null);
    setEditingService(srv);
    setEditServiceForm({
      name: srv.name,
      price: String(srv.price),
      duration: String(srv.duration || 30),
      categoryId: srv.category_id || srv.categoryId || categories[0]?.id || 'cat-hair',
      description: srv.description || '',
    });
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    setServiceModalError(null);

    const priceNum = Number(editServiceForm.price);
    const durNum = Number(editServiceForm.duration);
    if (!editServiceForm.name.trim()) {
      setServiceModalError('Service name cannot be empty.');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setServiceModalError('Price must be a valid non-negative number.');
      return;
    }
    if (!Number.isFinite(durNum) || durNum < 5 || durNum > 480) {
      setServiceModalError('Duration must be between 5 and 480 minutes.');
      return;
    }

    setIsUpdatingService(true);
    try {
      const res = await apiFetch(`/api/services/${editingService.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editServiceForm.name.trim(),
          price: priceNum,
          duration: durNum,
          categoryId: editServiceForm.categoryId,
          description: editServiceForm.description.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Service "${editServiceForm.name.trim()}" updated.`);
        setEditingService(null);
        await Promise.all([fetchSalonData(), refreshSalons()]);
      } else {
        setServiceModalError(data.error || 'Failed to update service.');
      }
    } catch (e: any) {
      setServiceModalError('Network error: ' + e.message);
    } finally {
      setIsUpdatingService(false);
    }
  };

  const handleConfirmDeleteService = async () => {
    if (!deletingService) return;
    setIsDeletingService(true);
    try {
      const res = await apiFetch(`/api/services/${deletingService.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Service "${deletingService.name}" deleted.`);
        setDeletingService(null);
        await Promise.all([fetchSalonData(), refreshSalons()]);
      } else {
        showErrorToast(data.error || 'Failed to delete service.');
      }
    } catch (e: any) {
      showErrorToast('Network error: ' + e.message);
    } finally {
      setIsDeletingService(false);
    }
  };

  const toggleWorkingDay = (dayId: string) => {
    setSettingsForm((prev) => {
      const current = prev.workingDays;
      let updated: string[];
      if (current.includes(dayId)) {
        if (current.length === 1) return prev;
        updated = current.filter((d) => d !== dayId);
      } else {
        updated = [...current, dayId];
      }
      return { ...prev, workingDays: updated };
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon) return;

    setSettingsErrors({});
    setSettingsGlobalError(null);
    setSettingsSuccess(null);

    const errors: Record<string, string> = {};
    if (!settingsForm.name.trim()) errors.name = 'Salon name is required.';
    if (!settingsForm.address.trim()) errors.address = 'Street address is required.';
    if (!settingsForm.phone.trim() || settingsForm.phone.trim().length < 6) {
      errors.phone = 'Valid phone number is required (min 6 digits).';
    }
    if (settingsForm.workingDays.length === 0) {
      errors.workingDays = 'Please select at least one operating day.';
    }
    if (settingsForm.openingTime >= settingsForm.closingTime) {
      errors.openingTime = 'Opening time must be earlier than closing time.';
      errors.closingTime = 'Closing time must be after opening time.';
    }
    if (settingsForm.hasBreak) {
      if (!settingsForm.breakStartTime || !settingsForm.breakEndTime) {
        errors.break = 'Both break start time and break end time are required when break is enabled.';
      } else if (settingsForm.breakStartTime >= settingsForm.breakEndTime) {
        errors.break = 'Break start time must be earlier than break end time.';
      } else if (
        settingsForm.breakStartTime < settingsForm.openingTime ||
        settingsForm.breakEndTime > settingsForm.closingTime
      ) {
        errors.break = 'Break period must fit completely within opening and closing hours.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setSettingsErrors(errors);
      return;
    }

    setIsSavingSettings(true);
    try {
      const payload: any = {
        name: settingsForm.name.trim(),
        tagline: settingsForm.tagline.trim(),
        description: settingsForm.description.trim(),
        address: settingsForm.address.trim(),
        city: settingsForm.city.trim(),
        state: settingsForm.state.trim(),
        pincode: settingsForm.pincode.trim(),
        phone: settingsForm.phone.trim(),
        email: settingsForm.email.trim(),
        openingTime: settingsForm.openingTime,
        closingTime: settingsForm.closingTime,
        workingDays: settingsForm.workingDays,
        startingPrice: Number(settingsForm.startingPrice) || 250,
      };

      if (settingsForm.hasBreak && settingsForm.breakStartTime && settingsForm.breakEndTime) {
        payload.breakStartTime = settingsForm.breakStartTime;
        payload.breakEndTime = settingsForm.breakEndTime;
      } else {
        payload.breakStartTime = '';
        payload.breakEndTime = '';
      }

      const res = await apiFetch(`/api/salons/${salon.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSalon(data.salon);
        populateSettings(data.salon);
        refreshSalons();
        setSettingsSuccess('Salon schedule & profile details saved successfully! All availability slots have been updated.');
        setTimeout(() => setSettingsSuccess(null), 5000);
      } else {
        setSettingsGlobalError(data.message || data.error || 'Failed to update salon profile.');
      }
    } catch (err: any) {
      setSettingsGlobalError('Network error while saving settings: ' + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const getStatusBadgeClasses = (rawStatus: string) => {
    const st = rawStatus.toLowerCase();
    if (st === 'pending') return 'bg-amber-100 text-amber-800 border border-amber-200';
    if (st === 'confirmed') return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    if (st === 'completed') return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
    return 'bg-rose-100 text-rose-800 border border-rose-200';
  };

  const getCategoryName = (catId?: string) => {
    if (!catId) return 'General';
    return categories.find((c) => c.id === catId)?.name || 'General';
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

      {/* Header & Salon Details */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
              Salon Partner Hub
            </span>
            {salon?.status === 'approved' ? (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
                Approved & Live
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Pending Admin Approval
              </span>
            )}
          </div>

          <h1 className="text-3xl font-serif font-bold text-slate-900">
            {salon ? salon.name : 'My Salon Business'}
          </h1>
          <p className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{salon?.address || 'City Center'}, {salon?.city || 'Pune'}</span>
            <span className="mx-1">•</span>
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="tabular-nums">{salon?.opening_time || '09:00'} - {salon?.closing_time || '20:00'}</span>
            {salon?.phone && (
              <>
                <span className="mx-1">•</span>
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="tabular-nums">{salon.phone}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchSalonData}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setServiceModalError(null);
              setNewServiceCategory(categories[0]?.id || 'cat-hair');
              setShowAddService(true);
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm shadow-purple-600/20 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => {
            setActiveTab('appointments');
            setBookingFilter('pending');
          }}
          className="bg-white rounded-2xl border border-slate-200 hover:border-amber-300 p-5 cursor-pointer transition-all"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Requests</span>
          <p className="text-3xl font-serif font-bold text-amber-700 mt-2 tabular-nums">{bookingCounts.pending}</p>
          <p className="text-xs text-slate-500 mt-1">Awaiting accept or reject</p>
        </div>
        <div
          onClick={() => {
            setActiveTab('appointments');
            setBookingFilter('confirmed');
          }}
          className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 p-5 cursor-pointer transition-all"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Confirmed</span>
          <p className="text-3xl font-serif font-bold text-emerald-700 mt-2 tabular-nums">{bookingCounts.confirmed}</p>
          <p className="text-xs text-slate-500 mt-1">Scheduled visits</p>
        </div>
        <div
          onClick={() => {
            setActiveTab('appointments');
            setBookingFilter('completed');
          }}
          className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 p-5 cursor-pointer transition-all"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Completed</span>
          <p className="text-3xl font-serif font-bold text-indigo-700 mt-2 tabular-nums">{bookingCounts.completed}</p>
          <p className="text-xs text-slate-500 mt-1">Served appointments</p>
        </div>
        <div
          onClick={() => setActiveTab('services')}
          className="bg-white rounded-2xl border border-slate-200 hover:border-purple-300 p-5 cursor-pointer transition-all"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Services</span>
          <p className="text-3xl font-serif font-bold text-slate-900 mt-2 tabular-nums">{services.length}</p>
          <p className="text-xs text-slate-500 mt-1">Listed on Salonix</p>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'appointments'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Bookings ({appointments.length})</span>
          {bookingCounts.pending > 0 && (
            <span className="px-1.5 py-0.5 text-[11px] font-bold bg-amber-500 text-white rounded-full tabular-nums">
              {bookingCounts.pending}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'services'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Services Menu ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'settings'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Settings className="w-4 h-4" />
          <span>Salon Settings & Schedule</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('notifications');
            refreshNotifications();
          }}
          className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'notifications'
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
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorFeedback && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorFeedback}</span>
          </div>
          <button onClick={() => setErrorFeedback(null)} className="text-rose-700 hover:text-rose-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: Appointments Management */}
      {activeTab === 'appointments' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-serif font-bold text-slate-900">
                Appointments & Booking History
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Accept or reject incoming requests, mark visits complete, and review past bookings.
              </p>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { id: 'all', label: `All (${bookingCounts.all})` },
                  { id: 'pending', label: `Pending (${bookingCounts.pending})` },
                  { id: 'confirmed', label: `Confirmed (${bookingCounts.confirmed})` },
                  { id: 'completed', label: `Completed (${bookingCounts.completed})` },
                  { id: 'closed', label: `Cancelled/Rejected (${bookingCounts.closed})` },
                ] as { id: BookingFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBookingFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer tabular-nums ${bookingFilter === tab.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-sm shadow-xs">
              No appointments match this filter yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAppointments.map((apt) => {
                const st = String(apt.status || '').toLowerCase();
                const passed = isDatePassed(apt.date);
                const busy = isUpdatingStatus === apt.id;
                const reasonText = apt.rejection_reason || apt.cancellation_reason;

                return (
                  <div
                    key={apt.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs space-y-4 flex flex-col justify-between ${st === 'pending' ? 'border-amber-300 ring-1 ring-amber-200/70' : 'border-slate-200'
                      }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold font-mono text-slate-600 tabular-nums">
                          {apt.date} • {apt.start_time}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${passed && st !== 'cancelled' && st !== 'rejected'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : getStatusBadgeClasses(st)
                            }`}
                        >
                          {passed && st !== 'cancelled' && st !== 'rejected' ? 'Appointment Completed' : st}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900">{apt.customer_name}</h4>
                        <p className="text-xs text-slate-500 tabular-nums mt-0.5">{apt.customer_phone}</p>
                        {apt.customer_email && (
                          <p className="text-[11px] text-slate-400 truncate">{apt.customer_email}</p>
                        )}
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-200/60 tabular-nums">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-500">Service:</span>
                          <span className="text-slate-900 text-right">{apt.service_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Duration:</span>
                          <span className="text-slate-700">{apt.duration_minutes || 30} mins</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200">
                          <span className="text-slate-500 font-semibold">Price:</span>
                          <span className="font-bold text-slate-900">₹{apt.price}</span>
                        </div>
                      </div>

                      {apt.notes && (
                        <p className="text-xs text-slate-600 bg-purple-50/50 border border-purple-100 rounded-lg px-2.5 py-1.5">
                          <span className="font-bold text-purple-800">Note:</span> {apt.notes}
                        </p>
                      )}

                      {reasonText && (st === 'rejected' || st === 'cancelled') && (
                        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                          <span className="font-bold">Reason:</span> {reasonText}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-slate-100">
                      {passed && st !== 'cancelled' && st !== 'rejected' ? (
                        <div className="w-full py-2 text-xs font-bold text-center text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Appointment Completed</span>
                        </div>
                      ) : st === 'pending' ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleUpdateStatus(apt.id, 'confirmed')}
                            className="flex-1 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{busy ? 'Saving...' : 'Accept'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setDecisionReason('');
                              setDecisionModal({ appointment: apt, action: 'rejected' });
                            }}
                            className="flex-1 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : st === 'confirmed' ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleUpdateStatus(apt.id, 'completed')}
                            className="flex-1 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {busy ? 'Updating...' : 'Mark Completed'}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setDecisionReason('');
                              setDecisionModal({ appointment: apt, action: 'cancelled' });
                            }}
                            className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Recorded in booking history</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Services List (Full Create / Edit / Delete) */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-serif font-bold text-slate-900">
                Services Menu & Pricing
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Add, edit, or remove services. Changes update public listings and slot duration immediately.
              </p>
            </div>
            <button
              onClick={() => {
                setServiceModalError(null);
                setNewServiceCategory(categories[0]?.id || 'cat-hair');
                setShowAddService(true);
              }}
              className="px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service</span>
            </button>
          </div>

          {services.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
              No services listed yet. Click "Add Service" to create your first offering.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((srv) => (
                <div
                  key={srv.id}
                  className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-4 hover:border-purple-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
                          {srv.category_name || getCategoryName(srv.category_id)}
                        </span>
                        <h4 className="font-bold text-slate-900 text-base mt-0.5">{srv.name}</h4>
                      </div>
                      <span className="font-bold text-sm text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 tabular-nums shrink-0">
                        ₹{srv.price}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {srv.description || 'Professional salon service.'}
                    </p>
                    <p className="text-xs font-medium text-slate-600 flex items-center gap-1 tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{srv.duration} mins</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => openEditService(srv)}
                      className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingService(srv)}
                      className="py-1.5 px-3 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Salon Settings & Schedule */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-serif font-bold text-slate-900">
                Salon Profile & Operating Schedule
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your salon details, opening hours, break times, and operating days. Availability slots recalculate in real-time.
              </p>
            </div>
            {salon && (
              <button
                type="button"
                onClick={() => populateSettings(salon)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Form</span>
              </button>
            )}
          </div>

          {settingsSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-sm flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-medium">{settingsSuccess}</span>
            </div>
          )}

          {settingsGlobalError && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-sm flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-medium">{settingsGlobalError}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-8">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <Store className="w-5 h-5 text-purple-600" />
                <h3 className="font-serif font-bold text-slate-900 text-lg">General Salon Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Salon Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                  {settingsErrors.name && <p className="text-xs text-rose-600 mt-1">{settingsErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={settingsForm.tagline}
                    onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    About / Description
                  </label>
                  <textarea
                    rows={3}
                    value={settingsForm.description}
                    onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 resize-none focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Starting Service Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settingsForm.startingPrice}
                    onChange={(e) => setSettingsForm({ ...settingsForm, startingPrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <MapPin className="w-5 h-5 text-purple-600" />
                <h3 className="font-serif font-bold text-slate-900 text-lg">Location & Contact Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm.address}
                    onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                  {settingsErrors.address && <p className="text-xs text-rose-600 mt-1">{settingsErrors.address}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm.city}
                    onChange={(e) => setSettingsForm({ ...settingsForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={settingsForm.pincode}
                    onChange={(e) => setSettingsForm({ ...settingsForm, pincode: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Contact Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsForm.phone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                  {settingsErrors.phone && <p className="text-xs text-rose-600 mt-1">{settingsErrors.phone}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Business Email
                  </label>
                  <input
                    type="email"
                    value={settingsForm.email}
                    onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <Clock className="w-5 h-5 text-purple-600" />
                <h3 className="font-serif font-bold text-slate-900 text-lg">Operating Schedule & Working Days</h3>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Open Operating Days *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {ALL_DAYS.map((d) => {
                    const isSelected = settingsForm.workingDays.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleWorkingDay(d.id)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${isSelected
                            ? 'bg-purple-50 border-purple-400 text-purple-900 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-400 font-medium hover:border-slate-300'
                          }`}
                      >
                        <div className="text-xs">{d.label}</div>
                        <div className="text-xs mt-0.5 opacity-80">{isSelected ? 'Open' : 'Closed'}</div>
                      </button>
                    );
                  })}
                </div>
                {settingsErrors.workingDays && (
                  <p className="text-xs text-rose-600">{settingsErrors.workingDays}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Salon Opening Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={settingsForm.openingTime}
                    onChange={(e) => setSettingsForm({ ...settingsForm, openingTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                  {settingsErrors.openingTime && (
                    <p className="text-xs text-rose-600 mt-1">{settingsErrors.openingTime}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Salon Closing Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={settingsForm.closingTime}
                    onChange={(e) => setSettingsForm({ ...settingsForm, closingTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                  {settingsErrors.closingTime && (
                    <p className="text-xs text-rose-600 mt-1">{settingsErrors.closingTime}</p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-bold text-slate-900">Afternoon / Staff Break Period</span>
                    <p className="text-xs text-slate-500">
                      During break hours, customer booking slots will automatically be blocked.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={settingsForm.hasBreak}
                      onChange={(e) => setSettingsForm({ ...settingsForm, hasBreak: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {settingsForm.hasBreak && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 bg-purple-50/50 rounded-2xl border border-purple-200">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Break Start Time *
                      </label>
                      <input
                        type="time"
                        value={settingsForm.breakStartTime}
                        onChange={(e) => setSettingsForm({ ...settingsForm, breakStartTime: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Break End Time *
                      </label>
                      <input
                        type="time"
                        value={settingsForm.breakEndTime}
                        onChange={(e) => setSettingsForm({ ...settingsForm, breakEndTime: e.target.value })}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    {settingsErrors.break && (
                      <p className="col-span-2 text-xs text-rose-600 font-medium">{settingsErrors.break}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingSettings ? 'Saving Schedule...' : 'Save Salon Settings'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (salon) populateSettings(salon);
                }}
                disabled={isSavingSettings}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancel Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: Owner Notifications */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-serif font-bold text-slate-900">Salon Activity & Alerts</h2>
              <p className="text-xs text-slate-500">New booking requests and customer cancellations appear here.</p>
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
            <div className="p-10 text-center text-sm text-slate-500">No notifications yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 sm:p-5 flex items-start justify-between gap-4 ${!n.read ? 'bg-purple-50/40' : 'bg-white'
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

      {/* Add Service Modal */}
      {showAddService && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Add New Salon Service</h3>
              <button onClick={() => setShowAddService(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {serviceModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                {serviceModalError}
              </div>
            )}

            <form onSubmit={handleAddService} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="e.g. Keratin Treatment"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Category *</label>
                <select
                  value={newServiceCategory}
                  onChange={(e) => setNewServiceCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    placeholder="450"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Duration (mins) *</label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    required
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    placeholder="30"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  placeholder="Details regarding the treatment or cut..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isAddingService}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isAddingService ? 'Saving...' : 'Save Service'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddService(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Edit Service</h3>
              <button onClick={() => setEditingService(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {serviceModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                {serviceModalError}
              </div>
            )}

            <form onSubmit={handleUpdateService} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={editServiceForm.name}
                  onChange={(e) => setEditServiceForm({ ...editServiceForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Category *</label>
                <select
                  value={editServiceForm.categoryId}
                  onChange={(e) => setEditServiceForm({ ...editServiceForm, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editServiceForm.price}
                    onChange={(e) => setEditServiceForm({ ...editServiceForm, price: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Duration (mins) *</label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    required
                    value={editServiceForm.duration}
                    onChange={(e) => setEditServiceForm({ ...editServiceForm, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editServiceForm.description}
                  onChange={(e) => setEditServiceForm({ ...editServiceForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingService}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isUpdatingService ? 'Updating...' : 'Update Service'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Service Confirmation Modal */}
      {deletingService && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-xl p-6 space-y-4 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Service?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to remove <strong className="text-slate-800">{deletingService.name}</strong> (₹{deletingService.price}) from your menu?
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingService}
                onClick={handleConfirmDeleteService}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer disabled:opacity-50"
              >
                {isDeletingService ? 'Deleting...' : 'Delete Service'}
              </button>
              <button
                type="button"
                disabled={isDeletingService}
                onClick={() => setDeletingService(null)}
                className="px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject / Cancel Appointment Reason Modal */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {decisionModal.action === 'rejected' ? 'Reject Booking Request' : 'Cancel Confirmed Booking'}
              </h3>
              <button onClick={() => setDecisionModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-200">
              <p className="font-bold text-slate-900">{decisionModal.appointment.customer_name}</p>
              <p className="text-slate-600">
                {decisionModal.appointment.service_name} • {decisionModal.appointment.date} at{' '}
                {decisionModal.appointment.start_time}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Reason for Customer {decisionModal.action === 'rejected' ? '(Recommended)' : '(Optional)'}
              </label>
              <textarea
                rows={3}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder={
                  decisionModal.action === 'rejected'
                    ? 'e.g. Stylist unavailable at this time — please pick another slot.'
                    : 'e.g. Emergency schedule adjustment at salon.'
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 resize-none focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isUpdatingStatus === decisionModal.appointment.id}
                onClick={() =>
                  handleUpdateStatus(
                    decisionModal.appointment.id,
                    decisionModal.action,
                    decisionReason.trim() || undefined
                  )
                }
                className="flex-1 py-2.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer disabled:opacity-50"
              >
                {decisionModal.action === 'rejected' ? 'Confirm Rejection' : 'Confirm Cancellation'}
              </button>
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                className="px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Keep Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
