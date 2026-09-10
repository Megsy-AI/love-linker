/**
 * @doc telegram-tasks-bot — Telegram webhook for Megsy's operator task approvals.
 *
 * Linking: a user sets their Telegram username in Settings → Integrations
 * (`user_integrations.telegram_username`); when that user first messages the
 * bot we backfill `telegram_chat_id` so we can push/receive after that.
 *
 * Commands:
 *  - /start            → greet + link status
 *  - /tasks            → list pending operator_agent proposals awaiting approval
 *  - /approve <id>     → approve a pending agent_proposals row
 *  - /reject <id>      → reject a pending agent_proposals row
 *
 * Callback queries (inline "Approve"/"Reject" buttons) are also handled.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function tg(method: string, body: Record<string, unknown>) {
  if (!BOT_TOKEN) {
    console.error("telegram-tasks-bot: TELEGRAM_BOT_TOKEN not set");
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error(`telegram ${method} failed`, error);
  }
}

const sendMessage = (chatId: number | string, text: string, extra: Record<string, unknown> = {}) =>
  tg("sendMessage", { chat_id: chatId, text, parse_mode: "Markdown", ...extra });

async function findUserByChatId(chatId: number): Promise<string | null> {
  const { data } = await admin
    .from("user_integrations")
    .select("user_id")
    .eq("telegram_chat_id", String(chatId))
    .maybeSingle();
  return (data as { user_id: string } | null)?.user_id ?? null;
}

/** First contact from a known @username: adopt this chat id for future messages. */
async function linkByUsername(chatId: number, username: string | null): Promise<string | null> {
  if (!username) return null;
  const { data } = await admin
    .from("user_integrations")
    .select("user_id")
    .eq("telegram_username", username)
    .maybeSingle();
  const row = data as { user_id: string } | null;
  if (!row) return null;
  await admin
    .from("user_integrations")
    .update({ telegram_chat_id: String(chatId) })
    .eq("user_id", row.user_id);
  return row.user_id;
}

async function resolveUser(chatId: number, username: string | null): Promise<string | null> {
  return (await findUserByChatId(chatId)) ?? (await linkByUsername(chatId, username));
}

async function listPending(userId: string) {
  const { data } = await admin
    .from("agent_proposals")
    .select("id,title,kind,status")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

async function decide(userId: string, proposalId: string, approve: boolean) {
  const { data: proposal } = await admin
    .from("agent_proposals")
    .select("id,status")
    .eq("id", proposalId)
    .maybeSingle();
  if (!proposal) return { ok: false, message: "❌ Task not found." };
  if ((proposal as { status: string }).status !== "pending") {
    return { ok: false, message: "⚠️ That task was already decided." };
  }
  const { error } = await admin
    .from("agent_proposals")
    .update({
      status: approve ? "approved" : "rejected",
      decided_by: userId,
      executed_at: approve ? new Date().toISOString() : null,
    })
    .eq("id", proposalId);
  if (error) return { ok: false, message: `❌ ${error.message}` };
  return { ok: true, message: approve ? "✅ Approved." : "🚫 Rejected." };
}

async function handleCommand(chatId: number, username: string | null, text: string) {
  if (text === "/start") {
    const userId = await resolveUser(chatId, username);
    await sendMessage(
      chatId,
      userId
        ? "👋 Welcome back! You're linked to your Megsy account.\n\n• */tasks* — see pending operator tasks awaiting your approval\n• */approve <id>* — approve a task\n• */reject <id>* — reject a task"
        : "👋 Welcome to the Megsy bot!\n\nSet your Telegram *username* in Megsy → Settings → Integrations, then send /start again here to link your account.",
    );
    return;
  }

  const userId = await resolveUser(chatId, username);
  if (!userId) {
    await sendMessage(
      chatId,
      "You're not linked yet. Add your Telegram username in Megsy → Settings → Integrations, then send /start.",
    );
    return;
  }

  if (text === "/tasks") {
    const pending = await listPending(userId);
    if (!pending.length) {
      await sendMessage(chatId, "🎉 No pending tasks awaiting approval.");
      return;
    }
    for (const p of pending as Array<Record<string, unknown>>) {
      await sendMessage(chatId, `🧩 *${p.title}*\n_kind: ${p.kind}_\nid: \`${p.id}\``, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Approve", callback_data: `approve:${p.id}` },
              { text: "🚫 Reject", callback_data: `reject:${p.id}` },
            ],
          ],
        },
      });
    }
    return;
  }

  if (text.startsWith("/approve") || text.startsWith("/reject")) {
    const approve = text.startsWith("/approve");
    const id = text.replace(approve ? "/approve" : "/reject", "").trim();
    if (!id) {
      await sendMessage(chatId, `Usage: /${approve ? "approve" : "reject"} <task id>`);
      return;
    }
    const result = await decide(userId, id, approve);
    await sendMessage(chatId, result.message);
    return;
  }

  await sendMessage(chatId, "Unknown command. Try /tasks, /approve <id>, /reject <id>.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: true });
  if (!BOT_TOKEN) return json({ error: "TELEGRAM_BOT_TOKEN not configured" }, 503);

  let update: Record<string, unknown> = {};
  try {
    update = await req.json();
  } catch {
    return json({ ok: true });
  }

  try {
    const callback = update.callback_query as Record<string, unknown> | undefined;
    if (callback) {
      const from = callback.from as Record<string, unknown>;
      const message = callback.message as Record<string, unknown>;
      const chat = message?.chat as Record<string, unknown>;
      const chatId = Number(chat?.id);
      const username = (from?.username as string | null) ?? null;
      const data = String(callback.data ?? "");
      const [action, id] = data.split(":");
      const userId = await resolveUser(chatId, username);
      if (userId && id && (action === "approve" || action === "reject")) {
        const result = await decide(userId, id, action === "approve");
        await tg("answerCallbackQuery", { callback_query_id: callback.id, text: result.message });
        await sendMessage(chatId, result.message);
      } else {
        await tg("answerCallbackQuery", { callback_query_id: callback.id, text: "Not linked." });
      }
      return json({ ok: true });
    }

    const message = (update.message ?? update.edited_message) as Record<string, unknown> | undefined;
    if (!message) return json({ ok: true });

    const chat = message.chat as Record<string, unknown>;
    const from = message.from as Record<string, unknown> | undefined;
    const chatId = Number(chat.id);
    const username = (from?.username as string | null) ?? null;
    const text = String(message.text ?? "").trim();
    if (text) await handleCommand(chatId, username, text);
    return json({ ok: true });
  } catch (error) {
    console.error("telegram-tasks-bot error", error);
    return json({ ok: true });
  }
});
