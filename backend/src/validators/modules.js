import { z } from "zod";
const text = z.string().trim().min(1).max(300),
  long = z.string().trim().min(1).max(5000),
  date = z.string().datetime({ offset: true }),
  ref = z.string().uuid(),
  cents = z.number().int().min(0).max(100000000);
export const modules = {
  emergency_contacts: {
    label: "Emergency contacts",
    roles: ["admin"],
    fields: { name: text, phone: text, description: long },
  },
  shifts: {
    label: "Duty shifts",
    roles: ["admin"],
    fields: { user_id: ref, title: text, starts_at: date, ends_at: date },
  },
  buildings: {
    label: "Buildings",
    roles: ["admin"],
    fields: { name: text, kind: z.enum(["Apartment", "Houses"]) },
  },
  floors: {
    label: "Floors",
    roles: ["admin"],
    fields: { building_id: ref, name: text },
  },
  units: {
    label: "Units",
    roles: ["admin"],
    fields: { building_id: ref, floor_id: ref.optional(), name: text },
  },
  unit_occupancies: {
    label: "Occupancy",
    roles: ["admin"],
    fields: { unit_id: ref, user_id: ref, kind: z.enum(["owner", "tenant"]) },
  },
  visitor_passes: {
    label: "Visitors",
    roles: ["admin", "resident", "guard"],
    fields: {
      unit_id: ref.optional(),
      name: text,
      purpose: text,
      vehicle: z.string().max(60).optional(),
      starts_at: date,
      ends_at: date,
      allowed_entries: z.number().int().min(1).max(20),
    },
  },
  complaints: {
    label: "Maintenance",
    roles: ["admin", "resident"],
    fields: {
      unit_id: ref,
      title: text,
      description: long,
      category: z.enum([
        "Plumbing",
        "Electrical",
        "Water",
        "Cleaning",
        "Parking",
        "Elevator",
        "Security",
        "Internet",
        "General maintenance",
        "Other",
      ]),
      priority: z.enum(["low", "normal", "high", "urgent"]),
    },
  },
  invoices: {
    label: "Billing",
    roles: ["admin"],
    fields: {
      unit_id: ref,
      title: text,
      amount_cents: cents.min(1),
      due_at: date,
    },
  },
  facilities: {
    label: "Facilities",
    roles: ["admin"],
    fields: {
      name: text,
      description: long,
      capacity: z.number().int().min(1).max(10000),
      fee_cents: cents,
    },
  },
  facility_bookings: {
    label: "Bookings",
    roles: ["admin", "resident"],
    fields: { facility_id: ref, title: text, starts_at: date, ends_at: date },
  },
  announcements: {
    label: "Noticeboard",
    roles: ["admin"],
    fields: {
      title: text,
      body: long,
      priority: z.enum(["normal", "important", "emergency"]),
    },
  },
  community_events: {
    label: "Events",
    roles: ["admin"],
    fields: { title: text, description: long, starts_at: date, location: text },
  },
  feedback: {
    label: "Feedback",
    roles: ["admin", "resident"],
    fields: { title: text, body: long },
  },
  lost_found_reports: {
    label: "Lost & found",
    roles: ["admin", "resident"],
    fields: { title: text, description: long, kind: z.enum(["lost", "found"]) },
  },
  security_incidents: {
    label: "Incidents",
    roles: ["admin", "guard"],
    fields: {
      title: text,
      description: long,
      priority: z.enum(["normal", "high", "urgent"]),
    },
  },
  support_requests: {
    label: "Support",
    roles: ["admin", "resident", "guard", "maintenance"],
    fields: { title: text, body: long },
  },
};
export const readRoles = {
  emergency_contacts: ["admin", "resident", "guard", "maintenance"],
  shifts: ["admin", "guard", "maintenance"],
  buildings: ["admin", "resident", "guard", "maintenance"],
  floors: ["admin", "resident", "guard", "maintenance"],
  units: ["admin", "resident", "guard", "maintenance"],
  unit_occupancies: ["admin", "resident"],
  visitor_passes: ["admin", "resident", "guard"],
  visitor_entries: ["admin", "resident", "guard"],
  complaints: ["admin", "resident", "maintenance"],
  invoices: ["admin", "resident"],
  payments: ["admin", "resident"],
  facilities: ["admin", "resident"],
  facility_bookings: ["admin", "resident"],
  announcements: ["admin", "resident", "guard", "maintenance"],
  community_events: ["admin", "resident", "guard", "maintenance"],
  feedback: ["admin", "resident"],
  lost_found_reports: ["admin", "resident", "guard", "maintenance"],
  security_incidents: ["admin", "guard"],
  support_requests: ["admin", "resident", "guard", "maintenance"],
  documents: ["admin", "resident", "guard", "maintenance"],
  polls: ["admin", "resident"],
  notifications: ["admin", "resident", "guard", "maintenance"],
  audit_logs: ["admin"],
};
export const parse = (table, data) =>
  z.object(modules[table].fields).strict().parse(data);
