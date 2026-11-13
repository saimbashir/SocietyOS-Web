import { randomUUID, createHash, randomBytes } from "node:crypto";
export const id = () => randomUUID();
export const token = () => randomBytes(32).toString("hex");
export const hash = (s) => createHash("sha256").update(s).digest("hex");
export const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
export const money = (n) =>
  (n / 100).toLocaleString("en-PK", { style: "currency", currency: "PKR" });
