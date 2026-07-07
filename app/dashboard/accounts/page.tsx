"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAccounts, createMainAccount, updateAccountPurpose,
  syncSingleAccount, searchAccounts,
  refreshSingleAccount
} from "@/lib/financeService";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MoneyCell } from "@/components/ui/MoneyCell";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, RefreshCw, RefreshCcw, Search, X, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { formatDistanceToNow } from "date-fns";

const createAccountSchema = z.object({
  accountType: z.enum(["Savings", "Current"]),
  suffix: z.string().min(1, "Required"),
  purpose: z.enum(["float", "investments", "savebox", "payout"]),
  metadata: z.string().optional(),
});

const PURPOSE_COLORS: Record<string, string> = {
  float: "bg-blue/10 text-blue border-blue/20",
  investments: "bg-purple/10 text-purple border-purple/20",
  savebox: "bg-greeny/10 text-greeny border-greeny/20",
  payout: "bg-yellow/10 text-yellow border-yellow/20",
};

const LIMIT = 25;

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useRole();
  const [page, setPage] = useState(1);
  const [isMainFilter, setIsMainFilter] = useState<boolean | undefined>(undefined);
  const [isSubFilter, setIsSubFilter] = useState<boolean | undefined>(undefined);
  const [driftFilter, setDriftFilter] = useState<string | undefined>(undefined);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPurposeId, setEditingPurposeId] = useState<number | null>(null);
  const [newPurpose, setNewPurpose] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["accounts", page, isMainFilter, isSubFilter, driftFilter],
    queryFn: () =>
      getAccounts({
        page,
        limit: LIMIT,
        ...(isMainFilter !== undefined ? { isMainAccount: isMainFilter } : {}),
        ...(isSubFilter !== undefined ? { isSubAccount: isSubFilter } : {}),
        ...(driftFilter ? { driftStatus: driftFilter } : {}),
      }),
    enabled: isAdmin,
  });



  const accounts: any[] = data?.data ?? [];
  const meta = data?.meta ?? {};

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const result = await searchAccounts(searchQuery.trim());
      if (result && result.length > 0) {
        setSearchResult(result[0]);
      } else {
        toast.error("Account not found.");
        setSearchResult(null);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Account not found.");
      setSearchResult(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const form = useForm<z.infer<typeof createAccountSchema>>({
    resolver: zodResolver(createAccountSchema) as any,
    defaultValues: { accountType: "Savings", suffix: "", purpose: "float", metadata: "" },
  });

  const createMutation = useMutation({
    mutationFn: (v: z.infer<typeof createAccountSchema>) =>
      createMainAccount({
        accountType: v.accountType,
        suffix: v.suffix,
        purpose: v.purpose,
        metadata: v.metadata ? JSON.parse(v.metadata) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account created successfully.");
      setIsCreateOpen(false);
      form.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create account."),
  });

  const purposeMutation = useMutation({
    mutationFn: ({ id, purpose }: { id: number; purpose: string }) =>
      updateAccountPurpose(id, purpose),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Purpose updated.");
      setEditingPurposeId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update purpose."),
  });

  const syncOneMutation = useMutation({
    mutationFn: (accountId: string) => syncSingleAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account reconciled. Local ledger updated to match SafeHaven.");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Sync failed."),
  });

  const refreshOneMutation = useMutation({
    mutationFn: (accountId: string) => refreshSingleAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Balance snapshot refreshed.");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Refresh failed."),
  });



  const columns: Column[] = [
    {
      key: "accountName",
      header: "Account Details",
      className: "px-6 py-4 min-w-[280px]",
      render: (_, row) => (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-gray-950 text-sm leading-tight">
            {row.accountName || "—"}
          </span>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
            <span className="font-semibold text-gray-600 font-mono tracking-normal text-[11px] bg-gray-50 px-1 py-0.5 rounded border border-gray-100">{row.accountNumber || "—"}</span>
            <span className="text-gray-300">•</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-blue/20 text-blue bg-faintSky font-sans font-bold uppercase tracking-wider">
              {row.isMainAccount ? "Main" : row.isSubAccount ? "Sub" : "User"}
            </Badge>
            <span className="text-gray-300">•</span>
            <span className="capitalize font-sans text-[10px] font-semibold text-gray-500 bg-gray-50 border border-gray-200/50 px-1.5 py-0.5 flex items-center justify-center rounded">
              {row.accountType?.toLowerCase() ?? "—"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "purpose",
      header: "Purpose",
      className: "w-[120px] px-6 py-4",
      headerClassName: "w-[120px] px-6 text-left",
      render: (v) =>
        v ? (
          <Badge variant="outline" className={`text-xs ${PURPOSE_COLORS[v] ?? "text-gray-500 border-gray-200"}`}>
            {v}
          </Badge>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "accountBalanceInKobo",
      header: "DB Balance",
      className: "w-[130px] px-6 py-4 text-right",
      headerClassName: "w-[130px] px-6 text-right",
      render: (v, row) => (
        <div className="text-right">
          <span className="font-bold text-gray-900">
            <MoneyCell kobo={v ?? row.accountBalanceInKobo} />
          </span>
        </div>
      ),
    },
    {
      key: "providerBalanceInKobo",
      header: "SH Balance",
      className: "w-[170px] px-6 py-4 text-right",
      headerClassName: "w-[170px] px-6 text-right",
      render: (v, row) => (
        <div className="text-right flex flex-col items-end gap-0.5">
          <span className="font-semibold text-gray-700">
            {v != null ? <MoneyCell kobo={v} /> : <span className="text-gray-400">—</span>}
          </span>
          {row.lastProviderSyncAt && (
            <span className="text-[10px] text-gray-400/90 font-medium">
              Fetched {formatDistanceToNow(new Date(row.lastProviderSyncAt), { addSuffix: true })}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "driftInKobo",
      header: "Drift",
      className: "w-[135px] px-6 py-4 text-right",
      headerClassName: "w-[135px] px-6 text-right",
      render: (v, row) => {
        const hasDrift = v != null && v > 0;
        const isSynced = row.driftStatus === "synced";

        return (
          <div className="flex flex-col items-end gap-1">
            <span className={`font-bold ${hasDrift ? "text-red-600" : "text-gray-400"}`}>
              {v != null ? (
                <MoneyCell kobo={v} className={hasDrift ? "text-red-600 font-bold" : "text-gray-400 font-medium"} />
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </span>
            {row.driftStatus && !isSynced && (
              <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${
                row.driftStatus === 'critical' ? 'bg-red/10 text-red border-red/20 animate-pulse' : 
                row.driftStatus === 'minor' ? 'bg-yellow/10 text-yellow-600 border-yellow/20' : 
                row.driftStatus === 'auto-swept' ? 'bg-blue/5 text-blue/70 border-blue/10' :
                'bg-gray-100 text-gray-500 border-gray-200'
              }`}>
                {row.driftStatus}
              </Badge>
            )}
            {isSynced && (
              <div className="flex items-center gap-1 text-[10px] text-greeny font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-greeny" />
                Synced
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      className: "w-[110px] px-6 py-4",
      headerClassName: "w-[110px] px-6 text-left",
      render: (v) => <StatusBadge status={v ?? "ACTIVE"} />,
    },
    {
      key: "id",
      header: "Actions",
      className: "w-[180px] px-6 py-4 text-right",
      headerClassName: "w-[180px] px-6 text-right",
      render: (id, row) => {
        const isRefreshingThis = refreshOneMutation.isPending && refreshOneMutation.variables === row.accountId;
        const isSyncingThis = syncOneMutation.isPending && syncOneMutation.variables === row.accountId;
        const isSynced = row.driftStatus === "synced";
        return (
          <div className="flex items-center justify-end gap-1.5">
            {editingPurposeId === id ? (
              <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-lg border border-gray-100">
                <Select value={newPurpose} onValueChange={setNewPurpose}>
                  <SelectTrigger className="w-[100px] h-7 text-xs bg-white border-gray-200 shadow-none">
                    <SelectValue placeholder="Purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {["float", "investments", "savebox", "payout"].map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-7 px-2 text-xs bg-blue hover:bg-darkBlue text-white"
                  disabled={purposeMutation.isPending}
                  onClick={() => purposeMutation.mutate({ id, purpose: newPurpose })}
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gray-500" onClick={() => setEditingPurposeId(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                {row.isMainAccount && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-blue hover:bg-blue/5 h-7 px-2"
                    onClick={() => { setEditingPurposeId(id); setNewPurpose(row.purpose ?? ""); }}
                  >
                    Purpose
                  </Button>
                )}
                {/* Passive refresh — updates SH snapshot + drift, does NOT touch ledger */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 h-7 w-7 p-0 flex items-center justify-center rounded-lg transition-all"
                  title="Refresh SafeHaven balance snapshot"
                  disabled={refreshOneMutation.isPending || !row.accountId}
                  onClick={() => refreshOneMutation.mutate(row.accountId)}
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${isRefreshingThis ? "animate-spin text-blue" : ""}`} />
                </Button>
                {/* Active reconcile — always visible, but disabled when synced */}
                {row.driftStatus && (
                  <Button
                    size="sm"
                    variant="outline"
                    className={`text-xs h-7 px-2.5 flex items-center gap-1 rounded-lg transition-all shadow-sm ${
                      isSynced || row.driftStatus === "auto-swept"
                        ? "text-gray-400 border-gray-200 bg-gray-50/80 cursor-not-allowed"
                        : "border-yellow/20 text-yellow bg-yellow-50/50 hover:bg-yellow-50 hover:text-yellow-600"
                    }`}
                    title={
                      isSynced || row.driftStatus === "auto-swept"
                        ? "Account is already synced. No reconciliation needed."
                        : "Reconcile: overwrite local ledger with SafeHaven balance"
                    }
                    disabled={syncOneMutation.isPending || !row.accountId || isSynced || row.driftStatus === "auto-swept"}
                    onClick={() => syncOneMutation.mutate(row.accountId)}
                  >
                    <ShieldCheck className={`w-3.5 h-3.5 ${isSyncingThis ? "animate-pulse" : ""}`} />
                    {isSyncingThis ? "Reconciling..." : "Reconcile"}
                  </Button>
                )}
              </>
            )}
          </div>
        );
      },
    },
  ];

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3 px-6">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Lock className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-base font-semibold text-gray-700">Admin Access Required</p>
        <p className="text-sm text-gray-400 max-w-xs">Account management is restricted to administrators.</p>
      </div>
    );
  }

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Account Reconciliation"
        subtitle="Platform accounts with purpose, balance, and sync status."
        actions={
          <div className="flex items-center gap-2">
            <Button className="bg-blue hover:bg-darkBlue text-white gap-2" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create Account
            </Button>
          </div>
        }
      />

      {/* Controls / Filter Bar */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap shadow-sm">
        <div className="flex items-center gap-6 flex-wrap">
          {/* Classification Toggles */}
          <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 pl-2">Type:</span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold text-gray-700">
              <Switch checked={!!isMainFilter} onCheckedChange={(v) => { setIsMainFilter(v || undefined); setPage(1); }} />
              Main
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold text-gray-700 pr-2">
              <Switch checked={!!isSubFilter} onCheckedChange={(v) => { setIsSubFilter(v || undefined); setPage(1); }} />
              Sub
            </label>
          </div>

          {/* Drift Status Select */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Drift Status:</span>
            <Select value={driftFilter || "all"} onValueChange={(v) => { setDriftFilter(v === "all" ? undefined : v); setPage(1); }}>
              <SelectTrigger className="w-[140px] h-9 bg-white border-gray-200 text-xs font-medium shadow-none">
                <SelectValue placeholder="Drift Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="synced">Synced</SelectItem>
                <SelectItem value="minor">Minor Drift</SelectItem>
                <SelectItem value="critical">Critical Drift</SelectItem>
                <SelectItem value="auto-swept">Auto-Swept</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search by identifier */}
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by number, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9 bg-white border-gray-200 text-xs h-9"
            />
          </div>
          <Button
            size="sm"
            className="bg-blue hover:bg-darkBlue text-white h-9 px-4 text-xs font-medium"
            onClick={handleSearch}
            disabled={searchLoading || !searchQuery.trim()}
          >
            {searchLoading ? "Searching..." : "Search"}
          </Button>
          {searchResult && (
            <Button variant="ghost" size="sm" className="h-9 px-2 hover:bg-gray-100" onClick={() => { setSearchResult(null); setSearchQuery(""); }}>
              <X className="w-4 h-4 text-gray-400" />
            </Button>
          )}
        </div>
      </div>



      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {searchResult && (
          <div className="border-b border-gray-100 bg-blue/5 px-6 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-blue">Search Result</p>
              <p className="text-xs text-blue/70 font-medium">Showing match for &quot;{searchQuery}&quot;</p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 px-3 text-blue hover:bg-blue/10 font-medium" onClick={() => { setSearchResult(null); setSearchQuery(""); }}>
              <X className="w-4 h-4 mr-1.5" /> Clear Search
            </Button>
          </div>
        )}
        <DataTable
          columns={columns}
          data={searchResult ? [searchResult] : accounts}
          loading={searchLoading || (!searchResult && isLoading)}
          rowKey={(r) => r.id}
          pagination={
            searchResult
              ? undefined
              : {
                  mode: "1-based",
                  page,
                  totalPages: meta.totalPages ?? 1,
                  total: meta.total,
                  onPageChange: setPage,
                }
          }
        />
      </div>

      {/* Create Account Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Main Account</DialogTitle>
            <DialogDescription>
              Create a new platform account and assign a purpose, suffix, and metadata.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4 pt-2">
              <FormField control={form.control} name="accountType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Savings">Savings</SelectItem>
                      <SelectItem value="Current">Current</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="suffix" render={({ field }) => (
                <FormItem>
                  <FormLabel>Suffix <span className="text-red">*</span></FormLabel>
                  <FormControl><Input placeholder="e.g. FLOAT-01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="purpose" render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["float", "investments", "savebox", "payout"].map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full bg-blue text-white" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* End */}
    </div>
  );
}
