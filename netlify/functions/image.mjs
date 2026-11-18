// Netlify Function : photos ajoutées depuis le panneau admin (Netlify Blobs).
// GET  /api/image/<id>  -> public
// POST /api/image       -> admin (corps = image brute, en-tête x-admin-password)
import { getStore } from "@netlify/blobs";
import { timingSafeEqual } from "node:crypto";

export const config = { path: ["/api/image", "/api/image/*"] };

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

function authorized(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(req.headers.get("x-admin-password") || "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

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
    if (!authorized(req)) return new Response(JSON.stringify({ error: "Non autorisé." }), { status: 401 });
    const type = (req.headers.get("content-type") || "").split(";")[0];
    if (!TYPES.includes(type)) return new Response(JSON.stringify({ error: "Format non supporté." }), { status: 400 });
    const buf = await req.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return new Response(JSON.stringify({ error: "Image trop lourde." }), { status: 413 });
    const id = crypto.randomUUID();
    await store.set(id, buf, { metadata: { type } });
    return new Response(JSON.stringify({ url: "/api/image/" + id }), {
      headers: { "content-type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405 });
};
