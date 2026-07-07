"use client";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useQueries } from "@tanstack/react-query";
import { getPendingPayouts } from "@/lib/financeService";
import { getAuditLogs, enrichAuditLog } from "@/lib/userService";
import { getAdminAnalyticsOverview } from "@/lib/analyticsService";
import { getOffers, getPendingOfferRequests } from "@/lib/offerService";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area
} from "recharts";
import {
  Users, DollarSign, Clock, TrendingUp, ArrowRight,
  AlertCircle, CheckCircle2, ChevronRight,
  Briefcase, Receipt, BarChart3, ShoppingBag, FileText
} from "lucide-react";
import { format } from "date-fns";

const CHART_COLORS = ["#074D97", "#53A753", "#FFC52F", "#5727F5", "#EA4335", "#0980FF"];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const role = (user?.role || "").toUpperCase();
  const isAdminOrStaff = role === "ADMIN" || role === "STAFF";
  const isPartner = role === "PARTNER";

  // Admin/Staff queries
  const adminResults = useQueries({
    queries: [
      { 
        queryKey: ["analytics-overview"], 
        queryFn: () => getAdminAnalyticsOverview("30d"),
        enabled: isAdminOrStaff,
      },
      { 
        queryKey: ["pendingPayouts-count"], 
        queryFn: getPendingPayouts,
        enabled: isAdminOrStaff,
      },
      { 
        queryKey: ["auditLogs-recent"], 
        queryFn: () => getAuditLogs(0, 10),
        enabled: isAdminOrStaff,
      },
    ],
  });

  // Partner queries
  const partnerResults = useQueries({
    queries: [
      {
        queryKey: ["offers", 0],
        queryFn: () => getOffers(0, 100),
        enabled: isPartner,
      },
      {
        queryKey: ["pendingOfferRequests"],
        queryFn: getPendingOfferRequests,
        enabled: isPartner,
      },
    ],
  });

  // ── PARTNER DASHBOARD ───────────────────────────────────────────────────────
  if (isPartner) {
    const [offersQuery, requestsQuery] = partnerResults;
    const offers = Array.isArray(offersQuery.data) ? offersQuery.data : [];
    const pending = Array.isArray(requestsQuery.data) ? requestsQuery.data : (requestsQuery.data as any)?.data ?? [];

    const totalOffers = offers.length;
    const activeOffers = offers.filter((o: any) => o.isActive).length;
    const pendingRequests = pending.filter(
      (r: any) => r.status === "clicked" || r.status === "CLICKED" || r.status === "pending" || r.status === "PENDING"
    );
    const pendingRequestsCount = pendingRequests.length;

    const isLoading = offersQuery.isLoading || requestsQuery.isLoading;
    const recentRequests = pending.slice(0, 5);

    const partnerQuickActions = [
      {
        label: "Manage Offers",
        desc: "View & edit your listed services",
        href: "/dashboard/offers",
        icon: ShoppingBag,
        color: "bg-blue/10 text-blue border-blue/20 hover:bg-blue/15",
      },
      {
        label: "Service Requests",
        desc: "Review requests & submit quotes",
        href: "/dashboard/service-requests",
        icon: FileText,
        color: "bg-yellow/10 text-yellow border-yellow/20 hover:bg-yellow/15",
        badge: pendingRequestsCount > 0 ? pendingRequestsCount : null,
      },
    ];

    return (
      <div className="px-6 sm:px-8 pt-8 pb-16 space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Welcome back, {user?.firstName || "Partner"}
          </h1>
          <p className="text-sm text-gray-500">
            Manage your service offerings, check click metrics, and submit quotes for user requests.
          </p>
        </div>

        {!isLoading && pendingRequestsCount > 0 && (
          <div className="relative group overflow-hidden bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200/60 shadow-[0_2px_10px_rgb(250,204,21,0.1)] rounded-2xl px-5 py-3.5 flex items-center gap-3 transition-all hover:shadow-[0_4px_20px_rgb(250,204,21,0.15)] hover:border-yellow-300/50">
            <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-transparent pointer-events-none" />
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100/80 shrink-0">
              <div className="absolute inset-0 rounded-full border border-yellow-400 animate-ping opacity-20" />
              <AlertCircle className="w-4 h-4 text-yellow-600" />
            </div>
            <p className="text-sm font-medium text-yellow-900 flex-1 relative z-10">
              You have <span className="font-bold text-yellow-700">{pendingRequestsCount} pending service request{pendingRequestsCount !== 1 ? "s" : ""}</span> awaiting quotes.
            </p>
            <Link
              href="/dashboard/service-requests"
              className="flex items-center gap-1.5 text-xs font-semibold text-yellow-700 bg-white/60 hover:bg-white px-3 py-1.5 rounded-lg transition-colors relative z-10 backdrop-blur-sm"
            >
              Review <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            title="Total Offers"
            value={isLoading ? "..." : String(totalOffers)}
            icon={ShoppingBag}
            colorClass="text-blue"
            iconBgClass="bg-faintSky"
          />
          <StatCard
            title="Active Offers"
            value={isLoading ? "..." : String(activeOffers)}
            icon={CheckCircle2}
            colorClass="text-greeny"
            iconBgClass="bg-greeny/10"
          />
          <StatCard
            title="Pending Requests"
            value={isLoading ? "..." : String(pendingRequestsCount)}
            icon={Clock}
            colorClass="text-yellow"
            iconBgClass="bg-yellow/10"
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {partnerQuickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <div
                  className={cn(
                    "relative group overflow-hidden rounded-2xl border px-4 py-5 flex flex-col gap-3 cursor-pointer transition-all duration-300",
                    "hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]",
                    action.color
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  {action.badge != null && (
                    <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow-sm shadow-red-500/30">
                      {action.badge}
                    </span>
                  )}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="p-2.5 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm ring-1 ring-white/50">
                      <action.icon className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                  <div className="relative z-10 mt-1">
                    <p className="text-sm font-bold tracking-tight leading-tight">{action.label}</p>
                    <p className="text-[11px] opacity-75 mt-1 leading-tight font-medium">{action.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100/80 flex items-center justify-between bg-gray-50/30">
            <div>
              <h3 className="font-bold text-gray-900">Recent Service Requests</h3>
              <p className="text-xs text-gray-400 mt-0.5">Track recent customer clicks and quote statuses</p>
            </div>
            <Button variant="ghost" size="sm" className="text-blue text-sm" asChild>
              <Link href="/dashboard/service-requests">View all</Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-gray-50/80 border-b-gray-100/80">
                  {["Offer Name", "Status", "Customer Email", "Time", "Action"].map((h) => (
                    <TableHead key={h} className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {[1, 2, 3, 4, 5].map((c) => (
                        <TableCell key={c}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : recentRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400 h-20 text-sm">
                      <div className="flex flex-col items-center gap-1.5">
                        <CheckCircle2 className="w-5 h-5 text-gray-300" />
                        No service requests yet
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  recentRequests.map((req: any) => (
                    <TableRow key={req.id} className="hover:bg-gray-50/80 transition-colors border-b-gray-100/60">
                      <TableCell className="font-medium text-sm text-gray-950">
                        {req.offer?.name ?? req.offerName ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={req.status} />
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {req.user?.email ?? `User #${req.userId}`}
                      </TableCell>
                      <TableCell className="text-xs text-gray-400">
                        {req.clickedAt ? format(new Date(req.clickedAt), "dd MMM, HH:mm") : "—"}
                      </TableCell>
                      <TableCell>
                        {(req.status === "clicked" || req.status === "CLICKED") ? (
                          <Link href="/dashboard/service-requests" className="text-xs text-blue hover:underline font-semibold">
                            Submit Quote
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  }

  // ── ADMIN / STAFF DASHBOARD ─────────────────────────────────────────────────
  const [analyticsResult, payoutsResult, logsResult] = adminResults;

  const analytics = analyticsResult.data;
  const cards = analytics?.cards;
  const charts = analytics?.charts;

  const totalUsers = cards?.totalUsers ?? "—";
  const totalDeletedUsers = cards?.totalDeletedUsers ?? "—";
  const pendingPayouts = Array.isArray(payoutsResult.data) ? payoutsResult.data : [];
  const pendingCount = pendingPayouts.length;

  const treasuryBalance = cards?.mainAccountBalanceInNaira != null
    ? `₦${Number(cards.mainAccountBalanceInNaira).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`
    : "—";
    
  const settledRevenue = cards?.settledRevenueInNaira != null
    ? `₦${Number(cards.settledRevenueInNaira).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`
    : "—";

  const lifetimeRevenueBalance = cards?.lifetimeRevenueBalanceInNaira != null
    ? `₦${Number(cards.lifetimeRevenueBalanceInNaira).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`
    : "—";

  const accounts = charts?.treasuryByPurpose ?? [];
  const recentLogs: any[] = (logsResult.data?.data ?? []).map(enrichAuditLog);

  const purposeData = accounts.map((account: any) => ({
    name: account.purpose,
    value: account.balanceInNaira,
  }));

  const userGrowthData = (charts?.userGrowth ?? []).map((d: any) => ({
    date: d.bucket ? format(new Date(d.bucket), "dd MMM") : "",
    "New Users": d.newUsers,
    Deleted: d.deletedUsers,
  }));

  const quickActions = [
    {
      label: "Manage Users",
      desc: "View, search & manage all users",
      href: "/dashboard/users",
      icon: Users,
      color: "bg-blue/10 text-blue border-blue/20 hover:bg-blue/15",
    },
    {
      label: "Pending Payouts",
      desc: "Review & process pending payouts",
      href: "/dashboard/finance/payouts",
      icon: Clock,
      color: "bg-yellow/10 text-yellow border-yellow/20 hover:bg-yellow/15",
      badge: !payoutsResult.isLoading && pendingCount > 0 ? pendingCount : null,
    },
    {
      label: "Equity Listings",
      desc: "Manage equity & exit requests",
      href: "/dashboard/equity",
      icon: TrendingUp,
      color: "bg-greeny/10 text-greeny border-greeny/20 hover:bg-greeny/15",
    },
    {
      label: "Fee Config",
      desc: "Configure platform fee rates",
      href: "/dashboard/fees",
      icon: Receipt,
      color: "bg-purple/10 text-purple border-purple/20 hover:bg-purple/15",
    },
    {
      label: "Investments",
      desc: "Manage investment opportunities",
      href: "/dashboard/investments",
      icon: Briefcase,
      color: "bg-orange-100 text-orange-600 border-orange-200 hover:bg-orange-100/80",
    },
    {
      label: "Treasury",
      desc: "View treasury & account balances",
      href: "/dashboard/finance/treasury",
      icon: DollarSign,
      color: "bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-100/80",
    },
  ];

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-8 animate-in fade-in duration-500">
      
      {/* Platform Pulse Banner */}
      <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border-2 border-blue-500/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 relative overflow-hidden">
        {/* Subtle decorative background elements */}
        <div className="absolute top-0 right-0 p-32 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm ring-1 ring-gray-100">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Platform Pulse</h2>
              <p className="text-sm font-medium text-gray-500">All Time Summary</p>
            </div>
          </div>
          <Link href="/dashboard/analytics/volume" className="flex items-center gap-2 text-sm font-semibold text-blue-700 bg-blue-50/50 hover:bg-blue-100/50 transition-colors px-4 py-2.5 rounded-lg ring-1 ring-blue-200/50 shadow-sm">
            Detailed Reports <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          
          {/* Total Inflow */}
          <Link href="/dashboard/analytics/volume" className="flex flex-col justify-center p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 hover:bg-emerald-50 transition-colors group">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Inflow</p>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-emerald-950 tracking-tight">
              ₦{analyticsResult.isLoading ? "..." : ((cards?.lifetimeInflowInKobo || 0) / 100).toLocaleString("en-NG", { notation: "compact", maximumFractionDigits: 1 })}
            </p>
          </Link>

          {/* Total Outflow */}
          <Link href="/dashboard/analytics/volume" className="flex flex-col justify-center p-4 rounded-xl bg-rose-50/50 border border-rose-100 hover:bg-rose-50 transition-colors group">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-rose-100 flex items-center justify-center text-rose-600">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Total Outflow</p>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-rose-950 tracking-tight">
              ₦{analyticsResult.isLoading ? "..." : ((cards?.lifetimeOutflowInKobo || 0) / 100).toLocaleString("en-NG", { notation: "compact", maximumFractionDigits: 1 })}
            </p>
          </Link>

          {/* Savebox */}
          <Link href="/dashboard/analytics/savebox" className="flex flex-col justify-center p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 hover:bg-indigo-50 transition-colors group">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Savebox Active</p>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-indigo-950 tracking-tight">
              {analyticsResult.isLoading ? "..." : (cards?.activeSaveboxCount || 0).toLocaleString()}
            </p>
          </Link>

          {/* Investments */}
          <Link href="/dashboard/analytics/opportunities" className="flex flex-col justify-center p-4 rounded-xl bg-orange-50/50 border border-orange-100 hover:bg-orange-50 transition-colors group">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center text-orange-600">
                <Users className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Investors</p>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-orange-950 tracking-tight">
              {analyticsResult.isLoading ? "..." : (cards?.totalInvestorsCount || 0).toLocaleString()}
            </p>
          </Link>

          {/* Equity */}
          <Link href="/dashboard/analytics/equity" className="flex flex-col justify-center p-4 rounded-xl bg-cyan-50/50 border border-cyan-100 hover:bg-cyan-50 transition-colors group">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-cyan-100 flex items-center justify-center text-cyan-600">
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-bold text-cyan-700 uppercase tracking-wider">Listed Equity</p>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-cyan-950 tracking-tight">
              {analyticsResult.isLoading ? "..." : (cards?.totalEquityCompaniesCount || 0).toLocaleString()}
            </p>
          </Link>

        </div>
      </div>

      {!payoutsResult.isLoading && pendingCount > 0 && (
        <div className="relative group overflow-hidden bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200/60 shadow-[0_2px_10px_rgb(250,204,21,0.1)] rounded-2xl px-5 py-3.5 flex items-center gap-3 transition-all hover:shadow-[0_4px_20px_rgb(250,204,21,0.15)] hover:border-yellow-300/50">
          <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100/80 shrink-0">
            <div className="absolute inset-0 rounded-full border border-yellow-400 animate-ping opacity-20" />
            <AlertCircle className="w-4 h-4 text-yellow-600" />
          </div>
          <p className="text-sm font-medium text-yellow-900 flex-1 relative z-10">
            <span className="font-bold text-yellow-700">{pendingCount} payout{pendingCount !== 1 ? "s" : ""}</span> awaiting approval
          </p>
          <Link
            href="/dashboard/finance/payouts"
            className="flex items-center gap-1.5 text-xs font-semibold text-yellow-700 bg-white/60 hover:bg-white px-3 py-1.5 rounded-lg transition-colors relative z-10 backdrop-blur-sm"
          >
            Review <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Users"
          value={analyticsResult.isLoading ? "..." : String(totalUsers)}
          icon={Users}
          colorClass="text-blue"
          iconBgClass="bg-faintSky"
        />
        <StatCard
          title="Deleted Users"
          value={analyticsResult.isLoading ? "..." : String(totalDeletedUsers)}
          icon={AlertCircle}
          colorClass="text-red-500"
          iconBgClass="bg-red-50"
        />

        <StatCard
          title="Revenue Generated (30d)"
          value={analyticsResult.isLoading ? "..." : settledRevenue}
          icon={TrendingUp}
          colorClass="text-purple"
          iconBgClass="bg-purple/10"
        />
        <StatCard
          title="Revenue Bank Balance"
          value={analyticsResult.isLoading ? "..." : lifetimeRevenueBalance}
          icon={DollarSign}
          colorClass="text-orange-600"
          iconBgClass="bg-orange-100"
        />
        <StatCard
          title="Rewards Balance"
          value={analyticsResult.isLoading ? "..." : (cards?.rewardsBalance != null ? Number(cards.rewardsBalance).toLocaleString() : "—")}
          icon={Briefcase}
          colorClass="text-cyan-600"
          iconBgClass="bg-cyan-50"
        />
        <StatCard
          title="Pending Payouts"
          value={payoutsResult.isLoading ? "..." : String(pendingCount)}
          icon={Clock}
          colorClass="text-yellow"
          iconBgClass="bg-yellow/10"
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <div
                className={cn(
                  "relative group overflow-hidden rounded-2xl border px-4 py-5 flex flex-col gap-3 cursor-pointer transition-all duration-300",
                  "hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]",
                  action.color
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                {action.badge != null && (
                  <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow-sm shadow-red-500/30">
                    {action.badge}
                  </span>
                )}
                <div className="flex items-center justify-between relative z-10">
                  <div className="p-2.5 rounded-xl bg-white/60 backdrop-blur-sm shadow-sm ring-1 ring-white/50">
                    <action.icon className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                </div>
                <div className="relative z-10 mt-1">
                  <p className="text-sm font-bold tracking-tight leading-tight">{action.label}</p>
                  <p className="text-[11px] opacity-75 mt-1 leading-tight hidden sm:block font-medium">{action.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">User Growth</h3>
            <Link href="/dashboard/analytics">
              <Button variant="ghost" size="sm" className="text-blue text-xs">
                View trends <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          {analyticsResult.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : userGrowthData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={userGrowthData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="newUsersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#074D97" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#074D97" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="deletedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EA4335" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#EA4335" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "#fff", border: "1px solid #f0f0f0", borderRadius: "10px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", fontSize: "12px", padding: "10px 14px"
                  }} 
                />
                <Area type="monotone" dataKey="New Users" stroke="#074D97" strokeWidth={2} fill="url(#newUsersGrad)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="Deleted" stroke="#EA4335" strokeWidth={1.5} strokeDasharray="5 3" fill="url(#deletedGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Balance by Purpose</h3>
          </div>
          {analyticsResult.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : purposeData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data</div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={purposeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} strokeWidth={2}>
                    {purposeData.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `₦${Number(v).toLocaleString("en-NG")}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {purposeData.map((item: any, i: number) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-gray-600 capitalize truncate">{item.name}</span>
                    <span className="ml-auto font-mono text-gray-900">
                      ₦{Number(item.value).toLocaleString("en-NG", { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100/80 flex items-center justify-between bg-gray-50/30">
          <div>
            <h3 className="font-bold text-gray-900">Recent Activity</h3>
            <p className="text-xs text-gray-400 mt-0.5">Last 10 admin audit log entries</p>
          </div>
          <Button variant="ghost" size="sm" className="text-blue text-sm" asChild>
            <Link href="/dashboard/users/audit-logs">View all</Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-gray-50/80 border-b-gray-100/80">
                {["Admin", "Action", "Target User", "Summary", "Time"].map((h) => (
                  <TableHead key={h} className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsResult.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5].map((c) => (
                      <TableCell key={c}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : recentLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400 h-20 text-sm">
                    <div className="flex flex-col items-center gap-1.5">
                      <CheckCircle2 className="w-5 h-5 text-gray-300" />
                      No recent activity
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                recentLogs.map((log: any) => (
                  <TableRow key={log.id} className="hover:bg-gray-50/80 transition-colors border-b-gray-100/60">
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs text-gray-600">
                        {log.admin?.displayName ?? `Admin #${log.adminId}`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.method ?? "GET"} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {log.targetUser?.displayName ?? (log.targetUserId ? `User #${log.targetUserId}` : "—")}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-[200px] truncate" title={log.description ?? log.endpoint ?? log.path}>
                      {log.description ?? log.endpoint ?? log.path}
                    </TableCell>
                    <TableCell className="text-xs text-gray-400">
                      {log.createdAt ? format(new Date(log.createdAt), "dd MMM, HH:mm") : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
