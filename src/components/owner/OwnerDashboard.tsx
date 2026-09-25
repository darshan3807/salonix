import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/Badge';
import { formatINR } from '../../utils/slotUtils';
import { ConfirmationModal } from '../common/ConfirmationModal';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Users,
  AlertCircle,
  Store,
  ArrowRight,
  TrendingUp,
  User,
  Phone,
  Mail,
} from 'lucide-react';
import { Appointment } from '../../types';

export const OwnerDashboard: React.FC = () => {
  const { currentUser, salons, appointments, updateAppointmentStatus, navigate } = useApp();

  // Find owner's salon
  const mySalon = salons.find((s) => s.ownerId === currentUser?.id || s.id === currentUser?.salonId) || salons[0];

  // Salon appointments
  const salonAppointments = useMemo(() => {
    return appointments.filter((a) => a.salonId === mySalon?.id);
  }, [appointments, mySalon]);

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Pending Requests
  const pendingRequests = useMemo(() => {
    return salonAppointments.filter((a) => a.status === 'PENDING');
  }, [salonAppointments]);

  // Confirmed appointments
  const confirmedAppointments = useMemo(() => {
    return salonAppointments.filter((a) => a.status === 'CONFIRMED');
  }, [salonAppointments]);

  // Completed appointments
  const completedAppointments = useMemo(() => {
    return salonAppointments.filter((a) => a.status === 'COMPLETED');
  }, [salonAppointments]);

  // Today's appointments
  const todayAppointments = useMemo(() => {
    return salonAppointments.filter((a) => a.date === todayStr && ['CONFIRMED', 'PENDING', 'COMPLETED'].includes(a.status));
  }, [salonAppointments, todayStr]);

  // Today's Revenue (from completed & confirmed today)
  const todayRevenue = useMemo(() => {
    return salonAppointments
      .filter((a) => a.date === todayStr && ['COMPLETED', 'CONFIRMED'].includes(a.status))
      .reduce((sum, a) => sum + a.price, 0);
  }, [salonAppointments, todayStr]);

  // Modal States
  const [acceptModalApt, setAcceptModalApt] = useState<Appointment | null>(null);
  const [rejectModalApt, setRejectModalApt] = useState<Appointment | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleConfirmAccept = () => {
    if (acceptModalApt) {
      updateAppointmentStatus(acceptModalApt.id, 'CONFIRMED');
      setAcceptModalApt(null);
    }
  };

  const handleConfirmReject = () => {
    if (rejectModalApt) {
      updateAppointmentStatus(rejectModalApt.id, 'REJECTED', rejectReason || 'Slot unavailable due to schedule conflict');
      setRejectModalApt(null);
      setRejectReason('');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Salon Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
              Salon Owner Portal
            </span>
            <span className="text-slate-300">·</span>
            <StatusBadge status={mySalon?.status || 'approved'} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-display mt-1">
            {mySalon?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {mySalon?.address}, {mySalon?.city} · Working Hours: {mySalon?.openingTime} - {mySalon?.closingTime}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => navigate('/owner/salon')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Edit Profile & Hours
          </button>
          <button
            onClick={() => navigate('/owner/services')}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            Manage Services
          </button>
        </div>
      </div>

      {/* DASHBOARD STATISTICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Today's Bookings</span>
            <Calendar className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display tabular-nums">
            {todayAppointments.length}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Scheduled today</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="text-xs font-medium">Pending Requests</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-900 font-display tabular-nums">
            {pendingRequests.length}
          </p>
          <span className="text-[11px] text-amber-700 mt-1 block">Awaiting confirmation</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Confirmed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display tabular-nums">
            {confirmedAppointments.length}
          </p>
          <span className="text-[11px] text-emerald-600 mt-1 block">Ready for service</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Completed</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display tabular-nums">
            {completedAppointments.length}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Past satisfied clients</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-purple-200 bg-purple-50/30 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-purple-900 mb-2">
            <span className="text-xs font-medium">Today's Revenue</span>
            <TrendingUp className="w-4 h-4 text-purple-700" />
          </div>
          <p className="text-2xl font-bold text-purple-900 font-display tabular-nums">
            {formatINR(todayRevenue)}
          </p>
          <span className="text-[11px] text-purple-600 mt-1 block">From today's visits</span>
        </div>
      </div>

      {/* APPOINTMENT REQUESTS SECTION (SPEC #7) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-base font-bold text-slate-900 font-display">
              New Appointment Requests
            </h2>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {pendingRequests.length} pending
            </span>
          </div>
          {pendingRequests.length > 0 && (
            <span className="text-xs text-slate-400">
              Please accept or decline to notify customer
            </span>
          )}
        </div>

        {pendingRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-semibold text-slate-700">All caught up!</p>
            <p className="text-slate-400">No pending appointment requests right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-xl border border-amber-200 bg-amber-50/30 flex flex-col justify-between space-y-4 hover:border-amber-300 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400 text-[11px]">
                      Req #{req.id}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Booked {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-display">
                      {req.customerName}
                    </h3>
                    <p className="text-xs font-semibold text-purple-700 mt-0.5">
                      {req.serviceName}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{req.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{req.startTime} ({req.durationMinutes} min)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{req.customerPhone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Price:</span>
                      <span className="font-bold text-slate-900 font-display">
                        {formatINR(req.price)}
                      </span>
                    </div>
                  </div>

                  {req.notes && (
                    <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-amber-200/80">
                      <strong>Client Note:</strong> {req.notes}
                    </p>
                  )}
                </div>

                {/* Accept & Reject Action Buttons */}
                <div className="pt-3 border-t border-amber-200/80 flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => {
                      setRejectReason('');
                      setRejectModalApt(req);
                    }}
                    className="px-3.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setAcceptModalApt(req)}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Accept Booking</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TODAY'S SCHEDULE / CONFIRMED APPOINTMENTS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">
              Upcoming & Confirmed Appointments
            </h2>
            <p className="text-xs text-slate-500">
              Active clients scheduled for styling sessions.
            </p>
          </div>
          <button
            onClick={() => navigate('/owner/appointments')}
            className="text-xs font-semibold text-purple-700 hover:underline cursor-pointer"
          >
            View all appointments ({salonAppointments.length})
          </button>
        </div>

        {confirmedAppointments.length === 0 ? (
          <p className="text-xs text-slate-500 bg-slate-50 p-6 rounded-xl text-center">
            No confirmed appointments currently in queue.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {confirmedAppointments.slice(0, 5).map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {apt.customerName}
                      <span className="block text-[11px] text-slate-400 font-normal">
                        {apt.customerPhone}
                      </span>
                    </td>
                    <td className="py-3 px-3">{apt.serviceName}</td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800">{apt.date}</span>
                      <span className="block text-slate-500">{apt.startTime}</span>
                    </td>
                    <td className="py-3 px-3">{apt.durationMinutes} mins</td>
                    <td className="py-3 px-3 font-bold text-slate-900 font-display">
                      {formatINR(apt.price)}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={apt.status} />
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <button
                        onClick={() => updateAppointmentStatus(apt.id, 'COMPLETED')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md cursor-pointer"
                        title="Mark Completed"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => updateAppointmentStatus(apt.id, 'NO_SHOW')}
                        className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                        title="Mark No Show"
                      >
                        No Show
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ACCEPT CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={!!acceptModalApt}
        title="Confirm Appointment Booking"
        message={`Are you sure you want to accept this booking from ${acceptModalApt?.customerName} for ${acceptModalApt?.serviceName} on ${acceptModalApt?.date} at ${acceptModalApt?.startTime}? The status will become CONFIRMED and the client will be notified.`}
        confirmLabel="Accept & Confirm Booking"
        variant="success"
        onConfirm={handleConfirmAccept}
        onCancel={() => setAcceptModalApt(null)}
      />

      {/* REJECT CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={!!rejectModalApt}
        title="Reject Appointment Request"
        message={`Please provide a reason for declining ${rejectModalApt?.customerName}'s appointment request:`}
        confirmLabel="Decline Request"
        variant="danger"
        reasonRequired={true}
        reasonValue={rejectReason}
        onReasonChange={setRejectReason}
        reasonPlaceholder="e.g. Fully booked, salon power maintenance, stylist unavailable..."
        onConfirm={handleConfirmReject}
        onCancel={() => setRejectModalApt(null)}
      />
    </div>
  );
};
