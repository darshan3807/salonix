import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { SalonVisual } from '../common/SalonVisual';
import { formatINR, generateSalonSlots } from '../../utils/slotUtils';
import { BookingModal } from './BookingModal';
import {
  MapPin,
  Star,
  Clock,
  Phone,
  Mail,
  Heart,
  Scale,
  Calendar,
  Sparkles,
  ChevronLeft,
  CheckCircle,
  ShieldCheck,
  Share2,
} from 'lucide-react';

interface SalonDetailPageProps {
  salonId: string;
}

export const SalonDetailPage: React.FC<SalonDetailPageProps> = ({ salonId }) => {
  const { salons, services, categories, appointments, favorites, toggleFavorite, addToCompare, compareSalonIds, navigate } = useApp();

  const salon = salons.find((s) => s.id === salonId) || salons[0];
  const salonServices = services.filter((s) => s.salonId === salon.id && s.status === 'active');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedSlotDate, setSelectedSlotDate] = useState<string>(todayStr);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [preselectedServiceId, setPreselectedServiceId] = useState<string | undefined>();
  const [preselectedSlotTime, setPreselectedSlotTime] = useState<string | undefined>();

  const isFav = favorites.includes(salon.id);
  const isCompared = compareSalonIds.includes(salon.id);

  // Generate slots for selected date
  const generatedSlots = useMemo(() => {
    return generateSalonSlots(salon, selectedSlotDate, appointments);
  }, [salon, selectedSlotDate, appointments]);

  // Next 7 dates
  const nextDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { dateStr, dayName, monthDay, isToday: i === 0 };
  });

  const handleBookService = (serviceId?: string, timeSlot?: string) => {
    setPreselectedServiceId(serviceId);
    setPreselectedSlotTime(timeSlot);
    setBookingModalOpen(true);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert('Salon link copied to clipboard!');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/salons')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-purple-700 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to All Salons</span>
        </button>
      </div>

      {/* TOP HEADER & GALLERY SECTION */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Main Visual */}
          <div className="lg:col-span-7 relative min-h-[300px] lg:min-h-[400px]">
            <SalonVisual
              name={salon.name}
              city={salon.city}
              accentColor={salon.accentColor}
              aspect="16:9"
              className="h-full w-full object-cover"
            />
          </div>

          {/* Salon Key Info */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md">
                  {salon.city} · Verified Partner
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Share salon"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleFavorite(salon.id)}
                    className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                      isFav
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    title="Add to favorites"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display leading-tight">
                {salon.name}
              </h1>

              <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                <div className="flex items-center gap-1 font-semibold text-slate-900">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>{salon.rating}</span>
                  <span className="text-slate-400 font-normal">
                    ({salon.reviewCount} reviews)
                  </span>
                </div>
                <span>·</span>
                <span className="text-emerald-700 font-medium">98% Recommended</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                {salon.description}
              </p>
            </div>

            {/* Quick Contact & Hours */}
            <div className="space-y-2 pt-4 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                <span>
                  {salon.address}, {salon.city} - {salon.pincode}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-purple-700 shrink-0" />
                <span>
                  Hours: {salon.openingTime} – {salon.closingTime} (
                  {salon.workingDays.join(', ')})
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-purple-700 shrink-0" />
                <span>{salon.phone}</span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
              <button
                onClick={() => handleBookService()}
                className="flex-1 py-3 px-4 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all text-center cursor-pointer"
              >
                Book Appointment Now
              </button>
              <button
                onClick={() => addToCompare(salon.id)}
                className={`py-3 px-3.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isCompared
                    ? 'bg-purple-50 text-purple-700 border-purple-300 font-semibold'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Scale className="w-4 h-4" />
                <span className="hidden sm:inline">Compare</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN CONTENT: SERVICES & ABOUT vs WORKING HOURS & LIVE SLOTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (8 cols): About & Services */}
        <div className="lg:col-span-8 space-y-8">
          {/* About Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 font-display">
              About {salon.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {salon.about}
            </p>
            <div className="pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Sanitized Equipment</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Air Conditioned</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Digital Payments Accepted</span>
              </span>
            </div>
          </div>

          {/* Services Menu Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-display">
                  Services & Treatments Menu
                </h2>
                <p className="text-xs text-slate-500">
                  Select any service to book an instant slot.
                </p>
              </div>
              <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md">
                {salonServices.length} Services Available
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {salonServices.map((service) => (
                <div
                  key={service.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 font-display group-hover:text-purple-700 transition-colors">
                        {service.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {service.duration} mins
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {service.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="text-base font-bold text-slate-900 font-display">
                        {formatINR(service.price)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleBookService(service.id)}
                      className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      Book Service
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Working Hours & Live Available Slots */}
        <div className="lg:col-span-4 space-y-6">
          {/* Live Available Slots Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-700" />
                  <span>Check Available Slots</span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose a date to view live openings:
              </p>
            </div>

            {/* Quick Date Scroller */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {nextDates.map((item) => (
                <button
                  key={item.dateStr}
                  type="button"
                  onClick={() => setSelectedSlotDate(item.dateStr)}
                  className={`px-3 py-2 rounded-xl border text-center transition-all shrink-0 cursor-pointer ${
                    selectedSlotDate === item.dateStr
                      ? 'border-purple-600 bg-purple-50 text-purple-900 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider block text-slate-400">
                    {item.isToday ? 'Today' : item.dayName}
                  </span>
                  <span className="text-xs font-bold block mt-0.5 font-display">
                    {item.monthDay}
                  </span>
                </button>
              ))}
            </div>

            {/* Slot Grid */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                <span>Slots for {selectedSlotDate}:</span>
                <span className="text-purple-700 font-semibold">
                  {generatedSlots.filter((s) => s.status === 'available').length} Open
                </span>
              </div>

              {generatedSlots.length === 0 ? (
                <p className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl text-center">
                  Salon is closed on this date.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1">
                  {generatedSlots.map((slot) => {
                    const isAvailable = slot.status === 'available';

                    return (
                      <button
                        key={slot.time}
                        disabled={!isAvailable}
                        onClick={() => handleBookService(undefined, slot.time)}
                        className={`p-2 rounded-lg text-xs font-medium text-center transition-all ${
                          isAvailable
                            ? 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-700 hover:text-white cursor-pointer shadow-xs'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed line-through'
                        }`}
                        title={isAvailable ? 'Click to book this slot' : 'Slot already booked or during break'}
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Working Hours Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-700" />
              <span>Working Hours Schedule</span>
            </h3>

            <div className="space-y-1.5 text-xs divide-y divide-slate-100">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                const isOpen = salon.workingDays.includes(day);
                return (
                  <div key={day} className="pt-1.5 flex items-center justify-between">
                    <span className="font-medium text-slate-700">{day}</span>
                    <span className={isOpen ? 'text-slate-800' : 'text-slate-400'}>
                      {isOpen ? `${salon.openingTime} - ${salon.closingTime}` : 'Closed'}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              Break time: {salon.breakStartTime} - {salon.breakEndTime}
            </p>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        preselectedSalonId={salon.id}
        preselectedServiceId={preselectedServiceId}
        preselectedDate={selectedSlotDate}
        preselectedTime={preselectedSlotTime}
      />
    </div>
  );
};
