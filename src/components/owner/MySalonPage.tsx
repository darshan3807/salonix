import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { SalonVisual } from '../common/SalonVisual';
import { generateSalonSlots } from '../../utils/slotUtils';
import {
  Store,
  Clock,
  MapPin,
  Phone,
  Mail,
  Save,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Eye,
} from 'lucide-react';

export const MySalonPage: React.FC = () => {
  const { currentUser, salons, updateSalon, appointments } = useApp();

  const mySalon = salons.find((s) => s.ownerId === currentUser?.id || s.id === currentUser?.salonId) || salons[0];

  // Form states
  const [name, setName] = useState(mySalon?.name || '');
  const [tagline, setTagline] = useState(mySalon?.tagline || '');
  const [description, setDescription] = useState(mySalon?.description || '');
  const [about, setAbout] = useState(mySalon?.about || '');
  const [address, setAddress] = useState(mySalon?.address || '');
  const [city, setCity] = useState(mySalon?.city || 'Pune');
  const [state, setState] = useState(mySalon?.state || 'Maharashtra');
  const [pincode, setPincode] = useState(mySalon?.pincode || '411001');
  const [phone, setPhone] = useState(mySalon?.phone || '');
  const [email, setEmail] = useState(mySalon?.email || '');

  // Slot Management Fields (Spec #10)
  const [openingTime, setOpeningTime] = useState(mySalon?.openingTime || '10:00');
  const [closingTime, setClosingTime] = useState(mySalon?.closingTime || '20:30');
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(mySalon?.slotDurationMinutes || 30);
  const [breakStartTime, setBreakStartTime] = useState(mySalon?.breakStartTime || '13:30');
  const [breakEndTime, setBreakEndTime] = useState(mySalon?.breakEndTime || '14:30');
  const [workingDays, setWorkingDays] = useState<string[]>(
    mySalon?.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  );

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSalon(mySalon.id, {
      name,
      tagline,
      description,
      about,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      openingTime,
      closingTime,
      slotDurationMinutes: Number(slotDurationMinutes),
      breakStartTime,
      breakEndTime,
      workingDays,
    });
  };

  // Live slot preview for Today based on these configuration settings
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const previewSalonObj = useMemo(() => ({
    ...mySalon,
    openingTime,
    closingTime,
    slotDurationMinutes: Number(slotDurationMinutes),
    breakStartTime,
    breakEndTime,
    workingDays,
  }), [mySalon, openingTime, closingTime, slotDurationMinutes, breakStartTime, breakEndTime, workingDays]);

  const previewSlots = useMemo(() => {
    return generateSalonSlots(previewSalonObj, todayStr, appointments);
  }, [previewSalonObj, todayStr, appointments]);

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
            Salon Profile & Setup
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
            My Salon & Slot Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Update your public profile, contact details, working hours, and automated slot generation rules.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* SECTION 1: SALON DETAILS (SPEC #8) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Store className="w-5 h-5 text-purple-700" />
            <h2 className="text-base font-bold text-slate-900 font-display">
              Salon Identity & Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Salon Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Short Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Modern salon & bridal studio in Pune"
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Short Description (Card Summary)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              About Salon (Detailed Story for Customers)
            </label>
            <textarea
              rows={4}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Street Address
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                City
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Pincode
              </label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: SLOT MANAGEMENT & WORKING HOURS (SPEC #10) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-700" />
              <h2 className="text-base font-bold text-slate-900 font-display">
                Slot Management & Working Hours
              </h2>
            </div>
            <span className="text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md font-semibold">
              Automatic Slot Engine
            </span>
          </div>

          {/* Working Days */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Working Days of the Week:
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {daysOfWeek.map((day) => {
                const isSelected = workingDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-700 text-white font-semibold shadow-xs'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hours and Slot durations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Opening Time
              </label>
              <input
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Closing Time
              </label>
              <input
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Slot Duration
              </label>
              <select
                value={slotDurationMinutes}
                onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700 bg-white"
              >
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes (Recommended)</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Break Start Time
              </label>
              <input
                type="time"
                value={breakStartTime}
                onChange={(e) => setBreakStartTime(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Break End Time
              </label>
              <input
                type="time"
                value={breakEndTime}
                onChange={(e) => setBreakEndTime(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>
          </div>

          {/* Live Slot Generation Preview */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-purple-700" />
                <span>Live Slot Engine Preview ({previewSlots.length} slots generated for today):</span>
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-purple-100 border border-purple-300" />
                  <span>Available ({previewSlots.filter(s => s.status === 'available').length})</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-200" />
                  <span>Booked ({previewSlots.filter(s => s.status === 'booked').length})</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-300" />
                  <span>Break/Unavailable</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 p-3 bg-slate-50 rounded-xl max-h-48 overflow-y-auto">
              {previewSlots.map((slot) => {
                const isAvailable = slot.status === 'available';
                const isBooked = slot.status === 'booked';

                return (
                  <div
                    key={slot.time}
                    className={`p-2 rounded-lg text-center text-[11px] font-medium border ${
                      isAvailable
                        ? 'bg-white border-purple-200 text-purple-900 shadow-xs'
                        : isBooked
                        ? 'bg-slate-200 border-slate-300 text-slate-500 line-through'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    {slot.time}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            className="px-6 py-3 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Salon & Slot Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
};
