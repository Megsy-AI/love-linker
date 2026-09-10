/**
 * @doc Detects "make me a document/file" asks typed in the unified chat.
 *
 * The unified chat should reach every service from plain language: the user
 * never has to pick a chip. Slides, media, research and the computer agent
 * already auto-route; this covers the document writer (Word/PDF style
 * deliverables) with the same discipline — an explicit deliverable noun plus
 * clear creation intent, and never when the ask is negated.
 */

const DOC_NOUN =
  /(\b(document|word\s*(file|document)?|docx?|pdf|report\s*file|resume|cv|cover\s*letter|contract|agreement|proposal|business\s*plan|essay|article|whitepaper|letter|invoice|policy|manual|handbook)\b|مستند|وثيقة|ملف\s*(وورد|ورد|pdf|بي\s*دي\s*اف)|وورد|مقال|مقالة|مقالا|بحث\s*مكتوب|سيرة\s*ذاتية|خطاب|رساله\s*رسمية|رسالة\s*رسمية|عقد|اتفاقية|عرض\s*سعر|خطة\s*عمل|خطة\s*تسويق|كتيب|دليل|لائحة|سياسة|فاتورة)/i;

const CREATE_INTENT =
  /(\b(create|generate|make|write|build|design|prepare|draft|need|want|give\s*me)\b|اعمل|إعمل|اعملي|إعملي|اعملى|اكتب|أكتب|اكتبلي|انشئ|أنشئ|اصنع|صمم|جهز|حضّر|حضر|عايز|عاوز|عايزة|عاوزة|محتاج|محتاجة|اريد|أريد|ابغى|سوي|سوّي|هات|هاتلي)/i;

const NEGATION =
  /(\b(cancel(?:led)?|stop|don't|do not|without|no\s+(document|file|pdf))\b|لغيت|الغيت|إلغ|الغاء|إلغاء|وقف|اوقف|مش\s*عايز|مش\s*عاوز|لا\s*تعمل|متعملش|بلاش)/i;

/** True when a plain chat message is really a request for a written document. */
export function shouldAutoStartDocs(text: string): boolean {
  const value = (text || "").trim();
  if (value.length < 12) return false;
  if (NEGATION.test(value)) return false;
  return DOC_NOUN.test(value) && CREATE_INTENT.test(value);
}
