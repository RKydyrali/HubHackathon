import { motion } from "framer-motion";

import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/lib/i18n";

const stages = {
  ru: [
    "Понимаю запрос",
    "Выделяю район, график и навыки",
    "Смотрю подходящие вакансии",
    "Готовлю короткое объяснение",
  ],
  kk: [
    "Сұрауды түсініп жатырмын",
    "Аудан, кесте және дағдыларды бөліп жатырмын",
    "Сәйкес вакансияларды қарап жатырмын",
    "Қысқа түсіндірме дайындап жатырмын",
  ],
} as const;

export function AiThinkingState() {
  const { locale, copy } = useI18n();

  return (
    <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground shadow-sm" aria-live="polite">
      <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
        <Spinner className="size-4 text-primary" />
        {copy.ai.thinking}
      </div>
      <div className="grid gap-1.5">
        {stages[locale].map((stage, index) => (
          <motion.div
            key={stage}
            className="flex items-center gap-2"
            initial={{ opacity: 0.45 }}
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.4, delay: index * 0.14, repeat: Infinity }}
          >
            <span className="size-2 rounded-full bg-primary/70" />
            <span>{stage}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
