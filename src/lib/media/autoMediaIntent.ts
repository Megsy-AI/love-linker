/**
 * @doc Auto-routing for media requests typed in normal chat mode.
 *
 * Users usually just say "اعملي صورة قطة" without switching the composer to
 * Images/Video mode. Before this router, that turn went to the text model,
 * which has no image tool and could only describe the picture. Now a plain
 * generation ask is detected here and handed to the media pipeline with a
 * sensible default model.
 */
import { supabase } from "@/integrations/supabase/client";
import { filterImageModels } from "@/lib/mediaModelPolicy";
import type { MediaModelChoice } from "@/components/chat/media/MediaModelPickerSheet";

export type MediaIntent = "image" | "video" | null;

const NEGATIONS = /(?:بلاش|من\s*غير|بدون|لا\s*ت|don'?t|do\s*not|no\s+need)\s*(?:صور|فيديو|image|video|picture)/i;

const VERB_AR = /(?:اعمل|إعمل|أعمل|اعملي|ارسم|إرسم|أرسم|صمم|صمّم|كوّن|كون|ولّد|ولد|انشئ|أنشئ|انشا|جهزلي|جهّزلي|هاتلي|عايز|عاوز|محتاج|ابغى|أبغى|سوي|سوّي)/;
const IMAGE_NOUN_AR = /(?:صورة|صوره|صور|بوستر|بوسترات|لوجو|شعار|خلفية|رسمة|رسمه|تصميم|ايقونة|أيقونة)/;
const VIDEO_NOUN_AR = /(?:فيديو|فيديوهات|مقطع\s*فيديو|كليب|ريلز|ريل)/;

const IMAGE_EN = /\b(?:generate|create|make|draw|design|render|paint|produce)\b[^.\n]{0,40}\b(?:image|picture|photo|poster|logo|illustration|wallpaper|icon|artwork)\b/i;
const IMAGE_REQUEST_EN = /\b(?:show|give|send)\s+(?:me\s+)?(?:an?\s+|the\s+)?(?:image|picture|photo|poster|logo|illustration|wallpaper|icon|artwork)\b/i;
const IMAGE_REQUEST_AR = /(?:وريني|أرني|ارني|هات(?:لي)?|جيب(?:لي)?)\s*(?:صورة|صوره|صور|بوستر|لوجو|شعار|خلفية|رسمة|رسمه|تصميم)/i;
const VIDEO_EN = /\b(?:generate|create|make|render|produce|animate)\b[^.\n]{0,40}\b(?:video|clip|animation|reel)\b/i;
const IMAGE_OF_EN = /(?:^|[.!?]\s*|\b(?:want|need|please|can you|could you)\s+)(?:an?\s+|the\s+)?(?:image|picture|photo|poster|logo|illustration|wallpaper|icon|artwork)\s+(?:of|for|showing|depicting)\b/i;
const VIDEO_OF_EN = /(?:^|[.!?]\s*|\b(?:want|need|please|can you|could you)\s+)(?:an?\s+|the\s+)?(?:video|clip|animation|reel)\s+(?:of|for|showing|where)\b/i;
const IMAGE_OF_AR = /(?:عايز|عاوز|محتاج|نفسي\s*في|ممكن)?\s*(?:صورة|صوره|صور|بوستر|لوجو|شعار|خلفية|رسمة|رسمه|تصميم)\s+(?:ل|عن|بتوضح|توضح|فيها|لـ)/i;
const VIDEO_OF_AR = /(?:عايز|عاوز|محتاج|نفسي\s*في|ممكن)?\s*(?:فيديو|مقطع\s*فيديو|كليب|ريلز|ريل)\s+(?:ل|عن|بيوضح|يوضح|فيه|لـ)/i;

/** Regex-only detection — runs before every send, so it must not do network I/O. */
export function detectMediaIntent(text: string): MediaIntent {
  const raw = (text || "").trim();
  if (!raw || raw.length > 600) return null;
  if (NEGATIONS.test(raw)) return null;

  const hasVerb = VERB_AR.test(raw);
  if ((hasVerb && VIDEO_NOUN_AR.test(raw)) || VIDEO_EN.test(raw) || VIDEO_OF_EN.test(raw) || VIDEO_OF_AR.test(raw)) return "video";
  if ((hasVerb && IMAGE_NOUN_AR.test(raw)) || IMAGE_EN.test(raw) || IMAGE_REQUEST_EN.test(raw) || IMAGE_REQUEST_AR.test(raw) || IMAGE_OF_EN.test(raw) || IMAGE_OF_AR.test(raw)) return "image";
  return null;
}

function toChoice(row: any, type: "image" | "video"): MediaModelChoice {
  return {
    slug: row.slug || row.id,
    name: row.name || row.slug || "Model",
    provider: row.provider || "",
    credits: Number(row.credits ?? row.credit_cost ?? 0),
    thumbnail: row.thumbnail_url || row.icon_url || undefined,
    type,
    isPremium: !!row.is_premium,
  };
}

/**
 * Picks the default model for an auto-routed media turn: the cheapest free
 * (DeAPI) model when one exists, otherwise the first active model.
 */
export async function pickDefaultMediaModel(
  type: "image" | "video",
): Promise<MediaModelChoice | null> {
  const table = type === "video" ? "video_models" : "image_models";
  const { data, error } = await (supabase as any)
    .from(table)
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  let rows: any[] = Array.isArray(data) && !error ? data : [];
  if (type === "image") {
    // The catalogue table can be empty on a fresh backend; the curated models
    // the picker already shows are the same list, so use them here too instead
    // of leaving the user with no model at all.
    const { withCuratedImageModels } = await import("@/lib/curatedImageModels");
    rows = filterImageModels(withCuratedImageModels(rows as any) as any) as any[];
  }
  if (rows.length === 0) return null;

  const isFree = (r: any) =>
    /deapi/i.test(`${r.slug || ""} ${r.provider || ""} ${r.name || ""}`) ||
    Number(r.credits ?? r.credit_cost ?? 0) === 0;
  const free = rows.filter((r: any) => isFree(r) && !r.is_premium && !r.isPremium);
  const pick = free[0] || rows.find((r: any) => !r.is_premium && !r.isPremium) || rows[0];
  return pick ? toChoice(pick, type) : null;
}

