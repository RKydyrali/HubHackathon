import { DEFAULT_CITY } from "./constants";

type HhSnippet = {
  responsibility?: string | null;
  requirement?: string | null;
};

export type HhVacancy = {
  id: string;
  name: string;
  alternate_url?: string | null;
  area?: {
    name?: string | null;
  } | null;
  salary?: {
    from?: number | null;
    to?: number | null;
    currency?: string | null;
  } | null;
  snippet?: HhSnippet | null;
};

export type NormalizedHhVacancy = {
  source: "hh";
  sourceId: string;
  title: string;
  description: string;
  city: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  externalApplyUrl?: string;
};

export function normalizeHhVacancy(item: HhVacancy): NormalizedHhVacancy {
  const description = [item.snippet?.responsibility, item.snippet?.requirement]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return {
    source: "hh",
    sourceId: item.id,
    title: item.name.trim(),
    description: description || item.name.trim(),
    city: item.area?.name?.trim() || DEFAULT_CITY,
    salaryMin: item.salary?.from ?? undefined,
    salaryMax: item.salary?.to ?? undefined,
    salaryCurrency: item.salary?.currency ?? undefined,
    externalApplyUrl: item.alternate_url ?? undefined,
  };
}

export function hasHhVacancyChanged(
  previous: {
    title: string;
    description: string;
    city: string;
    salaryMin?: number | null;
    salaryMax?: number | null;
    salaryCurrency?: string | null;
    externalApplyUrl?: string | null;
  } | null,
  next: NormalizedHhVacancy,
): boolean {
  if (previous === null) {
    return true;
  }

  return (
    previous.title !== next.title ||
    previous.description !== next.description ||
    previous.city !== next.city ||
    (previous.salaryMin ?? null) !== (next.salaryMin ?? null) ||
    (previous.salaryMax ?? null) !== (next.salaryMax ?? null) ||
    (previous.salaryCurrency ?? null) !== (next.salaryCurrency ?? null) ||
    (previous.externalApplyUrl ?? null) !== (next.externalApplyUrl ?? null)
  );
}
