import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/Badge';
import { formatINR } from '../../utils/slotUtils';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { BookingModal } from './BookingModal';
import {
  Calendar,
  Clock,
  MapPin,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Appointment } from '../../types';

export const MyAppointmentsPage: React.FC = () => {
  const { currentUser, appointments, updateAppointmentStatus, navigate } = useApp();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'pending' | 'completed' | 'cancelled'>('upcoming');
  const [selectedAppointmentForDetail, setSelectedAppointmentForDetail] = useState<Appointment | null>(null);
  const [cancelModalAppointmentId, setCancelModalAppointmentId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Re-book flow
  const [rebookModalOpen, setRebookModalOpen] = useState(false);
  const [rebookSalonId, setRebookSalonId] = useState<string | undefined>();
  const [rebookServiceId, setRebookServiceId] = useState<string | undefined>();

  // Filter current user's appointments
  const myAppointments = useMemo(() => {
    return appointments.filter(
      (a) => a.customerId === currentUser?.id || a.customerEmail === currentUser?.email
    );
  }, [appointments, currentUser]);

  const filteredAppointments = useMemo(() => {
    if (activeTab === 'upcoming') {
      return myAppointments.filter((a) => a.status === 'CONFIRMED');
    }
    if (activeTab === 'pending') {
      return myAppointments.filter((a) => a.status === 'PENDING');
    }
    if (activeTab === 'completed') {
      return myAppointments.filter((a) => a.status === 'COMPLETED');
    }
    // cancelled / rejected / no show
    return myAppointments.filter((a) => ['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(a.status));
  }, [myAppointments, activeTab]);

  const handleConfirmCancel = () => {
    if (cancelModalAppointmentId) {
      updateAppointmentStatus(cancelModalAppointmentId, 'CANCELLED', cancelReason || 'Cancelled by customer');
      setCancelModalAppointmentId(null);
      setCancelReason('');
    }
  };

  const handleRebook = (apt: Appointment) => {
    setRebookSalonId(apt.salonId);
    setRebookServiceId(apt.serviceId);
    setRebookModalOpen(true);
  };

  const counts = {
    upcoming: myAppointments.filter((a) => a.status === 'CONFIRMED').length,
    pending: myAppointments.filter((a) => a.status === 'PENDING').length,
    completed: myAppointments.filter((a) => a.status === 'COMPLETED').length,
    cancelled: myAppointments.filter((a) => ['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(a.status)).length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
            Booking Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
            My Appointments
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track appointment requests, view confirmed salon visits, and access service receipts.
          </p>
        </div>

        <button
          onClick={() => navigate('/salons')}
          className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Book New Appointment</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'upcoming'
              ? 'border-purple-700 text-purple-800 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Confirmed ({counts.upcoming})</span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'pending'
              ? 'border-purple-700 text-purple-800 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Pending Confirmation ({counts.pending})</span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'completed'
              ? 'border-purple-700 text-purple-800 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Past Visits ({counts.completed})</span>
        </button>

        <button
          onClick={() => setActiveTab('cancelled')}
          className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'cancelled'
              ? 'border-purple-700 text-purple-800 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Cancelled & Declined ({counts.cancelled})</span>
        </button>
      </div>

      {/* Appointment Cards List */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-700 mx-auto flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 font-display">
            No appointments found in this section
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab === 'upcoming'
              ? 'You have no confirmed upcoming salon appointments right now.'
              : activeTab === 'pending'
              ? 'No pending appointment requests awaiting salon confirmation.'
              : 'No historical bookings found.'}
          </p>
          <button
            onClick={() => navigate('/salons')}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Find a Salon
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((apt) => (
            <div
              key={apt.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow p-5 sm:p-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={apt.status} size="md" />
                    <span className="text-xs text-slate-400 font-mono">
                      Ref: #{apt.id}
                    </span>
                    <span className="text-xs text-slate-400">
                      Booked {new Date(apt.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                      {apt.serviceName}
                    </h3>
                    <p className="text-xs font-medium text-purple-700 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-purple-600" />
                      <span>
                        {apt.salonName} · {apt.salonAddress}, {apt.salonCity}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-xs text-slate-600 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-800">{apt.date}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-800">
                        {apt.startTime} - {apt.endTime}
                      </span>
                      <span className="text-slate-400">({apt.durationMinutes} mins)</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Amount:</span>
                      <span className="font-bold text-slate-900 font-display">
                        {formatINR(apt.price)}
                      </span>
                    </div>
                  </div>

                  {apt.rejectionReason && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      <strong>Decline Reason:</strong> {apt.rejectionReason}
                    </div>
                  )}

                  {apt.cancellationReason && (
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                      <strong>Cancellation Note:</strong> {apt.cancellationReason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                  <button
                    onClick={() => setSelectedAppointmentForDetail(apt)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    View Slip
                  </button>

                  {['PENDING', 'CONFIRMED'].includes(apt.status) && (
                    <button
                      onClick={() => setCancelModalAppointmentId(apt.id)}
                      className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}

                  {['COMPLETED', 'CANCELLED', 'REJECTED'].includes(apt.status) && (
                    <button
                      onClick={() => handleRebook(apt)}
                      className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Book Again</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Appointment Detail Receipt Modal */}
      {selectedAppointmentForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400">
                  Appointment Slip
                </span>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  #{selectedAppointmentForDetail.id}
                </h3>
              </div>
              <StatusBadge status={selectedAppointmentForDetail.status} />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Salon</span>
                <p className="font-bold text-slate-900 text-sm">
                  {selectedAppointmentForDetail.salonName}
                </p>
                <p className="text-slate-500">
                  {selectedAppointmentForDetail.salonAddress}, {selectedAppointmentForDetail.salonCity}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">Service</span>
                  <p className="font-semibold text-slate-900">
                    {selectedAppointmentForDetail.serviceName}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Duration</span>
                  <p className="font-semibold text-slate-900">
                    {selectedAppointmentForDetail.durationMinutes} mins
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Date</span>
                  <p className="font-semibold text-slate-900">
                    {selectedAppointmentForDetail.date}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Time Slot</span>
                  <p className="font-semibold text-slate-900">
                    {selectedAppointmentForDetail.startTime} - {selectedAppointmentForDetail.endTime}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">Estimated Total:</span>
                <span className="font-bold text-purple-900 font-display text-base">
                  {formatINR(selectedAppointmentForDetail.price)}
                </span>
              </div>

              {selectedAppointmentForDetail.notes && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600">
                  <strong>Notes:</strong> {selectedAppointmentForDetail.notes}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedAppointmentForDetail(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      <ConfirmationModal
        isOpen={!!cancelModalAppointmentId}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this booking? The salon owner will be notified."
        confirmLabel="Yes, Cancel"
        variant="danger"
        reasonRequired={true}
        reasonValue={cancelReason}
        onReasonChange={setCancelReason}
        reasonPlaceholder="e.g. Schedule conflict, feeling unwell..."
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelModalAppointmentId(null)}
      />

      {/* Rebook Modal */}
      <BookingModal
        isOpen={rebookModalOpen}
        onClose={() => setRebookModalOpen(false)}
        preselectedSalonId={rebookSalonId}
        preselectedServiceId={rebookServiceId}
      />
    </div>
  );
};
