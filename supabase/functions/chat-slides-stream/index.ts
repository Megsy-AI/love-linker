/**
 * @doc chat-slides-stream
 * Slide-deck generation for chat.
 *
 * Two request shapes (see src/pages/chat/services/runSlidesTurn.ts and
 * src/lib/jobs/client.ts::startPlusAIPresentation):
 *
 *  - { action: "message", mode: "plan"|"summary", topic, kind, ... }
 *      One-shot narration text used to introduce/summarize a deck.
 *      Returns { message }.
 *
 *  - { topic, templateId?, conversation_id?, message_id?, language?,
 *      numberOfSlides?, stylePrompt?, templateName?, templateColors? }
 *      Starts a background job (kind="slides") in `background_jobs` and
 *      returns { jobId } immediately. The deck is written progressively into
 *      the job row (`progress`/`phase`/`stream_text`/`output.deck`) which the
 *      client follows via Realtime (see `subscribeJob`).
 */
import { callModel, hasModelProvider, MODELS } from "../_shared/abliteration.ts";
import { hasCerebras } from "../_shared/cerebras.ts";
import {
  admin,
  background,
  corsHeaders,
  createJob,
  finishJob,
  failJob,
  getCallerUser,
  json,
  updateJob,
} from "../_shared/jobs.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One deck-writing completion. Providers rate-limit hard, so retry with backoff
 *  instead of failing the whole job on a single 429. */
async function completion(db: ReturnType<typeof admin>, system: string, user: string, maxTokens = 2000) {
  let lastError = "model_unavailable";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(1500 * attempt);
    const result = await callModel(db, [MODELS.standard, MODELS.fast], {
      agentRole: "manager",
      stream: false,
      temperature: 0.7,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    if (!result?.response?.ok) continue;
    const data = await result.response.json().catch(() => null);
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text === "string" && text.trim()) return text.trim();
    lastError = "empty_completion";
  }
  throw new Error(lastError);
}

function extractJson(text: string): any {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no_json_found");
  return JSON.parse(raw.slice(start, end + 1));
}

// -------------------------------------------------------------- narration
async function handleMessage(db: ReturnType<typeof admin>, body: Record<string, unknown>) {
  const mode = String(body.mode || "summary");
  const topic = String(body.topic || "").slice(0, 400);
  const title = String(body.title || "").slice(0, 200);
  const language = String(body.language || "en");
  const slideCount = body.slideCount ? Number(body.slideCount) : undefined;

  const system =
    "You write extremely short, warm chat messages for an AI assistant that builds slide decks. " +
    "Reply with plain text only (no markdown headers, no quotes), 1-2 sentences, in the exact language requested.";

  const user =
    mode === "plan"
      ? `Language: ${language}. The user asked for a presentation about: "${topic}". Write a one-sentence message telling them you're putting together an outline for this deck now.`
      : `Language: ${language}. You just finished building a presentation titled "${title || topic}"${slideCount ? ` with ${slideCount} slides` : ""}. Write a short, friendly message presenting it to the user.`;

  const message = await completion(db, system, user, 200);
  return json({ message });
}

// -------------------------------------------------------------- deck build
type SlideDeck = {
  title: string;
  subtitle?: string;
  language?: string;
  templateId: string;
  palette: { primary: string; accent: string; bg: string; fg: string };
  slides: Record<string, unknown>[];
};

/** Layouts the renderer (src/components/chat/SlidesDeckCard.tsx) knows how to
 *  draw. Offering them to the model is what makes two decks built from
 *  different templates actually look different. */
const LAYOUTS = [
  "magazine-cover",
  "bullets",
  "two-col",
  "three-col",
  "pillars",
  "bento",
  "icon-grid",
  "numbered-list",
  "step-vertical",
  "timeline",
  "comparison",
  "vs-split",
  "big-number",
  "kpi-strip",
  "stat-cluster",
  "pull-quote",
  "split-left",
  "split-right",
];

