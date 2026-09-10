/** @doc Speech-to-text endpoint used by the composer mic button (ported from
 * the dev-only `api/transcribe.ts`). Forwards the recorded audio to the
 * Abliteration OpenAI-compatible `/audio/transcriptions` endpoint and answers
 * with the same `{ text, error? }` payload the client already expects.
 */
import { corsHeaders } from "../_shared/cors.ts";
import { guardRequest, guardResponse } from "../_shared/apiAuth.ts";

const BASE = (Deno.env.get("ABLITERATION_API_BASE") || "https://api.abliteration.ai/v1").replace(
  /\/$/,
  "",
);
const MODEL = Deno.env.get("TRANSCRIBE_MODEL") || "whisper-1";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ text: "", error: "Method not allowed" }, 405);

  const guard = await guardRequest(req, "transcribe");
  if (!guard.ok) return guardResponse(guard, corsHeaders);

  const apiKey = Deno.env.get("ABLITERATION_API_KEY");
  if (!apiKey) return json({ text: "", error: "Speech-to-text is not configured" }, 500);

  try {
    const form = await req.formData();
    const file = form.get("file");
    const language = String(form.get("language") || "") || undefined;
    if (!(file instanceof Blob) || file.size === 0) {
      return json({ text: "", error: "No audio uploaded" }, 400);
    }

    const upstream = new FormData();
    upstream.append("file", file, (file as File).name || "audio.webm");
    upstream.append("model", MODEL);
    if (language) upstream.append("language", language);

    const resp = await fetch(`${BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });

    const raw = await resp.text();
    if (!resp.ok) {
      let message = raw.slice(0, 300);
      try {
        const parsed = JSON.parse(raw) as { error?: { message?: string }; message?: string };
        message = parsed?.error?.message || parsed?.message || message;
      } catch {
        /* keep raw text */
      }
      return json({ text: "", error: message || `HTTP ${resp.status}` }, resp.status);
    }

    try {
      const parsed = JSON.parse(raw) as { text?: string };
      return json({ text: String(parsed?.text ?? "").trim() });
    } catch {
      return json({ text: "", error: "Invalid transcription response" }, 502);
    }
  } catch (err) {
    return json(
      { text: "", error: err instanceof Error ? err.message : "transcription failed" },
      500,
    );
  }
});
