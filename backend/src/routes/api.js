import { Router } from "express";
import { z } from "zod";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { query, transaction } from "../config/db.js";
import { authenticate, tenant, allow, ownUnit } from "../middleware/auth.js";
import { insert, get, audit, notify } from "../repositories/index.js";
import {
  list,
  create,
  action,
  visitor,
  payment,
} from "../services/operations.js";
import { analytics, reminders } from "../services/analytics.js";
import { modules, parse, readRoles } from "../validators/modules.js";
import { id, token, hash, fail, money } from "../utils/core.js";
export const api = Router();
api.use(authenticate);
api.get("/platform", async (req, res) => {
  if (req.user.platform_role !== "superadmin")
    fail(403, "Platform access required");
  res.json({
    societies: await query("SELECT * FROM societies ORDER BY created_at DESC"),
    plans: await query("SELECT * FROM subscription_plans"),
    users: await query("SELECT id,name,email,platform_role FROM users"),
    support: await query(
      "SELECT * FROM support_requests ORDER BY created_at DESC",
    ),
    audit: await query(
      "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100",
    ),
  });
});
api.post("/platform/:id", async (req, res) => {
  if (req.user.platform_role !== "superadmin")
    fail(403, "Platform access required");
  const d = z
    .object({ status: z.enum(["active", "suspended", "pending"]) })
    .strict()
    .parse(req.body);
  const rows = await query(
    "UPDATE societies SET status=$2 WHERE id=$1 RETURNING id",
    [req.params.id, d.status],
  );
  if (!rows.length) fail(404, "Society not found");
  await audit(
    { society: req.params.id, user: req.user },
    "society:" + d.status,
    req.params.id,
  );
  res.json({ ok: true });
});
api.use(tenant);
api.get("/search", async (req, res) => {
  const term = String(req.query.q || "")
    .trim()
    .toLowerCase();
  if (term.length < 2 || term.length > 100) return res.json([]);
  const results = [];
  for (const table of [
    "units",
    "complaints",
    "visitor_passes",
    "invoices",
    "facilities",
    "announcements",
    "community_events",
    "documents",
  ]) {
    if (!readRoles[table]?.includes(req.ctx.role)) continue;
    const rows = await list(req.ctx, table);
    for (const r of rows
      .filter((r) =>
        [r.name, r.title, r.description, r.body, r.purpose].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(term),
        ),
      )
      .slice(0, 4))
      results.push({ module: table, id: r.id, title: r.title || r.name });
  }
  res.json(results.slice(0, 20));
});
api.get("/summary/:table", async (req, res) => {
  const t = req.params.table,
    c = req.ctx;
  let r;
  if (t === "members") {
    allow(c, "admin");
    r = await query("SELECT * FROM society_memberships WHERE society_id=$1", [
      c.society,
    ]);
  } else r = await list(c, t, true);
  let items = [];
  const sum = (k, a = r) => a.reduce((s, x) => s + (x[k] || 0), 0),
    count = (status) => r.filter((x) => x.status === status).length;
  if (["members", "units", "unit_occupancies"].includes(t)) {
    const units = await list(c, "units", true);
    items = [
      ["Total units", units.length, "All homes", "mint"],
      [
        "Occupied",
        units.filter((u) => u.status === "occupied").length,
        "Active occupancy",
        "sky",
      ],
      [
        "Vacant units",
        units.filter((u) => u.status === "vacant").length,
        "Available",
        "pink",
      ],
      [
        t === "members" ? "Active members" : "Visible records",
        r.length,
        "Current records",
        "mint",
      ],
    ];
  } else if (t === "visitor_passes") {
    const entries = await list(c, "visitor_entries", true);
    const today = new Date().toISOString().slice(0, 10);
    items = [
      [
        "Expected today",
        r.filter(
          (p) =>
            p.status === "active" &&
            new Date(p.starts_at) <= new Date() &&
            new Date(p.ends_at) >= new Date() &&
            p.used_entries < p.allowed_entries,
        ).length,
        "Scheduled",
        "mint",
      ],
      [
        "Checked in",
        entries.filter((e) => !e.checked_out).length,
        "At the gate",
        "sky",
      ],
      [
        "Checked out",
        entries.filter(
          (e) =>
            e.checked_out &&
            new Date(e.checked_out).toISOString().startsWith(today),
        ).length,
        "Completed today",
        "mint",
      ],
      [
        "Expired passes",
        r.filter((p) => new Date(p.ends_at) < new Date()).length,
        "Not valid",
        "pink",
      ],
    ];
  } else if (t === "complaints")
    items = [
      ["All requests", r.length, "Recorded requests", "mint"],
      ["Open", count("open"), "Needs attention", "pink"],
      [
        "In progress",
        count("in_progress") + count("assigned"),
        "Assigned work",
        "sky",
      ],
      [
        "Resolved",
        count("resolved") + count("closed"),
        "Jobs completed",
        "mint",
      ],
    ];
  else if (t === "invoices") {
    const payments = await list(c, "payments", true);
    items = [
      ["Collected", sum("paid_cents"), "Verified payments", "mint", "money"],
      [
        "Pending",
        sum("amount_cents") - sum("paid_cents"),
        "To collect",
        "sky",
        "money",
      ],
      [
        "Overdue",
        r
          .filter((x) => new Date(x.due_at) < new Date())
          .reduce((s, x) => s + x.amount_cents - x.paid_cents, 0),
        "Follow up",
        "pink",
        "money",
      ],
      ["Invoices", r.length, "All records", "sky"],
    ];
  } else if (["facilities", "facility_bookings"].includes(t)) {
    const fs = await list(c, "facilities", true),
      bs = await list(c, "facility_bookings", true);
    items = [
      ["Available facilities", fs.length, "Managed spaces", "mint"],
      [
        "Bookings today",
        bs.filter(
          (b) =>
            new Date(b.starts_at).toDateString() ===
              new Date().toDateString() && b.status === "approved",
        ).length,
        "Confirmed",
        "sky",
      ],
      [
        "Pending approval",
        bs.filter((b) => b.status === "pending").length,
        "Review required",
        "pink",
      ],
      [
        "This month",
        bs.filter(
          (b) =>
            new Date(b.created_at).toISOString().slice(0, 7) ===
            new Date().toISOString().slice(0, 7),
        ).length,
        "Reservations",
        "mint",
      ],
    ];
  }
  res.json(items);
});

