// POST /api/sync : enregistre le menu actuel dans GitHub (public/menu.json).
// Netlify redéploie alors le site automatiquement depuis GitHub.
import { getStore } from "@netlify/blobs";
import { checkAuth } from "./lib/auth.mjs";
import { commitFile, githubConfigured } from "./lib/github.mjs";

export const config = { path: "/api/sync" };

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);
  if (checkAuth(req) !== "ok") return json({ error: "Non autorisé." }, 401);
  if (!githubConfigured()) return json({ ok: false, github: false, error: "GitHub n'est pas configuré (GITHUB_TOKEN / GITHUB_REPO)." });

  const data = await getStore("menu").get("data", { type: "json" });
  if (!data) return json({ ok: true, committed: false });

  const who = (req.headers.get("x-admin-email") || "admin").trim();
  try {
    const committed = await commitFile(
      "public/menu.json",
      JSON.stringify(data, null, 2) + "\n",
      "Mise à jour de la carte par " + who
    );
    return json({ ok: true, github: true, committed });
  } catch (e) {
    return json({ ok: false, github: true, error: e.message });
  }
};
