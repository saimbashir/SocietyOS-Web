import "dotenv/config";
import { PGlite } from "@electric-sql/pglite";
import { PrismaClient } from "@prisma/client";
import { mkdir } from "node:fs/promises";
export const local = !process.env.DATABASE_URL;
if (
  process.env.NODE_ENV === "production" &&
  (local ||
    process.env.AUTH_MODE !== "supabase" ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY)
)
  throw Error(
    "Production requires DATABASE_URL, AUTH_MODE=supabase, and SUPABASE_SERVICE_ROLE_KEY",
  );
let engine;
if (local) {
  await mkdir(process.env.DATA_DIR || "data", { recursive: true });
  engine = new PGlite(
    process.env.DATA_DIR === "memory"
      ? undefined
      : (process.env.DATA_DIR || "data") + "/postgres",
  );
} else engine = new PrismaClient();
export const query = async (sql, params = []) =>
  local
    ? (await engine.query(sql, params)).rows
    : engine.$queryRawUnsafe(sql, ...params);
export const execute = async (sql) =>
  local ? engine.exec(sql) : engine.$executeRawUnsafe(sql);
let queue = Promise.resolve();
export async function transaction(fn) {
  if (!local)
    return engine.$transaction(
      async (tx) => fn((s, p = []) => tx.$queryRawUnsafe(s, ...p)),
      { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 },
    );
  const task = queue.then(() =>
    engine.transaction((tx) =>
      fn(async (s, p = []) => (await tx.query(s, p)).rows),
    ),
  );
  queue = task.catch(() => {});
  return task;
}
export const close = () => (local ? engine.close() : engine.$disconnect());
