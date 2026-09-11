/** @doc Megsy Coder inline run — renders as a normal chat turn: thinking trace,
 *  short message, then a site preview card and a project files card (ZIP). */
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, FileCode, ExternalLink, Eye, Download } from "lucide-react";

import { runKimiCoder, type KimiEvent, type KimiFile, type KimiTodo } from "@/lib/kimiCoder";
import { Button } from "@/components/ui/button";
import ThinkingTrace from "@/components/chat/ThinkingTrace";
import ChatMessage from "@/components/chat/ChatMessage";
import { publishProject, withRuntimeShim } from "@/lib/publishProject";
import { buildReactRuntimeHtml, isReactProject } from "@/lib/buildReactRuntime";
import { toast } from "sonner";
import {
  extractProjectFiles,
  ensureProjectScaffold,
  buildProjectPreviewHtml,
  type ProjectFile,
} from "@/lib/extractProjectFiles";
import { extractPatchBlocks, applyPatchBlocks } from "@/lib/coderPatch";
import { downloadProjectZip, getCoderIntegrationStatus } from "@/lib/coderExport";
import { autoFixProjectFiles } from "@/lib/coderAutoFix";
import { detectRequiredIntegrations } from "@/lib/coderIntegrationDetect";
import {
  findAssetRequests,
  generateAssets,
  applyAssetsToFiles,
  stripUnresolvedTokens,
  estimateAssetCredits,
  generateCoderImage,
  generateCoderVideo,
  IMAGE_CREDITS,
  VIDEO_CREDITS,
  MAX_ASSETS_PER_RUN,
  type CoderAsset,
} from "@/lib/coderAssets";
import { saveCheckpoint, undoCheckpoint, listCheckpoints } from "@/lib/coderCheckpoints";
import { isArabicUI } from "@/pages/chat/components/aui/toolPresentation";

type BashLog = { command: string; output: string; ok: boolean };
type IntegrationReq = {
  kind: "github" | "supabase";
  reason: string;
  state: "pending" | "connected" | "skipped";
};

interface Props {
  runId: string;
  prompt: string;
  onClose: () => void;
  onFinish?: (files: KimiFile[], summary?: string) => void;
  /** Files from previous Coder run in the same thread — sent as edit context. */
  previousFiles?: KimiFile[];
  /** Prior conversation turns for continuity. */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  /** Hosted media the user attached to this turn — used inside the site. */
  attachments?: Array<{ url: string; name?: string; type?: string }>;
}

// Module-level cache so remounts of the parent don't re-fetch or abort the SSE run.
type RunEntry = {
  events: KimiEvent[];
  subs: Set<(ev: KimiEvent) => void>;
  finished: boolean;
  controller: AbortController;
};
const CODER_RUNS = new Map<string, RunEntry>();

function collectFilesFromEvents(events: KimiEvent[]): KimiFile[] {
  const merged = new Map<string, string>();
  const text = events
    .filter((ev): ev is Extract<KimiEvent, { type: "text" }> => ev.type === "text")
    .map((ev) => ev.text)
    .join("\n\n");
  for (const file of extractProjectFiles(text)) merged.set(file.path, file.content);
  for (const ev of events) {
    if (ev.type === "file") merged.set(ev.path, ev.content);
    if (ev.type === "done") for (const file of ev.files || []) merged.set(file.path, file.content);
  }
  return Array.from(merged.entries()).map(([path, content]) => ({ path, content }));
}

