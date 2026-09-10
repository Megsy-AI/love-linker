/** @doc Serverless chat and deep-research endpoints consolidated for Vercel Hobby. */
import { streamChatProxy, type ChatProxyPayload } from "../src/lib/chat/proxyCore";
import { streamDeepResearch } from "../src/lib/research/deepResearchCore";
import { guardApiRequest, guardResponse } from "../src/lib/api/apiGuard";
import { apiHeaders } from "../src/lib/api/authenticateRequest";

export const config = { runtime: "nodejs", maxDuration: 300 };

export default async function handler(req: Request): Promise<Response> {
  const headers = apiHeaders(req);
  const url = new URL(req.url);
  const isDeepResearch =
    url.pathname.endsWith("/deep-research") || url.searchParams.get("route") === "deep-research";

  if (req.method === "OPTIONS") {
    return new Response(isDeepResearch ? null : "ok", {
      status: isDeepResearch ? 204 : 200,
      headers,
    });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  if (isDeepResearch) {
    const guard = await guardApiRequest(req, "deep-research");
    if (!guard.ok) return guardResponse(guard, headers);
    const payload = await req.json().catch(() => null);
    return streamDeepResearch(payload ?? {}, req);
  }

  const payload = (await req.json().catch(() => null)) as ChatProxyPayload | null;
  return streamChatProxy(payload ?? {}, headers as unknown as Record<string, string>);
}
