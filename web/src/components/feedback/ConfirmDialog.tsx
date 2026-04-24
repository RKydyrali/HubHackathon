import { useState } from "react";

import { Button } from "@/components/shared/Button";
import { useI18n } from "@/lib/i18n";

export function ConfirmDialog({
  label,
  title,
  body,
  onConfirm,
}: {
  label: string;
  title?: string;
  body?: string;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { copy, locale } = useI18n();
  const resolvedTitle = title ?? copy.common.confirm;
  const resolvedBody =
    body ??
    (locale === "kk"
      ? "Бұл әрекет тірі операциялық деректерге әсер етуі мүмкін."
      : "Это действие может повлиять на рабочие данные.");

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <section className="w-full max-w-sm rounded-xl border bg-card p-4 shadow-lg">
            <h2 className="text-base font-semibold">{resolvedTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{resolvedBody}</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {copy.common.cancel}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onConfirm();
                  setOpen(false);
                }}
              >
                {copy.common.confirm}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
