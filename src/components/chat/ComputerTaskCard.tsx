/**
 * @doc Silent in-chat surface for a Computer Agent task.
 *
 * Deliberately chrome-less: while the computer works it is a single quiet
 * progress line — no labels, no icons, no buttons. The narration lives in the
 * thinking trace above it, so this surface only carries what the task actually
 * produced (text + files) once it is finished.
 */
import { useEffect, useRef, useState } from "react";
import {
  computerErrorMessage,
  pollComputerTask,
  stopComputerTask,
  type ComputerTask,
  type ComputerEvent,
} from "@/lib/computer/client";
import AgentTrace from "@/components/chat/AgentTrace";
import ChatMessage from "@/components/chat/ChatMessage";
import FilePreviewDialog, { type PreviewFile } from "@/components/chat/FilePreviewDialog";


import { clearActiveComputerRun, setActiveComputerRun } from "@/lib/computer/activeRun";
import { clearComputerLiveView, setComputerLiveView } from "@/lib/computer/liveView";


interface Props {
  taskId: string;
}

const POLL_MS = 3000;
const TASK_TIMEOUT_MS = 45 * 60 * 1000;


export default function ComputerTaskCard({ taskId }: Props) {
  const [task, setTask] = useState<ComputerTask | null>(null);
  const [events, setEvents] = useState<ComputerEvent[]>([]);
  const [timedOut, setTimedOut] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [preview, setPreview] = useState<PreviewFile | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => {
    let cancelled = false;
    const deadline = Date.now() + TASK_TIMEOUT_MS;

    const tick = async () => {
      try {
        if (Date.now() >= deadline) {
          setTimedOut(true);
          clearActiveComputerRun(taskId);
          await stopComputerTask(taskId).catch(() => undefined);
          return;
        }
        const res = await pollComputerTask(taskId);
        if (cancelled) return;
        setTask(res.task);
        setLoaded(true);
        setEvents(res.events ?? []);
        const finished = res.task.status === "done" || res.task.status === "failed";
        // A task the provider stopped reporting on (page closed, provider drop)
        // must never keep the composer locked: after 10 quiet minutes it is
        // treated as abandoned so the user can send again immediately.
        const last = Date.parse(res.task.updated_at || res.task.created_at || "") || 0;
        const stale = last > 0 && Date.now() - last > 10 * 60 * 1000;
        if (finished || stale) {
          clearActiveComputerRun(taskId);
          if (stale && !finished) {
            setTimedOut(true);
            await stopComputerTask(taskId).catch(() => undefined);
          }
        } else {
          setActiveComputerRun(taskId);
          timer.current = setTimeout(tick, POLL_MS);
        }
      } catch {
        // Never leave the send button stuck as a stop button on a broken poll.
        clearActiveComputerRun(taskId);
        if (!cancelled) timer.current = setTimeout(tick, POLL_MS * 2);
      }

    };
    void tick();

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      clearActiveComputerRun(taskId);
    };
  }, [taskId]);

  // Until the first poll answers we know nothing: never claim the agent is
  // working, so a finished conversation opens straight on its result.
  const running =
    !timedOut &&
    loaded &&
    (task?.status === "pending" || task?.status === "running" || task?.status === "paused");
  const files = task?.files ?? [];

  const liveUrl = task?.live_url ? `${task.live_url}${task.live_url.includes("?") ? "&" : "?"}view_only=true` : null;

  // While it works the screen lives inside the composer dock, not in the chat.
  useEffect(() => {
    if (!running) {
      clearComputerLiveView(taskId);
      return;
    }
    setComputerLiveView({
      id: taskId,
      url: liveUrl,
      poster: null,
      status: task?.progress || events.at(-1)?.title || "",
      active: true,
    });
  }, [running, liveUrl, taskId, task?.progress, events]);
  useEffect(() => () => clearComputerLiveView(taskId), [taskId]);

  // Coding runs keep the computer screen hidden until the user asks for it.
  const isCoding = /\b(code|coding|website|landing page|app|build|html|css|react)\b|كود|برمج|موقع|صفحة هبوط|تطبيق/i.test(
    task?.prompt || "",
  );

  const trace = (
    <AgentTrace
      events={events}
      running={running}
      status={task?.progress || events.at(-1)?.title || ""}
      startedAt={task?.created_at ?? events[0]?.created_at ?? null}
      endedAt={running ? null : (task?.updated_at ?? events.at(-1)?.created_at ?? null)}
      liveUrl={liveUrl}
      screenDefaultOpen={!isCoding}
    />
  );


  if (!loaded) return null;

  if (running) {
    return <div className="my-4 flex w-full flex-col">{trace}</div>;
  }

  if (timedOut || task?.status === "failed") {
    const reason =
      (timedOut ? "المهمة استغرقت وقتًا أطول من المتوقع وتم إيقافها." : "") ||
      computerErrorMessage(task?.error) ||
      (task?.result_text || "").trim() ||
      "المهمة على الكمبيوتر اتوقفت قبل ما تخلص. جرّب تبعتها تاني بصيغة أوضح.";
    return (
      <div className="my-4 space-y-4">
        {trace}
        <p className="text-[13px] leading-relaxed text-destructive">{reason}</p>
      </div>
    );
  }

  if (!task?.result_text && files.length === 0) {
    return (
      <div className="my-4 space-y-4">
        {trace}
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          المهمة خلصت من غير نتيجة مكتوبة.
        </p>
      </div>
    );
  }

  const htmlFile = files.find((f) => /\.html?$/i.test(f.name));

  /** Runs the produced code inside the app: CSS/JS are inlined into the page. */
  const runPreview = async () => {
    if (!htmlFile) return;
    try {
      const texts = await Promise.all(
        files.map(async (f) => ({ name: f.name, text: await fetch(f.url).then((r) => r.text()) })),
      );
      let html = texts.find((t) => t.name === htmlFile.name)?.text ?? "";
      for (const t of texts) {
        if (/\.css$/i.test(t.name)) {
          html = html.replace(
            new RegExp(`<link[^>]*${t.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*>`, "i"),
            `<style>\n${t.text}\n</style>`,
          );
        } else if (/\.js$/i.test(t.name)) {
          html = html.replace(
            new RegExp(`<script[^>]*${t.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*>\\s*</script>`, "i"),
            `<script>\n${t.text}\n</script>`,
          );
        }
      }
      const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
      setPreview({ url, name: htmlFile.name, type: "text/html" });
    } catch {
      setPreview({ url: htmlFile.url, name: htmlFile.name, type: "text/html" });
    }
  };

  const fileGrid =
    files.length > 0 ? (
      <div className="mt-3 space-y-2.5">
        {htmlFile ? (
          <button
            type="button"
            onClick={() => void runPreview()}
            className="w-full rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary/15"
          >
            تشغيل المعاينة
          </button>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        {files.map((f) => {
          const isImage =
            /\.(png|jpe?g|webp|gif|avif)$/i.test(f.url) || !!f.type?.startsWith("image/");
          const isVideo = /\.(mp4|webm|mov)$/i.test(f.url) || !!f.type?.startsWith("video/");
          const ext = (f.name.split(".").pop() || "file").toLowerCase().slice(0, 4);
          return (
            <button
              key={f.url}
              type="button"
              onClick={() => setPreview({ url: f.url, name: f.name, type: f.type })}
              title={f.name}
              className="group flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-border/50 bg-foreground/[0.03] p-3 text-start transition-colors hover:bg-foreground/[0.07]"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/10">
                {isImage ? (
                  <img src={f.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : isVideo ? (
                  <span className="text-[10px] font-semibold uppercase text-primary">vid</span>
                ) : (
                  <span className="text-[11px] font-semibold uppercase text-primary">{ext}</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-foreground">
                  {f.name}
                </span>
                <span className="block text-[11.5px] text-muted-foreground">
                  اضغط للمعاينة
                </span>
              </span>
            </button>
          );
        })}
        </div>
      </div>
    ) : null;


  return (
    <div className="my-4 space-y-4">
      {trace}

      {task?.result_text ? (
        <ChatMessage role="assistant" content={task.result_text} bottomSlot={fileGrid} />
      ) : (
        fileGrid
      )}

      <FilePreviewDialog file={preview} onClose={() => setPreview(null)} />
    </div>
  );
}


