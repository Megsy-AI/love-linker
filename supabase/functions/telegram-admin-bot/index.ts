/**
 * @doc telegram-admin-bot — control panel for provider keys and traffic stats.
 *
 * Access: anyone who sends the shared password (`ADMIN_BOT_PASSWORD`) unlocks
 * the panel for their chat; the password message is deleted right away so it is
 * not left sitting in the chat history.
 *
 * Keys: tokens for the four providers we use (Cerebras, DeAPI, Renderful,
 * Browser Use) are pasted into the chat and stored AES-GCM encrypted in
 * `service_keys` via `_shared/keyVault.ts`. The message carrying the token is
 * deleted immediately after saving.
 *
 * Stats: registered users, visitors, live visitors, page views and top pages
 * come from `page_views` plus `profiles`.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { saveVaultKey, unbanAll, vaultStats } from "../_shared/keyVault.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const BOT_TOKEN = Deno.env.get("TELEGRAM_ADMIN_BOT_TOKEN");
const PASSWORD = (Deno.env.get("ADMIN_BOT_PASSWORD") ?? "").trim();

const PROVIDERS: Record<string, string> = {
  cerebras: "Cerebras (نصوص)",
  deapi: "DeAPI (صور/فيديو)",
  renderful: "Renderful (صور)",
  "browser-use": "Browser Use (الوكيل)",
  github: "GitHub (تخزين المشاريع)",
};


const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

async function tg(method: string, body: Record<string, unknown>) {
  if (!BOT_TOKEN) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json().catch(() => null);
  } catch (error) {
    console.error(`telegram ${method} failed`, error);
    return null;
  }
}

const send = (chatId: number | string, text: string, extra: Record<string, unknown> = {}) =>
  tg("sendMessage", { chat_id: chatId, text, parse_mode: "Markdown", ...extra });

const drop = (chatId: number | string, messageId?: number) =>
  messageId ? tg("deleteMessage", { chat_id: chatId, message_id: messageId }) : null;

/* ------------------------------- session ---------------------------------- */

interface State {
  authorized: boolean;
  awaiting_provider: string | null;
}

async function getState(chatId: number): Promise<State> {
  const { data } = await admin
    .from("admin_bot_state")
    .select("authorized,awaiting_provider")
    .eq("chat_id", String(chatId))
    .maybeSingle();
  const row = data as Partial<State> | null;
  return {
    authorized: Boolean(row?.authorized),
    awaiting_provider: row?.awaiting_provider ?? null,
  };
}

async function setState(chatId: number, patch: Partial<State>) {
  await admin
    .from("admin_bot_state")
    .upsert(
      { chat_id: String(chatId), updated_at: new Date().toISOString(), ...patch },
      { onConflict: "chat_id" },
    );
}

/* --------------------------------- menus ---------------------------------- */

const mainMenu = {
  inline_keyboard: [
    [{ text: "🔑 إضافة مفتاح", callback_data: "menu:keys" }],
    [
      { text: "📊 حالة المفاتيح", callback_data: "keys:status" },
      { text: "♻️ فك الحظر", callback_data: "keys:unban" },
    ],
    [
      { text: "👥 المستخدمون", callback_data: "stats:users" },
      { text: "🌍 الزوار", callback_data: "stats:visitors" },
    ],
    [{ text: "📈 أكثر الصفحات زيارة", callback_data: "stats:pages" }],
  ],
};

const providerMenu = {
  inline_keyboard: [
    ...Object.entries(PROVIDERS).map(([id, label]) => [
      { text: label, callback_data: `add:${id}` },
    ]),
    [{ text: "⬅️ رجوع", callback_data: "menu:main" }],
  ],
};

const afterSaveMenu = (provider: string) => ({
  inline_keyboard: [
    [{ text: "➕ إضافة توكن آخر", callback_data: `add:${provider}` }],
    [{ text: "⬅️ القائمة الرئيسية", callback_data: "menu:main" }],
  ],
});

/* --------------------------------- stats ---------------------------------- */

const since = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

async function count(table: string, build: (q: any) => any): Promise<number> {
  const { count: n } = await build(
    admin.from(table).select("*", { count: "exact", head: true }),
  );
  return n ?? 0;
}

async function usersText(): Promise<string> {
  const [total, day, week] = await Promise.all([
    count("profiles", (q) => q),
    count("profiles", (q) => q.gte("created_at", since(60 * 24))),
    count("profiles", (q) => q.gte("created_at", since(60 * 24 * 7))),
  ]);
  return `👥 *المستخدمون*\n\n• الإجمالي: *${total}*\n• جديد آخر 24 ساعة: *${day}*\n• جديد آخر 7 أيام: *${week}*`;
}

async function visitorsText(): Promise<string> {
  const [views24, live] = await Promise.all([
    count("page_views", (q) => q.gte("started_at", since(60 * 24))),
    count("page_views", (q) => q.gte("started_at", since(5))),
  ]);
  const { data } = await admin
    .from("page_views")
    .select("visitor_id,started_at")
    .gte("started_at", since(60 * 24))
    .limit(5000);
  const unique = new Set((data ?? []).map((r: any) => r.visitor_id)).size;
  return `🌍 *الزوار*\n\n• زائر فريد آخر 24 ساعة: *${unique}*\n• مشاهدات الصفحات: *${views24}*\n• متصل الآن (٥ دقائق): *${live}*`;
}

