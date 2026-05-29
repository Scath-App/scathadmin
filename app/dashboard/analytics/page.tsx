"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getAdminAnalyticsOverview,
  AdminAnalyticsWindow,
} from "@/lib/analyticsService";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  TrendingUp,
  Gift,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from "lucide-react";
import { format, parseISO } from "date-fns";

const CHART_COLORS = ["#074D97", "#53A753", "#FFC52F", "#5727F5", "#EA4335", "#0980FF"];

const WINDOW_OPTIONS: { label: string; value: AdminAnalyticsWindow }[] = [
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
];

function formatBucket(bucket: string) {
  try {
    return format(parseISO(bucket), "dd MMM");
  } catch {
    return bucket;
  }
}

function ChartSkeleton() {
  return <Skeleton className="h-[220px] w-full rounded-lg" />;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[220px] gap-2 text-gray-400">
      <BarChart3 className="w-8 h-8 text-gray-200" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

const TooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid #f0f0f0",
  borderRadius: "10px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  fontSize: "12px",
  color: "#111827",
  padding: "10px 14px",
};

export default function AnalyticsPage() {
  const [window, setWindow] = useState<AdminAnalyticsWindow>("30d");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-overview", window],
    queryFn: () => getAdminAnalyticsOverview(window),
  });

  const charts = data?.charts;
  const cards = data?.cards;

  // ── User growth ──────────────────────────────────────────────────────────────
  const userGrowthData = (charts?.userGrowth ?? []).map((d) => ({
    date: formatBucket(d.bucket),
    "New Users": d.newUsers,
    Deleted: d.deletedUsers,
  }));
  const totalNewUsers = (charts?.userGrowth ?? []).reduce((s, d) => s + d.newUsers, 0);
  const totalDeletedUsers = (charts?.userGrowth ?? []).reduce((s, d) => s + d.deletedUsers, 0);

  // ── Revenue ──────────────────────────────────────────────────────────────────
  const revenueMap: Record<string, { serviceType: string; Settled: number; Unsettled: number }> = {};
  for (const item of charts?.revenueByServiceType?.settled ?? []) {
    if (!revenueMap[item.serviceType]) revenueMap[item.serviceType] = { serviceType: item.serviceType, Settled: 0, Unsettled: 0 };
    revenueMap[item.serviceType].Settled += item.platformRevenue;
  }
  for (const item of charts?.revenueByServiceType?.unsettled ?? []) {
    if (!revenueMap[item.serviceType]) revenueMap[item.serviceType] = { serviceType: item.serviceType, Settled: 0, Unsettled: 0 };
    revenueMap[item.serviceType].Unsettled += item.platformRevenue;
  }
  const revenueData = Object.values(revenueMap);
  const totalSettled = (charts?.revenueByServiceType?.settled ?? []).reduce((s, d) => s + d.platformRevenue, 0);
  const totalUnsettled = (charts?.revenueByServiceType?.unsettled ?? []).reduce((s, d) => s + d.platformRevenue, 0);

  // ── Treasury ─────────────────────────────────────────────────────────────────
  const treasuryData = (charts?.treasuryByPurpose ?? []).map((d) => ({
    name: d.purpose.replace(/_/g, " "),
    value: d.balanceInNaira,
  }));

  // ── Reward activity ──────────────────────────────────────────────────────────
  const rewardData = (charts?.rewardActivity ?? []).map((d) => ({
    date: formatBucket(d.bucket),
    Credits: d.credits,
    Debits: d.debits,
  }));

  const nairaFmt = (v: number) => `₦${Number(v).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

  // ── KPI summary strip ────────────────────────────────────────────────────────
  const kpiCards = [
    {
      label: "New Users",
      value: isLoading ? null : totalNewUsers.toLocaleString(),
      sub: "sign-ups in period",
      icon: Users,
      color: "text-blue",
      bg: "bg-faintSky",
      trend: "up",
    },
    {
      label: "Deleted Users",
      value: isLoading ? null : totalDeletedUsers.toLocaleString(),
      sub: "accounts closed in period",
      icon: ArrowDownRight,
      color: "text-red-500",
      bg: "bg-red-50",
      trend: "down",
    },
    {
      label: "Settled Revenue",
      value: isLoading ? null : nairaFmt(totalSettled),
      sub: "within selected window",
      icon: TrendingUp,
      color: "text-greeny",
      bg: "bg-greeny/10",
      trend: "up",
    },
    {
      label: "Unsettled Revenue",
      value: isLoading ? null : nairaFmt(totalUnsettled),
      sub: "pending settlement",
      icon: TrendingUp,
      color: "text-yellow",
      bg: "bg-yellow/10",
      trend: "neutral",
    },
  ];

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-8">

      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Platform metrics and performance indicators
          </p>
        </div>

        {/* Window selector */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {WINDOW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setWindow(opt.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                window === opt.value
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3"
          >
            <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium leading-tight">{card.label}</p>
              {card.value == null ? (
                <Skeleton className="h-5 w-20 mt-1" />
              ) : (
                <p className="text-lg font-bold text-gray-900 mt-0.5 leading-tight font-mono truncate">
                  {card.value}
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-0.5 truncate">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. User Growth — full width */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-faintSky flex items-center justify-center">
                <Users className="w-4 h-4 text-blue" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">User Growth</h3>
                <p className="text-xs text-gray-400">New sign-ups vs account deletions</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded bg-blue inline-block" />
                New Users
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded bg-red-400 inline-block" />
                Deleted
              </span>
            </div>
          </div>
          {isLoading ? (
            <ChartSkeleton />
          ) : userGrowthData.length === 0 ? (
            <EmptyState label="No user data for this window" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={userGrowthData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={TooltipStyle} cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }} />
                <Area type="monotone" dataKey="New Users" stroke="#074D97" strokeWidth={2} fill="url(#newUsersGrad)" dot={false} activeDot={{ r: 4, fill: "#074D97", stroke: "#fff", strokeWidth: 2 }} />
                <Area type="monotone" dataKey="Deleted" stroke="#EA4335" strokeWidth={1.5} strokeDasharray="5 3" fill="url(#deletedGrad)" dot={false} activeDot={{ r: 4, fill: "#EA4335", stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 2. Revenue by Service Type */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-purple/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-purple" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Revenue by Service Type</h3>
              <p className="text-xs text-gray-400">Settled vs unsettled platform revenue (₦)</p>
            </div>
          </div>
          {isLoading ? (
            <ChartSkeleton />
          ) : revenueData.length === 0 ? (
            <EmptyState label="No revenue data for this window" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                <XAxis dataKey="serviceType" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TooltipStyle} formatter={(v: number) => nairaFmt(v)} cursor={{ fill: "#f9fafb" }} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                  formatter={(val) => <span style={{ color: "#6b7280" }}>{val}</span>}
                />
                <Bar dataKey="Settled" stackId="a" fill="#074D97" name="Settled" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Unsettled" stackId="a" fill="#FFC52F" name="Unsettled" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>



        {/* 3. Reward Activity */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center">
                <Gift className="w-4 h-4 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Reward Activity</h3>
                <p className="text-xs text-gray-400">Daily reward credits and debits platform-wide</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded bg-greeny inline-block" /> Credits
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded bg-red-400 inline-block" /> Debits
              </span>
            </div>
          </div>
          {isLoading ? (
            <ChartSkeleton />
          ) : rewardData.length === 0 ? (
            <EmptyState label="No reward activity for this window" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rewardData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={TooltipStyle} cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="Credits" fill="#53A753" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Debits" fill="#EA4335" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      {data?.generatedAt && (
        <p className="text-center text-gray-400 text-xs">
          Snapshot generated at {format(new Date(data.generatedAt), "dd MMM yyyy, HH:mm")} · cached
        </p>
      )}
    </div>
  );
}
