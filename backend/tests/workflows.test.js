import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { migrate } from "../src/migrate.js";
import { seed } from "../src/seed.js";
import { query, close } from "../src/config/db.js";
import { id } from "../src/utils/core.js";
let admin,
  resident,
  guard,
  staff,
  platform,
  soc,
  other,
  unit,
  foreignUnit,
  facility,
  task,
  staffId,
  pass,
  invoice,
  pay,
  booking,
  poll,
  initialPaid;
const post = (agent, path, body, tenant = soc) =>
  agent
    .post("/api" + path)
    .set("X-Society-Id", tenant)
    .send(body);
const get = (agent, path, tenant = soc) =>
  agent.get("/api" + path).set("X-Society-Id", tenant);
beforeAll(async () => {
  await migrate();
  await seed();
  for (const role of [
    "admin",
    "resident",
    "guard",
    "maintenance",
    "superadmin",
  ]) {
    const a = request.agent(app);
    expect(
      (
        await a
          .post("/api/auth/login")
          .send({
            email: role + "@demo.societyos.local",
            password: process.env.DEMO_PASSWORD,
          })
      ).status,
    ).toBe(200);
    if (role === "admin") admin = a;
    if (role === "resident") resident = a;
    if (role === "guard") guard = a;
    if (role === "maintenance") staff = a;
    if (role === "superadmin") platform = a;
  }
  const me = await admin.get("/api/auth/me");
  soc = me.body.memberships[0].society_id;
  other = me.body.memberships[1].society_id;
  unit = (await get(resident, "/units")).body[0].id;
  foreignUnit = (await get(resident, "/units", other)).body[0].id;
  facility = (await get(admin, "/facilities")).body[0].id;
  task = (await get(resident, "/complaints")).body[0].id;
  staffId = (await get(admin, "/staff")).body[0].id;
  invoice = (await get(resident, "/invoices")).body.find(
    (i) => i.status !== "paid",
  ).id;
  initialPaid = (await get(admin, "/analytics")).body.paid;
});
afterAll(close);
describe("Authentication and tenant boundaries", () => {
  it("health checks database", async () =>
    expect((await request(app).get("/api/health")).body.ok).toBe(true));
  it("rejects anonymous access", async () =>
    expect((await request(app).get("/api/invoices")).status).toBe(401));
  it("does not offer a passwordless role endpoint", async () => {
    expect(
      (await request(app).post("/api/auth/demo").send({ role: "admin" }))
        .status,
    ).not.toBe(200);
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .send({ email: "admin@demo.societyos.local", password: "incorrect" })
      ).status,
    ).toBe(401);
  });
  it("protects search, summaries and operational APIs when signed out", async () => {
    for (const path of [
      "/analytics",
      "/search?q=test",
      "/summary/invoices",
      "/platform",
      "/visitor_passes",
      "/reports",
      "/settings",
    ])
      expect((await request(app).get("/api" + path)).status).toBe(401);
  });
  it("rejects an unknown tenant", async () =>
    expect((await get(admin, "/units", id())).status).toBe(403));
  it("resident sees own occupied units only", async () => {
    const r = await get(resident, "/units");
    expect(r.body).toHaveLength(1);
    expect(r.body[0].status).toBe("occupied");
  });
  it("resident cannot create invoices", async () =>
    expect(
      (
        await post(resident, "/invoices", {
          unit_id: unit,
          title: "Invalid",
          amount_cents: 500,
          due_at: new Date().toISOString(),
        })
      ).status,
    ).toBe(403));
  it("guard cannot read finance", async () =>
    expect((await get(guard, "/invoices")).status).toBe(403));
  it("resident cannot list member emails", async () =>
    expect((await get(resident, "/members")).status).toBe(403));
  it("rejects cross-society references", async () =>
    expect(
      (
        await post(admin, "/invoices", {
          unit_id: foreignUnit,
          title: "Invalid",
          amount_cents: 500,
          due_at: new Date().toISOString(),
        })
      ).status,
    ).toBe(404));
  it("protects platform administration", async () =>
    expect((await get(admin, "/platform")).status).toBe(403));
  it("platform administrator can read overview", async () =>
    expect((await get(platform, "/platform")).body.societies).toHaveLength(2));
  it("rejects unknown body fields and privilege injection", async () =>
    expect(
      (
        await post(resident, "/complaints", {
          unit_id: unit,
          title: "Test",
          description: "Test",
          category: "Water",
          priority: "normal",
          assigned_to: staffId,
        })
      ).status,
    ).toBe(400));
  it("rejects an untrusted browser origin", async () =>
    expect(
      (
        await post(admin, "/buildings", { name: "x", kind: "Apartment" }).set(
          "Origin",
          "https://evil.example",
        )
      ).status,
    ).toBe(403));
});
describe("Visitor and maintenance workflows", () => {
  it("creates a secure QR pass", async () => {
    const r = await post(resident, "/visitor_passes", {
      unit_id: unit,
      name: "Test guest",
      purpose: "Testing",
      starts_at: new Date(Date.now() - 60000).toISOString(),
      ends_at: new Date(Date.now() + 3600000).toISOString(),
      allowed_entries: 1,
    });
    expect(r.status).toBe(201);
    expect(r.body.pass_token).toHaveLength(64);
    expect(r.body.qr).toMatch(/^data:image\/png/);
    pass = r.body.pass_token;
  });
  it("does not leak token hashes in lists", async () =>
    expect(
      (await get(guard, "/visitor_passes")).body.some((p) => "token_hash" in p),
    ).toBe(false));
  it("cannot use a pass in another society", async () =>
    expect(
      (await post(guard, "/visitors/verify", { token: pass }, other)).status,
    ).toBe(404));
  it("resident cannot act as a guard", async () =>
    expect(
      (await post(resident, "/visitors/verify", { token: pass })).status,
    ).toBe(403));
  it("checks in once and prevents duplicate check-in", async () => {
    expect(
      (await post(guard, "/visitors/verify", { token: pass })).status,
    ).toBe(200);
    expect(
      (await post(guard, "/visitors/verify", { token: pass })).status,
    ).toBe(409);
  });
  it("checks out and refuses reuse beyond entry limit", async () => {
    expect(
      (await post(guard, "/visitors/verify", { token: pass, exit: true }))
        .status,
    ).toBe(200);
    expect(
      (await post(guard, "/visitors/verify", { token: pass })).status,
    ).toBe(409);
  });
  it("unassigned tasks are hidden from maintenance", async () =>
    expect((await get(staff, "/complaints")).body).toHaveLength(0));
  it("assigns a task to maintenance and exposes it only after assignment", async () => {
    expect(
      (
        await post(admin, "/complaints/" + task + "/assign", {
          assigned_to: staffId,
        })
      ).status,
    ).toBe(200);
    expect((await get(staff, "/complaints")).body).toHaveLength(1);
  });
  it("enforces maintenance state order", async () =>
    expect(
      (await post(staff, "/complaints/" + task + "/resolve", {})).status,
    ).toBe(409));
  it("completes start, resolve and resident confirmation", async () => {
    expect(
      (await post(staff, "/complaints/" + task + "/start", {})).status,
    ).toBe(200);
    expect(
      (await post(staff, "/complaints/" + task + "/resolve", {})).status,
    ).toBe(200);
    expect(
      (await post(resident, "/complaints/" + task + "/close", {})).status,
    ).toBe(200);
  });
  it("reopens a closed complaint", async () =>
    expect(
      (await post(resident, "/complaints/" + task + "/reopen", {})).status,
    ).toBe(200));
  it("stores comments", async () => {
    expect(
      (
        await post(resident, "/complaints/" + task + "/comment", {
          body: "Thank you for the update.",
        })
      ).status,
    ).toBe(200);
    expect(
      (await get(resident, "/complaints/" + task + "/comments")).body,
    ).toHaveLength(1);
  });
});
describe("Finance, reservations and community", () => {
  it("records a partial payment without changing verified balance", async () => {
    const r = await post(resident, "/invoices/" + invoice + "/payments", {
      amount_cents: 10000,
      reference: "BANK-123",
    });
    expect(r.status).toBe(201);
    pay = r.body.id;
    expect(
      (await get(resident, "/invoices")).body.find((x) => x.id === invoice)
        .paid_cents,
    ).toBe(0);
  });
  it("resident cannot approve payments", async () =>
    expect(
      (await post(resident, "/payments/" + pay + "/approve", {})).status,
    ).toBe(403));
  it("approval updates invoice once", async () => {
    expect(
      (await post(admin, "/payments/" + pay + "/approve", {})).status,
    ).toBe(200);
    expect(
      (await post(admin, "/payments/" + pay + "/approve", {})).status,
    ).toBe(409);
    expect(
      (await get(resident, "/invoices")).body.find((x) => x.id === invoice)
        .paid_cents,
    ).toBe(10000);
  });
  it("rejects overpayments", async () =>
    expect(
      (
        await post(resident, "/invoices/" + invoice + "/payments", {
          amount_cents: 99999999,
          reference: "bad",
        })
      ).status,
    ).toBe(400));
  it("generates a real invoice PDF", async () => {
    const r = await get(resident, "/invoices/" + invoice + "/pdf");
    expect(r.headers["content-type"]).toContain("application/pdf");
    expect(r.body.subarray(0, 5).toString()).toBe("%PDF-");
  });
  it("prevents overlapping bookings, including concurrent requests", async () => {
    const body = {
      facility_id: facility,
      title: "Test reservation",
      starts_at: new Date(Date.now() + 86400000 * 8).toISOString(),
      ends_at: new Date(Date.now() + 86400000 * 8 + 3600000).toISOString(),
    };
    const responses = await Promise.all([
      post(resident, "/facility_bookings", body),
      post(resident, "/facility_bookings", body),
    ]);
    expect(responses.map((x) => x.status).sort()).toEqual([201, 409]);
    booking = responses.find((x) => x.status === 201).body.id;
  });
  it("administrator approves booking", async () =>
    expect(
      (await post(admin, "/facility_bookings/" + booking + "/approve", {}))
        .status,
    ).toBe(200));
  it("resident can cancel their booking", async () =>
    expect(
      (await post(resident, "/facility_bookings/" + booking + "/cancel", {}))
        .status,
    ).toBe(200));
  it("poll voting accepts one vote only", async () => {
    let r = await post(admin, "/polls", {
      title: "Which trees?",
      ends_at: new Date(Date.now() + 86400000).toISOString(),
      options: ["Maple", "Cedar"],
    });
    expect(r.status).toBe(201);
    poll = r.body.id;
    const opt = (await get(resident, "/polls/" + poll + "/results")).body[0].id;
    expect(
      (await post(resident, "/polls/" + poll + "/vote", { option_id: opt }))
        .status,
    ).toBe(200);
    expect(
      (await post(resident, "/polls/" + poll + "/vote", { option_id: opt }))
        .status,
    ).toBe(409);
  });
  it("notifications are database backed", async () =>
    expect((await get(resident, "/notifications")).body.length).toBeGreaterThan(
      3,
    ));
  it("runs reminders idempotently", async () => {
    expect((await post(admin, "/reminders", {})).status).toBe(200);
    expect((await post(admin, "/reminders", {})).body.count).toBe(0);
  });
  it("rejects executable uploads", async () => {
    const r = await admin
      .post("/api/files")
      .set("X-Society-Id", soc)
      .field("title", "Bad file")
      .attach("file", Buffer.from("<script>alert(1)</script>"), "bad.html");
    expect(r.status).toBe(400);
  });
  it("stores and retrieves a PDF through protected storage", async () => {
    const bytes = Buffer.from("%PDF-1.7\nTest");
    const r = await admin
      .post("/api/files")
      .set("X-Society-Id", soc)
      .field("title", "Community guide")
      .attach("file", bytes, "guide.pdf");
    expect(r.status).toBe(201);
    const f = await get(resident, "/files/" + r.body.id);
    expect(f.status).toBe(200);
    expect(f.body).toEqual(bytes);
    expect((await get(resident, "/files/" + r.body.id, other)).status).toBe(
      404,
    );
  });
  it("analytics come from current records", async () => {
    const r = await get(admin, "/analytics");
    expect(r.status).toBe(200);
    expect(r.body.paid).toBe(initialPaid + 10000);
    expect(r.body.occupied).toBe(1);
  });
  it("exports CSV", async () =>
    expect(
      (await get(admin, "/invoices/export")).headers["content-type"],
    ).toContain("text/csv"));
  it("logs operational actions", async () =>
    expect((await get(admin, "/audit_logs")).body.length).toBeGreaterThan(10));
  it("supports local signup and password login", async () => {
    const a = request.agent(app);
    const email = "new" + Date.now() + "@example.com";
    expect(
      (
        await a.post("/api/auth/signup").send({
          name: "New Admin",
          email,
          password: "A-Strong-Pass-123",
          society: "New Community",
        })
      ).status,
    ).toBe(201);
    const u = await a.get("/api/auth/me");
    expect(u.body.memberships[0].role).toBe("admin");
    await a.post("/api/auth/logout");
    expect(
      (
        await a
          .post("/api/auth/login")
          .send({ email, password: "A-Strong-Pass-123" })
      ).status,
    ).toBe(200);
  });
});
describe("Administration and reporting additions", () => {
  it("reports use database aggregates and reject reversed dates", async () => {
    const r = await get(admin, "/reports?from=2020-01-01&to=2099-01-01");
    expect(r.status).toBe(200);
    expect(r.body.occupancy.find((x) => x.name === "occupied").value).toBe(1);
    expect(r.body.categories.length).toBeGreaterThan(0);
    expect(
      (await get(admin, "/reports?from=2027-01-01&to=2026-01-01")).status,
    ).toBe(400);
  });
  it("residents cannot access society-wide reports", async () =>
    expect((await get(resident, "/reports")).status).toBe(403));
  it("monthly billing includes extra fees and skips duplicates", async () => {
    const body = {
      period: "2027-01",
      title: "January society charges",
      amount_cents: 100000,
      extra_cents: 10000,
      due_at: "2027-01-10T00:00:00Z",
    };
    expect((await post(admin, "/billing/monthly", body)).body).toEqual({
      created: 1,
      skipped: 0,
    });
    expect((await post(admin, "/billing/monthly", body)).body).toEqual({
      created: 0,
      skipped: 1,
    });
    const rows = await get(resident, "/invoices");
    expect(
      rows.body.find((x) => x.billing_period === "2027-01").amount_cents,
    ).toBe(110000);
  });
  it("edits a building and refuses deletion when occupied", async () => {
    const b = (await get(admin, "/buildings")).body[0];
    const r = await admin
      .patch("/api/buildings/" + b.id)
      .set("X-Society-Id", soc)
      .send({ name: "Renamed block", kind: "Apartment" });
    expect(r.status).toBe(200);
    expect(
      (await admin.delete("/api/buildings/" + b.id).set("X-Society-Id", soc))
        .status,
    ).toBe(409);
  });
  it("imports units and reports per-row failures", async () => {
    const b = (await get(admin, "/buildings")).body[0];
    const r = await post(admin, "/units/import", {
      rows: [
        { building_id: b.id, name: "CSV-101" },
        { building_id: id(), name: "Bad reference" },
      ],
    });
    expect(r.status).toBe(200);
    expect(r.body.results.map((x) => x.ok)).toEqual([true, false]);
  });
  it("only assigned security staff see their shift", async () => {
    const members = (await get(admin, "/members")).body;
    const g = members.find((x) => x.role === "guard");
    expect(
      (
        await post(admin, "/shifts", {
          user_id: g.id,
          title: "Morning gate",
          starts_at: "2027-02-01T06:00:00Z",
          ends_at: "2027-02-01T14:00:00Z",
        })
      ).status,
    ).toBe(201);
    expect((await get(guard, "/shifts")).body).toHaveLength(1);
    expect((await get(staff, "/shifts")).body).toHaveLength(0);
  });
  it("saves personal notification preferences", async () => {
    expect(
      (await resident.patch("/api/auth/preferences").send({ updates: false }))
        .status,
    ).toBe(200);
    expect((await resident.get("/api/auth/preferences")).body.updates).toBe(
      false,
    );
  });
  it("an administrator cannot demote themselves", async () => {
    const me = (await admin.get("/api/auth/me")).body;
    expect(
      (
        await admin
          .patch("/api/members/" + me.user.id)
          .set("X-Society-Id", soc)
          .send({ role: "resident" })
      ).status,
    ).toBe(400);
  });
  it("invitation must match signed-in email and can be consumed once", async () => {
    const a = request.agent(app),
      email = "invited" + Date.now() + "@example.com";
    await a.post("/api/auth/signup").send({
      name: "Invited person",
      email,
      password: "Invitation-Test-1234",
      society: "Personal space",
    });
    const inv = await post(admin, "/invitations", { email, role: "resident" });
    expect(inv.status).toBe(200);
    expect(
      (await resident.post("/api/auth/join").send({ token: inv.body.token }))
        .status,
    ).toBe(400);
    expect(
      (await a.post("/api/auth/join").send({ token: inv.body.token })).status,
    ).toBe(200);
    expect(
      (await a.post("/api/auth/join").send({ token: inv.body.token })).status,
    ).toBe(400);
  });
  it("scheduler requires a secret", async () =>
    expect((await request(app).post("/api/jobs/reminders")).status).toBe(401));
  it("a shared notice read by one member stays unread for another", async () => {
    const a = (await get(admin, "/notifications")).body.find(
      (x) => x.user_id === null,
    );
    expect(
      (await post(admin, "/notifications/" + a.id + "/read", {})).status,
    ).toBe(200);
    expect(
      (await get(admin, "/notifications")).body.find((x) => x.id === a.id)
        .read_at,
    ).toBeTruthy();
    expect(
      (await get(resident, "/notifications")).body.find((x) => x.id === a.id)
        .read_at,
    ).toBeNull();
  });
});
