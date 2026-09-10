/** @doc media-video — starts an async video-generation job (Alibaba DashScope/Wan). */
/**
 * Starts a video generation job.
 *
 * POST JSON:
 *   { prompt, model_slug, duration?, aspect_ratio?, start_frame?, end_frame? }
 *
 * Response (success, async job):
 *   { job_id, provider, model_slug }
 * Response (paywall/quota):
 *   { error: true, paywall: true, message }
 * Response (failure):
 *   { error: true, message }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  DEAPI_VIDEO,
  deapiVideoSubmit,
  normalizeVideoSlug,
  novitaVideoSubmit,
  providerForSlug,
  renderfulVideoSubmit,
} from "../_shared/videoProviders.ts";

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

// Alibaba Model Studio (DashScope International, Singapore) — Wan video models.
const DASHSCOPE_BASE = "https://dashscope-intl.aliyuncs.com/api/v1";

function isUnlimitedModel(slug: string): boolean {
  return /deapi/i.test(slug);
}

async function acquireKey(provider: string, modelId: string) {
  const { data, error } = await admin.rpc("acquire_media_key", { p_provider: provider, p_model_id: modelId });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.o_api_key) return null;
  return {
    keyId: String(row.o_key_id),
    apiKey: String(row.o_api_key),
    workspaceId: row.o_workspace_id ? String(row.o_workspace_id) : null,
  };
}

async function dashscopeSubmit(opts: {
  key: string;
  workspaceId?: string | null;
  model: string;
  prompt: string;
  duration: number;
  aspectRatio?: string;
  image?: string;
}): Promise<string> {
  const size = opts.aspectRatio === "9:16"
    ? "720*1280"
    : opts.aspectRatio === "1:1"
    ? "960*960"
    : "1280*720";
  const input: Record<string, unknown> = { prompt: opts.prompt };
  if (opts.image) input.img_url = opts.image;
  const body = {
    model: opts.model,
    input,
    parameters: {
      duration: opts.duration,
      prompt_extend: true,
      ...(opts.image ? {} : { size }),
    },
  };
  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.key}`,
    "Content-Type": "application/json",
    "X-DashScope-Async": "enable",
  };
  if (opts.workspaceId) headers["X-DashScope-WorkSpace"] = opts.workspaceId;
  const res = await fetch(`${DASHSCOPE_BASE}/services/aigc/video-generation/video-synthesis`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`dashscope ${res.status}: ${text.slice(0, 300)}`);
  const payload = JSON.parse(text);
  const id = payload?.output?.task_id ?? payload?.task_id;
  if (!id) throw new Error(`dashscope: no task id (${text.slice(0, 200)})`);
  return String(id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: true, message: "method not allowed" }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: true, message: "invalid json" }, 400);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData } = token ? await admin.auth.getUser(token) : { data: { user: null } } as any;
  const user = userData?.user;
  if (!user) return json({ error: true, paywall: true, message: "Sign in to generate videos." }, 401);

  const prompt = String(body?.prompt ?? "").trim();
  if (!prompt) return json({ error: true, message: "prompt is required" }, 400);

  const modelSlug = String(body?.model_slug ?? "").trim() || "wan2.6-t2v";
  const duration = Math.max(2, Math.min(15, Number(body?.duration ?? 5) || 5));
  const aspectRatio = typeof body?.aspect_ratio === "string" ? body.aspect_ratio : undefined;
  const resolution = typeof body?.resolution === "string" ? body.resolution : undefined;
  const startFrame = typeof body?.start_frame === "string" ? body.start_frame : undefined;
  const endFrame = typeof body?.end_frame === "string" ? body.end_frame : undefined;
  const videoUrl = typeof body?.video_url === "string" ? body.video_url : undefined;

  const unlimited = isUnlimitedModel(modelSlug);

  // Server-side enforcement of the monthly video allowance (defense in depth —
  // the client also calls this before invoking the function).
  const { data: quota, error: quotaErr } = await admin.rpc("consume_video_quota", {
    _model: modelSlug,
    _unlimited: unlimited,
    // The admin client has no auth.uid(), so the caller is passed explicitly.
    _user_id: user.id,
  });

  if (quotaErr && !unlimited) {
    return json({ error: true, paywall: true, message: quotaErr.message || "Video quota check failed" }, 402);
  }
  const quotaRes = (quota || {}) as { allowed?: boolean; error?: string; limit?: number };
  if (!unlimited && !quotaRes.allowed) {
    const message = quotaRes.error === "video_quota_exceeded"
      ? `You've used all ${quotaRes.limit ?? 0} videos in your monthly plan. Upgrade to keep generating.`
      : quotaRes.error || "Video generation is not available on your plan.";
    return json({ error: true, paywall: true, message }, 402);
  }

  const slug = normalizeVideoSlug(modelSlug);
  const provider = providerForSlug(slug);
  const startedAt = Date.now();
  try {
    let generationId: string;
    let apiKeyId: string | null = null;

    if (provider === "deapi") {
      const key = Deno.env.get("DEAPI_API_KEY");
      if (!key) throw new Error("DeAPI key is not configured");
      const cfg = DEAPI_VIDEO[slug] ?? DEAPI_VIDEO["deapi-ltx-video"];
      generationId = await deapiVideoSubmit({
        key,
        model: cfg.api,
        prompt,
        steps: cfg.steps,
        fps: cfg.fps,
        duration,
        aspectRatio,
        image: startFrame,
      });
    } else if (provider === "renderful") {
      const key = Deno.env.get("RENDERFUL_API_KEY");
      if (!key) throw new Error("Renderful key is not configured");
      generationId = await renderfulVideoSubmit({
        key,
        model: slug.replace(/^renderful-/, ""),
        prompt,
        duration,
        aspectRatio,
        image: startFrame,
      });
    } else if (provider === "novita") {
      const key = Deno.env.get("NOVITA_API_KEY");
      if (!key) throw new Error("Novita key is not configured");
      generationId = await novitaVideoSubmit({
        key,
        slug,
        prompt,
        duration,
        aspectRatio,
        resolution,
        image: startFrame,
        lastFrame: endFrame,
        videoUrl,
      });
    } else {
      const acquired = await acquireKey(provider, slug);
      if (!acquired) throw new Error("No Alibaba/DashScope media provider key is configured");
      apiKeyId = acquired.keyId;
      generationId = await dashscopeSubmit({
        key: acquired.apiKey,
        workspaceId: acquired.workspaceId,
        model: slug,
        prompt,
        duration,
        aspectRatio,
        image: startFrame,
      });
    }


    const { data: jobRow, error: jobErr } = await admin
      .from("pending_video_jobs")
      .insert({
        user_id: user.id,
        provider,
        model_slug: slug,
        generation_id: generationId,
        api_key_id: apiKeyId,
        credits_charged: 0,
        prompt,
        duration_seconds: duration,
        aspect_ratio: aspectRatio ?? null,
        start_frame_url: startFrame ?? null,
        status: "pending",
      })
      .select("id")
      .single();
    if (jobErr) throw new Error(jobErr.message);

    void admin.from("media_generation_log").insert({
      key_id: apiKeyId,
      provider,
      model_id: slug,
      user_id: user.id,
      kind: "video",
      status: "started",
      duration_ms: Date.now() - startedAt,
    });

    return json({ job_id: jobRow.id, provider, model_slug: slug });
  } catch (e) {
    const message = e instanceof Error ? e.message : "video generation failed";
    void admin.from("media_generation_log").insert({
      provider,
      model_id: modelSlug,
      user_id: user.id,
      kind: "video",
      status: "failed",
      error_message: message.slice(0, 500),
      duration_ms: Date.now() - startedAt,
    });
    return json({ error: true, message }, 502);
  }
});
