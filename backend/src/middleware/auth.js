import { query } from "../config/db.js";
import { hash, fail } from "../utils/core.js";
import { createClient } from "@supabase/supabase-js";
export const supabase =
  process.env.AUTH_MODE === "supabase"
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
      })
    : null;
export async function authenticate(req, res, next) {
  try {
    let user;
    if (supabase) {
      const bearer = req.headers.authorization?.replace(/^Bearer /, "");
      if (!bearer) fail(401, "Please sign in");
      const { data, error } = await supabase.auth.getUser(bearer);
      if (error || !data.user) fail(401, "Session expired");
      user = (
        await query("SELECT * FROM users WHERE id=$1", [data.user.id])
      )[0];
      if (!user) {
        await query(
          "INSERT INTO users(id,name,email) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id",
          [
            data.user.id,
            data.user.user_metadata?.name || "Resident",
            data.user.email,
          ],
        );
        user = (
          await query("SELECT * FROM users WHERE id=$1", [data.user.id])
        )[0];
      }
    } else {
      user = (
        await query(
          "SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now()",
          [hash(req.cookies?.session || "")],
        )
      )[0];
    }
    if (!user) fail(401, "Please sign in");
    delete user.password_hash;
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}
export async function tenant(req, res, next) {
  try {
    const selected = req.headers["x-society-id"];
    const rows = await query(
      "SELECT m.*,s.name,s.status FROM society_memberships m JOIN societies s ON s.id=m.society_id WHERE m.user_id=$1",
      [req.user.id],
    );
    let m =
      rows.find((x) => x.society_id === selected) ||
      (!selected ? rows[0] : null);
    if (req.user.platform_role === "superadmin" && selected) {
      const s = (
        await query("SELECT * FROM societies WHERE id=$1", [selected])
      )[0];
      if (s) m = { society_id: s.id, role: "admin", status: s.status };
    }
    if (!m) fail(403, "No membership in this society");
    if (!["admin", "resident", "guard", "maintenance"].includes(m.role))
      fail(403, "Invalid society role");
    if (m.status !== "active" && req.user.platform_role !== "superadmin")
      fail(403, "Society is not active");
    req.ctx = { user: req.user, society: m.society_id, role: m.role };
    next();
  } catch (e) {
    next(e);
  }
}
export const allow = (ctx, ...roles) => {
  if (!roles.includes(ctx.role))
    fail(403, "Your role cannot perform this action");
};
export async function ownUnit(ctx, unit, q = query) {
  const rows = await q("SELECT id FROM units WHERE society_id=$1 AND id=$2", [
    ctx.society,
    unit,
  ]);
  if (!rows.length) fail(404, "Unit not found");
  if (
    ctx.role === "resident" &&
    !(
      await q(
        "SELECT id FROM unit_occupancies WHERE society_id=$1 AND unit_id=$2 AND user_id=$3",
        [ctx.society, unit, ctx.user.id],
      )
    ).length
  )
    fail(403, "This unit is not assigned to you");
}
