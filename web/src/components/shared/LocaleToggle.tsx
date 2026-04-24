import { Translate } from "@phosphor-icons/react";

import { Button } from "@/components/shared/Button";
import { useI18n } from "@/lib/i18n";

export function LocaleToggle() {
  const { locale, setLocale, copy } = useI18n();
  const nextLocale = locale === "ru" ? "kk" : "ru";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-w-16"
      aria-label={locale === "ru" ? "Қазақ тіліне ауысу" : "Переключить на русский"}
      onClick={() => setLocale(nextLocale)}
    >
      <Translate data-icon="inline-start" weight="bold" />
      {copy.switchLocale}
    </Button>
  );
}
