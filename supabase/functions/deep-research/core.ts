/** @doc Deep Research core — production transport adapter.
 *
 * Provider: the SAME routing ladder the rest of the app uses
 * (`_shared/abliteration.ts::callModel` → Cerebras primary, abliteration.ai
 * fallback). The old code called abliteration.ai directly and relied on its
 * `web_search_options`, so Deep Research broke whenever that legacy key was
 * absent. Live sources now come from our own search stack
 * (`_shared/search/webSearchCore.ts` + `readUrlCore.ts`) and the model only
 * synthesizes the report, which keeps the provider decision in one place.
 *
 * Prompts, depth scaling and validation stay in `sharedResearch.ts`.
 * The client-visible SSE contract is unchanged:
 * `response.web_search_call.searching`, `response.output_text.annotation.added`,
 * `response.reasoning_summary_text.delta`, `response.output_text.delta`,
 * `response.failed`.
 */
import { callModel } from "../_shared/abliteration.ts";
import { webSearch, type WebSearchResult } from "../_shared/search/webSearchCore.ts";
import { readUrls } from "../_shared/search/readUrlCore.ts";
import {
  researchInstructions,
  depthScale,
  validateResearchPayload,
  type ResearchPayload,
} from "./sharedResearch.ts";

export type { ResearchPayload };

const MAX_SOURCE_CHARS = 42_000;

/** Cheap model call that expands the question into distinct search queries. */
async function planQueries(query: string, wanted: number): Promise<string[]> {
  const fallback = [query];
  try {
    const result = await callModel(null, [], {
      agentRole: "fast",
      stream: false,
      temperature: 0.3,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content:
            "You turn a research question into distinct web-search queries. " +
            `Reply with ONLY a JSON array of ${wanted} short query strings, no prose. ` +
            "Keep the user's language, cover different angles, and avoid duplicates.",
        },
        { role: "user", content: query },
      ],
    });
    if (!result?.response.ok) return fallback;
    const data = await result.response.json();
    const text = String(data?.choices?.[0]?.message?.content ?? "");
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1) return fallback;
    const parsed = JSON.parse(text.slice(start, end + 1));
    const queries = Array.isArray(parsed)
      ? parsed
          .map((q) => String(q).trim())
          // Guard against degenerate one-word queries ("من", "the") that send
          // the search stack after dictionary pages instead of the topic.
          .filter((q) => q.length >= 8 && q.split(/\s+/).filter(Boolean).length >= 2)
      : [];
    const unique = Array.from(new Set([query, ...queries])).slice(0, wanted);
    return unique.length ? unique : fallback;

  } catch {
    return fallback;
  }
}

