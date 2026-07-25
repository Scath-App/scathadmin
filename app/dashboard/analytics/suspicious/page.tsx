"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getSuspiciousAlerts,
  getSuspiciousRules,
  dismissAlert,
  restrictUserLimit,
  suspendUserFromAlert,
  updateSuspiciousRule,
  triggerSuspiciousScan,
  AlertStatus,
  SuspiciousActivityAlert,
  SuspiciousActivityRule,
} from "@/lib/analyticsService";
import { getTopUsersByTransactionCount, AdminAnalyticsWindow } from "@/lib/analyticsService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ShieldAlert, ShieldCheck, Eye, AlertTriangle, Ban, Sliders,
  ChevronLeft, ChevronRight, Play, CheckCircle2, MoreHorizontal,
  Zap, TrendingUp, Clock, Users, Search, RefreshCw, Activity,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";

// ── Threshold key labels ───────────────────────────────────────────────────────
const THRESHOLD_LABELS: Record<string, string> = {
  maxTxPerDay: "Max transactions/day",
  thresholdInKobo: "Single tx threshold (₦)",
  maxTxCount: "Max transfers",
  windowMinutes: "Time window (mins)",
  multiplier: "Spike multiplier",
  lookbackDays: "Lookback period (days)",
};

const RULE_ICONS: Record<string, React.ReactNode> = {
  HIGH_FREQUENCY: <Activity className="w-4 h-4 text-orange-500" />,
  LARGE_SINGLE_TX: <TrendingUp className="w-4 h-4 text-red-500" />,
  RAPID_SUCCESSION: <Zap className="w-4 h-4 text-amber-500" />,
  VELOCITY_SPIKE: <TrendingUp className="w-4 h-4 text-rose-500" />,
};

