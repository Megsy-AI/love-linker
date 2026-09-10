/** @doc Edge-function copy of src/lib/search/webSearchCore.ts — server-only web
 *  search core: You.com search with smart key rotation from the Supabase key
 *  pool (provider "y"), keyless Brave/DuckDuckGo/Google News fallback. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  results: WebSearchResult[];
  error?: string;
}

function serverClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Supabase server credentials are not configured");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function normalise(payload: any): WebSearchResult[] {
  const buckets: any[] = [];
  if (Array.isArray(payload?.results)) buckets.push(...payload.results);
  if (Array.isArray(payload?.hits)) buckets.push(...payload.hits);
  if (Array.isArray(payload?.web?.results)) buckets.push(...payload.web.results);
  if (Array.isArray(payload?.data?.results)) buckets.push(...payload.data.results);
  if (Array.isArray(payload?.results?.web)) buckets.push(...payload.results.web);

  const out: WebSearchResult[] = [];
  for (const item of buckets) {
    const url = item?.url || item?.link || item?.source_url;
    if (!url) continue;
    const snippets = Array.isArray(item?.snippets) ? item.snippets.join(" ") : "";
    const snippet =
      snippets ||
      item?.snippet ||
      item?.description ||
      item?.text ||
      item?.content ||
      "";
    out.push({
      title: String(item?.title || item?.name || url).slice(0, 220),
      url: String(url),
      snippet: String(snippet).replace(/\s+/g, " ").slice(0, 900),
    });
  }
  // De-duplicate by URL.
  const seen = new Set<string>();
  return out.filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true)));
}

async function callYou(apiKey: string, query: string, count: number, offset = 0) {
  const url = new URL("https://api.you.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("count", String(Math.min(Math.max(count, 1), 20)));
  if (offset > 0) url.searchParams.set("offset", String(offset));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const resp = await fetch(url.toString(), {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      signal: controller.signal,
    });
    const text = await resp.text();
    if (!resp.ok) {
      return { ok: false as const, status: resp.status, error: text.slice(0, 300) };
    }
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false as const, status: 502, error: "invalid json" };
    }
    return { ok: true as const, results: normalise(json) };
  } catch (err) {
    return {
      ok: false as const,
      status: 599,
      error: err instanceof Error ? err.message : "network error",
    };
  } finally {
    clearTimeout(timer);
  }
}

function decodeHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/**
 * Official search APIs, used before any HTML-scraping fallback because cloud
 * IPs are frequently blocked by the scraped endpoints. Each one activates only
 * when its function secret is present. Locale is inferred from the query so
 * Arabic questions get Arabic Google/Brave results instead of irrelevant
 * US-English hits.
 */
const QUERY_LOCALE = (query: string): { gl: string; hl: string } =>
  /[\u0600-\u06FF]/.test(query) ? { gl: "sa", hl: "ar" } : { gl: "us", hl: "en" };

