import type { ReactNode } from "react";

import {
  Table as UiTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (item: T) => ReactNode;
  className?: string;
};

export function Table<T>({
  columns,
  data,
  getKey,
  empty,
  className,
  mobileRow,
}: {
  columns: Column<T>[];
  data: readonly T[];
  getKey: (item: T) => string;
  empty: string;
  className?: string;
  mobileRow?: (item: T) => ReactNode;
}) {
  return (
    <div className={cn("surface-card overflow-hidden rounded-2xl", className)}>
      <UiTable className="hidden text-left text-sm md:table">
        <TableHeader className="sticky top-0 bg-secondary/72 text-xs font-semibold uppercase text-muted-foreground">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={cn("px-3 py-3", column.className)}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell className="px-3 py-10 text-center text-sm text-muted-foreground" colSpan={columns.length}>
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={getKey(item)} className="hover:bg-muted/48">
                {columns.map((column) => (
                  <TableCell key={column.key} className={cn("px-3 py-3 align-middle whitespace-normal", column.className)}>
                    {column.cell(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </UiTable>
      <div className="md:hidden">
        {data.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">{empty}</div>
        ) : (
          data.map((item) => (
            <div key={getKey(item)} className="border-b last:border-b-0">
              {mobileRow ? (
                mobileRow(item)
              ) : (
                <div className="grid gap-3 p-5 text-sm">
                  {columns.map((column) => (
                    <div key={column.key} className="flex items-start justify-between gap-3">
                      <span className="text-xs font-medium uppercase text-muted-foreground">
                        {column.header}
                      </span>
                      <span className="min-w-0 text-right">{column.cell(item)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
