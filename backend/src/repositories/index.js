import { query } from "../config/db.js";
import { id, fail } from "../utils/core.js";
export async function insert(table, data, q = query) {
  const keys = Object.keys(data);
  return (
    await q(
      `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map((_, i) => "$" + (i + 1)).join(",")}) RETURNING *`,
      Object.values(data),
    )
  )[0];
}
export async function get(table, key, society, q = query) {
  const row = (
    await q(`SELECT * FROM ${table} WHERE id=$1 AND society_id=$2`, [
      key,
      society,
    ])
  )[0];
  if (!row) fail(404, "Record not found");
  return row;
}
export const audit = (ctx, action, entity_id, q = query) =>
  insert(
    "audit_logs",
    {
      id: id(),
      society_id: ctx.society,
      user_id: ctx.user.id,
      action,
      entity_id,
    },
    q,
  );
export async function notify(society, user, title, body, q = query) {
  if (user) {
    const prefs = (
      await q("SELECT preferences FROM profiles WHERE id=$1", [user])
    )[0]?.preferences;
    if (prefs?.updates === false && !title.toLowerCase().includes("emergency"))
      return;
  }
  return insert(
    "notifications",
    { id: id(), society_id: society, user_id: user, title, body },
    q,
  );
}
