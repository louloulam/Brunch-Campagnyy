// Envoi de fichiers vers le dépôt GitHub (API "Contents").
// Variables Netlify : GITHUB_TOKEN, GITHUB_REPO (ex: louloulam/Brunch-Campagnyy), GITHUB_BRANCH (optionnel, défaut "main")
const API = "https://api.github.com";

export function githubConfigured() {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
}

function gh(path, opts = {}) {
  return fetch(API + path, {
    ...opts,
    headers: {
      authorization: "Bearer " + process.env.GITHUB_TOKEN,
      accept: "application/vnd.github+json",
      "user-agent": "brunch-campagny-admin",
      "x-github-api-version": "2022-11-28",
      ...(opts.headers || {}),
    },
  });
}

// Crée ou met à jour un fichier. Renvoie true si un commit a été fait, false si rien n'a changé.
export async function commitFile(path, content, message) {
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const b64 = Buffer.from(content).toString("base64");
  const url = `/repos/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    let sha;
    const g = await gh(`${url}?ref=${encodeURIComponent(branch)}`);
    if (g.ok) {
      const cur = await g.json();
      if ((cur.content || "").replace(/\n/g, "") === b64) return false; // identique
      sha = cur.sha;
    } else if (g.status !== 404) {
      throw new Error("GitHub (lecture) " + g.status);
    }
    const p = await gh(url, {
      method: "PUT",
      body: JSON.stringify({ message, content: b64, branch, ...(sha ? { sha } : {}) }),
    });
    if (p.ok) return true;
    if (p.status === 409 || p.status === 422) continue; // conflit : on réessaie
    const txt = (await p.text()).slice(0, 160);
    if (p.status === 401 || p.status === 403) throw new Error("GitHub refuse l'accès (token) : " + p.status);
    throw new Error("GitHub (écriture) " + p.status + " " + txt);
  }
  throw new Error("GitHub : conflit, réessayez.");
}
