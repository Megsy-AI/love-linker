/**
 * @doc Tiny state mark next to a conversation in the sidebar.
 * Moving yellow Megsy star = the agent is still working on that conversation.
 * Quiet blue dot = its last task already finished.
 */
import MegsyStar from "@/components/branding/MegsyStar";
import type { TaskIndicator } from "@/lib/computer/taskIndicators";

export default function ConversationTaskDot({ state }: { state?: TaskIndicator }) {
  if (!state) return null;
  if (state === "running") {
    return (
      <span className="inline-flex shrink-0" title="Task running">
        <MegsyStar className="h-3.5 w-3.5 text-amber-400 motion-safe:animate-spin [animation-duration:2.6s]" />
      </span>
    );
  }
  return (
    <span
      className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--megsy-blue)]"
      title="Task finished"
    />
  );
}
