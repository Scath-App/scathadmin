"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEquityAnalytics, AdminAnalyticsWindow } from "@/lib/analyticsService";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Download, Calendar, ChevronLeft, TrendingUp, Users, ArrowDownToLine, CheckCircle2, Lock, ArrowRightLeft, Building
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/badge";

export default function EquityAnalyticsPage() {
  const [window, setWindow] = useState<AdminAnalyticsWindow>("30d");
  
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-equity", window],
    queryFn: () => getEquityAnalytics(window),
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
            <Building className="w-8 h-8 text-cyan-600" /> Equity Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Listed companies, shareholder distribution, and exit requests.
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Equity Capital"
          value={isLoading ? "..." : formatCompact(cards?.totalEquityCapital)}
          icon={ArrowDownToLine}
          colorClass="text-cyan-600"
          iconBgClass="bg-cyan-50"
          tooltip="Total capital invested across all active companies."
        />
        <StatCard
          title="Total Shareholders"
          value={isLoading ? "..." : cards?.totalShareholders?.toLocaleString()}
          icon={Users}
          colorClass="text-indigo-600"
          iconBgClass="bg-indigo-50"
        />
        <StatCard
          title="Pending Exits Value"
          value={isLoading ? "..." : formatCompact(cards?.totalExitValueRequested)}
          icon={ArrowRightLeft}
          colorClass="text-amber-600"
          iconBgClass="bg-amber-50"
        />
        <StatCard
          title="Locked-In Users"
          value={isLoading ? "..." : cards?.lockInComplianceCount?.toLocaleString()}
          icon={Lock}
          colorClass="text-emerald-600"
          iconBgClass="bg-emerald-50"
          tooltip="Number of shareholders currently bound by a lock-in period."
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center text-center">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Listed</p>
          <p className="text-xl font-bold">{isLoading ? "..." : cards?.totalCompaniesListed?.toLocaleString()}</p>
        </div>
        <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-100 shadow-sm flex flex-col justify-center text-center">
          <p className="text-[10px] font-semibold text-cyan-700 uppercase tracking-wider mb-1">Active Listings</p>
          <p className="text-xl font-bold text-cyan-800">{isLoading ? "..." : cards?.activeListings?.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center text-center">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Shares Issued</p>
          <p className="text-xl font-bold font-mono">{isLoading ? "..." : cards?.totalSharesIssued?.toLocaleString()}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-center text-center">
          <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">Approved Exits</p>
          <p className="text-xl font-bold text-emerald-700">{isLoading ? "..." : formatCompact(cards?.approvedExitValue)}</p>
        </div>
      </div>

      {/* Per-Company Drilldown Table */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100/80">
          <h3 className="font-bold text-gray-900">Per-Company Overview</h3>
          <p className="text-xs text-gray-500 mt-1">Valuation, capitalization, and shareholder distribution.</p>
        </div>
        <div className="flex-1 overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-gray-50/80 border-b-gray-100/80">
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Company</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Status</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Valuation</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Capital Raised</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Shareholders</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Pending Exits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (charts?.companies?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-12 text-sm">No equity listings found</TableCell>
                </TableRow>
              ) : (
                charts?.companies?.map((company) => (
                  <TableRow key={company.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-medium text-gray-900">
                      {company.companyName}
                      <span className="block text-[10px] text-gray-500 mt-0.5 font-mono">₦{(company.sharePrice / 100).toLocaleString()} / share</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={company.status} />
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-gray-800">{formatCompact(company.valuation)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-cyan-700">{formatNaira(company.capitalRaised)}</TableCell>
                    <TableCell className="text-right text-gray-500 font-mono text-xs">{company.shareholdersCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-amber-600 text-xs">{company.pendingExitsValue > 0 ? formatCompact(company.pendingExitsValue) : "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Source Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6">
          <h3 className="font-bold text-gray-900 mb-6">Capital Source</h3>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                <span className="text-sm font-medium text-gray-700">Via Savebox Portfolio</span>
                <span className="font-mono font-semibold text-indigo-700">{formatCompact(charts?.saveboxLinkedEquity?.capitalViaSavebox)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                <span className="text-sm font-medium text-gray-700">Direct Purchase</span>
                <span className="font-mono font-semibold text-cyan-700">{formatCompact(charts?.saveboxLinkedEquity?.capitalViaDirect)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Exit Requests Dashboard */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900">Exit Requests Overview</h3>
            <Link href="/dashboard/equity">
              <Button variant="ghost" size="sm" className="text-blue-600 text-xs">
                Manage Exits &rarr;
              </Button>
            </Link>
          </div>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/50 flex flex-col justify-center">
                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">Pending</p>
                <p className="text-lg font-bold text-amber-700">{charts?.exitRequests?.pendingCount?.toLocaleString() ?? 0}</p>
                <p className="text-[10px] font-mono text-amber-600/80 mt-1">{formatCompact(charts?.exitRequests?.pendingValue)}</p>
              </div>
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 flex flex-col justify-center">
                <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">Approved</p>
                <p className="text-lg font-bold text-emerald-700">{charts?.exitRequests?.approvedCount?.toLocaleString() ?? 0}</p>
                <p className="text-[10px] font-mono text-emerald-600/80 mt-1">{formatCompact(charts?.exitRequests?.approvedValue)}</p>
              </div>
              <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/50 flex flex-col justify-center">
                <p className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider mb-1">Rejected</p>
                <p className="text-lg font-bold text-rose-700">{charts?.exitRequests?.rejectedCount?.toLocaleString() ?? 0}</p>
                <p className="text-[10px] font-mono text-rose-600/80 mt-1">{formatCompact(charts?.exitRequests?.rejectedValue)}</p>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-center">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Expired</p>
                <p className="text-lg font-bold text-gray-700">{charts?.exitRequests?.expiredCount?.toLocaleString() ?? 0}</p>
                <p className="text-[10px] font-mono text-gray-500 mt-1">{formatCompact(charts?.exitRequests?.expiredValue)}</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