const RULE_COLORS: Record<string, string> = {
  HIGH_FREQUENCY: "text-orange-700 bg-orange-50 border-orange-100",
  LARGE_SINGLE_TX: "text-red-700 bg-red-50 border-red-100",
  RAPID_SUCCESSION: "text-amber-700 bg-amber-50 border-amber-100",
  VELOCITY_SPIKE: "text-rose-700 bg-rose-50 border-rose-100",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatEvidence(evidence: Record<string, unknown>): { primary: string; secondary?: string } {
  const e = evidence as Record<string, unknown>;
  switch (e.rule) {
    case "HIGH_FREQUENCY":
      return {
        primary: `${e.txCount} transactions in a single day`,
        secondary: `Threshold: ${e.threshold}/day · Date: ${e.period}`,
      };
    case "LARGE_SINGLE_TX":
      return {
        primary: `₦${Number(e.amountInNaira).toLocaleString("en-NG")} single transfer`,
        secondary: `Exceeds ₦${Number(e.thresholdInNaira).toLocaleString("en-NG")} threshold · ${e.period}`,
      };
    case "RAPID_SUCCESSION":
      return {
        primary: `${e.txCount} transfers within ${e.windowMinutes} minutes`,
        secondary: `Threshold: ${e.threshold} transfers per window`,
      };
    case "VELOCITY_SPIKE":
      return {
        primary: `₦${Number(e.todayVolumeInNaira).toLocaleString("en-NG")} today (${e.multiplierTripped}× normal)`,
        secondary: `Historical avg: ₦${Number(e.historicalAvgDailyInNaira).toLocaleString("en-NG")}/day · Threshold: ${e.configuredMultiplier}×`,
      };
    default:
      return { primary: "See evidence details" };
  }
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function UserAvatar({ name }: { name: string | null }) {
  const initials = getInitials(name);
  const colors = [
    "bg-violet-100 text-violet-700",
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
  ];
  const color = colors[(initials.charCodeAt(0) || 0) % colors.length];
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

function RelativeTime({ date }: { date: string }) {
  const d = new Date(date);
  return (
    <span title={format(d, "dd MMM yyyy HH:mm")} className="cursor-default">
      {formatDistanceToNow(d, { addSuffix: true })}
    </span>
  );
}

function StatusBadge({ status }: { status: AlertStatus }) {
  if (status === "OPEN") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      Open
    </span>
  );
  if (status === "DISMISSED") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" />
      Dismissed
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" />
      Actioned
    </span>
  );
}

// ── Metric Card ────────────────────────────────────────────────────────────────

function MetricCard({
  label, value, icon, color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${color}`}>
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="text-[11px] font-medium mt-0.5 opacity-75">{label}</p>
      </div>
    </div>
  );
}

// ── Action Modal ───────────────────────────────────────────────────────────────

type ActionType = "dismiss" | "restrict" | "suspend" | null;

function ActionModal({
  alert,
  action,
  onClose,
  onConfirm,
  isPending,
}: {
  alert: SuspiciousActivityAlert;
  action: ActionType;
  onClose: () => void;
  onConfirm: (note: string, limitNaira?: number) => void;
  isPending: boolean;
}) {
  const [note, setNote] = useState("");
  const [limitNaira, setLimitNaira] = useState<number>(50000);
  if (!action) return null;

  const evidence = formatEvidence(alert.evidence);

  const config: Record<string, { title: string; description: string; icon: React.ReactNode; btnClass: string }> = {
    dismiss: {
      title: "Dismiss Alert",
      description: "Mark this alert as not suspicious. The user's account remains fully active.",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    restrict: {
      title: "Restrict Daily Transfer Limit",
      description: "User can still transact but outgoing transfers above the new limit will be blocked. They'll see a clear reason when blocked.",
      icon: <Sliders className="w-5 h-5 text-amber-500" />,
      btnClass: "bg-amber-500 hover:bg-amber-600 text-white",
    },
    suspend: {
      title: "Suspend Account",
      description: "User will be fully locked out and see: \u201cYour account has been suspended. Contact support.\u201d \u2014 same as the existing suspension flow.",
      icon: <Ban className="w-5 h-5 text-red-500" />,
      btnClass: "bg-red-600 hover:bg-red-700 text-white",
    },
  };

  const c = config[action];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {c.icon} {c.title}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-gray-500 leading-relaxed mt-1">
            {c.description}
          </DialogDescription>
        </DialogHeader>

        {/* Alert context */}
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <UserAvatar name={alert.userName} />
            <div>
              <p className="text-sm font-semibold text-gray-900">{alert.userName || "Unknown User"}</p>
              <p className="text-xs text-gray-400">{alert.userEmail}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
            <span className="font-semibold">Why flagged: </span>{evidence.primary}
          </p>
        </div>

        <div className="space-y-3">
          {action === "restrict" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">New Daily Limit (₦)</label>
              <Input
                type="number"
                value={limitNaira}
                onChange={(e) => setLimitNaira(Number(e.target.value))}
                min={1000}
                className="h-9 text-sm"
                placeholder="e.g. 50000"
              />
              <p className="text-[11px] text-gray-400">
                This overrides their KYC tier limit. Enter the maximum daily transfer amount in naira.
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Admin Note <span className="font-normal text-gray-400">(optional — saved to audit trail)</span>
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Verified with compliance team — pattern matches known mule behaviour"
              className="h-9 text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending} className="text-sm">
            Cancel
          </Button>
          <Button disabled={isPending} className={`text-sm ${c.btnClass}`} onClick={() => onConfirm(note, limitNaira)}>
            {isPending ? "Processing..." : c.title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

type Tab = "alerts" | "activity" | "rules";

export default function SuspiciousActivityPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("alerts");
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "ALL">("OPEN");
  const [ruleFilter, setRuleFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [alertsPage, setAlertsPage] = useState(1);
  const [actionAlert, setActionAlert] = useState<SuspiciousActivityAlert | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);

  const [txWindow, setTxWindow] = useState<AdminAnalyticsWindow>("30d");
  const [txPage, setTxPage] = useState(1);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: openAlertsCount } = useQuery({
    queryKey: ["suspicious-alerts-count"],
    queryFn: () => getSuspiciousAlerts({ status: "OPEN", limit: 1 }),
    refetchInterval: 30_000,
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ["suspicious-alerts", statusFilter, ruleFilter, alertsPage],
    queryFn: () =>
      getSuspiciousAlerts({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        ruleCode: ruleFilter === "ALL" ? undefined : ruleFilter,
        page: alertsPage,
        limit: 20,
      }),
  });

  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ["suspicious-rules"],
    queryFn: getSuspiciousRules,
  });

  const { data: topUsersData, isLoading: topUsersLoading } = useQuery({
    queryKey: ["top-users-transactions", txWindow, txPage],
    queryFn: () => getTopUsersByTransactionCount({ window: txWindow, page: txPage, limit: 20 }),
    enabled: tab === "activity",
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const invalidateAlerts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["suspicious-alerts"] });
    queryClient.invalidateQueries({ queryKey: ["suspicious-alerts-count"] });
  }, [queryClient]);

  const closeModal = useCallback(() => {
    setActionAlert(null);
    setActionType(null);
  }, []);

  const dismissMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => dismissAlert(id, note),
    onSuccess: () => {
      invalidateAlerts();
      closeModal();
      toast.success("Alert dismissed", { description: "Marked as not suspicious. No action taken on the account." });
    },
    onError: () => toast.error("Failed to dismiss alert. Please try again."),
  });

  const restrictMutation = useMutation({
    mutationFn: ({ id, limit, note }: { id: number; limit: number; note: string }) =>
      restrictUserLimit(id, limit, note),
    onSuccess: (_, vars) => {
      invalidateAlerts();
      closeModal();
      toast.success("Transfer limit restricted", {
        description: `Daily limit set to ₦${(vars.limit).toLocaleString("en-NG")}. Takes effect immediately.`,
      });
    },
    onError: () => toast.error("Failed to restrict limit. Please try again."),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => suspendUserFromAlert(id, note),
    onSuccess: () => {
      invalidateAlerts();
      closeModal();
      toast.success("Account suspended", { description: "User will see the standard suspension message and must contact support." });
    },
    onError: () => toast.error("Failed to suspend account. Please try again."),
  });

  const scanMutation = useMutation({
    mutationFn: triggerSuspiciousScan,
    onSuccess: () => {
      toast.success("Scan started", { description: "Scanning all active users against detection rules. New alerts will appear shortly." });
      setTimeout(invalidateAlerts, 3000);
    },
    onError: () => toast.error("Failed to trigger scan. Please try again."),
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ id, isEnabled }: { id: number; isEnabled: boolean }) =>
      updateSuspiciousRule(id, { isEnabled }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["suspicious-rules"] });
      toast.success(vars.isEnabled ? "Rule enabled" : "Rule disabled", {
        description: vars.isEnabled ? "Will apply on the next transfer event." : "Suspended from detection runs.",
      });
    },
    onError: () => toast.error("Failed to update rule."),
  });

  const updateThresholdMutation = useMutation({
    mutationFn: ({ id, thresholdConfig }: { id: number; thresholdConfig: Record<string, number> }) =>
      updateSuspiciousRule(id, { thresholdConfig }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suspicious-rules"] });
      toast.success("Thresholds updated", { description: "New thresholds apply on the next transfer event." });
    },
    onError: () => toast.error("Failed to update thresholds."),
  });

  // ── Action handler ───────────────────────────────────────────────────────────
  function handleConfirmAction(note: string, limitNaira?: number) {
    if (!actionAlert) return;
    if (actionType === "dismiss") dismissMutation.mutate({ id: actionAlert.id, note });
    if (actionType === "restrict") restrictMutation.mutate({ id: actionAlert.id, limit: limitNaira ?? 50000, note });
    if (actionType === "suspend") suspendMutation.mutate({ id: actionAlert.id, note });
  }

  const isActionPending = dismissMutation.isPending || restrictMutation.isPending || suspendMutation.isPending;

  // ── Client-side search filter ─────────────────────────────────────────────
  const filteredAlerts = alertsData?.data?.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.userName?.toLowerCase().includes(q) ||
      a.userEmail?.toLowerCase().includes(q) ||
      a.userPhone?.toLowerCase().includes(q)
    );
  }) ?? [];

  const openCount = openAlertsCount?.meta?.total ?? 0;
  const activeRulesCount = rules?.filter((r) => r.isEnabled).length ?? 0;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "alerts", label: "Alerts", icon: <ShieldAlert className="w-3.5 h-3.5" /> },
    { id: "activity", label: "High Activity", icon: <Activity className="w-3.5 h-3.5" /> },
    { id: "rules", label: "Detection Rules", icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fa] p-6 md:p-8">

      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <Link
        href="/dashboard/analytics"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-5 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Analytics
      </Link>

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
            <ShieldAlert className="w-4.5 h-4.5 text-red-600" />
          </div>
          Suspicious Activity
        </h1>
        <p className="text-sm text-gray-500 mt-1 ml-0.5">
          Automated AML detection · Alerts fire live on every transfer event
        </p>
      </div>

      {/* ── Metric Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard
          label="Open Alerts"
          value={openCount}
          icon={<ShieldAlert className="w-4 h-4 text-red-500" />}
          color="bg-red-50 border-red-100 text-red-700"
        />
        <MetricCard
          label="Active Rules"
          value={activeRulesCount}
          icon={<ShieldCheck className="w-4 h-4 text-emerald-500" />}
          color="bg-emerald-50 border-emerald-100 text-emerald-700"
        />
        <MetricCard
          label="Total Alerts"
          value={alertsData?.meta?.total ?? "—"}
          icon={<Activity className="w-4 h-4 text-blue-500" />}
          color="bg-blue-50 border-blue-100 text-blue-700"
        />
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Manual Scan</p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 w-full border-gray-200 hover:border-gray-300 transition-all"
              disabled={scanMutation.isPending}
              onClick={() => scanMutation.mutate()}
            >
              {scanMutation.isPending
                ? <><RefreshCw className="w-3 h-3 animate-spin" /> Scanning...</>
                : <><Play className="w-3 h-3" /> Run Scan</>
              }
            </Button>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
              tab === t.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.icon}
            {t.label}
            {t.id === "alerts" && openCount > 0 && (
              <span className="ml-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-px min-w-[18px] text-center tabular-nums">
                {openCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Tab: Alerts                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "alerts" && (
        <div className="space-y-4">

          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[280px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="pl-8 h-9 text-xs bg-white border-gray-200 shadow-none"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as AlertStatus | "ALL"); setAlertsPage(1); }}>
              <SelectTrigger className="w-[140px] h-9 text-xs bg-white border-gray-200 shadow-none">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">🔴 Open</SelectItem>
                <SelectItem value="DISMISSED">⚪ Dismissed</SelectItem>
                <SelectItem value="ACTIONED">🟢 Actioned</SelectItem>
                <SelectItem value="ALL">All statuses</SelectItem>
              </SelectContent>
            </Select>

            <Select value={ruleFilter} onValueChange={(v) => { setRuleFilter(v); setAlertsPage(1); }}>
              <SelectTrigger className="w-[190px] h-9 text-xs bg-white border-gray-200 shadow-none">
                <SelectValue placeholder="All rules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All rules</SelectItem>
                {rules?.map((r) => (
                  <SelectItem key={r.ruleCode} value={r.ruleCode}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(search || statusFilter !== "OPEN" || ruleFilter !== "ALL") && (
              <button
                className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
                onClick={() => { setSearch(""); setStatusFilter("OPEN"); setRuleFilter("ALL"); setAlertsPage(1); }}
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3 w-[220px]">User</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3">Rule · Status</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3">Evidence</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3 w-[120px]">Detected</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3 text-right w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertsLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {[200, 160, 300, 100, 50].map((w, j) => (
                        <TableCell key={j} className="px-5 py-3.5">
                          <Skeleton className={`h-4 rounded`} style={{ width: w }} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !filteredAlerts.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-gray-400">
                      <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-emerald-300" />
                      <p className="font-semibold text-sm text-gray-600">
                        {search ? "No alerts match your search" : `No ${statusFilter !== "ALL" ? statusFilter.toLowerCase() : ""} alerts`}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {search ? "Try a different name or email" : "The detection engine is running. Alerts will appear here automatically."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAlerts.map((alert) => {
                    const evidence = formatEvidence(alert.evidence);
                    const ruleColor = RULE_COLORS[alert.ruleCode] || "text-gray-700 bg-gray-50 border-gray-200";
                    const ruleIcon = RULE_ICONS[alert.ruleCode] || <AlertTriangle className="w-3.5 h-3.5" />;

                    return (
                      <TableRow
                        key={alert.id}
                        className="hover:bg-gray-50/50 transition-colors border-gray-50"
                      >
                        {/* User */}
                        <TableCell className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar name={alert.userName} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{alert.userName || "Unknown"}</p>
                              <p className="text-xs text-gray-400 truncate">{alert.userEmail}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Rule + Status */}
                        <TableCell className="px-5 py-3.5">
                          <div className="flex flex-col gap-1.5">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg border w-fit ${ruleColor}`}>
                              {ruleIcon}
                              {alert.ruleLabel}
                            </span>
                            <StatusBadge status={alert.status} />
                          </div>
                        </TableCell>

                        {/* Evidence */}
                        <TableCell className="px-5 py-3.5">
                          <p className="text-sm font-medium text-gray-800 leading-snug">{evidence.primary}</p>
                          {evidence.secondary && (
                            <p className="text-xs text-gray-400 mt-0.5">{evidence.secondary}</p>
                          )}
                          {alert.adminNote && (
                            <p className="text-[11px] text-blue-500 mt-1 italic">
                              📝 {alert.adminNote}
                            </p>
                          )}
                        </TableCell>

                        {/* Detected */}
                        <TableCell className="px-5 py-3.5">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <RelativeTime date={alert.detectedAt} />
                          </div>
                        </TableCell>

                        {/* Actions — overflow menu */}
                        <TableCell className="px-5 py-3.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-sm">
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => router.push(`/dashboard/users/${alert.userId}`)}
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-500" />
                                View User
                              </DropdownMenuItem>
                              {alert.status === "OPEN" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="gap-2 cursor-pointer text-emerald-700 focus:text-emerald-700"
                                    onClick={() => { setActionAlert(alert); setActionType("dismiss"); }}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Dismiss
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2 cursor-pointer text-amber-700 focus:text-amber-700"
                                    onClick={() => { setActionAlert(alert); setActionType("restrict"); }}
                                  >
                                    <Sliders className="w-3.5 h-3.5" />
                                    Restrict Limit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2 cursor-pointer text-red-700 focus:text-red-700"
                                    onClick={() => { setActionAlert(alert); setActionType("suspend"); }}
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                    Suspend Account
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {(alertsData?.meta?.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span>
                Page {alertsData?.meta?.page} of {alertsData?.meta?.totalPages}{" "}
                <span className="text-gray-400">({alertsData?.meta?.total} alerts)</span>
              </span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 px-2" disabled={alertsPage <= 1} onClick={() => setAlertsPage((p) => p - 1)}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2" disabled={alertsPage >= (alertsData?.meta?.totalPages ?? 1)} onClick={() => setAlertsPage((p) => p + 1)}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Tab: High Activity Users                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "activity" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Period:</span>
            {(["1d", "7d", "30d", "90d"] as AdminAnalyticsWindow[]).map((w) => (
              <button
                key={w}
                onClick={() => { setTxWindow(w); setTxPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  txWindow === w
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3">User</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3 text-center">Tx Count</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3">Total Volume</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3">Avg Tx Size</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3">Risk Signal</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3 text-right w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUsersLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {[200, 80, 120, 100, 100, 50].map((w, j) => (
                        <TableCell key={j} className="px-5 py-3.5">
                          <Skeleton className="h-4 rounded" style={{ width: w }} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !topUsersData?.data?.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-gray-400">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm font-medium text-gray-500">No activity data for this period</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  topUsersData.data.map((row, idx) => {
                    const name = [row.firstName, row.lastName].filter(Boolean).join(" ") || null;
                    return (
                      <TableRow key={row.userId} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
                              {idx + 1}
                            </div>
                            <UserAvatar name={name} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{name || "Unknown"}</p>
                              <p className="text-xs text-gray-400 truncate">{row.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-center">
                          <span className="font-mono font-bold text-sm text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 tabular-nums">
                            {row.transactionCount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <span className="text-sm font-semibold text-gray-800 tabular-nums">
                            ₦{row.totalVolumeInNaira.toLocaleString("en-NG", { maximumFractionDigits: 0 })}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-sm text-gray-600 tabular-nums">
                          ₦{row.avgTxSizeInNaira.toLocaleString("en-NG", { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          {row.isSuspiciousFlag ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" /> High Activity
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                              Normal
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            onClick={() => router.push(`/dashboard/users/${row.userId}`)}
                            title="View user & transactions"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {(topUsersData?.meta?.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span>Page {topUsersData?.meta?.page} of {topUsersData?.meta?.totalPages}</span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 px-2" disabled={txPage <= 1} onClick={() => setTxPage((p) => p - 1)}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2" disabled={txPage >= (topUsersData?.meta?.totalPages ?? 1)} onClick={() => setTxPage((p) => p + 1)}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Tab: Detection Rules                                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "rules" && (
        <div className="space-y-3 max-w-2xl">
          <p className="text-xs text-gray-500">
            Rules fire live on every transfer event. Toggle on/off or edit thresholds — changes take effect on the next transfer.
          </p>

          {rulesLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-2xl" />)
          ) : !rules?.length ? (
            <div className="text-center py-12 text-gray-400 text-sm">No rules configured.</div>
          ) : (
            rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={toggleRuleMutation.mutate}
                onUpdateThreshold={updateThresholdMutation.mutate}
              />
            ))
          )}
        </div>
      )}

      {/* Action Modal */}
      {actionAlert && actionType && (
        <ActionModal
          alert={actionAlert}
          action={actionType}
          onClose={closeModal}
          onConfirm={handleConfirmAction}
          isPending={isActionPending}
        />
      )}
    </div>
  );
}

// ── Rule Card ──────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  onToggle,
  onUpdateThreshold,
}: {
  rule: SuspiciousActivityRule;
  onToggle: (args: { id: number; isEnabled: boolean }) => void;
  onUpdateThreshold: (args: { id: number; thresholdConfig: Record<string, number> }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localConfig, setLocalConfig] = useState<Record<string, number>>({});

  function startEditing() {
    const initialConfig: Record<string, number> = {};
    for (const [key, val] of Object.entries(rule.thresholdConfig)) {
      initialConfig[key] = key.toLowerCase().includes("kobo") ? val / 100 : val;
    }
    setLocalConfig(initialConfig);
    setEditing(true);
  }

  function handleSave() {
    const finalConfig: Record<string, number> = {};
    for (const [key, val] of Object.entries(localConfig)) {
      finalConfig[key] = key.toLowerCase().includes("kobo") ? Math.round(Number(val) * 100) : Number(val);
    }
    onUpdateThreshold({ id: rule.id, thresholdConfig: finalConfig });
    setEditing(false);
  }

  const icon = RULE_ICONS[rule.ruleCode] || <AlertTriangle className="w-4 h-4 text-gray-400" />;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm transition-all duration-200 overflow-hidden ${
      rule.isEnabled ? "border-gray-100" : "border-gray-100 opacity-55"
    }`}>
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex items-start gap-3 flex-1">
          {/* Icon */}
          <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            {icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-sm text-gray-900">{rule.label}</span>
              <code className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">{rule.ruleCode}</code>
              {!rule.isEnabled && (
                <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-full">Disabled</span>
              )}
            </div>

            {rule.description && (
              <p className="text-xs text-gray-500 mb-2.5 leading-relaxed">{rule.description}</p>
            )}

            {/* Thresholds */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(rule.thresholdConfig).map(([key, val]) =>
                editing ? (
                  <div key={key} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1 border border-gray-200">
                    <label className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                      {THRESHOLD_LABELS[key] || key}:
                    </label>
                    <input
                      type="number"
                      value={localConfig[key] ?? (key.toLowerCase().includes("kobo") ? val / 100 : val)}
                      onChange={(e) => setLocalConfig((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                      className="w-24 h-6 text-xs border border-gray-200 rounded px-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                ) : (
                  <span key={key} className="text-[11px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold px-2 py-1 rounded-lg">
                    {THRESHOLD_LABELS[key] || key}: {key.toLowerCase().includes("kobo") ? `₦${(val / 100).toLocaleString("en-NG")}` : val.toLocaleString()}
                  </span>
                )
              )}
            </div>

            {editing && (
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="h-7 text-xs bg-gray-900 text-white hover:bg-gray-800" onClick={handleSave}>
                  Save changes
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {!editing && (
            <button
              className="text-[11px] text-gray-400 hover:text-indigo-600 underline underline-offset-2 transition-colors whitespace-nowrap"
              onClick={startEditing}
            >
              Edit
            </button>
          )}
          <Switch
            checked={rule.isEnabled}
            onCheckedChange={(v) => onToggle({ id: rule.id, isEnabled: v })}
          />
        </div>
      </div>
    </div>
  );
}
