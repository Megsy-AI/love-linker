/** @doc Full-page preview for a generated document (Docs artifact). Clean, minimal design with A4 paper on a neutral surface. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { loadDocHtml } from "@/lib/agent/docs/htmlCache";
import { patchDocHtml, waitForIframeReady } from "@/lib/agent/docs/patchHtml";
import { useFullscreenBodyClass } from "@/hooks/useFullscreenBodyClass";

const DocumentPreviewPage = () => {
  const { artifactId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  useFullscreenBodyClass(true);

  const stateHtml = (location.state as { html?: string; title?: string } | null)?.html;
  const stateTitle = (location.state as { title?: string } | null)?.title;

  const [html, setHtml] = useState<string | null>(stateHtml ?? null);
  const [title] = useState<string>(stateTitle || "Document");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (html) return;
    const cached = loadDocHtml(artifactId);
    if (cached) setHtml(cached);
  }, [artifactId, html]);

  const filenameBase = useMemo(() => {
    const safe = (title || "document").replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 60);
    return safe || "document";
  }, [title]);

  const patched = useMemo(() => (html ? patchDocHtml(html) : ""), [html]);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/chat");
  };

  const downloadHtml = () => {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /** Word (.doc) export — Word opens this HTML-based format natively. */
  const downloadWord = () => {
    if (!patched) return;
    const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body>${patched}</body></html>`;
    const blob = new Blob(["\ufeff", doc], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}.doc`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Word file downloaded");
  };

  /** Excel export: every table in the document becomes a sheet-ready file. */
  const downloadExcel = () => {
    if (!patched) return;
    const parsed = new DOMParser().parseFromString(patched, "text/html");
    const tables = Array.from(parsed.querySelectorAll("table"));
    if (!tables.length) {
      toast.error("This document has no table to export");
      return;
    }
    const body = tables.map((t) => t.outerHTML).join("<br/>");
    const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${body}</body></html>`;
    const blob = new Blob(["\ufeff", doc], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}.xls`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Excel file downloaded");
  };

  const downloadPdf = async () => {
    if (!html) return;
    setExporting(true);
    toast.loading("Rendering PDF…", { id: "pdf-export" });
    try {
      const { renderDocPdf } = await import("@/lib/agent/docs/renderPdf");
      const data = await renderDocPdf({ html: patched, title: filenameBase });
      if (!data?.url) throw new Error("render failed");
      const resp = await fetch(data.url);
      if (!resp.ok) throw new Error(`download failed (${resp.status})`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filenameBase}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success("PDF downloaded", { id: "pdf-export" });
    } catch (e) {
      // No PDF service configured (or it failed): fall back to the browser's
      // own "Save as PDF" print dialog so the user still gets a real file.
      console.error("[docs] downloadPdf failed", e);
      toast.info("Opening the print dialog — choose “Save as PDF”.", { id: "pdf-export" });
      await printDoc();
    } finally {
      setExporting(false);
    }
  };


  const printDoc = async () => {
    if (!patched) return;
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
    iframe.setAttribute("aria-hidden", "true");
    iframe.title = filenameBase;
    document.body.appendChild(iframe);
    iframe.srcdoc = patched;
    try {
      await waitForIframeReady(iframe, 8000);
      const win = iframe.contentWindow;
      if (!win) return;
      win.focus();
      win.print();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {
          /* noop */
        }
      }, 60_000);
    }
  };

  return (
    <main className="min-h-dvh flex flex-col bg-muted/40">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/60 bg-background/90 px-3 py-2 backdrop-blur">
        <button
          onClick={goBack}
          aria-label="Back"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-foreground">{title}</div>
        </div>
      </header>

      {/* Paper stage */}
      <div className="flex-1 overflow-auto px-2 py-2 sm:px-4 sm:py-3">
        {html ? (
          <div className="mx-auto w-full max-w-[820px]">
            <div className="overflow-hidden rounded-md bg-white shadow-[0_6px_24px_hsl(var(--foreground)/0.10)] ring-1 ring-border/40">
              <iframe
                ref={iframeRef}
                title={title}
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals"
                srcDoc={patched}
                className="block w-full border-0 bg-white"
                style={{ height: "calc(100dvh - 132px)" }}
              />
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-full max-w-[820px] items-center justify-center py-24 text-sm text-muted-foreground">
            Preview is not available.
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div
        className="sticky bottom-0 z-10 flex flex-wrap items-center justify-center gap-2 border-t border-border/60 bg-background/95 px-3 pt-2 backdrop-blur"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
      >
        <button
          onClick={downloadPdf}
          disabled={!html || exporting}
          className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-[12px] font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-45"
        >
          {exporting ? "Preparing…" : "PDF"}
        </button>
        <button
          onClick={downloadWord}
          disabled={!html}
          className="inline-flex h-10 items-center rounded-full border border-border bg-background px-5 text-[12px] font-semibold text-foreground transition hover:bg-muted disabled:opacity-45"
        >
          Word
        </button>
        <button
          onClick={downloadExcel}
          disabled={!html}
          className="inline-flex h-10 items-center rounded-full border border-border bg-background px-5 text-[12px] font-semibold text-foreground transition hover:bg-muted disabled:opacity-45"
        >
          Excel
        </button>
        <button
          onClick={downloadHtml}
          disabled={!html}
          className="inline-flex h-10 items-center rounded-full border border-border bg-background px-5 text-[12px] font-semibold text-foreground transition hover:bg-muted disabled:opacity-45"
        >
          HTML
        </button>
      </div>

    </main>
  );
};

export default DocumentPreviewPage;
