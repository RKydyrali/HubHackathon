import { type DraftKey, getMissingDraftKeys } from "./createModeModel";

type Draft = Record<DraftKey, string>;

const AKTAU_BITS = [
  "1 мкр",
  "2 мкр",
  "3 мкр",
  "12 мкр",
  "Микрорайон 4",
  "Центр",
];

export type QuickPick = { value: string; label: string };

/** Pools from i18n `employerVacancies.guidedQuickPickPools`. */
export type GuidedQuickPickPoolsMap = {
  role: readonly QuickPick[];
  schedule: readonly QuickPick[];
  salary: readonly QuickPick[];
  experience: readonly QuickPick[];
  responsibilities: readonly QuickPick[];
  almost: readonly QuickPick[];
};

function padToFour(core: readonly QuickPick[], extra: readonly QuickPick[]): QuickPick[] {
  const out: QuickPick[] = [];
  const seen = new Set<string>();
  for (const o of [...core, ...extra]) {
    if (out.length >= 4) break;
    if (seen.has(o.value)) continue;
    seen.add(o.value);
    out.push(o);
  }
  return out;
}

function buildCoreQuickPicks(
  primaryMissing: DraftKey,
  draft: Draft,
  locale: "ru" | "kk",
): QuickPick[] {
  const r = draft.role?.toLowerCase() ?? "";

  if (primaryMissing === "salary") {
    if (/официант|waiter|кассир|сатушы/i.test(r)) {
      return locale === "kk"
        ? [
            { value: "180 000–220 000 ₸", label: "180–220k ₸" },
            { value: "200 000–250 000 ₸", label: "200–250k ₸" },
            { value: "сүйлесу бойынша", label: "Келісу бойынша" },
          ]
        : [
            { value: "180 000–220 000 ₸", label: "180–220k ₸" },
            { value: "200 000–250 000 ₸", label: "200–250k ₸" },
            { value: "по договорённости", label: "По договорённости" },
          ];
    }
    return locale === "kk"
      ? [
          { value: "200 000–300 000 ₸", label: "200–300k ₸" },
          { value: "300 000–500 000 ₸", label: "300–500k ₸" },
          { value: "500 000 ₸-тан бастап", label: "500k+ ₸" },
        ]
      : [
          { value: "200 000–300 000 ₸", label: "200–300k ₸" },
          { value: "300 000–500 000 ₸", label: "300–500k ₸" },
          { value: "от 500 000 ₸", label: "от 500k ₸" },
        ];
  }

  if (primaryMissing === "location") {
    return AKTAU_BITS.slice(0, 4).map((b) => ({ value: b, label: b }));
  }

  if (primaryMissing === "schedule") {
    return locale === "kk"
      ? [
          { value: "2/2, 8 сағат", label: "2/2" },
          { value: "тек кешкі ауысым", label: "Кеш" },
          { value: "толық күн", label: "Толық күн" },
        ]
      : [
          { value: "2/2, 8 часов", label: "2/2" },
          { value: "только вечерние смены", label: "Вечер" },
          { value: "полный день", label: "Полный день" },
        ];
  }

  if (primaryMissing === "experience") {
    return locale === "kk"
      ? [
          { value: "тәжірибе қажет емес", label: "Тәжірибесіз" },
          { value: "1+ жыл", label: "1+ жыл" },
          { value: "3+ жыл", label: "3+ жыл" },
        ]
      : [
          { value: "без опыта", label: "Без опыта" },
          { value: "от 1 года", label: "1+ г." },
          { value: "от 3 лет", label: "3+ г." },
        ];
  }

  if (primaryMissing === "role") {
    return [];
  }

  if (primaryMissing === "responsibilities") {
    return [];
  }

  return [];
}

function poolForKey(key: DraftKey, pools: GuidedQuickPickPoolsMap): readonly QuickPick[] {
  switch (key) {
    case "role":
      return pools.role;
    case "schedule":
      return pools.schedule;
    case "salary":
      return pools.salary;
    case "experience":
      return pools.experience;
    case "responsibilities":
      return pools.responsibilities;
    default:
      return [];
  }
}

/**
 * Four quick picks for guided clarification. When `almostMode`, fills from
 * `pools.almost` (draft structurally complete but vacancy not yet submittable).
 */
export function suggestGuidedQuickPicks(
  primaryMissing: DraftKey | undefined,
  draft: Draft,
  locale: "ru" | "kk",
  pools: GuidedQuickPickPoolsMap,
  opts?: { almostMode?: boolean },
): QuickPick[] {
  if (opts?.almostMode) {
    return padToFour([], pools.almost);
  }
  if (!primaryMissing) {
    return [];
  }
  const core = buildCoreQuickPicks(primaryMissing, draft, locale);
  const extra = poolForKey(primaryMissing, pools);
  return padToFour(core, extra);
}

export function primaryMissingKey(draft: Draft): DraftKey | undefined {
  return getMissingDraftKeys(draft)[0];
}
