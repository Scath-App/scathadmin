"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuditLogs } from "@/lib/userService";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { format } from "date-fns";

const LIMIT = 20;

// HTTP method badge color
function MethodBadge({ method }: { method: string }) {
  const m = method?.toUpperCase();
  return <StatusBadge status={m} label={m} />;
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["auditLogs", page],
    queryFn: () => getAuditLogs(page, LIMIT),
  });

  const logs: any[] = data?.data ?? [];
  const meta = data?.meta ?? {};

  const filtered = search
    ? logs.filter(
        (l) =>
          String(l.adminId).includes(search) ||
          String(l.targetUserId).includes(search) ||
          l.path?.toLowerCase().includes(search.toLowerCase()) ||
          l.method?.toLowerCase().includes(search.toLowerCase()),
      )
    : logs;

  const columns: Column[] = [
    {
      key: "id",
      header: "ID",
      className: "font-mono text-xs text-gray-500",
      render: (v) => `#${v}`,
    },
    {
      key: "adminId",
      header: "Admin ID",
      render: (v) => (
        <Badge variant="outline" className="font-mono text-xs">
          Admin #{v}
        </Badge>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (v) => <MethodBadge method={v} />,
    },
    {
      key: "path",
      header: "Path",
      className: "max-w-[260px] truncate font-mono text-xs text-gray-500",
      render: (v) => (
        <span className="font-mono text-xs text-gray-500 truncate block max-w-[260px]" title={v}>
          {v}
        </span>
      ),
    },
    {
      key: "targetUserId",
      header: "Target User",
      render: (v) => v ? `User #${v}` : "—",
    },
    {
      key: "createdAt",
      header: "Timestamp",
      render: (v) =>
        v ? format(new Date(v), "dd MMM yyyy, HH:mm:ss") : "—",
    },
  ];

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Every admin action is recorded here automatically."
      />

      {/* Filter */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by admin ID, user ID or path..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-gray-200"
          />
        </div>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-sm text-gray-500">
            Total:{" "}
            <span className="font-semibold text-gray-800">
              {(meta.total ?? 0).toLocaleString()}
            </span>{" "}
            entries
          </p>
        </div>
        <DataTable
          columns={columns}
          data={filtered}
          loading={isLoading}
          rowKey={(row) => row.id}
          pagination={{
            mode: "0-based",
            page,
            totalPages: meta.totalPages ?? 1,
            total: meta.total,
            onPageChange: setPage,
          }}
        />
      </div>
    </div>
  );
}
