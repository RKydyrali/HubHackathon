import { MagnifyingGlass } from "@phosphor-icons/react";

import { FilterBar } from "@/components/layout/FilterBar";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import type { VacancySource } from "@/types/domain";

export function VacancyFilters({
  search,
  setSearch,
  source,
  setSource,
  district,
  setDistrict,
}: {
  search: string;
  setSearch: (value: string) => void;
  source: VacancySource | "all";
  setSource: (value: VacancySource | "all") => void;
  district: string;
  setDistrict: (value: string) => void;
}) {
  const { copy } = useI18n();

  return (
    <FilterBar>
      <FieldGroup className="grid w-full gap-3 md:grid-cols-[minmax(260px,1fr)_240px_200px] md:items-end">
        <Field>
          <FieldLabel htmlFor="vacancy-search">{copy.vacancies.search}</FieldLabel>
          <InputGroup className="min-h-12 rounded-2xl bg-background/80">
            <InputGroupAddon>
              <MagnifyingGlass data-icon="inline-start" weight="bold" />
            </InputGroupAddon>
            <InputGroupInput
              id="vacancy-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.vacancies.search}
            />
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel htmlFor="vacancy-district">{copy.vacancies.district}</FieldLabel>
          <InputGroup className="min-h-12 rounded-2xl bg-background/80">
            <InputGroupInput
              id="vacancy-district"
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              placeholder={copy.vacancies.anyDistrict}
            />
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel>{copy.vacancies.source}</FieldLabel>
          <Select value={source} onValueChange={(value) => setSource(value as VacancySource | "all")}>
            <SelectTrigger className="min-h-12 w-full rounded-2xl bg-background/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{copy.vacancies.all}</SelectItem>
                <SelectItem value="native">JumysAI</SelectItem>
                <SelectItem value="hh">HH.kz</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
    </FilterBar>
  );
}
