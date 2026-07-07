"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useQuery } from "@tanstack/react-query";
import { getVolumeAnalytics, AdminAnalyticsWindow } from "@/lib/analyticsService";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";
import {
  TrendingUp, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Download, Calendar, Activity, AlertTriangle, ShieldCheck
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function VolumeAnalyticsPage() {
  const [window, setWindow] = useState<AdminAnalyticsWindow>("30d");
  
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-volume", window],
    queryFn: () => getVolumeAnalytics(window),
  });

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
        
        <div className="flex items-center gap-3">
          <Select value={window} onValueChange={(val) => setWindow(val as AdminAnalyticsWindow)}>
            <SelectTrigger className="w-[140px] bg-white">
              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export PDF
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
                  formatter={(value: number) => formatNaira(value)}
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
    </div>
  );
}
