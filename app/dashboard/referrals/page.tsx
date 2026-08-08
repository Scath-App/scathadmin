"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getReferralAnalytics,
  getReferralSettings,
  updateReferralSettings,
  ReferralLeaderboardUser,
} from "@/lib/mixedService";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  CheckCircle2,
  Clock,
  Coins,
  InfoIcon,
  Search,
  Copy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";

type Tab = "analytics" | "settings";

function AnalyticsTab() {
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const limit = 15;

  const { data, isLoading } = useQuery({
    queryKey: ["referralAnalytics", page, limit],
    queryFn: () => getReferralAnalytics({ page, limit }),
  });

  const summary = data?.summary ?? {
    totalReferrals: 0,
    verifiedReferrals: 0,
    pendingReferrals: 0,
    totalBonusPaid: 0,
  };

  const rawLeaderboard = data?.leaderboard ?? [];
  const leaderboard = searchTerm
    ? rawLeaderboard.filter(
        (u) =>
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `${u.firstName ?? ""} ${u.lastName ?? ""}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          u.referralCode.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : rawLeaderboard;

  const meta = data?.meta;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied code: ${code}`);
  };

  return (
    <div className="space-y-6">
      {/* ── Summary Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium uppercase tracking-wider">
              Total Referrals
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue/10 flex items-center justify-center text-blue">
              <Users className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">
              {summary.totalReferrals.toLocaleString()}
            </p>
          )}
          <p className="text-xs text-gray-400">Total referred accounts</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium uppercase tracking-wider">
              KYC Verified
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-emerald-600">
              {summary.verifiedReferrals.toLocaleString()}
            </p>
          )}
          <p className="text-xs text-gray-400">Active & verified accounts</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium uppercase tracking-wider">
              Pending KYC
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-amber-600">
              {summary.pendingReferrals.toLocaleString()}
            </p>
          )}
          <p className="text-xs text-gray-400">Awaiting verification</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium uppercase tracking-wider">
              Total Bonus Paid
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-purple-600">
              {summary.totalBonusPaid.toLocaleString()}
              <span className="text-xs font-normal text-gray-400 ml-1">
                coins
              </span>
            </p>
          )}
          <p className="text-xs text-gray-400">Distributed in referral rewards</p>
        </div>
      </div>

      {/* ── Referral Directory / Leaderboard ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">User Referral Performance</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Users who have invited friends using their referral code.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search user, email, code..."
              className="pl-9 h-9 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : leaderboard.length === 0 ? (
          <EmptyState
            title="No referrals found"
            message="No users have successfully referred friends yet."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="w-[240px]">User</TableHead>
                <TableHead className="w-[140px]">Referral Code</TableHead>
                <TableHead className="text-center">Total Referrals</TableHead>
                <TableHead>Breakdown Status</TableHead>
                <TableHead className="text-right">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((user: ReferralLeaderboardUser) => {
                const name = [user.firstName, user.lastName]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <TableRow key={user.id} className="hover:bg-gray-50/50">
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {name || `User #${user.id}`}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => copyCode(user.referralCode)}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 text-gray-700 font-mono text-xs font-semibold hover:bg-gray-200 transition-colors"
                        title="Click to copy code"
                      >
                        {user.referralCode}
                        <Copy className="w-3 h-3 text-gray-400" />
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue/10 text-blue">
                        {user.totalReferred}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {user.verifiedReferred} Verified
                        </span>
                        {user.pendingReferred > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            {user.pendingReferred} Pending KYC
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs text-gray-500">
                      {user.createdAt
                        ? format(new Date(user.createdAt), "dd MMM yyyy")
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* ── Pagination ── */}
        {meta && meta.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Page <span className="font-semibold">{page + 1}</span> of{" "}
              <span className="font-semibold">{meta.totalPages}</span> ({meta.total}{" "}
              total)
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!meta.hasMore}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsTab() {
  const queryClient = useQueryClient();
  const { isAdmin } = useRole();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data, isLoading } = useQuery({
    queryKey: ["referralSettings"],
    queryFn: getReferralSettings,
    enabled: isAdmin,
    onSuccess: (d: any) => {
      if (!editing) setForm(d);
    },
  } as any);

  const settings: Record<string, any> = data ?? {};

  const updateMutation = useMutation({
    mutationFn: (payload: object) => updateReferralSettings(payload),
    onSuccess: (res: any) => {
      queryClient.setQueryData(["referralSettings"], res);
      toast.success("Referral settings updated.");
      setEditing(false);
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message ?? "Update failed."),
  });

  const handleSave = () => {
    const {
      id,
      createdAt,
      updatedAt,
      deletedAt,
      referredUserBonusAmount: _skip,
      ...payload
    } = form;
    updateMutation.mutate(payload);
  };

  const startEdit = () => {
    setForm({ ...settings });
    setEditing(true);
  };

  const field = (
    key: string,
    label: string,
    type: "number" | "toggle",
    readOnly = false,
    tooltip?: string,
  ) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {tooltip && (
          <div className="flex items-center gap-1 mt-0.5">
            <InfoIcon className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-400">{tooltip}</p>
          </div>
        )}
      </div>
      <div className="w-40">
        {isLoading ? (
          <Skeleton className="h-8 w-full" />
        ) : readOnly ? (
          <p className="text-sm font-mono text-gray-400 text-right">
            {settings[key] ?? 0}
          </p>
        ) : type === "toggle" ? (
          editing ? (
            <div className="flex justify-end">
              <Switch
                checked={!!form[key]}
                onCheckedChange={(v) =>
                  setForm((prev: any) => ({ ...prev, [key]: v }))
                }
              />
            </div>
          ) : (
            <p className="text-sm text-right">{settings[key] ? "Yes" : "No"}</p>
          )
        ) : editing ? (
          <Input
            type="number"
            value={form[key] ?? 0}
            onChange={(e) =>
              setForm((prev: any) => ({
                ...prev,
                [key]: Number(e.target.value),
              }))
            }
            className="text-right"
          />
        ) : (
          <p className="text-sm font-mono text-right">{settings[key] ?? 0}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm max-w-2xl">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Referral Configuration</h3>
        {editing ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-gray-200"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-blue text-white"
              disabled={updateMutation.isPending}
              onClick={handleSave}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        ) : isAdmin ? (
          <Button size="sm" className="bg-blue text-white" onClick={startEdit}>
            Edit Settings
          </Button>
        ) : null}
      </div>
      <div className="px-6">
        {field("referrerBonusAmount", "Referrer Bonus Amount (coins)", "number")}
        {field("kycRequired", "KYC Required for Reward", "toggle")}
        {field("isActive", "Referral Program Active", "toggle")}
        {field("maxReferralsPerUser", "Max Referrals Per User", "number")}
      </div>
    </div>
  );
}

export default function ReferralPage() {
  const [tab, setTab] = useState<Tab>("analytics");

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Referrals Hub"
        subtitle="Track referral conversion analytics, top referrers, and configure program settings."
      />

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(["analytics", "settings"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "analytics" ? "Referral Analytics" : "Settings"}
          </button>
        ))}
      </div>

      {tab === "analytics" ? <AnalyticsTab /> : <SettingsTab />}
    </div>
  );
}