async function pagesText(): Promise<string> {
  const { data } = await admin
    .from("page_views")
    .select("path")
    .gte("started_at", since(60 * 24 * 7))
    .limit(5000);
  const tally = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ path: string }>) {
    tally.set(row.path, (tally.get(row.path) ?? 0) + 1);
  }
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (!top.length) return "📈 لا توجد زيارات مسجَّلة بعد.";
  return `📈 *أكثر الصفحات زيارة (٧ أيام)*\n\n${
    top.map(([path, n], i) => `${i + 1}. \`${path}\` — *${n}*`).join("\n")
  }`;
}

async function keysStatusText(): Promise<string> {
  const stats = await vaultStats();
  const lines = Object.entries(PROVIDERS).map(([id, label]) => {
    const s = stats[id] ?? { active: 0, banned: 0 };
    const mark = s.active > 0 ? "✅" : "⚠️";
    return `${mark} ${label} — نشط: *${s.active}* / محظور: *${s.banned}*`;
  });
  return `🔑 *حالة المفاتيح*\n\n${lines.join("\n")}`;
}

/* -------------------------------- handlers -------------------------------- */

async function showMain(chatId: number) {
  await send(chatId, "🎛 *لوحة تحكم Megsy*\nاختر من الأزرار:", { reply_markup: mainMenu });
}

async function handleCallback(chatId: number, data: string, callbackId: string) {
  const state = await getState(chatId);
  if (!state.authorized) {
    await tg("answerCallbackQuery", { callback_query_id: callbackId, text: "اكتب كلمة السر أولًا." });
    return;
  }
  await tg("answerCallbackQuery", { callback_query_id: callbackId });

  if (data === "menu:main") return void (await showMain(chatId));
  if (data === "menu:keys") {
    await send(chatId, "اختر الموقع الذي تريد إضافة توكن له:", { reply_markup: providerMenu });
    return;
  }
  if (data.startsWith("add:")) {
    const provider = data.slice(4);
    if (!PROVIDERS[provider]) return;
    await setState(chatId, { awaiting_provider: provider });
    await send(chatId, `📩 أرسل التوكن الخاص بـ *${PROVIDERS[provider]}* الآن.\nسأحذف رسالتك بعد الحفظ.`);
    return;
  }
  if (data === "keys:status") return void (await send(chatId, await keysStatusText(), { reply_markup: mainMenu }));
  if (data === "keys:unban") {
    const n = await unbanAll();
    await send(chatId, `♻️ تم فك الحظر عن *${n}* مفتاح.`, { reply_markup: mainMenu });
    return;
  }
  if (data === "stats:users") return void (await send(chatId, await usersText(), { reply_markup: mainMenu }));
  if (data === "stats:visitors") return void (await send(chatId, await visitorsText(), { reply_markup: mainMenu }));
  if (data === "stats:pages") return void (await send(chatId, await pagesText(), { reply_markup: mainMenu }));
}

async function handleMessage(chatId: number, text: string, messageId?: number) {
  const state = await getState(chatId);

  // Password unlock — works for anyone who knows it, by request.
  if (!state.authorized) {
    if (PASSWORD && text.trim() === PASSWORD) {
      await setState(chatId, { authorized: true, awaiting_provider: null });
      await drop(chatId, messageId);
      await showMain(chatId);
      return;
    }
    await send(chatId, "🔒 اكتب كلمة السر للدخول إلى لوحة التحكم.");
    return;
  }

  if (state.awaiting_provider) {
    const provider = state.awaiting_provider;
    const token = text.trim();
    if (token.length < 10 || /\s/.test(token)) {
      await send(chatId, "⚠️ ده مش شكل توكن صحيح. ابعت التوكن كامل بدون مسافات.");
      return;
    }
    const saved = await saveVaultKey(provider, token, `telegram:${chatId}`);
    await drop(chatId, messageId);
    await setState(chatId, { awaiting_provider: null });
    await send(
      chatId,
      saved
        ? `✅ تم الحفظ مشفَّرًا لـ *${PROVIDERS[provider] ?? provider}* (ينتهي بـ \`${token.slice(-4)}\`).`
        : "❌ فشل الحفظ. حاول تاني.",
      { reply_markup: afterSaveMenu(provider) },
    );
    return;
  }

  if (text === "/start" || text === "/menu") return void (await showMain(chatId));
  if (text === "/lock") {
    await setState(chatId, { authorized: false, awaiting_provider: null });
    await send(chatId, "🔒 تم الخروج. اكتب كلمة السر للدخول مرة أخرى.");
    return;
  }
  await showMain(chatId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: true });
  if (!BOT_TOKEN) return json({ error: "TELEGRAM_ADMIN_BOT_TOKEN not configured" }, 503);

  let update: Record<string, any> = {};
  try {
    update = await req.json();
  } catch {
    return json({ ok: true });
  }

  try {
    const callback = update.callback_query;
    if (callback) {
      const chatId = Number(callback.message?.chat?.id);
      if (chatId) await handleCallback(chatId, String(callback.data ?? ""), String(callback.id));
      return json({ ok: true });
    }
    const message = update.message ?? update.edited_message;
    const chatId = Number(message?.chat?.id);
    const text = String(message?.text ?? "").trim();
    if (chatId && text) await handleMessage(chatId, text, Number(message?.message_id) || undefined);
    return json({ ok: true });
  } catch (error) {
    console.error("telegram-admin-bot error", error);
    return json({ ok: true });
  }
});
