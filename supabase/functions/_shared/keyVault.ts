/**
 * @doc Encrypted key vault with round-robin rotation and auto-ban.
 *
 * Every provider key the product uses (cerebras / deapi / renderful /
 * browser-use) lives in one table, `public.service_keys`, encrypted with
 * AES-GCM under the `KEY_VAULT_SECRET` function secret. Plaintext never
 * touches the database and never leaves the edge runtime.
 *
 * Rotation: keys are handed out least-recently-used first, so load spreads
 * evenly. Reliability: three consecutive failures ban a key (`status='banned'`)
 * and callers move on to the next one, so a dead/empty key stops costing the
 * user a visible error. One success resets the counter.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type VaultProvider = "cerebras" | "deapi" | "renderful" | "browser-use";

export interface VaultKey {
  id: string;
  key: string;
}

const MAX_FAILS = 3;

let cached: ReturnType<typeof createClient> | null = null;

/** Service-role client — the vault is backend-only by design. */
export function vaultAdmin() {
  if (cached) return cached;
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return null;
  cached = createClient(url, service, { auth: { persistSession: false } });
  return cached;
}

async function aesKey(): Promise<CryptoKey | null> {
  const secret = Deno.env.get("KEY_VAULT_SECRET")?.trim();
  if (!secret) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

export async function encryptKey(plain: string): Promise<{ cipher: string; iv: string } | null> {
  const key = await aesKey();
  if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plain),
  );
  return { cipher: b64(cipher), iv: b64(iv.buffer) };
}

export async function decryptKey(cipher: string, iv: string): Promise<string | null> {
  const key = await aesKey();
  if (!key) return null;
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unb64(iv) },
      key,
      unb64(cipher),
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

/** Stores one new key for a provider. Returns false when encryption is unavailable. */
export async function saveVaultKey(
  provider: string,
  plain: string,
  label?: string | null,
): Promise<boolean> {
  const admin = vaultAdmin();
  const enc = await encryptKey(plain.trim());
  if (!admin || !enc) return false;
  const { error } = await admin.from("service_keys").insert({
    provider,
    key_cipher: enc.cipher,
    key_iv: enc.iv,
    key_hint: plain.trim().slice(-4),
    label: label ?? null,
  });
  if (error) {
    console.error("keyVault insert failed", error.message);
    return false;
  }
  return true;
}

/**
 * Active keys for a provider, least-recently-used first, already decrypted.
 * Callers walk the list and report each outcome so rotation/banning works.
 */
export async function vaultKeys(provider: string, limit = 10): Promise<VaultKey[]> {
  const admin = vaultAdmin();
  if (!admin) return [];
  const { data, error } = await admin
    .from("service_keys")
    .select("id,key_cipher,key_iv")
    .eq("provider", provider)
    .eq("status", "active")
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error || !data?.length) return [];
  const out: VaultKey[] = [];
  for (const row of data as Array<Record<string, string>>) {
    const key = await decryptKey(row.key_cipher, row.key_iv);
    if (key && key.length > 8) out.push({ id: row.id, key });
  }
  if (out.length) {
    void admin
      .from("service_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", out[0].id);
  }
  return out;
}

/** A success clears the failure streak so a healthy key is never banned. */
export async function noteKeyOk(id: string | null | undefined): Promise<void> {
  if (!id) return;
  const admin = vaultAdmin();
  if (!admin) return;
  await admin
    .from("service_keys")
    .update({ fail_count: 0, last_error: null, last_used_at: new Date().toISOString() })
    .eq("id", id);
}

/** Records a failure; bans the key on the third one in a row. */
export async function noteKeyFail(
  id: string | null | undefined,
  reason: string,
): Promise<void> {
  if (!id) return;
  const admin = vaultAdmin();
  if (!admin) return;
  const { data } = await admin
    .from("service_keys")
    .select("fail_count")
    .eq("id", id)
    .maybeSingle();
  const next = Number((data as { fail_count?: number } | null)?.fail_count ?? 0) + 1;
  const banned = next >= MAX_FAILS;
  await admin
    .from("service_keys")
    .update({
      fail_count: next,
      last_error: reason.slice(0, 400),
      status: banned ? "banned" : "active",
      banned_at: banned ? new Date().toISOString() : null,
    })
    .eq("id", id);
}

/** Counts per provider for the admin bot. */
export async function vaultStats(): Promise<Record<string, { active: number; banned: number }>> {
  const admin = vaultAdmin();
  const out: Record<string, { active: number; banned: number }> = {};
  if (!admin) return out;
  const { data } = await admin.from("service_keys").select("provider,status");
  for (const row of (data ?? []) as Array<{ provider: string; status: string }>) {
    out[row.provider] ??= { active: 0, banned: 0 };
    if (row.status === "banned") out[row.provider].banned += 1;
    else out[row.provider].active += 1;
  }
  return out;
}

/** Un-bans everything (admin action from the bot). */
export async function unbanAll(): Promise<number> {
  const admin = vaultAdmin();
  if (!admin) return 0;
  const { data } = await admin
    .from("service_keys")
    .update({ status: "active", fail_count: 0, banned_at: null })
    .eq("status", "banned")
    .select("id");
  return (data ?? []).length;
}
