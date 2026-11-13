import { createClient } from "@supabase/supabase-js";
export let sb = null;
export let currentSociety = sessionStorage.getItem("society") || "";
export const selectSociety = (id) => {
  currentSociety = id;
  sessionStorage.setItem("society", id);
};
export const apiBase = import.meta.env.VITE_API_URL || "";
export async function initAuth() {
  const c = await request("/auth/config");
  if (c.mode === "supabase") sb = createClient(c.url, c.anonKey);
  return c;
}
export async function request(path, options = {}) {
  let auth = {};
  if (sb) {
    const { data } = await sb.auth.getSession();
    if (data.session)
      auth.Authorization = "Bearer " + data.session.access_token;
  }
  const r = await fetch(apiBase + "/api" + path, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      "X-Society-Id": currentSociety,
      ...auth,
      ...options.headers,
    },
    body:
      options.body instanceof FormData
        ? options.body
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
  });
  if (!r.ok) {
    if (r.status === 401 && !path.startsWith("/auth"))
      window.dispatchEvent(new Event("societyos:session-expired"));
    const d = await r.json().catch(() => ({ error: "Connection failed" }));
    throw new Error(d.error || "Request failed");
  }
  if (options.blob) return r.blob();
  return r.json();
}
export async function download(path, name) {
  const b = await request(path, { blob: true });
  const u = URL.createObjectURL(b),
    a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
