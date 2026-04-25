import { PaperPlaneTilt } from "@phosphor-icons/react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/shared/Button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { api, type Id } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";

export function HiredApplicationThread({ applicationId }: { applicationId: Id<"applications"> }) {
  const { locale } = useI18n();
  const messages = useQuery(api.applicationMessages.listByApplication, { applicationId });
  const send = useMutation(api.applicationMessages.send);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    const text = body.trim();
    if (!text || sending) {
      return;
    }
    setSending(true);
    try {
      await send({ applicationId, body: text });
      setBody("");
    } finally {
      setSending(false);
    }
  }

  if (messages === undefined) {
    return <p className="text-sm text-muted-foreground">{locale === "kk" ? "Жүктелуде…" : "Загрузка…"}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">
        {locale === "kk" ? "Чат (наймнан кейін)" : "Чат после найма"}
      </h3>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {locale === "kk"
          ? "Жеке куәліктерді, құжат сканерлерін немесе төлем деректерін чатта сұрамаңыз және жібермеңіз."
          : "Не запрашивайте и не пересылайте в чате паспортные данные, сканы документов или платёжные реквизиты."}
      </p>
      {messages.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {locale === "kk" ? "Әлі хабарламалар жоқ — бірінші сәлемді жіберіңіз." : "Пока нет сообщений — отправьте первое приветствие."}
        </p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border bg-background p-2">
          {messages.map((m) => (
            <li key={m._id} className="rounded-md border bg-card px-2 py-1.5 text-sm">
              <span className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : "ru-RU", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(m.createdAt))}
              </span>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{m.body}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2">
        <Textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={locale === "kk" ? "Келесі қадамдар, кірісу уақыты..." : "Следующие шаги, время выхода..."}
          disabled={sending}
        />
        <div className="flex justify-end">
          <Button type="button" onClick={() => void submit()} disabled={sending || !body.trim()}>
            {sending ? <Spinner className="size-4" /> : <PaperPlaneTilt className="size-4" weight="bold" />}
            {locale === "kk" ? "Жіберу" : "Отправить"}
          </Button>
        </div>
      </div>
    </div>
  );
}
