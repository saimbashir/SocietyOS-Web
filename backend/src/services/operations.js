import { query, transaction } from "../config/db.js";
import { insert, get, audit, notify } from "../repositories/index.js";
import { allow, ownUnit } from "../middleware/auth.js";
import { modules, readRoles, parse } from "../validators/modules.js";
import { id, token, hash, fail } from "../utils/core.js";
export async function list(ctx, table, all = false) {
  if (!readRoles[table]) fail(404, "Unknown module");
  allow(ctx, ...readRoles[table]);
  let sql = `SELECT * FROM ${table} WHERE society_id=$1`,
    params = [ctx.society];
  const uid = ctx.user.id;
  if (table === "notifications") {
    sql += " AND (user_id=$2 OR user_id IS NULL)";
    params.push(uid);
  }
  if (ctx.role === "resident") {
    if (
      [
        "visitor_passes",
        "complaints",
        "facility_bookings",
        "feedback",
        "support_requests",
        "payments",
        "unit_occupancies",
      ].includes(table)
    ) {
      sql += " AND user_id=$2";
      params.push(uid);
    }
    if (["units", "invoices"].includes(table)) {
      sql += ` AND ${table === "units" ? "id" : "unit_id"} IN (SELECT unit_id FROM unit_occupancies WHERE user_id=$2 AND society_id=$1)`;
      params.push(uid);
    }
    if (table === "visitor_entries") {
      sql +=
        " AND pass_id IN (SELECT id FROM visitor_passes WHERE user_id=$2 AND society_id=$1)";
      params.push(uid);
    }
  }
  if (ctx.role === "maintenance" && table === "complaints") {
    sql += " AND assigned_to=$2";
    params.push(uid);
  }
  if (
    ctx.role !== "admin" &&
    table === "support_requests" &&
    ctx.role !== "resident"
  ) {
    sql += " AND user_id=$2";
    params.push(uid);
  }
  if (table === "shifts" && ctx.role !== "admin") {
    sql += " AND user_id=$2";
    params.push(uid);
  }
  if (table === "documents" && ctx.role !== "admin") {
    sql +=
      " AND (entity_type='community' OR user_id=$2 OR (entity_type='complaint' AND entity_id IN (SELECT id FROM complaints WHERE society_id=$1 AND (user_id=$2 OR assigned_to=$2))))";
    params.push(uid);
  }
  const rows = await query(
    sql + " ORDER BY created_at DESC" + (all ? "" : " LIMIT 500"),
    params,
  );
  let units = new Map(),
    people = new Map();
  if (rows.some((r) => r.unit_id)) {
    units = new Map(
      (
        await query("SELECT id,name FROM units WHERE society_id=$1", [
          ctx.society,
        ])
      ).map((u) => [u.id, u.name]),
    );
  }
  if (rows.some((r) => r.user_id || r.assigned_to || r.guard_id)) {
    const users = await query(
      "SELECT DISTINCT u.id,u.name FROM users u JOIN society_memberships m ON m.user_id=u.id WHERE m.society_id=$1",
      [ctx.society],
    );
    people = new Map(users.map((u) => [u.id, u.name]));
  }
  const buildings = new Map(
    (table === "units"
      ? await query("SELECT id,name FROM buildings WHERE society_id=$1", [
          ctx.society,
        ])
      : []
    ).map((b) => [b.id, b.name]),
  );
  return rows.map(({ token_hash, ...row }) => ({
    ...row,
    ...(table === "units"
      ? { building_name: buildings.get(row.building_id) || "—" }
      : {}),
    ...(row.unit_id ? { unit_name: units.get(row.unit_id) || "—" } : {}),
    ...(row.user_id || row.guard_id
      ? { person_name: people.get(row.user_id || row.guard_id) || "Former member" }
      : {}),
    ...(row.assigned_to
      ? { assigned_name: people.get(row.assigned_to) || "Former member" }
      : {}),
  }));
}
async function broadcast(ctx, title, body, q) {
  await notify(ctx.society, null, title, body, q);
}
export async function create(ctx, table, input) {
  const conf = modules[table];
  if (!conf) fail(404, "Unknown module");
  allow(ctx, ...conf.roles);
  const data = parse(table, input);
  return transaction(async (q) => {
    if (data.unit_id) await ownUnit(ctx, data.unit_id, q);
    if (
      table === "shifts" &&
      !(
        await q(
          "SELECT id FROM society_memberships WHERE society_id=$1 AND user_id=$2 AND role IN ('guard','maintenance')",
          [ctx.society, data.user_id],
        )
      ).length
    )
      fail(400, "Choose security or maintenance staff");
    if (table === "units") {
      await q("SELECT id FROM societies WHERE id=$1 FOR UPDATE", [ctx.society]);
      const [limits] = await q(
        "SELECT p.unit_limit,(SELECT count(*)::int FROM units WHERE society_id=s.id) AS count FROM societies s JOIN subscription_plans p ON p.id=s.plan WHERE s.id=$1",
        [ctx.society],
      );
      if (limits.count >= limits.unit_limit)
        fail(409, "Plan unit limit reached");
      if (data.floor_id) {
        const floor = await get("floors", data.floor_id, ctx.society, q);
        if (floor.building_id !== data.building_id)
          fail(400, "Floor belongs to another building");
      }
    }
    if (table === "unit_occupancies") {
      if (
        !(
          await q(
            "SELECT id FROM society_memberships WHERE society_id=$1 AND user_id=$2 AND role='resident'",
            [ctx.society, data.user_id],
          )
        ).length
      )
        fail(400, "Choose a resident in this society");
      await q("UPDATE units SET status='occupied' WHERE id=$1 RETURNING id", [
        data.unit_id,
      ]);
    }
    if (
      data.starts_at &&
      data.ends_at &&
      (new Date(data.ends_at) <= new Date(data.starts_at) ||
        new Date(data.ends_at) <= new Date())
    )
      fail(400, "Choose a future end time after the start");
    if (table === "facility_bookings") {
      await get("facilities", data.facility_id, ctx.society, q);
      await q("SELECT id FROM facilities WHERE id=$1 FOR UPDATE", [
        data.facility_id,
      ]);
      if (
        (
          await q(
            "SELECT id FROM facility_bookings WHERE society_id=$1 AND facility_id=$2 AND status IN ('pending','approved') AND starts_at<$4 AND ends_at>$3",
            [ctx.society, data.facility_id, data.starts_at, data.ends_at],
          )
        ).length
      )
        fail(409, "This time is already reserved. Choose another slot.");
    }
    if (
      [
        "visitor_passes",
        "complaints",
        "facility_bookings",
        "announcements",
        "feedback",
        "lost_found_reports",
        "security_incidents",
        "support_requests",
      ].includes(table)
    )
      data.user_id = ctx.user.id;
    let passToken;
    if (table === "visitor_passes") {
      passToken = token();
      data.token_hash = hash(passToken);
    }
    const row = await insert(
      table,
      { id: id(), society_id: ctx.society, ...data },
      q,
    );
    if (table === "invoices") {
      await insert(
        "invoice_items",
        {
          id: id(),
          society_id: ctx.society,
          invoice_id: row.id,
          title: row.title,
          amount_cents: row.amount_cents,
        },
        q,
      );
      const occupants = await q(
        "SELECT user_id FROM unit_occupancies WHERE society_id=$1 AND unit_id=$2",
        [ctx.society, row.unit_id],
      );
      for (const o of occupants)
        await notify(ctx.society, o.user_id, "New invoice", row.title, q);
    }
    if (table === "announcements")
      await broadcast(
        ctx,
        row.priority === "emergency" ? "Emergency notice" : row.title,
        row.body,
        q,
      );
    await audit(ctx, "create:" + table, row.id, q);
    const { token_hash, ...safe } = row;
    return { ...safe, ...(passToken ? { pass_token: passToken } : {}) };
  });
}
export async function action(ctx, table, key, verb, data = {}) {
  return transaction(async (q) => {
    const row = await get(table, key, ctx.society, q);
    await q(`SELECT id FROM ${table} WHERE id=$1 FOR UPDATE`, [key]);
    if (table === "complaints") {
      allow(ctx, "admin", "resident", "maintenance");
      if (ctx.role === "resident" && row.user_id !== ctx.user.id)
        fail(403, "Not your complaint");
      if (ctx.role === "maintenance" && row.assigned_to !== ctx.user.id)
        fail(403, "Task not assigned to you");
      const next = {
        assign: "assigned",
        start: "in_progress",
        resolve: "resolved",
        close: "closed",
        reopen: "open",
      }[verb];
      if (verb === "comment") {
        if (
          typeof data.body !== "string" ||
          !data.body.trim() ||
          data.body.length > 5000
        )
          fail(400, "Enter a comment");
        await insert(
          "complaint_comments",
          {
            id: id(),
            society_id: ctx.society,
            complaint_id: key,
            user_id: ctx.user.id,
            body: data.body,
          },
          q,
        );
      } else {
        if (!next) fail(400, "Unknown action");
        if (verb === "assign") {
          allow(ctx, "admin");
          if (
            !(
              await q(
                "SELECT id FROM society_memberships WHERE society_id=$1 AND user_id=$2 AND role='maintenance'",
                [ctx.society, data.assigned_to || ""],
              )
            ).length
          )
            fail(400, "Choose maintenance staff");
          if (!["open", "assigned"].includes(row.status))
            fail(409, "Only open or assigned tasks can be assigned");
          await q(
            "UPDATE complaints SET assigned_to=$2 WHERE id=$1 RETURNING id",
            [key, data.assigned_to],
          );
          await insert(
            "maintenance_assignments",
            {
              id: id(),
              society_id: ctx.society,
              complaint_id: key,
              user_id: data.assigned_to,
            },
            q,
          );
          await notify(
            ctx.society,
            data.assigned_to,
            "New maintenance assignment",
            row.title,
            q,
          );
        }
        if (verb === "start") {
          allow(ctx, "admin", "maintenance");
          if (row.status !== "assigned")
            fail(409, "Assign this complaint first");
        }
        if (verb === "resolve") {
          allow(ctx, "admin", "maintenance");
          if (row.status !== "in_progress")
            fail(409, "Start work before resolving");
        }
        if (verb === "close") {
          allow(ctx, "admin", "resident");
          if (row.status !== "resolved")
            fail(409, "Only resolved complaints can be closed");
        }
        if (verb === "reopen") {
          allow(ctx, "admin", "resident");
          if (!["resolved", "closed"].includes(row.status))
            fail(409, "This complaint is already open");
        }
        await q("UPDATE complaints SET status=$2 WHERE id=$1 RETURNING id", [
          key,
          next,
        ]);
        if (verb === "reopen")
          await q(
            "UPDATE complaints SET assigned_to=NULL WHERE id=$1 RETURNING id",
            [key],
          );
        await notify(
          ctx.society,
          row.user_id,
          "Maintenance update",
          `${row.title}: ${next.replace("_", " ")}`,
          q,
        );
      }
    } else if (table === "facility_bookings") {
      allow(ctx, "admin", "resident");
      if (
        ctx.role === "resident" &&
        (row.user_id !== ctx.user.id || verb !== "cancel")
      )
        fail(403, "Only your bookings can be cancelled");
      const status = {
        approve: "approved",
        reject: "rejected",
        cancel: "cancelled",
      }[verb];
      if (!status) fail(400, "Unknown action");
      if (!["pending", "approved"].includes(row.status))
        fail(409, "Booking is already final");
      if (verb === "approve" && row.status !== "pending")
        fail(409, "Already approved");
      await q(
        "UPDATE facility_bookings SET status=$2 WHERE id=$1 RETURNING id",
        [key, status],
      );
      await notify(
        ctx.society,
        row.user_id,
        "Booking update",
        `${row.title}: ${status}`,
        q,
      );
    } else if (table === "payments") {
      allow(ctx, "admin");
      if (!["approve", "reject"].includes(verb) || row.status !== "pending")
        fail(409, "Payment already reviewed");
      const invoice = await get("invoices", row.invoice_id, ctx.society, q);
      await q("SELECT id FROM invoices WHERE id=$1 FOR UPDATE", [invoice.id]);
      if (verb === "approve") {
        if (invoice.paid_cents + row.amount_cents > invoice.amount_cents)
          fail(409, "Payment exceeds remaining balance");
        await q(
          "UPDATE invoices SET paid_cents=paid_cents+$2,status=CASE WHEN paid_cents+$2=amount_cents THEN 'paid' ELSE 'partial' END WHERE id=$1 RETURNING id",
          [invoice.id, row.amount_cents],
        );
      }
      await q("UPDATE payments SET status=$2 WHERE id=$1 RETURNING id", [
        key,
        verb === "approve" ? "approved" : "rejected",
      ]);
      await notify(
        ctx.society,
        row.user_id,
        "Payment reviewed",
        `${invoice.title}: ${verb}d`,
        q,
      );
    } else if (table === "notifications") {
      if (row.user_id && row.user_id !== ctx.user.id)
        fail(403, "Not your notification");
      if (row.user_id === null) {
        /* Shared announcements use a per-user copy on read. */ await q(
          "INSERT INTO notifications(id,society_id,user_id,title,body,read_at,dedupe_key) VALUES($1,$2,$3,$4,$5,now(),$6) ON CONFLICT(dedupe_key) DO NOTHING RETURNING id",
          [
            id(),
            ctx.society,
            ctx.user.id,
            row.title,
            row.body,
            `read:${key}:${ctx.user.id}`,
          ],
        );
      } else
        await q(
          "UPDATE notifications SET read_at=now() WHERE id=$1 RETURNING id",
          [key],
        );
    } else if (table === "visitor_passes") {
      allow(ctx, "admin", "resident");
      if (ctx.role === "resident" && row.user_id !== ctx.user.id)
        fail(403, "Not your pass");
      if (verb !== "cancel") fail(400, "Unknown action");
      await q(
        "UPDATE visitor_passes SET status='cancelled' WHERE id=$1 RETURNING id",
        [key],
      );
    } else if (
      [
        "feedback",
        "lost_found_reports",
        "security_incidents",
        "support_requests",
      ].includes(table)
    ) {
      if (ctx.role !== "admin" && row.user_id !== ctx.user.id)
        fail(403, "Not your record");
      if (verb !== "close") fail(400, "Unknown action");
      await q(`UPDATE ${table} SET status='closed' WHERE id=$1 RETURNING id`, [
        key,
      ]);
    } else fail(400, "Unsupported action");
    await audit(ctx, verb + ":" + table, key, q);
    return { ok: true };
  });
}
export async function visitor(ctx, raw, exit = false) {
  allow(ctx, "guard", "admin");
  if (typeof raw !== "string" || raw.length !== 64)
    fail(400, "Enter a valid pass token");
  return transaction(async (q) => {
    const pass = (
      await q(
        "SELECT * FROM visitor_passes WHERE society_id=$1 AND token_hash=$2 FOR UPDATE",
        [ctx.society, hash(raw)],
      )
    )[0];
    if (!pass) fail(404, "Pass not found in this society");
    const active = (
      await q(
        "SELECT * FROM visitor_entries WHERE pass_id=$1 AND checked_out IS NULL",
        [pass.id],
      )
    )[0];
    if (exit) {
      if (!active) fail(409, "Visitor has not checked in");
      await q(
        "UPDATE visitor_entries SET checked_out=now() WHERE id=$1 RETURNING id",
        [active.id],
      );
    } else {
      if (
        pass.status !== "active" ||
        new Date(pass.starts_at) > new Date() ||
        new Date(pass.ends_at) < new Date() ||
        pass.used_entries >= pass.allowed_entries
      )
        fail(409, "Pass is inactive, outside its time window, or fully used");
      if (active) fail(409, "Visitor is already inside");
      await insert(
        "visitor_entries",
        {
          id: id(),
          society_id: ctx.society,
          pass_id: pass.id,
          guard_id: ctx.user.id,
        },
        q,
      );
      await q(
        "UPDATE visitor_passes SET used_entries=used_entries+1 WHERE id=$1 RETURNING id",
        [pass.id],
      );
    }
    await notify(
      ctx.society,
      pass.user_id,
      exit ? "Visitor checked out" : "Visitor arrived",
      pass.name,
      q,
    );
    await audit(ctx, exit ? "visitor:exit" : "visitor:entry", pass.id, q);
    return { name: pass.name, status: exit ? "checked out" : "checked in" };
  });
}
export async function payment(ctx, key, data) {
  allow(ctx, "resident", "admin");
  if (
    !Number.isSafeInteger(data.amount_cents) ||
    data.amount_cents <= 0 ||
    typeof data.reference !== "string" ||
    !data.reference.trim() ||
    data.reference.length > 300
  )
    fail(400, "Enter a positive amount and reference");
  return transaction(async (q) => {
    const inv = await get("invoices", key, ctx.society, q);
    await ownUnit(ctx, inv.unit_id, q);
    if (data.amount_cents > inv.amount_cents - inv.paid_cents)
      fail(400, "Amount exceeds outstanding balance");
    return insert(
      "payments",
      {
        id: id(),
        society_id: ctx.society,
        invoice_id: key,
        user_id: ctx.user.id,
        amount_cents: data.amount_cents,
        reference: data.reference,
      },
      q,
    );
  });
}
