import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { ZodError } from "zod";
import { auth } from "./routes/auth.js";
import { api } from "./routes/api.js";
import { files } from "./routes/files.js";
import path from "node:path";
import { query } from "./config/db.js";
import { reminders } from "./services/analytics.js";
import { timingSafeEqual } from "node:crypto";
export const app = express();
app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(helmet());
// Normalize configured origins (browsers omit trailing slashes in Origin headers).
// In local development, Vite may be opened with either loopback hostname.
const origins = (process.env.APP_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((value) => value.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const isPermittedOrigin = (origin) => {
  if (!origin) return true;
  if (origins.includes(origin)) return true;
  if (process.env.NODE_ENV === "production") return false;
  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      origins.some((configured) => {
        const allowed = new URL(configured);
        return allowed.protocol === "http:" && allowed.port === url.port &&
          ["localhost", "127.0.0.1", "[::1]"].includes(allowed.hostname);
      })
    );
  } catch {
    return false;
  }
};
app.use(cors({
  origin: (origin, callback) => callback(null, isPermittedOrigin(origin)),
  credentials: true,
}));
app.use((req, res, next) => {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    !isPermittedOrigin(req.headers.origin)
  ) return res.status(403).json({ error: "Origin not permitted" });
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 60000,
    limit: 40,
    skip: (req) => ["/me", "/config"].includes(req.path),
  }),
  auth,
);
app.get("/api/health", async (req, res) => {
  await query("SELECT 1");
  res.json({ ok: true, service: "SocietyOS" });
});
app.post("/api/jobs/reminders", async (req, res) => {
  const expected = process.env.CRON_SECRET;
  const supplied = req.headers.authorization?.replace(/^Bearer /, "") || "";
  if (
    !expected ||
    supplied.length !== expected.length ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    return res.status(401).json({ error: "Not authorized" });
  const rows = await query(
    "SELECT DISTINCT ON(m.society_id) m.society_id,m.user_id FROM society_memberships m JOIN societies s ON s.id=m.society_id WHERE m.role='admin' AND s.status='active' ORDER BY m.society_id",
  );
  let count = 0;
  for (const r of rows)
    count += (
      await reminders({
        society: r.society_id,
        user: { id: r.user_id },
        role: "admin",
      })
    ).count;
  res.json({ count });
});
// Read-only visitor pass preview. The QR is a bearer capability; do not expose
// resident records or permit check-in through this endpoint.
app.get("/api/public/visitor-pass/:token", rateLimit({ windowMs: 60000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false }), async (req, res, next) => {
  try {
    const raw = req.params.token;
    if (!/^[a-f0-9]{64}$/i.test(raw)) return res.status(400).json({ error: "Invalid visitor pass" });
    const { createHash } = await import("node:crypto");
    const digest = createHash("sha256").update(raw).digest("hex");
    const rows = await query("SELECT name,purpose,vehicle,starts_at,ends_at,allowed_entries,used_entries,status FROM visitor_passes WHERE token_hash=$1 LIMIT 1", [digest]);
    if (!rows.length) return res.status(404).json({ error: "Visitor pass not found" });
    const pass = rows[0];
    const now = Date.now();
    const state = pass.status !== "active" ? pass.status : now < new Date(pass.starts_at).getTime() ? "upcoming" : now > new Date(pass.ends_at).getTime() ? "expired" : pass.used_entries >= pass.allowed_entries ? "fully used" : "valid";
    res.set("Cache-Control", "no-store");
    res.json({ name: pass.name, purpose: pass.purpose, vehicle: pass.vehicle, starts_at: pass.starts_at, ends_at: pass.ends_at, status: state });
  } catch (error) { next(error); }
});
app.use("/api/files", files);
app.use("/api", api);
app.use("/api", (req, res) =>
  res.status(404).json({ error: "Endpoint not found" }),
);
app.use(express.static(path.resolve("frontend/dist")));
app.get("/{*path}", (req, res) =>
  res.sendFile(path.resolve("frontend/dist/index.html")),
);
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof ZodError)
    return res
      .status(400)
      .json({
        error: err.issues
          .map((i) => i.path.join(".") + ": " + i.message)
          .join("; "),
      });
  const dbCode = err.code || err.meta?.code;
  if (["23505", "23503", "23514", "40001", "P2002", "P2034"].includes(dbCode))
    return res
      .status(409)
      .json({
        error:
          "This operation conflicts with an existing record or a related record. Refresh and try again.",
      });
  const status = err.status || (err.code === "LIMIT_FILE_SIZE" ? 413 : 500);
  if (status >= 500) console.error(err);
  res
    .status(status)
    .json({
      error:
        status >= 500 ? "Something went wrong. Please try again." : err.message,
    });
});
