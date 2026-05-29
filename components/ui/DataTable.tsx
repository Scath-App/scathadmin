"use client";

import { ReactNode } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface Column<T = any> {
  key: string;
  header: string;
  render?: (value: any, row: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface PaginationConfig {
  /** Raw API page value — 0 for 0-based page 1; 1 for 1-based page 1 */
  mode: "0-based" | "1-based";
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (apiPage: number) => void;
}

interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  skeletonRows?: number;
  pagination?: PaginationConfig;
  emptyMessage?: string;
  rowKey?: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  className?: string;
  headerExtra?: ReactNode;
}

export function DataTable<T = any>({
  columns,
  data,
  loading,
  skeletonRows = 5,
  pagination,
  emptyMessage = "No data found.",
  rowKey,
  onRowClick,
  className,
  headerExtra,
}: DataTableProps<T>) {
  const displayPage =
    pagination
      ? pagination.mode === "0-based"
        ? pagination.page + 1
        : pagination.page
      : 1;

  const canPrev = pagination
    ? pagination.mode === "0-based"
      ? pagination.page > 0
      : pagination.page > 1
    : false;
  const canNext = pagination ? displayPage < pagination.totalPages : false;

  return (
    <div className={`overflow-hidden bg-white ${className ?? ""}`}>
      {headerExtra && (
        <div className="px-6 py-4 border-b border-gray-100 bg-white">{headerExtra}</div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-gray-50 border-b border-gray-100">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`h-11 px-6 font-semibold text-gray-500 text-[11px] uppercase tracking-wider ${col.headerClassName ?? ""}`}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={i} className="border-b border-gray-100">
                  {columns.map((col) => (
                    <TableCell key={col.key} className="px-6 py-4">
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-gray-400 py-16 text-sm"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <p className="font-medium text-gray-500">{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow
                  key={rowKey ? rowKey(row, index) : index}
                  className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={`px-6 py-3.5 ${col.className ?? ""}`}>
                      {col.render
                        ? col.render((row as any)[col.key], row, index)
                        : ((row as any)[col.key] ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
          <p className="text-xs font-medium text-gray-500">
            Page {displayPage} of {pagination.totalPages}
            {pagination.total !== undefined && <span className="text-gray-400 font-normal"> · {pagination.total.toLocaleString()} total</span>}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-gray-200"
              disabled={loading || !canPrev}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-gray-200"
              disabled={loading || !canNext}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
