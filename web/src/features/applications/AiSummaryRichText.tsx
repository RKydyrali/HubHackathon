import { cn } from "@/lib/utils";

/** Renders AI screening summaries with readable hierarchy (Pros / Cons / Rating, bullets, paragraphs). */
export function AiSummaryRichText({ text, className }: { text: string; className?: string }) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const blocks = trimmed.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  return (
    <div className={cn("space-y-4", className)}>
      {blocks.map((block, i) => (
        <SummaryBlock key={i} block={block} />
      ))}
    </div>
  );
}

function SummaryBlock({ block }: { block: string }) {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  const hasStructure = lines.some((l) =>
    /^(pros|cons|minuses?|rating|score|summary|итог|плюсы|минусы|оценка|в\s*целом)\s*:/i.test(l),
  );

  if (!hasStructure) {
    return (
      <p className="text-sm leading-relaxed text-foreground [text-wrap:pretty] whitespace-pre-wrap">{block}</p>
    );
  }

  return (
    <div className="rounded-xl border border-border/80 bg-muted/30 p-4 dark:bg-muted/15">
      <div className="space-y-3">
        {lines.map((line, idx) => (
          <StructuredLine key={`${idx}-${line.slice(0, 24)}`} line={line} />
        ))}
      </div>
    </div>
  );
}

function StructuredLine({ line }: { line: string }) {
  const label = (name: string, tone: "pros" | "cons" | "rating" | "neutral", body: string) => {
    const toneClass =
      tone === "pros"
        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
        : tone === "cons"
          ? "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-100"
          : tone === "rating"
            ? "border-primary/20 bg-primary/5 text-foreground"
            : "border-border/60 bg-background/80 text-foreground";

    return (
      <div className={cn("rounded-lg border px-3 py-2.5", toneClass)}>
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{name}</p>
        <p className="mt-1.5 text-sm leading-relaxed [text-wrap:pretty]">{body || "—"}</p>
      </div>
    );
  };

  let m = line.match(/^\s*pros\s*:\s*(.*)$/i);
  if (m) return label("Pros", "pros", m[1] ?? "");

  m = line.match(/^\s*(cons|minuses?)\s*:\s*(.*)$/i);
  if (m) return label("Cons", "cons", m[2] ?? "");

  m = line.match(/^\s*(rating|score|оценка)\s*:\s*(.*)$/i);
  if (m) return label("Rating", "rating", m[2] ?? "");

  m = line.match(/^\s*(summary|итог)\s*:\s*(.*)$/i);
  if (m) return label("Summary", "neutral", m[2] ?? "");

  m = line.match(/^\s*(плюсы)\s*:\s*(.*)$/i);
  if (m) return label("Плюсы", "pros", m[2] ?? "");

  m = line.match(/^\s*(минусы)\s*:\s*(.*)$/i);
  if (m) return label("Минусы", "cons", m[2] ?? "");

  m = line.match(/^\s*в\s*целом\s*:\s*(.*)$/i);
  if (m) return label("В целом", "neutral", m[1] ?? "");

  if (/^[-•*]\s+/.test(line)) {
    return (
      <p className="border-l-2 border-primary/30 pl-3 text-sm leading-relaxed text-muted-foreground [text-wrap:pretty]">
        {line.replace(/^[-•*]\s+/, "")}
      </p>
    );
  }

  if (/^\d+\.\s+/.test(line)) {
    return <p className="text-sm font-semibold text-foreground [text-wrap:pretty]">{line}</p>;
  }

  return <p className="text-sm leading-relaxed text-foreground/90 [text-wrap:pretty] whitespace-pre-wrap">{line}</p>;
}

/** One-line preview for inbox rows (strips newlines, clamps length). */
export function formatAiSummaryPreview(text: string | undefined, max = 100): string {
  if (!text?.trim()) return "";
  const single = text.replace(/\s+/g, " ").trim();
  if (single.length <= max) return single;
  return `${single.slice(0, max - 1)}…`;
}
