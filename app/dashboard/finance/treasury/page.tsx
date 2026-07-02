"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAccountDashboard,
  syncAllAccounts,
  syncSingleAccount,
  poolTransfer,
} from "@/lib/financeService";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { MoneyCell } from "@/components/ui/MoneyCell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Wallet,
  LayoutGrid,
  ArrowLeftRight,
  RefreshCw,
  RefreshCcw,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";

const CHART_COLORS = ["#074D97", "#53A753", "#FFC52F", "#5727F5", "#EA4335", "#0980FF"];

const PURPOSE_COLORS: Record<string, string> = {
  float: "bg-blue/10 text-blue border-blue/20",
  investments: "bg-purple/10 text-purple border-purple/20",
  savebox: "bg-greeny/10 text-greeny border-greeny/20",
  payout: "bg-yellow/10 text-yellow border-yellow/20",
  revenue: "bg-orange-100 text-orange-600 border-orange-200",
};

function fmt(naira: number | null | undefined) {
  if (naira == null) return "—";
  return `₦${Number(naira).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function TreasuryPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useRole();
  const [page, setPage] = useState(0);
  const [isPoolOpen, setIsPoolOpen] = useState(false);
  const [poolForm, setPoolForm] = useState({
    fromAccountNumber: "",
    toAccountNumber: "",
    amountInNaira: "",
    reason: "",
  });

  const LIMIT = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["treasury-dashboard", page],
    queryFn: () => getAccountDashboard(page, LIMIT),
  });

  const summary = data?.summary ?? {};
  const accounts: any[] = data?.data ?? [];
  const meta = data?.meta ?? {};
  const totalPages = meta.totalPages ?? (Math.ceil((meta.total ?? accounts.length) / LIMIT) || 1);

  // Charts
  const purposeData = summary.purposeSummary ?? [];
  const barData = summary.top10Accounts ?? [];

  const syncAllMutation = useMutation({
    mutationFn: syncAllAccounts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treasury-dashboard"] });
      toast.success("All accounts synced.");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Sync all failed."),
  });

  const syncOneMutation = useMutation({
    mutationFn: (id: number) => syncSingleAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treasury-dashboard"] });
      toast.success("Account synced.");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Sync failed."),
  });

  const poolMutation = useMutation({
    mutationFn: () => {
      const amountInNaira = Number(poolForm.amountInNaira);
      return poolTransfer({
        fromAccountNumber: poolForm.fromAccountNumber,
        toAccountNumber: poolForm.toAccountNumber,
        amountInKobo: Math.round(amountInNaira * 100),
        reason: poolForm.reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treasury-dashboard"] });
      toast.success("Pool transfer initiated.");
      setIsPoolOpen(false);
      setPoolForm({ fromAccountNumber: "", toAccountNumber: "", amountInNaira: "", reason: "" });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Pool transfer failed."),
  });

  const accountOptionLabel = (acct: any) =>
    `${acct.accountName ?? acct.purpose ?? acct.accountNumber} — ${acct.accountNumber}`;

  const columns: Column[] = [
    {
      key: "accountNumber",
      header: "Account #",
      render: (v) => <span className="font-mono text-xs text-gray-600">{v ?? "—"}</span>,
    },
    {
      key: "accountName",
      header: "Name",
      className: "font-medium text-sm max-w-[160px] truncate",
    },
    {
      key: "purpose",
      header: "Purpose",
      render: (v) =>
        v ? (
          <Badge
            variant="outline"
            className={`text-xs capitalize ${PURPOSE_COLORS[v] ?? "text-gray-500 border-gray-200"}`}
          >
            {v}
          </Badge>
        ) : (
          "—"
        ),
    },
    {
      key: "balanceInNaira",
      header: "Balance",
      headerClassName: "text-right",
      render: (v) => (
        <div className="text-right">
          <MoneyCell naira={v} />
        </div>
      ),
    },
    {
      key: "bookBalanceInNaira",
      header: "Book Balance",
      headerClassName: "text-right",
      render: (v) => (
        <div className="text-right text-sm text-gray-500">
          {fmt(v)}
        </div>
      ),
    },
    {
      key: "isMainAccount",
      header: "Kind",
      render: (_, row) => (
        <Badge variant="outline" className="text-xs border-blue/20 text-blue bg-faintSky">
          {row.isMainAccount ? "Main" : row.isSubAccount ? "Sub" : "User"}
        </Badge>
      ),
    },
    {
      key: "id",
      header: "",
      headerClassName: "text-right",
      render: (id) => (
        <div className="flex justify-end">
          {isAdmin ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-gray-400 hover:text-blue"
              disabled={syncOneMutation.isPending}
              onClick={() => syncOneMutation.mutate(id)}
              title="Sync account"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-8">
      {/* Header */}
      <PageHeader
        title="Treasury"
        subtitle="Platform fund accounts, balances, and internal transfers."
        actions={
          isAdmin && (
            <>
              <Button
                variant="outline"
                className="gap-2 border-gray-200"
                disabled={syncAllMutation.isPending}
                onClick={() => syncAllMutation.mutate()}
              >
                <RefreshCw className={`h-4 w-4 ${syncAllMutation.isPending ? "animate-spin" : ""}`} />
                Sync All
              </Button>
              <Button
                className="bg-blue hover:bg-darkBlue text-white gap-2"
                onClick={() => setIsPoolOpen(true)}
              >
                <ArrowLeftRight className="h-4 w-4" />
                Pool Transfer
              </Button>
            </>
          )
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Total Treasury Balance"
          value={isLoading ? "..." : fmt(summary.totalBalanceInNaira)}
          icon={Wallet}
          colorClass="text-greeny"
          iconBgClass="bg-greeny/10"
        />
        <StatCard
          title="Total Book Balance"
          value={isLoading ? "..." : fmt(summary.totalBookBalanceInNaira ?? summary.totalBalanceInNaira)}
          icon={ArrowLeftRight}
          colorClass="text-blue"
          iconBgClass="bg-faintSky"
        />
        <StatCard
          title="Platform Accounts"
          value={isLoading ? "..." : String(summary.totalAccounts ?? accounts.length)}
          icon={LayoutGrid}
          colorClass="text-purple"
          iconBgClass="bg-purple/10"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance by Purpose */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4">Balance by Purpose</h3>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : purposeData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data</div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={purposeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    strokeWidth={2}
                  >
                    {purposeData.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(v)} />
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
                    <span className="ml-auto font-mono text-gray-900">{fmt(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Account Balances Bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4">Account Balances (Top 10)</h3>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis
                  tick={{ fontSize: 9 }}
                  tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="balance" fill="#074D97" name="Balance" radius={[4, 4, 0, 0]} />
                <Bar dataKey="book" fill="#93C1E6" name="Book" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">All Platform Accounts</h3>
          <p className="text-xs text-gray-400 mt-0.5">Live balances from the treasury dashboard</p>
        </div>
        <DataTable
          columns={columns}
          data={accounts}
          loading={isLoading}
          rowKey={(r) => r.id}
          pagination={{
            mode: "0-based",
            page,
            totalPages,
            total: meta.total,
            onPageChange: setPage,
          }}
        />
      </div>

      {/* Pool Transfer Modal */}
      <Dialog open={isPoolOpen} onOpenChange={setIsPoolOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pool Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>From Account</Label>
              <Select
                value={poolForm.fromAccountNumber}
                onValueChange={(value) => setPoolForm((p) => ({ ...p, fromAccountNumber: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sender account" />
                </SelectTrigger>
                <SelectContent className="w-full">
                  <SelectGroup>
                    {accounts.length === 0 ? (
                      <SelectItem value="" disabled>
                        No accounts available
                      </SelectItem>
                    ) : (
                      accounts.map((acct: any) => (
                        <SelectItem key={acct.accountNumber} value={acct.accountNumber}>
                          {accountOptionLabel(acct)}
                        </SelectItem>
                      ))
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>To Account</Label>
              <Select
                value={poolForm.toAccountNumber}
                onValueChange={(value) => setPoolForm((p) => ({ ...p, toAccountNumber: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select receiver account" />
                </SelectTrigger>
                <SelectContent className="w-full">
                  <SelectGroup>
                    {accounts.length === 0 ? (
                      <SelectItem value="" disabled>
                        No accounts available
                      </SelectItem>
                    ) : (
                      accounts.map((acct: any) => (
                        <SelectItem key={acct.accountNumber} value={acct.accountNumber}>
                          {accountOptionLabel(acct)}
                        </SelectItem>
                      ))
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (in Naira)</Label>
              <Input
                type="number"
                placeholder="e.g. 1000 = ₦1,000"
                value={poolForm.amountInNaira}
                onChange={(e) => setPoolForm((p) => ({ ...p, amountInNaira: e.target.value }))}
              />
              {poolForm.amountInNaira && (
                <p className="text-xs text-gray-400">
                  ≈ {fmt(Number(poolForm.amountInNaira))}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input
                placeholder="Brief description"
                value={poolForm.reason}
                onChange={(e) => setPoolForm((p) => ({ ...p, reason: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsPoolOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue text-white hover:bg-darkBlue"
                disabled={
                  poolMutation.isPending ||
                  !poolForm.fromAccountNumber ||
                  !poolForm.toAccountNumber ||
                  !poolForm.amountInNaira ||
                  !poolForm.reason
                }
                onClick={() => poolMutation.mutate()}
              >
                {poolMutation.isPending ? "Transferring..." : "Confirm Transfer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