function subscribeCoderRun(
  runId: string,
  prompt: string,
  onEvent: (ev: KimiEvent) => void,
  opts?: {
    previousFiles?: KimiFile[];
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    attachments?: Array<{ url: string; name?: string; type?: string }>;
  },
): () => void {
  let entry = CODER_RUNS.get(runId);
  if (!entry) {
    const controller = new AbortController();
    const nextEntry: RunEntry = { events: [], subs: new Set(), finished: false, controller };
    const emit = (ev: KimiEvent) => {
      nextEntry.events.push(ev);
      if (ev.type === "done" || ev.type === "error") nextEntry.finished = true;
      nextEntry.subs.forEach((s) => {
        try {
          s(ev);
        } catch {
          /* ignore */
        }
      });
    };
    entry = nextEntry;
    CODER_RUNS.set(runId, nextEntry);
    runKimiCoder({
      prompt,
      history: opts?.history,
      contextFiles: opts?.previousFiles,
      attachments: opts?.attachments,
      signal: controller.signal,
      onEvent: emit,
    })
      .then(() => {
        if (nextEntry.finished || controller.signal.aborted) return;
        const files = collectFilesFromEvents(nextEntry.events);
        if (files.length > 0) {
          emit({ type: "done", files, summary: "Project generated." });
        } else {
          emit({
            type: "error",
            error: "The connection ended before the project finished generating. Please try again.",
          });
        }
      })
      .catch((e) => {
        const ev: KimiEvent = { type: "error", error: e?.message || "network error" };
        emit(ev);
      });
  }

  for (const ev of entry.events) {
    try {
      onEvent(ev);
    } catch {
      /* ignore */
    }
  }
  entry.subs.add(onEvent);
  const activeEntry = entry;
  return () => {
    activeEntry.subs.delete(onEvent);
  };
}

function abortCoderRun(runId: string) {
  const entry = CODER_RUNS.get(runId);
  if (!entry) return;
  try {
    entry.controller.abort();
  } catch {
    /* ignore */
  }
  CODER_RUNS.delete(runId);
}

/** Signal for the run's fetch, so paid asset jobs stop when the user stops. */
function coderRunSignal(runId: string): AbortSignal | undefined {
  return CODER_RUNS.get(runId)?.controller.signal;
}

