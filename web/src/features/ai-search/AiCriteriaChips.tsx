import { PencilSimple, Repeat, SlidersHorizontal, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { Button } from "@/components/shared/Button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n, type Locale } from "@/lib/i18n";
import type { AiJobCriteria } from "./aiSearchTypes";

const labels = {
  ru: {
    roles: "Роль",
    skills: "Навыки",
    city: "Город",
    district: "Район",
    schedule: "График",
    workType: "Тип работы",
    experienceLevel: "Опыт",
    salaryMin: "Зарплата",
    urgency: "Срочность",
    sourcePreference: "Источник",
    addPrompt: "Напишите запрос, чтобы AI выделил критерии",
    hint: "Критерии можно убрать или уточнить вручную.",
    remove: "Удалить критерий",
    salaryFrom: "от",
  },
  kk: {
    roles: "Рөл",
    skills: "Дағдылар",
    city: "Қала",
    district: "Аудан",
    schedule: "Кесте",
    workType: "Жұмыс түрі",
    experienceLevel: "Тәжірибе",
    salaryMin: "Жалақы",
    urgency: "Шұғылдық",
    sourcePreference: "Дереккөз",
    addPrompt: "AI критерий бөлуі үшін сұрау жазыңыз",
    hint: "Критерийді алып тастауға немесе қолмен нақтылауға болады.",
    remove: "Критерийді алып тастау",
    salaryFrom: "бастап",
  },
} as const;

const valueLabels = {
  ru: {
    workType: {
      full_time: "полная занятость",
      part_time: "частичная занятость",
      temporary: "временная работа",
    },
    experienceLevel: {
      none: "без опыта",
      junior: "начинающий",
      experienced: "есть опыт",
    },
    urgency: {
      today: "работа сегодня",
      this_week: "на этой неделе",
      flexible: "не срочно",
    },
    sourcePreference: {
      native: "только JumysAI",
      hh: "только HH",
      any: "JumysAI и HH",
    },
  },
  kk: {
    workType: {
      full_time: "толық жұмыс",
      part_time: "жарты күн",
      temporary: "уақытша жұмыс",
    },
    experienceLevel: {
      none: "тәжірибесіз",
      junior: "бастаушы",
      experienced: "тәжірибе бар",
    },
    urgency: {
      today: "бүгін жұмыс",
      this_week: "осы аптада",
      flexible: "шұғыл емес",
    },
    sourcePreference: {
      native: "тек JumysAI",
      hh: "тек HH",
      any: "JumysAI және HH",
    },
  },
} as const;

export function AiCriteriaChips({
  criteria,
  onChange,
  onReset,
  onRunAgain,
}: {
  criteria: AiJobCriteria;
  onChange: (criteria: AiJobCriteria) => void;
  onReset: () => void;
  onRunAgain: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const { copy, locale } = useI18n();
  const chips = useMemo(() => criteriaToChips(criteria, locale), [criteria, locale]);
  const text = labels[locale];

  return (
    <section className="rounded-lg border bg-card" aria-label={copy.ai.understood}>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="text-primary" weight="bold" />
              <h2 className="text-sm font-semibold text-foreground">{copy.ai.understood}</h2>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{text.hint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onRunAgain}>
              <Repeat data-icon="inline-start" weight="bold" />
              {copy.ai.runAgain}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing((value) => !value)}>
              <PencilSimple data-icon="inline-start" weight="bold" />
              {copy.ai.edit}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onReset}>
              <X data-icon="inline-start" weight="bold" />
              {copy.ai.reset}
            </Button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
          {chips.length ? (
            chips.map((chip) => (
              <button
                key={`${chip.key}-${chip.rawValue}`}
                type="button"
                className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground transition-colors hover:border-destructive hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title={text.remove}
                onClick={() => onChange(removeChip(criteria, chip.key, chip.rawValue))}
              >
                <span className="text-muted-foreground">{chip.label}:</span>
                <span>{chip.value}</span>
                <X weight="bold" />
              </button>
            ))
          ) : (
            <span className="rounded-full border bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              {text.addPrompt}
            </span>
          )}
        </div>
      </div>

      {editing ? (
        <div className="grid gap-3 border-t bg-background/60 p-4 md:grid-cols-2">
          <Field>
            <FieldLabel>{text.district}</FieldLabel>
            <Input
              value={criteria.district ?? ""}
              onChange={(event) => onChange({ ...criteria, district: event.target.value || null })}
              placeholder={locale === "kk" ? "12 шағын аудан, орталық" : "12 мкр, центр"}
            />
          </Field>
          <Field>
            <FieldLabel>{text.schedule}</FieldLabel>
            <Input
              value={criteria.schedule ?? ""}
              onChange={(event) => onChange({ ...criteria, schedule: event.target.value || null })}
              placeholder={locale === "kk" ? "кешкі, 5/2, ауысым" : "вечер, 5/2, сменный"}
            />
          </Field>
          <Field>
            <FieldLabel>{`${text.salaryMin} ${text.salaryFrom}`}</FieldLabel>
            <Input
              inputMode="numeric"
              value={criteria.salaryMin ?? ""}
              onChange={(event) => {
                const value = Number(event.target.value);
                onChange({ ...criteria, salaryMin: Number.isFinite(value) && value > 0 ? value : null });
              }}
              placeholder="200000"
            />
          </Field>
          <Field>
            <FieldLabel>{text.sourcePreference}</FieldLabel>
            <Select
              value={criteria.sourcePreference}
              onValueChange={(value) =>
                onChange({ ...criteria, sourcePreference: value as AiJobCriteria["sourcePreference"] })
              }
            >
              <SelectTrigger className="h-11 w-full rounded-lg bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{valueLabels[locale].sourcePreference.any}</SelectItem>
                <SelectItem value="native">{valueLabels[locale].sourcePreference.native}</SelectItem>
                <SelectItem value="hh">{valueLabels[locale].sourcePreference.hh}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      ) : null}
    </section>
  );
}

