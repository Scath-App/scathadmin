"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFees, toggleFee, updateFee, initializeFees, createFee } from "@/lib/financeService";
import { PageHeader } from "@/components/ui/PageHeader";
import { MoneyCell } from "@/components/ui/MoneyCell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Edit, Plus, Trash2, Zap, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Schema ──────────────────────────────────────────────────────────────────

const tierSchema = z.object({
  minAmount: z.coerce.number().min(0),
  maxAmount: z.coerce.number().min(0),
  fee: z.coerce.number().min(0),
});

const feeFormSchema = z.object({
  serviceType: z.string().min(1, "Service type is required"),
  subType: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
  feeType: z.enum(["FIXED", "PERCENTAGE", "TIERED"]),
  fixedAmount: z.coerce.number().min(0).optional(),
  percentageRate: z.coerce.number().min(0).optional(),
  platformMarkup: z.coerce.number().min(0).optional(),
  platformMarkupPercentage: z.coerce.number().min(0).optional(),
  platformDiscountPercentage: z.coerce.number().min(0).optional(),
  providerVatPercentage: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
  tiers: z.array(tierSchema).optional(),
}).superRefine((data, ctx) => {
  const st = data.serviceType;
  if (st === "VERIFICATION" || st === "CABLE_TV" || st === "UTILITY") {
    if (!data.subType?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Sub Type is required for this service", path: ["subType"] });
    }
  } else if (st === "AIRTIME" || st === "DATA") {
    if (!data.isDefault && !data.subType?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Sub Type is required unless set as Generic Default", path: ["subType"] });
    }
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SERVICE_TYPES = [
  { value: "INTERBANK_TRANSFER", label: "Interbank Transfer" },
  { value: "WALLET_TRANSFER",    label: "Wallet Transfer" },
  { value: "VERIFICATION",       label: "Verification" },
  { value: "AIRTIME",            label: "Airtime" },
  { value: "DATA",               label: "Data" },
  { value: "CABLE_TV",           label: "Cable TV" },
  { value: "UTILITY",            label: "Utility" },
];

const FEE_TYPE_COLORS: Record<string, string> = {
  FIXED:      "bg-blue-50 text-blue-700 border-blue-200",
  PERCENTAGE: "bg-violet-50 text-violet-700 border-violet-200",
  TIERED:     "bg-amber-50 text-amber-700 border-amber-200",
};

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
        <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="text-sm text-gray-700 font-medium">{value || "—"}</span>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FeeConfigPage() {
  const queryClient = useQueryClient();
  const [editingFee, setEditingFee] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInitOpen, setIsInitOpen] = useState(false);
  const [initMarkup, setInitMarkup] = useState("10");

  const { data: feesRaw, isLoading } = useQuery({
    queryKey: ["fees"],
    queryFn: getFees,
  });

  const fees: any[] = Array.isArray(feesRaw) ? feesRaw : feesRaw?.data ?? [];

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const initMutation = useMutation({
    mutationFn: (markup: number) => initializeFees(markup),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      toast.success("SafeHaven fees initialized successfully.");
      setIsInitOpen(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Initialization failed."),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => toggleFee(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["fees"] });
      const prev = queryClient.getQueryData(["fees"]);
      queryClient.setQueryData(["fees"], (old: any) => {
        const list = Array.isArray(old) ? old : old?.data ?? [];
        const updated = list.map((f: any) => f.id === id ? { ...f, isActive: !f.isActive } : f);
        return Array.isArray(old) ? updated : { ...old, data: updated };
      });
      return { prev };
    },
    onError: (_e, _id, ctx: any) => {
      queryClient.setQueryData(["fees"], ctx?.prev);
      toast.error("Failed to toggle fee status.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["fees"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => updateFee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      toast.success("Fee configuration updated.");
      setEditingFee(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Update failed."),
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => createFee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      toast.success("Fee configuration created.");
      setIsCreateOpen(false);
      form.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Creation failed."),
  });

  // ─── Form ───────────────────────────────────────────────────────────────────

  const form = useForm<z.infer<typeof feeFormSchema>>({
    resolver: zodResolver(feeFormSchema) as any,
    defaultValues: { 
      serviceType: "", subType: "", isDefault: false, feeType: "FIXED", 
      fixedAmount: 0, percentageRate: 0, platformMarkup: 0, platformMarkupPercentage: 0,
      platformDiscountPercentage: 0, providerVatPercentage: 0, description: "", tiers: [] 
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "tiers" });
  const feeType = form.watch("feeType");
  const serviceType = form.watch("serviceType");
  const isDefault = form.watch("isDefault");

  const isSubTypeRequired =
    serviceType === "VERIFICATION" || serviceType === "CABLE_TV" || serviceType === "UTILITY" ||
    ((serviceType === "AIRTIME" || serviceType === "DATA") && !isDefault);

  const showSubType =
    serviceType &&
    serviceType !== "INTERBANK_TRANSFER" &&
    serviceType !== "WALLET_TRANSFER";

  const showIsDefault = !editingFee && (serviceType === "AIRTIME" || serviceType === "DATA");

  const openEdit = (fee: any) => {
    setEditingFee(fee);
    form.reset({
      serviceType: fee.serviceType ?? "",
      subType: fee.serviceSubType ?? "",
      isDefault: fee.isDefault ?? false,
      feeType: fee.feeType ?? "FIXED",
      fixedAmount: (fee.fixedAmountInKobo ?? 0) / 100,
      percentageRate: fee.percentageRate ?? 0,
      platformMarkup: (fee.platformMarkupInKobo ?? 0) / 100,
      platformMarkupPercentage: fee.platformMarkupPercentage ?? 0,
      platformDiscountPercentage: fee.platformDiscountPercentage ?? 0,
      providerVatPercentage: fee.providerVatPercentage ?? 0,
      description: fee.description ?? "",
      tiers: (fee.tiers ?? []).map((t: any) => ({
        minAmount: (t.minAmountInKobo ?? 0) / 100,
        maxAmount: (t.maxAmountInKobo ?? 0) / 100,
        fee: (t.feeInKobo ?? 0) / 100,
      })),
    });
  };

  const closeModal = () => {
    setEditingFee(null);
    setIsCreateOpen(false);
    form.reset();
  };

  const onSubmit = (v: z.infer<typeof feeFormSchema>) => {
    const payload: any = {
      feeType: v.feeType,
      fixedAmountInKobo: Math.round((v.fixedAmount || 0) * 100),
      percentageRate: v.percentageRate || 0,
      platformMarkupInKobo: Math.round((v.platformMarkup || 0) * 100),
      platformMarkupPercentage: v.platformMarkupPercentage || 0,
      platformDiscountPercentage: v.platformDiscountPercentage || 0,
      providerVatPercentage: v.providerVatPercentage || 0,
      description: v.description || "",
      ...(v.tiers?.length ? {
        tiers: v.tiers.map(t => ({
          minAmountInKobo: Math.round(t.minAmount * 100),
          maxAmountInKobo: Math.round(t.maxAmount * 100),
          feeInKobo: Math.round(t.fee * 100),
        }))
      } : {}),
    };

    if (!editingFee) {
      payload.serviceType = v.serviceType;
      if (v.subType?.trim() && v.serviceType !== "INTERBANK_TRANSFER" && v.serviceType !== "WALLET_TRANSFER") {
        payload.serviceSubType = v.subType.trim();
      }
      if (v.isDefault) payload.isDefault = true;
    }

    if (editingFee) {
      updateMutation.mutate({ id: editingFee.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // ─── Fee list row ────────────────────────────────────────────────────────────

  const FeeRow = ({ fee }: { fee: any }) => {
    const isProviderDiscount = fee.providerDiscountRevenueEnabled || fee.pricingModel?.includes("PROVIDER_DISCOUNT");

    return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group border-b border-gray-100 last:border-0">
      {/* Identity */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 truncate">
            {fee.displayName || fee.serviceSubType || "Default"}
          </span>
          {fee.pricingModel && fee.pricingModel !== "CUSTOMER_FEE_ONLY" && (
            <Badge variant="secondary" className="shrink-0 text-[10px] font-medium tracking-wide bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 uppercase">
              {fee.pricingModel.replace(/_/g, " ")}
            </Badge>
          )}
          {fee.isDefault && (
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
              Default
            </span>
          )}
        </div>
        {fee.adminSummary && (
          <p className="text-[11.5px] text-gray-500 mt-1 line-clamp-2 leading-snug">
            {fee.adminSummary}
          </p>
        )}
      </div>

      {/* Fee type */}
      <div className="hidden sm:block shrink-0 w-24">
        <Badge variant="outline" className={cn("text-xs font-medium", FEE_TYPE_COLORS[fee.feeType] ?? "")}>
          {fee.feeType}
        </Badge>
      </div>

      {/* Revenue */}
      <div className="shrink-0 sm:text-right hidden sm:block w-32">
        {isProviderDiscount ? (
          <>
            <p className="text-xs text-gray-400 mb-0.5">Discount Rev</p>
            <p className="text-sm font-medium text-green-600">{fee.providerDiscountPercentage ?? 0}%</p>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-0.5">Markup</p>
            {(fee.platformMarkupPercentage && fee.platformMarkupPercentage > 0) ? (
              <p className="text-sm font-medium text-gray-700">{fee.platformMarkupPercentage}%</p>
            ) : (
              <MoneyCell kobo={fee.platformMarkupInKobo} className="text-sm font-medium text-gray-700" />
            )}
          </>
        )}
      </div>

      {/* Active toggle */}
      <div className="shrink-0 flex items-center gap-2">
        <Switch
          checked={!!fee.isActive}
          onCheckedChange={() => toggleMutation.mutate(fee.id)}
          disabled={toggleMutation.isPending}
        />
        <span className={cn(
          "text-xs font-medium hidden sm:block",
          fee.isActive ? "text-green-600" : "text-gray-400"
        )}>
          {fee.isActive ? "Active" : "Off"}
        </span>
      </div>

      {/* Edit */}
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 shrink-0 text-gray-300 hover:text-blue hover:bg-blue/10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => openEdit(fee)}
      >
        <Edit className="w-3.5 h-3.5" />
      </Button>
    </div>
    );
  };

  // ─── Grouped by serviceType ───────────────────────────────────────────────

  const grouped = fees.reduce<Record<string, any[]>>((acc, fee) => {
    const key = fee.serviceType ?? "OTHER";
    if (!acc[key]) acc[key] = [];
    acc[key].push(fee);
    return acc;
  }, {});

  const SERVICE_TYPE_LABELS: Record<string, string> = {
    INTERBANK_TRANSFER: "Interbank Transfer",
    WALLET_TRANSFER:    "Wallet Transfer",
    VERIFICATION:       "Verification",
    AIRTIME:            "Airtime",
    DATA:               "Data",
    CABLE_TV:           "Cable TV",
    UTILITY:            "Utility",
  };

  // ─── Tiers builder ──────────────────────────────────────────────────────────

  const TiersBuilder = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">Fee Tiers</p>
          <p className="text-xs text-gray-500">Define amount ranges and their corresponding fees</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5"
          onClick={() => append({ minAmount: 0, maxAmount: 0, fee: 0 })}
        >
          <Plus className="w-3 h-3" /> Add Tier
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400">
          No tiers yet. Click "Add Tier" to begin.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 px-1">
            <p className="text-xs font-medium text-gray-500">Min Amount (₦)</p>
            <p className="text-xs font-medium text-gray-500">Max Amount (₦)</p>
            <p className="text-xs font-medium text-gray-500">Fee (₦)</p>
            <span />
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 items-start">
              <FormField control={form.control} name={`tiers.${index}.minAmount`} render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormControl><Input type="number" min={0} className="h-9 text-sm" {...field} /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )} />
              <FormField control={form.control} name={`tiers.${index}.maxAmount`} render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormControl><Input type="number" min={0} className="h-9 text-sm" {...field} /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )} />
              <FormField control={form.control} name={`tiers.${index}.fee`} render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormControl><Input type="number" min={0} className="h-9 text-sm" {...field} /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )} />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-9 w-8 p-0 text-gray-400 hover:text-red-500"
                onClick={() => remove(index)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  const isSaving = updateMutation.isPending || createMutation.isPending;

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Fee Configurations"
        subtitle="Manage platform fee structures and markup settings."
        actions={
          <>
            <Button
              variant="outline"
              className="border-gray-200 gap-2 h-9 text-sm"
              onClick={() => setIsInitOpen(true)}
            >
              <Zap className="w-4 h-4 text-amber-500" /> Init SafeHaven Fees
            </Button>
            <Button
              className="bg-blue hover:bg-darkBlue text-white gap-2 h-9 text-sm"
              onClick={() => { setEditingFee(null); form.reset(); setIsCreateOpen(true); }}
            >
              <Plus className="w-4 h-4" /> New Fee Config
            </Button>
          </>
        }
      />

      {/* ── Fee List ── */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
              <div className="h-5 w-10 bg-gray-100 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      ) : fees.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-medium text-gray-500">No fee configurations yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "New Fee Config" or initialize SafeHaven fees to get started.</p>
        </div>
      ) : (
        <Tabs defaultValue={Object.keys(grouped)[0]} className="space-y-4">
          <div className="overflow-x-auto pb-0 scrollbar-none border-b border-gray-100">
            <TabsList className="bg-transparent h-auto p-0 inline-flex space-x-6 min-w-max">
              {Object.keys(grouped).map((serviceType) => (
                <TabsTrigger
                  key={serviceType}
                  value={serviceType}
                  className="group data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue data-[state=active]:border-blue border-b-2 border-transparent rounded-none px-1 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {SERVICE_TYPE_LABELS[serviceType] ?? serviceType}
                  <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full group-data-[state=active]:bg-blue/10 group-data-[state=active]:text-blue">
                    {grouped[serviceType].length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {Object.entries(grouped).map(([serviceType, rows]) => (
            <TabsContent key={serviceType} value={serviceType} className="mt-2 focus-visible:outline-none focus-visible:ring-0">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {SERVICE_TYPE_LABELS[serviceType] ?? serviceType} Configs
                  </span>
                  <span className="text-xs text-gray-400">{rows.length} {rows.length === 1 ? "config" : "configs"}</span>
                </div>
                {rows.map((fee) => <FeeRow key={fee.id} fee={fee} />)}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* ── Init Modal ── */}
      <Dialog open={isInitOpen} onOpenChange={setIsInitOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Initialize SafeHaven Fees
            </DialogTitle>
            <DialogDescription>
              Pulls SafeHaven's default fee structure and creates fee configurations. Existing configs will be updated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 pt-1">
            <label className="text-sm font-medium text-gray-700">
              Default Platform Markup
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">₦</span>
              <Input
                type="number"
                min={0}
                className="pl-7"
                value={initMarkup}
                onChange={(e) => setInitMarkup(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-400">Applied on top of SafeHaven's base fee per transaction.</p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setIsInitOpen(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-blue text-white"
              disabled={initMutation.isPending}
              onClick={() => initMutation.mutate(Number(initMarkup) * 100)}
            >
              {initMutation.isPending ? "Initializing…" : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Modal ── */}
      <Dialog open={!!(editingFee || isCreateOpen)} onOpenChange={(v) => { if (!v) closeModal(); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFee ? "Edit Fee Configuration" : "New Fee Configuration"}
            </DialogTitle>
            {editingFee && (
              <DialogDescription>
                Service identity is locked after creation. You can only update fee amounts and markup.
              </DialogDescription>
            )}
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-1">

              {/* ── Identity (read-only on edit) ── */}
              {editingFee ? (
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Identity (read-only)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <ReadOnlyField label="Service Type" value={editingFee.serviceType} />
                    <ReadOnlyField label="Sub Type" value={editingFee.serviceSubType || (editingFee.isDefault ? "Default (Generic)" : "—")} />
                  </div>
                  {editingFee.configKey && (
                    <ReadOnlyField label="Config Key" value={editingFee.configKey} />
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Service Type Select */}
                    <FormField control={form.control} name="serviceType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={(val) => {
                          field.onChange(val);
                          // Reset subType and isDefault when serviceType changes
                          form.setValue("subType", "");
                          form.setValue("isDefault", false);
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a type…" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SERVICE_TYPES.map((st) => (
                              <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Sub Type — conditional */}
                    {showSubType && (
                      <FormField control={form.control} name="subType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Sub Type {isSubTypeRequired && <span className="text-red-500">*</span>}
                            {!isSubTypeRequired && <span className="text-gray-400 text-xs font-normal ml-1">(optional)</span>}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g. MTN, AIRTEL, DSTV…"
                              disabled={isDefault}
                              className={isDefault ? "opacity-50 cursor-not-allowed" : ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                  </div>

                  {/* isDefault toggle — only for AIRTIME / DATA */}
                  {showIsDefault && (
                    <FormField control={form.control} name="isDefault" render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <div>
                          <FormLabel className="text-sm font-semibold text-amber-900">Generic Fallback</FormLabel>
                          <p className="text-xs text-amber-700 mt-0.5">
                            Creates a single default fee for all {serviceType === "AIRTIME" ? "airtime" : "data"} transactions without a specific network match.
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value ?? false}
                            onCheckedChange={(val) => {
                              field.onChange(val);
                              if (val) form.setValue("subType", "");
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )} />
                  )}
                </div>
              )}

              {/* ── Divider ── */}
              <div className="border-t border-gray-100" />

              {/* ── Fee Structure & Revenue ── */}
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Customer Fees</p>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Fee Type */}
                    <FormField control={form.control} name="feeType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fee Type <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="FIXED">Fixed (₦)</SelectItem>
                            <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                            <SelectItem value="TIERED">Tiered</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Conditional Customer Fee */}
                    {feeType === "FIXED" && (
                      <FormField control={form.control} name="fixedAmount" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fixed Amount (₦)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">₦</span>
                              <Input type="number" min={0} step="0.01" className="pl-7" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                    {feeType === "PERCENTAGE" && (
                      <FormField control={form.control} name="percentageRate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Percentage Rate (%)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" min={0} step="0.01" className="pr-7" {...field} />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">%</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                  </div>
                </div>

                {/* Tiers — only when TIERED */}
                {feeType === "TIERED" && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <TiersBuilder />
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Platform Revenue (Markup)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="platformMarkup" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Markup (₦)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">₦</span>
                            <Input type="number" min={0} step="0.01" className="pl-7" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <FormField control={form.control} name="platformMarkupPercentage" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Markup (%)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="number" min={0} step="0.01" className="pr-7" {...field} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">%</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
                
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Provider Settings (VAS)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="platformDiscountPercentage" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Revenue (%)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="number" min={0} step="0.01" className="pr-7" {...field} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">%</span>
                          </div>
                        </FormControl>
                        <p className="text-[10px] text-gray-500">Platform earnings from provider discount.</p>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="providerVatPercentage" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider VAT (%)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="number" min={0} step="0.01" className="pr-7" {...field} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">%</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional note about this fee configuration" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

              </div>

              {/* ── Actions ── */}
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-blue text-white" disabled={isSaving}>
                  {isSaving ? "Saving…" : editingFee ? "Save Changes" : "Create Fee Config"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
