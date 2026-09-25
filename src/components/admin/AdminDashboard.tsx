import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/Badge';
import { formatINR } from '../../utils/slotUtils';
import { ConfirmationModal } from '../common/ConfirmationModal';
import {
  Users,
  Store,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Building,
  ArrowUpRight,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { Salon } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { users, salons, appointments, adminUpdateSalonStatus, navigate } = useApp();

  const totalUsers = users.filter((u) => u.role === 'customer').length;
  const totalSalons = salons.length;
  const pendingSalons = salons.filter((s) => s.status === 'pending');
  const totalAppointments = appointments.length;

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayAppointments = appointments.filter((a) => a.date === todayStr);
  const completedAppointments = appointments.filter((a) => a.status === 'COMPLETED');

  // Appointment Status distribution breakdown (Spec #4)
  const statusCounts = useMemo(() => {
    return {
      PENDING: appointments.filter((a) => a.status === 'PENDING').length,
      CONFIRMED: appointments.filter((a) => a.status === 'CONFIRMED').length,
      COMPLETED: appointments.filter((a) => a.status === 'COMPLETED').length,
      CANCELLED: appointments.filter((a) => a.status === 'CANCELLED').length,
      REJECTED: appointments.filter((a) => a.status === 'REJECTED').length,
    };
  }, [appointments]);

  // Salon Approval Modal
  const [salonActionTarget, setSalonActionTarget] = useState<{ salon: Salon; action: 'approved' | 'rejected' } | null>(null);

  const handleConfirmSalonAction = () => {
    if (salonActionTarget) {
      adminUpdateSalonStatus(salonActionTarget.salon.id, salonActionTarget.action);
      setSalonActionTarget(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Welcome */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">
              Platform Administration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display mt-1 text-white">
            Salonix System Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Global management portal for users, registered salon partners, and appointment fulfillment across India.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/admin/salons')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            Review Salons ({pendingSalons.length} Pending)
          </button>
        </div>
      </div>

      {/* STATISTIC CARDS (SPEC #4) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Users</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display tabular-nums">
            {totalUsers}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Active customers</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Salons</span>
            <Store className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display tabular-nums">
            {totalSalons}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Registered venues</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="text-xs font-medium">Pending Approvals</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-900 font-display tabular-nums">
            {pendingSalons.length}
          </p>
          <span className="text-[11px] text-amber-700 mt-1 block">Requires admin action</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Bookings</span>
            <Calendar className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display tabular-nums">
            {totalAppointments}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">All-time appointments</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Today's Visits</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display tabular-nums">
            {todayAppointments.length}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Scheduled for today</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display tabular-nums">
            {completedAppointments.length}
          </p>
          <span className="text-[11px] text-emerald-600 mt-1 block">Fulfilled visits</span>
        </div>
      </div>

      {/* APPOINTMENT OVERVIEW STATUS DISTRIBUTION (SPEC #4) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">
              Platform Appointment Lifecycle Overview
            </h2>
            <p className="text-xs text-slate-500">
              Live status breakdown of all {totalAppointments} appointment requests on Salonix.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Pending
            </span>
            <p className="text-2xl font-bold text-amber-900 font-display mt-1 tabular-nums">
              {statusCounts.PENDING}
            </p>
            <div className="w-full bg-amber-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-amber-600 h-full rounded-full"
                style={{ width: `${Math.round((statusCounts.PENDING / (totalAppointments || 1)) * 100)}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Confirmed
            </span>
            <p className="text-2xl font-bold text-emerald-900 font-display mt-1 tabular-nums">
              {statusCounts.CONFIRMED}
            </p>
            <div className="w-full bg-emerald-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full"
                style={{ width: `${Math.round((statusCounts.CONFIRMED / (totalAppointments || 1)) * 100)}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-purple-50 border border-purple-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
              Completed
            </span>
            <p className="text-2xl font-bold text-purple-900 font-display mt-1 tabular-nums">
              {statusCounts.COMPLETED}
            </p>
            <div className="w-full bg-purple-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-purple-700 h-full rounded-full"
                style={{ width: `${Math.round((statusCounts.COMPLETED / (totalAppointments || 1)) * 100)}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Cancelled
            </span>
            <p className="text-2xl font-bold text-slate-800 font-display mt-1 tabular-nums">
              {statusCounts.CANCELLED}
            </p>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-slate-500 h-full rounded-full"
                style={{ width: `${Math.round((statusCounts.CANCELLED / (totalAppointments || 1)) * 100)}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
              Rejected
            </span>
            <p className="text-2xl font-bold text-rose-900 font-display mt-1 tabular-nums">
              {statusCounts.REJECTED}
            </p>
            <div className="w-full bg-rose-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-rose-600 h-full rounded-full"
                style={{ width: `${Math.round((statusCounts.REJECTED / (totalAppointments || 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* RECENT SALON REGISTRATIONS (SPEC #4) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">
              Recent Salon Registrations & Approvals
            </h2>
            <p className="text-xs text-slate-500">
              Review salon owner registration submissions and verify partner credentials.
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/salons')}
            className="text-xs font-semibold text-purple-700 hover:underline cursor-pointer"
          >
            View all salons ({salons.length})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-2.5 px-3">Salon Name</th>
                <th className="py-2.5 px-3">Owner</th>
                <th className="py-2.5 px-3">City</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3">Registered Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {salons.slice(0, 6).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-semibold text-slate-900 font-display">
                    {s.name}
                  </td>
                  <td className="py-3 px-3">{s.ownerName}</td>
                  <td className="py-3 px-3">{s.city}</td>
                  <td className="py-3 px-3 text-slate-500">{s.phone}</td>
                  <td className="py-3 px-3 text-slate-500">{s.createdAt}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-3 px-3 text-right space-x-1.5">
                    {s.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => setSalonActionTarget({ salon: s, action: 'approved' })}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setSalonActionTarget({ salon: s, action: 'rejected' })}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => navigate(`/salons/${s.id}`)}
                        className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded text-[11px] cursor-pointer"
                      >
                        View Profile
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECENT APPOINTMENTS TABLE (SPEC #4) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">
              Recent Platform Appointments
            </h2>
            <p className="text-xs text-slate-500">
              Latest bookings placed across all salon venues.
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/appointments')}
            className="text-xs font-semibold text-purple-700 hover:underline cursor-pointer"
          >
            View all ({appointments.length})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-2.5 px-3">Apt ID</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Salon</th>
                <th className="py-2.5 px-3">Service</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {appointments.slice(0, 7).map((apt) => (
                <tr key={apt.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-mono font-medium text-slate-400">
                    #{apt.id}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    {apt.customerName}
                  </td>
                  <td className="py-3 px-3 text-purple-900 font-medium">
                    {apt.salonName}
                  </td>
                  <td className="py-3 px-3">{apt.serviceName}</td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-800">{apt.date}</span>
                    <span className="block text-slate-400 text-[11px]">{apt.startTime}</span>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900 font-display">
                    {formatINR(apt.price)}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={apt.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salon Approve/Reject Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!salonActionTarget}
        title={
          salonActionTarget?.action === 'approved'
            ? `Approve ${salonActionTarget?.salon.name}`
            : `Decline ${salonActionTarget?.salon.name}`
        }
        message={`Are you sure you want to mark this salon registration as ${salonActionTarget?.action.toUpperCase()}?`}
        confirmLabel={salonActionTarget?.action === 'approved' ? 'Approve Salon' : 'Reject Registration'}
        variant={salonActionTarget?.action === 'approved' ? 'success' : 'danger'}
        onConfirm={handleConfirmSalonAction}
        onCancel={() => setSalonActionTarget(null)}
      />
    </div>
  );
};
