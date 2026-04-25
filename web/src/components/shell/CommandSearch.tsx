import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, FileText, MagnifyingGlass, UserCircle, Users } from "@phosphor-icons/react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/shared/Button";
import { Badge } from "@/components/shared/Badge";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { getCommandSearchGroupsForRole } from "@/lib/product-experience";
import type { UserRole } from "@/types/domain";

type SearchResult = {
  id: string;
  kind: "vacancies" | "applications" | "applicants" | "users";
  title: string;
  description?: string;
  href: string;
  status?: string;
};

const paginationOpts = { numItems: 20, cursor: null as string | null };

export function CommandSearch({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { copy, locale } = useI18n();

  const publicVacancies = useQuery(api.vacancies.listPublic, { limit: 30 });
  const seekerApplications = useQuery(api.applications.listBySeeker, role === "seeker" ? {} : "skip");
  const employerApplications = useQuery(api.applications.listByOwner, role === "employer" ? {} : "skip");
  const employerVacancies = useQuery(api.vacancies.listByOwner, role === "employer" ? {} : "skip");
  const adminUsers = useQuery(api.admin.listUsersForAdmin, role === "admin" ? { paginationOpts } : "skip");
  const adminApplications = useQuery(api.admin.listApplicationsForAdmin, role === "admin" ? { paginationOpts } : "skip");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (editing) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const groups = getCommandSearchGroupsForRole(role, locale);
  const results = useMemo(() => {
    const rows: SearchResult[] = [];
    if (role === "employer") {
      for (const row of employerVacancies ?? []) {
        rows.push({
          id: row.vacancy._id,
          kind: "vacancies",
          title: row.vacancy.title,
          description: `${row.vacancy.city}${row.vacancy.district ? ` · ${row.vacancy.district}` : ""}`,
          href: `/employer/vacancies/${row.vacancy._id}`,
          status: row.vacancy.status,
        });
      }
      for (const row of employerApplications ?? []) {
        rows.push({
          id: row.application._id,
          kind: "applicants",
          title: row.profile?.fullName ?? copy.commandSearch.fallbackApplicant,
          description: row.vacancy?.title,
          href: `/employer/applications/${row.application._id}`,
          status: row.application.status,
        });
      }
      return rows;
    }
    if (role === "admin") {
      for (const user of adminUsers?.page ?? []) {
        rows.push({
          id: String(user._id),
          kind: "users",
          title: String(user.clerkId ?? user._id),
          description: String(user.role ?? copy.commandSearch.noRole),
          href: "/admin/users",
        });
      }
      for (const vacancy of publicVacancies ?? []) {
        rows.push({
          id: vacancy._id,
          kind: "vacancies",
          title: vacancy.title,
          description: `${vacancy.source.toUpperCase()} · ${vacancy.city}`,
          href: `/vacancies/${vacancy._id}`,
          status: vacancy.status,
        });
      }
      for (const application of adminApplications?.page ?? []) {
        rows.push({
          id: String(application._id),
          kind: "applications",
          title: String(application._id),
          description: String(application.status ?? "Application"),
          href: "/admin/applications",
          status: String(application.status ?? ""),
        });
      }
      return rows;
    }
    for (const vacancy of publicVacancies ?? []) {
      rows.push({
        id: vacancy._id,
        kind: "vacancies",
        title: vacancy.title,
        description: `${vacancy.source === "native" ? "JumysAI" : "HH"} · ${vacancy.city}`,
        href: `/vacancies/${vacancy._id}`,
        status: vacancy.status,
      });
    }
    for (const row of seekerApplications ?? []) {
      rows.push({
        id: row.application._id,
        kind: "applications",
          title: row.vacancy?.title ?? copy.commandSearch.fallbackApplication,
        description: row.vacancy?.city,
        href: "/applications",
        status: row.application.status,
      });
    }
    return rows;
  }, [adminApplications?.page, adminUsers?.page, copy.commandSearch.fallbackApplicant, copy.commandSearch.fallbackApplication, copy.commandSearch.noRole, employerApplications, employerVacancies, publicVacancies, role, seekerApplications]);

  function run(result: SearchResult) {
    setOpen(false);
    navigate(result.href);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full justify-start gap-2 rounded-lg border-input bg-card text-left text-muted-foreground shadow-none md:w-[34rem]"
        onClick={() => setOpen(true)}
      >
        <MagnifyingGlass weight="bold" />
        <span className="truncate">{copy.commandSearch.trigger}</span>
        <kbd className="ml-auto hidden rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title={copy.commandSearch.title} description={copy.commandSearch.description}>
        <Command>
          <CommandInput placeholder={copy.commandSearch.placeholder} autoFocus />
          <CommandList>
            <CommandEmpty>{copy.commandSearch.empty}</CommandEmpty>
            {groups.map((group) => {
              const groupRows = results.filter((result) => result.kind === group.kind);
              if (!groupRows.length) return null;
              return (
                <CommandGroup key={group.kind} heading={group.label}>
                  {groupRows.map((result) => (
                    <CommandItem
                      key={`${result.kind}-${result.id}`}
                      value={`${result.title} ${result.description ?? ""} ${result.status ?? ""}`}
                      onSelect={() => run(result)}
                    >
                      <ResultIcon kind={result.kind} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{result.title}</span>
                        {result.description ? (
                          <span className="block truncate text-xs text-muted-foreground">{result.description}</span>
                        ) : null}
                      </span>
                      {result.status ? <Badge tone="muted">{result.status}</Badge> : null}
                      <CommandShortcut>{copy.commandSearch.enter}</CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

function ResultIcon({ kind }: { kind: SearchResult["kind"] }) {
  const Icon =
    kind === "vacancies" ? Briefcase : kind === "users" ? Users : kind === "applicants" ? UserCircle : FileText;
  return <Icon weight="bold" />;
}
