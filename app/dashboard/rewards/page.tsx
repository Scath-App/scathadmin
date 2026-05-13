"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendRewards } from "@/lib/rewardsService";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyCell } from "@/components/ui/MoneyCell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function RewardsPage() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<any>(null);

  const sendMutation = useMutation({
    mutationFn: () =>
      sendRewards(Number(userId), Number(amount), description.trim() || undefined),
    onSuccess: (res: any) => {
      setResult(res);
      setUserId("");
      setAmount("");
      setDescription("");
      toast.success("Rewards sent successfully.");
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message ?? "Failed to send rewards.");
    },
  });

  const isValid = userId.trim() && Number(amount) >= 1;

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Rewards"
        subtitle="Send reward tokens directly to a user's account."
      />

      {/* No list endpoint — show empty state + send panel */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <EmptyState
          icon={Gift}
          title="No rewards history"
          message="Reward transactions are not listed here. Use the panel below to send rewards to a specific user."
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5 max-w-lg">
        <div>
          <h3 className="font-semibold text-gray-900 mb-0.5">Send Rewards to User</h3>
          <p className="text-sm text-gray-500">The user will receive this amount as a reward transaction.</p>
        </div>

        {result && (
          <div className="rounded-xl bg-greeny/5 border border-greeny/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-greeny" />
              <p className="font-semibold text-greeny">Rewards Sent</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Transaction ID</p>
                <p className="font-mono text-xs">{result.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Amount</p>
                <MoneyCell kobo={result.amount} />
              </div>
              <div>
                <p className="text-xs text-gray-400">Type</p>
                <p>{result.type ?? "REWARD"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Reference</p>
                <p className="font-mono text-xs truncate">{result.reference}</p>
              </div>
              {result.description && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400">Description</p>
                  <p className="text-sm">{result.description}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-xs text-gray-400">Created At</p>
                <p className="text-sm">{result.createdAt ? format(new Date(result.createdAt), "dd MMM yyyy, HH:mm:ss") : "—"}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="w-full" onClick={() => setResult(null)}>
              Send Another
            </Button>
          </div>
        )}

        {!result && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">User ID <span className="text-red">*</span></label>
              <Input type="number" placeholder="e.g. 42" value={userId} onChange={(e) => setUserId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Amount <span className="text-red">*</span> (min 1)</label>
              <Input type="number" min={1} placeholder="e.g. 500" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Description (optional)</label>
              <Input placeholder="Reward reason..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <Button
              className="w-full bg-blue text-white"
              disabled={!isValid || sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
            >
              {sendMutation.isPending ? "Sending..." : "Send Rewards"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