function deckSystemPrompt(
  numberOfSlides: number,
  language: string,
  templateName?: string,
  stylePrompt?: string,
) {
  const style = [
    templateName ? `Template: "${templateName}".` : "",
    stylePrompt ? `Design direction: ${stylePrompt}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `You are a senior presentation designer. Produce a JSON object describing a slide deck (no prose, no markdown fences) with this exact shape:
{
  "title": string,
  "subtitle": string,
  "slides": [
    { "type": "cover", "layout": "magazine-cover", "title": string, "subtitle": string },
    { "type": "bullets", "layout": string, "title": string, "bullets": [string, ...] },
    { "type": "stats", "layout": string, "title": string, "stats": [{"label": string, "value": string}] },
    { "type": "quote", "layout": "pull-quote", "quote": string, "attribution": string },
    { "type": "closing", "title": string, "subtitle": string }
  ]
}
${style ? `Deck style — follow it in tone, wording density and slide rhythm: ${style}\n` : ""}Rules:
- Write exactly ${numberOfSlides} slides total, mixing types "cover" (first slide only), "bullets", "stats", "quote", "two-col" and "closing" (last slide only) as fits the content.
- Give every slide a "layout" chosen from: ${LAYOUTS.join(", ")}. Never repeat a layout on two consecutive slides, and use at least ${Math.min(LAYOUTS.length, Math.max(5, numberOfSlides - 2))} different layouts across the deck — the deck must not feel repetitive.
- Content weight is substantial (between medium and heavy), never thin: every body slide carries 45-90 words of real substance.
- Every "bullets" slide has 4-6 bullets, each a full informative line of 12-22 words with a concrete fact, figure, mechanism or example — never 2-3 word labels and never filler.
- Give every non-cover slide a short "subtitle" of 6-14 words that adds context instead of repeating the title.
- On "stats" slides give 3-4 stats; each "value" is a short figure (max 12 characters, e.g. "2.5 GW", "42%") and each "label" is at most 4 words. Never put a sentence in "value".
- Quote slides carry a real substantive quote of 15-35 words with an attribution.
- All text must be in language: ${language}.
- Output raw JSON only, nothing else.`;
}

/** Perceived brightness (0-1) of a #rrggbb colour; unknown formats read mid-grey. */
function brightness(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

async function buildDeck(
  db: ReturnType<typeof admin>,
  args: {
    topic: string;
    numberOfSlides: number;
    language: string;
    templateId: string;
    templateName?: string;
    templateColors?: [string, string];
    stylePrompt?: string;
  },
): Promise<SlideDeck> {
  // Token budget scales with the deck size; a fixed 4k truncated longer decks
  // mid-JSON, which used to collapse the whole deck onto the 3-slide fallback.
  const tokenBudget = Math.min(16_000, Math.max(4_000, args.numberOfSlides * 900));
  let parsed: any = {};
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await completion(
      db,
      deckSystemPrompt(args.numberOfSlides, args.language, args.templateName, args.stylePrompt),
      `Build the deck for this brief:\n\n${args.topic}`,
      tokenBudget,
    );
    try {
      const candidate = extractJson(raw);
      if (Array.isArray(candidate?.slides) && candidate.slides.length) {
        parsed = candidate;
        break;
      }
      parsed = candidate ?? {};
    } catch (error) {
      console.error("chat-slides-stream: failed to parse deck JSON", error);
    }
  }
  const colors = args.templateColors && args.templateColors.length === 2
    ? args.templateColors
    : ["#111827", "#6366f1"];
  // Always derive a readable bg/fg pair from the template colours so a deck
  // never renders with an unreadable or blank canvas. Measured brightness
  // replaces the old hex-pattern guess, which read colours like #1a3a1f as
  // light and painted dark templates white.
  const primary = String(colors[0] || "#111827");
  const accent = String(colors[1] || "#6366f1");
  const bgIsDark = brightness(primary) < 0.45;
  const palette = {
    primary,
    accent,
    bg: primary,
    fg: bgIsDark ? "#f8fafc" : "#111111",
  };

  let slides = Array.isArray(parsed.slides) ? parsed.slides.filter((s: unknown) => s && typeof s === "object") : [];
  if (!slides.length) {
    // Guaranteed fallback content so the deck never renders blank/white
    // when the model returns malformed or empty JSON.
    slides = [
      { type: "cover", title: String(parsed.title || args.topic.slice(0, 80)), subtitle: "" },
      {
        type: "bullets",
        title: "Overview",
        bullets: [args.topic.slice(0, 140) || "Overview"],
      },
      { type: "closing", title: "Thank you" },
    ];
  }

  return {
    title: String(parsed.title || args.topic.slice(0, 80)) || "Untitled deck",
    subtitle: parsed.subtitle ? String(parsed.subtitle) : undefined,
    language: args.language,
    templateId: args.templateId,
    palette,
    slides,
  };
}

async function runSlidesJob(
  db: ReturnType<typeof admin>,
  jobId: string,
  args: {
    topic: string;
    numberOfSlides: number;
    language: string;
    templateId: string;
    templateName?: string;
    templateColors?: [string, string];
    stylePrompt?: string;
  },
) {
  try {
    await updateJob(db, jobId, { phase: "outline", progress: 15, status_text: "Drafting outline" });
    await updateJob(db, jobId, { phase: "content", progress: 45, status_text: "Writing slides" });
    const deck = await buildDeck(db, args);
    await updateJob(db, jobId, { phase: "finalize", progress: 90, status_text: "Finalizing deck" });
    await finishJob(db, jobId, { deck });
  } catch (error) {
    console.error("chat-slides-stream job failed", error);
    await failJob(db, jobId, error instanceof Error ? error.message : "slides_generation_failed");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const db = admin();

  if (body.action === "message") {
    try {
      return await handleMessage(db, body);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "failed" }, 502);
    }
  }

  // Cerebras is the primary provider; abliteration.ai is only the fallback, so
  // either one being configured is enough to build a deck.
  if (!hasCerebras() && !hasModelProvider()) {
    return json({ error: "auth_required", message: "Model provider not configured" }, 503);
  }

  const user = await getCallerUser(db, req);
  if (!user) return json({ error: "auth_required", message: "Please sign in to continue." }, 401);

  const topic = String(body.topic || "").trim();
  if (!topic) return json({ error: "topic is required" }, 400);

  const numberOfSlides = Math.min(Math.max(Number(body.numberOfSlides) || 10, 3), 30);
  const language = String(body.language || "en");
  const templateId = String(body.templateId || "default");
  const templateName = body.templateName ? String(body.templateName) : undefined;
  const stylePrompt = body.stylePrompt ? String(body.stylePrompt).slice(0, 600) : undefined;
  const templateColors = Array.isArray(body.templateColors) && body.templateColors.length === 2
    ? (body.templateColors as [string, string])
    : undefined;

  let jobId: string;
  try {
    jobId = await createJob(db, {
      userId: user.id,
      kind: "slides",
      conversationId: (body.conversation_id as string) ?? null,
      messageId: (body.message_id as string) ?? null,
      input: { topic, numberOfSlides, language, templateId, templateName, templateColors, stylePrompt },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "failed to create job" }, 500);
  }

  background(
    runSlidesJob(db, jobId, {
      topic,
      numberOfSlides,
      language,
      templateId,
      templateName,
      templateColors,
      stylePrompt,
    }),
  );

  return json({ jobId });
});
