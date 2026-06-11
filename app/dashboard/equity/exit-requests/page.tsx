"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExitRequests, approveExitRequest, rejectExitRequest } from "@/lib/equityService";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MoneyCell } from "@/components/ui/MoneyCell";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const LIMIT = 20;

export default function ExitRequestsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["exitRequests", page],
    queryFn: () => getExitRequests(page, LIMIT),
  });

  const requests: any[] = data?.data ?? [];
  const meta = data?.meta ?? {};

  const approveMutation = useMutation({
    mutationFn: ({ id, adminNote }: { id: number; adminNote: string }) =>
      approveExitRequest(id, adminNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exitRequests"] });
      toast.success("Exit request approved.");
      setApprovingId(null);
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message ?? "Approval failed.");
      setApprovingId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, adminNote }: { id: number; adminNote: string }) =>
      rejectExitRequest(id, adminNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exitRequests"] });
      toast.success("Exit request rejected.");
      setRejectingId(null);
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message ?? "Rejection failed.");
      setRejectingId(null);
    },
  });

  const columns: Column[] = [
    { key: "id", header: "ID", render: (v) => `#${v}`, className: "font-mono text-xs text-gray-500" },
    {
      key: "userId",
      header: "User",
      render: (_, row) => row.user ? `${row.user.firstName ?? ""} ${row.user.lastName ?? ""}`.trim() || `User #${row.userId}` : `User #${row.userId}`,
    },
    {
      key: "company",
      header: "Company",
      render: (_, row) => row.equity?.company ?? row.equityId ?? "—",
    },
    { key: "shares", header: "Shares", className: "font-mono text-sm" },
    {
      key: "sharePriceAtRequest",
      header: "Share Price",
      headerClassName: "text-right",
      render: (v) => <div className="text-right"><MoneyCell kobo={v} /></div>,
    },
    {
      key: "requestedValue",
      header: "Requested Value",
      headerClassName: "text-right",
      render: (v) => <div className="text-right"><MoneyCell kobo={v} /></div>,
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: "expiresAt",
      header: "Expires",
      render: (v) => v ? format(new Date(v), "dd MMM yyyy") : "—",
    },
    {
      key: "adminNote",
      header: "Admin Note",
      className: "text-sm text-gray-500 max-w-[150px] truncate",
      render: (v) => v ?? "—",
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      render: (_v, row) =>
        row.status === "pending" || row.status === "PENDING" ? (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="text-greeny hover:bg-greeny/10 text-xs gap-1"
              onClick={() => setApprovingId(row.id)}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red hover:bg-red/10 text-xs gap-1"
              onClick={() => setRejectingId(row.id)}
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Equity Exit Requests"
        subtitle="Review and process user requests to exit equity positions."
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={requests}
          loading={isLoading}
          rowKey={(r) => r.id}
          emptyMessage="No exit requests found."
          pagination={{
            mode: "1-based",
            page,
            totalPages: meta.totalPages ?? 1,
            total: meta.total,
            onPageChange: setPage,
          }}
        />
      </div>

      <ConfirmModal
        open={approvingId !== null}
        onOpenChange={(v) => !v && setApprovingId(null)}
        title="Approve Exit Request"
        message="Are you sure you want to approve this exit request?"
        confirmLabel="Approve"
        reasonField
        reasonLabel="Admin note"
        loading={approveMutation.isPending}
        onConfirm={(note) => approveMutation.mutate({ id: approvingId!, adminNote: note ?? "" })}
      />

      <ConfirmModal
        open={rejectingId !== null}
        onOpenChange={(v) => !v && setRejectingId(null)}
        title="Reject Exit Request"
        danger
        reasonField
        reasonLabel="Admin note (required)"
        reasonRequired
        confirmLabel="Reject"
        loading={rejectMutation.isPending}
        onConfirm={(note) => rejectMutation.mutate({ id: rejectingId!, adminNote: note ?? "" })}
      />
    </div>
  );
}
