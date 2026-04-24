import { ShieldCheck } from "@phosphor-icons/react";
import { motion } from "framer-motion";

import accentUrl from "@/assets/generated/jumysai-subtle-accent.png";
import { BrandMark } from "@/components/shared/BrandMark";
import { LocaleToggle } from "@/components/shared/LocaleToggle";
import { useI18n } from "@/lib/i18n";
import { motionPresets } from "@/lib/motion";

import { AuthForms } from "./AuthForms";

export function LoginPage() {
  const { copy } = useI18n();

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4 ornament-subtle">
      <motion.section
        {...motionPresets.page}
        className="grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] border bg-card shadow-lift md:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="p-5 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <BrandMark />
            <LocaleToggle />
          </div>
          <div className="mt-8 max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              <ShieldCheck weight="fill" />
              {copy.city}
            </p>
            <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight text-foreground">
              {copy.auth.signInTitle}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.auth.signInBody}</p>
          </div>
          <div className="mt-6">
            <AuthForms />
          </div>
        </div>
        <div className="hidden border-l bg-secondary md:block">
          <img src={accentUrl} alt="" className="h-full w-full object-cover opacity-85" />
        </div>
      </motion.section>
    </main>
  );
}
