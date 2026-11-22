// Photos ajoutées depuis le panneau admin.
// GET  /api/image/<id>  -> public (stockage Netlify Blobs, affichage immédiat)
// POST /api/image       -> admin (corps = image brute) ; copie aussi envoyée sur GitHub
import { getStore } from "@netlify/blobs";
import { checkAuth } from "./lib/auth.mjs";
import { commitFile, githubConfigured } from "./lib/github.mjs";

export const config = { path: ["/api/image", "/api/image/*"] };

const MAX_BYTES = 3 * 1024 * 1024;
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const err = (msg, status) =>
  new Response(JSON.stringify({ error: msg }), { status, headers: { "content-type": "application/json" } });

export default async (req) => {
  const store = getStore("images");

  if (req.method === "GET") {
    const id = new URL(req.url).pathname.split("/").pop();
    if (!/^[a-z0-9-]{6,80}$/i.test(id)) return new Response("Not found", { status: 404 });
    const res = await store.getWithMetadata(id, { type: "arrayBuffer" });
    if (!res) return new Response("Not found", { status: 404 });
    return new Response(res.data, {
      headers: {
        "content-type": res.metadata?.type || "image/jpeg",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  }

  if (req.method === "POST") {
    if (checkAuth(req) !== "ok") return err("Non autorisé.", 401);
    const type = (req.headers.get("content-type") || "").split(";")[0];
    if (!EXT[type]) return err("Format non supporté.", 400);
    const buf = await req.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return err("Image trop lourde.", 413);

    const id = crypto.randomUUID();
    await store.set(id, buf, { metadata: { type } });

    // Copie de sauvegarde dans GitHub (si configuré) — sans bloquer l'affichage en cas d'échec
    let github = false;
    if (githubConfigured()) {
      try {
        await commitFile(`public/assets/uploads/${id}.${EXT[type]}`, Buffer.from(buf), "Nouvelle photo ajoutée depuis l'admin");
        github = true;
      } catch (e) { /* ignoré */ }
    }
    return new Response(JSON.stringify({ url: "/api/image/" + id, github }), {
      headers: { "content-type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405 });
};
