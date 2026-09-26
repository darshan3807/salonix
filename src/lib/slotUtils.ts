/**
 * Time and slot availability utilities for Salonix
 */

/**
 * Converts a time string (e.g. "10:00", "10:00 AM", "02:30 PM", "20:30") to total minutes from midnight.
 * Returns null if invalid.
 */
export function timeStringToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const clean = timeStr.trim();
  if (!clean) return null;

  // Check for 12-hour format with AM/PM (e.g. "09:30 AM", "4:00 PM")
  const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const meridian = ampmMatch[3].toUpperCase();
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;

    if (meridian === 'AM') {
      if (hours === 12) hours = 0;
    } else if (meridian === 'PM') {
      if (hours !== 12) hours += 12;
    }
    return hours * 60 + minutes;
  }

  // Check for 24-hour format (e.g. "10:00", "09:30", "20:30")
  const h24Match = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    const hours = parseInt(h24Match[1], 10);
    const minutes = parseInt(h24Match[2], 10);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  return null;
}

/**
 * Converts minutes from midnight into 12-hour display format: e.g. 630 -> "10:30 AM", 870 -> "02:30 PM".
 */
export function minutesToDisplayTime(totalMinutes: number): string {
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  let hours = Math.floor(norm / 60);
  const minutes = norm % 60;
  const meridian = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  if (hours === 0) hours = 12;

  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  return `${hh}:${mm} ${meridian}`;
}

/**
 * Converts minutes from midnight into 24-hour string format: e.g. 630 -> "10:30".
 */
export function minutesTo24HTime(totalMinutes: number): string {
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(norm / 60);
  const minutes = norm % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Checks if two time intervals [startA, endA) and [startB, endB) overlap.
 * Returns true if overlap exists.
 */
export function intervalsOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Checks if a salon is open on a given date (YYYY-MM-DD) based on working_days.
 * working_days may be a JSON array string: '["Mon","Tue",...]' or plain comma string.
 */
export function isSalonOpenOnDate(workingDaysField: string | string[] | null | undefined, dateStr: string): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  // Use UTC components to avoid timezone offset discrepancies
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  if (isNaN(dateObj.getTime())) return false;

  const dayIndex = dateObj.getUTCDay();
  const dayAbbr = DAY_NAMES[dayIndex]; // e.g. 'Mon', 'Tue'

  if (!workingDaysField) {
    // Default open all days if not specified
    return true;
  }

  let daysList: string[] = [];
  if (Array.isArray(workingDaysField)) {
    daysList = workingDaysField.map(d => d.trim().toLowerCase());
  } else if (typeof workingDaysField === 'string') {
    const raw = workingDaysField.trim();
    if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          daysList = parsed.map((item: any) => String(item).trim().toLowerCase());
        }
      } catch {
        daysList = raw.toLowerCase().split(/[,\s]+/);
      }
    } else {
      daysList = raw.toLowerCase().split(/[,\s]+/);
    }
  }

  const target = dayAbbr.toLowerCase();
  return daysList.some(day => day.includes(target) || target.includes(day));
}

/**
 * Appointment statuses that actively block slot availability.
 * Inactive/non-blocking statuses: cancelled, rejected, completed, no_show.
 */
export const BLOCKING_STATUSES = new Set(['confirmed', 'pending', 'CONFIRMED', 'PENDING']);

export function isStatusBlocking(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.trim().toUpperCase();
  return s === 'CONFIRMED' || s === 'PENDING';
}

export interface BookedInterval {
  startMinutes: number;
  endMinutes: number;
}

export interface GenerateSlotsOptions {
  openingTime: string;
  closingTime: string;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  workingDays?: string | string[] | null;
  slotStepMinutes?: number;
  serviceDurationMinutes: number;
  dateStr: string;
  bookedIntervals: BookedInterval[];
}

export interface SlotResult {
  slot: string;           // 12-hour format "10:00 AM"
  slot24: string;         // 24-hour format "10:00"
  startMinutes: number;
  endMinutes: number;
  endTimeDisplay: string; // 12-hour format "11:00 AM"
}

/**
 * Generates genuine available slots for a given salon, service duration, and date.
 */
export function generateAvailableSlots(options: GenerateSlotsOptions): SlotResult[] {
  const {
    openingTime,
    closingTime,
    breakStartTime,
    breakEndTime,
    workingDays,
    slotStepMinutes = 30,
    serviceDurationMinutes,
    dateStr,
    bookedIntervals,
  } = options;

  // 1. Verify salon is open on this day of week
  if (!isSalonOpenOnDate(workingDays, dateStr)) {
    return [];
  }

  // 2. Parse working hours
  const openMin = timeStringToMinutes(openingTime);
  const closeMin = timeStringToMinutes(closingTime);
  if (openMin === null || closeMin === null || openMin >= closeMin) {
    return [];
  }

  // 3. Parse break period if defined
  const breakStart = timeStringToMinutes(breakStartTime);
  const breakEnd = timeStringToMinutes(breakEndTime);
  const hasBreak = breakStart !== null && breakEnd !== null && breakStart < breakEnd;

  // Step interval for slots (default 30 mins)
  const step = Math.max(15, slotStepMinutes || 30);
  const availableSlots: SlotResult[] = [];

  for (let start = openMin; start + serviceDurationMinutes <= closeMin; start += step) {
    const end = start + serviceDurationMinutes;

    // Check overlap with salon break
    if (hasBreak && intervalsOverlap(start, end, breakStart!, breakEnd!)) {
      continue;
    }

    // Check overlap with existing blocking booked appointments
    const hasBookingConflict = bookedIntervals.some(b =>
      intervalsOverlap(start, end, b.startMinutes, b.endMinutes)
    );

    if (hasBookingConflict) {
      continue;
    }

    availableSlots.push({
      slot: minutesToDisplayTime(start),
      slot24: minutesTo24HTime(start),
      startMinutes: start,
      endMinutes: end,
      endTimeDisplay: minutesToDisplayTime(end),
    });
  }

  return availableSlots;
}
