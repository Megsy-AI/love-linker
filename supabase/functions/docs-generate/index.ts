/**
 * @doc docs-generate
 * Document/report generation for chat.
 *
 * Two request shapes (see src/lib/agent/docs/readyMessage.ts and
 * src/lib/agent/docs/docsGenerator.ts):
 *
 *  - { action: "ready-message", title, html, docType, prompt }
 *      One-shot: writes a short language-matched summary message.
 *      Returns { message }.
 *
 *  - { prompt, history?, clarifications?, conversation_id?, message_id? }
 *      Starts a background job (kind="docs") in `background_jobs` and
 *      returns { jobId } immediately. The document HTML is streamed
 *      progressively into `stream_text`/`meta`/`output.html`, which the
 *      client follows via Realtime (see `resumeDocJob`).
 */
import { callModel, hasModelProvider, MODELS } from "../_shared/abliteration.ts";
import {
  admin,
  appendStream,
  background,
  corsHeaders,
  createJob,
  failJob,
  finishJob,
  getCallerUser,
  json,
  updateJob,
} from "../_shared/jobs.ts";

type Msg = { role: string; content: string };

// -------------------------------------------------------------- ready message
async function handleReadyMessage(db: ReturnType<typeof admin>, body: Record<string, unknown>) {
  const title = String(body.title || "Document").slice(0, 200);
  const docType = String(body.docType || "document").slice(0, 60);
  const prompt = String(body.prompt || "").slice(0, 2000);
  const html = String(body.html || "").slice(0, 6000);

  const system =
    "You write a 2-4 sentence friendly assistant message presenting a document you just generated. " +
    "Plain text only, no markdown headers. Reply strictly in the same language/dialect as the user's original request.";
  const user = `Original request: "${prompt}"\nDocument type: ${docType}\nDocument title: "${title}"\nDocument excerpt (HTML, for context only): ${html.slice(0, 1500)}\n\nWrite the presenting message now.`;

  const result = await callModel(db, [MODELS.fast, MODELS.standard], {
    model: MODELS.fast,
    stream: false,
    temperature: 0.6,
    max_tokens: 300,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  if (!result?.response?.ok) return json({ message: "" });
  const data = await result.response.json().catch(() => null);
  const message = String(data?.choices?.[0]?.message?.content || "").trim();
  return json({ message });
}

// -------------------------------------------------------------- doc build
function docSystemPrompt() {
  return `You are a professional document writer. Given a user's request, write a complete, well-structured document as clean semantic HTML (use h1/h2/h3, p, ul/ol/li, table where useful — no <html>/<head>/<body> wrapper, no markdown, no code fences).
Write in the same language as the user's request. Be thorough and accurate; do not pad with filler.
If, and only if, the request is too ambiguous to write anything useful (e.g. missing a core subject), instead reply with ONLY this JSON object (nothing else):
{"clarify": {"reason": string, "questions": [{"id": string, "label": string}]}}
Otherwise reply with ONLY the HTML document body, nothing else.`;
}

function guessTitleAndType(prompt: string, html: string): { title: string; doc_type: string } {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1 ? h1[1].replace(/<[^>]+>/g, "").trim().slice(0, 120) : prompt.slice(0, 60) || "Document";
  const lower = prompt.toLowerCase();
  let doc_type = "document";
  if (/report/.test(lower)) doc_type = "report";
  else if (/letter/.test(lower)) doc_type = "letter";
  else if (/proposal/.test(lower)) doc_type = "proposal";
  else if (/résumé|resume|cv/.test(lower)) doc_type = "resume";
  else if (/contract/.test(lower)) doc_type = "contract";
  return { title, doc_type };
}

async function runDocsJob(
  db: ReturnType<typeof admin>,
  jobId: string,
  args: { prompt: string; history: Msg[]; clarifications?: Record<string, string> },
) {
  try {
    await updateJob(db, jobId, { phase: "draft", progress: 10, status_text: "Reading your request" });

    const messages: Msg[] = [
      { role: "system", content: docSystemPrompt() },
      ...args.history.slice(-10),
      {
        role: "user",
        content: args.clarifications && Object.keys(args.clarifications).length
          ? `${args.prompt}\n\nAdditional answers:\n${Object.entries(args.clarifications)
              .map(([k, v]) => `- ${k}: ${v}`)
              .join("\n")}`
          : args.prompt,
      },
    ];

    const result = await callModel(db, [MODELS.standard, MODELS.fast], {
      model: MODELS.standard,
      stream: true,
      temperature: 0.5,
      max_tokens: 6000,
      messages,
    });
    if (!result?.response?.ok || !result.response.body) throw new Error("model_unavailable");

    await updateJob(db, jobId, { phase: "write", progress: 25, status_text: "Writing your document" });

    const reader = result.response.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buf = "";
    let progress = 25;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const payload = t.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          const delta = evt?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) {
            full += delta;
            await appendStream(db, jobId, delta);
            progress = Math.min(90, progress + 1);
            await updateJob(db, jobId, { progress });
          }
        } catch {
          // ignore malformed SSE fragments
        }
      }
    }

    full = full.trim();
    // Model asked a clarifying question instead of writing the document.
    if (full.startsWith("{") && /"clarify"/.test(full)) {
      try {
        const parsed = JSON.parse(full);
        if (parsed?.clarify) {
          await updateJob(db, jobId, {
            status: "needs_input",
            progress: 100,
            phase: "clarify",
            status_text: "Need a bit more info",
            clarify: parsed.clarify,
            finished_at: new Date().toISOString(),
          });
          return;
        }
      } catch {
        /* fall through — treat as plain HTML */
      }
    }

    const { title, doc_type } = guessTitleAndType(args.prompt, full);
    await updateJob(db, jobId, { meta: { title, doc_type }, phase: "finalize", progress: 95, status_text: "Finalizing" });
    await finishJob(db, jobId, { html: full });
  } catch (error) {
    console.error("docs-generate job failed", error);
    await failJob(db, jobId, error instanceof Error ? error.message : "docs_generation_failed");
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

  if (body.action === "ready-message") {
    try {
      return await handleReadyMessage(db, body);
    } catch (error) {
      return json({ message: "" });
    }
  }

  if (!hasModelProvider()) return json({ error: "auth_required", message: "Model provider not configured" }, 503);

  const user = await getCallerUser(db, req);
  if (!user) return json({ error: "auth_required", message: "Please sign in to continue." }, 401);

  const prompt = String(body.prompt || "").trim();
  if (!prompt) return json({ error: "prompt is required" }, 400);
  const history = Array.isArray(body.history)
    ? (body.history as Msg[]).filter((m) => m && typeof m.content === "string")
    : [];
  const clarifications =
    body.clarifications && typeof body.clarifications === "object"
      ? (body.clarifications as Record<string, string>)
      : undefined;

  let jobId: string;
  try {
    jobId = await createJob(db, {
      userId: user.id,
      kind: "docs",
      conversationId: (body.conversation_id as string) ?? null,
      messageId: (body.message_id as string) ?? null,
      input: { prompt, history, clarifications: clarifications ?? null },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "failed to create job" }, 500);
  }

  background(runDocsJob(db, jobId, { prompt, history, clarifications }));

  return json({ jobId });
});
