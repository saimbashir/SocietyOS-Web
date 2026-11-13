import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { query, transaction } from "../config/db.js";
import { insert } from "../repositories/index.js";
import { id, token, hash, fail } from "../utils/core.js";
import { authenticate, supabase } from "../middleware/auth.js";
export const auth = Router();
export async function session(res, user) {
  const t = token();
  await insert("sessions", {
    token_hash: hash(t),
    user_id: user.id,
    expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
  });
  res.cookie("session", t, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 86400000 * 7,
  });
}
export async function onboard(user, input) {
  const data = z
    .object({
      name: z.string().trim().min(3).max(120),
      address: z.string().max(500),
      plan: z.enum(["starter", "community", "estate"]).default("starter"),
    })
    .parse(input);
  return transaction(async (q) => {
    const s = await insert("societies", { id: id(), ...data }, q);
    await insert(
      "society_memberships",
      { id: id(), society_id: s.id, user_id: user.id, role: "admin" },
      q,
    );
    await insert(
      "society_subscriptions",
      { id: id(), society_id: s.id, plan: data.plan },
      q,
    );
    return s;
  });
}
auth.get("/config", (req, res) =>
  res.json({
    mode: supabase ? "supabase" : "local",
    url: process.env.SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
    demo: !supabase && process.env.NODE_ENV !== "production",
  }),
);
auth.post("/login", async (req, res) => {
  if (supabase) fail(400, "Use Supabase sign-in");
  const d = z
    .object({ email: z.email(), password: z.string().min(1).max(200) })
    .parse(req.body);
  const u = (
    await query("SELECT * FROM users WHERE email=$1", [d.email.toLowerCase()])
  )[0];
  if (!u?.password_hash || !(await bcrypt.compare(d.password, u.password_hash)))
    fail(401, "Email or password is incorrect");
  await session(res, u);
  res.json({ ok: true });
});
auth.post("/signup", async (req, res) => {
  if (supabase) fail(400, "Use Supabase signup");
  const d = z
    .object({
      name: z.string().min(2).max(100),
      email: z.email(),
      password: z.string().min(10).max(100),
      society: z.string().min(3).max(120),
    })
    .strict()
    .parse(req.body);
  const u = await insert("users", {
    id: id(),
    name: d.name,
    email: d.email.toLowerCase(),
    password_hash: await bcrypt.hash(d.password, 12),
  });
  await onboard(u, { name: d.society, address: "", plan: "starter" });
  await session(res, u);
  res.status(201).json({ ok: true });
});
auth.post("/logout", async (req, res) => {
  await query("DELETE FROM sessions WHERE token_hash=$1 RETURNING token_hash", [
    hash(req.cookies.session || ""),
  ]);
  res.clearCookie("session");
  res.json({ ok: true });
});
auth.get("/me", authenticate, async (req, res) => {
  res.json({
    user: req.user,
    memberships: await query(
      "SELECT m.*,s.name,s.status,s.plan FROM society_memberships m JOIN societies s ON s.id=m.society_id WHERE m.user_id=$1",
      [req.user.id],
    ),
  });
});
auth.post("/onboard", authenticate, async (req, res) =>
  res.status(201).json(await onboard(req.user, req.body)),
);
auth.post("/join", authenticate, async (req, res) => {
  const raw = z.string().length(64).parse(req.body.token);
  const result = await transaction(async (q) => {
    const inv = (
      await q(
        "SELECT * FROM invitations WHERE token_hash=$1 AND expires_at>now() AND status='pending' FOR UPDATE",
        [hash(raw)],
      )
    )[0];
    if (!inv || inv.email !== req.user.email.toLowerCase())
      fail(
        400,
        "Invitation is invalid, expired, or belongs to a different email",
      );
    await insert(
      "society_memberships",
      {
        id: id(),
        society_id: inv.society_id,
        user_id: req.user.id,
        role: inv.role,
      },
      q,
    );
    await q(
      "UPDATE invitations SET status='accepted' WHERE id=$1 RETURNING id",
      [inv.id],
    );
    return { ok: true };
  });
  res.json(result);
});
auth.patch("/profile", authenticate, async (req, res) => {
  const d = z
    .object({ name: z.string().trim().min(2).max(100) })
    .strict()
    .parse(req.body);
  await query("UPDATE users SET name=$2 WHERE id=$1 RETURNING id", [
    req.user.id,
    d.name,
  ]);
  res.json({ ok: true });
});

auth.get("/preferences", authenticate, async (req, res) =>
  res.json(
    (
      await query("SELECT preferences FROM profiles WHERE id=$1", [req.user.id])
    )[0]?.preferences || { updates: true },
  ),
);
auth.patch("/preferences", authenticate, async (req, res) => {
  const d = z.object({ updates: z.boolean() }).strict().parse(req.body);
  await query(
    "INSERT INTO profiles(id,preferences) VALUES($1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET preferences=$2::jsonb RETURNING id",
    [req.user.id, JSON.stringify(d)],
  );
  res.json(d);
});
