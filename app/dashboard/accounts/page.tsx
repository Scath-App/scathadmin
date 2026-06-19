"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAccounts, createMainAccount, updateAccountPurpose,
  syncSingleAccount, syncAllAccounts, getAccountByNumberLocal
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
import { Plus, RefreshCw, RefreshCcw, Search, X, Lock } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";

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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPurposeId, setEditingPurposeId] = useState<number | null>(null);
  const [newPurpose, setNewPurpose] = useState("");
  const [syncAllResult, setSyncAllResult] = useState<any>(null);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const [searchNumber, setSearchNumber] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["accounts", page, isMainFilter, isSubFilter],
    queryFn: () =>
      getAccounts({
        page,
        limit: LIMIT,
        ...(isMainFilter !== undefined ? { isMainAccount: isMainFilter } : {}),
        ...(isSubFilter !== undefined ? { isSubAccount: isSubFilter } : {}),
      }),
    enabled: isAdmin,
  });

  const accounts: any[] = data?.data ?? [];
  const meta = data?.meta ?? {};

  const handleSearch = async () => {
    if (!searchNumber.trim()) return;
    setSearchLoading(true);
    try {
      const result = await getAccountByNumberLocal(searchNumber.trim());
      setSearchResult(result);
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
      toast.success("Account synced.");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Sync failed."),
  });

  const syncAllMutation = useMutation({
    mutationFn: syncAllAccounts,
    onSuccess: (res: any) => {
      // The API returns { status: 'pending', jobId: ... } for background processing
      const isPending = res?.status === "pending" || res?.jobId;
      const result = isPending || !res || Object.keys(res).length === 0 ? { started: true } : res;
      setSyncAllResult(result);
      if (result.started) {
        setIsBackgroundSyncing(true);
        // Keep the banner active for 15 seconds, then auto-refresh table
        setTimeout(() => {
          setIsBackgroundSyncing(false);
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
          toast.success("Background sync cycle completed. Balances refreshed.");
        }, 15000);
      }
      toast.success("Sync queued.");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Sync all failed."),
  });

  const columns: Column[] = [
    {
      key: "accountNumber",
      header: "Account Number",
      render: (v) => <span className="font-mono text-sm">{v ?? "—"}</span>,
    },
    { key: "accountName", header: "Name", className: "font-medium text-sm" },
    { key: "accountType", header: "Type", className: "text-sm text-gray-500" },
    {
      key: "purpose",
      header: "Purpose",
      render: (v) =>
        v ? (
          <Badge variant="outline" className={`text-xs ${PURPOSE_COLORS[v] ?? "text-gray-500 border-gray-200"}`}>
            {v}
          </Badge>
        ) : "—",
    },
    {
      key: "accountBalanceInKobo",
      header: "Balance",
      headerClassName: "text-right",
      render: (v, row) => (
        <div className="text-right">
          <MoneyCell kobo={v ?? row.accountBalanceInKobo} />
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={v ?? "ACTIVE"} />,
    },
    {
      key: "isMainAccount",
      header: "Type",
      render: (_, row) => (
        <Badge variant="outline" className="text-xs border-blue/20 text-blue bg-faintSky">
          {row.isMainAccount ? "Main" : row.isSubAccount ? "Sub" : "User"}
        </Badge>
      ),
    },
    {
      key: "id",
      header: "Actions",
      headerClassName: "text-right",
      render: (id, row) => (
        <div className="flex items-center justify-end gap-1.5">
          {editingPurposeId === id ? (
            <div className="flex items-center gap-1.5">
              <Select value={newPurpose} onValueChange={setNewPurpose}>
                <SelectTrigger className="w-[120px] h-7 text-xs">
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
                className="h-7 text-xs bg-blue text-white"
                disabled={purposeMutation.isPending}
                onClick={() => purposeMutation.mutate({ id, purpose: newPurpose })}
              >
                Save
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingPurposeId(null)}>
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-blue hover:bg-blue/5 h-7"
                onClick={() => { setEditingPurposeId(id); setNewPurpose(row.purpose ?? ""); }}
              >
                Purpose
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-gray-500 h-7"
                disabled={syncOneMutation.isPending || !row.accountId}
                onClick={() => syncOneMutation.mutate(row.accountId)}
              >
                <RefreshCcw className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
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
        title="Local Accounts"
        subtitle="Platform accounts with purpose, balance, and sync status."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-gray-200 gap-2"
              disabled={syncAllMutation.isPending}
              onClick={() => syncAllMutation.mutate()}
            >
              <RefreshCw className={`h-4 w-4 ${syncAllMutation.isPending ? "animate-spin" : ""}`} />
              Sync All
            </Button>
            <Button className="bg-blue hover:bg-darkBlue text-white gap-2" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create Account
            </Button>
          </div>
        }
      />

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3 text-sm text-gray-600 flex-none">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Switch checked={!!isMainFilter} onCheckedChange={(v) => { setIsMainFilter(v || undefined); setPage(1); }} />
            Main
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Switch checked={!!isSubFilter} onCheckedChange={(v) => { setIsSubFilter(v || undefined); setPage(1); }} />
            Sub
          </label>
        </div>

        {/* Search by number */}
        <div className="flex items-center gap-2 flex-1 max-w-sm ml-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by account number..."
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9 bg-white border-gray-200"
            />
          </div>
          <Button
            className="bg-blue text-white"
            onClick={handleSearch}
            disabled={searchLoading || !searchNumber.trim()}
          >
            {searchLoading ? "Searching..." : "Search"}
          </Button>
          {searchResult && (
            <Button variant="ghost" size="sm" onClick={() => setSearchResult(null)}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {isBackgroundSyncing && (
        <div className="bg-blue/5 border border-blue/20 rounded-xl p-4 flex items-center justify-between text-sm text-blue">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="font-medium">Background sync in progress... balances will update automatically shortly.</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-3 text-blue hover:bg-blue/10" onClick={() => setIsBackgroundSyncing(false)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Search result card */}
      {searchResult && (
        <div className="bg-white rounded-xl border border-blue/20 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{searchResult.accountName}</h3>
            <StatusBadge status={searchResult.status} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Account Number</p>
              <p className="font-mono font-medium">{searchResult.accountNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Type</p>
              <p>{searchResult.accountType ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Balance</p>
              <MoneyCell kobo={searchResult.accountBalanceInKobo} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Classification</p>
              <Badge variant="outline" className="text-xs border-blue/20 text-blue bg-faintSky mt-1">
                {searchResult.isMainAccount ? "Main" : searchResult.isSubAccount ? "Sub" : "User"}
              </Badge>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={accounts}
          loading={isLoading}
          rowKey={(r) => r.id}
          pagination={{
            mode: "1-based",
            page,
            totalPages: meta.totalPages ?? 1,
            total: meta.total,
            onPageChange: setPage,
          }}
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

      {/* Sync All Result Modal */}
      {syncAllResult && (
        <Dialog open={!!syncAllResult} onOpenChange={() => setSyncAllResult(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Sync All Results</DialogTitle>
              <DialogDescription>
                {syncAllResult.started
                  ? "The sync request was accepted. Account updates should appear shortly."
                  : "View the latest sync counts and any error details from the request."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              {syncAllResult.started ? (
                <div className="rounded-lg bg-blue/5 border border-blue/20 p-4 text-sm text-blue">
                  Sync has started successfully. Reload the page or wait a moment for updated balances.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-gray-50 p-3 text-center">
                      <p className="text-xl font-bold text-gray-900">{syncAllResult.total ?? "—"}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <div className="rounded-lg bg-greeny/5 p-3 text-center">
                      <p className="text-xl font-bold text-greeny">{syncAllResult.successful ?? "—"}</p>
                      <p className="text-xs text-gray-500">Successful</p>
                    </div>
                    <div className="rounded-lg bg-red/5 p-3 text-center">
                      <p className="text-xl font-bold text-red">{syncAllResult.failed ?? "—"}</p>
                      <p className="text-xs text-gray-500">Failed</p>
                    </div>
                  </div>
                  {syncAllResult.errors?.length > 0 && (
                    <div className="rounded-lg border border-red/20 overflow-hidden">
                      <p className="px-3 py-2 text-xs font-semibold text-red bg-red/5 border-b border-red/10">Errors</p>
                      <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                        {syncAllResult.errors.map((err: any, i: number) => (
                          <div key={i} className="px-3 py-2 text-xs text-gray-600">
                            <span className="font-mono text-red">{err.accountNumber}</span>: {err.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              <Button className="w-full" variant="outline" onClick={() => setSyncAllResult(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
