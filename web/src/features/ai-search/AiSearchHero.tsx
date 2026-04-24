import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkle } from "@phosphor-icons/react";
import { motion } from "framer-motion";

import { Button } from "@/components/shared/Button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { motionPresets } from "@/lib/motion";

const examples = {
  ru: ["Работа на сегодня", "Без опыта", "После учебы", "12 мкр вечером", "Только JumysAI"],
  kk: ["Бүгінгі жұмыс", "Тәжірибесіз", "Оқудан кейін", "12 шағын аудан кешке", "Тек JumysAI"],
} as const;

export function AiSearchHero() {
  const navigate = useNavigate();
  const { copy, locale } = useI18n();
  const [value, setValue] = useState("");

  function submit() {
    const query = value.trim();
    navigate(query ? `/ai-search?q=${encodeURIComponent(query)}` : "/ai-search");
  }

  return (
    <section className="relative overflow-hidden rounded-lg border bg-card p-4 shadow-card ornament-subtle">
      <motion.div {...motionPresets.card} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkle weight="fill" />
            {copy.ai.title}
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-foreground">
            {copy.publicHome.heroTitle}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.ai.subtitle}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {examples[locale].map((example) => (
              <button
                key={example}
                type="button"
                className="min-h-9 rounded-full border bg-background px-3 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setValue(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-md border bg-background p-3">
          <Textarea
            rows={5}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={copy.ai.inputPlaceholder}
            aria-label={copy.ai.inputLabel}
          />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{copy.ai.privacy}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={submit}>
              {copy.ai.send}
            </Button>
            <Link to="/vacancies">
              <Button type="button" variant="outline">
                {copy.publicHome.browseCta}
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
