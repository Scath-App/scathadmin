"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvoices, reopenPaidInvoice, Invoice } from "@/lib/invoiceService";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/hooks/useRole";
import {
  FileText,
  RotateCcw,
  RefreshCw,
  DollarSign,
  Calendar,
  User,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 20;

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "draft", label: "Draft" },
  { value: "cancelled", label: "Cancelled" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(amountInKobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amountInKobo / 100);
}

function customerName(customer?: Invoice["customer"]) {
  if (!customer) return "—";
  const full = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
  return full || customer.email || `Customer #${customer.id}`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useRole();

  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");

  // Target for the reopen modal — holds the invoice being actioned
  const [reopenTarget, setReopenTarget] = useState<Invoice | null>(null);

  // ── List query
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["invoices", page, statusFilter],
    queryFn: () =>
      getInvoices(page, LIMIT, statusFilter === "all" ? undefined : statusFilter),
  });

  const invoices: Invoice[] = data?.data ?? (Array.isArray(data) ? data : []);
  const meta = data?.meta ?? {};

  // ── Reopen mutation
  const reopenMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      reopenPaidInvoice(id, reason),
    onSuccess: (updated: Invoice) => {
      toast.success(
        `Invoice ${updated.invoiceNumber ?? `#${updated.id}`} reopened — now ${updated.status}.`,
      );
      setReopenTarget(null);
      // Replace the stale entry in every cached page so badges update instantly
      queryClient.setQueriesData<any>(
        { queryKey: ["invoices"] },
        (old: any) => {
          if (!old) return old;
          const list: Invoice[] = old?.data ?? (Array.isArray(old) ? old : []);
          const next = list.map((inv) => (inv.id === updated.id ? updated : inv));
          return old?.data ? { ...old, data: next } : next;
        },
      );
    },
    onError: (e: any) => {
      toast.error(
        e.response?.data?.message ?? "Failed to reopen invoice.",
      );
    },
  });

  // ── Table columns
  const columns: Column[] = [
    {
      key: "invoiceNumber",
      header: "Invoice",
      render: (v, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue/10 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-blue" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {v ?? `#${row.id}`}
            </p>
            <p className="text-[11px] text-gray-400">
              {row.createdAt
                ? format(new Date(row.createdAt), "dd MMM yyyy")
                : "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (customer) => (
        <div className="flex items-center gap-1.5 text-sm text-gray-700">
          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {customerName(customer)}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: "total",
      header: "Amount",
      render: (v) => (
        <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
          <DollarSign className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {v != null ? formatMoney(v) : "—"}
        </div>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      render: (v) => (
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {v ? format(new Date(v), "dd MMM yyyy") : "—"}
        </div>
      ),
    },
    {
      key: "paidAt",
      header: "Paid At",
      render: (v) =>
        v ? (
          <span className="text-sm text-gray-500">
            {format(new Date(v), "dd MMM yyyy")}
          </span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        ),
    },
    {
      key: "id",
      header: "Actions",
      headerClassName: "text-right",
      render: (id, row: Invoice) => {
        const isRunning =
          reopenMutation.isPending && reopenTarget?.id === id;

        // Only show "Reopen" for paid invoices (admin only)
        if (!isAdmin || row.status !== "paid") {
          return <div className="text-right text-xs text-gray-300">—</div>;
        }

        return (
          <div className="text-right">
            <Button
              size="sm"
              variant="outline"
              className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 gap-1.5 whitespace-nowrap"
              disabled={isRunning}
              onClick={() => setReopenTarget(row)}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} />
              {isRunning ? "Reopening…" : "Reopen"}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Invoices"
        subtitle="View and manage all platform invoices."
        actions={
          <Button
            size="sm"
            variant="outline"
            className="border-gray-200 gap-1.5 text-gray-500 hover:text-gray-900"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Status filter tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(v) => {
          setStatusFilter(v);
          setPage(0);
        }}
        className="w-full"
      >
        <TabsList className="bg-gray-100 p-1 rounded-xl w-auto inline-flex flex-wrap gap-0.5">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm px-4"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            {/* Error state */}
            {isError && !isLoading && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center bg-white rounded-xl border border-gray-100 shadow-sm">
                <AlertCircle className="w-10 h-10 text-red/60" />
                <p className="text-sm font-medium text-gray-700">
                  Failed to load invoices
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-200 mt-1"
                  onClick={() => refetch()}
                >
                  Try again
                </Button>
              </div>
            )}

            {/* Table */}
            {!isError && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <DataTable
                  columns={columns}
                  data={invoices}
                  loading={isLoading}
                  rowKey={(r) => r.id}
                  emptyMessage="No invoices found for this status."
                  pagination={{
                    mode: "0-based",
                    page,
                    totalPages: meta.totalPages ?? 1,
                    total: meta.total,
                    onPageChange: setPage,
                  }}
                />
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* ── Reopen confirmation modal ──────────────────────────────────── */}
      <ConfirmModal
        open={!!reopenTarget}
        onOpenChange={(v) => {
          if (!v && !reopenMutation.isPending) setReopenTarget(null);
        }}
        title="Reopen paid invoice"
        message={
          reopenTarget
            ? `This will reverse the manual settlement for ${reopenTarget.invoiceNumber ?? `invoice #${reopenTarget.id}`} and set it back to Sent or Overdue. This action cannot be undone.`
            : undefined
        }
        confirmLabel="Reopen invoice"
        cancelLabel="Cancel"
        reasonField
        reasonLabel="Reason for reopening"
        reasonRequired
        loading={reopenMutation.isPending}
        onConfirm={(reason) => {
          if (reopenTarget && reason) {
            reopenMutation.mutate({ id: reopenTarget.id, reason });
          }
        }}
      />
    </div>
  );
}
