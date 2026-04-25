import { CopySimple, QrCode, TelegramLogo } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/shared/Button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { drawQrToCanvas } from "@/lib/qr";
import { cn } from "@/lib/utils";

export function VacancyShareSheet({
  title,
  url,
  trigger,
}: {
  title: string;
  url: string;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const telegramHref = useMemo(() => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
    return shareUrl;
  }, [title, url]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Draw slightly after open to ensure layout is stable.
    const id = window.setTimeout(() => {
      try {
        drawQrToCanvas(canvas, url, { size: 240, padding: 14, ecLevel: "M" });
      } catch {
        // If QR generation fails, keep the UI usable (copy + Telegram still work).
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, url]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          trigger ?? (
            <Button type="button" variant="outline">
              <QrCode data-icon="inline-start" weight="bold" />
              Share
            </Button>
          )
        }
      />
      <SheetContent side="right" className="w-[min(100vw,420px)] p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Share this vacancy</SheetTitle>
          <SheetDescription>Copy link, share to Telegram, or scan the QR.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Link</p>
            <div className="flex items-center gap-2">
              <input
                className={cn(
                  "h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/30",
                )}
                readOnly
                value={url}
                aria-label="Share link"
              />
              <Button type="button" variant="outline" onClick={() => void handleCopy()}>
                <CopySimple data-icon="inline-start" weight="bold" />
                Copy
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <a href={telegramHref} target="_blank" rel="noreferrer">
              <Button type="button" className="w-full">
                <TelegramLogo data-icon="inline-start" weight="bold" />
                Share to Telegram
              </Button>
            </a>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">QR code</p>
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-card p-4">
              <canvas ref={canvasRef} className="h-[240px] w-[240px] rounded-md bg-white" />
              <p className="text-xs text-muted-foreground">Scan to open on phone</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

