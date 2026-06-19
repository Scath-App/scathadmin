"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getReferralSettings, updateReferralSettings,
} from "@/lib/mixedService";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoIcon, Lock } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";

export default function ReferralPage() {
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
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Update failed."),
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

  const field = (key: string, label: string, type: "number" | "toggle", readOnly = false, tooltip?: string) => (
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
          <p className="text-sm font-mono text-gray-400 text-right">{settings[key] ?? 0}</p>
        ) : type === "toggle" ? (
          editing ? (
            <div className="flex justify-end">
              <Switch
                checked={!!form[key]}
                onCheckedChange={(v) => setForm((prev: any) => ({ ...prev, [key]: v }))}
              />
            </div>
          ) : (
            <p className="text-sm text-right">{settings[key] ? "Yes" : "No"}</p>
          )
        ) : (
          editing ? (
            <Input
              type="number"
              value={form[key] ?? 0}
              onChange={(e) => setForm((prev: any) => ({ ...prev, [key]: Number(e.target.value) }))}
              className="text-right"
            />
          ) : (
            <p className="text-sm font-mono text-right">{settings[key] ?? 0}</p>
          )
        )}
      </div>
    </div>
  );



  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Referral Settings"
        subtitle="Configure the platform referral program."
        actions={
          editing ? (
            <div className="flex gap-2">
              <Button variant="outline" className="border-gray-200" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button className="bg-blue text-white" disabled={updateMutation.isPending} onClick={handleSave}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <Button className="bg-blue text-white" onClick={startEdit}>Edit Settings</Button>
          )
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm max-w-2xl">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Referral Configuration</h3>
        </div>
        <div className="px-6">
          {field("referrerBonusAmount", "Referrer Bonus Amount", "number")}
          {field("kycRequired", "KYC Required", "toggle")}
          {field("isActive", "Program Active", "toggle")}
          {field("maxReferralsPerUser", "Max Referrals Per User", "number")}
        </div>
      </div>
    </div>
  );
}