export async function streamDeepResearch(payload: ResearchPayload): Promise<Response> {
  const validated = validateResearchPayload(payload);
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: validated.status });
  }
  const { query, context, depth } = validated.value;
  const scale = depthScale(depth);

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const fail = (message: string) => {
        send({ type: "response.failed", error: { message } });
      };

      try {
        // ---------------------------------------------------------- search
        const queryCount = Math.max(2, Math.min(6, Math.round(scale.requestSearches / 3)));
        const queries = await planQueries(query, queryCount);

        const seen = new Map<string, WebSearchResult>();
        for (const q of queries) {
          send({ type: "response.web_search_call.searching" });
          const found = await webSearch(q, Math.min(8, scale.requestSearches)).catch(
            () => ({ results: [] as WebSearchResult[] }),
          );
          for (const item of found.results ?? []) {
            const url = String(item.url ?? "");
            if (!url || seen.has(url)) continue;
            seen.set(url, {
              url,
              title: String(item.title ?? url),
              snippet: String(item.snippet ?? ""),
            });
          }
        }

        const sources = [...seen.values()].slice(0, Math.min(18, scale.requestSearches * 2));
        if (!sources.length) {
          fail("Deep Research could not reach any live sources. Please try again.");
          return;
        }
        for (const source of sources) {
          send({
            type: "response.output_text.annotation.added",
            annotation: { type: "url_citation", url: source.url, title: source.title },
          });
        }

        // ------------------------------------------------------ read pages
        const readCount = Math.min(sources.length, depth === "fast" ? 5 : 10);
        const perPage = Math.max(2_000, Math.floor(MAX_SOURCE_CHARS / Math.max(1, readCount)));
        const pages = await readUrls(
          sources.slice(0, readCount).map((s) => s.url),
          perPage,
        ).catch(() => []);

        const corpus: string[] = [];
        let used = 0;
        sources.forEach((source, index) => {
          const page = pages.find((p) => p.url === source.url);
          const body = (page?.text || source.snippet || "").trim();
          if (!body) return;
          const block = `[${index + 1}] ${source.title}\n${source.url}\n${body}`;
          if (used + block.length > MAX_SOURCE_CHARS) return;
          used += block.length;
          corpus.push(block);
        });

        if (!corpus.length) {
          fail("Deep Research could not read the sources it found. Please try again.");
          return;
        }

        // ------------------------------------------------------- synthesis
        const userContent = [
          `Research question: ${query}`,
          context ? `Conversation context for disambiguation only:\n${context}` : "",
          "",
          "Live sources gathered for you (cite them inline as markdown links using the exact URLs):",
          corpus.join("\n\n---\n\n"),
        ]
          .filter(Boolean)
          .join("\n");

        const system = researchInstructions(query, depth);
        const history: { role: "system" | "user" | "assistant"; content: string }[] = [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ];

        // Models sometimes leak planning self-talk before the report ("We need
        // to search…") and invent their own Sources list. Both are filtered
        // here, on the raw stream, so the client only ever sees clean report
        // prose; the real source list is appended by us at the very end.
        const SOURCES_HEADING =
          /\n#{1,4}\s*(sources|references|المصادر|المراجع|قائمة المصادر)\s*:?\s*\n/i;

        /** Strips pre-report self-talk and any model-written Sources section. */
        const cleanPart = (raw: string, isFirst: boolean): string => {
          let out = raw;
          if (isFirst) {
            // Everything before the first markdown heading is planning
            // self-talk ("We need to search…"): hold it back entirely until
            // the real report starts.
            const heading = out.match(/(^|\n)#{1,4} /);
            if (!heading) return "";
            out = out.slice(heading.index === 0 ? 0 : (heading.index ?? 0) + 1);
          }
          const cut = out.match(SOURCES_HEADING);
          if (cut && cut.index !== undefined) out = out.slice(0, cut.index);
          return out;
        };

        /** Streams one completion to the client and returns the text it wrote. */
        const streamOnce = async (isFirst: boolean): Promise<string> => {
          const result = await callModel(null, [], {
            agentRole: "research",
            stream: true,
            reasoning_effort: scale.effort,
            max_tokens: scale.maxOutputTokens,
            messages: history,
          });
          if (!result?.response.ok || !result.response.body) return "";
          const reader = result.response.body.getReader();
          let buffer = "";
          let text = "";
          let emitted = 0;
          // Emit only the part of the cleaned text that is safe to show, always
          // holding back a small tail so a heading split across chunks can
          // still be recognised before it reaches the user.
          const flush = (done: boolean) => {
            const clean = cleanPart(text, isFirst);
            const safeEnd = done ? clean.length : Math.max(0, clean.length - 80);
            if (safeEnd <= emitted) return;
            send({ type: "response.output_text.delta", delta: clean.slice(emitted, safeEnd) });
            emitted = safeEnd;
          };
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
              const reasoning = delta.reasoning_content ?? delta.reasoning;
              if (typeof reasoning === "string" && reasoning) {
                send({ type: "response.reasoning_summary_text.delta", delta: reasoning });
              }
              if (typeof delta.content === "string" && delta.content) {
                text += delta.content;
                flush(false);
              }
              if (choice?.finish_reason === "content_filter") {
                fail("Deep Research was filtered.");
              }
            }
          }
          flush(true);
          return cleanPart(text, isFirst);
        };

        let report = await streamOnce(true);
        if (!report.trim()) {
          fail("Deep Research failed. Please try again.");
          return;
        }

        // The model routinely stops well short of the requested length. Keep
        // asking it to continue the SAME report (no repeats, no new preamble)
        // until it reaches the depth target the user paid for.
        const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
        for (let pass = 0; pass < 3 && words(report) < scale.minWords; pass += 1) {
          history.push({ role: "assistant", content: report.slice(-8_000) });
          history.push({
            role: "user",
            content:
              `Continue the same report from exactly where it stopped until it reaches at least ${scale.minWords} words in total. ` +
              "Do not restate the title, standfirst, or anything already written, do not summarize, do not add commentary about continuing, " +
              "and keep the identical language and heading style. Add new thematic sections with concrete facts. " +
              "Never write a Sources, References or المصادر list — it is appended automatically.",
          });
          const more = await streamOnce(false);
          if (!more.trim()) break;
          report += `\n\n${more}`;
        }

        // Real source list, appended once, in the report language.
        const arabic = /[\u0600-\u06FF]/.test(query);
        const usedSources = sources.slice(0, 18);
        const sourcesBlock =
          `\n\n## ${arabic ? "المصادر" : "Sources"}\n\n` +
          usedSources.map((s) => `- [${s.title}](${s.url})`).join("\n") +
          "\n";
        send({ type: "response.output_text.delta", delta: sourcesBlock });

      } catch (error) {
        fail(error instanceof Error ? error.message : "Deep Research failed. Please try again.");
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
