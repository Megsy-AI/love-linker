/** Server-only Deep Research proxy (dev/Vite transport adapter).
 *
 * Uses the project's own provider (abliteration.ai) — the same upstream as the
 * chat proxy and the production edge function. Prompts, depth scaling and
 * validation live in `deepResearchShared.ts` so this stays in lockstep with
 * `supabase/functions/deep-research/core.ts`; only the runtime differs.
 */
import {
  errorMessage,
  researchInstructions,
  depthScale,
  validateResearchPayload,
  type ResearchPayload,
} from "./deepResearchShared";

const BASE = (process.env.ABLITERATION_API_BASE || "https://api.abliteration.ai/v1").replace(
  /\/$/,
  "",
);
const RESEARCH_MODEL = "abliterated-model-large";

function apiKey(): string {
  return (
    process.env.ABLITERATION_API_KEY ||
    process.env.VITE_ABLITERATION_API_KEY ||
    ""
  ).trim();
}

export async function streamDeepResearch(
  payload: ResearchPayload,
  request?: Request,
): Promise<Response> {
  const key = apiKey();
  if (!key) {
    return Response.json(
      {
        error: "Deep Research is not configured: missing ABLITERATION_API_KEY.",
        missingEnv: "ABLITERATION_API_KEY",
      },
      { status: 500 },
    );
  }

  const validated = validateResearchPayload(payload);
  if (validated.ok !== true) {
    return Response.json({ error: validated.error }, { status: validated.status });
  }
  const { query, context, depth } = validated.value;
  const scale = depthScale(depth);

  const input = context
    ? `${query}\n\nConversation context for disambiguation only:\n${context}`
    : query;

  let upstream: Response;
  try {
    upstream = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: RESEARCH_MODEL,
        stream: true,
        messages: [
          { role: "system", content: researchInstructions(query, depth) },
          { role: "user", content: input },
        ],
        reasoning_effort: scale.effort,
        web_search_options: { search_count: scale.requestSearches },
        max_tokens: scale.maxOutputTokens,
      }),
      signal: request?.signal,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Deep Research failed. Please try again.",
        retryable: true,
      },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const data = await upstream.json().catch(() => null);
    return Response.json(
      {
        error: errorMessage(data, `Deep Research failed (${upstream.status}).`),
        retryable: upstream.status === 429 || upstream.status >= 500,
      },
      { status: upstream.status },
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const sources = new Map<string, { url: string; title: string }>();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newline = buffer.indexOf("\n");
          while (newline !== -1) {
            const line = buffer.slice(0, newline).replace(/\r$/, "");
            buffer = buffer.slice(newline + 1);
            newline = buffer.indexOf("\n");
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim();
            if (!raw || raw === "[DONE]") continue;
            let chunk: Record<string, any>;
            try {
              chunk = JSON.parse(raw);
            } catch {
              continue;
            }

            const choice = chunk.choices?.[0];
            const delta = choice?.delta ?? {};

            if (typeof delta.reasoning_content === "string" && delta.reasoning_content) {
              send({
                type: "response.reasoning_summary_text.delta",
                delta: delta.reasoning_content,
              });
            }
            if (typeof delta.content === "string" && delta.content) {
              send({ type: "response.output_text.delta", delta: delta.content });
            }
            const annotations = Array.isArray(delta.annotations) ? delta.annotations : [];
            for (const ann of annotations) {
              const url = String(ann?.url_citation?.url ?? ann?.url ?? "");
              if (!url || sources.has(url)) continue;
              sources.set(url, { url, title: String(ann?.url_citation?.title ?? ann?.title ?? url) });
              send({
                type: "response.output_text.annotation.added",
                annotation: { type: "url_citation", url, title: sources.get(url)!.title },
              });
            }
            const toolCalls = Array.isArray(delta.tool_calls) ? delta.tool_calls : [];
            if (toolCalls.length) send({ type: "response.web_search_call.searching" });
            if (choice?.finish_reason === "content_filter") {
              send({ type: "response.failed", error: { message: "Deep Research was filtered." } });
            }
          }
        }
      } catch (error) {
        send({
          type: "response.failed",
          error: { message: error instanceof Error ? error.message : "stream failed" },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
