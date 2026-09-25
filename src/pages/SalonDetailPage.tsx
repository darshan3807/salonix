import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Salon, Service } from '../types/index.ts';
import { 
  ArrowLeft, Star, MapPin, Clock, Phone, Mail, 
  Scissors, Check, Calendar, CheckCircle2, ShieldCheck, X
} from 'lucide-react';

export const SalonDetailPage: React.FC = () => {
  const { selectedSalonId, user, navigateTo } = useApp();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Booking Modal State
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string>('10:30 AM');
  const [customerName, setCustomerName] = useState<string>(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState<string>(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState<string>(user?.email || '');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.name);
      if (!customerPhone && user.phone) setCustomerPhone(user.phone);
      if (!customerEmail) setCustomerEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    const fetchSalonDetails = async () => {
      if (!selectedSalonId) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/salons/${selectedSalonId}`);
        if (res.ok) {
          const data = await res.json();
          setSalon(data.salon);
          setServices(data.services || []);
        }
      } catch (e) {
        console.error('Error fetching salon details:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalonDetails();
  }, [selectedSalonId]);

  const timeSlots = [
    '09:30 AM', '10:15 AM', '11:00 AM', '11:45 AM',
    '01:30 PM', '02:15 PM', '03:00 PM', '04:00 PM',
    '05:00 PM', '05:45 PM', '06:30 PM', '07:15 PM'
  ];

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon || !bookingService || !customerName || !customerPhone) {
      setErrorMsg('Please enter your name, phone number, and choose a time slot.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user?.uid || `guest-${Date.now().toString().slice(-4)}`,
          customerName,
          customerPhone,
          customerEmail,
          salonId: salon.id,
          salonName: salon.name,
          salonCity: salon.city,
          salonAddress: salon.address,
          serviceId: bookingService.id,
          serviceName: bookingService.name,
          date: bookingDate,
          startTime: selectedSlot,
          durationMinutes: bookingService.duration,
          price: bookingService.price,
          notes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBookingSuccess(data.appointment);
      } else {
        setErrorMsg(data.error || 'Booking failed');
      }
    } catch (err: any) {
      setErrorMsg('Network error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-20 text-center text-slate-400">Loading salon details...</div>;
  }

  if (!salon) {
    return (
      <div className="p-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Salon Not Found</h2>
        <button
          onClick={() => navigateTo('salons')}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg cursor-pointer"
        >
          Back to Salons
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Back button */}
      <div>
        <button
          onClick={() => navigateTo('salons')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Salons</span>
        </button>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-slate-800">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Verified Salon
            </span>
            <div className="flex items-center gap-1 bg-purple-600 text-white px-2.5 py-0.5 rounded-full text-xs font-bold shadow-xs">
              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              <span>{salon.rating || 4.8} ({salon.review_count || 42} reviews)</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">
            {salon.name}
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed">
            {salon.about || salon.description || salon.tagline}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-purple-400" />
              <span>{salon.address}, {salon.city}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>{salon.opening_time || '09:00 AM'} - {salon.closing_time || '08:00 PM'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 text-center w-full md:w-auto">
          <span className="text-xs uppercase font-bold text-slate-300 block">Services Starting At</span>
          <span className="text-3xl font-serif font-bold text-purple-300">₹{salon.starting_price || 250}</span>
          <span className="text-[11px] text-slate-400 block mt-1">Instant Slot Booking</span>
        </div>
      </div>

      {/* Services Menu */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-serif font-bold text-slate-900">
              Select a Service to Book
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose your haircut, spa, facial or grooming service below
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {services.length} services available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-purple-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-slate-900 text-base">{service.name}</h3>
                  <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg text-sm border border-purple-200">
                    ₹{service.price}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {service.description || 'Standard professional salon care.'}
                </p>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-500" />
                  <span>Duration: {service.duration} mins</span>
                </div>
              </div>

              <button
                onClick={() => setBookingService(service)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Book This Service</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Modal */}
      {bookingService && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 border border-slate-200 my-8">
            
            {bookingSuccess ? (
              <div className="text-center space-y-5 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-serif font-bold text-slate-900">
                    Appointment Confirmed!
                  </h3>
                  <p className="text-xs text-slate-500">
                    Your slot at <strong className="text-slate-800">{salon.name}</strong> is reserved.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Service:</span>
                    <span className="font-bold text-slate-900">{bookingSuccess.service_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date & Slot:</span>
                    <span className="font-bold text-purple-700">{bookingSuccess.date} at {bookingSuccess.start_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estimated Price:</span>
                    <span className="font-bold text-slate-900">₹{bookingSuccess.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Client:</span>
                    <span className="text-slate-900">{bookingSuccess.customer_name} ({bookingSuccess.customer_phone})</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setBookingSuccess(null);
                      setBookingService(null);
                      if (user?.role === 'customer') {
                        navigateTo('customer-dashboard');
                      } else {
                        navigateTo('salons');
                      }
                    }}
                    className="flex-1 py-3 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors cursor-pointer"
                  >
                    {user?.role === 'customer' ? 'View in My Appointments' : 'Done'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs uppercase font-bold text-purple-700">Schedule Appointment</span>
                    <h3 className="text-xl font-serif font-bold text-slate-900 mt-0.5">
                      {bookingService.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      ₹{bookingService.price} • {bookingService.duration} mins • at {salon.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setBookingService(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleBookAppointment} className="space-y-4">
                  {/* Date selection */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Appointment Date
                    </label>
                    <input
                      type="date"
                      required
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Slot selector */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Select Available Time Slot
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            selectedSlot === slot
                              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-purple-400'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Special Request or Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Skin sensitive, request master stylist"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md shadow-purple-600/25 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <span>Reserving slot...</span>
                      ) : (
                        <span>Confirm Appointment Reservation</span>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
