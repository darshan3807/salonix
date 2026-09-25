import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SalonVisual } from '../common/SalonVisual';
import { StatusBadge } from '../common/Badge';
import { formatINR } from '../../utils/slotUtils';
import { BookingModal } from './BookingModal';
import { ConfirmationModal } from '../common/ConfirmationModal';
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  Star,
  Sparkles,
  ArrowRight,
  Heart,
  Scale,
  CalendarCheck,
  XCircle,
  Phone,
} from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const {
    currentUser,
    salons,
    appointments,
    categories,
    navigate,
    favorites,
    toggleFavorite,
    addToCompare,
    compareSalonIds,
    updateAppointmentStatus,
  } = useApp();

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedSalonForBooking, setSelectedSalonForBooking] = useState<string | undefined>(undefined);
  const [cancelModalAppointmentId, setCancelModalAppointmentId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const approvedSalons = salons.filter((s) => s.status === 'approved');

  // Customer's appointments
  const customerAppointments = appointments.filter(
    (a) => a.customerId === currentUser?.id || a.customerEmail === currentUser?.email
  );

  // Active/Upcoming appointment: First one with status PENDING or CONFIRMED
  const upcomingAppointment = customerAppointments.find(
    (a) => a.status === 'CONFIRMED' || a.status === 'PENDING'
  );

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleOpenBooking = (salonId?: string) => {
    setSelectedSalonForBooking(salonId);
    setBookingModalOpen(true);
  };

  const handleConfirmCancel = () => {
    if (cancelModalAppointmentId) {
      updateAppointmentStatus(cancelModalAppointmentId, 'CANCELLED', cancelReason || 'Customer requested cancellation.');
      setCancelModalAppointmentId(null);
      setCancelReason('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* WELCOME SECTION & QUICK ACTIONS */}
      <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-200">
            Customer Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-display mt-1 text-white">
            {getGreeting()}, {currentUser?.name || 'Guest'}!
          </h1>
          <p className="text-xs sm:text-sm text-purple-200/90 mt-1 max-w-xl">
            Explore trusted salons in {currentUser?.city || 'Pune'}, compare services, check live slot availability, and manage your beauty bookings.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/salons')}
            className="px-4 py-2.5 bg-white text-purple-900 hover:bg-purple-50 text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4 text-purple-700" />
            <span>Find a Salon</span>
          </button>
          <button
            onClick={() => handleOpenBooking()}
            className="px-4 py-2.5 bg-purple-700/80 hover:bg-purple-600 text-white text-xs font-semibold rounded-xl transition-all border border-purple-500/40 flex items-center gap-2 cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* UPCOMING APPOINTMENT HERO CARD */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-700" />
            <span>Upcoming Appointment</span>
          </h2>
          {customerAppointments.length > 0 && (
            <button
              onClick={() => navigate('/user/appointments')}
              className="text-xs font-semibold text-purple-700 hover:underline cursor-pointer"
            >
              View all ({customerAppointments.length})
            </button>
          )}
        </div>

        {upcomingAppointment ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <StatusBadge status={upcomingAppointment.status} size="md" />
                  <span className="text-xs text-slate-400 font-mono">
                    ID: {upcomingAppointment.id}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-display">
                    {upcomingAppointment.serviceName}
                  </h3>
                  <p className="text-xs font-medium text-purple-700 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                    <span>
                      {upcomingAppointment.salonName} · {upcomingAppointment.salonAddress}, {upcomingAppointment.salonCity}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-6 text-xs text-slate-600 flex-wrap pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-800">{upcomingAppointment.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-800">
                      {upcomingAppointment.startTime} - {upcomingAppointment.endTime}
                    </span>
                    <span className="text-slate-400">({upcomingAppointment.durationMinutes} min)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Price:</span>
                    <span className="font-bold text-slate-900 font-display">
                      {formatINR(upcomingAppointment.price)}
                    </span>
                  </div>
                </div>

                {upcomingAppointment.notes && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-w-xl">
                    <strong className="text-slate-700">Special Notes:</strong> {upcomingAppointment.notes}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2.5 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                <button
                  onClick={() => navigate('/user/appointments')}
                  className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  View Details
                </button>
                {upcomingAppointment.status !== 'CANCELLED' && upcomingAppointment.status !== 'COMPLETED' && (
                  <button
                    onClick={() => setCancelModalAppointmentId(upcomingAppointment.id)}
                    className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-700 mx-auto flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 font-display">
                No Upcoming Appointments
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
                Ready to refresh your style? Discover top rated salons near you and reserve your spot in seconds.
              </p>
            </div>
            <button
              onClick={() => navigate('/salons')}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Find a Salon</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* RECOMMENDED SALONS */}
      <div>
        <div className="flex items-end justify-between mb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 block">
              Handpicked For You
            </span>
            <h2 className="text-xl font-bold text-slate-900 font-display mt-0.5">
              Recommended Salons
            </h2>
          </div>
          <button
            onClick={() => navigate('/salons')}
            className="text-xs font-semibold text-purple-700 hover:underline cursor-pointer"
          >
            See all salons
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {approvedSalons.slice(0, 3).map((salon) => {
            const isFav = favorites.includes(salon.id);
            const isCompared = compareSalonIds.includes(salon.id);

            return (
              <div
                key={salon.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative">
                    <SalonVisual
                      name={salon.name}
                      city={salon.city}
                      accentColor={salon.accentColor}
                      aspect="16:9"
                    />
                    <button
                      onClick={() => toggleFavorite(salon.id)}
                      className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-colors ${
                        isFav
                          ? 'bg-rose-500 text-white'
                          : 'bg-white/80 text-slate-700 hover:bg-white'
                      }`}
                      aria-label="Toggle favorite"
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{salon.city}</span>
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>{salon.rating}</span>
                        <span className="text-slate-400 font-normal">({salon.reviewCount})</span>
                      </span>
                    </div>

                    <h3
                      onClick={() => navigate(`/salons/${salon.id}`)}
                      className="font-bold text-base text-slate-900 font-display hover:text-purple-700 transition-colors cursor-pointer line-clamp-1"
                    >
                      {salon.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {salon.description}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Starting from</span>
                      <span className="text-sm font-bold text-slate-900 font-display">
                        {formatINR(salon.startingPrice)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => addToCompare(salon.id)}
                        className={`p-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          isCompared
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        title={isCompared ? 'In comparison' : 'Compare'}
                      >
                        <Scale className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => navigate(`/salons/${salon.id}`)}
                        className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        View Salon
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Guided Booking Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        preselectedSalonId={selectedSalonForBooking}
      />

      {/* Cancellation confirmation modal */}
      <ConfirmationModal
        isOpen={!!cancelModalAppointmentId}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this booking? This slot will become available for other customers."
        confirmLabel="Yes, Cancel Booking"
        variant="danger"
        reasonRequired={true}
        reasonValue={cancelReason}
        onReasonChange={setCancelReason}
        reasonPlaceholder="e.g. Schedule conflict, sudden travel..."
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelModalAppointmentId(null)}
      />
    </div>
  );
};
