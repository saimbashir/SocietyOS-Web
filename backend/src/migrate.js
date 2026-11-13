import { query, execute, local } from "./config/db.js";
import { readFile } from "node:fs/promises";
export async function migrate() {
  if (!local)
    throw Error(
      "For hosted PostgreSQL run: npx prisma migrate deploy --schema backend/prisma/schema.prisma",
    );
  await execute(
    "CREATE TABLE IF NOT EXISTS app_migrations(name text PRIMARY KEY)",
  );
  if (
    !(await query("SELECT name FROM app_migrations WHERE name='initial'"))
      .length
  ) {
    const sql = await readFile(
      new URL(
        "../prisma/migrations/202610170001_init/migration.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await execute(
      "BEGIN;" + sql + "INSERT INTO app_migrations VALUES ('initial');COMMIT;",
    );
  }
  // Upgrade existing local installations without resetting their records.
  if (!(await query("SELECT name FROM app_migrations WHERE name='visitor_pass_optional_unit_v1'")).length) {
    await execute("BEGIN;ALTER TABLE visitor_passes ALTER COLUMN unit_id DROP NOT NULL;INSERT INTO app_migrations(name) VALUES ('visitor_pass_optional_unit_v1');COMMIT;");
  }
}
if (process.argv[1]?.endsWith("/migrate.js")) {
  await migrate();
  console.log("Database schema ready");
  process.exit(0);
}
