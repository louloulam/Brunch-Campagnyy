// Vérifie l'email + le mot de passe envoyés par le panneau admin.
// ADMIN_EMAIL peut contenir plusieurs emails séparés par des virgules.
import { timingSafeEqual } from "node:crypto";

function safeEqual(x, y) {
  const a = Buffer.from(x);
  const b = Buffer.from(y);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Renvoie "ok", "bad" ou "missing" (variables non définies dans Netlify)
export function checkAuth(req) {
  const expectedPwd = process.env.ADMIN_PASSWORD;
  const emails = (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!expectedPwd || !emails.length) return "missing";
  const email = (req.headers.get("x-admin-email") || "").trim().toLowerCase();
  const pwdOk = safeEqual(req.headers.get("x-admin-password") || "", expectedPwd);
  return pwdOk && emails.includes(email) ? "ok" : "bad";
}
