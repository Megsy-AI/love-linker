/**
 * @doc Cloud-VM-free fallback for website/app requests.
 *
 * When no cloud build machine is available (no Freestyle key configured, or the
 * provider is down), the site is still produced: the model writes a complete
 * self-contained project, which is compiled and published to `generated_sites`
 * so the user gets a real, shareable live link at `/s/<slug>`.
 */
import { streamChat } from "@/lib/streamChat";
import { extractProjectFiles, type ProjectFile } from "@/lib/extractProjectFiles";
import { publishProject } from "@/lib/publishProject";

const SYSTEM = `You are a senior front-end engineer shipping a production-quality site.
Return the full project as fenced code blocks, each fence labelled with its file path, e.g. \`\`\`html index.html.
Rules:
- Always include a root index.html that runs standalone with no build step.
- Inline or CDN-only dependencies (Tailwind CDN and Google Fonts are fine). No local asset files, no imports of .tsx/.ts modules.
- Real finished copy in the user's language — never lorem ipsum, never TODO.
- Responsive, accessible, dark-mode friendly, with a deliberate visual identity that fits the brief.
- No commentary outside the code fences.`;

export interface LocalSiteResult {
  url: string;
  files: ProjectFile[];
  degraded?: boolean;
}

/** True when the failure means "no cloud build machine", not a user error. */
export function isInfraCapacityError(message: string): boolean {
  return /freestyle|no active .*key|no build machine|vm .*(unavailable|failed)|capacity/i.test(
    message || "",
  );
}

export async function buildSiteWithoutVm(
  prompt: string,
  onProgress?: (line: string) => void,
): Promise<LocalSiteResult> {
  onProgress?.("Writing the project files…");
  let text = "";
  let failure: string | null = null;

  await streamChat({
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: prompt.slice(0, 6000) },
    ] as any,
    tier: "pro",
    onDelta: (d) => {
      text += d;
    },
    onDone: () => undefined,
    onError: (e) => {
      failure = e;
    },
  });

  if (!text.trim()) throw new Error(failure || "The builder returned no code");

  let files = extractProjectFiles(text);
  if (!files.some((f) => /^index\.html?$/i.test(f.path))) {
    // A single unlabelled HTML document is the most common shape — recover it.
    const start = text.search(/<!DOCTYPE html|<html[\s>]/i);
    if (start >= 0) {
      const raw = text.slice(start).replace(/```[\s\S]*$/, "").trim();
      files = [{ path: "index.html", lang: "html", content: raw }, ...files.filter((f) => !/\.html?$/i.test(f.path))];
    }
  }
  if (!files.length) throw new Error("The builder produced no usable files");

  onProgress?.("Publishing the live preview…");
  const published = await publishProject(files, {
    title: prompt.slice(0, 60) || "Megsy site",
    prompt,
  });
  return { url: published.url, files, degraded: published.degraded };
}
