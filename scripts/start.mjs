import { existsSync, copyFileSync } from "node:fs";
import { spawnSync, spawn } from "node:child_process";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
if (!existsSync(".env")) copyFileSync(".env.example", ".env");
if (!existsSync("node_modules")) {
  let r = spawnSync(npm, ["ci"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status) process.exit(r.status);
}
let g = spawnSync(npm, ["run", "prisma:generate"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (g.status) process.exit(g.status);
spawn(npm, ["run", "dev"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
