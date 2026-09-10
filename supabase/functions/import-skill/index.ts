/** @doc import-skill — imports a skill from an uploaded .zip (multipart form).
 *  Reads SKILL.md (name / description / body) and stores every other file in
 *  the `skills` storage bucket, recorded in public.skill_files. */
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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Entry {
  path: string;
  bytes: Uint8Array;
}

/** Minimal ZIP reader (stored + deflate entries) using the central directory. */
async function readZip(buf: Uint8Array): Promise<Entry[]> {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const entries: Entry[] = [];
  // Find End Of Central Directory.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66_000; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip file");
  const count = view.getUint16(eocd + 10, true);
  let ptr = view.getUint32(eocd + 16, true);

  for (let n = 0; n < count; n += 1) {
    if (view.getUint32(ptr, true) !== 0x02014b50) break;
    const method = view.getUint16(ptr + 10, true);
    const compSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localOffset = view.getUint32(ptr + 42, true);
    const name = new TextDecoder().decode(buf.subarray(ptr + 46, ptr + 46 + nameLen));
    ptr += 46 + nameLen + extraLen + commentLen;

    if (name.endsWith("/")) continue;

    // Local header → data start.
    const lNameLen = view.getUint16(localOffset + 26, true);
    const lExtraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);

    let bytes: Uint8Array;
    if (method === 0) {
      bytes = raw;
    } else if (method === 8) {
      const stream = new Blob([raw]).stream().pipeThrough(
        new DecompressionStream("deflate-raw"),
      );
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else {
      continue; // unsupported compression
    }
    entries.push({ path: name, bytes });
  }
  return entries;
}

function parseSkillMd(text: string) {
  let name = "";
  let description = "";
  let body = text;
  const fm = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (fm) {
    for (const line of fm[1].split("\n")) {
      const m = line.match(/^(\w+):\s*(.*)$/);
      if (!m) continue;
      const value = m[2].trim().replace(/^["']|["']$/g, "");
      if (m[1] === "name") name = value;
      if (m[1] === "description") description = value;
    }
    body = fm[2];
  }
  if (!name) {
    const h1 = text.match(/^#\s+(.+)$/m);
    name = h1?.[1]?.trim() ?? "Imported skill";
  }
  if (!description) {
    description = body.replace(/^#.*$/m, "").trim().split("\n")[0]?.slice(0, 300) ?? "";
  }
  return { name: name.slice(0, 120), description, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  const { data: userData } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (!user) return json({ error: "unauthorized" }, 401);

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return json({ error: "expected multipart/form-data with a `file` field" }, 400);
  }
  if (!file) return json({ error: "no file uploaded" }, 400);
  if (file.size > 20 * 1024 * 1024) return json({ error: "zip is larger than 20 MB" }, 413);

  let entries: Entry[];
  try {
    entries = await readZip(new Uint8Array(await file.arrayBuffer()));
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "could not read the zip" }, 400);
  }
  if (entries.length === 0) return json({ error: "the zip is empty" }, 400);

  const skillMd = entries.find((e) => /(^|\/)SKILL\.md$/i.test(e.path));
  if (!skillMd) return json({ error: "SKILL.md is missing from the zip" }, 400);
  const meta = parseSkillMd(new TextDecoder().decode(skillMd.bytes));

  const { data: skill, error: skillErr } = await admin
    .from("skills")
    .insert({
      user_id: user.id,
      name: meta.name,
      description: meta.description,
      instructions: meta.body,
      body: meta.body,
      enabled_tools: [],
      triggers: [],
      is_active: true,
      is_enabled: true,
    })
    .select("id,name")
    .single();
  if (skillErr) return json({ error: skillErr.message }, 500);

  let stored = 0;
  for (const entry of entries) {
    if (entry === skillMd) continue;
    if (entry.bytes.byteLength > 5 * 1024 * 1024) continue;
    const storagePath = `${user.id}/${skill.id}/${entry.path}`;
    const up = await admin.storage.from("skills").upload(storagePath, entry.bytes, {
      upsert: true,
      contentType: "application/octet-stream",
    });
    if (up.error) continue;
    await admin.from("skill_files").insert({
      skill_id: skill.id,
      user_id: user.id,
      path: entry.path,
      storage_path: storagePath,
      size_bytes: entry.bytes.byteLength,
      mime_type: "application/octet-stream",
    });
    stored += 1;
  }

  return json({ ok: true, id: skill.id, name: skill.name, files: stored });
});
