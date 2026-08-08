"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  reconcileInwardTransfer,
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
  const [verifiedData, setVerifiedData] = useState<any | null>(null);

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
    setVerifiedData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Step 1: Verify transfer details on SafeHaven
  const verifyMutation = useMutation({
    mutationFn: (idToVerify: string) => verifyTransferForReconciliation(idToVerify),
    onSuccess: (res) => {
      if (res?.data) {
        setVerifiedData(res.data);
        if (res.data.destinationAccountNumber && !accountNumber) {
          setAccountNumber(res.data.destinationAccountNumber);
        }
        if (res.data.amount) {
          setAmountInNaira(String(res.data.amount));
        }
        if (res.data.senderName && res.data.senderName !== "External Sender") {
          setSenderName(res.data.senderName);
        }
        if (res.data.requiresManualDetails) {
          toast.info("Session ID confirmed. Enter deposit amount and target account number.");
        } else {
          toast.success("Deposit verified on SafeHaven provider!");
        }
      }
    },
    onError: (err: any) => {
      setVerifiedData(null);
      toast.error(
        err?.response?.data?.message ||
          "Could not verify deposit on SafeHaven. Please check Session ID.",
      );
    },
  });

  // Step 2: Confirm & Reconcile into local ledger
  const reconcileMutation = useMutation({
    mutationFn: async () => {
      const targetAcc = (accountNumber.trim() || verifiedData?.destinationAccountNumber || "").trim();
      const numAmount = Number(amountInNaira) || Number(verifiedData?.amount) || 0;
      if (userId) {
        return reconcileUserInwardTransfer(userId, {
          accountNumber: targetAcc,
          sessionId: sessionId.trim(),
          amountInNaira: numAmount,
          senderName: senderName || verifiedData?.senderName,
        });
      }
      return reconcileInwardTransfer({
        accountNumber: targetAcc,
        sessionId: sessionId.trim(),
        amountInNaira: numAmount,
        senderName: senderName || verifiedData?.senderName,
      });
    },
    onSuccess: (res) => {
      toast.success(
        res?.message || "Inward deposit successfully reconciled into ledger!",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      if (onSuccess) onSuccess();
      handleClose();
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Failed to reconcile deposit into ledger.",
      );
    },
  });

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId.trim()) {
      toast.error("Please enter a valid SafeHaven Session ID");
      return;
    }
    verifyMutation.mutate(sessionId.trim());
  };

  const isOutward = String(verifiedData?.type || "").toLowerCase() === "outwards";
  const isAlreadyReconciled = Boolean(verifiedData?.isAlreadyReconciled);
  const isDisabled = isOutward || isAlreadyReconciled;

  const effectiveAccountNumber = accountNumber.trim() || verifiedData?.destinationAccountNumber || "";
  const effectiveAmount = Number(amountInNaira) || Number(verifiedData?.amount) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue/10 flex items-center justify-center text-blue">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Reconcile Missed Inward Deposit
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Enter SafeHaven Session ID to auto-verify and credit the local ledger.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleVerifySubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="sessionId" className="text-xs font-semibold text-gray-700">
              SafeHaven Session ID / Reference <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="sessionId"
                placeholder="e.g. 000026260803184720000231556426"
                value={sessionId}
                onChange={(e) => {
                  setSessionId(e.target.value);
                  if (verifiedData) setVerifiedData(null);
                }}
                className="h-9 text-xs font-mono"
                required
              />
              <Button
                type="submit"
                variant="outline"
                disabled={verifyMutation.isPending || !sessionId.trim()}
                className="h-9 text-xs gap-1.5 whitespace-nowrap bg-blue/5 border-blue/20 text-blue hover:bg-blue/10"
              >
                {verifyMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                Verify Deposit
              </Button>
            </div>
          </div>

          {verifiedData?.requiresManualDetails && (
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
                    disabled={isDisabled}
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
                    disabled={isDisabled}
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
                    disabled={isDisabled}
                  />
                </div>
              </div>
            </>
          )}
        </form>

        {/* Live Verified Transfer Card */}
        {verifiedData && (
          <div
            className={`rounded-xl border p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              isDisabled
                ? "border-amber-200 bg-amber-50/50"
                : "border-emerald-200 bg-emerald-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex items-center gap-1.5 text-xs font-bold ${
                  isDisabled ? "text-amber-800" : "text-emerald-700"
                }`}
              >
                <CheckCircle2
                  className={`w-4 h-4 ${
                    isDisabled ? "text-amber-600" : "text-emerald-600"
                  }`}
                />
                <span>
                  {isOutward
                    ? "Outward Transfer Found (View Only)"
                    : isAlreadyReconciled
                      ? "Deposit Already Reconciled"
                      : "Verified Deposit Session"}
                </span>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isDisabled
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {isOutward
                  ? "Outward (Cannot Credit)"
                  : isAlreadyReconciled
                    ? `Reconciled (#${verifiedData.reconciledTransactionId})`
                    : "Ready to Reconcile"}
              </span>
            </div>

            {isOutward && (
              <div className="text-xs text-amber-900 font-medium p-2.5 rounded-lg bg-amber-100/70 border border-amber-200">
                ⚠️ This Session ID belongs to an <strong>OUTWARD transfer</strong> (Money Sent Out). Outward transfers cannot be credited as inward deposits.
              </div>
            )}

            {isAlreadyReconciled && !isOutward && (
              <div className="text-xs text-amber-900 font-medium p-2.5 rounded-lg bg-amber-100/70 border border-amber-200">
                🔒 This deposit has <strong>ALREADY been reconciled</strong> into the database (ID #{verifiedData.reconciledTransactionId}). Re-crediting is blocked to prevent double payout.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div>
                <span className="text-[11px] text-gray-500 block">Amount</span>
                <span className="font-bold text-gray-900 text-sm text-emerald-700">
                  ₦{effectiveAmount ? effectiveAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-gray-500 block">SafeHaven Provider Fee</span>
                <span className="font-semibold text-gray-700 text-xs">
                  ₦{verifiedData?.feeInNaira !== undefined ? Number(verifiedData.feeInNaira).toFixed(2) : "0.00"}
                  <span className="text-[10px] text-gray-400 font-normal ml-1">(Provider Fee)</span>
                </span>
              </div>

              <div>
                <span className="text-[11px] text-gray-500 block">
                  {isOutward ? "Recipient Name" : "Sender Name"}
                </span>
                <span className="font-medium text-gray-800 truncate block">
                  {senderName || verifiedData.senderName || "External Sender"}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-gray-500 block">Target Account</span>
                <span className="font-mono text-gray-800">
                  {effectiveAccountNumber || "Not set"}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-[11px] text-gray-500 block">Session ID</span>
                <span className="font-mono text-gray-800 text-[10px] truncate block" title={sessionId}>
                  {sessionId}
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={reconcileMutation.isPending}
            className="h-9 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              !verifiedData ||
              isDisabled ||
              !effectiveAccountNumber ||
              reconcileMutation.isPending ||
              verifyMutation.isPending
            }
            onClick={() => reconcileMutation.mutate()}
            className="h-9 text-xs bg-blue hover:bg-blue-600 text-white font-semibold px-4"
          >
            {reconcileMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              `Confirm & Credit ₦${effectiveAmount ? effectiveAmount.toLocaleString() : "0"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
