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
  const pendingCount = Array.isArray(payoutsResult.data) ? payoutsResult.data.length : "—";
  const summary = dashboardResult.data?.summary ?? {};
  const treasuryBalance = summary.totalBalanceInNaira != null
    ? `₦${Number(summary.totalBalanceInNaira).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`
    : "—";

  const accounts: any[] = dashboardResult.data?.data ?? [];
  const recentLogs: any[] = logsResult.data?.data ?? [];

  // Charts data
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

  const quickActions = [
    { label: "Manage Users", href: "/dashboard/users", color: "bg-blue/10 text-blue border-blue/20" },
    { label: "Equity Listings", href: "/dashboard/equity", color: "bg-greeny/10 text-greeny border-greeny/20" },
    { label: "Treasury", href: "/dashboard/finance/treasury", color: "bg-yellow/10 text-yellow border-yellow/20" },
    { label: "Fee Config", href: "/dashboard/fees", color: "bg-purple/10 text-purple border-purple/20" },
  ];

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-8">
      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href}>
            <div className={`rounded-xl border px-4 py-3 flex items-center justify-between cursor-pointer hover:shadow-sm transition-all ${action.color}`}>
              <span className="text-sm font-semibold">{action.label}</span>
              <ArrowRight className="w-4 h-4 opacity-70" />
            </div>
          </Link>
        ))}
      </div>

      {/* Stat cards */}
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account balance bar chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4">Account Balances</h3>
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
          <h3 className="font-bold text-gray-900 mb-4">Balance by Purpose</h3>
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
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
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

      {/* Recent Audit Logs */}
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
                  <TableHead key={h} className="font-semibold text-gray-700 text-xs uppercase tracking-wide">{h}</TableHead>
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
                  <TableCell colSpan={5} className="text-center text-gray-400 h-20 text-sm">No recent activity</TableCell>
                </TableRow>
              ) : (
                recentLogs.map((log: any) => (
                  <TableRow key={log.id} className="hover:bg-gray-50/50">
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs text-gray-600">Admin #{log.adminId}</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.method ?? "GET"} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">{log.targetUserId ? `User #${log.targetUserId}` : "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-400 max-w-[200px] truncate">{log.path}</TableCell>
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