async function apiSearch(query: string, count: number): Promise<WebSearchResult[]> {
  const brave = Deno.env.get("BRAVE_API_KEY")?.trim();
  const locale = QUERY_LOCALE(query);
  if (brave) {
    try {
      const url = new URL("https://api.search.brave.com/res/v1/web/search");
      url.searchParams.set("q", query);
      url.searchParams.set("count", String(Math.min(Math.max(count, 1), 20)));
      url.searchParams.set("search_lang", locale.hl);
      url.searchParams.set("country", locale.gl.toUpperCase());
      const resp = await fetch(url, {
        headers: { Accept: "application/json", "X-Subscription-Token": brave },
      });
      if (resp.ok) {
        const out = normalise(await resp.json());
        if (out.length) return out.slice(0, count);
      } else {
        console.error(`brave api HTTP ${resp.status}`);
      }
    } catch (error) {
      console.error("brave api failed", error);
    }
  }

  const tavily = Deno.env.get("TAVILY_API_KEY")?.trim();
  if (tavily) {
    try {
      const resp = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tavily}` },
        body: JSON.stringify({ query, max_results: Math.min(Math.max(count, 1), 20) }),
      });
      if (resp.ok) {
        const out = normalise(await resp.json());
        if (out.length) return out.slice(0, count);
      } else {
        console.error(`tavily HTTP ${resp.status}`);
      }
    } catch (error) {
      console.error("tavily failed", error);
    }
  }

  const serper = (
    Deno.env.get("Sreper") ||
    Deno.env.get("sreper") ||
    Deno.env.get("SREPER") ||
    Deno.env.get("SREPER_API_KEY") ||
    Deno.env.get("Serper") ||
    Deno.env.get("serper") ||
    Deno.env.get("SERPER") ||
    Deno.env.get("SERPER_API_KEY") ||
    Deno.env.get("SERPER_KEY") ||
    ""
  ).trim();
  if (serper) {
    try {
      const body = JSON.stringify({
        q: query,
        num: Math.min(Math.max(count, 1), 20),
        gl: locale.gl,
        hl: locale.hl,
      });
      console.log(`serper req q=${JSON.stringify(query)} bytes=${new TextEncoder().encode(body).length}`);
      const resp = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-KEY": serper },
        body,
      });
      console.log(`serper resp ${resp.status}`);
      if (resp.ok) {
        const data = await resp.json();
        const out = (data.organic ?? []).map((r: any) => ({
          title: String(r.title ?? r.link ?? "").slice(0, 220),
          url: String(r.link ?? ""),
          snippet: String(r.snippet ?? "").slice(0, 900),
        })).filter((r: WebSearchResult) => r.url);
        if (out.length) return out.slice(0, count);
      } else {
        console.error(`serper HTTP ${resp.status}`);
      }
    } catch (error) {
      console.error("serper failed", error);
    }
  }

  return [];
}


async function braveSearch(query: string, count: number, offset = 0): Promise<WebSearchResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const url = new URL("https://search.brave.com/search");
    url.searchParams.set("q", query);
    const page = Math.floor(Math.max(offset, 0) / 20);
    if (page > 0) url.searchParams.set("offset", String(page));
    const resp = await fetch(url.toString(), {
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });
    if (!resp.ok) return { results: [], error: `brave HTTP ${resp.status}` };
    const html = await resp.text();
    const results: WebSearchResult[] = [];
    const seen = new Set<string>();
    for (const block of html.split('<div class="snippet ').slice(1)) {
      if (!block.includes('data-type="web"')) continue;
      const href = block.match(/href="(https?:\/\/[^"]+)"/)?.[1];
      if (!href || /search\.brave\.com|imgs\.search\.brave/.test(href)) continue;
      const link = decodeHtml(href.replace(/&amp;/g, "&"));
      if (seen.has(link)) continue;
      seen.add(link);
      const title = decodeHtml(
        block.match(/class="title[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? link,
      ).slice(0, 220);
      const snippet = decodeHtml(
        block.match(/class="content[ "][^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] ??
          block.match(/class="snippet-description[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] ??
          block.match(/class="[^"]*snippet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] ??
          "",
      ).slice(0, 900);
      results.push({ title, url: link, snippet });
      if (results.length >= count) break;
    }
    return results.length ? { results } : { results: [], error: "no results" };
  } catch (err) {
    return { results: [], error: err instanceof Error ? err.message : "search failed" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Bing's public RSS view of normal web results. Keyless, works from cloud IPs
 * (unlike the DuckDuckGo HTML endpoint, which serves an anomaly page there),
 * and returns ~10 general web results per query in any language.
 */
async function bingRssSearch(query: string, count: number, offset = 0): Promise<WebSearchResult[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const url = new URL("https://www.bing.com/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "rss");
    url.searchParams.set("count", String(Math.min(Math.max(count, 1), 20)));
    if (offset > 0) url.searchParams.set("first", String(offset + 1));
    const resp = await fetch(url.toString(), {
      headers: { "User-Agent": BROWSER_UA, Accept: "application/rss+xml,text/xml,*/*" },
      signal: controller.signal,
    });
    if (!resp.ok) return [];
    const xml = await resp.text();
    const out: WebSearchResult[] = [];
    const seen = new Set<string>();
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(xml)) && out.length < count) {
      const block = m[1];
      const link = decodeHtml(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "");
      if (!/^https?:\/\//.test(link) || /(^https?:\/\/)?(www\.)?bing\.com/.test(link)) continue;
      if (seen.has(link)) continue;
      seen.add(link);
      out.push({
        title: decodeHtml(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? link).slice(0, 220),
        url: link,
        snippet: decodeHtml(block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "").slice(0, 900),
      });
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function googleNewsSearch(
  query: string,
  count: number,
  offset = 0,
): Promise<WebSearchResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const url = new URL("https://news.google.com/rss/search");
    url.searchParams.set("q", query);
    url.searchParams.set("hl", "en-US");
    url.searchParams.set("gl", "US");
    url.searchParams.set("ceid", "US:en");
    const resp = await fetch(url.toString(), {
      headers: { "User-Agent": BROWSER_UA, Accept: "application/rss+xml, application/xml" },
      signal: controller.signal,
    });
    if (!resp.ok) return { results: [], error: `news HTTP ${resp.status}` };
    const xml = await resp.text();
    const all: WebSearchResult[] = [];
    const seen = new Set<string>();
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(xml))) {
      const block = m[1];
      const link = decodeHtml(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "");
      if (!/^https?:\/\//.test(link) || seen.has(link)) continue;
      seen.add(link);
      const source = decodeHtml(block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "");
      const title = decodeHtml(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? link);
      const date = decodeHtml(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "");
      all.push({
        title: title.slice(0, 220),
        url: link,
        snippet: [source, date, decodeHtml(block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "")]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 900),
      });
    }
    const page = all.slice(offset, offset + count);
    return page.length ? { results: page } : { results: [], error: "no results" };
  } catch (err) {
    return { results: [], error: err instanceof Error ? err.message : "search failed" };
  } finally {
    clearTimeout(timer);
  }
}

async function duckSearch(query: string, count: number, offset = 0): Promise<WebSearchResult[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const resp = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "User-Agent": BROWSER_UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Language": "en-US,en;q=0.9",
      },
      body: new URLSearchParams({ q: query, s: String(Math.max(offset, 0)) }).toString(),
      signal: controller.signal,
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const out: WebSearchResult[] = [];
    const seen = new Set<string>();
    const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && out.length < count) {
      let link = decodeHtml(m[1].replace(/&amp;/g, "&"));
      const wrapped = link.match(/[?&]uddg=([^&]+)/)?.[1];
      if (wrapped) link = decodeURIComponent(wrapped);
      if (!/^https?:\/\//.test(link) || seen.has(link)) continue;
      seen.add(link);
      out.push({
        title: decodeHtml(m[2]).slice(0, 220),
        url: link,
        snippet: decodeHtml(m[3]).slice(0, 900),
      });
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

let braveQueue: Promise<unknown> = Promise.resolve();
let lastBraveAt = 0;

async function bravePaced(query: string, count: number, offset: number): Promise<WebSearchResult[]> {
  const run = braveQueue.then(async () => {
    const wait = Math.max(0, 1300 - (Date.now() - lastBraveAt));
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastBraveAt = Date.now();
    const brave = await braveSearch(query, count, offset);
    return brave.results;
  });
  braveQueue = run.catch(() => undefined);
  return run.catch(() => [] as WebSearchResult[]);
}

async function keylessSearch(query: string, count: number, offset = 0): Promise<WebSearchResponse> {
  const viaApi = await apiSearch(query, count);
  if (viaApi.length) return { results: viaApi };
  const [bing, brave, duck, news] = await Promise.all([
    bingRssSearch(query, count, offset),
    bravePaced(query, count, offset),
    duckSearch(query, count, offset),
    googleNewsSearch(query, count, offset),
  ]);

  const seen = new Set<string>();
  const merged: WebSearchResult[] = [];
  for (const item of [...bing, ...brave, ...duck, ...news.results]) {
    if (seen.has(item.url) || merged.length >= count) continue;
    seen.add(item.url);
    merged.push(item);
  }
  return merged.length
    ? { results: merged }
    : { results: [], error: news.error ?? "every search source returned nothing" };
}

export async function webSearch(query: string, count = 8, offset = 0): Promise<WebSearchResponse> {
  const trimmed = (query || "").trim();
  console.log(`serperKeyLen=${(Deno.env.get("Sreper")||Deno.env.get("sreper")||Deno.env.get("SREPER")||Deno.env.get("SREPER_API_KEY")||Deno.env.get("Serper")||Deno.env.get("serper")||Deno.env.get("SERPER")||Deno.env.get("SERPER_API_KEY")||Deno.env.get("SERPER_KEY")||"").trim().length} braveLen=${(Deno.env.get("BRAVE_API_KEY")||"").trim().length} tavilyLen=${(Deno.env.get("TAVILY_API_KEY")||"").trim().length}`);
  console.log(`webSearch q=${JSON.stringify(trimmed)} codepoints=${[...trimmed].slice(0,8).map((c)=>c.codePointAt(0)?.toString(16)).join(",")}`);
  if (!trimmed) return { results: [], error: "empty query" };

  let supabase: ReturnType<typeof serverClient>;
  try {
    supabase = serverClient();
  } catch {
    return keylessSearch(trimmed, count, offset);
  }
  let lastError = "no keys configured";

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data, error } = await supabase.rpc("next_provider_key", { p_provider: "y" });
    const row = Array.isArray(data) ? (data[0] as { id: string; api_key: string } | undefined) : undefined;
    if (error) return keylessSearch(trimmed, count, offset);
    if (!row?.api_key) return keylessSearch(trimmed, count, offset);

    const result = await callYou(row.api_key, trimmed, count, offset);
    if (result.ok && result.results.length) {
      await supabase.rpc("report_provider_key_success", { p_key_id: row.id });
      return { results: result.results };
    }
    if (result.ok) {
      await supabase.rpc("report_provider_key_success", { p_key_id: row.id });
      return keylessSearch(trimmed, count, offset);
    }
    lastError = `HTTP ${result.status}`;
    await supabase.rpc("report_provider_key_failure", {
      p_key_id: row.id,
      p_error: `${result.status}: ${result.error}`.slice(0, 300),
    });
  }

  return { results: [], error: lastError };
}
