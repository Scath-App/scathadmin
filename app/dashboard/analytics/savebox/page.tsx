"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getSaveboxAnalytics,
  getSaveboxDurationItems,
  downloadSaveboxReportPdf,
  AdminAnalyticsWindow,
  SaveboxDurationItem,
} from "@/lib/analyticsService";
import { AnalyticsDateFilter } from "@/components/analytics/AnalyticsDateFilter";
import { format, subDays, formatDistanceToNow, differenceInDays, isPast } from "date-fns";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  Download, Calendar, ChevronLeft, PiggyBank, ArrowDownToLine, ArrowUpFromLine,
  CheckCircle2, XCircle, TrendingUp, Briefcase, Clock, User, Mail, Hash,
  CalendarCheck, CalendarX, Info, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatNaira = (value: number | undefined | null) => {
  if (value == null) return "—";
  return `₦${(value / 100).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return format(new Date(iso), "dd MMM yyyy");
};

const fmtDatetime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return format(new Date(iso), "dd MMM yyyy, HH:mm");
};

const getMaturityBadgeClass = (iso: string | null | undefined) => {
  if (!iso) return "bg-gray-100 text-gray-500 border-gray-200";
  const d = new Date(iso);
  if (isPast(d)) return "bg-rose-50 text-rose-700 border-rose-200";
  const days = differenceInDays(d, new Date());
  if (days <= 30) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
};

const statusBadgeClass = (status: string) => {
  switch (status?.toLowerCase()) {
    case "active": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "matured": return "bg-blue-50 text-blue-700 border-blue-200";
    case "withdrawn": return "bg-gray-100 text-gray-600 border-gray-200";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

// ─── Drawer ─────────────────────────────────────────────────────────────────

interface DurationDrawerProps {
  open: boolean;
  onClose: () => void;
  durationMonths: number;
  type?: string;
  queryParam?: any;
}

function DurationInspectionDrawer({ open, onClose, durationMonths, type, queryParam }: DurationDrawerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["savebox-duration-items", durationMonths, type, queryParam],
    queryFn: () => getSaveboxDurationItems(durationMonths, type, queryParam),
    enabled: open,
  });

  const items = data?.items ?? [];
  const label = durationMonths === 0
    ? "Instant Access"
    : `${durationMonths} ${durationMonths === 1 ? "Month" : "Months"}`;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0" side="right">
        <SheetHeader className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50/60 to-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100/80">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold text-gray-900">
                {label}{type ? ` · ${type.toUpperCase()}` : ""} Saveboxes
              </SheetTitle>
              <SheetDescription className="text-xs text-gray-500 mt-0.5">
                Individual savebox records — sorted by earliest maturity date
              </SheetDescription>
            </div>
          </div>
          {!isLoading && items.length > 0 && (
            <p className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full w-fit mt-2">
              {items.length} savebox{items.length !== 1 ? "es" : ""}
            </p>
          )}
        </SheetHeader>

        <div className="px-4 py-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-100 p-4 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-60" />
                <div className="flex gap-2 mt-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Info className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No records found for this duration tier.</p>
            </div>
          ) : (
            items.map((item) => <SaveboxItemCard key={item.saveboxId} item={item} />)
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SaveboxItemCard({ item }: { item: SaveboxDurationItem }) {
  const maturityPast = item.maturityDate ? isPast(new Date(item.maturityDate)) : false;
  const daysToMaturity = item.maturityDate
    ? differenceInDays(new Date(item.maturityDate), new Date())
    : null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-[0_1px_6px_rgb(0,0,0,0.04)] p-4 space-y-3 hover:border-indigo-200 hover:shadow-[0_2px_10px_rgb(99,102,241,0.08)] transition-all">
      {/* Top row: name + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{item.userName}</p>
            {item.userEmail && (
              <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                <Mail className="w-3 h-3 inline" /> {item.userEmail}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 capitalize ${statusBadgeClass(item.status)}`}>
            {item.status}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 uppercase bg-indigo-50 text-indigo-700 border-indigo-200">
            {item.type}
          </Badge>
        </div>
      </div>

      {/* Capital + Reference */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="font-mono font-bold text-gray-900 text-sm">{formatNaira(item.capital)}</span>
        <span className="text-gray-300">·</span>
        <span className="flex items-center gap-1">
          <Hash className="w-3 h-3" />
          <span className="font-mono text-gray-600">{item.reference}</span>
        </span>
      </div>

      {/* Dates row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-0.5">
            <CalendarCheck className="w-3 h-3" /> Created
          </p>
          <p className="text-xs font-semibold text-gray-800">{fmtDate(item.createdAt)}</p>
          <p className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</p>
        </div>
        <div className={`rounded-lg px-3 py-2 ${item.maturityDate ? (maturityPast ? "bg-rose-50" : daysToMaturity !== null && daysToMaturity <= 30 ? "bg-amber-50" : "bg-emerald-50") : "bg-gray-50"}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1 mb-0.5 ${item.maturityDate ? (maturityPast ? "text-rose-400" : daysToMaturity !== null && daysToMaturity <= 30 ? "text-amber-500" : "text-emerald-500") : "text-gray-400"}`}>
            <CalendarX className="w-3 h-3" /> Matures
          </p>
          {item.maturityDate ? (
            <>
              <p className={`text-xs font-semibold ${maturityPast ? "text-rose-700" : daysToMaturity !== null && daysToMaturity <= 30 ? "text-amber-700" : "text-emerald-700"}`}>
                {fmtDate(item.maturityDate)}
              </p>
              <p className={`text-[10px] ${maturityPast ? "text-rose-400" : daysToMaturity !== null && daysToMaturity <= 30 ? "text-amber-400" : "text-emerald-400"}`}>
                {maturityPast ? "Matured" : `in ${daysToMaturity}d`}
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-400">No maturity date</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SaveboxAnalyticsPage() {
  const today = new Date();
  const [window, setWindow] = useState<AdminAnalyticsWindow>("30d");
  const [startDate, setStartDate] = useState(format(subDays(today, 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd"));
  const [activeRange, setActiveRange] = useState<number | null>(30);
  const [isExporting, setIsExporting] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDuration, setDrawerDuration] = useState(0);
  const [drawerType, setDrawerType] = useState<string | undefined>(undefined);

  const queryParam = activeRange !== null ? { window } : { startDate, endDate };

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-savebox", activeRange !== null ? window : `${startDate}_${endDate}`],
    queryFn: () => getSaveboxAnalytics(queryParam),
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
      await downloadSaveboxReportPdf(queryParam);
    } finally {
      setIsExporting(false);
    }
  };

  const openDrawer = (durationMonths: number, type?: string) => {
    setDrawerDuration(durationMonths);
    setDrawerType(type);
    setDrawerOpen(true);
  };

  const cards = data?.cards;
  const charts = data?.charts;

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-8 animate-in fade-in duration-500">

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <Link href="/dashboard" className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors mb-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Savebox Analytics</h1>
          <p className="text-sm text-gray-400 mt-1">Detailed overview of savebox activity, locked capital, and portfolio performance</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AnalyticsDateFilter
            window={window}
            activeRange={activeRange}
            startDate={startDate}
            endDate={endDate}
            onWindowChange={handleWindowChange}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || isLoading}
            className="border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? "Exporting..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2 shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))
        ) : (
          <>
            <StatCard title="Total Created" value={cards?.totalCreated?.toLocaleString() ?? "—"} icon={PiggyBank} />
            <StatCard title="Currently Active" value={cards?.currentlyActive?.toLocaleString() ?? "—"} icon={CheckCircle2} />
            <StatCard title="Matured" value={cards?.matured?.toLocaleString() ?? "—"} icon={Calendar} />
            <StatCard title="Withdrawn Early" value={cards?.withdrawnEarly?.toLocaleString() ?? "—"} icon={XCircle} />
            <StatCard title="Total Capital Held" value={formatNaira(cards?.totalCapitalHeld)} icon={TrendingUp} />
            <StatCard title="Total Interest Earned" value={formatNaira(cards?.totalInterestEarned)} icon={TrendingUp} />
            <StatCard title="Total Deposited" value={formatNaira(cards?.totalDeposited)} icon={ArrowDownToLine} />
            <StatCard title="Total Withdrawn" value={formatNaira(cards?.totalWithdrawn)} icon={ArrowUpFromLine} />
          </>
        )}
      </div>

      {/* Locked Capital by Duration (Fixed Save) */}
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-gray-900">Locked Funds by Duration (Fixed Save)</h3>
              <p className="text-xs text-gray-500">
                Breakdown of safe box locked funds by duration selection. Click a row to inspect individual saveboxes.
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-gray-50/80 border-b-gray-100/80">
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Duration Tier</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Type Breakdown</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Total Active Locks</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">Total Locked Capital</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Earliest Created</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Next Maturity</TableHead>
                <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Volume Share</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : (charts?.breakdownByDuration?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-400 py-8 text-sm">
                    No duration breakdown data returned for the selected period
                  </TableCell>
                </TableRow>
              ) : (
                (() => {
                  const durationMap: Record<number, {
                    durationMonths: number;
                    totalCapital: number;
                    totalCount: number;
                    earliestCreated: string | null;
                    earliestMaturity: string | null;
                    latestMaturity: string | null;
                    types: Array<{ type: string; count: number; capital: number }>;
                  }> = {};

                  (charts?.breakdownByDuration ?? []).forEach((item) => {
                    const dm = item.durationMonths;
                    if (!durationMap[dm]) {
                      durationMap[dm] = {
                        durationMonths: dm,
                        totalCapital: 0,
                        totalCount: 0,
                        earliestCreated: null,
                        earliestMaturity: null,
                        latestMaturity: null,
                        types: [],
                      };
                    }
                    durationMap[dm].totalCapital += (item.capital || 0);
                    durationMap[dm].totalCount += (item.count || 0);

                    // Track earliest created across all type sub-rows
                    if (item.earliestCreatedAt) {
                      const existing = durationMap[dm].earliestCreated;
                      if (!existing || new Date(item.earliestCreatedAt).getTime() < new Date(existing).getTime()) {
                        durationMap[dm].earliestCreated = item.earliestCreatedAt;
                      }
                    }
                    // Track earliest maturity (next maturity = soonest upcoming)
                    if (item.earliestMaturityDate) {
                      const existing = durationMap[dm].earliestMaturity;
                      if (!existing || new Date(item.earliestMaturityDate).getTime() < new Date(existing).getTime()) {
                        durationMap[dm].earliestMaturity = item.earliestMaturityDate;
                      }
                    }
                    if (item.latestMaturityDate) {
                      const existing = durationMap[dm].latestMaturity;
                      if (!existing || new Date(item.latestMaturityDate).getTime() > new Date(existing).getTime()) {
                        durationMap[dm].latestMaturity = item.latestMaturityDate;
                      }
                    }

                    durationMap[dm].types.push({
                      type: item.type ? item.type.toUpperCase() : "",
                      count: item.count || 0,
                      capital: item.capital || 0,
                    });
                  });

                  const groupedList = Object.values(durationMap).sort((a, b) => a.durationMonths - b.durationMonths);
                  const grandTotalCap = groupedList.reduce((acc, g) => acc + g.totalCapital, 0) || 1;

                  return groupedList.map((g) => {
                    const rawShare = (g.totalCapital / grandTotalCap) * 100;
                    const shareFormatted = rawShare.toFixed(1);
                    return (
                      <TableRow
                        key={g.durationMonths}
                        className="hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                        onClick={() => openDrawer(g.durationMonths)}
                      >
                        <TableCell className="font-medium text-gray-900">
                          <Badge variant="outline" className={g.durationMonths === 0 ? "bg-amber-50/60 text-amber-700 border-amber-200" : "bg-indigo-50/50 text-indigo-700 border-indigo-200"}>
                            {g.durationMonths === 0 ? "Instant Access" : `${g.durationMonths} ${g.durationMonths === 1 ? "Month" : "Months"}`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {g.types.map((t, tIdx) => (
                              <Badge
                                key={`${t.type}_${tIdx}`}
                                variant="secondary"
                                className="bg-gray-100/90 text-gray-700 text-[11px] font-normal border border-gray-200/60 py-0.5 px-2 cursor-pointer hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                                onClick={(e) => { e.stopPropagation(); openDrawer(g.durationMonths, t.type.toLowerCase()); }}
                              >
                                {t.type ? <span className="font-semibold uppercase text-[10px] text-indigo-900 mr-1">{t.type}:</span> : null}
                                <span className="font-mono text-gray-800">{formatNaira(t.capital)}</span>
                                <span className="text-gray-400 text-[10px] ml-1">({t.count})</span>
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-gray-500 font-mono text-xs">{g.totalCount.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-gray-900">{formatNaira(g.totalCapital)}</TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {g.earliestCreated ? (
                            <span className="inline-flex items-center gap-1">
                              <CalendarCheck className="w-3.5 h-3.5 text-gray-400" />
                              {fmtDate(g.earliestCreated)}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {g.earliestMaturity ? (
                            <Badge variant="outline" className={`text-[11px] px-2 py-0.5 ${getMaturityBadgeClass(g.earliestMaturity)}`}>
                              <CalendarX className="w-3 h-3 mr-1" />
                              {fmtDate(g.earliestMaturity)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="w-52">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(2, rawShare))}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 font-mono w-12 text-right">{shareFormatted}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300 group-hover:text-indigo-500 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()
              )}
            </TableBody>
          </Table>
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

      {/* Inspection Drawer */}
      <DurationInspectionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        durationMonths={drawerDuration}
        type={drawerType}
        queryParam={queryParam}
      />
    </div>
  );
}
