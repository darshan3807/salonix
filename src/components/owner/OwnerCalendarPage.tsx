import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/Badge';
import { formatINR } from '../../utils/slotUtils';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, User, Phone } from 'lucide-react';

export const OwnerCalendarPage: React.FC = () => {
  const { currentUser, salons, appointments } = useApp();

  const mySalon = salons.find((s) => s.ownerId === currentUser?.id || s.id === currentUser?.salonId) || salons[0];
  const salonAppointments = useMemo(() => {
    return appointments.filter((a) => a.salonId === mySalon?.id);
  }, [appointments, mySalon]);

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Generate 7 days around selected date
  const weekDays = useMemo(() => {
    const base = new Date(selectedDate);
    const dayIndex = base.getDay(); // 0 is Sunday
    // Start from Monday (or Sunday)
    const result = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const str = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateNum = d.getDate();
      const isSelected = str === selectedDate;
      result.push({ dateStr: str, dayName, dateNum, isSelected });
    }
    return result;
  }, [selectedDate]);

  // Appointments on selectedDate
  const dayAppointments = useMemo(() => {
    return salonAppointments
      .filter((a) => a.date === selectedDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [salonAppointments, selectedDate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
            Salon Floor Schedule
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-0.5">
            Calendar & Timetable
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visual day-by-day appointment breakdown for styling stations.
          </p>
        </div>
      </div>

      {/* Week Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
        {weekDays.map((item) => (
          <button
            key={item.dateStr}
            onClick={() => setSelectedDate(item.dateStr)}
            className={`py-2 px-3 rounded-xl border text-center transition-all min-w-[70px] cursor-pointer ${
              item.isSelected
                ? 'bg-purple-700 text-white font-semibold shadow-xs border-purple-700'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider block opacity-80">
              {item.dayName}
            </span>
            <span className="text-base font-bold block font-display">
              {item.dateNum}
            </span>
          </button>
        ))}
      </div>

      {/* Daily Appointments Schedule Feed */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-700" />
            <span>Schedule for {selectedDate} ({dayAppointments.length} bookings)</span>
          </h2>
          <span className="text-xs text-slate-400">
            Operating: {mySalon.openingTime} - {mySalon.closingTime}
          </span>
        </div>

        {dayAppointments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No appointments scheduled for this date</p>
            <p className="text-slate-400">All slots are open for client bookings.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayAppointments.map((apt) => (
              <div
                key={apt.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-purple-200 hover:bg-purple-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-20 bg-purple-50 text-purple-900 font-mono text-xs font-semibold py-2 px-2.5 rounded-lg text-center shrink-0 border border-purple-200/60">
                    {apt.startTime}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm font-display">
                        {apt.serviceName}
                      </h4>
                      <StatusBadge status={apt.status} />
                    </div>
                    <p className="text-xs text-slate-600 flex items-center gap-2 mt-1">
                      <span className="font-medium text-slate-800">{apt.customerName}</span>
                      <span>·</span>
                      <span className="text-slate-500">{apt.customerPhone}</span>
                      <span>·</span>
                      <span className="text-slate-400">{apt.durationMinutes} mins</span>
                    </p>
                    {apt.notes && (
                      <p className="text-[11px] text-slate-500 mt-1 italic">
                        "{apt.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-base font-bold text-slate-900 font-display block">
                    {formatINR(apt.price)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Ref #{apt.id}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
