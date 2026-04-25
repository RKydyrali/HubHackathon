import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motionPresets } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type DataColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (item: T) => ReactNode;
  className?: string;
};

export function DataTable<T>({
  columns,
  data,
  getKey,
  empty,
  mobileRow,
  selectedKey,
  onRowClick,
  className,
  tableClassName,
  tableContainerClassName,
  dense = false,
  /** Tighter padding for data-heavy owner tables. */
  denseVariant: denseVariantProp,
  rowClassName,
  stickyHeader = false,
  stickyHeaderClassName,
}: {
  columns: DataColumn<T>[];
  data: readonly T[];
  getKey: (item: T) => string;
  empty: ReactNode;
  mobileRow?: (item: T) => ReactNode;
  selectedKey?: string | null;
  onRowClick?: (item: T) => void;
  className?: string;
  tableClassName?: string;
  /** Table scroll container (e.g. `overflow-x-clip` to avoid spurious scrollbars on fixed layout). */
  tableContainerClassName?: string;
  dense?: boolean;
  denseVariant?: "comfortable" | "tight";
  rowClassName?: (item: T, index: number) => string | undefined;
  stickyHeader?: boolean;
  stickyHeaderClassName?: string;
}) {
  const denseVariant = denseVariantProp ?? (dense ? "comfortable" : "comfortable");
  const isTight = denseVariant === "tight";
  const reduceMotion = useReducedMotion();
  return (
    <div className={cn("rounded-lg border border-border/70 bg-card shadow-none", className)}>
      <Table
        containerClassName={tableContainerClassName}
        className={cn(
          "hidden w-full min-w-0 table-fixed border-collapse text-left text-sm md:table",
          tableClassName,
        )}
      >
        <TableHeader
          className={cn(
            "text-xs font-medium text-muted-foreground/90",
            !stickyHeader && "bg-muted/40",
            stickyHeader && [
              "sticky z-20 border-b border-border/80 bg-card",
              stickyHeaderClassName ?? "top-0",
            ],
          )}
        >
          <TableRow className="border-0 hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                scope="col"
                className={cn(
                  "align-middle font-medium",
                  isTight
                    ? "h-8 min-h-8 px-2 py-1"
                    : dense
                      ? "h-9 min-h-9 px-2.5 py-1.5"
                      : "h-10 min-h-9 px-3 py-2",
                  stickyHeader ? "bg-card" : "bg-inherit",
                  column.className,
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className={cn("text-center", dense ? "px-3 py-8" : "px-3 py-12")}
              >
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => {
              const key = getKey(item);
              return (
                <motion.tr
                  key={key}
                  layout={false}
                  className={cn(
                    "border-b border-border/50 last:border-0 transition-colors",
                    isTight
                      ? "min-h-10 hover:bg-muted/40"
                      : "min-h-12 hover:bg-muted/30",
                    onRowClick && "group cursor-pointer",
                    selectedKey === key && "bg-primary/5",
                    rowClassName?.(item, index),
                  )}
                  onClick={() => onRowClick?.(item)}
                  initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : {
                          type: "spring",
                          stiffness: 420,
                          damping: 34,
                          mass: 0.55,
                          delay: Math.min(index * 0.018, 0.32),
                        }
                  }
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        "align-middle [vertical-align:middle]",
                        "whitespace-normal",
                        isTight
                          ? "min-h-9 px-2 py-1.5 text-[13px] leading-normal"
                          : dense
                            ? "min-h-12 px-2.5 py-2.5 text-[13px] leading-normal"
                            : "min-h-12 px-3 py-2.5",
                        "min-w-0",
                        column.className,
                      )}
                    >
                      {column.cell(item)}
                    </TableCell>
                  ))}
                </motion.tr>
              );
            })
          )}
        </TableBody>
      </Table>
      <motion.div {...motionPresets.list} className="divide-y divide-border/70 md:hidden">
        {data.length === 0 ? (
          <div className={cn("text-center", dense ? "p-4" : "p-5")}>{empty}</div>
        ) : (
          data.map((item) => (
            <motion.div key={getKey(item)} {...motionPresets.listItem} className={dense ? "p-3.5" : "p-4"}>
              {mobileRow ? (
                mobileRow(item)
              ) : (
                <div className="grid gap-3">
                  {columns.map((column) => (
                    <div key={column.key} className="grid gap-1">
                      <span className="text-xs font-medium text-muted-foreground">{column.header}</span>
                      <span className="min-w-0 text-sm">{column.cell(item)}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
