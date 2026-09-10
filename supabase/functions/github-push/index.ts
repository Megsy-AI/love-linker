/** @doc github-push — pushes generated project files to a GitHub repo owned
 *  by the connected user (create the repo if missing, commit files via the
 *  GitHub contents/git APIs). Also reports connection status and handles
 *  disconnect. Uses the GitHub token stored in agent_credentials (site = "github").
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const GITHUB_API = "https://api.github.com";

async function gh(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "megsy-app",
      "Content-Type": "application/json",
    },
  });
  return res;
}

function b64(str: string) {
  return btoa(unescape(encodeURIComponent(str)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const action = String(payload.action || "");

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace("Bearer ", "");
  const { data: userData } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (!user) return json({ error: "unauthorized" }, 401);

  const { data: cred } = await admin
    .from("agent_credentials")
    .select("*")
    .eq("user_id", user.id)
    .eq("site", "github")
    .maybeSingle();

  // ---------------------------------------------------------------- status
  if (action === "status" || !action) {
    if (!cred?.password) return json({ connected: false });
    return json({
      connected: true,
      account_name: cred.username,
      account: { login: cred.username, html_url: cred.site_url },
    });
  }

  // ------------------------------------------------------------ disconnect
  if (action === "disconnect") {
    const { error } = await admin
      .from("agent_credentials")
      .delete()
      .eq("user_id", user.id)
      .eq("site", "github");
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (!cred?.password) {
    return json({ error: "GitHub is not connected — reconnect GitHub in Integrations and try again." }, 401);
  }
  const token = cred.password as string;
  const owner = cred.username as string;

  // -------------------------------------------------- push / create / commit
  if (["push", "create_and_push", "upload_files", "commit", "create_repo"].includes(action)) {
    try {
      const repoName = String(payload.repo || payload.repo_name || payload.name || "").trim();
      if (!repoName) return json({ error: "repo name is required" }, 400);
      const branch = String(payload.branch || "main");
      const message = String(payload.message || "Initial commit from Megsy Coder");
      const isPrivate = payload.private !== false;
      const files = Array.isArray(payload.files) ? payload.files as Array<{ path: string; content: string }> : [];

      // 1. Ensure the repo exists.
      let repoData: any = null;
      const getRepoRes = await gh(token, `/repos/${owner}/${repoName}`);
      if (getRepoRes.ok) {
        repoData = await getRepoRes.json();
      } else if (getRepoRes.status === 404) {
        const createRes = await gh(token, "/user/repos", {
          method: "POST",
          body: JSON.stringify({ name: repoName, private: isPrivate, auto_init: true }),
        });
        if (!createRes.ok) {
          const text = await createRes.text().catch(() => "");
          return json({ error: `Failed to create repo: ${createRes.status} ${text}` }, 502);
        }
        repoData = await createRes.json();
        // Give GitHub a moment to finish initializing the default branch.
        await new Promise((r) => setTimeout(r, 1200));
      } else {
        const text = await getRepoRes.text().catch(() => "");
        return json({ error: `GitHub error: ${getRepoRes.status} ${text}` }, 502);
      }

      if (action === "create_repo" && files.length === 0) {
        return json({ ok: true, repo_url: repoData.html_url, html_url: repoData.html_url });
      }
      if (files.length === 0) {
        return json({ ok: true, repo_url: repoData.html_url, html_url: repoData.html_url, files_written: 0 });
      }

      const defaultBranch = repoData.default_branch || branch;

      // 2. Resolve the branch tip (create the branch off default if missing).
      let baseSha: string | null = null;
      const refRes = await gh(token, `/repos/${owner}/${repoName}/git/ref/heads/${branch}`);
      if (refRes.ok) {
        const refData = await refRes.json();
        baseSha = refData.object.sha;
      } else {
        const defaultRefRes = await gh(token, `/repos/${owner}/${repoName}/git/ref/heads/${defaultBranch}`);
        if (!defaultRefRes.ok) {
          const text = await defaultRefRes.text().catch(() => "");
          return json({ error: `Could not resolve base branch: ${text}` }, 502);
        }
        const defaultRefData = await defaultRefRes.json();
        baseSha = defaultRefData.object.sha;
        if (branch !== defaultBranch) {
          const createBranchRes = await gh(token, `/repos/${owner}/${repoName}/git/refs`, {
            method: "POST",
            body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
          });
          if (!createBranchRes.ok) {
            const text = await createBranchRes.text().catch(() => "");
            return json({ error: `Could not create branch: ${text}` }, 502);
          }
        }
      }

      // 3. Create blobs for every file.
      const blobs: Array<{ path: string; sha: string }> = [];
      for (const f of files) {
        const blobRes = await gh(token, `/repos/${owner}/${repoName}/git/blobs`, {
          method: "POST",
          body: JSON.stringify({ content: b64(f.content), encoding: "base64" }),
        });
        if (!blobRes.ok) {
          const text = await blobRes.text().catch(() => "");
          return json({ error: `Failed to create blob for ${f.path}: ${text}` }, 502);
        }
        const blobData = await blobRes.json();
        blobs.push({ path: f.path, sha: blobData.sha });
      }

      // 4. Create a tree + commit + move the branch ref.
      const treeRes = await gh(token, `/repos/${owner}/${repoName}/git/trees`, {
        method: "POST",
        body: JSON.stringify({
          base_tree: baseSha,
          tree: blobs.map((b) => ({ path: b.path, mode: "100644", type: "blob", sha: b.sha })),
        }),
      });
      if (!treeRes.ok) {
        const text = await treeRes.text().catch(() => "");
        return json({ error: `Failed to create tree: ${text}` }, 502);
      }
      const treeData = await treeRes.json();

      const commitRes = await gh(token, `/repos/${owner}/${repoName}/git/commits`, {
        method: "POST",
        body: JSON.stringify({ message, tree: treeData.sha, parents: [baseSha] }),
      });
      if (!commitRes.ok) {
        const text = await commitRes.text().catch(() => "");
        return json({ error: `Failed to create commit: ${text}` }, 502);
      }
      const commitData = await commitRes.json();

      const updateRefRes = await gh(token, `/repos/${owner}/${repoName}/git/refs/heads/${branch}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: commitData.sha, force: true }),
      });
      if (!updateRefRes.ok) {
        const text = await updateRefRes.text().catch(() => "");
        return json({ error: `Failed to update branch ref: ${text}` }, 502);
      }

      return json({
        ok: true,
        repo_url: repoData.html_url,
        html_url: repoData.html_url,
        commit_sha: commitData.sha,
        commit_url: commitData.html_url,
        files_written: files.length,
      });
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "GitHub push failed" }, 500);
    }
  }

  return json({ error: "unknown action" }, 400);
});
