export type UserRole = 'customer' | 'owner' | 'admin';
export type UserStatus = 'pending' | 'active' | 'rejected';

export interface User {
  id: number;
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  city?: string;
  status: UserStatus;
  salon_id?: string | null;
  salon?: Salon | null;
  created_at?: string;
}

export interface Salon {
  id: string;
  owner_id?: string;
  owner_name?: string;
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
  closing_time?: string;
  slot_duration_minutes?: number;
  working_days?: string;
  rating?: number;
  review_count?: number;
  starting_price?: number;
  featured?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  accent_color?: string;
  created_at?: string;
}

export interface Service {
  id: string;
  salon_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  status?: string;
  category_name?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon_name?: string;
}

export interface Appointment {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  salon_id: string;
  salon_name: string;
  salon_city: string;
  salon_address?: string;
  service_id: string;
  service_name: string;
  date: string;
  start_time: string;
  end_time?: string;
  duration_minutes: number;
  price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  rejection_reason?: string;
  cancellation_reason?: string;
  created_at?: string;
}
