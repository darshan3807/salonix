import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, real, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or local ID
  email: text('email').notNull(),
  name: text('name').notNull().default(''),
  phone: text('phone').default(''),
  role: text('role').notNull().default('customer'), // 'admin' | 'owner' | 'customer'
  city: text('city').default('Pune'),
  status: text('status').notNull().default('active'),
  salonId: text('salon_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Salons table
export const salons = pgTable('salons', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  ownerName: text('owner_name').notNull().default(''),
  name: text('name').notNull(),
  tagline: text('tagline').default(''),
  description: text('description').default(''),
  about: text('about').default(''),
  address: text('address').notNull().default(''),
  city: text('city').notNull().default('Pune'),
  state: text('state').default('Maharashtra'),
  pincode: text('pincode').default(''),
  phone: text('phone').default(''),
  email: text('email').default(''),
  openingTime: text('opening_time').default('09:00'),
  closingTime: text('closing_time').default('20:00'),
  slotDurationMinutes: integer('slot_duration_minutes').default(30),
  breakStartTime: text('break_start_time').default('13:00'),
  breakEndTime: text('break_end_time').default('14:00'),
  workingDays: text('working_days').default('["Mon","Tue","Wed","Thu","Fri","Sat"]'),
  rating: real('rating').default(4.8),
  reviewCount: integer('review_count').default(0),
  startingPrice: integer('starting_price').default(199),
  featured: boolean('featured').default(false),
  status: text('status').notNull().default('approved'), // 'approved' | 'pending' | 'rejected' | 'suspended'
  accentColor: text('accent_color').default('#0ea5e9'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Categories table
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').default(''),
  iconName: text('icon_name').default('Scissors'),
});

// Services table
export const services = pgTable('services', {
  id: text('id').primaryKey(),
  salonId: text('salon_id').notNull(),
  categoryId: text('category_id').default(''),
  name: text('name').notNull(),
  description: text('description').default(''),
  price: integer('price').notNull(),
  duration: integer('duration').notNull().default(30),
  status: text('status').notNull().default('active'),
});

// Appointments table
export const appointments = pgTable('appointments', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').default(''),
  customerEmail: text('customer_email').default(''),
  salonId: text('salon_id').notNull(),
  salonName: text('salon_name').notNull(),
  salonCity: text('salon_city').default(''),
  salonAddress: text('salon_address').default(''),
  serviceId: text('service_id').notNull(),
  serviceName: text('service_name').notNull(),
  date: text('date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  durationMinutes: integer('duration_minutes').default(30),
  price: integer('price').notNull().default(0),
  status: text('status').notNull().default('PENDING'),
  notes: text('notes'),
  rejectionReason: text('rejection_reason'),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Platform Notifications table
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  targetRole: text('target_role').default('all'),
  targetUserId: text('target_user_id'),
  targetSalonId: text('target_salon_id'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('info'),
  read: boolean('read').default(false),
  actionRoute: text('action_route'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Favorites table
export const favorites = pgTable('favorites', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  salonId: text('salon_id').notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  appointments: many(appointments),
}));

export const salonsRelations = relations(salons, ({ many }) => ({
  services: many(services),
  appointments: many(appointments),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  salon: one(salons, {
    fields: [services.salonId],
    references: [salons.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  salon: one(salons, {
    fields: [appointments.salonId],
    references: [salons.id],
  }),
}));
