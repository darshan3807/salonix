export interface SafeUser {
  id: number | string;
  uid: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'customer' | 'owner' | 'admin';
  city?: string | null;
  status: string;
  salon_id?: string | null;
  salonId?: string | null;
  salon?: any;
  created_at?: string | null;
}

/**
 * Strips password and internal sensitive data before sending user objects to clients.
 */
export function serializeUser(user: any, salon: any = null): SafeUser {
  return {
    id: user.id,
    uid: user.uid,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    role: user.role,
    city: user.city || null,
    status: user.status,
    salon_id: user.salon_id || null,
    salonId: user.salon_id || null,
    salon: salon || user.salon || null,
    created_at: user.created_at || null,
  };
}
