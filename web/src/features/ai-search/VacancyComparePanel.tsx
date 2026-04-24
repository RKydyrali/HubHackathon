import { X } from "@phosphor-icons/react";

import { Button } from "@/components/shared/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import type { AssistantComparisonRow } from "./aiSearchTypes";

export function VacancyComparePanel({
  rows,
  summary,
  onClear,
}: {
  rows: AssistantComparisonRow[];
  summary: string;
  onClear?: () => void;
}) {
  const { copy, locale } = useI18n();

  if (!rows.length) return null;

  const headers =
    locale === "kk"
      ? ["Вакансия", "Жалақы", "Аудан", "Кесте", "Тәжірибе", "Өтініш"]
      : ["Вакансия", "Зарплата", "Район", "График", "Опыт", "Отклик"];

  return (
    <section className="surface-panel rounded-2xl p-5" aria-label={copy.ai.compare}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-extrabold tracking-tight text-foreground">{copy.ai.compare}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {locale === "kk"
              ? "AI белгісіз шарттарды ойдан қоспайды. Көрсетілмеген деректер белгісіз болып қалады."
              : "AI не додумывает неизвестные условия. Если работодатель не указал деталь, она остается неизвестной."}
          </p>
        </div>
        {onClear ? (
          <Button type="button" variant="ghost" size="icon" aria-label={copy.common.close} onClick={onClear}>
            <X weight="bold" />
          </Button>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border bg-background/60">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.title}>
                <TableCell className="font-semibold text-foreground">{row.title}</TableCell>
                <TableCell>{row.salary}</TableCell>
                <TableCell>{row.district}</TableCell>
                <TableCell>{row.schedule}</TableCell>
                <TableCell>{row.experience}</TableCell>
                <TableCell>{row.applicationFriction}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border bg-muted/52 p-3">
          <p className="text-xs font-semibold text-foreground">{locale === "kk" ? "Неге сәйкес" : "Почему подходит"}</p>
          <div className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
            {rows.map((row) => (
              <p key={row.title}>
                <span className="font-medium text-foreground">{row.title}:</span> {row.whyFits.join(", ")}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-muted/52 p-3">
          <p className="text-xs font-semibold text-foreground">{locale === "kk" ? "Тәуекелдер" : "Риски и неизвестные"}</p>
          <div className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
            {rows.map((row) => (
              <p key={row.title}>
                <span className="font-medium text-foreground">{row.title}:</span>{" "}
                {row.risks.length
                  ? row.risks.join(", ")
                  : locale === "kk"
                    ? "айқын белгісіз шарт жоқ"
                    : "явных неизвестных нет"}
              </p>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-sm leading-6 text-foreground">
        {summary}
      </p>
    </section>
  );
}
