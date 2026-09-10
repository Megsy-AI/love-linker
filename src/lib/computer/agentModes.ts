/**
 * @doc One agent for everything.
 *
 * The old separate agents (main agent, docs writer, deep research, coder) are
 * gone: every one of those requests now runs on the same cloud agent, which can
 * browse, run code, write files and finish long tasks on its own. This module
 * only decides which requests go there and wraps the user's ask with the extra
 * expectations for that kind of work.
 */

export type CloudAgentTarget = "agent" | "research" | "code" | "docs";

/**
 * Returns the agent target for a send, or null when the request belongs to a
 * different surface (images, video, slides, learning, plain chat…).
 */
export function cloudAgentTarget(
  chatMode: string,
  selectedAgentId?: string | null,
): CloudAgentTarget | null {
  if (selectedAgentId === "docs") return "docs";
  if (selectedAgentId === "dev") return "code";
  if (selectedAgentId === "computer" || selectedAgentId === "agent") return "agent";
  if (chatMode === "code") return "code";
  if (chatMode === "deep-research") return "research";
  return null;
}

const COMMON = [
  "You are Megsy, an autonomous agent. Complete the task end to end without asking for permission.",
  "Reply in the exact same language and dialect the user wrote in.",
  "Never promise to do something later and never ask to continue — this is your only turn.",
  "Finish with the complete, polished result. No step logs, no internal notes.",
];

const BY_TARGET: Record<CloudAgentTarget, string[]> = {
  agent: [],
  research: [
    "This is a deep research task. Search the live web, open the real pages and cross-check the facts.",
    "Write a long, structured report in Markdown: summary, detailed sections with real numbers and dates, and a final `## Sources` list of full clickable URLs you actually opened.",
    "Say plainly which figures you could not verify instead of inventing them.",
  ],
  code: [
    "This is a software task. Write complete, working code — no placeholders, no TODOs.",
    "Save every file you produce so it can be downloaded, and also include the full code of the main files in your final answer inside fenced code blocks.",
    "Explain briefly how to run it at the end.",
  ],
  docs: [
    "This is a document task. Research anything you are unsure about, then write the full document.",
    "Save the finished document as a real downloadable file (.docx when it is prose, .xlsx when it is tabular, .pdf when a print layout is asked for) and also return the full text in your answer as clean Markdown with headings.",
  ],
};

/** Wraps the user's request with the expectations for that kind of work. */
export function buildCloudAgentPrompt(target: CloudAgentTarget, userText: string): string {
  return [...COMMON, ...BY_TARGET[target], "", `Task:\n${userText.trim()}`].join("\n");
}
