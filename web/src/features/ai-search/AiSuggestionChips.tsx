import { motion } from "framer-motion";

import { useI18n } from "@/lib/i18n";

const suggestions = {
  ru: ["Работа на сегодня", "Без опыта", "После учебы", "Рядом со мной", "Только JumysAI", "Сравни лучшие"],
  kk: ["Бүгінгі жұмыс", "Тәжірибесіз", "Оқудан кейін", "Маған жақын", "Тек JumysAI", "Үздіктерін салыстыр"],
} as const;

export function AiSuggestionChips({ onPick }: { onPick: (value: string) => void }) {
  const { locale } = useI18n();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label={locale === "kk" ? "Жылдам сұраулар" : "Быстрые запросы"}>
      {suggestions[locale].map((suggestion, index) => (
        <motion.button
          key={suggestion}
          type="button"
          className="min-h-10 shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: index * 0.03 }}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onPick(suggestion)}
        >
          {suggestion}
        </motion.button>
      ))}
    </div>
  );
}
