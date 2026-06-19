"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPendingPayouts, approvePayout, rejectPayout, initiateManualPayout,
} from "@/lib/financeService";
import { searchUsers, UserSearchResult } from "@/lib/userService";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { MoneyCell, formatNaira } from "@/components/ui/MoneyCell";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoleGate } from "@/components/ui/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  CheckCircle, XCircle, Plus, Clock, Search, User, X, Phone, Mail, CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// ─── Schema ────────────────────────────────────────────────────────────────────

const payoutSchema = z.object({
  userId: z.coerce.number().positive("Please select a user"),
  amountInKobo: z.coerce.number().min(100, "Minimum ₦1"),
  description: z.string().min(3, "Required"),
  accountNumber: z.string().optional(),
});

// ─── UserSearchCombobox ────────────────────────────────────────────────────────

interface UserSearchComboboxProps {
  value: number | undefined;
  onSelect: (user: UserSearchResult) => void;
  onClear: () => void;
  selectedUser: UserSearchResult | null;
  error?: string;
}

function UserSearchCombobox({ value, onSelect, onClear, selectedUser, error }: UserSearchComboboxProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the query
  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(q.trim()), 350);
  }, []);

  const { data: results = [], isFetching } = useQuery<UserSearchResult[]>({
    queryKey: ["userSearch", debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery, 8),
    enabled: debouncedQuery.length >= 2,
    staleTime: 10_000,
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (selectedUser) {
    return (
      <div className={`rounded-lg border p-3 bg-blue/5 ${error ? "border-red" : "border-blue/30"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-blue/10 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-blue" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">
                {selectedUser.displayName}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                {selectedUser.email && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Mail className="w-3 h-3" />
                    {selectedUser.email}
                  </span>
                )}
                {selectedUser.phoneNumber && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Phone className="w-3 h-3" />
                    {selectedUser.phoneNumber}
                  </span>
                )}
                {selectedUser.matchedAccountNumber && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <CreditCard className="w-3 h-3" />
                    {selectedUser.matchedAccountNumber}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear selected user"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-gray-400 font-mono">User ID #{selectedUser.id}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className={`flex items-center rounded-md border bg-white transition-colors ${
        open ? "border-blue ring-1 ring-blue/30" : error ? "border-red" : "border-input"
      }`}>
        <Search className="w-4 h-4 ml-3 shrink-0 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          className="flex-1 px-2 py-2.5 text-sm bg-transparent outline-none placeholder:text-gray-400"
          placeholder="Search by email, phone, or account number…"
          value={query}
          onChange={(e) => {
            handleQueryChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          spellCheck={false}
        />
        {isFetching && (
          <div className="mr-3 w-4 h-4 border-2 border-blue/30 border-t-blue rounded-full animate-spin" />
        )}
      </div>

      {open && debouncedQuery.length >= 2 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
        >
          {results.length === 0 && !isFetching ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No users found for <span className="font-medium">"{debouncedQuery}"</span>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
              {results.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue/5 transition-colors text-left"
                    onClick={() => {
                      onSelect(user);
                      setOpen(false);
                      setQuery("");
                      setDebouncedQuery("");
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.displayName}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {user.email && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </span>
                        )}
                        {user.phoneNumber && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone className="w-3 h-3" />
                            {user.phoneNumber}
                          </span>
                        )}
                        {user.matchedAccountNumber && (
                          <span className="flex items-center gap-1 text-xs text-blue font-medium">
                            <CreditCard className="w-3 h-3" />
                            {user.matchedAccountNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] text-gray-400 font-mono">
                      #{user.id}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs text-red">{error}</p>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PayoutsPage() {
  const queryClient = useQueryClient();
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [payoutResult, setPayoutResult] = useState<any>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);

  const { data: pending, isLoading } = useQuery({
    queryKey: ["pendingPayouts"],
    queryFn: getPendingPayouts,
  });

  const pendingList: any[] = Array.isArray(pending) ? pending : [];

  const form = useForm<z.infer<typeof payoutSchema>>({
    resolver: zodResolver(payoutSchema) as any,
    defaultValues: {
      userId: undefined as any,
      amountInKobo: undefined as any,
      description: "",
      accountNumber: "",
    },
  });

  const userIdError = form.formState.errors.userId?.message;

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsCreateOpen(false);
      setSelectedUser(null);
      form.reset();
    }
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => approvePayout(id, reason),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["pendingPayouts"] });
      toast.success(`Approved — Ref: ${res.reference}. New balance: ${formatNaira(res.newBalanceInKobo)}`);
      setApprovingId(null);
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message ?? "Approval failed.");
      setApprovingId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectPayout(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingPayouts"] });
      toast.success("Payout rejected.");
      setRejectingId(null);
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message ?? "Rejection failed.");
      setRejectingId(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (v: z.infer<typeof payoutSchema>) => initiateManualPayout(v),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["pendingPayouts"] });
      setPayoutResult(res);
      setIsCreateOpen(false);
      setSelectedUser(null);
      form.reset();
    },
    onError: (e: any) => {
      if ((e as any).rateLimited) {
        const seconds = (e as any).retryAfter ?? 60;
        setRateLimitCountdown(seconds);
        const interval = setInterval(() => {
          setRateLimitCountdown((prev) => {
            if (prev <= 1) { clearInterval(interval); return 0; }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error(e.response?.data?.message ?? "Failed to initiate payout.");
      }
    },
  });

  const columns: Column[] = [
    { key: "id", header: "ID", className: "font-mono text-xs text-gray-500", render: (v) => `#${v}` },
    { key: "userId", header: "User ID", render: (v) => `User #${v}` },
    {
      key: "amountInKobo",
      header: "Amount",
      headerClassName: "text-right",
      render: (v) => <div className="text-right"><MoneyCell kobo={v} /></div>,
    },
    { key: "accountNumber", header: "Account", className: "font-mono text-sm" },
    { key: "description", header: "Description", className: "text-sm text-gray-500 max-w-[200px] truncate" },
    {
      key: "submittedBy",
      header: "Submitted By",
      render: (v) => v ? `Admin #${v}` : "—",
    },
    {
      key: "createdAt",
      header: "Created",
      render: (v) => v ? format(new Date(v), "dd MMM yyyy, HH:mm") : "—",
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      render: (_, row) => (
        <RoleGate roles={["ADMIN"]}>
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="text-greeny hover:bg-greeny/10 gap-1 text-xs"
              onClick={() => setApprovingId(row.id)}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red hover:bg-red/10 gap-1 text-xs"
              onClick={() => setRejectingId(row.id)}
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </Button>
          </div>
        </RoleGate>
      ),
    },
  ];

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Payouts"
        subtitle="Pending payout queue with maker-checker approval."
        actions={
          <RoleGate roles={["ADMIN"]}>
            <Button className="bg-blue hover:bg-darkBlue text-white gap-2" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4" /> Manual Payout
            </Button>
          </RoleGate>
        }
      />

      {rateLimitCountdown > 0 && (
        <div className="rounded-xl bg-yellow/10 border border-yellow/30 p-4 text-sm text-yellow flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Rate limit reached. You can retry in <strong>{rateLimitCountdown}s</strong>.
        </div>
      )}

      {payoutResult && (
        <div className="rounded-xl bg-greeny/5 border border-greeny/20 p-5 space-y-2">
          <p className="font-semibold text-greeny">
            {payoutResult.executed ? "Payout Executed Immediately" : "Payout Queued for Approval"}
          </p>
          {payoutResult.executed ? (
            <div className="text-sm space-y-1">
              <p>Reference: <span className="font-mono">{payoutResult.reference}</span></p>
              <p>New Balance: <MoneyCell kobo={payoutResult.newBalanceInKobo} /></p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Request ID: <span className="font-mono">{payoutResult.requestId}</span></p>
          )}
          <Button size="sm" variant="outline" onClick={() => setPayoutResult(null)}>Dismiss</Button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">
            Pending Queue <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red text-white text-[10px] font-bold">{pendingList.length}</span>
          </h3>
        </div>
        {pendingList.length === 0 && !isLoading ? (
          <EmptyState icon={CheckCircle} title="No pending payouts" message="All payouts have been processed." />
        ) : (
          <DataTable columns={columns} data={pendingList} loading={isLoading} rowKey={(r) => r.id} />
        )}
      </div>

      {/* Approve modal */}
      <ConfirmModal
        open={approvingId !== null}
        onOpenChange={(v) => !v && setApprovingId(null)}
        title="Approve Payout"
        message="Approve this payout request? The funds will be disbursed immediately."
        confirmLabel="Approve"
        reasonField
        reasonLabel="Approval note (optional)"
        loading={approveMutation.isPending}
        onConfirm={(reason) => approveMutation.mutate({ id: approvingId!, reason })}
      />

      {/* Reject modal */}
      <ConfirmModal
        open={rejectingId !== null}
        onOpenChange={(v) => !v && setRejectingId(null)}
        title="Reject Payout"
        message="Provide a reason for rejection."
        confirmLabel="Reject"
        danger
        reasonField
        reasonLabel="Rejection reason"
        reasonRequired
        loading={rejectMutation.isPending}
        onConfirm={(reason) => rejectMutation.mutate({ id: rejectingId!, reason: reason! })}
      />

      {/* Manual Payout modal */}
      <Dialog open={isCreateOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Initiate Manual Payout</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 -mt-1">
            Auto-approved if below threshold; otherwise queued for checker approval.
          </p>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
              className="space-y-4 pt-1"
            >
              {/* ── User lookup ── */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Recipient User
                </label>
                <UserSearchCombobox
                  value={form.watch("userId")}
                  selectedUser={selectedUser}
                  error={userIdError}
                  onSelect={(user) => {
                    setSelectedUser(user);
                    form.setValue("userId", user.id, { shouldValidate: true });
                  }}
                  onClear={() => {
                    setSelectedUser(null);
                    form.setValue("userId", undefined as any, { shouldValidate: false });
                  }}
                />
                {!selectedUser && (
                  <p className="text-[11px] text-gray-400 flex items-center gap-1 pt-0.5">
                    <Search className="w-3 h-3" />
                    Type at least 2 characters — email, phone number, or account number
                  </p>
                )}
              </div>

              {/* ── Amount ── */}
              <FormField control={form.control} name="amountInKobo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount in Kobo <span className="text-gray-400 font-normal">(min 100 = ₦1)</span></FormLabel>
                  <FormControl>
                    <Input type="number" min={100} placeholder="e.g. 500000 = ₦5,000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* ── Description ── */}
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Reason for payout" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* ── Account override ── */}
              <FormField control={form.control} name="accountNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Account Number <span className="text-gray-400 font-normal">(optional override)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Leave blank to use user's default" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button
                type="submit"
                className="w-full bg-blue text-white"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Processing…" : "Initiate Payout"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