function criteriaToChips(criteria: AiJobCriteria, locale: Locale) {
  const text = labels[locale];
  const values = valueLabels[locale];
  const chips: Array<{ key: keyof AiJobCriteria; label: string; value: string; rawValue: string }> = [];
  for (const role of criteria.roles) chips.push({ key: "roles", label: text.roles, value: role, rawValue: role });
  for (const skill of criteria.skills) chips.push({ key: "skills", label: text.skills, value: skill, rawValue: skill });
  if (criteria.city) chips.push({ key: "city", label: text.city, value: criteria.city, rawValue: criteria.city });
  if (criteria.district) chips.push({ key: "district", label: text.district, value: criteria.district, rawValue: criteria.district });
  if (criteria.schedule) chips.push({ key: "schedule", label: text.schedule, value: criteria.schedule, rawValue: criteria.schedule });
  if (criteria.workType) chips.push({ key: "workType", label: text.workType, value: values.workType[criteria.workType], rawValue: criteria.workType });
  if (criteria.experienceLevel) {
    chips.push({
      key: "experienceLevel",
      label: text.experienceLevel,
      value: values.experienceLevel[criteria.experienceLevel],
      rawValue: criteria.experienceLevel,
    });
  }
  if (criteria.salaryMin) {
    chips.push({
      key: "salaryMin",
      label: text.salaryMin,
      value: `${text.salaryFrom} ${criteria.salaryMin.toLocaleString(locale === "kk" ? "kk-KZ" : "ru-KZ")} KZT`,
      rawValue: String(criteria.salaryMin),
    });
  }
  if (criteria.urgency) chips.push({ key: "urgency", label: text.urgency, value: values.urgency[criteria.urgency], rawValue: criteria.urgency });
  if (criteria.sourcePreference !== "any") {
    chips.push({
      key: "sourcePreference",
      label: text.sourcePreference,
      value: values.sourcePreference[criteria.sourcePreference],
      rawValue: criteria.sourcePreference,
    });
  }
  return chips;
}

function removeChip(criteria: AiJobCriteria, key: keyof AiJobCriteria, value: string): AiJobCriteria {
  if (key === "roles" || key === "skills") {
    return { ...criteria, [key]: criteria[key].filter((item) => item !== value) };
  }
  if (key === "sourcePreference") return { ...criteria, sourcePreference: "any" };
  return { ...criteria, [key]: null };
}
