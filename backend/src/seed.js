import { query } from "./config/db.js";
import { migrate } from "./migrate.js";
import { insert } from "./repositories/index.js";
import { create } from "./services/operations.js";
import { id, token, hash } from "./utils/core.js";
import bcrypt from "bcryptjs";
import { mkdir, writeFile, readFile } from "node:fs/promises";
export async function seed() {
  if (
    process.env.AUTH_MODE === "supabase" ||
    process.env.NODE_ENV === "production"
  )
    return;
  if ((await query("SELECT id FROM users LIMIT 1")).length) {
    if (process.env.DATA_DIR !== "memory") {
      try {
        console.log(await readFile("data/LOCAL_DEMO_LOGIN.txt", "utf8"));
      } catch {
        console.log("Use your existing local account password.");
      }
    }
    return;
  }
  const password = process.env.DEMO_PASSWORD || token().slice(0, 18);
  const password_hash = await bcrypt.hash(password, 12);
  const users = {};
  for (const [role, name] of Object.entries({
    superadmin: "Alex Morgan",
    admin: "Saim Bashir",
    resident: "Omar Hassan",
    guard: "Bilal Ahmed",
    maintenance: "Sara Khan",
  })) {
    users[role] = await insert("users", {
      id: id(),
      name,
      email: role + "@demo.societyos.local",
      password_hash,
      platform_role: role === "superadmin" ? "superadmin" : "user",
    });
  }
  for (const [i, name] of [
    "Green Valley Residency",
    "Skyline Residences",
  ].entries()) {
    const s = await insert("societies", {
      id: id(),
      name,
      address: i ? "Gulberg, Lahore" : "Garden Avenue, Lahore",
      plan: "community",
    });
    await insert("society_subscriptions", {
      id: id(),
      society_id: s.id,
      plan: "community",
    });
    for (const role of ["admin", "resident", "guard", "maintenance"])
      await insert("society_memberships", {
        id: id(),
        society_id: s.id,
        user_id: users[role].id,
        role,
      });
    const ctx = { society: s.id, user: users.admin, role: "admin" },
      rc = { ...ctx, user: users.resident, role: "resident" };
    const b = await create(ctx, "buildings", {
      name: "Maple Block",
      kind: "Apartment",
    });
    const floor = await create(ctx, "floors", {
      building_id: b.id,
      name: "Ground floor",
    });
    const unit = await create(ctx, "units", {
      building_id: b.id,
      floor_id: floor.id,
      name: "A-101",
    });
    await create(ctx, "units", {
      building_id: b.id,
      floor_id: floor.id,
      name: "A-102",
    });
    await create(ctx, "unit_occupancies", {
      unit_id: unit.id,
      user_id: users.resident.id,
      kind: "owner",
    });
    await create(rc, "complaints", {
      unit_id: unit.id,
      title: "Kitchen tap needs a repair",
      description: "A slow leak under the kitchen sink. Available after 4 PM.",
      category: "Plumbing",
      priority: "normal",
    });
    await create(rc, "complaints", {
      unit_id: unit.id,
      title: "Hallway light flickering",
      description: "The light near the lift needs checking.",
      category: "Electrical",
      priority: "high",
    });
    await create(ctx, "invoices", {
      unit_id: unit.id,
      title: "Monthly community maintenance",
      amount_cents: 750000,
      due_at: new Date(Date.now() + 86400000 * 7).toISOString(),
    });
    const f = await create(ctx, "facilities", {
      name: "The Community Lounge",
      description: "A calm space for gatherings, celebrations and neighbours.",
      capacity: 40,
      fee_cents: 150000,
    });
    await create(ctx, "facilities", {
      name: "Skyline Sports Court",
      description: "Book a friendly match. Bring your own equipment.",
      capacity: 12,
      fee_cents: 50000,
    });
    await create(rc, "facility_bookings", {
      facility_id: f.id,
      title: "Weekend residents meetup",
      starts_at: new Date(Date.now() + 86400000 * 2).toISOString(),
      ends_at: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString(),
    });
    await create(ctx, "announcements", {
      title: "A little greener, together.",
      body: "Our community planting morning is coming up. Meet your neighbours in the central garden this Sunday at 9 AM.",
      priority: "normal",
    });
    await create(ctx, "announcements", {
      title: "Water tank cleaning",
      body: "Water supply will pause briefly on Monday, 10 AM–12 PM. Please plan ahead.",
      priority: "important",
    });
    await create(ctx, "community_events", {
      title: "Community garden morning",
      description: "Plant something wonderful with your neighbours.",
      starts_at: new Date(Date.now() + 86400000 * 3).toISOString(),
      location: "Central garden",
    });
    await create(rc, "visitor_passes", {
      unit_id: unit.id,
      name: "Hassan Ali",
      purpose: "Family visit",
      starts_at: new Date(Date.now() - 3600000).toISOString(),
      ends_at: new Date(Date.now() + 86400000).toISOString(),
      allowed_entries: 1,
    });
  }
  const societies = await query("SELECT * FROM societies");
  for (const society of societies) {
    const unit = (
      await query(
        "SELECT * FROM units WHERE society_id=$1 AND status='occupied' LIMIT 1",
        [society.id],
      )
    )[0];
    for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
      const date = new Date();
      date.setUTCMonth(date.getUTCMonth() - monthOffset, 5);
      date.setUTCHours(10, 0, 0, 0);
      const created_at = date.toISOString(),
        period = created_at.slice(0, 7),
        amount = 500000 + (5 - monthOffset) * 45000;
      const inv = await insert("invoices", {
        id: id(),
        society_id: society.id,
        unit_id: unit.id,
        title: "Community charges · " + period,
        amount_cents: amount,
        paid_cents: amount,
        due_at: created_at,
        status: "paid",
        created_at,
        billing_period: period,
      });
      await insert("invoice_items", {
        id: id(),
        society_id: society.id,
        invoice_id: inv.id,
        title: "Monthly community services",
        amount_cents: amount,
        created_at,
      });
      await insert("payments", {
        id: id(),
        society_id: society.id,
        invoice_id: inv.id,
        user_id: users.resident.id,
        amount_cents: amount,
        reference: "FICTIONAL-DEMO-" + period,
        status: "approved",
        created_at,
      });
      const pass = await insert("visitor_passes", {
        id: id(),
        society_id: society.id,
        user_id: users.resident.id,
        unit_id: unit.id,
        name: "Historical demo visitor",
        purpose: "Fictional seeded visit history",
        starts_at: created_at,
        ends_at: new Date(date.getTime() + 7200000).toISOString(),
        allowed_entries: 20,
        used_entries: 5 + (5 - monthOffset),
        token_hash: hash(token()),
        created_at,
      });
      for (let j = 0; j < 5 + (5 - monthOffset); j++)
        await insert("visitor_entries", {
          id: id(),
          society_id: society.id,
          pass_id: pass.id,
          guard_id: users.guard.id,
          checked_in: created_at,
          checked_out: new Date(date.getTime() + 3600000).toISOString(),
          created_at,
        });
    }
    const poll = await insert("polls", {
      id: id(),
      society_id: society.id,
      title: "Which facility should we upgrade next?",
      ends_at: new Date(Date.now() + 86400000 * 30).toISOString(),
    });
    for (const title of [
      "Community garden",
      "Children’s play area",
      "Fitness center",
    ])
      await insert("poll_options", {
        id: id(),
        society_id: society.id,
        poll_id: poll.id,
        title,
      });
  }
  if (process.env.DATA_DIR !== "memory") {
    await mkdir("data", { recursive: true });
    await writeFile(
      "data/LOCAL_DEMO_LOGIN.txt",
      "SocietyOS LOCAL accounts\nSelect a role card on the sign-in page.\nPassword: " +
        password +
        "\nKeep this file private. These accounts are disabled in production.\n",
      { mode: 0o600 },
    );
  }
  console.log(
    "Local accounts ready. Select an account card and sign in with this password:",
    password,
  );
}
if (process.argv[1]?.endsWith("/seed.js")) {
  await migrate();
  await seed();
  process.exit(0);
}
