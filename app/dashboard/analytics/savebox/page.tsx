"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSaveboxAnalytics, AdminAnalyticsWindow } from "@/lib/analyticsService";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  Download, Calendar, ChevronLeft, PiggyBank, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, XCircle, TrendingUp, Briefcase
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function SaveboxAnalyticsPage() {
  const [window, setWindow] = useState<AdminAnalyticsWindow>("30d");
  
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-savebox", window],
    queryFn: () => getSaveboxAnalytics(window),
  });

  const cards = data?.cards;
  const charts = data?.charts;

  const formatNaira = (value: number | undefined) => {
    if (value == null) return "—";
    return `₦${(value / 100).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
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
            <PiggyBank className="w-8 h-8 text-indigo-500" /> Savebox Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Savings plans, portfolio allocations, and interest economy metrics.
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

      {/* Hero Metrics Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Capital Held"
          value={isLoading ? "..." : formatNaira(cards?.totalCapitalHeld)}
          icon={PiggyBank}
          colorClass="text-indigo-600"
          iconBgClass="bg-indigo-50"
          tooltip="Current AUM across all active Saveboxes."
        />
        <StatCard
          title="Total Deposited"
          value={isLoading ? "..." : formatNaira(cards?.totalDeposited)}
          icon={ArrowDownToLine}
          colorClass="text-blue-600"
          iconBgClass="bg-blue-50"
        />
        <StatCard
          title="Total Withdrawn"
          value={isLoading ? "..." : formatNaira(cards?.totalWithdrawn)}
          icon={ArrowUpFromLine}
          colorClass="text-orange-600"
          iconBgClass="bg-orange-50"
        />
        <StatCard
          title="Interest Paid (Cost)"
          value={isLoading ? "..." : formatNaira(cards?.totalInterestEarned)}
          icon={TrendingUp}
          colorClass="text-emerald-600"
          iconBgClass="bg-emerald-50"
          tooltip="Funded by Scath via the Savebox Pool."
        />
      </div>

      {/* Hero Metrics Row 2 (Lifecycle) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Created</p>
          <p className="text-2xl font-bold">{isLoading ? "..." : cards?.totalCreated?.toLocaleString()}</p>
        </div>
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Active</p>
          <p className="text-2xl font-bold text-indigo-900">{isLoading ? "..." : cards?.currentlyActive?.toLocaleString()}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Matured</p>
          <p className="text-2xl font-bold text-emerald-900">{isLoading ? "..." : cards?.matured?.toLocaleString()}</p>
        </div>
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">Withdrawn Early</p>
          <p className="text-2xl font-bold text-rose-900">{isLoading ? "..." : cards?.withdrawnEarly?.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Breakdown By Type */}
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100/80">
            <h3 className="font-bold text-gray-900">Savebox by Type</h3>
          </div>
          <div className="flex-1 overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-gray-50/80 border-b-gray-100/80">
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Type</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Count</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Capital</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Avg Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : (charts?.breakdownByType?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-400 py-12 text-sm">No data</TableCell>
                  </TableRow>
                ) : (
                  charts?.breakdownByType?.map((item) => (
                    <TableRow key={item.type} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-gray-900 capitalize">
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700">{item.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-gray-500 font-mono text-xs">{item.count.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-gray-800">{formatNaira(item.capital)}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-mono text-xs">{item.avgInterestRate}%</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Portfolio Allocations */}
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-gray-900">Portfolio Allocations (Equity)</h3>
            </div>
          </div>
          <div className="flex-1 overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-gray-50/80 border-b-gray-100/80">
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Company Listing</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Portfolios</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Capital Allocated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : (charts?.portfolioAllocations?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-400 py-12 text-sm">No portfolio allocations yet</TableCell>
                  </TableRow>
                ) : (
                  charts?.portfolioAllocations?.map((item) => (
                    <TableRow key={item.equityListingId} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-gray-900">{item.companyName}</TableCell>
                      <TableCell className="text-right text-gray-500 font-mono text-xs">{item.saveboxCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-indigo-700">{formatNaira(item.totalEquityCapital)}</TableCell>
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
