"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useQuery } from "@tanstack/react-query";
import { getVolumeAnalytics, downloadVolumeReportPdf, AdminAnalyticsWindow, getTopUsersByTransactionCount } from "@/lib/analyticsService";
import { AnalyticsDateFilter } from "@/components/analytics/AnalyticsDateFilter";
import { format, subDays } from "date-fns";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";
import {
  TrendingUp, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Download, Calendar, Activity, AlertTriangle, ShieldCheck, ShieldAlert, Eye
} from "lucide-react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function VolumeAnalyticsPage() {
  const today = new Date();
  const [window, setWindow] = useState<AdminAnalyticsWindow>("30d");
  const [startDate, setStartDate] = useState(format(subDays(today, 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd"));
  const [activeRange, setActiveRange] = useState<number | null>(30);
  const [isExporting, setIsExporting] = useState(false);

  const [topUsersSort, setTopUsersSort] = useState<"desc" | "asc">("desc");
  const [topUsersPage, setTopUsersPage] = useState(1);

  const queryParam = activeRange !== null ? { window } : { startDate, endDate };

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-volume", activeRange !== null ? window : `${startDate}_${endDate}`],
    queryFn: () => getVolumeAnalytics(queryParam),
  });

  const { data: topUsersData, isLoading: isTopUsersLoading } = useQuery({
    queryKey: ["top-users-transactions", activeRange !== null ? window : `${startDate}_${endDate}`, topUsersSort, topUsersPage],
    queryFn: () =>
      getTopUsersByTransactionCount({
        ...queryParam,
        sort: topUsersSort,
        page: topUsersPage,
        limit: 15,
      }),
  });

  const handleWindowChange = (w: AdminAnalyticsWindow, days: number) => {
    setWindow(w);
    setActiveRange(days);
    setStartDate(format(subDays(today, days), "yyyy-MM-dd"));
    setEndDate(format(today, "yyyy-MM-dd"));
  };

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    setActiveRange(null);
  };

  const handleEndDateChange = (date: string) => {
    setEndDate(date);
    setActiveRange(null);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadVolumeReportPdf(queryParam);
    } finally {
      setIsExporting(false);
    }
  };

  const cards = data?.cards;
  const charts = data?.charts;

  const formatNaira = (value: number | undefined) => {
    if (value == null) return "—";
    return `₦${(value / 100).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const formatCompact = (value: number | undefined) => {
    if (value == null) return "—";
    return `₦${(value / 100).toLocaleString("en-NG", { notation: "compact", maximumFractionDigits: 1 })}`;
  };

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-8 animate-in fade-in duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <Link href="/dashboard" className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-8 h-8 text-blue-500" /> Platform Volume
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Global transaction metrics and gross platform flow.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <AnalyticsDateFilter
            window={window}
            startDate={startDate}
            endDate={endDate}
            activeRange={activeRange}
            onWindowChange={handleWindowChange}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
          />
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Generating..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Hero Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Gross Transaction Volume"
          value={isLoading ? "..." : formatCompact(cards?.grossTransactionVolume)}
          icon={ArrowLeftRight}
          colorClass="text-blue-600"
          iconBgClass="bg-blue-50"
          tooltip="Total inflow + outflow across all sub-accounts."
        />
        <StatCard
          title="Total Inflow"
          value={isLoading ? "..." : formatCompact(cards?.totalInflow)}
          icon={ArrowDownRight}
          colorClass="text-emerald-600"
          iconBgClass="bg-emerald-50"
        />
        <StatCard
          title="Total Outflow"
          value={isLoading ? "..." : formatCompact(cards?.totalOutflow)}
          icon={ArrowUpRight}
          colorClass="text-rose-600"
          iconBgClass="bg-rose-50"
        />
        <StatCard
          title="Net Platform Flow"
          value={isLoading ? "..." : formatCompact(cards?.netPlatformFlow)}
          icon={TrendingUp}
          colorClass={cards?.netPlatformFlow && cards.netPlatformFlow >= 0 ? "text-emerald-600" : "text-rose-600"}
          iconBgClass={cards?.netPlatformFlow && cards.netPlatformFlow >= 0 ? "bg-emerald-50" : "bg-rose-50"}
          tooltip="Inflow minus outflow. Close to zero is healthy."
        />
      </div>

      {/* Volume Over Time Area Chart */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6">
        <h3 className="font-bold text-gray-900 mb-6">Volume Trend</h3>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full rounded-xl" />
        ) : (charts?.volumeOverTime?.length ?? 0) === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm bg-gray-50 rounded-xl">No trend data available</div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.volumeOverTime || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(val) => `₦${(val/100).toLocaleString(undefined, {notation: 'compact'})}`} />
                <Tooltip
                  formatter={(value: any) => formatNaira(value)}
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                />
                <Area type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} fill="url(#inflowGrad)" name="Inflow" />
                <Area type="monotone" dataKey="outflow" stroke="#f43f5e" strokeWidth={2} fill="url(#outflowGrad)" name="Outflow" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Account Breakdown & Transaction Health */}
        <div className="space-y-6">
          {/* Account Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6">
            <h3 className="font-bold text-gray-900 mb-4">Account Breakdown</h3>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Personal</p>
                  <p className="text-2xl font-bold text-slate-800">{charts?.accountBreakdown?.personalAccounts?.toLocaleString() ?? 0}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col items-center text-center">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Business</p>
                  <p className="text-2xl font-bold text-blue-900">{charts?.accountBreakdown?.businessAccounts?.toLocaleString() ?? 0}</p>
                </div>
                <div className="col-span-2 flex justify-between items-center text-sm border-t border-gray-100 pt-3 mt-1">
                  <span className="text-gray-500">Active (30d): <span className="font-semibold text-gray-900">{charts?.accountBreakdown?.activeAccounts30d?.toLocaleString() ?? 0}</span></span>
                  <span className="text-gray-500">Avg Balance: <span className="font-semibold text-gray-900">{formatNaira(charts?.accountBreakdown?.avgBalance)}</span></span>
                </div>
              </div>
            )}
          </div>

          {/* Transaction Health */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 text-center">
              <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-emerald-600">{isLoading ? "..." : `${(charts?.transactionHealth?.successRate ?? 0).toFixed(1)}%`}</p>
              <p className="text-xs text-emerald-700 font-medium mt-1">Success</p>
            </div>
            <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5 text-center">
              <AlertTriangle className="w-5 h-5 text-rose-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-rose-600">{isLoading ? "..." : `${(charts?.transactionHealth?.failureRate ?? 0).toFixed(1)}%`}</p>
              <p className="text-xs text-rose-700 font-medium mt-1">Failure</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 text-center">
              <ArrowLeftRight className="w-5 h-5 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-600">{isLoading ? "..." : `${(charts?.transactionHealth?.reversalRate ?? 0).toFixed(1)}%`}</p>
              <p className="text-xs text-amber-700 font-medium mt-1">Reversal</p>
            </div>
          </div>
        </div>

        {/* Volume by Category */}
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100/80">
            <h3 className="font-bold text-gray-900">Volume by Category</h3>
          </div>
          <div className="flex-1 overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-gray-50/80 border-b-gray-100/80">
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Category</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Count</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : (charts?.volumeByCategory?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-400 py-12 text-sm">No volume data</TableCell>
                  </TableRow>
                ) : (
                  charts?.volumeByCategory?.map((item) => (
                    <TableRow key={item.category} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-gray-900 capitalize">{item.category}</TableCell>
                      <TableCell className="text-right text-gray-500 font-mono text-xs">{item.count.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-gray-800">{formatNaira(item.volume)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

      </div>

      {/* ── User Transaction Leaderboard & Suspicious Activity Monitoring ──────────── */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                User Transaction Activity & Suspicious Monitoring
              </h2>
              <p className="text-xs text-gray-500">
                Track and filter user transaction counts in the selected date range to detect outliers and suspicious activity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500">Sort by count:</span>
            <Select value={topUsersSort} onValueChange={(v) => { setTopUsersSort(v as "desc" | "asc"); setTopUsersPage(1); }}>
              <SelectTrigger className="w-[180px] h-9 bg-white border-gray-200 text-xs font-semibold shadow-none">
                <SelectValue placeholder="Sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Highest to Lowest</SelectItem>
                <SelectItem value="asc">Lowest to Highest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-gray-50/80 border-b-gray-100/80">
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide w-12">Rank</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">User Details</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Tx Count</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Total Volume</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Avg Tx Size</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-center">Status / Flag</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTopUsersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 mx-auto rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto rounded-lg" /></TableCell>
                  </TableRow>
                ))
              ) : (topUsersData?.data?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-400 py-12 text-sm">
                    No transactions recorded for any user in this date range.
                  </TableCell>
                </TableRow>
              ) : (
                topUsersData?.data?.map((u, idx) => {
                  const rank = (topUsersPage - 1) * 15 + idx + 1;
                  const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || `User #${u.userId}`;
                  return (
                    <TableRow key={u.userId} className={cn("hover:bg-gray-50/70 transition-colors", u.isSuspiciousFlag && "bg-amber-50/40 hover:bg-amber-50/60")}>
                      <TableCell className="font-mono text-xs font-bold text-gray-500">#{rank}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900 text-sm leading-snug">{name}</span>
                          <span className="text-xs text-gray-400 font-mono">{u.email || "No email"} {u.phoneNumber ? `• ${u.phoneNumber}` : ""}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono font-bold text-sm text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
                          {u.transactionCount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-gray-900 text-xs">
                        ₦{u.totalVolumeInNaira.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-gray-600">
                        ₦{u.avgTxSizeInNaira.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        {u.isSuspiciousFlag ? (
                          <Badge variant="outline" className="bg-amber-100/80 text-amber-800 border-amber-300 font-bold text-[10px] uppercase tracking-wider animate-pulse inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> High Activity
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium uppercase tracking-wider">
                            Normal
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/users/${u.userId}`}>
                          <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1 font-medium">
                            <Eye className="w-3.5 h-3.5" /> Inspect
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination footer */}
        {topUsersData?.meta && topUsersData.meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-500">
            <span>Showing page {topUsersData.meta.page} of {topUsersData.meta.totalPages} ({topUsersData.meta.total} active users in period)</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs px-3 border-gray-200"
                disabled={topUsersPage <= 1}
                onClick={() => setTopUsersPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs px-3 border-gray-200"
                disabled={topUsersPage >= topUsersData.meta.totalPages}
                onClick={() => setTopUsersPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
