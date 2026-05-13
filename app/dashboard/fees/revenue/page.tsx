"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getRevenueReport, settleCollection } from "@/lib/financeService";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNairaRaw } from "@/components/ui/MoneyCell";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

function SummaryPanel({
  label,
  data,
  accent,
  loading,
  onSettle,
}: {
  label: string;
  data: any;
  accent?: boolean;
  loading: boolean;
  onSettle?: (id: number) => void;
}) {
  const settled = label === "Settled";

  const breakdownColumns: Column[] = [
    { key: "serviceType", header: "Service Type", className: "font-medium text-sm" },
    {
      key: "count",
      header: "Count",
      headerClassName: "text-right",
      className: "text-right font-mono text-sm",
    },
    {
      key: "platformRevenue",
      header: "Revenue",
      headerClassName: "text-right",
      render: (v) => <div className="text-right font-mono text-sm">{formatNairaRaw(v)}</div>,
    },
    {
      key: "providerFees",
      header: "Provider Fees",
      headerClassName: "text-right",
      render: (v) => <div className="text-right font-mono text-sm">{formatNairaRaw(v)}</div>,
    },
    ...(!settled && onSettle
      ? [{
          key: "id",
          header: "Actions",
          headerClassName: "text-right",
          render: (id: number) => (
            <div className="text-right">
              <Button
                size="sm"
                variant="ghost"
                className="text-blue hover:bg-blue/5 text-xs"
                onClick={() => onSettle(id)}
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Retry
              </Button>
            </div>
          ),
        }]
      : []),
  ];

  return (
    <div className={`rounded-xl border bg-white shadow-sm overflow-hidden ${accent ? "border-blue/20" : "border-gray-100"}`}>
      <div className={`px-6 py-4 border-b ${accent ? "border-blue/10 bg-blue/5" : "border-gray-100"}`}>
        <h3 className={`font-semibold text-base ${accent ? "text-blue" : "text-gray-900"}`}>{label}</h3>
      </div>
      {/* Summary row */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        {[
          { label: "Transactions", value: data?.totalTransactions },
          { label: "Platform Revenue", value: formatNairaRaw(data?.totalPlatformRevenue) },
          { label: "Provider Fees", value: formatNairaRaw(data?.totalProviderFees) },
        ].map((item) => (
          <div key={item.label} className="px-6 py-4">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            {loading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <p className="text-lg font-bold tabular-nums text-gray-900">{item.value ?? "—"}</p>
            )}
          </div>
        ))}
      </div>
      {/* Breakdown table */}
      <DataTable
        columns={breakdownColumns}
        data={data?.breakdown ?? []}
        loading={loading}
        rowKey={(r, i) => i}
        emptyMessage="No data for this period."
      />
    </div>
  );
}

export default function RevenueReportPage() {
  const [startDate, setStartDate] = useState(
    format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

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

  const settledData = (data as any)?.settled;
  const unsettledData = (data as any)?.unsettled;

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Revenue Report"
        subtitle="Platform fee revenue — values shown in naira (pre-converted)."
      />

      {/* Date range */}
      <div className="flex gap-4 items-end flex-wrap">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Start Date</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white border-gray-200" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">End Date</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-white border-gray-200" />
        </div>
      </div>

      {/* Two panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SummaryPanel label="Settled" data={settledData} accent loading={isLoading} />
        <SummaryPanel
          label="Unsettled"
          data={unsettledData}
          loading={isLoading}
          onSettle={(id) => settleMutation.mutate(id)}
        />
      </div>
    </div>
  );
}
