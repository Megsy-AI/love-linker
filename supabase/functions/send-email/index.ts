/** @doc send-email — generic transactional sender over Hostinger SMTP. */
/**
 * POST JSON:
 *   { to, subject?, template?, variables?, html?, text?, from_name?, reply_to? }
 *
 * Templates: "invite" | "welcome" | "notify" | "code" (default: "notify").
 * Falls back to raw html/text when no template matches.
 */
import { sendSmtp, smtpConfigured } from "../_shared/smtp.ts";
import { renderBrandEmail, renderCodeEmail } from "../_shared/email-templates/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Payload {
  to?: string;
  subject?: string;
  template?: string;
  variables?: Record<string, unknown>;
  html?: string | null;
  text?: string | null;
  from_name?: string | null;
  reply_to?: string | null;
}

function build(p: Payload): { subject: string; html: string; text: string } {
  const v = p.variables ?? {};
  const str = (k: string, d = "") => (typeof v[k] === "string" ? (v[k] as string) : d);
  const appUrl = str("app_url", "https://megsyai.com");

  switch ((p.template ?? "").toLowerCase()) {
    case "invite": {
      const name = str("name", "Someone");
      const link = str("invite_link", appUrl);
      return {
        subject: p.subject || `${name} invited you to Megsy`,
        html: renderBrandEmail({
          title: "You're invited",
          preheader: `${name} invited you to join them on Megsy.`,
          bodyHtml: `<p>${name} invited you to join them on Megsy — your AI workspace for chat, research and automation.</p>`,
          ctaLabel: "Accept the invite",
          ctaUrl: link,
        }),
        text: `${name} invited you to Megsy. Accept the invite: ${link}`,
      };
    }
    case "welcome": {
      const name = str("name", "there");
      return {
        subject: p.subject || "Welcome to Megsy",
        html: renderBrandEmail({
          title: "Welcome to Megsy",
          preheader: "Your workspace is ready.",
          bodyHtml: `<p>Hi ${name}, your Megsy workspace is ready. Start a chat, run a task, or explore the tools.</p>`,
          ctaLabel: "Open Megsy",
          ctaUrl: appUrl,
        }),
        text: `Hi ${name}, your Megsy workspace is ready: ${appUrl}`,
      };
    }
    case "code": {
      const code = str("code");
      return {
        subject: p.subject || "Your Megsy verification code",
        html: renderCodeEmail(code, p.subject || "Verify your email"),
        text: `Your Megsy code: ${code}`,
      };
    }
    default: {
      const bodyHtml = p.html ?? (p.text ? `<p>${p.text}</p>` : str("body_html"));
      return {
        subject: p.subject || str("subject", "Megsy"),
        html:
          p.html && p.html.includes("<html")
            ? p.html
            : renderBrandEmail({
                title: p.subject || str("title", "Megsy"),
                preheader: str("preheader") || null,
                bodyHtml: bodyHtml || "<p></p>",
                ctaLabel: str("cta_label") || null,
                ctaUrl: str("cta_url") || str("invite_link") || null,
              }),
        text: p.text || str("body_text") || p.subject || "Megsy",
      };
    }
  }
}

const resendKey = () => Deno.env.get("RESEND_API_KEY")?.trim() ?? "";

async function sendResend(args: {
  from: string;
  fromName?: string | null;
  to: string;
  subject: string;
  text: string;
  html?: string | null;
  replyTo?: string | null;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: args.fromName ? `${args.fromName} <${args.from}>` : args.from,
      to: [args.to],
      subject: args.subject || "(no subject)",
      text: args.text || " ",
      ...(args.html ? { html: args.html } : {}),
      ...(args.replyTo ? { reply_to: args.replyTo } : {}),
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const hasResend = resendKey().length > 8;
  if (!smtpConfigured() && !hasResend) {
    return json({ error: "no email provider configured (set RESEND_API_KEY or SMTP_*)" }, 500);
  }

  let p: Payload;
  try {
    p = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const to = (p.to ?? "").trim().toLowerCase();
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return json({ error: "invalid to" }, 400);

  const { subject, html, text } = build(p);
  const from =
    Deno.env.get("EMAIL_FROM") ||
    Deno.env.get("SMTP_FROM") ||
    Deno.env.get("SMTP_USER") ||
    "onboarding@resend.dev";
  const fromName = p.from_name ?? Deno.env.get("SMTP_FROM_NAME") ?? "Megsy";
  const args = { from, fromName, to, subject, text, html, replyTo: p.reply_to ?? from };

  // Resend first when configured (no SMTP ports needed); SMTP as fallback.
  const errors: string[] = [];
  if (hasResend) {
    try {
      await sendResend(args);
      return json({ ok: true, to, subject, via: "resend" });
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "resend failed");
    }
  }
  if (smtpConfigured()) {
    try {
      await sendSmtp(args);
      return json({ ok: true, to, subject, via: "smtp" });
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "smtp failed");
    }
  }
  return json({ error: errors.join(" | ") || "send failed" }, 502);
});

