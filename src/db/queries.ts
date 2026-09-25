import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  users,
  salons,
  services,
  categories,
  appointments,
  notifications,
  favorites,
} from './schema.ts';

// ---------------- USER OPERATIONS ----------------

export async function getOrCreateUser(
  uid: string,
  email: string,
  name: string = '',
  phone: string = '',
  role: string = 'customer',
  city: string = 'Pune'
) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        name: name || email.split('@')[0],
        phone,
        role,
        city,
        status: 'active',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query getOrCreateUser failed:', error);
    throw new Error('Failed to retrieve or create user', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Database query getUserByUid failed:', error);
    throw new Error('Failed to fetch user by UID', { cause: error });
  }
}

export async function getAllUsers() {
  try {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  } catch (error) {
    console.error('Database query getAllUsers failed:', error);
    throw new Error('Failed to fetch users', { cause: error });
  }
}

export async function updateUserProfile(uid: string, updates: Partial<typeof users.$inferInsert>) {
  try {
    const result = await db
      .update(users)
      .set(updates)
      .where(eq(users.uid, uid))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query updateUserProfile failed:', error);
    throw new Error('Failed to update user profile', { cause: error });
  }
}

// ---------------- SALON OPERATIONS ----------------

export async function getAllSalons() {
  try {
    return await db.select().from(salons).orderBy(desc(salons.rating));
  } catch (error) {
    console.error('Database query getAllSalons failed:', error);
    throw new Error('Failed to fetch salons', { cause: error });
  }
}

export async function getSalonById(id: string) {
  try {
    const result = await db.select().from(salons).where(eq(salons.id, id)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Database query getSalonById failed:', error);
    throw new Error('Failed to fetch salon', { cause: error });
  }
}

export async function createSalon(data: typeof salons.$inferInsert) {
  try {
    const result = await db.insert(salons).values(data).returning();
    return result[0];
  } catch (error) {
    console.error('Database query createSalon failed:', error);
    throw new Error('Failed to create salon', { cause: error });
  }
}

export async function updateSalon(id: string, updates: Partial<typeof salons.$inferInsert>) {
  try {
    const result = await db.update(salons).set(updates).where(eq(salons.id, id)).returning();
    return result[0];
  } catch (error) {
    console.error('Database query updateSalon failed:', error);
    throw new Error('Failed to update salon', { cause: error });
  }
}

// ---------------- CATEGORIES & SERVICES ----------------

export async function getAllCategories() {
  try {
    return await db.select().from(categories);
  } catch (error) {
    console.error('Database query getAllCategories failed:', error);
    throw new Error('Failed to fetch categories', { cause: error });
  }
}

export async function getAllServices(salonId?: string) {
  try {
    if (salonId) {
      return await db.select().from(services).where(eq(services.salonId, salonId));
    }
    return await db.select().from(services);
  } catch (error) {
    console.error('Database query getAllServices failed:', error);
    throw new Error('Failed to fetch services', { cause: error });
  }
}

export async function createService(data: typeof services.$inferInsert) {
  try {
    const result = await db.insert(services).values(data).returning();
    return result[0];
  } catch (error) {
    console.error('Database query createService failed:', error);
    throw new Error('Failed to create service', { cause: error });
  }
}

export async function updateService(id: string, updates: Partial<typeof services.$inferInsert>) {
  try {
    const result = await db.update(services).set(updates).where(eq(services.id, id)).returning();
    return result[0];
  } catch (error) {
    console.error('Database query updateService failed:', error);
    throw new Error('Failed to update service', { cause: error });
  }
}

export async function deleteService(id: string) {
  try {
    const result = await db.delete(services).where(eq(services.id, id)).returning();
    return result[0];
  } catch (error) {
    console.error('Database query deleteService failed:', error);
    throw new Error('Failed to delete service', { cause: error });
  }
}

// ---------------- APPOINTMENTS ----------------

export async function getAllAppointments(filters?: { customerId?: string; salonId?: string }) {
  try {
    if (filters?.customerId && filters?.salonId) {
      return await db
        .select()
        .from(appointments)
        .where(and(eq(appointments.customerId, filters.customerId), eq(appointments.salonId, filters.salonId)))
        .orderBy(desc(appointments.createdAt));
    }
    if (filters?.customerId) {
      return await db
        .select()
        .from(appointments)
        .where(eq(appointments.customerId, filters.customerId))
        .orderBy(desc(appointments.createdAt));
    }
    if (filters?.salonId) {
      return await db
        .select()
        .from(appointments)
        .where(eq(appointments.salonId, filters.salonId))
        .orderBy(desc(appointments.createdAt));
    }
    return await db.select().from(appointments).orderBy(desc(appointments.createdAt));
  } catch (error) {
    console.error('Database query getAllAppointments failed:', error);
    throw new Error('Failed to fetch appointments', { cause: error });
  }
}

export async function createAppointment(data: typeof appointments.$inferInsert) {
  try {
    const result = await db.insert(appointments).values(data).returning();
    return result[0];
  } catch (error) {
    console.error('Database query createAppointment failed:', error);
    throw new Error('Failed to create appointment', { cause: error });
  }
}

export async function updateAppointment(id: string, updates: Partial<typeof appointments.$inferInsert>) {
  try {
    const result = await db.update(appointments).set(updates).where(eq(appointments.id, id)).returning();
    return result[0];
  } catch (error) {
    console.error('Database query updateAppointment failed:', error);
    throw new Error('Failed to update appointment', { cause: error });
  }
}

// ---------------- NOTIFICATIONS ----------------

export async function getNotifications(role?: string, userId?: string) {
  try {
    return await db.select().from(notifications).orderBy(desc(notifications.createdAt));
  } catch (error) {
    console.error('Database query getNotifications failed:', error);
    throw new Error('Failed to fetch notifications', { cause: error });
  }
}

export async function createNotification(data: typeof notifications.$inferInsert) {
  try {
    const result = await db.insert(notifications).values(data).returning();
    return result[0];
  } catch (error) {
    console.error('Database query createNotification failed:', error);
    throw new Error('Failed to create notification', { cause: error });
  }
}

export async function markNotificationRead(id: string) {
  try {
    const result = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query markNotificationRead failed:', error);
    throw new Error('Failed to mark notification as read', { cause: error });
  }
}

// ---------------- FAVORITES ----------------

export async function getFavorites(userId: string) {
  try {
    const result = await db.select().from(favorites).where(eq(favorites.userId, userId));
    return result.map((r) => r.salonId);
  } catch (error) {
    console.error('Database query getFavorites failed:', error);
    throw new Error('Failed to fetch favorites', { cause: error });
  }
}

export async function toggleFavorite(userId: string, salonId: string) {
  try {
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.salonId, salonId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.salonId, salonId)));
      return { favorited: false };
    } else {
      await db.insert(favorites).values({ userId, salonId });
      return { favorited: true };
    }
  } catch (error) {
    console.error('Database query toggleFavorite failed:', error);
    throw new Error('Failed to toggle favorite', { cause: error });
  }
}
