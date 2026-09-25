import { Appointment, Salon, TimeSlot } from '../types';

/**
 * Format a number as Indian Rupee (INR) currency.
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Convert 24h time ("14:30") to 12h time ("02:30 PM")
 */
export function formatTo12Hour(time24: string): string {
  const [hoursStr, minutesStr] = time24.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr || '0', 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const paddedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const paddedHours = hours < 10 ? `0${hours}` : `${hours}`;
  return `${paddedHours}:${paddedMinutes} ${ampm}`;
}

/**
 * Calculate end time given a start 12h time string and duration in minutes
 */
export function calculateEndTime(start12h: string, durationMinutes: number): string {
  // Parse "10:30 AM"
  const match = start12h.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return start12h;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  const totalStartMinutes = hours * 60 + minutes;
  const totalEndMinutes = totalStartMinutes + durationMinutes;

  let endHours = Math.floor(totalEndMinutes / 60) % 24;
  const endMins = totalEndMinutes % 60;
  const endAmpm = endHours >= 12 ? 'PM' : 'AM';
  endHours = endHours % 12;
  endHours = endHours ? endHours : 12;

  const paddedMins = endMins < 10 ? `0${endMins}` : `${endMins}`;
  const paddedHours = endHours < 10 ? `0${endHours}` : `${endHours}`;

  return `${paddedHours}:${paddedMins} ${endAmpm}`;
}

/**
 * Convert minutes from midnight to "HH:MM"
 */
function minutesToTime24(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Convert "HH:MM" to minutes from midnight
 */
function time24ToMinutes(time24: string): number {
  const [h, m] = time24.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Generate all slots for a given salon on a specific date, checking against existing appointments
 */
export function generateSalonSlots(
  salon: Salon,
  dateString: string, // YYYY-MM-DD
  existingAppointments: Appointment[]
): TimeSlot[] {
  // Check working day
  const dateObj = new Date(dateString + 'T00:00:00');
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[dateObj.getDay()];

  const isWorkingDay = salon.workingDays.includes(dayName);

  const openMins = time24ToMinutes(salon.openingTime || '09:00');
  const closeMins = time24ToMinutes(salon.closingTime || '20:00');
  const slotDuration = salon.slotDurationMinutes || 30;
  const breakStartMins = salon.breakStartTime ? time24ToMinutes(salon.breakStartTime) : -1;
  const breakEndMins = salon.breakEndTime ? time24ToMinutes(salon.breakEndTime) : -1;

  // Filter existing active appointments on this date
  const appointmentsOnDate = existingAppointments.filter(
    (apt) =>
      apt.salonId === salon.id &&
      apt.date === dateString &&
      ['PENDING', 'CONFIRMED'].includes(apt.status)
  );

  const bookedStartTimes = new Set(appointmentsOnDate.map((apt) => apt.startTime.trim()));

  const slots: TimeSlot[] = [];

  for (let current = openMins; current + slotDuration <= closeMins; current += slotDuration) {
    const time24 = minutesToTime24(current);
    const time12 = formatTo12Hour(time24);

    let status: TimeSlot['status'] = 'available';

    if (!isWorkingDay) {
      status = 'unavailable';
    } else if (
      breakStartMins !== -1 &&
      breakEndMins !== -1 &&
      current >= breakStartMins &&
      current < breakEndMins
    ) {
      status = 'unavailable';
    } else if (bookedStartTimes.has(time12)) {
      status = 'booked';
    }

    slots.push({
      time: time12,
      time24,
      status,
    });
  }

  return slots;
}
