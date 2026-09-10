/** Browser client for the single native Deep Research stream. */
import type { WebSource } from "@/lib/search/webSearchClient";
import { callServerEndpoint } from "@/lib/api/callServerEndpoint";
import { RESEARCH_STEPS, type ResearchStepId } from "@/lib/research/deepResearchShared";

export { RESEARCH_STEPS };
export type { ResearchStepId };

export const DEEP_RESEARCH_TOOL = {
  name: "deep_research",
  label: "Deep Research",
  description: "Autonomous live-web research with verification and cited reporting.",
} as const;

const RESEARCH_INTENT = [
  /\bdeep\s*research\b/i,
  /\bresearch\s+(report|paper|study|memo)\b/i,
  /\b(comprehensive|in[-\s]?depth|detailed|exhaustive)\s+(report|analysis|study|overview)\b/i,
  /\bliterature\s+review\b/i,
  /\bmarket\s+(research|analysis)\b/i,
  /بحث\s*(عميق|شامل|مفصل|مطول|أكاديمي)/,
  /(اعمل|اكتب|اعطني|عايز|عاوز|أريد)\s*(لي)?\s*(تقرير|دراسة|بحث)\s*(شامل|مفصل|كامل|عميق|مطول)?/,
  /دراسة\s*(شاملة|مفصلة|جدوى)/,
  /تقرير\s*(شامل|مفصل|مطول|بحثي)/,
];

export function shouldDelegateToDeepResearch(text: string): boolean {
  const value = text.trim();
  return value.length >= 12 && RESEARCH_INTENT.some((pattern) => pattern.test(value));
}

export interface DeepResearchToolRun {
  query: string;
  context?: string;
  depth?: string;
  onStatus?: (status: string) => void;
  onDelta?: (chunk: string) => void;
  onReasoning?: (chunk: string) => void;
  onSources?: (sources: WebSource[]) => void;
  /** Fires whenever the run advances to the next entry in RESEARCH_STEPS. */
  onStep?: (stepId: ResearchStepId) => void;
  signal?: AbortSignal;
}

function gatewayError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  return String((data as { error?: string }).error ?? fallback);
}

export async function runDeepResearchTool(run: DeepResearchToolRun): Promise<string> {
  run.onStatus?.("Planning the investigation…");
  run.onStep?.("plan");
  const response = await callServerEndpoint("deep-research", {
    query: run.query,
    context: run.context,
    depth: run.depth,
  });

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => null);
    throw new Error(gatewayError(data, `Deep Research failed (${response.status}).`));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const sources = new Map<string, WebSource>();
  let buffer = "";
  let report = "";
  let searches = 0;
  let reachedRead = false;
  let reachedSynthesize = false;

  const consumeLine = (line: string) => {
    if (!line.startsWith("data:")) return;
    const raw = line.slice(5).trim();
    if (!raw || raw === "[DONE]") return;

    let event: Record<string, any>;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }

    if (event.type === "response.web_search_call.searching") {
      searches += 1;
      run.onStep?.("search");
      run.onStatus?.(`Searching and checking sources… (${searches})`);
    } else if (event.type === "response.reasoning_summary_text.delta") {
      if (!reachedRead) {
        reachedRead = true;
        run.onStep?.("read");
      }
      run.onReasoning?.(String(event.delta ?? ""));
    } else if (event.type === "response.output_text.delta") {
      if (!reachedSynthesize) {
        reachedSynthesize = true;
        run.onStep?.("synthesize");
      }
      const chunk = String(event.delta ?? "");
      report += chunk;
      run.onDelta?.(chunk);
    } else if (event.type === "response.output_text.annotation.added") {
      const citation = event.annotation;
      const url = String(citation?.url ?? "");
      if (citation?.type === "url_citation" && url) {
        sources.set(url, {
          title: String(citation.title ?? url),
          url,
          snippet: "",
        });
        run.onSources?.([...sources.values()]);
      }
    } else if (event.type === "response.failed" || event.type === "error") {
      throw new Error(gatewayError(event.error ?? event.response?.error, "Deep Research failed."));
    }
  };

  // Deep research legitimately takes minutes, but a silent stream looks frozen.
  // Keep the user informed while data flows, and stop waiting after a long
  // silence instead of hanging forever.
  // The provider searches the live web before emitting a single token, so the
  // first byte can take minutes; only mid-stream silence is suspicious.
  const FIRST_BYTE_MS = 420_000;
  const STALL_MS = 180_000;
  let receivedAny = false;
  let lastEventAt = Date.now();
  const heartbeat = window.setInterval(() => {
    const idle = Math.round((Date.now() - lastEventAt) / 1000);
    if (idle >= 20) run.onStatus?.(`Still researching… (${idle}s without new data)`);
  }, 15_000);

  try {
  while (true) {
    const read = await Promise.race([
      reader.read(),
      new Promise<"stalled">((resolve) =>
        window.setTimeout(() => resolve("stalled"), receivedAny ? STALL_MS : FIRST_BYTE_MS),
      ),
    ]);
    if (read === "stalled") {
      await reader.cancel().catch(() => undefined);
      if (!report.trim()) {
        throw new Error("Deep Research stopped responding. Please try again.");
      }
      break;
    }
    const { done, value } = read;
    if (done) break;
    lastEventAt = Date.now();
    receivedAny = true;
    buffer += decoder.decode(value, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      const line = buffer.slice(0, newline).replace(/\r$/, "");
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
      consumeLine(line);
    }
  }
  } finally {
    window.clearInterval(heartbeat);
  }

  const finalLine = buffer.trim();
  if (finalLine) consumeLine(finalLine);

  if (!report.trim()) {
    throw new Error("Deep Research completed without a report. Please try again.");
  }

  // Some providers cite inside the text instead of emitting annotations. A
  // report with no visible sources reads as unverifiable, so recover the links
  // written in the report itself.
  if (!sources.size) {
    const seen = new Set<string>();
    const push = (url: string, title: string) => {
      const clean = url.replace(/[.,;:!?)\]]+$/, "");
      if (!/^https?:\/\//i.test(clean) || seen.has(clean)) return;
      seen.add(clean);
      let label = title.trim();
      if (!label) {
        try {
          label = new URL(clean).hostname.replace(/^www\./, "");
        } catch {
          label = clean;
        }
      }
      sources.set(clean, { title: label, url: clean, snippet: "" });
    };
    for (const m of report.matchAll(/\[([^\]]{1,120})\]\((https?:\/\/[^\s)]+)\)/g)) {
      push(m[2], m[1]);
    }
    for (const m of report.matchAll(/(?<!\]\()https?:\/\/[^\s<>")\]]+/g)) push(m[0], "");
    if (sources.size) run.onSources?.([...sources.values()]);
  }

  run.onStep?.("report");
  run.onStatus?.("Research complete");
  return report.trim();
}