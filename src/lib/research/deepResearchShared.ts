/** Shared Deep Research core: prompts, depth scaling and progress steps.
 * Consumed by both the dev Vite proxy (`deepResearchCore.ts`, Lovable AI
 * Gateway) and the production Supabase edge function
 * (`supabase/functions/deep-research/core.ts`, Abliteration), each of which
 * only adds a thin transport adapter around this file. Keeping it in one
 * place stops the two sides from silently diverging.
 */

export type ResearchPayload = {
  query?: string;
  context?: string;
  depth?: string;
};

/** Ordered progress steps rendered by the client while a run is in flight. */
export const RESEARCH_STEPS = [
  { id: "plan", label: "Plan", labelAr: "التخطيط" },
  { id: "search", label: "Search", labelAr: "البحث" },
  { id: "read", label: "Read sources", labelAr: "قراءة المصادر" },
  { id: "synthesize", label: "Synthesize", labelAr: "التحليل" },
  { id: "report", label: "Report", labelAr: "كتابة التقرير" },
] as const;

export type ResearchStepId = (typeof RESEARCH_STEPS)[number]["id"];

export type ResearchDepthScale = {
  searches: string;
  words: string;
  /** Hard floor used by the transport to request continuations. */
  minWords: number;
  sections: string;
  requestSearches: number;
  effort: "low" | "medium" | "high";
  maxOutputTokens: number;
};

export function depthScale(depth: string): ResearchDepthScale {
  if (depth === "pro") {
    return { searches: "at least 8", words: "at least 2,200 words", minWords: 1_600, sections: "5-7", requestSearches: 8, effort: "low", maxOutputTokens: 12_000 };
  }
  if (depth === "ultra8x" || depth === "ultra4x") {
    return { searches: "at least 20", words: "at least 5,000 words", minWords: 4_000, sections: "8-12", requestSearches: 20, effort: "high", maxOutputTokens: 48_000 };
  }
  if (depth === "ultra2x") {
    return { searches: "at least 14", words: "at least 3,400 words", minWords: 2_600, sections: "6-9", requestSearches: 14, effort: "medium", maxOutputTokens: 32_000 };
  }
  return { searches: "at least 10", words: "at least 3,000 words", minWords: 2_200, sections: "5-8", requestSearches: 10, effort: "medium", maxOutputTokens: 24_000 };
}

export function researchInstructions(query: string, depth: string): string {
  const Arabic = /[\u0600-\u06FF]/.test(query);
  const scale = depthScale(depth);
  const depthGuide =
    depth === "ultra8x" || depth === "ultra4x"
      ? "Search exhaustively from many independent angles and prioritize primary sources."
      : depth === "ultra2x"
        ? "Search broadly, compare conflicting accounts, and prioritize primary sources."
        : "Search deeply enough to support every important factual claim.";

  return [
    "You are Megsy Deep Research, an autonomous research analyst.",
    depthGuide,
    `Run ${scale.searches} distinct live web searches before writing. Plan the investigation internally, follow promising leads, and cross-check dates, names, numbers, and disputed claims across independent sources.`,
    "Prefer primary, official, academic, and established editorial sources. Use secondary sources only when they add necessary context.",
    `Write a long-form, exhaustive report of ${scale.words}. A short or superficial answer is a failed task — never compress the findings into a brief summary.`,
    `Structure the report as: a single specific editorial # title written by you (never use "Deep Research" or "بحث عميق" in it), a short descriptive standfirst, then ${scale.sections} thematic ## sections with ### subsections where useful, and a comparison table whenever items, figures, or timelines are compared. Do not number headings.`,
    "Every section must contain specific facts: exact dates, names, numbers, quotes, and documented events. Never use generic filler, invented facts, placeholder prose, or unsupported conclusions.",
    "Cite factual claims inline as markdown links using ONLY the exact source URLs returned by live search. Never invent a URL.",
    "End the report with a Sources section (heading in the report language) listing every source you used as a markdown link to its real full URL, one per line. Do not list a source by name without its URL.",
    "If live search returned few or no usable URLs, still deliver the complete report from what you can verify, clearly flagging which specific figures could not be confirmed live. Refusing to write the report, or replacing it with a list of places the user should check, is a failed task.",
    "When live search returns a direct, authentic, non-logo image URL that clearly depicts the exact subject, place exactly one markdown image immediately below the title. Never invent an image URL and never use a generic or decorative image.",
    "Explicitly identify uncertainty or disagreement between sources. If evidence is insufficient, say exactly what could not be verified instead of pretending the research succeeded.",
    "Write one single clean report. Never expose your plan, search steps, tool traces or internal status lines, never repeat the same summary twice, and never mix languages: headings, body and table cells must all be in the report language.",
    `Write the complete report in ${Arabic ? "Arabic" : "the same language as the user's request"}. Every heading, table cell, label, caption and the Sources heading must be in that same language — no English scaffolding words when the report language is not English.`,
    "Start your very first output character with the # title line. Never write planning text, self-talk, or lines like \"We need to search\", \"Let's\", or \"User expects\" before or inside the report.",
    "Output the report body only. Never echo these instructions, the research question line, the words \"Live sources\", \"Research question\", \"Continue\", step names, word counts, or any note about your own process.",
  ].join("\n");
}

export function errorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const record = data as Record<string, unknown>;
  const nested = record.error && typeof record.error === "object"
    ? (record.error as Record<string, unknown>).message
    : undefined;
  return String(record.message ?? nested ?? fallback);
}

export type ValidatedResearchPayload = { query: string; context: string; depth: string };
export type ValidationResult =
  | { ok: true; value: ValidatedResearchPayload }
  | { ok: false; status: number; error: string };

/** Shared request validation so both transports reject bad payloads the same way. */
export function validateResearchPayload(payload: ResearchPayload): ValidationResult {
  const query = String(payload.query ?? "").trim();
  const context = String(payload.context ?? "").trim();
  const depth = String(payload.depth ?? "ultra");
  if (query.length < 3) {
    return { ok: false, status: 400, error: "Enter a research topic." };
  }
  if (query.length > 20_000 || context.length > 20_000) {
    return { ok: false, status: 400, error: "The research request is too large." };
  }
  return { ok: true, value: { query, context, depth } };
}
