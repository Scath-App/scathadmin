"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  reconcileInwardTransfer,
  reconcilePendingTransfer,
  reconcileUserInwardTransfer,
  verifyTransferForReconciliation,
} from "@/lib/financeService";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReconcileDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAccountNumber?: string;
  userId?: number | string;
  onSuccess?: () => void;
}

export function ReconcileDepositModal({
  isOpen,
  onClose,
  defaultAccountNumber = "",
  userId,
  onSuccess,
}: ReconcileDepositModalProps) {
  const queryClient = useQueryClient();
  const [accountNumber, setAccountNumber] = useState(defaultAccountNumber);
  const [sessionId, setSessionId] = useState("");
  const [amountInNaira, setAmountInNaira] = useState("");
  const [senderName, setSenderName] = useState("");
  const [reason, setReason] = useState("");
  const [verifiedResult, setVerifiedResult] = useState<any | null>(null);

  // Sync state if defaultAccountNumber changes
  React.useEffect(() => {
    if (defaultAccountNumber) {
      setAccountNumber(defaultAccountNumber);
    }
  }, [defaultAccountNumber]);

  const resetForm = () => {
    setSessionId("");
    setAmountInNaira("");
    setSenderName("");
    setReason("");
    setVerifiedResult(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Step 1: Verify transfer details (works for both Inward Deposits and Internal/External Transfers)
  const verifyMutation = useMutation({
    mutationFn: (idToVerify: string) => verifyTransferForReconciliation(idToVerify),
    onSuccess: (res) => {
      if (res?.data) {
        setVerifiedResult(res);
        const data = res.data;
        if (data.destinationAccountNumber && !accountNumber) {
          setAccountNumber(data.destinationAccountNumber);
        }
        if (data.amount) {
          setAmountInNaira(String(data.amount));
        }
        if (data.senderName && data.senderName !== "External Sender") {
          setSenderName(data.senderName);
        }

        if (res.kind === "INTERNAL_TRANSFER") {
          toast.success("Internal transfer record found!");
        } else if (data.requiresManualDetails) {
          toast.info("Session ID confirmed. Enter deposit amount and target account number.");
        } else {
          toast.success("Transaction verified successfully!");
        }
      }
    },
    onError: (err: any) => {
      setVerifiedResult(null);
      toast.error(
        err?.response?.data?.message ||
          "Could not verify transaction. Please check the Session ID / Reference.",
      );
    },
  });

  // Reconcile Inward Deposit Mutation
  const reconcileInwardMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        accountNumber: effectiveAccountNumber,
        sessionId: sessionId.trim(),
        paymentReference: verifiedData?.paymentReference,
        amountInNaira: effectiveAmount,
        senderName: senderName || verifiedData?.senderName,
        senderBank: verifiedData?.senderBank,
        narration: verifiedData?.narration,
        providerFeeInNaira: verifiedData?.feeInNaira,
      };

      if (userId) {
        return reconcileUserInwardTransfer(userId, payload);
      }
      return reconcileInwardTransfer(payload);
    },
    onSuccess: (res) => {
      toast.success(
        res?.message || "Inward deposit reconciled successfully into ledger!",
      );
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-account-stats"] });
      queryClient.invalidateQueries({ queryKey: ["user-accounts", userId] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onSuccess?.();
      handleClose();
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          "Failed to reconcile deposit. Ensure account number and session ID are valid.",
      );
    },
  });

  // Reconcile Pending Transfer Mutation (Internal P2P)
  const reconcilePendingMutation = useMutation({
    mutationFn: async (action: "REVERSE_TO_SENDER" | "FORCE_CREDIT_RECEIVER") => {
      return reconcilePendingTransfer({
        reference: verifiedData?.reference || sessionId.trim(),
        action,
        reason: reason.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      toast.success(res?.message || "Transfer reconciled successfully!");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-account-stats"] });
      queryClient.invalidateQueries({ queryKey: ["user-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onSuccess?.();
      handleClose();
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          "Failed to reconcile pending transfer.",
      );
    },
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = sessionId.trim();
    if (!cleanId) {
      toast.error("Please enter a Session ID or Payment Reference");
      return;
    }
    verifyMutation.mutate(cleanId);
  };

  const verifiedData = verifiedResult?.data;
  const transferKind = verifiedResult?.kind || "INWARD_DEPOSIT";
  const isInternal = transferKind === "INTERNAL_TRANSFER";
  const isOutward = transferKind === "EXTERNAL_TRANSFER" || String(verifiedData?.type).toLowerCase() === "outwards";
  const isAlreadyReconciled = Boolean(verifiedData?.isAlreadyReconciled);
  const isPending = verifiedData?.status === "PENDING";
  const isMutating =
    verifyMutation.isPending ||
    reconcileInwardMutation.isPending ||
    reconcilePendingMutation.isPending;

  const effectiveAmount = verifiedData?.amount
    ? Number(verifiedData.amount)
    : Number(amountInNaira) || 0;

  const effectiveAccountNumber =
    accountNumber || verifiedData?.destinationAccountNumber || defaultAccountNumber;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Unified Reconciliation
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Enter any SafeHaven Session ID or Reference to verify and reconcile.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-3 pt-2">
          {/* Session ID / Reference Input */}
          <div className="space-y-1.5">
            <Label htmlFor="sessionId" className="text-xs font-semibold text-gray-700">
              SafeHaven Session ID / Reference <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="sessionId"
                placeholder="e.g. TRF-MT69LA9ID3A078 or 09028626..."
                value={sessionId}
                onChange={(e) => {
                  setSessionId(e.target.value);
                  setVerifiedResult(null);
                }}
                className="h-9 text-xs font-mono"
                required
                disabled={isMutating}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!sessionId.trim() || isMutating}
                className="h-9 px-3 text-xs bg-gray-900 hover:bg-gray-800 text-white font-medium shrink-0 flex items-center gap-1.5"
              >
                {verifyMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                Verify
              </Button>
            </div>
          </div>

          {/* Inward Deposit Manual Inputs (Fallback) */}
          {transferKind === "INWARD_DEPOSIT" && verifiedData?.requiresManualDetails && (
            <>
              {!defaultAccountNumber && (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="accountNumber" className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                    <span>Destination Account Number</span>
                    <span className="text-[11px] font-normal text-gray-400">
                      (Required for Manual Fallback)
                    </span>
                  </Label>
                  <Input
                    id="accountNumber"
                    placeholder="e.g. 5011179517"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="h-9 text-xs font-mono"
                    required
                    disabled={isMutating}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="amountInNaira" className="text-xs font-semibold text-gray-700">
                    Deposit Amount (₦) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="amountInNaira"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 70000"
                    value={amountInNaira}
                    onChange={(e) => setAmountInNaira(e.target.value)}
                    className="h-9 text-xs font-bold text-emerald-700"
                    required
                    disabled={isMutating}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="senderName" className="text-xs font-semibold text-gray-700">
                    Sender Name (Optional)
                  </Label>
                  <Input
                    id="senderName"
                    placeholder="e.g. IBRAHIM BASHIR DAUDA"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="h-9 text-xs"
                    disabled={isMutating}
                  />
                </div>
              </div>
            </>
          )}

          {/* Internal Transfer Reason Input */}
          {isInternal && isPending && (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="reason" className="text-xs font-semibold text-gray-700">
                Reason for Manual Resolution (Audit Log)
              </Label>
              <Input
                id="reason"
                placeholder="e.g. SafeHaven timed out during dispatch; reversing to refund sender"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-9 text-xs"
                disabled={isMutating}
              />
            </div>
          )}
        </form>

        {/* Live Verified Result Card */}
        {verifiedData && (
          <div
            className={`rounded-xl border p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              isInternal
                ? isPending
                  ? "border-amber-200 bg-amber-50/50"
                  : "border-blue-200 bg-blue-50/50"
                : isOutward || isAlreadyReconciled
                  ? "border-amber-200 bg-amber-50/50"
                  : "border-emerald-200 bg-emerald-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex items-center gap-1.5 text-xs font-bold ${
                  isInternal
                    ? "text-blue-900"
                    : isOutward || isAlreadyReconciled
                      ? "text-amber-800"
                      : "text-emerald-700"
                }`}
              >
                {isInternal ? (
                  <UserCheck className="w-4 h-4 text-blue-600" />
                ) : (
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      isOutward || isAlreadyReconciled ? "text-amber-600" : "text-emerald-600"
                    }`}
                  />
                )}
                <span>
                  {isInternal
                    ? "Internal Transfer (P2P)"
                    : isOutward
                      ? "Outward Bank Transfer (NIP)"
                      : isAlreadyReconciled
                        ? "Deposit Already Reconciled"
                        : "Verified Inward Deposit"}
                </span>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isInternal
                    ? isPending
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-emerald-100 text-emerald-800"
                    : isOutward || isAlreadyReconciled
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {isInternal
                  ? `Status: ${verifiedData.status}`
                  : isOutward
                    ? "Outward (Cannot Credit)"
                    : isAlreadyReconciled
                      ? `Reconciled (#${verifiedData.reconciledTransactionId})`
                      : "Ready to Reconcile"}
              </span>
            </div>

            {/* Provider Status Alert */}
            {isInternal && (
              <div
                className={`text-xs p-2.5 rounded-lg border flex items-center justify-between ${
                  verifiedData.providerStatus === "NOT_FOUND_ON_PROVIDER" || verifiedData.providerStatus === "Not Found on Provider"
                    ? "bg-rose-50 text-rose-900 border-rose-200"
                    : "bg-amber-50 text-amber-900 border-amber-200"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Provider Status: <strong>{verifiedData.providerStatus}</strong>
                  </span>
                </div>
                {isPending && (
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded font-mono font-medium border">
                    Funds Held in Ledger
                  </span>
                )}
              </div>
            )}

            {isAlreadyReconciled && !isInternal && (
              <div className="text-xs text-amber-900 font-medium p-2.5 rounded-lg bg-amber-100/70 border border-amber-200">
                🔒 This deposit has <strong>ALREADY been reconciled</strong> into the database (ID #{verifiedData.reconciledTransactionId}). Re-crediting is blocked to prevent double payout.
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div>
                <span className="text-[11px] text-gray-500 block">Amount</span>
                <span className="font-bold text-gray-900 text-sm text-emerald-700">
                  ₦{effectiveAmount ? effectiveAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-gray-500 block">Sender</span>
                <span className="font-medium text-gray-800 truncate block">
                  {verifiedData.senderName || senderName || "External"}
                </span>
                {verifiedData.senderEmail && (
                  <span className="text-[10px] text-gray-500 block truncate">
                    {verifiedData.senderEmail}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[11px] text-gray-500 block">Sender Account</span>
                <span className="font-mono text-gray-800">
                  {verifiedData.senderAccountNumber || "External"}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-gray-500 block">
                  {isInternal ? "Receiver Account" : "Target Account"}
                </span>
                <span className="font-mono text-gray-800">
                  {effectiveAccountNumber || "Not set"}
                </span>
                {verifiedData.destinationAccountName && (
                  <span className="text-[10px] text-gray-500 block truncate">
                    {verifiedData.destinationAccountName}
                  </span>
                )}
              </div>

              <div className="col-span-2">
                <span className="text-[11px] text-gray-500 block">Reference / Session ID</span>
                <span className="font-mono text-gray-800 text-[10px] truncate block" title={sessionId}>
                  {verifiedData.reference || sessionId}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Action Footer */}
        <DialogFooter className="gap-2 pt-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isMutating}
            className="h-9 text-xs"
          >
            Cancel
          </Button>

          {isInternal ? (
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={!isPending || isMutating}
                onClick={() => reconcilePendingMutation.mutate("REVERSE_TO_SENDER")}
                className="h-9 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 flex items-center gap-1"
              >
                {reconcilePendingMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                Reverse & Refund Sender
              </Button>
              <Button
                type="button"
                disabled={!isPending || isMutating}
                onClick={() => reconcilePendingMutation.mutate("FORCE_CREDIT_RECEIVER")}
                className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 flex items-center gap-1"
              >
                {reconcilePendingMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Force Credit Receiver
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              disabled={
                !verifiedData ||
                isOutward ||
                isAlreadyReconciled ||
                !effectiveAccountNumber ||
                isMutating
              }
              onClick={() => reconcileInwardMutation.mutate()}
              className="h-9 text-xs bg-blue hover:bg-blue-600 text-white font-semibold px-4"
            >
              {reconcileInwardMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                `Confirm & Credit ₦${effectiveAmount ? effectiveAmount.toLocaleString() : "0"}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
