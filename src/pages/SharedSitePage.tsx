/** @doc Public viewer for a published site (`/s/:slug`) — renders the compiled HTML stored in `generated_sites` inside a sandboxed frame. */
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/common/SEOHead";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { withRuntimeShim } from "@/lib/publishProject";

const SharedSitePage = () => {
  const { slug } = useParams();
  const [html, setHtml] = useState<string | null>(null);
  const [title, setTitle] = useState("Shared site");
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!slug) return setState("missing");
      const { data } = await supabase
        .from("generated_sites")
        .select("title, html_compiled, preview_url, published_url, is_public")
        .eq("share_slug", slug)
        .eq("is_public", true)
        .maybeSingle();
      if (!alive) return;
      const compiled = (data as any)?.html_compiled as string | null;
      if (!data || !compiled) {
        // Sites deployed to an external host only keep a URL, no HTML copy.
        const external = ((data as any)?.preview_url || "") as string;
        if (external) {
          window.location.replace(external);
          return;
        }
        setState("missing");
        return;
      }
      setTitle(((data as any).title as string) || "Shared site");
      setHtml(withRuntimeShim(compiled));
      setState("ready");
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const download = () => {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(title || "site").replace(/[^\w\u0600-\u06FF-]+/g, "-").slice(0, 40)}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const openRaw = useMemo(
    () => () => {
      if (!html) return;
      const w = window.open("", "_blank");
      if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
      }
    },
    [html],
  );

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (state === "missing") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <SEOHead title="Site not found — Megsy" description="This shared site is unavailable." path={`/s/${slug ?? ""}`} />
        <h1 className="text-xl font-semibold text-foreground">This site is unavailable</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The link may have expired, or the owner made it private.
        </p>
        <Link to="/chat" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          Build your own with Megsy
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEOHead
        title={`${title} — built with Megsy`}
        description={`${title}, a site built with Megsy AI.`}
        path={`/s/${slug ?? ""}`}
      />
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">Built with Megsy</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={openRaw}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </button>
          <button
            onClick={download}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <Download className="h-3.5 w-3.5" /> HTML
          </button>
        </div>
      </header>
      <iframe
        title={title}
        srcDoc={html ?? ""}
        sandbox="allow-scripts allow-popups allow-forms"
        className="min-h-0 w-full flex-1 border-0 bg-white"
      />
    </div>
  );
};

export default SharedSitePage;
