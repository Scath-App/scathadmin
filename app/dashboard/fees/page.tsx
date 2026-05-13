"use client";

import { useState, useOptimistic } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFees, toggleFee, updateFee, initializeFees } from "@/lib/financeService";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { MoneyCell } from "@/components/ui/MoneyCell";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Edit, Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

const tierSchema = z.object({
  minAmountInKobo: z.coerce.number().min(0),
  maxAmountInKobo: z.coerce.number().min(0),
  feeInKobo: z.coerce.number().min(0),
});

const feeFormSchema = z.object({
  serviceType: z.string().min(1),
  subType: z.string().optional(),
  feeType: z.enum(["FLAT", "PERCENTAGE", "TIERED"]),
  platformMarkupInKobo: z.coerce.number().min(0),
  tiers: z.array(tierSchema).optional(),
});

export default function FeeConfigPage() {
  const queryClient = useQueryClient();
  const [editingFee, setEditingFee] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInitOpen, setIsInitOpen] = useState(false);
  const [initMarkup, setInitMarkup] = useState("1000");

  const { data: feesRaw, isLoading } = useQuery({
    queryKey: ["fees"],
    queryFn: getFees,
  });

  const fees: any[] = Array.isArray(feesRaw) ? feesRaw : feesRaw?.data ?? [];

  const initMutation = useMutation({
    mutationFn: (markup: number) => initializeFees(markup),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      toast.success("SafeHaven fees initialized.");
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
      toast.error("Failed to toggle fee.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["fees"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => updateFee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      toast.success("Fee updated.");
      setEditingFee(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Update failed."),
  });

  const form = useForm<z.infer<typeof feeFormSchema>>({
    resolver: zodResolver(feeFormSchema) as any,
    defaultValues: { serviceType: "", subType: "", feeType: "FLAT", platformMarkupInKobo: 0, tiers: [] },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "tiers" });
  const feeType = form.watch("feeType");

  const openEdit = (fee: any) => {
    setEditingFee(fee);
    form.reset({
      serviceType: fee.serviceType ?? "",
      subType: fee.subType ?? "",
      feeType: fee.feeType ?? "FLAT",
      platformMarkupInKobo: fee.platformMarkupInKobo ?? 0,
      tiers: fee.tiers ?? [],
    });
  };

  const columns: Column[] = [
    { key: "serviceType", header: "Service Type", className: "font-medium text-sm" },
    { key: "subType", header: "Sub Type", className: "text-sm text-gray-500", render: (v) => v ?? "—" },
    {
      key: "feeType",
      header: "Fee Type",
      render: (v) => <Badge variant="outline" className="text-xs border-blue/20 text-blue">{v}</Badge>,
    },
    {
      key: "platformMarkupInKobo",
      header: "Platform Markup",
      headerClassName: "text-right",
      render: (v) => <div className="text-right"><MoneyCell kobo={v} /></div>,
    },
    {
      key: "isActive",
      header: "Active",
      render: (v, row) => (
        <Switch
          checked={!!v}
          onCheckedChange={() => toggleMutation.mutate(row.id)}
          disabled={toggleMutation.isPending}
        />
      ),
    },
    {
      key: "id",
      header: "Actions",
      headerClassName: "text-right",
      render: (id, row) => (
        <div className="text-right">
          <Button size="sm" variant="ghost" className="text-blue hover:bg-blue/10" onClick={() => openEdit(row)}>
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const TiersBuilder = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Tiers</label>
        <Button type="button" size="sm" variant="outline" onClick={() => append({ minAmountInKobo: 0, maxAmountInKobo: 0, feeInKobo: 0 })}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Tier
        </Button>
      </div>
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-4 gap-2 items-end">
          <FormField control={form.control} name={`tiers.${index}.minAmountInKobo`} render={({ field }) => (
            <FormItem><FormLabel className="text-xs">Min (kobo)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name={`tiers.${index}.maxAmountInKobo`} render={({ field }) => (
            <FormItem><FormLabel className="text-xs">Max (kobo)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name={`tiers.${index}.feeInKobo`} render={({ field }) => (
            <FormItem><FormLabel className="text-xs">Fee (kobo)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
          )} />
          <Button type="button" size="sm" variant="ghost" className="text-red h-9" onClick={() => remove(index)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Fee Configurations"
        subtitle="Manage platform fee structures and markup settings."
        actions={
          <>
            <Button variant="outline" className="border-gray-200 gap-2" onClick={() => setIsInitOpen(true)}>
              <Zap className="w-4 h-4" /> Init SafeHaven Fees
            </Button>
            <Button className="bg-blue hover:bg-darkBlue text-white gap-2" onClick={() => { setEditingFee(null); form.reset(); setIsCreateOpen(true); }}>
              <Plus className="w-4 h-4" /> New Fee Config
            </Button>
          </>
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <DataTable columns={columns} data={fees} loading={isLoading} rowKey={(r) => r.id} />
      </div>

      {/* Init confirmation */}
      <Dialog open={isInitOpen} onOpenChange={setIsInitOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Initialize SafeHaven Fees</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">This will create default fee configurations from SafeHaven's fee structure.</p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Default Platform Markup (kobo)</label>
            <Input type="number" value={initMarkup} onChange={(e) => setInitMarkup(e.target.value)} />
            <p className="text-xs text-gray-400">{Number(initMarkup) / 100} naira per transaction</p>
          </div>
          <Button
            className="w-full bg-blue text-white"
            disabled={initMutation.isPending}
            onClick={() => initMutation.mutate(Number(initMarkup))}
          >
            {initMutation.isPending ? "Initializing..." : "Confirm Initialize"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Edit / Create fee modal */}
      <Dialog open={!!(editingFee || isCreateOpen)} onOpenChange={(v) => { if (!v) { setEditingFee(null); setIsCreateOpen(false); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFee ? "Edit Fee Configuration" : "New Fee Configuration"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => {
              if (editingFee) {
                updateMutation.mutate({ id: editingFee.id, data: v });
              } else {
                toast.info("Create fee config via API — endpoint documented as POST /admin/fees");
              }
            })} className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="serviceType" render={({ field }) => (
                  <FormItem><FormLabel>Service Type</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="subType" render={({ field }) => (
                  <FormItem><FormLabel>Sub Type</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="feeType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="FLAT">Flat</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="TIERED">Tiered</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="platformMarkupInKobo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform Markup (kobo)</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {feeType === "TIERED" && <TiersBuilder />}
              <Button type="submit" className="w-full bg-blue text-white" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : editingFee ? "Save Changes" : "Create Fee Config"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
