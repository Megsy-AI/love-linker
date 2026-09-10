/**
 * @doc In-app preview for files an agent produced.
 *
 * Tapping a file chip opens it here instead of leaving the app: images, video,
 * PDF and HTML render directly; Office documents render through an embedded
 * viewer. A download link stays available for everything.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface PreviewFile {
  url: string;
  name: string;
  type?: string | null;
}

const ext = (name: string, url: string) =>
  ((name.split("?")[0].split(".").pop() || url.split("?")[0].split(".").pop() || "") as string).toLowerCase();

export default function FilePreviewDialog({
  file,
  onClose,
}: {
  file: PreviewFile | null;
  onClose: () => void;
}) {
  if (!file) return null;
  const e = ext(file.name, file.url);
  const isImage = /^(png|jpe?g|webp|gif|avif|svg)$/.test(e) || !!file.type?.startsWith("image/");
  const isVideo = /^(mp4|webm|mov|m4v)$/.test(e) || !!file.type?.startsWith("video/");
  const isAudio = /^(mp3|wav|ogg|m4a)$/.test(e) || !!file.type?.startsWith("audio/");
  const isDirect = /^(pdf|html?|txt|md|csv|json)$/.test(e);
  const isOffice = /^(docx?|xlsx?|pptx?)$/.test(e);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-4 py-3">
          <DialogTitle className="truncate text-[14px] font-medium">{file.name}</DialogTitle>
        </DialogHeader>
        <div className="bg-muted/30">
          {isImage ? (
            <img src={file.url} alt={file.name} className="max-h-[70vh] w-full object-contain" />
          ) : isVideo ? (
            <video src={file.url} controls className="max-h-[70vh] w-full" />
          ) : isAudio ? (
            <div className="p-6">
              <audio src={file.url} controls className="w-full" />
            </div>
          ) : isDirect ? (
            <iframe
              src={file.url}
              title={file.name}
              className="h-[70vh] w-full border-0 bg-background"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          ) : isOffice ? (
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`}
              title={file.name}
              className="h-[70vh] w-full border-0 bg-background"
            />
          ) : (
            <div className="p-6 text-[13px] text-muted-foreground">
              مش قادر أعرض النوع ده جوه الموقع، حمّله من اللينك تحت.
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-border/60 px-4 py-2.5">
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            download={file.name}
            className="text-[12.5px] font-medium text-primary hover:underline"
          >
            تحميل الملف
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
