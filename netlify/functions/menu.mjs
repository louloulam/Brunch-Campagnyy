// Netlify Function : lit / enregistre le menu (stocké dans Netlify Blobs).
// GET  /api/menu            -> public, renvoie le menu
// POST /api/menu            -> vérifie le mot de passe admin
// PUT  /api/menu            -> admin, enregistre le menu complet
import { getStore } from "@netlify/blobs";
import { timingSafeEqual } from "node:crypto";

export const config = { path: "/api/menu" };

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

function checkPassword(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return "missing";
  const given = req.headers.get("x-admin-password") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return "bad";
  return timingSafeEqual(a, b) ? "ok" : "bad";
}

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
  const info = {};
  for (const k of ["name", "tagline", "address", "phone", "email", "hours", "instagram", "facebook", "note"]) {
    info[k] = str(body.info?.[k], 600);
  }
  return { categories, items, info };
}

export default async (req) => {
  const store = getStore("menu");

  if (req.method === "GET") {
    let data = await store.get("data", { type: "json" });
    if (!data) {
      // Première utilisation : on part du menu d'origine (public/menu.json)
      const seed = await fetch(new URL("/menu.json", req.url));
      data = await seed.json();
    }
    return json(data);
  }

  const auth = checkPassword(req);
  if (auth === "missing") return json({ error: "ADMIN_PASSWORD n'est pas défini dans Netlify." }, 503);
  if (auth !== "ok") return json({ error: "Mot de passe incorrect." }, 401);

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
