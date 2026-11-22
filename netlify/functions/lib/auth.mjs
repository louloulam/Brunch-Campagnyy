// Protection facultative du panneau admin.
// - Si ADMIN_PASSWORD n'est PAS défini dans Netlify  -> l'admin est ouvert (aucune connexion).
// - Si ADMIN_PASSWORD est défini                     -> le mot de passe est exigé.
// - Si ADMIN_EMAIL est aussi défini                  -> l'email est exigé en plus
//   (plusieurs emails possibles, séparés par des virgules).
import { timingSafeEqual } from "node:crypto";

function safeEqual(x, y) {
  const a = Buffer.from(x);
  const b = Buffer.from(y);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Renvoie "ok" ou "bad"
export function checkAuth(req) {
  const expectedPwd = process.env.ADMIN_PASSWORD;
  const emails = (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!expectedPwd && !emails.length) return "ok"; // admin ouvert

  const email = (req.headers.get("x-admin-email") || "").trim().toLowerCase();
  const pwdOk = expectedPwd ? safeEqual(req.headers.get("x-admin-password") || "", expectedPwd) : true;
  const emailOk = emails.length ? emails.includes(email) : true;
  return pwdOk && emailOk ? "ok" : "bad";
}
