import { list } from "./operations.js";
import { query, transaction } from "../config/db.js";
import { allow } from "../middleware/auth.js";
import { id } from "../utils/core.js";
export async function reminders(ctx) {
  allow(ctx, "admin");
  return transaction(async (q) => {
    const unpaid = await q(
      "SELECT i.*,o.user_id FROM invoices i JOIN unit_occupancies o ON o.unit_id=i.unit_id AND o.society_id=i.society_id WHERE i.society_id=$1 AND i.status!='paid' AND i.due_at<now()+interval '3 days'",
      [ctx.society],
    );
    let count = 0;
    for (const inv of unpaid) {
      const r = await q(
        "INSERT INTO notifications(id,society_id,user_id,title,body,dedupe_key) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(dedupe_key) DO NOTHING RETURNING id",
        [
          id(),
          ctx.society,
          inv.user_id,
          "Payment reminder",
          inv.title,
          "invoice:" +
            inv.id +
            ":" +
            inv.user_id +
            ":" +
            new Date().toISOString().slice(0, 10),
        ],
      );
      count += r.length;
    }
    const overdue = await q(
      "SELECT * FROM complaints WHERE society_id=$1 AND due_at<now() AND status NOT IN ('closed','resolved') AND assigned_to IS NOT NULL",
      [ctx.society],
    );
    for (const task of overdue) {
      const r = await q(
        "INSERT INTO notifications(id,society_id,user_id,title,body,dedupe_key) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(dedupe_key) DO NOTHING RETURNING id",
        [
          id(),
          ctx.society,
          task.assigned_to,
          "Overdue maintenance",
          task.title,
          "task:" + task.id + ":" + new Date().toISOString().slice(0, 10),
        ],
      );
      count += r.length;
    }
    return { count };
  });
}
export async function analytics(ctx) {
  let tables =
    ctx.role === "guard"
      ? ["visitor_passes", "visitor_entries", "security_incidents"]
      : ctx.role === "maintenance"
        ? ["complaints"]
        : [
            "units",
            "complaints",
            "invoices",
            "facility_bookings",
            "visitor_passes",
          ];
  const d = {};
  for (const t of tables) d[t] = await list(ctx, t, true);
  const complaints = d.complaints || [],
    inv = d.invoices || [],
    units = d.units || [];
  const resolved = complaints.filter((x) =>
    ["resolved", "closed"].includes(x.status),
  ).length;
  const total = inv.reduce((s, x) => s + x.amount_cents, 0),
    paid = inv.reduce((s, x) => s + x.paid_cents, 0);
  const overdue = complaints.filter(
    (x) =>
      !["resolved", "closed"].includes(x.status) &&
      new Date(x.due_at) < new Date(),
  ).length;
  const booking = d.facility_bookings || [];
  const score = Math.round(
    100 *
      ((complaints.length ? resolved / complaints.length : 1) * 0.4 +
        (complaints.length ? 1 - overdue / complaints.length : 1) * 0.2 +
        (total ? paid / total : 1) * 0.3 +
        (booking.length
          ? booking.filter((x) => x.status === "approved").length /
            booking.length
          : 1) *
          0.1),
  );
  const entries = ["admin", "resident", "guard"].includes(ctx.role)
    ? await list(ctx, "visitor_entries", true)
    : [];
  const payments = ["admin", "resident"].includes(ctx.role)
    ? await list(ctx, "payments", true)
    : [];
  const recent = (await list(ctx, "notifications")).slice(0, 5);
  const residents =
    ctx.role === "admin"
      ? (
          await query(
            "SELECT count(*)::int AS n FROM society_memberships WHERE society_id=$1 AND role='resident'",
            [ctx.society],
          )
        )[0].n
      : 0;
  const today = new Date().toISOString().slice(0, 10),
    monthNow = today.slice(0, 7);
  const categories = Object.entries(
    complaints.reduce(
      (a, x) => ((a[x.category] = (a[x.category] || 0) + 1), a),
      {},
    ),
  ).map(([name, value]) => ({ name, value }));
  const trend = Array.from({ length: 6 }, (_, i) => {
    let dt = new Date();
    dt.setMonth(dt.getMonth() - 5 + i, 1);
    const month = dt.toISOString().slice(0, 7);
    const items = inv.filter((x) =>
      new Date(x.created_at).toISOString().startsWith(month),
    );
    return {
      name: dt.toLocaleDateString("en", { month: "short" }),
      billed: items.reduce((s, x) => s + x.amount_cents / 100, 0),
      collected: payments
        .filter(
          (p) =>
            p.status === "approved" &&
            new Date(p.created_at).toISOString().startsWith(month),
        )
        .reduce((s, p) => s + p.amount_cents / 100, 0),
      visitors: entries.filter((e) =>
        new Date(e.checked_in).toISOString().startsWith(month),
      ).length,
    };
  });
  return {
    residents,
    recent,
    todayVisitors: entries.filter((e) =>
      new Date(e.checked_in).toISOString().startsWith(today),
    ).length,
    monthlyCollected: payments
      .filter(
        (p) =>
          p.status === "approved" &&
          new Date(p.created_at).toISOString().startsWith(monthNow),
      )
      .reduce((s, p) => s + p.amount_cents, 0),
    urgent: complaints.filter(
      (c) =>
        ["urgent", "high"].includes(c.priority) &&
        !["closed", "resolved"].includes(c.status),
    ).length,
    passes: (d.visitor_passes || []).length,
    validPasses: (d.visitor_passes || []).filter(
      (p) => p.status === "active" && new Date(p.ends_at) > new Date(),
    ).length,
    units: units.length,
    occupied: units.filter((x) => x.status === "occupied").length,
    complaints: complaints.length,
    open: complaints.length - resolved,
    resolved,
    overdue,
    total,
    paid,
    outstanding: total - paid,
    visitors: (d.visitor_passes || []).length,
    inside: (d.visitor_entries || []).filter((x) => !x.checked_out).length,
    bookings: booking.filter((x) => ["pending", "approved"].includes(x.status))
      .length,
    score,
    categories,
    trend,
    repeated: categories.filter((x) => x.value >= 2),
    formula:
      "40% resolution + 20% on-time maintenance + 30% collection + 10% booking approval. Empty categories score 100%.",
  };
}
