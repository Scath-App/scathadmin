"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPendingPayouts, approvePayout, rejectPayout, initiateManualPayout,
} from "@/lib/financeService";
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
import { CheckCircle, XCircle, Plus, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const payoutSchema = z.object({
  userId: z.coerce.number().positive("User ID required"),
  amountInKobo: z.coerce.number().min(100, "Minimum ₦1"),
  description: z.string().min(3, "Required"),
  accountNumber: z.string().optional(),
});

export default function PayoutsPage() {
  const queryClient = useQueryClient();
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [payoutResult, setPayoutResult] = useState<any>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  const { data: pending, isLoading } = useQuery({
    queryKey: ["pendingPayouts"],
    queryFn: getPendingPayouts,
    refetchInterval: 30000,
  });

  const pendingList: any[] = Array.isArray(pending) ? pending : [];

  const form = useForm<z.infer<typeof payoutSchema>>({
    resolver: zodResolver(payoutSchema) as any,
    defaultValues: { userId: undefined as any, amountInKobo: undefined as any, description: "", accountNumber: "" },
  });

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
      key: "id",
      header: "Actions",
      headerClassName: "text-right",
      render: (id) => (
        <RoleGate roles={["ADMIN"]}>
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="text-greeny hover:bg-greeny/10 gap-1 text-xs"
              onClick={() => setApprovingId(id)}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red hover:bg-red/10 gap-1 text-xs"
              onClick={() => setRejectingId(id)}
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
          <Button className="bg-blue hover:bg-darkBlue text-white gap-2" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Manual Payout
          </Button>
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
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Initiate Manual Payout</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 -mt-1">Auto-approved if below threshold; otherwise queued for checker approval.</p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4 pt-1">
              <FormField control={form.control} name="userId" render={({ field }) => (
                <FormItem>
                  <FormLabel>User ID</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g. 123" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="amountInKobo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount in Kobo (min 100 = ₦1)</FormLabel>
                  <FormControl><Input type="number" min={100} placeholder="e.g. 500000 = ₦5,000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Input placeholder="Reason for payout" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="accountNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number (optional)</FormLabel>
                  <FormControl><Input placeholder="Override destination account" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full bg-blue text-white" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Processing..." : "Initiate Payout"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
