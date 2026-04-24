import { usePaginatedQuery } from "convex/react";
import type { FunctionReference } from "convex/server";

import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/shared/Button";
import { Table, type Column } from "@/components/shared/Table";
import { useI18n } from "@/lib/i18n";

export type AdminRow = {
  _id: string;
  _creationTime: number;
  [key: string]: unknown;
};

type AdminQuery = FunctionReference<
  "query",
  "public",
  { paginationOpts: { numItems: number; cursor: string | null } },
  { page: AdminRow[]; isDone: boolean; continueCursor: string }
>;

export function AdminTablePage({
  title,
  query,
  columns,
  empty,
}: {
  title: string;
  query: AdminQuery;
  columns: Column<AdminRow>[];
  empty: string;
}) {
  const result = usePaginatedQuery(query, {}, { initialNumItems: 20 });
  const { copy } = useI18n();

  return (
    <>
      <PageHeader title={title} subtitle={copy.admin.denseSubtitle} />
      <div className="container-app flex flex-col gap-4 py-5">
        {result.status === "LoadingFirstPage" ? (
          <LoadingSkeleton variant="table" />
        ) : (
          <Table columns={columns} data={result.results} empty={empty} getKey={(row) => row._id} />
        )}
        {result.status === "CanLoadMore" ? (
          <Button variant="outline" className="self-start" onClick={() => result.loadMore(20)}>
            {copy.admin.loadMore}
          </Button>
        ) : null}
      </div>
    </>
  );
}
