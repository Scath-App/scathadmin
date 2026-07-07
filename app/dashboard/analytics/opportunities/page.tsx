"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOpportunityAnalytics, AdminAnalyticsWindow } from "@/lib/analyticsService";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Download, Calendar, ChevronLeft, Briefcase, TrendingUp, Users, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Clock
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function OpportunitiesAnalyticsPage() {
  const [window, setWindow] = useState<AdminAnalyticsWindow>("30d");
  
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-opportunities", window],
    queryFn: () => getOpportunityAnalytics(window),
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
            <Briefcase className="w-8 h-8 text-orange-500" /> Investments Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Capital deployment, returns, and opportunity performance.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={window} onValueChange={(val) => setWindow(val as AdminAnalyticsWindow)}>
            <SelectTrigger className="w-[140px] bg-white">
              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24 Hours</SelectItem>
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
          title="Capital Deployed"
          value={isLoading ? "..." : formatCompact(cards?.totalCapitalDeployed)}
          icon={ArrowDownToLine}
          colorClass="text-orange-600"
          iconBgClass="bg-orange-50"
          tooltip="Currently active invested principal."
        />
        <StatCard
          title="Total Raised (All Time)"
          value={isLoading ? "..." : formatCompact(cards?.totalCapitalRaised)}
          icon={Briefcase}
          colorClass="text-indigo-600"
          iconBgClass="bg-indigo-50"
        />
        <StatCard
          title="Returns Paid"
          value={isLoading ? "..." : formatCompact(cards?.totalReturnsPaid)}
          icon={ArrowUpFromLine}
          colorClass="text-emerald-600"
          iconBgClass="bg-emerald-50"
        />
        <StatCard
          title="Total Investors"
          value={isLoading ? "..." : (cards?.totalInvestors?.toLocaleString() ?? "—")}
          icon={Users}
          colorClass="text-blue-600"
          iconBgClass="bg-blue-50"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center text-center">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Created</p>
          <p className="text-xl font-bold">{isLoading ? "..." : cards?.totalCreated?.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center text-center">
          <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider mb-1">Active</p>
          <p className="text-xl font-bold text-orange-600">{isLoading ? "..." : cards?.active?.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center text-center">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Sold Out</p>
          <p className="text-xl font-bold">{isLoading ? "..." : cards?.soldOut?.toLocaleString()}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-center text-center">
          <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">Avg ROI</p>
          <p className="text-xl font-bold text-emerald-700">{isLoading ? "..." : `${cards?.avgRoi?.toFixed(1)}%`}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-center text-center">
          <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider mb-1">Payout Success</p>
          <p className="text-xl font-bold text-blue-700">{isLoading ? "..." : `${cards?.payoutSuccessRate?.toFixed(1)}%`}</p>
        </div>
      </div>

      {/* Per-Opportunity Drilldown Table */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100/80">
          <h3 className="font-bold text-gray-900">Per-Opportunity Performance</h3>
          <p className="text-xs text-gray-500 mt-1">Capital raise progress and investor counts for each opportunity.</p>
        </div>
        <div className="flex-1 overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-gray-50/80 border-b-gray-100/80">
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Opportunity</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Status</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Raise Progress</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Investors</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Avg Investment</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Returns Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (charts?.opportunities?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-12 text-sm">No investment opportunities found</TableCell>
                </TableRow>
              ) : (
                charts?.opportunities?.map((opp) => {
                  const progress = Math.min(100, Math.round(((opp.totalRaised || 0) / (opp.fundingGoal || 1)) * 100));
                  return (
                    <TableRow key={opp.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-gray-900">
                        {opp.name}
                        <span className="block text-[10px] text-emerald-600 mt-0.5">{opp.roiPercentage}% ROI</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={opp.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5 w-48">
                          <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                            <span>{formatCompact(opp.totalRaised)}</span>
                            <span>{formatCompact(opp.fundingGoal)}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                          <span className="text-[9px] text-gray-400 text-right">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-gray-500 font-mono text-xs">{opp.investorCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-gray-600 text-xs">{formatNaira(opp.avgInvestment)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-emerald-600">{opp.totalReturnsPaid > 0 ? formatNaira(opp.totalReturnsPaid) : "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  );
}
