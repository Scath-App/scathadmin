"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getRevenueReport, settleCollection } from "@/lib/financeService";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNairaRaw } from "@/components/ui/MoneyCell";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, ArrowDownLeft, Layers, CheckCircle2, Clock } from "lucide-react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
  INTERBANK_TRANSFER: "Interbank Transfer",
  WALLET_TRANSFER:    "Wallet Transfer",
  VERIFICATION:       "Verification",
  AIRTIME:            "Airtime",
  DATA:               "Data",
  CABLE_TV:           "Cable TV",
  UTILITY:            "Utility",
};

const QUICK_RANGES = [
  { label: "7d",   days: 7 },
  { label: "30d",  days: 30 },
  { label: "90d",  days: 90 },
];

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, loading, accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border bg-white px-5 py-4 flex items-center gap-4 shadow-sm",
      accent ? "border-blue/20 bg-blue/5" : "border-gray-100",
    )}>
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
        accent ? "bg-blue/10" : "bg-gray-100",
      )}>
        <Icon className={cn("w-4 h-4", accent ? "text-blue" : "text-gray-500")} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        {loading ? (
          <Skeleton className="h-5 w-24" />
        ) : (
          <p className={cn("text-lg font-bold tabular-nums", accent ? "text-blue" : "text-gray-900")}>
            {value ?? "—"}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Breakdown row ────────────────────────────────────────────────────────────

function BreakdownRow({
  row, settled, onSettle, settling,
}: {
  row: any;
  settled: boolean;
  onSettle?: (id: number) => void;
  settling?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {SERVICE_LABELS[row.serviceType] ?? row.serviceType}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-gray-400 mb-0.5">Transactions</p>
        <p className="text-sm font-semibold text-gray-900 tabular-nums">{row.transactionCount ?? 0}</p>
      </div>
      <div className="shrink-0 text-right hidden sm:block">
        <p className="text-xs text-gray-400 mb-0.5">Revenue</p>
        <p className="text-sm font-semibold text-green-700 tabular-nums font-mono">{formatNairaRaw(row.platformRevenue)}</p>
      </div>
      <div className="shrink-0 text-right hidden md:block">
        <p className="text-xs text-gray-400 mb-0.5">Provider Fees</p>
        <p className="text-sm font-semibold text-gray-500 tabular-nums font-mono">{formatNairaRaw(row.providerFees)}</p>
      </div>
      {!settled && onSettle && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 h-7 text-xs gap-1 border-gray-200"
          disabled={settling}
          onClick={() => onSettle(row.id)}
        >
          <RefreshCw className={cn("w-3 h-3", settling && "animate-spin")} />
          Retry
        </Button>
      )}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

function RevenuePanel({
  settled, data, loading, onSettle, settling,
}: {
  settled: boolean;
  data: any;
  loading: boolean;
  onSettle?: (id: number) => void;
  settling?: boolean;
}) {
  const breakdown: any[] = data?.breakdown ?? [];

  return (
    <div className={cn(
      "rounded-xl border bg-white shadow-sm overflow-hidden",
      settled ? "border-blue/20" : "border-gray-100",
    )}>
      {/* Panel header */}
      <div className={cn(
        "flex items-center gap-2.5 px-5 py-4 border-b",
        settled ? "bg-blue/5 border-blue/10" : "border-gray-100",
      )}>
        <div className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center",
          settled ? "bg-blue/10" : "bg-gray-100",
        )}>
          {settled
            ? <CheckCircle2 className="w-4 h-4 text-blue" />
            : <Clock className="w-4 h-4 text-gray-500" />
          }
        </div>
        <div>
          <p className={cn("text-sm font-semibold", settled ? "text-blue" : "text-gray-800")}>
            {settled ? "Settled" : "Unsettled"}
          </p>
          <p className="text-xs text-gray-400">
            {settled ? "Completed fee collections" : "Pending settlement"}
          </p>
        </div>
        {!loading && (
          <Badge variant="outline" className="ml-auto text-xs">
            {breakdown.length} service{breakdown.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        {[
          { label: "Transactions", value: data?.summary?.totalTransactions ?? data?.totalTransactions },
          { label: "Platform Revenue", value: formatNairaRaw(data?.summary?.totalPlatformRevenue ?? data?.totalPlatformRevenue) },
          { label: "Provider Fees",    value: formatNairaRaw(data?.summary?.totalProviderFees ?? data?.totalProviderFees) },
        ].map((stat) => (
          <div key={stat.label} className="px-4 py-4">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1.5">{stat.label}</p>
            {loading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <p className="text-base font-bold tabular-nums text-gray-900">{stat.value ?? "—"}</p>
            )}
          </div>
        ))}
      </div>

      {/* Breakdown rows */}
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-20 hidden sm:block" />
            <Skeleton className="h-4 w-20 hidden md:block" />
          </div>
        ))
      ) : breakdown.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-400">No data for this period.</p>
        </div>
      ) : (
        breakdown.map((row, i) => (
          <BreakdownRow
            key={i}
            row={row}
            settled={settled}
            onSettle={onSettle}
            settling={settling}
          />
        ))
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RevenueReportPage() {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(subDays(today, 30), "yyyy-MM-dd"));
  const [endDate,   setEndDate]   = useState(format(today, "yyyy-MM-dd"));
  const [activeRange, setActiveRange] = useState<number | null>(30);

  const { data, isLoading } = useQuery({
    queryKey: ["revenueReport", startDate, endDate],
    queryFn: () => getRevenueReport(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });

  const settleMutation = useMutation({
    mutationFn: (id: number) => settleCollection(id),
    onSuccess: () => toast.success("Settlement retried successfully."),
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Settlement failed."),
  });

  const applyRange = (days: number) => {
    setActiveRange(days);
    setStartDate(format(subDays(today, days), "yyyy-MM-dd"));
    setEndDate(format(today, "yyyy-MM-dd"));
  };

  const settledData   = (data as any)?.settled;
  const unsettledData = (data as any)?.unsettled;

  // Combined top-level stats
  const totalRevenue =
    (settledData?.summary?.totalPlatformRevenue ?? settledData?.totalPlatformRevenue ?? 0) +
    (unsettledData?.summary?.totalPlatformRevenue ?? unsettledData?.totalPlatformRevenue ?? 0);
  const totalTxns =
    (settledData?.summary?.totalTransactions ?? settledData?.totalTransactions ?? 0) +
    (unsettledData?.summary?.totalTransactions ?? unsettledData?.totalTransactions ?? 0);
  const totalProviderFees =
    (settledData?.summary?.totalProviderFees ?? settledData?.totalProviderFees ?? 0) +
    (unsettledData?.summary?.totalProviderFees ?? unsettledData?.totalProviderFees ?? 0);

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Revenue Report"
        subtitle="Platform fee revenue and provider costs for the selected period."
      />

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Quick range pills */}
        <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white p-1">
          {QUICK_RANGES.map(({ label, days }) => (
            <button
              key={days}
              onClick={() => applyRange(days)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                activeRange === days
                  ? "bg-blue text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom dates */}
        <div className="flex items-end gap-2">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">From</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setActiveRange(null); }}
              className="h-9 text-sm bg-white border-gray-200 w-36"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">To</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setActiveRange(null); }}
              className="h-9 text-sm bg-white border-gray-200 w-36"
            />
          </div>
        </div>
      </div>

      {/* ── Top-level summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Transactions" value={isLoading ? "…" : totalTxns.toLocaleString()} icon={Layers} loading={isLoading} />
        <StatCard label="Total Platform Revenue" value={isLoading ? "…" : formatNairaRaw(totalRevenue)} icon={TrendingUp} loading={isLoading} accent />
        <StatCard label="Total Provider Fees" value={isLoading ? "…" : formatNairaRaw(totalProviderFees)} icon={ArrowDownLeft} loading={isLoading} />
      </div>

      {/* ── Settled / Unsettled panels ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RevenuePanel settled data={settledData} loading={isLoading} />
        <RevenuePanel
          settled={false}
          data={unsettledData}
          loading={isLoading}
          onSettle={(id) => settleMutation.mutate(id)}
          settling={settleMutation.isPending}
        />
      </div>
    </div>
  );
}