export default function InlineCoderRun({
  runId,
  prompt,
  onClose,
  onFinish,
  previousFiles,
  history,
  attachments,
}: Props) {
  const instId = useRef(Math.random().toString(36).slice(2, 6)).current;
  const [todos, setTodos] = useState<KimiTodo[]>([]);
  const [files, setFiles] = useState<Map<string, string>>(new Map());
  const [bash, setBash] = useState<BashLog[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationReq[]>([]);
  const [status, setStatus] = useState<"running" | "done" | "error">("running");
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const ar = isArabicUI();
  const [assets, setAssets] = useState<CoderAsset[]>([]);
  const [assetPhase, setAssetPhase] = useState<"idle" | "running" | "done">("idle");
  /** Human-readable activity lines shown inside the thinking trace. */
  const [steps, setSteps] = useState<string[]>([]);
  const stepsRef = useRef<string[]>([]);
  const pushStep = (line: string) => {
    const v = line.trim();
    if (!v || stepsRef.current.includes(v)) return;
    stepsRef.current = [...stepsRef.current, v].slice(-60);
    setSteps(stepsRef.current);
  };

  // Collapsed by default: the build reads as a normal chat turn, and the
  // files/terminal detail is one tap away for anyone who wants it.
  const [collapsed, setCollapsed] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [connecting, setConnecting] = useState<"github" | "supabase" | null>(null);
  const checkpointId = `run:${runId}`;
  const finished = useRef(false);
  const filesRef = useRef<Map<string, string>>(new Map());
  const notesRef = useRef("");
  const integStatusRef = useRef<{ github: boolean; supabase: boolean }>({
    github: false,
    supabase: false,
  });

  const mergeProjectFiles = (projectFiles: ProjectFile[]) => {
    if (projectFiles.length === 0) return;
    setFiles((prev) => {
      const next = new Map(prev);
      for (const file of projectFiles) {
        if (!prev.has(file.path)) pushStep(`${ar ? "إنشاء" : "Creating"} ${file.path}`);
        else if (prev.get(file.path) !== file.content)
          pushStep(`${ar ? "تعديل" : "Editing"} ${file.path}`);
        next.set(file.path, file.content);
      }
      filesRef.current = next;
      return next;
    });
    setSelectedFile((cur) => cur ?? projectFiles[0]?.path ?? null);
  };

  /**
   * Finish a run: resolve every media placeholder into a real generated asset,
   * inject the hosted URLs into the project, then hand the final files back to
   * the chat. Without this step the model's images never make it into the site.
   */
  const assetsRef = useRef<CoderAsset[]>([]);
  const completeRun = async (scaffolded: ProjectFile[], summary?: string) => {
    // A "done" event carrying zero files is a failed build, not a finished one.
    // Marking it done showed users an empty "Done - 0 files" card with no reason.
    if (scaffolded.length === 0) {
      setStatus("error");
      setError("The build finished without producing any files. Please try again.");
      return;
    }
    addIntegrations(detectRequiredIntegrations(prompt, scaffolded));
    mergeProjectFiles(scaffolded);
    setStatus("done");

    let final = scaffolded;
    const allRequests = findAssetRequests(scaffolded, prompt.slice(0, 60));
    // Hard cap: a huge gallery prompt could otherwise queue dozens of paid
    // generations. Everything past the cap falls back to a neutral placeholder.
    const requests = allRequests.slice(0, MAX_ASSETS_PER_RUN);
    if (allRequests.length > requests.length) {
      toast.message(
        `Generating the first ${requests.length} of ${allRequests.length} media items to keep the cost predictable.`,
      );
    }
    if (requests.length > 0) {
      setAssetPhase("running");
      pushStep(ar ? "توليد صور الموقع" : "Generating site media");
      const pending: CoderAsset[] = requests.map((r) => ({
        ...r,
        status: "pending",
        credits: r.kind === "video" ? VIDEO_CREDITS : IMAGE_CREDITS,
      }));
      assetsRef.current = pending;
      setAssets(pending);
      const done = await generateAssets(
        requests,
        (a) => {
          assetsRef.current = assetsRef.current.map((x) => (x.id === a.id ? a : x));
          setAssets(assetsRef.current);
        },
        coderRunSignal(runId),
      );
      final = stripUnresolvedTokens(applyAssetsToFiles(scaffolded, done));
      mergeProjectFiles(final);
      setAssetPhase("done");
      const ok = done.filter((a) => a.status === "done");
      if (ok.length > 0) {
        toast.success(
          `${ok.length} media asset${ok.length > 1 ? "s" : ""} added · ${estimateAssetCredits(ok)} credits`,
        );
      }
      const failed = done.length - ok.length;
      if (failed > 0)
        toast.error(`${failed} asset${failed > 1 ? "s" : ""} failed — you can regenerate them`);
    } else {
      final = stripUnresolvedTokens(scaffolded);
      if (final !== scaffolded) mergeProjectFiles(final);
    }

    // Snapshot the finished project so manual Studio edits are always undoable.
    try {
      saveCheckpoint(checkpointId, final, "generated");
      setCanUndo(listCheckpoints(checkpointId).length > 1);
    } catch {
      /* storage full — undo is best-effort */
    }

    onFinish?.(
      final.map(({ path, content }) => ({ path, content })),
      summary,
    );

    // Silent, internal-only backup of the produced project. Never surfaced in
    // the UI and never allowed to affect the run's outcome.
    void supabase.functions
      .invoke("coder-store", {
        body: {
          run_id: runId,
          message: prompt.slice(0, 80),
          files: final.map(({ path, content }) => ({ path, content })),
        },
      })
      .catch(() => undefined);
  };


  /** Regenerate a single asset and re-inject it across the project. */
  const regenerateAsset = async (id: string) => {
    const target = assetsRef.current.find((a) => a.id === id);
    if (!target) return;
    const update = (next: CoderAsset) => {
      assetsRef.current = assetsRef.current.map((x) => (x.id === id ? next : x));
      setAssets(assetsRef.current);
    };
    update({ ...target, status: "running", error: undefined });
    try {
      const url =
        target.kind === "video"
          ? await generateCoderVideo(target.prompt)
          : await generateCoderImage(target.prompt);
      const done: CoderAsset = { ...target, status: "done", url };
      update(done);
      const current = Array.from(filesRef.current.entries()).map(([path, content]) => ({
        path,
        content,
        lang: (path.split(".").pop() || "txt").toLowerCase(),
      }));
      // Swap the old URL (already injected) as well as the original token.
      const withOld: CoderAsset = {
        ...done,
        tokens: [...target.tokens, ...(target.url ? [target.url] : [])],
      };
      mergeProjectFiles(applyAssetsToFiles(current, [withOld]));
      toast.success(`Regenerated · ${done.credits} credits`);
    } catch (e) {
      update({ ...target, status: "error", error: e instanceof Error ? e.message : "failed" });
      toast.error("Regeneration failed");
    }
  };

  /** Merge backend-emitted and locally-detected integration needs (no duplicates). */
  const addIntegrations = (reqs: { kind: "github" | "supabase"; reason: string }[]) => {
    if (reqs.length === 0) return;
    setIntegrations((prev) => {
      const next = [...prev];
      for (const r of reqs) {
        if (next.some((p) => p.kind === r.kind)) continue;
        next.push({ ...r, state: integStatusRef.current[r.kind] ? "connected" : "pending" });
      }
      return next;
    });
    void getCoderIntegrationStatus()
      .then((s) => {
        integStatusRef.current = { github: s.github, supabase: s.supabase };
        setIntegrations((prev) =>
          prev.map((p) => (s[p.kind] && p.state === "pending" ? { ...p, state: "connected" } : p)),
        );
      })
      .catch(() => {});
  };

  const appliedPatchesRef = useRef<Set<string>>(new Set());
  const applyPatchesFromNotes = (raw: string) => {
    const patches = extractPatchBlocks(raw);
    if (patches.length === 0) return;
    const fresh = patches.filter((p) => {
      const key = `${p.path}::${p.search.length}::${p.search.slice(0, 40)}`;
      if (appliedPatchesRef.current.has(key)) return false;
      appliedPatchesRef.current.add(key);
      return true;
    });
    if (fresh.length === 0) return;
    const current = Array.from(filesRef.current.entries()).map(([path, content]) => ({
      path,
      content,
      lang: (path.split(".").pop() || "txt").toLowerCase(),
    }));
    const { files: patched } = applyPatchBlocks(current, fresh);
    mergeProjectFiles(patched);
  };

  // Seed with the previous run's files so a follow-up turn edits the existing
  // project instead of shrinking it to whatever the model re-emitted.
  useEffect(() => {
    if (!previousFiles?.length) return;
    setFiles((prev) => {
      if (prev.size > 0) return prev;
      const next = new Map(prev);
      for (const f of previousFiles) next.set(f.path, f.content);
      filesRef.current = next;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  // Watchdog: if the stream goes silent after producing files (dropped SSE tail,
  // worker timeout), finalize instead of showing "Building…" forever.
  const lastEventRef = useRef(Date.now());
  const sawEventRef = useRef(false);
  const finalizeFromRef = (summary?: string) => {
    if (finished.current || filesRef.current.size === 0) return false;
    finished.current = true;
    const scaffolded = ensureProjectScaffold(
      autoFixProjectFiles(
        Array.from(filesRef.current.entries()).map(([path, content]) => ({
          path,
          content,
          lang: (path.split(".").pop() || "txt").toLowerCase(),
        })),
      ),
    );
    void completeRun(scaffolded, summary ?? notesRef.current.slice(0, 500));
    return true;
  };

  useEffect(() => {
    lastEventRef.current = Date.now();
    sawEventRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => {
      const idle = Date.now() - lastEventRef.current;
      // Never finalize a run that hasn't emitted anything yet — the model may
      // still be thinking. Only give up (with a clear error) after 3 minutes.
      if (!sawEventRef.current) {
        if (idle > 180_000 && !finished.current) {
          finished.current = true;
          setStatus("error");
          setError("The build didn't start — the connection timed out. Please try again.");
        }
        return;
      }
      if (idle > 45_000) {
        if (finalizeFromRef()) return;
        // Stream went silent without producing a single file: stop pretending
        // we're still building.
        if (idle > 90_000 && !finished.current) {
          finished.current = true;
          setStatus("error");
          setError("The build stopped before producing any files. Please try again.");
        }
      }
    }, 5_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    const unsub = subscribeCoderRun(
      runId,
      prompt,
      (ev: KimiEvent) => {
        lastEventRef.current = Date.now();
        sawEventRef.current = true;
        if (ev.type === "todo") {
          setTodos(ev.todos);
          for (const t of ev.todos) pushStep(t.title);
        } else if (ev.type === "text") {
          const next = `${notesRef.current}${notesRef.current && ev.text ? "\n\n" : ""}${ev.text || ""}`;
          notesRef.current = next;
          setNotes(next);
          mergeProjectFiles(extractProjectFiles(next));
          applyPatchesFromNotes(next);
        } else if (ev.type === "file") {
          setFiles((prev) => {
            const next = new Map(prev);
            if (!prev.has(ev.path)) pushStep(`${ar ? "إنشاء" : "Creating"} ${ev.path}`);
            else if (prev.get(ev.path) !== ev.content)
              pushStep(`${ar ? "تعديل" : "Editing"} ${ev.path}`);
            next.set(ev.path, ev.content);
            filesRef.current = next;
            return next;
          });
          setSelectedFile((cur) => cur ?? ev.path);
        } else if (ev.type === "bash") {
          pushStep(`$ ${ev.command}`);
          setBash((prev) => [...prev, { command: ev.command, output: ev.output, ok: ev.ok }]);
        } else if (ev.type === "integration") {
          setIntegrations((prev) => {
            if (prev.find((p) => p.kind === ev.kind)) return prev;
            const preState = integStatusRef.current[ev.kind] ? "connected" : "pending";
            return [...prev, { kind: ev.kind, reason: ev.reason, state: preState }];
          });
          getCoderIntegrationStatus()
            .then((s) => {
              integStatusRef.current = { github: s.github, supabase: s.supabase };
              if ((ev.kind === "github" && s.github) || (ev.kind === "supabase" && s.supabase)) {
                setIntegrations((prev) =>
                  prev.map((p) => (p.kind === ev.kind ? { ...p, state: "connected" } : p)),
                );
              }
            })
            .catch(() => {});
        } else if (ev.type === "done") {
          if (finished.current) return;
          finished.current = true;
          // Merge (never replace): late-parsed files, streamed `file` events,
          // patched files and the backend's own file list all contribute.
          mergeProjectFiles(extractProjectFiles(notesRef.current));
          applyPatchesFromNotes(notesRef.current);
          const merged = new Map(filesRef.current);
          for (const f of ev.files || []) if (f?.path) merged.set(f.path, f.content ?? "");
          filesRef.current = merged;
          const scaffolded = ensureProjectScaffold(
            autoFixProjectFiles(
              Array.from(merged.entries()).map(([path, content]) => ({
                path,
                content,
                lang: (path.split(".").pop() || "txt").toLowerCase(),
              })),
            ),
          );
          void completeRun(scaffolded, ev.summary || notesRef.current.slice(0, 500));
        } else if (ev.type === "error") {
          if (finished.current) return;
          // Fallback: if the stream errored/closed but we already have files,
          // treat as done so the user can preview/publish/download.
          if (finalizeFromRef()) return;
          setStatus("error");
          setError(ev.error);
        }
      },
      { previousFiles, history, attachments },
    );

    return () => {
      unsub();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);
  // Pre-warm integration status once so integration cards render without a "pending" flash.
  useEffect(() => {
    getCoderIntegrationStatus()
      .then((s) => {
        integStatusRef.current = { github: s.github, supabase: s.supabase };
      })
      .catch(() => {});
  }, []);

  const doneCount = todos.filter((t) => t.done).length;
  const fileList = useMemo(() => Array.from(files.keys()).sort(), [files]);
  const runningLabel =
    todos.length > 0
      ? `Building… ${doneCount}/${todos.length} · ${files.size} files`
      : files.size > 0
        ? `Building… finalizing · ${files.size} files`
        : "Building… preparing";

  const projectFiles = useMemo<ProjectFile[]>(
    () =>
      Array.from(files.entries()).map(([path, content]) => ({
        path,
        content,
        lang: (path.split(".").pop() || "txt").toLowerCase(),
      })),
    [files],
  );

  const copyAllFiles = async () => {
    if (projectFiles.length === 0) return toast.error("No files yet");
    await navigator.clipboard.writeText(
      projectFiles.map((f) => `--- ${f.path} ---\n${f.content}`).join("\n\n"),
    );
    toast.success("Files copied");
  };

  const downloadProjectJson = () => {
    if (projectFiles.length === 0) return toast.error("No files yet");
    const blob = new Blob([JSON.stringify(projectFiles, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "megsy-coder-project.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreview = async () => {
    if (projectFiles.length === 0) {
      toast.error("No files yet");
      return;
    }
    setPublishing(true);
    try {
      const { url, id, degraded } = await publishProject(projectFiles, {
        title: prompt.slice(0, 60),
        prompt,
        siteId: publishedId ?? undefined,
      });
      setPublishedId(id);
      try {
        await navigator.clipboard.writeText(url);
        toast.success(
          degraded ? "Published as source view — link copied" : "Published — link copied",
          {
            description: degraded
              ? `${url} · this project can\u2019t run standalone, so the page shows its source files.`
              : url,
          },
        );
      } catch {
        toast.success("Published", { description: url });
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      const msg = e?.message || "Publish failed";
      if (/sign in/i.test(msg)) {
        toast.error("Sign in to publish", {
          description: "Publishing saves your project so anyone with the link can view it.",
          action: {
            label: "Sign in",
            onClick: () => {
              window.location.href = "/auth";
            },
          },
        });
      } else {
        toast.error(msg);
      }
    } finally {
      setPublishing(false);
    }
  };

  /** Roll the project back to the previous saved snapshot. */
  const handleUndo = () => {
    const prev = undoCheckpoint(checkpointId);
    if (!prev) {
      toast.info("No previous version to restore");
      setCanUndo(false);
      return;
    }
    const next = new Map<string, string>();
    for (const f of prev.files) next.set(f.path, f.content);
    filesRef.current = next;
    setFiles(next);
    setCanUndo(listCheckpoints(checkpointId).length > 1);
    onFinish?.(prev.files.map(({ path, content }) => ({ path, content })));
    toast.success("Reverted to the previous version");
  };

  // ── Chat-native rendering ────────────────────────────────────────────────
  // A build reads like a normal turn: a short message, the same thinking trace
  // used everywhere else, then a preview card and a files card.
  // Code never reaches the chat surface: fenced blocks, patch blocks and any
  // line that reads like source are stripped from both the message and the
  // thinking trace, so the user only ever sees plain explanation + cards.
  const stripCode = (input: string) =>
    input
      .replace(/```[\s\S]*?```/g, "")
      .replace(/```[\s\S]*$/g, "")
      .replace(/<{5,}[\s\S]*?>{5,}/g, "")
      .replace(/^\s*[-*]\s+\[( |x|X)\]\s+.*$/gm, "")
      .replace(
        /^\s*(import |export |const |let |var |function |class |return |<\/?[a-zA-Z][^>]*>|\}|\{|#include|def |@|\.[a-zA-Z-]+\s*\{|[a-zA-Z-]+:\s*[^ ]+;).*$/gm,
        "",
      )
      .replace(/`([^`]*)`/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const prose = useMemo(() => stripCode(notes).slice(0, 1200), [notes]);
  const traceText = useMemo(() => stripCode(notes), [notes]);


  const previewHtml = useMemo(() => {
    if (status !== "done" || projectFiles.length === 0) return "";
    try {
      const html =
        buildProjectPreviewHtml(projectFiles) ||
        (isReactProject(projectFiles) ? buildReactRuntimeHtml(projectFiles, "Preview") : "") ||
        "";
      return html ? withRuntimeShim(html) : "";
    } catch {
      return "";
    }
  }, [status, projectFiles]);

  return (
    <div className="my-3 w-full min-w-0">
      <ThinkingTrace
        variant="tools"
        active={status === "running"}
        running={status === "running"}
        tool="code"
        status={status === "running" ? runningLabel : undefined}
        steps={steps}
        text={traceText}
      />

      {prose && <ChatMessage role="assistant" content={prose} />}

      {status === "error" && (
        <div className="my-2 max-w-[640px] rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-[12.5px] leading-relaxed text-destructive">
          {error}
        </div>
      )}

      {status === "running" && (
        <button
          type="button"
          onClick={() => {
            finished.current = true;
            abortCoderRun(runId);
            setStatus("error");
            setError(ar ? "تم إيقاف البناء." : "Build stopped.");
            onClose();
          }}
          className="mt-1 text-[12px] text-muted-foreground underline-offset-2 hover:underline"
        >
          {ar ? "إيقاف" : "Stop"}
        </button>
      )}

      {status === "done" && projectFiles.length > 0 && (
        <div className="mt-3 max-w-[640px] space-y-2.5">
          {/* Preview card */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur">
            <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Eye className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 truncate text-[12.5px] font-medium text-foreground">
                {ar ? "معاينة الموقع" : "Site preview"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 rounded-xl text-xs"
                disabled={publishing}
                onClick={handlePreview}
              >
                {publishing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5" />
                )}
                {publishing
                  ? ar
                    ? "جارٍ النشر…"
                    : "Publishing…"
                  : publishedId
                    ? ar
                      ? "تحديث الرابط"
                      : "Update link"
                    : ar
                      ? "فتح برابط"
                      : "Open link"}
              </Button>
            </div>
            {previewHtml ? (
              <iframe
                title={ar ? "معاينة الموقع" : "Site preview"}
                srcDoc={previewHtml}
                sandbox="allow-scripts allow-forms allow-popups"
                className="h-[360px] w-full border-0 bg-background"
              />
            ) : (
              <div className="px-3 py-8 text-center text-[12.5px] text-muted-foreground">
                {ar
                  ? "هذا المشروع لا يمكن معاينته مباشرة."
                  : "This project can’t be previewed inline."}
              </div>
            )}
          </div>

          {/* Files card */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur">
            <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <FileCode className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 truncate text-[12.5px] font-medium text-foreground">
                {ar
                  ? `ملفات الموقع · ${projectFiles.length}`
                  : `Project files · ${projectFiles.length}`}
              </span>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 gap-1 rounded-xl text-xs"
                onClick={() => downloadProjectZip(projectFiles)}
              >
                <Download className="h-3.5 w-3.5" />
                ZIP
              </Button>
            </div>
            <ul className="max-h-56 divide-y divide-border/40 overflow-y-auto">
              {fileList.map((path) => (
                <li
                  key={path}
                  className="truncate px-3 py-1.5 font-mono text-[11.5px] text-muted-foreground"
                  dir="ltr"
                >
                  {path}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
