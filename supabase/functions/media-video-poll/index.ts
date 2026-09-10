/** @doc media-video-poll — polls (and finalizes) a video job started by media-video. */
/**
 * POST JSON: { job_id }
 * Response: { status: "processing"|"completed"|"failed", progress?, video_url? }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { deapiVideoPoll, novitaVideoPoll, renderfulVideoPoll } from "../_shared/videoProviders.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const DASHSCOPE_BASE = "https://dashscope-intl.aliyuncs.com/api/v1";

function firstVideoUrl(value: unknown, depth = 0): string | null {
  if (depth > 6 || value == null) return null;
  if (typeof value === "string") {
    if (/^https?:\/\/\S+\.(mp4|webm|mov|m4v)(\?\S*)?$/i.test(value)) return value;
    return null;
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      const hit = firstVideoUrl(v, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      const hit = firstVideoUrl(v, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: true, message: "method not allowed" }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ status: "failed", error: "invalid json" }, 400);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData } = token ? await admin.auth.getUser(token) : { data: { user: null } } as any;
  const user = userData?.user;
  if (!user) return json({ status: "failed", error: "unauthorized" }, 401);

  const jobId = String(body?.job_id ?? "").trim();
  if (!jobId) return json({ status: "failed", error: "job_id is required" }, 400);

  const { data: job, error: jobErr } = await admin
    .from("pending_video_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (jobErr) return json({ status: "failed", error: jobErr.message }, 500);
  if (!job) return json({ status: "failed", error: "job not found" }, 404);

  // Already resolved — just report the stored result.
  if (job.status === "completed" || job.status === "succeeded") {
    return json({ status: "completed", video_url: job.video_url });
  }
  if (job.status === "failed" || job.status === "error" || job.status === "cancelled") {
    return json({ status: "failed", error: job.error ?? "video job failed" });
  }

  // DeAPI / Renderful / Novita jobs poll with the function secret for that provider.
  if (job.provider === "deapi" || job.provider === "renderful" || job.provider === "novita") {
    const secretName = job.provider === "deapi"
      ? "DEAPI_API_KEY"
      : job.provider === "renderful"
      ? "RENDERFUL_API_KEY"
      : "NOVITA_API_KEY";
    const key = Deno.env.get(secretName);
    if (!key) return json({ status: "failed", error: `${job.provider} key is not configured` });
    const result = job.provider === "deapi"
      ? await deapiVideoPoll(key, String(job.generation_id))
      : job.provider === "renderful"
      ? await renderfulVideoPoll(key, String(job.generation_id))
      : await novitaVideoPoll(key, String(job.generation_id));

    if (result.status === "completed") {
      await admin
        .from("pending_video_jobs")
        .update({ status: "completed", video_url: result.video_url, updated_at: new Date().toISOString() })
        .eq("id", jobId);
      await admin.from("media_assets").insert({
        user_id: user.id,
        kind: "video",
        provider: job.provider,
        model: job.model_slug,
        prompt: job.prompt,
        storage_path: `${job.provider}/${job.generation_id}`,
        public_url: result.video_url,
        cost_credits: job.credits_charged ?? 0,
        duration_seconds: job.duration_seconds,
        metadata: { generation_id: job.generation_id, aspect_ratio: job.aspect_ratio },
      });
      void admin.from("media_generation_log").insert({
        provider: job.provider,
        model_id: job.model_slug,
        user_id: user.id,
        kind: "video",
        status: "completed",
      });
    } else if (result.status === "failed") {
      await admin
        .from("pending_video_jobs")
        .update({ status: "failed", error: result.error, updated_at: new Date().toISOString() })
        .eq("id", jobId);
      void admin.from("media_generation_log").insert({
        provider: job.provider,
        model_id: job.model_slug,
        user_id: user.id,
        kind: "video",
        status: "failed",
        error_message: result.error.slice(0, 500),
      });
    }
    return json(result);
  }

  // Look up the provider key used to submit this job so we can poll with it.
  let apiKey: string | null = null;
  if (job.api_key_id) {
    const { data: keyRow } = await admin
      .from("media_provider_keys")
      .select("api_key,workspace_id")
      .eq("id", job.api_key_id)
      .maybeSingle();
    apiKey = (keyRow as any)?.api_key ?? null;
    var workspaceId = (keyRow as any)?.workspace_id ?? null;
  }
  if (!apiKey) {
    return json({ status: "failed", error: "provider key unavailable for this job" });
  }

  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };
    // deno-lint-ignore no-var
    if (typeof workspaceId === "string" && workspaceId) headers["X-DashScope-WorkSpace"] = workspaceId;
    const st = await fetch(`${DASHSCOPE_BASE}/tasks/${job.generation_id}`, { headers });
    if (!st.ok) return json({ status: "processing" });
    const task: any = await st.json().catch(() => null);
    const status = String(task?.output?.task_status ?? "").toUpperCase();

    if (status === "SUCCEEDED") {
      const url = task?.output?.video_url ?? firstVideoUrl(task);
      if (!url) {
        await admin
          .from("pending_video_jobs")
          .update({ status: "failed", error: "provider finished without a video URL", updated_at: new Date().toISOString() })
          .eq("id", jobId);
        return json({ status: "failed", error: "provider finished without a video URL" });
      }

      await admin
        .from("pending_video_jobs")
        .update({ status: "completed", video_url: url, updated_at: new Date().toISOString() })
        .eq("id", jobId);

      await admin.from("media_assets").insert({
        user_id: user.id,
        kind: "video",
        provider: job.provider,
        model: job.model_slug,
        prompt: job.prompt,
        storage_path: `dashscope/${job.generation_id}`,
        public_url: url,
        cost_credits: job.credits_charged ?? 0,
        duration_seconds: job.duration_seconds,
        metadata: { generation_id: job.generation_id, aspect_ratio: job.aspect_ratio },
      });

      await admin.from("media_generation_log").insert({
        key_id: job.api_key_id,
        provider: job.provider,
        model_id: job.model_slug,
        user_id: user.id,
        kind: "video",
        status: "completed",
      });

      return json({ status: "completed", video_url: url });
    }

    if (["FAILED", "CANCELED", "CANCELLED", "UNKNOWN"].includes(status)) {
      const errMsg = task?.output?.message ?? "video task failed";
      await admin
        .from("pending_video_jobs")
        .update({ status: "failed", error: errMsg, updated_at: new Date().toISOString() })
        .eq("id", jobId);
      await admin.from("media_generation_log").insert({
        key_id: job.api_key_id,
        provider: job.provider,
        model_id: job.model_slug,
        user_id: user.id,
        kind: "video",
        status: "failed",
        error_message: String(errMsg).slice(0, 500),
      });
      return json({ status: "failed", error: errMsg });
    }

    // PENDING / RUNNING — keep the client polling.
    return json({ status: "processing" });
  } catch (e) {
    return json({ status: "processing", error: e instanceof Error ? e.message : "poll failed" });
  }
});
