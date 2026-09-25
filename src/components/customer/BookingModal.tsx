import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Salon, Service, TimeSlot } from '../../types';
import { generateSalonSlots, formatINR } from '../../utils/slotUtils';
import {
  Calendar,
  Clock,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  MapPin,
  FileText,
} from 'lucide-react';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedSalonId?: string;
  preselectedServiceId?: string;
  preselectedDate?: string;
  preselectedTime?: string;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  preselectedSalonId,
  preselectedServiceId,
  preselectedDate,
  preselectedTime,
}) => {
  const { salons, services, appointments, bookAppointment, navigate } = useApp();

  const approvedSalons = useMemo(() => salons.filter((s) => s.status === 'approved'), [salons]);

  // Step state: 1 to 5, plus 6 for Success
  const [step, setStep] = useState<number>(1);

  // Selected parameters
  const [selectedSalonId, setSelectedSalonId] = useState<string>(
    preselectedSalonId || approvedSalons[0]?.id || ''
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    preselectedServiceId || ''
  );

  // Calculate default today YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [selectedDate, setSelectedDate] = useState<string>(preselectedDate || todayStr);
  const [selectedSlot, setSelectedSlot] = useState<string>(preselectedTime || '');
  const [notes, setNotes] = useState<string>('');
  const [bookingResult, setBookingResult] = useState<{ id: string } | null>(null);

  // Sync if preselected props change
  React.useEffect(() => {
    if (preselectedSalonId) setSelectedSalonId(preselectedSalonId);
    if (preselectedServiceId) setSelectedServiceId(preselectedServiceId);
    if (preselectedDate) setSelectedDate(preselectedDate);
    if (preselectedTime) setSelectedSlot(preselectedTime);
  }, [preselectedSalonId, preselectedServiceId, preselectedDate, preselectedTime]);

  const currentSalon = salons.find((s) => s.id === selectedSalonId);
  const availableServicesForSalon = services.filter(
    (s) => s.salonId === selectedSalonId && s.status === 'active'
  );
  const currentService = services.find((s) => s.id === selectedServiceId);

  // Generate slots for selected salon and date
  const timeSlots = useMemo(() => {
    if (!currentSalon || !selectedDate) return [];
    return generateSalonSlots(currentSalon, selectedDate, appointments);
  }, [currentSalon, selectedDate, appointments]);

  if (!isOpen) return null;

  // Next 7 dates generator
  const upcomingDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { dateStr, dayName, monthDay, isToday: i === 0 };
  });

  const handleConfirm = () => {
    if (!selectedSalonId || !selectedServiceId || !selectedDate || !selectedSlot) {
      return;
    }
    const created = bookAppointment({
      salonId: selectedSalonId,
      serviceId: selectedServiceId,
      date: selectedDate,
      startTime: selectedSlot,
      notes,
    });
    if (created) {
      setBookingResult({ id: created.id });
      setStep(6); // Success screen
    }
  };

  const handleFinishAndNavigate = () => {
    onClose();
    navigate('/user/appointments');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Steps */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-700">
              {step <= 5 ? `Step ${step} of 5` : 'Confirmation'}
            </span>
            <h3 className="text-base font-bold text-slate-900 font-display">
              {step === 1 && 'Select Salon'}
              {step === 2 && 'Select Service'}
              {step === 3 && 'Choose Date'}
              {step === 4 && 'Pick Time Slot'}
              {step === 5 && 'Confirm Booking'}
              {step === 6 && 'Appointment Requested!'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        {step <= 5 && (
          <div className="w-full bg-slate-100 h-1">
            <div
              className="bg-purple-700 h-1 transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* STEP 1: SELECT SALON */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Choose the salon you want to visit:
              </p>
              {approvedSalons.map((salon) => (
                <div
                  key={salon.id}
                  onClick={() => {
                    setSelectedSalonId(salon.id);
                    setSelectedServiceId('');
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedSalonId === salon.id
                      ? 'border-purple-600 bg-purple-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 font-display">
                      {salon.name}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {salon.city} · {salon.address}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-900">
                      from {formatINR(salon.startingPrice)}
                    </span>
                    <span className="block text-[11px] text-amber-600 font-medium">
                      ★ {salon.rating}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 2: SELECT SERVICE */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Select treatment for {currentSalon?.name}:
              </p>
              {availableServicesForSalon.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No active services found for this salon.
                </div>
              ) : (
                availableServicesForSalon.map((srv) => (
                  <div
                    key={srv.id}
                    onClick={() => setSelectedServiceId(srv.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedServiceId === srv.id
                        ? 'border-purple-600 bg-purple-50/60 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="max-w-[70%]">
                      <h4 className="text-sm font-semibold text-slate-900 font-display">
                        {srv.name}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {srv.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900 font-display">
                        {formatINR(srv.price)}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {srv.duration} mins
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* STEP 3: SELECT DATE */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Select your preferred appointment date:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {upcomingDates.map((item) => (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => {
                      setSelectedDate(item.dateStr);
                      setSelectedSlot('');
                    }}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedDate === item.dateStr
                        ? 'border-purple-600 bg-purple-50 text-purple-900 font-semibold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-[11px] uppercase tracking-wider block text-slate-500 font-medium">
                      {item.isToday ? 'Today' : item.dayName}
                    </span>
                    <span className="text-sm font-bold block mt-0.5 font-display">
                      {item.monthDay}
                    </span>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Or pick a specific calendar date:
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot('');
                  }}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
                />
              </div>
            </div>
          )}

          {/* STEP 4: PICK TIME SLOT */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">
                  Available Slots on {selectedDate}:
                </span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-purple-100 border border-purple-300" />
                    <span>Available</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-200" />
                    <span>Booked</span>
                  </span>
                </div>
              </div>

              {timeSlots.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                  The salon is closed on this day. Please pick a working day.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto p-1">
                  {timeSlots.map((slot) => {
                    const isAvailable = slot.status === 'available';
                    const isSelected = selectedSlot === slot.time;

                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedSlot(slot.time)}
                        className={`p-2.5 rounded-lg text-xs font-medium text-center transition-all ${
                          isSelected
                            ? 'bg-purple-700 text-white font-semibold shadow-xs'
                            : isAvailable
                            ? 'bg-purple-50/60 hover:bg-purple-100 text-purple-900 border border-purple-200 cursor-pointer'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed line-through'
                        }`}
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: SUMMARY & CONFIRM */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50/60 border border-purple-200/80 rounded-2xl space-y-3">
                <div className="flex justify-between items-start pb-2 border-b border-purple-200/60">
                  <div>
                    <span className="text-[11px] text-purple-700 font-semibold uppercase">
                      Salon
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 font-display">
                      {currentSalon?.name}
                    </h4>
                    <p className="text-xs text-slate-500">{currentSalon?.address}, {currentSalon?.city}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Service</span>
                    <span className="font-semibold text-slate-900">
                      {currentService?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Duration</span>
                    <span className="font-semibold text-slate-900">
                      {currentService?.duration} minutes
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Date</span>
                    <span className="font-semibold text-slate-900">{selectedDate}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Time Slot</span>
                    <span className="font-semibold text-slate-900">{selectedSlot}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">Total Payable at Salon:</span>
                  <span className="text-base font-bold text-purple-900 font-display">
                    {formatINR(currentService?.price || 0)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Special Notes / Styling Requests (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Skin sensitive to perfumes, request senior hair stylist..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 6: SUCCESS */}
          {step === 6 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 font-display">
                  Appointment Request Sent Successfully!
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                  Your appointment request has been transmitted to <strong>{currentSalon?.name}</strong>. The salon owner will review and confirm your slot shortly.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl inline-block text-left text-xs space-y-1">
                <p>
                  Status:{' '}
                  <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Pending Owner Confirmation
                  </span>
                </p>
                <p className="text-slate-500">
                  Appointment ID: <span className="font-mono">{bookingResult?.id}</span>
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleFinishAndNavigate}
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  View My Appointments
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {step <= 5 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <button
                type="button"
                disabled={
                  (step === 1 && !selectedSalonId) ||
                  (step === 2 && !selectedServiceId) ||
                  (step === 3 && !selectedDate) ||
                  (step === 4 && !selectedSlot)
                }
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-1 px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirm}
                className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Confirm Appointment
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
