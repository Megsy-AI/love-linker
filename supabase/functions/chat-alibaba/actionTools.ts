/**
 * @doc Execution toolbelt for MEGSY's primary chat agent.
 *
 * The Manus-style loop in `manus.ts` owns thinking, searching and delegation.
 * This module gives that same loop *hands*: it can ship and deploy real web
 * apps on Freestyle, drive a cloud computer for long tasks, send and read
 * email, generate images/videos/slides, use the user's connected integrations
 * (MCP + Pipedream) and load the user's own skills.
 *
 * Everything here runs against the real deployed endpoints with the caller's
 * own token — no mocks, no simulated results.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { deployStaticSite } from "../_shared/freestyle.ts";
import type { RawCall } from "./manus.ts";

export type ActionCtx = {
  admin: SupabaseClient;
  userId: string | null;
  /** The caller's Supabase access token — required by user-scoped functions. */
  authToken: string | null;
  raw: RawCall;
  send: (frame: Record<string, unknown>) => void;
};

const FUNCTIONS_BASE = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;

async function callFunction(
  ctx: ActionCtx,
  name: string,
  body: Record<string, unknown>,
  timeoutMs = 120_000,
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(`${FUNCTIONS_BASE}/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        ...(ctx.authToken ? { Authorization: `Bearer ${ctx.authToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await resp.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text.slice(0, 2000) };
    }
    if (!resp.ok) data = { ...data, http_status: resp.status };
    return data;
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Tool schemas exposed to the lead agent on top of the research tools. */
export const ACTION_TOOLS = [
  {
    type: "function",
    function: {
      name: "build_and_deploy_app",
      description:
        "Build a real, self-contained web app/site and deploy it live on Freestyle, returning one clean public HTTPS link the user can open immediately. Use for any 'build me a site/app/landing page/tool/game/dashboard' request. Either pass the finished files, or pass only `brief` and the coder will write them.",
      parameters: {
        type: "object",
        properties: {
          brief: {
            type: "string",
            description: "What to build, with all requirements, content and style notes.",
          },
          name: { type: "string", description: "Short project name (used for the subdomain)." },
          files: {
            type: "array",
            description:
              "Optional finished files. Must include a root index.html. Static only (CDN React/Tailwind allowed).",
            items: {
              type: "object",
              properties: { path: { type: "string" }, content: { type: "string" } },
              required: ["path", "content"],
            },
          },
        },
        required: ["brief"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "computer_task",
      description:
        "Run a long, open-ended task on a real cloud computer/browser (log in, fill forms, buy, book, download, multi-site workflows). Returns a task id that keeps running in the background; poll it with computer_task_status.",
      parameters: {
        type: "object",
        properties: { goal: { type: "string", description: "Full instruction, self-contained." } },
        required: ["goal"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "computer_task_status",
      description: "Check a running cloud-computer task and return its status, steps and output.",
      parameters: {
        type: "object",
        properties: { task_id: { type: "string" } },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send an email from the user's Megsy mailbox.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string" },
          subject: { type: "string" },
          text: { type: "string" },
        },
        required: ["to", "subject", "text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_inbox",
      description: "Read the newest messages in the user's Megsy mailbox.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number", description: "1-20 (default 8)" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "Generate an image and return its URL.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          aspect_ratio: { type: "string", description: "e.g. 1:1, 16:9, 9:16" },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_video",
      description:
        "Start a video generation job and return its job id (it finishes in the background; tell the user it is rendering).",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          aspect_ratio: { type: "string" },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_slides",
      description: "Create a slide deck / presentation for the user and return its job id.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          doc_type: { type: "string", description: "slides (default) or doc" },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_integrations",
      description:
        "List the user's connected integrations (MCP servers and their tools) that you can call with use_integration.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "use_integration",
      description: "Call one tool on a connected MCP integration.",
      parameters: {
        type: "object",
        properties: {
          server: { type: "string" },
          tool: { type: "string" },
          arguments: { type: "object" },
        },
        required: ["server", "tool"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "use_skill",
      description:
        "Load one of the user's own skills (saved know-how / playbooks) and follow its instructions for this task.",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "Skill name, or empty to list them." } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "start_background_task",
      description:
        "Hand a task that needs hours (or that must survive this chat turn) to the durable background agent. It checkpoints its own state and is resumed automatically by cron until the goal is done. Use it for long monitoring, large multi-phase builds, research marathons or anything you cannot finish inside this turn.",
      parameters: {
        type: "object",
        properties: {
          goal: {
            type: "string",
            description: "Complete, self-contained goal including success criteria and constraints.",
          },
          budget_ms: { type: "number", description: "Optional wall-clock budget in ms (default 24h)." },
        },
        required: ["goal"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "background_task_status",
      description: "Read the state, progress and latest events of a durable background task.",
      parameters: {
        type: "object",
        properties: { run_id: { type: "string" } },
        required: ["run_id"],
      },
    },
  },
];


export const ACTION_TOOL_NAMES = new Set(ACTION_TOOLS.map((tool) => tool.function.name));

/**
 * Asks the coder ladder for a deployable bundle.
 *
 * A single complete HTML document is requested as raw text (not JSON): models
 * produce far more reliable output that way, and JSON escaping of a full page
 * is the main source of unusable replies.
 */
async function writeSite(
  ctx: ActionCtx,
  brief: string,
): Promise<{ path: string; content: string }[]> {
  const system = `You are a senior front-end engineer shipping production sites.
Return ONE complete HTML document and NOTHING else: no commentary, no markdown fences.
Requirements: start at <!DOCTYPE html>, inline all CSS and JS, no build step and no local assets. Tailwind via CDN and Google Fonts are allowed. Responsive, accessible, real finished copy (never lorem ipsum or TODOs), and a considered visual identity that matches the brief. Keep it under 400 lines.`;
  // Some upstream models reject very large max_tokens outright, so the budget
  // walks down until one call actually returns a document.
  let text = "";
  for (const budget of [6000, 3000, 2000]) {
    const data = await ctx.raw(["qwen3.8-max", "qwen-max", "qwen-plus"], {
      temperature: 0.4,
      max_tokens: budget,
      messages: [
        { role: "system", content: system },
        { role: "user", content: brief.slice(0, 6000) },
      ],
    });
    text = String(data?.choices?.[0]?.message?.content ?? "").trim();
    console.log(`build_and_deploy_app: coder budget ${budget} returned ${text.length} chars`);
    if (text.length > 200) break;
  }
  const fence = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.search(/<!DOCTYPE html|<html[\s>]/i);
  if (start < 0) return [];
  return [{ path: "index.html", content: text.slice(start) }];
}

/** Runs one execution tool. Returns the text the lead agent sees. */
export async function runActionTool(
  ctx: ActionCtx,
  name: string,
  args: any,
): Promise<string> {
  switch (name) {
    case "build_and_deploy_app": {
      const brief = String(args?.brief ?? "").trim();
      let files: { path: string; content: string }[] = Array.isArray(args?.files)
        ? args.files
            .filter((file: any) => file?.path && typeof file?.content === "string")
            .map((file: any) => ({ path: String(file.path), content: String(file.content) }))
        : [];
      if (!files.some((file) => /^\.?\/?index\.html$/i.test(file.path))) {
        files = await writeSite(ctx, brief || "A simple one-page site");
      }
      if (!files.length) {
        console.error("build_and_deploy_app: no deployable HTML produced");
        return "the coder produced no HTML — retry with a clearer, shorter brief";
      }
      const slug = String(args?.name ?? "app")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 24) || "app";
      const subdomain = `${slug}-${Math.random().toString(36).slice(2, 7)}`;
      let result;
      try {
        result = await deployStaticSite(ctx.admin, files, {
          subdomain,
          displayName: `megsy-${slug}`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("build_and_deploy_app: deploy failed", message);
        return `deploy failed: ${message}`;
      }
      ctx.send({ site_build: { url: result.url, files: result.files } });
      if (ctx.userId) {
        await ctx.admin
          .from("generated_sites")
          .insert({
            user_id: ctx.userId,
            title: args?.name ? String(args.name).slice(0, 120) : brief.slice(0, 120),
            prompt: brief.slice(0, 4000),
            deploy_url: result.url,
            status: "live",
          })
          .then(undefined, () => undefined);
      }
      return `deployed and verified live at ${result.url} (files: ${result.files.join(", ")}). Give the user this exact link.`;
    }

    case "computer_task": {
      const goal = String(args?.goal ?? "").trim();
      if (!goal) return "empty goal";
      const data = await callFunction(ctx, "computer-agent", {
        action: "create",
        prompt: goal,
        token: ctx.authToken,
      });
      const taskId = String(data?.task_id ?? "");
      if (!taskId) return `could not start: ${data?.error ?? "unknown error"}`;
      ctx.send({ computer_task_id: taskId });
      // Give it a short head start so the answer can report early progress.
      await sleep(6000);
      const poll = await callFunction(ctx, "computer-agent", {
        action: "poll",
        task_id: taskId,
        token: ctx.authToken,
      });
      const status = poll?.task?.status ?? data?.status ?? "running";
      return `cloud computer task ${taskId} is ${status}. It continues in the background and the user can watch it live in the chat.`;
    }

    case "computer_task_status": {
      const taskId = String(args?.task_id ?? "").trim();
      if (!taskId) return "missing task_id";
      const poll = await callFunction(ctx, "computer-agent", {
        action: "poll",
        task_id: taskId,
        token: ctx.authToken,
      });
      const task = poll?.task ?? {};
      const events = Array.isArray(poll?.events) ? poll.events.slice(-6) : [];
      return JSON.stringify({ status: task.status, output: task.output, events }).slice(0, 4000);
    }

    case "send_email": {
      const data = await callFunction(ctx, "mail", {
        action: "send",
        to: args?.to,
        subject: args?.subject,
        text: args?.text,
        origin: "ai",
      });
      if (data?.error) return `not sent: ${data.error}`;
      return `email sent to ${args?.to} (status: ${data?.status ?? "sent"})`;
    }

    case "read_inbox": {
      if (!ctx.userId) return "no signed-in user";
      const limit = Math.min(Math.max(Number(args?.limit) || 8, 1), 20);
      const { data } = await ctx.admin
        .from("mail_messages")
        .select("from_address,subject,snippet,created_at,folder,direction")
        .eq("user_id", ctx.userId)
        .eq("direction", "in")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!data?.length) return "inbox is empty";
      return data
        .map(
          (row: any) =>
            `- ${row.created_at?.slice(0, 16)} | ${row.from_address} | ${row.subject ?? "(no subject)"} | ${(row.snippet ?? "").slice(0, 160)}`,
        )
        .join("\n");
    }

    case "generate_image": {
      const data = await callFunction(ctx, "anything-api", {
        prompt: String(args?.prompt ?? ""),
        aspect_ratio: args?.aspect_ratio ?? "1:1",
      });
      const url =
        data?.url ?? data?.image_url ?? data?.images?.[0]?.url ?? data?.output?.[0] ?? null;
      if (!url) return `image failed: ${data?.message ?? data?.error ?? "unknown"}`;
      ctx.send({ media: { kind: "image", url } });
      return `image ready: ${url}`;
    }

    case "generate_video": {
      const data = await callFunction(ctx, "media-video", {
        prompt: String(args?.prompt ?? ""),
        aspect_ratio: args?.aspect_ratio ?? "16:9",
      });
      if (!data?.job_id) return `video failed: ${data?.message ?? data?.error ?? "unknown"}`;
      ctx.send({ media: { kind: "video", job_id: data.job_id } });
      return `video job ${data.job_id} started on ${data.provider ?? "provider"} — it renders in the background.`;
    }

    case "create_slides": {
      const data = await callFunction(ctx, "slides-api", {
        action: "create",
        prompt: String(args?.prompt ?? ""),
        doc_type: args?.doc_type ?? "slides",
      });
      const id = data?.id ?? data?.job?.id;
      if (!id) return `slides failed: ${data?.error ?? "unknown"}`;
      return `deck job ${id} queued — it is being generated and will appear in the chat.`;
    }

    case "list_integrations": {
      if (!ctx.userId) return "no signed-in user";
      const { listMcpTools } = await import("../_shared/agentkernel/executor.ts");
      const mcp = await listMcpTools(ctx.admin as any, ctx.userId);
      const pipedream = await callFunction(ctx, "pipedream-connect", { action: "list" }, 30_000);
      const apps = Array.isArray(pipedream?.apps)
        ? pipedream.apps
            .map((app: any) => app?.name_slug ?? app?.name)
            .filter(Boolean)
            .slice(0, 40)
            .join(", ")
        : "";
      return `MCP:\n${mcp}\n\nPipedream connected apps: ${apps || "none"}`;
    }

    case "use_integration": {
      if (!ctx.userId) return "no signed-in user";
      const { callMcpTool } = await import("../_shared/agentkernel/executor.ts");
      return (
        await callMcpTool(ctx.admin as any, ctx.userId, {
          server: String(args?.server ?? ""),
          tool: String(args?.tool ?? ""),
          arguments: (args?.arguments ?? {}) as Record<string, unknown>,
        })
      ).slice(0, 6000);
    }

    case "use_skill": {
      if (!ctx.userId) return "no signed-in user";
      const wanted = String(args?.name ?? "").trim().toLowerCase();
      const { data } = await ctx.admin
        .from("skills")
        .select("name,description,instructions,body")
        .eq("user_id", ctx.userId)
        .limit(30);
      const rows = (data ?? []) as any[];
      if (!rows.length) return "the user has no skills saved";
      if (!wanted) {
        return rows.map((row) => `- ${row.name}: ${row.description ?? ""}`).join("\n");
      }
      const hit =
        rows.find((row) => String(row.name).toLowerCase() === wanted) ??
        rows.find((row) => String(row.name).toLowerCase().includes(wanted));
      if (!hit) return `no skill named "${wanted}"`;
      return `SKILL ${hit.name}\n${(hit.instructions || hit.body || "").slice(0, 6000)}`;
    }

    case "start_background_task": {
      const goal = String(args?.goal ?? "").trim();
      if (!goal) return "empty goal";
      if (!ctx.authToken) return "no signed-in user, cannot start a durable task";
      const data = await callFunction(ctx, "long-run", {
        action: "start",
        token: ctx.authToken,
        goal,
        budget_ms: Number(args?.budget_ms) || undefined,
      });
      const runId = String(data?.run?.id ?? data?.run_id ?? data?.id ?? "");
      if (!runId) return `could not start: ${data?.error ?? "unknown error"}`;
      ctx.send({ long_run_id: runId });
      return `durable background task ${runId} started and will keep running (and auto-resume) until the goal is done. Tell the user it is running in the background and that you will report back.`;
    }

    case "background_task_status": {
      const runId = String(args?.run_id ?? "").trim();
      if (!runId || !ctx.authToken) return "missing run_id or session";
      const data = await callFunction(ctx, "long-run", {
        action: "status",
        token: ctx.authToken,
        run_id: runId,
      });
      const run = data?.run ?? {};
      const events = Array.isArray(data?.events) ? data.events.slice(-8) : [];
      return JSON.stringify({
        status: run.status,
        step: run.step_index ?? run.steps,
        summary: run.summary ?? run.last_summary,
        events,
      }).slice(0, 4000);
    }

    default:
      return "unknown tool";

  }
}

/** Short label shown next to the tool icon in the chat's thinking trace. */
export function actionLabel(name: string, args: any): string {
  switch (name) {
    case "build_and_deploy_app":
      return String(args?.name ?? args?.brief ?? "").slice(0, 100);
    case "computer_task":
    case "start_background_task":
      return String(args?.goal ?? "").slice(0, 100);

    case "send_email":
      return String(args?.to ?? "").slice(0, 80);
    case "generate_image":
    case "generate_video":
    case "create_slides":
      return String(args?.prompt ?? "").slice(0, 100);
    case "use_integration":
      return `${args?.server ?? ""}: ${args?.tool ?? ""}`.slice(0, 80);
    case "use_skill":
      return String(args?.name ?? "").slice(0, 60);
    default:
      return "";
  }
}
