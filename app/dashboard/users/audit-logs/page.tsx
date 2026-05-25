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

  const enrichedLogs = logs.map((l) => {
    let targetUserId = l.targetUserId;
    let desc = l.description;

    if (!desc && l.endpoint) {
      const match = l.endpoint.match(/\/admin\/users\/(\d+)(?=\/|$|\?)/);
      const adminStr = l.admin?.displayName ?? `Admin #${l.adminId}`;

      if (match) {
        targetUserId = Number(match[1]);
        const targetStr = l.targetUser?.displayName ?? `User #${targetUserId}`;
        
        if (l.endpoint.includes("/saveboxes")) desc = `${adminStr} viewed ${targetStr}'s saveboxes`;
        else if (l.endpoint.includes("/transactions")) desc = `${adminStr} viewed ${targetStr}'s transactions`;
        else if (l.endpoint.includes("/equity")) desc = `${adminStr} viewed ${targetStr}'s equity portfolio`;
        else if (l.endpoint.includes("/investments")) desc = `${adminStr} viewed ${targetStr}'s investments`;
        else desc = `${adminStr} viewed ${targetStr}'s profile`;
      } else if (l.endpoint.includes("/admin/users/deleted")) {
        desc = `${adminStr} viewed deleted users`;
      } else if (l.endpoint.includes("/admin/users")) {
        if (l.endpoint.includes("/audit/logs")) {
          desc = `${adminStr} viewed audit logs`;
        } else {
          desc = `${adminStr} viewed users list`;
        }
      }
    }

    return {
      ...l,
      targetUserId,
      description: desc,
    };
  });

  const filtered = search
    ? enrichedLogs.filter(
        (l) =>
          String(l.adminId).includes(search) ||
          String(l.targetUserId).includes(search) ||
          l.endpoint?.toLowerCase().includes(search.toLowerCase()) ||
          l.method?.toLowerCase().includes(search.toLowerCase()) ||
          l.description?.toLowerCase().includes(search.toLowerCase()) ||
          l.admin?.displayName?.toLowerCase().includes(search.toLowerCase()) ||
          l.targetUser?.displayName?.toLowerCase().includes(search.toLowerCase()),
      )
    : enrichedLogs;

  const columns: Column[] = [
    {
      key: "id",
      header: "ID",
      className: "font-mono text-xs text-gray-500",
      render: (v) => `#${v}`,
    },
    {
      key: "adminId",
      header: "Admin",
      render: (v, row) => (
        <span className="font-medium">
          {row.admin?.displayName ?? `Admin #${v}`}
        </span>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (v) => <MethodBadge method={v} />,
    },
    {
      key: "endpoint",
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
      render: (v, row) => row.targetUser?.displayName ?? (v ? `User #${v}` : "—"),
    },
    {
      key: "description",
      header: "Summary",
      className: "text-gray-700",
      render: (v) => v ?? "—",
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
            placeholder="Search logs..."
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
