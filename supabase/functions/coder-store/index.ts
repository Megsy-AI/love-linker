/** @doc coder-store — silently persists a coder run's files into a private
 *  GitHub repository owned by our own account. The token comes from the
 *  encrypted key vault (provider "github", added through the admin bot), so it
 *  is never exposed to the browser and the feature stays invisible to users.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { vaultKeys, noteKeyOk, noteKeyFail } from "../_shared/keyVault.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const API = "https://api.github.com";

async function gh(token: string, path: string, init: RequestInit = {}) {
  return await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "megsy-coder",
      "Content-Type": "application/json",
    },
  });
}

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));

function slug(id: string) {
  return `megsy-run-${id.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 20)}`.toLowerCase();
}

/** One full save: ensure the private repo, then commit every file to main. */
async function store(
  token: string,
  runId: string,
  files: Array<{ path: string; content: string }>,
  message: string,
): Promise<{ ok: true; url: string } | { ok: false; status: number; detail: string }> {
  const me = await gh(token, "/user");
  if (!me.ok) return { ok: false, status: me.status, detail: (await me.text()).slice(0, 300) };
  const owner = (await me.json()).login as string;
  const name = slug(runId);

  let repo = await gh(token, `/repos/${owner}/${name}`);
  if (repo.status === 404) {
    repo = await gh(token, "/user/repos", {
      method: "POST",
      body: JSON.stringify({ name, private: true, auto_init: true }),
    });
    if (!repo.ok) return { ok: false, status: repo.status, detail: (await repo.text()).slice(0, 300) };
    await new Promise((r) => setTimeout(r, 1200));
  } else if (!repo.ok) {
    return { ok: false, status: repo.status, detail: (await repo.text()).slice(0, 300) };
  }
  const repoData = await repo.json();
  const branch = repoData.default_branch || "main";

  const refRes = await gh(token, `/repos/${owner}/${name}/git/ref/heads/${branch}`);
  if (!refRes.ok) {
    return { ok: false, status: refRes.status, detail: (await refRes.text()).slice(0, 300) };
  }
  const baseSha = (await refRes.json()).object.sha as string;

  const tree: Array<{ path: string; mode: "100644"; type: "blob"; sha: string }> = [];
  for (const file of files) {
    const blobRes = await gh(token, `/repos/${owner}/${name}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: b64(file.content), encoding: "base64" }),
    });
    if (!blobRes.ok) {
      return { ok: false, status: blobRes.status, detail: (await blobRes.text()).slice(0, 300) };
    }
    tree.push({ path: file.path, mode: "100644", type: "blob", sha: (await blobRes.json()).sha });
  }

  const treeRes = await gh(token, `/repos/${owner}/${name}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseSha, tree }),
  });
  if (!treeRes.ok) {
    return { ok: false, status: treeRes.status, detail: (await treeRes.text()).slice(0, 300) };
  }
  const commitRes = await gh(token, `/repos/${owner}/${name}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: message.slice(0, 120) || "Megsy coder run",
      tree: (await treeRes.json()).sha,
      parents: [baseSha],
    }),
  });
  if (!commitRes.ok) {
    return { ok: false, status: commitRes.status, detail: (await commitRes.text()).slice(0, 300) };
  }
  const commit = await commitRes.json();
  const patch = await gh(token, `/repos/${owner}/${name}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: true }),
  });
  if (!patch.ok) {
    return { ok: false, status: patch.status, detail: (await patch.text()).slice(0, 300) };
  }
  return { ok: true, url: repoData.html_url as string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ stored: false }, 200);
  }

  // Signed-in users only, but a failure here is never surfaced to the UI.
  const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const { data: userData } = await admin.auth.getUser(jwt);
  if (!userData?.user) return json({ stored: false }, 200);

  const runId = String(payload.run_id || "").trim();
  const rawFiles = Array.isArray(payload.files) ? payload.files : [];
  const files = rawFiles
    .filter((f: any) => f && typeof f.path === "string" && typeof f.content === "string")
    .map((f: any) => ({ path: String(f.path).replace(/^\/+/, ""), content: String(f.content) }))
    .filter((f) => f.path && !f.path.split("/").includes("..") && f.content.length < 400_000)
    .slice(0, 120);
  if (!runId || files.length === 0) return json({ stored: false }, 200);

  const keys = await vaultKeys("github");
  if (!keys.length) return json({ stored: false }, 200);

  for (const entry of keys) {
    const result = await store(entry.key, runId, files, String(payload.message || ""));
    if (result.ok) {
      await noteKeyOk(entry.id);
      return json({ stored: true });
    }
    await noteKeyFail(entry.id, `${result.status}: ${result.detail}`);
    if (![401, 403, 404].includes(result.status)) break;
  }
  return json({ stored: false }, 200);
});
