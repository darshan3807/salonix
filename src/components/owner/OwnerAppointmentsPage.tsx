import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Appointment, AppointmentStatus } from '../../types';
import { StatusBadge } from '../common/Badge';
import { formatINR } from '../../utils/slotUtils';
import { ConfirmationModal } from '../common/ConfirmationModal';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  User,
  Phone,
  RotateCcw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const OwnerAppointmentsPage: React.FC = () => {
  const { currentUser, salons, appointments, updateAppointmentStatus, rescheduleAppointment } = useApp();

  const mySalon = salons.find((s) => s.ownerId === currentUser?.id || s.id === currentUser?.salonId) || salons[0];
  const salonAppointments = useMemo(() => {
    return appointments.filter((a) => a.salonId === mySalon?.id);
  }, [appointments, mySalon]);

  const [viewMode, setViewMode] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modals
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [actionType, setActionType] = useState<AppointmentStatus | null>(null);
  const [actionReason, setActionReason] = useState('');

  // Reschedule state
  const [rescheduleModalApt, setRescheduleModalApt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  // Dates
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const filteredAppointments = useMemo(() => {
    return salonAppointments
      .filter((a) => {
        if (statusFilter !== 'all' && a.status !== statusFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          const matchCust = a.customerName.toLowerCase().includes(q);
          const matchSrv = a.serviceName.toLowerCase().includes(q);
          const matchId = a.id.toLowerCase().includes(q);
          if (!matchCust && !matchSrv && !matchId) return false;
        }

        if (viewMode === 'today') {
          return a.date === todayStr;
        }
        if (viewMode === 'week') {
          // Appointments within next 7 days or past 2 days
          const aptDate = new Date(a.date).getTime();
          const today = new Date(todayStr).getTime();
          const diffDays = (aptDate - today) / (1000 * 3600 * 24);
          return diffDays >= -2 && diffDays <= 7;
        }
        if (viewMode === 'month') {
          return a.date.startsWith(todayStr.slice(0, 7));
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [salonAppointments, statusFilter, search, viewMode, todayStr]);

  const handleOpenAction = (apt: Appointment, type: AppointmentStatus) => {
    setSelectedApt(apt);
    setActionType(type);
    setActionReason('');
  };

  const handleConfirmAction = () => {
    if (selectedApt && actionType) {
      updateAppointmentStatus(selectedApt.id, actionType, actionReason);
      setSelectedApt(null);
      setActionType(null);
      setActionReason('');
    }
  };

  const handleConfirmReschedule = () => {
    if (rescheduleModalApt && rescheduleDate && rescheduleTime) {
      rescheduleAppointment(rescheduleModalApt.id, rescheduleDate, rescheduleTime);
      setRescheduleModalApt(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
            Booking Ledger
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
            Appointments & Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Accept, reschedule, complete or cancel appointments across your client schedule.
          </p>
        </div>
      </div>

      {/* VIEW TABS & FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Time views (Today, Week, Month, All) */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
            {(['today', 'week', 'month', 'all'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`py-1.5 px-3 text-xs font-medium rounded-lg capitalize transition-all cursor-pointer ${
                  viewMode === mode
                    ? 'bg-white text-purple-800 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Status filter & Search */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search client, service, ID..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-700 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending Requests</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No Show</option>
            </select>
          </div>
        </div>
      </div>

      {/* APPOINTMENTS LIST */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">Ref ID</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Date & Slot</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No appointments matching current filters.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-400">
                      #{apt.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">
                        {apt.customerName}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        {apt.customerPhone}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 block">
                        {apt.serviceName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {apt.durationMinutes} mins
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 block">{apt.date}</span>
                      <span className="text-purple-700 font-mono text-[11px]">
                        {apt.startTime}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-display text-sm">
                      {formatINR(apt.price)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={apt.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {apt.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleOpenAction(apt, 'CONFIRMED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleOpenAction(apt, 'REJECTED')}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-semibold cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {apt.status === 'CONFIRMED' && (
                          <>
                            <button
                              onClick={() => handleOpenAction(apt, 'COMPLETED')}
                              className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded text-[11px] font-semibold cursor-pointer"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => {
                                setRescheduleModalApt(apt);
                                setRescheduleDate(apt.date);
                                setRescheduleTime(apt.startTime);
                              }}
                              className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded text-[11px] cursor-pointer"
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={() => handleOpenAction(apt, 'NO_SHOW')}
                              className="px-2 py-1 text-slate-500 hover:bg-slate-100 rounded text-[11px] cursor-pointer"
                            >
                              No Show
                            </button>
                          </>
                        )}

                        {['COMPLETED', 'REJECTED', 'CANCELLED', 'NO_SHOW'].includes(apt.status) && (
                          <span className="text-[11px] text-slate-400">Completed cycle</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={!!selectedApt && !!actionType}
        title={`Change Status to ${actionType}`}
        message={`Are you sure you want to mark appointment #${selectedApt?.id} for ${selectedApt?.customerName} as ${actionType}?`}
        confirmLabel={`Confirm ${actionType}`}
        variant={
          actionType === 'CONFIRMED' || actionType === 'COMPLETED'
            ? 'success'
            : actionType === 'REJECTED' || actionType === 'CANCELLED'
            ? 'danger'
            : 'primary'
        }
        reasonRequired={actionType === 'REJECTED' || actionType === 'CANCELLED'}
        reasonValue={actionReason}
        onReasonChange={setActionReason}
        reasonPlaceholder="Specify reason for customer notification..."
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setSelectedApt(null);
          setActionType(null);
        }}
      />

      {/* RESCHEDULE MODAL */}
      {rescheduleModalApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-display">
              Reschedule Appointment #{rescheduleModalApt.id}
            </h3>
            <p className="text-xs text-slate-500">
              Client: {rescheduleModalApt.customerName} ({rescheduleModalApt.serviceName})
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  New Appointment Date
                </label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  New Start Time Slot
                </label>
                <input
                  type="text"
                  placeholder="e.g. 11:30 AM"
                  required
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRescheduleModalApt(null)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReschedule}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                Save New Time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
