export type UserRole = 'customer' | 'owner' | 'admin';
export type UserStatus = 'pending' | 'active' | 'rejected';

export interface User {
  id: number | string;
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  city?: string;
  status: UserStatus;
  salon_id?: string | null;
  salonId?: string | null;
  salon?: Salon | null;
  created_at?: string;
  createdAt?: string;
}

export interface Salon {
  id: string;
  owner_id?: string;
  ownerId?: string;
  owner_name?: string;
  ownerName?: string;
  name: string;
  tagline?: string;
  description?: string;
  about?: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  opening_time?: string;
  openingTime?: string;
  closing_time?: string;
  closingTime?: string;
  slot_duration_minutes?: number;
  slotDurationMinutes?: number;
  working_days?: string | string[];
  workingDays?: string | string[];
  rating?: number;
  review_count?: number;
  reviewCount?: number;
  starting_price?: number;
  startingPrice?: number;
  featured?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  accent_color?: string;
  accentColor?: string;
  created_at?: string;
  createdAt?: string;
}

export interface Service {
  id: string;
  salon_id?: string;
  salonId?: string;
  category_id?: string;
  categoryId?: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  status?: string;
  category_name?: string;
  categoryName?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon_name?: string;
  iconName?: string;
}

export interface Appointment {
  id: string;
  customer_id?: string;
  customerId?: string;
  customer_name?: string;
  customerName?: string;
  customer_phone?: string;
  customerPhone?: string;
  customer_email?: string;
  customerEmail?: string;
  salon_id?: string;
  salonId?: string;
  salon_name?: string;
  salonName?: string;
  salon_city?: string;
  salonCity?: string;
  salon_address?: string;
  salonAddress?: string;
  service_id?: string;
  serviceId?: string;
  service_name?: string;
  serviceName?: string;
  date: string;
  start_time?: string;
  startTime?: string;
  end_time?: string;
  endTime?: string;
  duration_minutes?: number;
  durationMinutes?: number;
  price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected' | 'no_show' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED' | 'NO_SHOW';
  notes?: string;
  rejection_reason?: string;
  rejectionReason?: string;
  cancellation_reason?: string;
  cancellationReason?: string;
  created_at?: string;
  createdAt?: string;
}

export interface TimeSlot {
  time: string;
  time24: string;
  status: 'available' | 'booked' | 'unavailable';
}

export interface PlatformNotification {
  id: string;
  targetRole?: string;
  target_role?: string;
  targetUserId?: string;
  target_user_id?: string;
  targetSalonId?: string;
  target_salon_id?: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  actionRoute?: string;
  action_route?: string;
  createdAt?: string;
  created_at?: string;
}


