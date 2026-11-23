// Netlify Function : lit / enregistre le menu (stocké dans Netlify Blobs = mise à jour instantanée).
// GET  /api/menu  -> public, renvoie le menu
// POST /api/menu  -> vérifie email + mot de passe admin
// PUT  /api/menu  -> admin, enregistre le menu complet
import { getStore } from "@netlify/blobs";
import { checkAuth } from "./lib/auth.mjs";

export const config = { path: "/api/menu" };

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const HEX = /^#[0-9a-f]{6}$/i;

function clean(body) {
  if (!body || !Array.isArray(body.items) || !Array.isArray(body.categories)) return null;
  const str = (v, max = 500) => String(v ?? "").slice(0, max);
  const items = body.items.slice(0, 1000).map((i, n) => ({
    id: str(i.id || "p" + Date.now() + n, 60),
    name: str(i.name, 120),
    price: Math.max(0, Math.round(Number(i.price) || 0)),
    desc: str(i.desc, 600),
    tag: str(i.tag, 40),
    image: str(i.image, 300),
    cat: str(i.cat, 80),
    available: i.available !== false,
  }));
  const categories = body.categories.slice(0, 100).map((c) => str(c, 80));
  const hiddenCats = (Array.isArray(body.hiddenCats) ? body.hiddenCats : [])
    .slice(0, 100)
    .map((c) => str(c, 80))
    .filter((c) => categories.includes(c));
  const info = {};
  for (const k of ["name", "tagline", "address", "phone", "email", "hours", "instagram", "facebook", "note"]) {
    info[k] = str(body.info?.[k], 600);
  }
  const theme = {
    bg: HEX.test(body.theme?.bg || "") ? body.theme.bg : "#226677",
    accent: HEX.test(body.theme?.accent || "") ? body.theme.accent : "#226677",
  };
  return { seedVersion: Math.round(Number(body.seedVersion) || 0), categories, hiddenCats, items, info, theme };
}

export default async (req) => {
  const store = getStore("menu");

  if (req.method === "GET") {
    // Menu d'origine (public/menu.json). Quand son seedVersion change (nouveau menu poussé
    // sur GitHub), on repart de cette nouvelle version.
    const seed = await (await fetch(new URL("/menu.json", req.url))).json();
    let data = await store.get("data", { type: "json" });
    if (!data || (data.seedVersion || 0) !== (seed.seedVersion || 0)) data = seed;
    return json(data);
  }

  const auth = checkAuth(req);
  if (auth === "missing") return json({ error: "ADMIN_EMAIL et ADMIN_PASSWORD ne sont pas définis dans Netlify." }, 503);
  if (auth !== "ok") return json({ error: "Email ou mot de passe incorrect." }, 401);

  if (req.method === "POST") return json({ ok: true });

  if (req.method === "PUT") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "JSON invalide." }, 400); }
    const data = clean(body);
    if (!data) return json({ error: "Données invalides." }, 400);
    await store.setJSON("data", data);
    return json({ ok: true });
  }

  return json({ error: "Méthode non autorisée." }, 405);
};
