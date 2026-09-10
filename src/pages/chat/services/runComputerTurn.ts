/** @doc Chat turn handler that runs a request on the Computer Agent and renders
 * a live run card. The turn is split into clearly separate stages:
 *   1. a model-written intro saying what it is about to do,
 *   2. a short model-written step plan,
 *   3. the live run (screen + steps),
 *   4. a model-written wrap-up (rendered by the run card).
 */
import { toast } from "sonner";
import { stripComputerMention } from "@/lib/computer/shouldUseComputer";
import type { Message, ToolPart } from "../chatConstants";
import { PENDING_COMPUTER_RUN } from "@/lib/computer/activeRun";

export interface RunComputerArgs {
  text: string;
  userMsg: Message;
  localTurnId: string;
  attachments?: string[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setInput: (v: string) => void;
  setAttachedFiles: (v: any[]) => void;
  createOrUpdateConversation: (title: string) => Promise<string | null>;
  saveMessage: (
    cid: string,
    role: string,
    content: string,
    modelId?: any,
    meta?: any,
  ) => Promise<string | undefined>;
  ownInsertedIdsRef: React.MutableRefObject<Set<string>>;
}

export async function runComputerTurn({
  text,
  userMsg,
  localTurnId,
  attachments,
  setMessages,
  setInput,
  setAttachedFiles,
  createOrUpdateConversation,
  saveMessage,
  ownInsertedIdsRef,
}: RunComputerArgs) {
  const prompt = stripComputerMention(text);
  const assistantClientId = `assistant-${localTurnId}`;

  const computerTool: ToolPart = {
    id: `computer-${localTurnId}`,
    name: "megsy_computer",
    appSlug: "computer",
    target: prompt || text,
    state: "running",
  };

  setMessages((prev) => [
    ...prev,
    userMsg,
    { role: "assistant", content: "", clientId: assistantClientId, toolParts: [computerTool] },
  ]);
  setInput("");
  setAttachedFiles([]);

  // Flip the composer's send button into a stop button right away — the turn
  // is already in flight before the provider hands back a run id.
  const { setActiveComputerRun, clearActiveComputerRun } = await import(
    "@/lib/computer/activeRun"
  );
  setActiveComputerRun(PENDING_COMPUTER_RUN);

  try {
    const cid = await createOrUpdateConversation(prompt || "Computer task");
    if (cid) {
      const userMessageId = await saveMessage(cid, "user", userMsg.content);
      if (userMessageId) ownInsertedIdsRef.current.add(userMessageId);
    }

    // Start the durable Browser Use task immediately. Narration is generated in
    // parallel, so the user never waits through two extra model calls before
    // the real work begins.
    const { createComputerTask, computerErrorMessage } = await import("@/lib/computer/client");
    const taskPromise = createComputerTask({
      prompt,
      conversation_id: cid,
      attachments,
    });

    // Model-written intro streamed into the assistant bubble and never removed.
    let intro = "";
    const introPromise = (async () => {
      try {
        const { generateTurnPreamble } = await import("./turnPreamble");
        await generateTurnPreamble({
          kind: "computer",
          userText: prompt || text,
          conversationId: cid,
          onDelta: (delta) => {
            intro += delta;
            setMessages((prev) =>
              prev.map((m) => (m.clientId === assistantClientId ? { ...m, content: intro } : m)),
            );
          },
        });
      } catch {
        /* the task has already started; narration is optional */
      }
    })();

    // A short plan is also prepared while the task is starting.
    let plan: string[] = [];
    const planPromise = (async () => {
      try {
        const { generateRunPlan } = await import("@/lib/computer/narration");
        plan = await generateRunPlan(prompt || text, cid);
        if (plan.length) {
          setMessages((prev) =>
            prev.map((m) =>
              m.clientId === assistantClientId ? { ...m, computerPlan: plan } : m,
            ),
          );
        }
      } catch {
        /* the live provider events are sufficient */
      }
    })();

    try {
      const task = await taskPromise;
      if (!task?.task_id || task.status === "failed") {
        throw new Error(
          computerErrorMessage(task?.error, task?.message) ||
            "تعذّر بدء المهمة على الكمبيوتر. حاول تاني.",
        );
      }
      setActiveComputerRun(task.task_id);
      await Promise.allSettled([introPromise, planPromise]);
      let assistantId: string | undefined;
      if (cid) {
        assistantId = await saveMessage(cid, "assistant", intro, undefined, {
          kind: "computerTask",
          computerTaskId: task.task_id,
          computerPlan: plan,
        });
        if (assistantId) ownInsertedIdsRef.current.add(assistantId);
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === assistantClientId
            ? {
                ...m,
                id: assistantId || m.id,
                content: intro,
                 computerTaskId: task.task_id,
                computerPlan: plan,
                 toolParts: [{ ...computerTool, state: "done" }],
              }
            : m,
        ),
      );
      window.dispatchEvent(new CustomEvent("megsy:conversations-changed"));
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "تعذّر بدء المهمة على الكمبيوتر.";
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === assistantClientId
             ? {
                 ...m,
                 content: intro ? `${intro}\n\n${msg}` : msg,
                 toolParts: [{ ...computerTool, state: "error", result: msg }],
               }
            : m,
        ),
      );
      clearActiveComputerRun(PENDING_COMPUTER_RUN);
      toast.error(msg);
      return;
    }
  } catch (e) {
    clearActiveComputerRun(PENDING_COMPUTER_RUN);
    const msg = e instanceof Error ? e.message : "المهمة على الكمبيوتر فشلت";
    setMessages((prev) =>
      prev.map((m) =>
        m.clientId === assistantClientId
          ? { ...m, content: msg, toolParts: [{ ...computerTool, state: "error", result: msg }] }
          : m,
      ),
    );
    toast.error(msg);
  }
}