api.post("/billing/monthly", async (req, res) => {
  allow(req.ctx, "admin");
  const d = z
    .object({
      period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
      title: z.string().min(3).max(200),
      amount_cents: z.number().int().positive().max(100000000),
      extra_cents: z.number().int().min(0).max(100000000),
      due_at: z.string().datetime({ offset: true }),
    })
    .strict()
    .parse(req.body);
  res.json(
    await transaction(async (q) => {
      await q("SELECT id FROM societies WHERE id=$1 FOR UPDATE", [
        req.ctx.society,
      ]);
      const units = await q(
        "SELECT * FROM units WHERE society_id=$1 AND status='occupied'",
        [req.ctx.society],
      );
      let created = 0,
        skipped = 0;
      for (const u of units) {
        if (
          (
            await q(
              "SELECT id FROM invoices WHERE society_id=$1 AND unit_id=$2 AND billing_period=$3",
              [req.ctx.society, u.id, d.period],
            )
          ).length
        ) {
          skipped++;
          continue;
        }
        const inv = await insert(
          "invoices",
          {
            id: id(),
            society_id: req.ctx.society,
            unit_id: u.id,
            title: d.title,
            amount_cents: d.amount_cents + d.extra_cents,
            due_at: d.due_at,
            billing_period: d.period,
          },
          q,
        );
        await insert(
          "invoice_items",
          {
            id: id(),
            society_id: req.ctx.society,
            invoice_id: inv.id,
            title: "Monthly charges",
            amount_cents: d.amount_cents,
          },
          q,
        );
        if (d.extra_cents)
          await insert(
            "invoice_items",
            {
              id: id(),
              society_id: req.ctx.society,
              invoice_id: inv.id,
              title: "Additional fees",
              amount_cents: d.extra_cents,
            },
            q,
          );
        const members = await q(
          "SELECT user_id FROM unit_occupancies WHERE society_id=$1 AND unit_id=$2",
          [req.ctx.society, u.id],
        );
        for (const m of members)
          await notify(req.ctx.society, m.user_id, "New invoice", d.title, q);
        created++;
      }
      await audit(req.ctx, "billing:monthly:" + d.period, req.ctx.society, q);
      return { created, skipped };
    }),
  );
});
api.get("/reports", async (req, res) => {
  allow(req.ctx, "admin");
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
  const from = date.parse(
    req.query.from ||
      new Date(Date.now() - 86400000 * 90).toISOString().slice(0, 10),
  );
  const to = date.parse(req.query.to || new Date().toISOString().slice(0, 10));
  if (
    !Number.isFinite(Date.parse(from)) ||
    !Number.isFinite(Date.parse(to)) ||
    from > to
  )
    fail(400, "Choose a valid date range");
  const params = [req.ctx.society, from, to];
  const range =
    "created_at >= $2::date AND created_at < $3::date + interval '1 day'";
  const occupancy = await query(
    "SELECT status AS name,count(*)::int AS value FROM units WHERE society_id=$1 GROUP BY status",
    [req.ctx.society],
  );
  const growth = await query(
    `SELECT to_char(created_at,'YYYY-MM') AS name,count(*)::int AS value FROM society_memberships WHERE society_id=$1 AND role='resident' AND ${range} GROUP BY 1 ORDER BY 1`,
    params,
  );
  const collections = await query(
    `SELECT to_char(created_at,'YYYY-MM') AS name,(sum(amount_cents)/100.0)::float AS value FROM payments WHERE society_id=$1 AND status='approved' AND ${range} GROUP BY 1 ORDER BY 1`,
    params,
  );
  const balances = await query(
    `SELECT status AS name,(sum(amount_cents-paid_cents)/100.0)::float AS value FROM invoices WHERE society_id=$1 AND ${range} GROUP BY status`,
    params,
  );
  const visitors = await query(
    `SELECT to_char(created_at,'YYYY-MM-DD') AS name,count(*)::int AS value FROM visitor_entries WHERE society_id=$1 AND ${range} GROUP BY 1 ORDER BY 1`,
    params,
  );
  const categories = await query(
    `SELECT category AS name,count(*)::int AS value FROM complaints WHERE society_id=$1 AND ${range} GROUP BY category`,
    params,
  );
  const resolution = await query(
    `SELECT status AS name,count(*)::int AS value FROM complaints WHERE society_id=$1 AND ${range} GROUP BY status`,
    params,
  );
  const workload = await query(
    `SELECT u.name,count(c.id)::int AS value FROM complaints c JOIN users u ON u.id=c.assigned_to WHERE c.society_id=$1 AND c.created_at >= $2::date AND c.created_at < $3::date+interval '1 day' AND c.status NOT IN ('resolved','closed') GROUP BY u.id,u.name`,
    params,
  );
  const facilities = await query(
    `SELECT f.name,count(b.id)::int AS value FROM facilities f LEFT JOIN facility_bookings b ON b.facility_id=f.id AND b.status='approved' AND b.starts_at >= $2::date AND b.starts_at < $3::date+interval '1 day' WHERE f.society_id=$1 GROUP BY f.id,f.name`,
    params,
  );
  const buildings = await query(
    `SELECT b.name,count(c.id)::int AS value FROM buildings b JOIN units u ON u.building_id=b.id JOIN complaints c ON c.unit_id=u.id WHERE c.society_id=$1 AND c.created_at >= $2::date AND c.created_at<$3::date+interval '1 day' GROUP BY b.id,b.name ORDER BY value DESC`,
    params,
  );
  res.json({
    from,
    to,
    occupancy,
    growth,
    collections,
    balances,
    visitors,
    categories,
    resolution,
    workload,
    facilities,
    buildings,
  });
});
api.patch("/members/:id", async (req, res) => {
  allow(req.ctx, "admin");
  const d = z
    .object({ role: z.enum(["admin", "resident", "guard", "maintenance"]) })
    .strict()
    .parse(req.body);
  if (req.params.id === req.user.id)
    fail(400, "Ask another administrator to change your role");
  await transaction(async (q) => {
    const rows = await q(
      "UPDATE society_memberships SET role=$3 WHERE society_id=$1 AND user_id=$2 RETURNING id",
      [req.ctx.society, req.params.id, d.role],
    );
    if (!rows.length) fail(404, "Membership not found");
    await audit(req.ctx, "membership:role:" + d.role, req.params.id, q);
  });
  res.json({ ok: true });
});
api.delete("/members/:id", async (req, res) => {
  allow(req.ctx, "admin");
  if (req.params.id === req.user.id)
    fail(400, "You cannot remove your own administrator membership");
  await transaction(async (q) => {
    await q(
      "DELETE FROM society_memberships WHERE society_id=$1 AND user_id=$2 RETURNING id",
      [req.ctx.society, req.params.id],
    );
    const occ = await q(
      "DELETE FROM unit_occupancies WHERE society_id=$1 AND user_id=$2 RETURNING unit_id",
      [req.ctx.society, req.params.id],
    );
    for (const o of occ)
      await q(
        "UPDATE units SET status=CASE WHEN EXISTS(SELECT 1 FROM unit_occupancies WHERE unit_id=$1) THEN 'occupied' ELSE 'vacant' END WHERE id=$1 RETURNING id",
        [o.unit_id],
      );
    await audit(req.ctx, "membership:remove", req.params.id, q);
  });
  res.json({ ok: true });
});
api.get("/analytics", async (req, res) => res.json(await analytics(req.ctx)));
api.get("/members", async (req, res) => {
  allow(req.ctx, "admin");
  res.json(
    await query(
      "SELECT u.id,u.name,u.email,m.role,coalesce((SELECT string_agg(t.name, ', ') FROM unit_occupancies o JOIN units t ON t.id=o.unit_id WHERE o.user_id=u.id AND o.society_id=$1),'—') AS unit_name FROM users u JOIN society_memberships m ON m.user_id=u.id WHERE m.society_id=$1",
      [req.ctx.society],
    ),
  );
});
api.get("/staff", async (req, res) => {
  allow(req.ctx, "admin", "maintenance");
  res.json(
    await query(
      "SELECT u.id,u.name,m.role FROM users u JOIN society_memberships m ON m.user_id=u.id WHERE m.society_id=$1 AND m.role='maintenance'",
      [req.ctx.society],
    ),
  );
});
api.post("/invitations", async (req, res) => {
  allow(req.ctx, "admin");
  const d = z
    .object({
      email: z.email(),
      role: z.enum(["resident", "guard", "maintenance", "admin"]),
    })
    .strict()
    .parse(req.body);
  const t = token();
  await insert("invitations", {
    id: id(),
    society_id: req.ctx.society,
    email: d.email.toLowerCase(),
    role: d.role,
    token_hash: hash(t),
    expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
  });
  res.json({
    token: t,
    message:
      "Share this invitation token with the invited person. It expires in 7 days.",
  });
});
api.post("/reminders", async (req, res) => res.json(await reminders(req.ctx)));
api.patch("/settings", async (req, res) => {
  allow(req.ctx, "admin");
  const d = z
    .object({
      name: z.string().min(3).max(120),
      address: z.string().max(500),
      plan: z.enum(["starter", "community", "estate"]),
    })
    .strict()
    .parse(req.body);
  const n = (
    await query("SELECT count(*)::int AS n FROM units WHERE society_id=$1", [
      req.ctx.society,
    ])
  )[0].n;
  const plan = (
    await query("SELECT * FROM subscription_plans WHERE id=$1", [d.plan])
  )[0];
  if (n > plan.unit_limit)
    fail(409, "This plan cannot hold your existing units");
  await query(
    "UPDATE societies SET name=$2,address=$3,plan=$4 WHERE id=$1 RETURNING id",
    [req.ctx.society, d.name, d.address, d.plan],
  );
  res.json({ ok: true });
});
api.get("/settings", async (req, res) =>
  res.json(
    (await query("SELECT * FROM societies WHERE id=$1", [req.ctx.society]))[0],
  ),
);
api.post("/visitors/verify", async (req, res) =>
  res.json(await visitor(req.ctx, req.body.token, req.body.exit === true)),
);
api.get("/complaints/:id/comments", async (req, res) => {
  const accessible = await list(req.ctx, "complaints");
  if (!accessible.some((x) => x.id === req.params.id))
    fail(404, "Complaint not found");
  res.json(
    await query(
      "SELECT c.*,u.name FROM complaint_comments c JOIN users u ON u.id=c.user_id WHERE c.society_id=$1 AND c.complaint_id=$2 ORDER BY c.created_at",
      [req.ctx.society, req.params.id],
    ),
  );
});
api.post("/invoices/:id/payments", async (req, res) =>
  res.status(201).json(await payment(req.ctx, req.params.id, req.body)),
);
api.get("/invoices/:id/pdf", async (req, res) => {
  allow(req.ctx, "admin", "resident");
  const inv = await get("invoices", req.params.id, req.ctx.society);
  await ownUnit(req.ctx, inv.unit_id);
  const society = (
    await query("SELECT name,address FROM societies WHERE id=$1", [
      req.ctx.society,
    ])
  )[0];
  const unit = await get("units", inv.unit_id, req.ctx.society);
  const items = await query(
    "SELECT title,amount_cents FROM invoice_items WHERE society_id=$1 AND invoice_id=$2",
    [req.ctx.society, inv.id],
  );
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Invoice-${inv.id.slice(0, 8)}.pdf"`,
  );
  doc.pipe(res);
  doc
    .fillColor("#123C32")
    .fontSize(28)
    .text("SocietyOS")
    .fontSize(11)
    .text(society.name + " | " + society.address);
  doc
    .moveDown(2)
    .fontSize(20)
    .text("INVOICE " + inv.id.slice(0, 8).toUpperCase());
  doc
    .fontSize(12)
    .moveDown()
    .text("Unit: " + unit.name)
    .text("Due: " + new Date(inv.due_at).toLocaleDateString())
    .moveDown()
    .text(inv.title)
    .moveDown()
    .text(items.map((i) => i.title + ": " + money(i.amount_cents)).join("\n"))
    .moveDown()
    .text("Total: " + money(inv.amount_cents))
    .text("Verified payments: " + money(inv.paid_cents))
    .text("Outstanding: " + money(inv.amount_cents - inv.paid_cents))
    .moveDown(2)
    .fontSize(10)
    .text(
      "Payments are recorded manually and verified by society administration.",
    );
  doc.end();
});
api.post("/polls", async (req, res) => {
  allow(req.ctx, "admin");
  const d = z
    .object({
      title: z.string().min(3).max(300),
      ends_at: z.string().datetime({ offset: true }),
      options: z.array(z.string().min(1).max(100)).min(2).max(8),
    })
    .strict()
    .parse(req.body);
  if (new Date(d.ends_at) <= new Date())
    fail(400, "Poll must end in the future");
  res.status(201).json(
    await transaction(async (q) => {
      const p = await insert(
        "polls",
        {
          id: id(),
          society_id: req.ctx.society,
          title: d.title,
          ends_at: d.ends_at,
        },
        q,
      );
      for (const t of d.options)
        await insert(
          "poll_options",
          { id: id(), society_id: req.ctx.society, poll_id: p.id, title: t },
          q,
        );
      return p;
    }),
  );
});
api.get("/polls/:id/results", async (req, res) => {
  allow(req.ctx, "admin", "resident");
  await get("polls", req.params.id, req.ctx.society);
  res.json(
    await query(
      "SELECT o.id,o.title,count(v.id)::int AS votes FROM poll_options o LEFT JOIN poll_votes v ON v.option_id=o.id WHERE o.society_id=$1 AND o.poll_id=$2 GROUP BY o.id",
      [req.ctx.society, req.params.id],
    ),
  );
});
api.post("/polls/:id/vote", async (req, res) => {
  allow(req.ctx, "resident", "admin");
  const choice = z.string().uuid().parse(req.body.option_id);
  res.json(
    await transaction(async (q) => {
      const p = await get("polls", req.params.id, req.ctx.society, q);
      if (new Date(p.ends_at) <= new Date()) fail(409, "Poll has closed");
      const o = await get("poll_options", choice, req.ctx.society, q);
      if (o.poll_id !== p.id) fail(400, "Option does not belong to this poll");
      return insert(
        "poll_votes",
        {
          id: id(),
          society_id: req.ctx.society,
          poll_id: p.id,
          option_id: choice,
          user_id: req.user.id,
        },
        q,
      );
    }),
  );
});
api.post("/units/import", async (req, res) => {
  allow(req.ctx, "admin");
  const data = z
    .object({
      rows: z
        .array(
          z.object({
            building_id: z.string().uuid(),
            floor_id: z.string().uuid().optional(),
            name: z.string().min(1).max(100),
          }),
        )
        .min(1)
        .max(200),
    })
    .strict()
    .parse(req.body);
  const results = [];
  for (const [index, row] of data.rows.entries()) {
    try {
      const r = await create(req.ctx, "units", row);
      results.push({ row: index + 1, id: r.id, ok: true });
    } catch (e) {
      results.push({
        row: index + 1,
        ok: false,
        error: e.status ? e.message : "Duplicate or invalid related record",
      });
    }
  }
  res.json({ results });
});
api.patch("/:table/:id", async (req, res) => {
  allow(req.ctx, "admin");
  const tables = [
    "buildings",
    "floors",
    "units",
    "facilities",
    "announcements",
    "community_events",
    "emergency_contacts",
    "shifts",
  ];
  if (!tables.includes(req.params.table))
    fail(400, "This record is managed through workflow actions");
  const data = parse(req.params.table, req.body);
  await transaction(async (q) => {
    await get(req.params.table, req.params.id, req.ctx.society, q);
    if (data.floor_id) {
      const floor = await get("floors", data.floor_id, req.ctx.society, q);
      if (floor.building_id !== data.building_id)
        fail(400, "Floor does not belong to that building");
    }
    const keys = Object.keys(data);
    await q(
      `UPDATE ${req.params.table} SET ${keys.map((k, i) => k + "=$" + (i + 3)).join(",")} WHERE id=$1 AND society_id=$2 RETURNING id`,
      [req.params.id, req.ctx.society, ...Object.values(data)],
    );
    await audit(req.ctx, "edit:" + req.params.table, req.params.id, q);
  });
  res.json({ ok: true });
});
api.delete("/:table/:id", async (req, res) => {
  allow(req.ctx, "admin");
  if (
    ![
      "buildings",
      "floors",
      "units",
      "unit_occupancies",
      "emergency_contacts",
      "shifts",
      "facilities",
      "community_events",
    ].includes(req.params.table)
  )
    fail(400, "Financial and historical records cannot be deleted");
  await transaction(async (q) => {
    const r = await get(req.params.table, req.params.id, req.ctx.society, q);
    await q(
      `DELETE FROM ${req.params.table} WHERE id=$1 AND society_id=$2 RETURNING id`,
      [r.id, req.ctx.society],
    );
    if (req.params.table === "unit_occupancies")
      await q(
        "UPDATE units SET status=CASE WHEN EXISTS(SELECT 1 FROM unit_occupancies WHERE unit_id=$1) THEN 'occupied' ELSE 'vacant' END WHERE id=$1 RETURNING id",
        [r.unit_id],
      );
    await audit(req.ctx, "delete:" + req.params.table, r.id, q);
  });
  res.json({ ok: true });
});
api.get("/:table/export", async (req, res) => {
  const rows = await list(req.ctx, req.params.table);
  const fields = rows.length ? Object.keys(rows[0]) : ["id"];
  const cell = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${req.params.table}.csv"`,
  );
  res.send(
    [fields, ...rows.map((r) => fields.map((k) => r[k]))]
      .map((r) => r.map(cell).join(","))
      .join("\r\n"),
  );
});
api.get("/:table", async (req, res) => {
  let rows = await list(req.ctx, req.params.table);
  if (req.params.table === "notifications") {
    const readKeys = new Set(rows.map((x) => x.dedupe_key).filter(Boolean));
    rows = rows
      .filter((x) => !x.dedupe_key?.startsWith("read:"))
      .map((x) => ({
        ...x,
        read_at:
          x.read_at ||
          (readKeys.has(`read:${x.id}:${req.user.id}`) ? new Date() : null),
      }));
  }
  res.json(rows);
});
api.post("/:table", async (req, res) => {
  const row = await create(req.ctx, req.params.table, req.body);
  if (row.pass_token)
    {
    // QR contains a navigable URL, not a token that the phone searches for.
    const base = (process.env.PUBLIC_APP_URL || process.env.APP_ORIGIN || "http://127.0.0.1:5173").split(",")[0].trim().replace(/\/+$/, "");
    row.verification_url = `${base}/visitor/verify/${encodeURIComponent(row.pass_token)}`;
    row.qr = await QRCode.toDataURL(row.verification_url, { width: 320, margin: 2 });
  }
  res.status(201).json(row);
});
api.post("/:table/:id/:action", async (req, res) => {
  if (
    ![
      "complaints",
      "payments",
      "facility_bookings",
      "notifications",
      "visitor_passes",
      "feedback",
      "lost_found_reports",
      "security_incidents",
      "support_requests",
    ].includes(req.params.table)
  )
    fail(404, "Unknown module");
  res.json(
    await action(
      req.ctx,
      req.params.table,
      req.params.id,
      req.params.action,
      req.body,
    ),
  );
});
