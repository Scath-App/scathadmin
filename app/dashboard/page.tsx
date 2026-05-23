"use client";

import { useAuthStore } from "@/hooks/useAuthStore";
import { useQueries } from "@tanstack/react-query";
import { getUsers } from "@/lib/userService";
import { getPendingPayouts, getAccountDashboard } from "@/lib/financeService";
import { getAuditLogs } from "@/lib/userService";
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
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import {
  Users, DollarSign, Clock, TrendingUp, ArrowRight,
  AlertCircle, CheckCircle2, ChevronRight,
  Briefcase, Receipt, BarChart3,
} from "lucide-react";
import { format } from "date-fns";

const CHART_COLORS = ["#074D97", "#53A753", "#FFC52F", "#5727F5", "#EA4335", "#0980FF"];

export default function DashboardPage() {
  const { user } = useAuthStore();

  const results = useQueries({
    queries: [
      { queryKey: ["users-count"], queryFn: () => getUsers(0, 1) },
      { queryKey: ["pendingPayouts-count"], queryFn: getPendingPayouts },
      { queryKey: ["accountDashboard-overview"], queryFn: () => getAccountDashboard(0, 100) },
      { queryKey: ["auditLogs-recent"], queryFn: () => getAuditLogs(0, 10) },
    ],
  });

  const [usersResult, payoutsResult, dashboardResult, logsResult] = results;

  const totalUsers = usersResult.data?.meta?.total ?? usersResult.data?.total ?? "—";
  const pendingPayouts = Array.isArray(payoutsResult.data) ? payoutsResult.data : [];
  const pendingCount = pendingPayouts.length;
  const summary = dashboardResult.data?.summary ?? {};
  const treasuryBalance = summary.totalBalanceInNaira != null
    ? `₦${Number(summary.totalBalanceInNaira).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`
    : "—";

  const accounts: any[] = dashboardResult.data?.data ?? [];
  const recentLogs: any[] = logsResult.data?.data ?? [];

  // Chart data
  const purposeData = accounts.reduce((acc: any[], account: any) => {
    const purpose = account.purpose ?? "other";
    const existing = acc.find((a) => a.name === purpose);
    if (existing) {
      existing.value += account.balanceInNaira ?? 0;
    } else {
      acc.push({ name: purpose, value: account.balanceInNaira ?? 0 });
    }
    return acc;
  }, []);

  const balanceBarData = accounts.slice(0, 8).map((acc: any) => ({
    name: (acc.accountName ?? "").slice(0, 12),
    balance: acc.balanceInNaira ?? 0,
    book: acc.bookBalanceInNaira ?? 0,
  }));

  // ── Attention items ──────────────────────────────────────────────────────────
  const attentionItems = [
    {
      label: "Pending Payouts",
      count: payoutsResult.isLoading ? null : pendingCount,
      href: "/dashboard/finance/payouts",
      urgent: pendingCount > 0,
      icon: Clock,
      color: "text-yellow",
      bg: "bg-yellow/10 border-yellow/20",
    },
    {
      label: "Platform Accounts",
      count: dashboardResult.isLoading ? null : (summary.totalAccounts ?? accounts.length),
      href: "/dashboard/accounts",
      urgent: false,
      icon: BarChart3,
      color: "text-blue",
      bg: "bg-blue/10 border-blue/20",
    },
    {
      label: "Total Users",
      count: usersResult.isLoading ? null : totalUsers,
      href: "/dashboard/users",
      urgent: false,
      icon: Users,
      color: "text-greeny",
      bg: "bg-greeny/10 border-greeny/20",
    },
  ];

  // ── Quick actions ────────────────────────────────────────────────────────────
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
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-8">

      {/* ── Needs Attention strip ─────────────────────────────────────────── */}
      {!payoutsResult.isLoading && pendingCount > 0 && (
        <div className="flex items-center gap-3 bg-yellow/10 border border-yellow/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-yellow shrink-0" />
          <p className="text-sm font-medium text-yellow-800 flex-1">
            <span className="font-bold">{pendingCount} payout{pendingCount !== 1 ? "s" : ""}</span>{" "}
            awaiting approval
          </p>
          <Link
            href="/dashboard/finance/payouts"
            className="flex items-center gap-1 text-xs font-semibold text-yellow hover:underline shrink-0"
          >
            Review <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Users"
          value={usersResult.isLoading ? "..." : String(totalUsers)}
          icon={Users}
          colorClass="text-blue"
          iconBgClass="bg-faintSky"
        />
        <StatCard
          title="Pending Payouts"
          value={payoutsResult.isLoading ? "..." : String(pendingCount)}
          icon={Clock}
          colorClass="text-yellow"
          iconBgClass="bg-yellow/10"
        />
        <StatCard
          title="Treasury Balance"
          value={dashboardResult.isLoading ? "..." : treasuryBalance}
          icon={DollarSign}
          colorClass="text-greeny"
          iconBgClass="bg-greeny/10"
        />
        <StatCard
          title="Platform Accounts"
          value={dashboardResult.isLoading ? "..." : String(summary.totalAccounts ?? accounts.length)}
          icon={TrendingUp}
          colorClass="text-purple"
          iconBgClass="bg-purple/10"
        />
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <div
                className={`relative rounded-xl border px-4 py-4 flex flex-col gap-2 cursor-pointer transition-all hover:shadow-md ${action.color}`}
              >
                {action.badge != null && (
                  <span className="absolute top-2 right-2 bg-yellow text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {action.badge}
                  </span>
                )}
                <action.icon className="w-5 h-5" />
                <div>
                  <p className="text-sm font-semibold leading-tight">{action.label}</p>
                  <p className="text-[11px] opacity-70 mt-0.5 leading-tight hidden sm:block">{action.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Charts row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account balance bar chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Account Balances</h3>
            <Link href="/dashboard/finance/treasury">
              <Button variant="ghost" size="sm" className="text-blue text-xs">
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          {dashboardResult.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={balanceBarData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => `₦${Number(v).toLocaleString("en-NG")}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="balance" fill="#074D97" name="Balance" radius={[4, 4, 0, 0]} />
                <Bar dataKey="book" fill="#93C1E6" name="Book Balance" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Balance distribution pie chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Balance by Purpose</h3>
          </div>
          {dashboardResult.isLoading ? (
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

      {/* ── Recent Audit Logs ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
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
              <TableRow className="hover:bg-transparent bg-gray-50/80">
                {["Admin", "Action", "Target User", "Path", "Time"].map((h) => (
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
                  <TableRow key={log.id} className="hover:bg-gray-50/50">
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs text-gray-600">
                        Admin #{log.adminId}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.method ?? "GET"} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {log.targetUserId ? `User #${log.targetUserId}` : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-400 max-w-[200px] truncate">
                      {log.path}
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
