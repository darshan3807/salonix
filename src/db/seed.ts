import { db } from './index.ts';
import {
  users,
  salons,
  services,
  categories,
  appointments,
  notifications,
} from './schema.ts';
import {
  INITIAL_CATEGORIES,
  INITIAL_SALONS,
  INITIAL_SERVICES,
  INITIAL_USERS,
  INITIAL_APPOINTMENTS,
  INITIAL_NOTIFICATIONS,
} from '../data/mockData.ts';

export async function seedDatabaseIfEmpty() {
  try {
    const existingSalons = await db.select().from(salons).limit(1);
    if (existingSalons.length > 0) {
      return;
    }

    console.log('Seeding initial data into Cloud SQL...');

    // 1. Categories
    if (INITIAL_CATEGORIES.length > 0) {
      await db.insert(categories).values(
        INITIAL_CATEGORIES.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description || '',
          iconName: c.iconName || 'Scissors',
        }))
      ).onConflictDoNothing();
    }

    // 2. Salons
    if (INITIAL_SALONS.length > 0) {
      await db.insert(salons).values(
        INITIAL_SALONS.map((s) => ({
          id: s.id,
          ownerId: s.ownerId,
          ownerName: s.ownerName,
          name: s.name,
          tagline: s.tagline || '',
          description: s.description || '',
          about: s.about || '',
          address: s.address,
          city: s.city,
          state: s.state || 'Maharashtra',
          pincode: s.pincode || '',
          phone: s.phone || '',
          email: s.email || '',
          openingTime: s.openingTime || '09:00',
          closingTime: s.closingTime || '20:00',
          slotDurationMinutes: s.slotDurationMinutes || 30,
          breakStartTime: s.breakStartTime || '13:00',
          breakEndTime: s.breakEndTime || '14:00',
          workingDays: JSON.stringify(s.workingDays || []),
          rating: s.rating || 4.8,
          reviewCount: s.reviewCount || 0,
          startingPrice: s.startingPrice || 199,
          featured: Boolean(s.featured),
          status: s.status || 'approved',
          accentColor: s.accentColor || '#0ea5e9',
        }))
      ).onConflictDoNothing();
    }

    // 3. Services
    if (INITIAL_SERVICES.length > 0) {
      await db.insert(services).values(
        INITIAL_SERVICES.map((srv) => ({
          id: srv.id,
          salonId: srv.salonId,
          categoryId: srv.categoryId || '',
          name: srv.name,
          description: srv.description || '',
          price: srv.price,
          duration: srv.duration || 30,
          status: srv.status || 'active',
        }))
      ).onConflictDoNothing();
    }

    // 4. Users
    if (INITIAL_USERS.length > 0) {
      for (const u of INITIAL_USERS) {
        await db.insert(users).values({
          uid: u.id,
          email: u.email,
          name: u.name,
          phone: u.phone || '',
          role: u.role,
          city: u.city || 'Pune',
          status: u.status || 'active',
          salonId: u.salonId,
        }).onConflictDoNothing();
      }
    }

    // 5. Appointments
    if (INITIAL_APPOINTMENTS.length > 0) {
      await db.insert(appointments).values(
        INITIAL_APPOINTMENTS.map((a) => ({
          id: a.id,
          customerId: a.customerId,
          customerName: a.customerName,
          customerPhone: a.customerPhone || '',
          customerEmail: a.customerEmail || '',
          salonId: a.salonId,
          salonName: a.salonName,
          salonCity: a.salonCity || '',
          salonAddress: a.salonAddress || '',
          serviceId: a.serviceId,
          serviceName: a.serviceName,
          date: a.date,
          startTime: a.startTime,
          endTime: a.endTime,
          durationMinutes: a.durationMinutes || 30,
          price: a.price,
          status: a.status,
          notes: a.notes,
        }))
      ).onConflictDoNothing();
    }

    // 6. Notifications
    if (INITIAL_NOTIFICATIONS.length > 0) {
      await db.insert(notifications).values(
        INITIAL_NOTIFICATIONS.map((n) => ({
          id: n.id,
          targetRole: n.targetRole,
          targetUserId: n.targetUserId,
          targetSalonId: n.targetSalonId,
          title: n.title,
          message: n.message,
          type: n.type,
          read: n.read,
          actionRoute: n.actionRoute,
        }))
      ).onConflictDoNothing();
    }

    console.log('Database seeded successfully.');
  } catch (err) {
    console.error('Failed to seed initial data:', err);
  }
}
