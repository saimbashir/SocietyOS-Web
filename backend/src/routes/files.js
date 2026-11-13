import { Router } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { authenticate, tenant, allow, ownUnit } from "../middleware/auth.js";
import { insert, get } from "../repositories/index.js";
import { list } from "../services/operations.js";
import { id, fail } from "../utils/core.js";
export const files = Router();
files.use(authenticate, tenant);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
const storage = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } },
    )
  : null;
async function permitted(ctx, type, key) {
  if (type === "community") {
    allow(ctx, "admin");
    return;
  }
  if (type === "complaint") {
    if (!(await list(ctx, "complaints")).some((x) => x.id === key))
      fail(403, "Complaint access required");
  } else if (type === "payment") {
    const p = await get("payments", key, ctx.society);
    if (ctx.role !== "admin" && p.user_id !== ctx.user.id)
      fail(403, "Payment access required");
  } else fail(400, "Unknown attachment type");
}
files.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) fail(400, "Choose a PDF, PNG, or JPEG file");
  const b = req.file.buffer;
  let mime =
    b.subarray(0, 5).toString() === "%PDF-"
      ? "application/pdf"
      : b[0] === 137 && b.subarray(1, 4).toString() === "PNG"
        ? "image/png"
        : b[0] === 255 && b[1] === 216 && b[2] === 255
          ? "image/jpeg"
          : null;
  if (!mime) fail(400, "Only PDF, PNG, and JPEG content is supported");
  const type = req.body.entity_type || "community",
    entity = req.body.entity_id || null;
  await permitted(req.ctx, type, entity);
  const key = req.ctx.society + "/" + id();
  if (storage) {
    const { error } = await storage.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET || "societyos-private")
      .upload(key, b, { contentType: mime });
    if (error) fail(502, "Storage upload failed");
  } else {
    await mkdir("data/uploads/" + req.ctx.society, { recursive: true });
    await writeFile("data/uploads/" + key, b);
  }
  const row = await insert("documents", {
    id: id(),
    society_id: req.ctx.society,
    user_id: req.user.id,
    title: String(req.body.title || req.file.originalname).slice(0, 200),
    storage_key: key,
    mime,
    bytes: b.length,
    entity_type: type,
    entity_id: entity,
  });
  res.status(201).json(row);
});
files.get("/:id", async (req, res) => {
  const doc = await get("documents", req.params.id, req.ctx.society);
  if (doc.entity_type !== "community")
    await permitted(req.ctx, doc.entity_type, doc.entity_id);
  res.setHeader("Content-Type", doc.mime);
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="document.' +
      (doc.mime === "application/pdf"
        ? "pdf"
        : doc.mime === "image/png"
          ? "png"
          : "jpg") +
      '"',
  );
  if (storage) {
    const { data, error } = await storage.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET || "societyos-private")
      .download(doc.storage_key);
    if (error) fail(404, "File unavailable");
    res.send(Buffer.from(await data.arrayBuffer()));
  } else res.send(await readFile("data/uploads/" + doc.storage_key));
});
