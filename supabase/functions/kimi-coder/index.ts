/** @doc kimi-coder — SSE coding agent.
 *  Streams model text as `text` frames, emits a `file` frame for every complete
 *  full-file code fence, and closes with `done` carrying all generated files.
 *  Text provider: abliteration.ai via ../_shared/abliteration.ts. */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callModel } from "../_shared/abliteration.ts";

const SYSTEM = [
  "You are Megsy Coder, an expert full-stack web engineer.",
  "You build and edit complete, production-quality projects.",
  "",
  "DEFAULT DESIGN LANGUAGE — clean glassmorphism (motionsites.ai style):",
  "- Dark, deep background (near-black or deep navy) with 2-3 large soft blurred",
  "  colour blobs behind the content; never a flat grey page.",
  "- Every panel, card, nav and modal is glass: semi-transparent surface",
  "  (rgba white 4-10%), backdrop-filter: blur(18px) saturate(140%), 1px hairline",
  "  border rgba(255,255,255,0.12), large radius (18-28px), soft layered shadow,",
  "  and a subtle top inner highlight.",
  "- Sticky glass header with blur, thin border-bottom, compact nav.",
  "- Typography: one modern sans (Inter/Manrope/Sora via Google Fonts), tight",
  "  headline tracking, generous line-height, high contrast text on glass.",
  "- Motion: smooth entrance reveals on scroll (IntersectionObserver or CSS",
  "  animations), gentle hover lift/glow on glass cards, transitions 200-400ms",
  "  with ease-out. Respect prefers-reduced-motion.",
  "- Fully responsive, mobile-first, accessible focus rings, semantic HTML.",
  "Follow this language unless the user explicitly asks for another style.",
  "",
  "LANGUAGE:",
  "Always write your plan, todos and summary in the SAME language the user wrote",
  "in (Arabic request -> Arabic prose, English request -> English). Site copy also",
  "follows the user's language, with dir=\"rtl\" for Arabic. Code stays English.",
  "",
  "OUTPUT RULES:",
  "1. Start with a one-line plan, then a markdown todo list using `- [ ] item`.",
  "2. For a NEW file, or a rewrite of most of a file, output a fenced block whose",
  "   info string is the language followed by the file path:",
  "   ```tsx src/components/Hero.tsx",
  "   ...full file content...",
  "   ```",
  "3. Any file that contains JSX MUST use the .tsx (or .jsx) extension — never .ts.",
  "4. For a small edit to an existing file, output a ```patch <path> block with",
  "   <<<<<<< SEARCH / ======= / >>>>>>> REPLACE pairs that match exactly.",
  "5. Never leave placeholders, TODOs or '...' inside generated code.",
  "6. Finish with a short summary of what changed.",
].join("\n");


const enc = new TextEncoder();

function extractTodos(text: string) {
  const out: Array<{ id: string; title: string; done: boolean }> = [];
  const re = /^\s*[-*]\s+\[( |x|X)\]\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    out.push({ id: `t${i++}`, title: m[2].trim().slice(0, 200), done: m[1].toLowerCase() === "x" });
  }
  return out;
}

/** Complete full-file fences (```lang path\n...\n```) found in the buffer. */
function extractFiles(text: string) {
  const out: Array<{ path: string; content: string }> = [];
  const fence = /```[a-zA-Z0-9+#.-]*[ \t]+([\w./@-]+\.[\w]+)[ \t]*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text)) !== null) {
    if (/^patch|^diff/.test(m[0].slice(3))) continue;
    let path = m[1].trim();
    // JSX inside a .ts/.js file cannot be parsed — fix the extension.
    if (/\.(ts|m?js)$/i.test(path) && /<[A-Za-z][A-Za-z0-9.]*[\s/>]/.test(m[2])) {
      path = path.replace(/\.ts$/i, ".tsx").replace(/\.m?js$/i, ".jsx");
    }
    out.push({ path, content: m[2] });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const { data: userData } = await admin.auth.getUser(token);
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }
  const prompt = String(body.prompt ?? "").trim();
  if (prompt.length < 2 || prompt.length > 200_000) {
    return new Response(JSON.stringify({ error: "prompt is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  const messages = [
    { role: "system", content: SYSTEM },
    ...history
      .filter((m: any) => m && typeof m.content === "string")
      .map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content).slice(0, 20_000),
      })),
    { role: "user", content: prompt },
  ];

  const upstream = await callModel(admin, [String(body.model ?? "")], {
    agentRole: "coder",
    messages,
    stream: true,
    max_tokens: 16_000,
    temperature: 0.3,
    enable_thinking: false,
  });

  if (!upstream?.response?.body) {
    return new Response(
      JSON.stringify({ error: "Coder is temporarily unavailable. Please try again in a moment." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      send({ type: "start", model: upstream.model });

      const reader = upstream.response.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let full = "";
      let sentTodos = "";
      const sentFiles = new Set<string>();
      let finishReason: string | undefined;

      const flushDerived = () => {
        const todos = extractTodos(full);
        if (todos.length) {
          const sig = JSON.stringify(todos);
          if (sig !== sentTodos) {
            sentTodos = sig;
            send({ type: "todo", todos });
          }
        }
        for (const f of extractFiles(full)) {
          const sig = `${f.path}:${f.content.length}`;
          if (sentFiles.has(sig)) continue;
          sentFiles.add(sig);
          send({ type: "file", path: f.path, content: f.content });
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const obj = JSON.parse(payload);
              const choice = obj.choices?.[0];
              const delta = choice?.delta?.content ?? choice?.message?.content ?? "";
              if (choice?.finish_reason) finishReason = choice.finish_reason;
              if (typeof delta === "string" && delta) {
                full += delta;
                send({ type: "text", text: delta });
                flushDerived();
              }
            } catch {
              /* ignore malformed upstream frame */
            }
          }
        }
        flushDerived();

        const files = extractFiles(full);
        const summary = full.split(/\n\s*\n/).slice(-1)[0]?.slice(0, 500);
        send({ type: "done", summary, files, finish_reason: finishReason });
      } catch (error) {
        send({ type: "error", error: error instanceof Error ? error.message : "stream failed" });
      } finally {
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
