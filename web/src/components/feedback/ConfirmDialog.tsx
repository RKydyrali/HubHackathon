import { useState } from "react";

import { Button } from "@/components/shared/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/lib/i18n";

export function ConfirmDialog({
  label,
  title,
  body,
  onConfirm,
  variant = "destructive",
  irreversible = false,
}: {
  label: string;
  title?: string;
  body?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "destructive" | "default";
  irreversible?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const { copy, locale } = useI18n();
  const resolvedTitle = title ?? copy.common.confirm;
  const resolvedBody =
    body ??
    (locale === "kk"
      ? "Бұл әрекет тірі операциялық деректерге әсер етуі мүмкін."
      : "Это действие может повлиять на рабочие данные.");

  async function confirm() {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant === "destructive" ? "destructive" : "outline"} />}>
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{resolvedTitle}</DialogTitle>
          <DialogDescription>{resolvedBody}</DialogDescription>
        </DialogHeader>
        {irreversible ? (
          <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            {locale === "kk"
              ? "Бұл әрекетті артқа қайтару қиын болуы мүмкін."
              : "This action may be difficult to undo."}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>
            {copy.common.cancel}
          </DialogClose>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={pending}
            onClick={() => void confirm()}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {copy.common.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
