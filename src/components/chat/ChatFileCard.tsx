import { useMemo, useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  File as FileIcon,
  Link2,
  Download,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ChatFileAttachment {
  name: string;
  type: string;
  data?: string;
  size?: number;
}

const extOf = (name: string) => (name.split(".").pop() || "").toLowerCase();

const PREVIEWABLE_TEXT_EXT = new Set(["txt", "md", "markdown", "csv", "json", "log"]);
const PREVIEWABLE_IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);

function iconFor(ext: string) {
  if (ext === "pdf") return FileText;
  if (["csv", "xls", "xlsx"].includes(ext)) return FileSpreadsheet;
  if (["json", "js", "ts", "tsx", "jsx", "py", "html", "css"].includes(ext)) return FileCode;
  return FileIcon;
}

function formatSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Rough size estimate for base64 data URLs when no explicit size is given. */
function estimateDataUrlBytes(dataUrl?: string) {
  if (!dataUrl?.startsWith("data:")) return undefined;
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
}

/**
 * Compact card for a shared file (report/pdf/doc/csv/md/txt/link) rendered
 * inline in a chat bubble. Tapping opens a lightweight full preview dialog
 * (pdf/text/markdown/images) with a download action.
 */
export default function ChatFileCard({ file }: { file: ChatFileAttachment }) {
  const [open, setOpen] = useState(false);
  const ext = useMemo(() => extOf(file.name), [file.name]);
  const isLink = file.type === "link";
  const Icon = isLink ? Link2 : iconFor(ext);
  const size = formatSize(file.size ?? estimateDataUrlBytes(file.data));
  const label = isLink ? "Link" : ext ? ext.toUpperCase() : "File";

  const canPreview = !isLink && !!file.data;
  const isPdf = ext === "pdf";
  const isImage = PREVIEWABLE_IMAGE_EXT.has(ext);
  const isText = PREVIEWABLE_TEXT_EXT.has(ext);

  return (
    <>
      <button
        type="button"
        onClick={() => (canPreview ? setOpen(true) : isLink && file.data ? window.open(file.data, "_blank") : undefined)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-muted/70 border border-border hover:bg-muted transition-colors max-w-[220px] text-start"
      >
        <span className="shrink-0 w-8 h-8 rounded-xl bg-foreground/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-foreground/70" />
        </span>
        <span className="min-w-0 flex flex-col">
          <span className="truncate text-[12.5px] font-medium text-foreground leading-tight">{file.name}</span>
          <span className="text-[10.5px] text-muted-foreground leading-tight">
            {label}
            {size ? ` · ${size}` : ""}
          </span>
        </span>
      </button>

      {canPreview && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg w-[92vw] p-0 overflow-hidden gap-0">
            <DialogHeader className="px-4 py-3 border-b border-border flex flex-row items-center justify-between gap-2 space-y-0">
              <DialogTitle className="truncate text-sm font-semibold">{file.name}</DialogTitle>
              <div className="flex items-center gap-1 shrink-0">
                {file.data && (
                  <a
                    href={file.data}
                    download={file.name}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-foreground/60 hover:text-foreground hover:bg-foreground/10 transition-colors"
                    aria-label="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-auto bg-background">
              {isPdf && (
                <iframe title={file.name} src={file.data} className="w-full h-[70vh] border-0" />
              )}
              {isImage && (
                <img src={file.data} alt={file.name} className="w-full h-auto object-contain" />
              )}
              {isText && <TextPreview dataUrl={file.data!} />}
              {!isPdf && !isImage && !isText && (
                <div className="p-6 text-sm text-muted-foreground text-center">
                  No inline preview available for this file type.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function TextPreview({ dataUrl }: { dataUrl: string }) {
  const [text, setText] = useState<string | null>(null);
  useMemo(() => {
    try {
      if (dataUrl.startsWith("data:")) {
        const [, b64] = dataUrl.split(",");
        const decoded = decodeURIComponent(
          atob(b64)
            .split("")
            .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
            .join(""),
        );
        setText(decoded);
      }
    } catch {
      setText(null);
    }
    return null;
  }, [dataUrl]);

  return (
    <pre className="p-4 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words font-mono text-foreground/85">
      {text ?? "Couldn't read this file for preview."}
    </pre>
  );
}
