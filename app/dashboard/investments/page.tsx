"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOpportunities, createOpportunity, updateOpportunity, deleteOpportunity,
} from "@/lib/mixedService";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MoneyCell } from "@/components/ui/MoneyCell";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/button";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const oppSchema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
  minAmountInKobo: z.coerce.number().min(0),
  maxAmountInKobo: z.coerce.number().min(0),
  fundingGoalInKobo: z.coerce.number().min(0),
  roiPercentage: z.coerce.number().min(0).max(100),
  durationInDays: z.coerce.number().min(1),
  status: z.enum(["open", "closed", "funded"]),
});

export default function InvestmentsPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: oppsRaw, isLoading } = useQuery({
    queryKey: ["opportunities"],
    queryFn: getOpportunities,
  });

  const opps: any[] = Array.isArray(oppsRaw) ? oppsRaw : oppsRaw?.data ?? [];

  const form = useForm<z.infer<typeof oppSchema>>({
    resolver: zodResolver(oppSchema) as any,
    defaultValues: {
      name: "", description: "",
      minAmountInKobo: 0, maxAmountInKobo: 0, fundingGoalInKobo: 0,
      roiPercentage: 0, durationInDays: 30, status: "open",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof oppSchema>) => createOpportunity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Opportunity created.");
      setIsFormOpen(false);
      form.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => updateOpportunity(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Opportunity updated.");
      setEditingOpp(null);
      setIsFormOpen(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteOpportunity(id),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success(res?.message ?? "Opportunity deleted.");
      setDeletingId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to delete."),
  });

  const openCreate = () => {
    setEditingOpp(null);
    form.reset();
    setIsFormOpen(true);
  };

  const openEdit = (opp: any) => {
    setEditingOpp(opp);
    form.reset({
      name: opp.name, description: opp.description ?? "",
      minAmountInKobo: opp.minAmountInKobo ?? 0,
      maxAmountInKobo: opp.maxAmountInKobo ?? 0,
      fundingGoalInKobo: opp.fundingGoalInKobo ?? 0,
      roiPercentage: opp.roiPercentage ?? 0,
      durationInDays: opp.durationInDays ?? 30,
      status: opp.status ?? "open",
    });
    setIsFormOpen(true);
  };

  const columns: Column[] = [
    { key: "name", header: "Name", className: "font-medium text-sm" },
    {
      key: "minAmountInKobo",
      header: "Min Amount",
      headerClassName: "text-right",
      render: (v) => <div className="text-right"><MoneyCell kobo={v} /></div>,
    },
    {
      key: "maxAmountInKobo",
      header: "Max Amount",
      headerClassName: "text-right",
      render: (v) => <div className="text-right"><MoneyCell kobo={v} /></div>,
    },
    {
      key: "fundingGoalInKobo",
      header: "Funding Goal",
      headerClassName: "text-right",
      render: (v) => <div className="text-right"><MoneyCell kobo={v} /></div>,
    },
    {
      key: "totalInvestedInKobo",
      header: "Total Invested",
      headerClassName: "text-right",
      render: (v) => <div className="text-right"><MoneyCell kobo={v ?? 0} /></div>,
    },
    { key: "roiPercentage", header: "ROI %", className: "font-mono text-sm", render: (v) => `${v ?? 0}%` },
    { key: "durationInDays", header: "Duration", render: (v) => `${v}d` },
    { key: "status", header: "Status", render: (v) => <StatusBadge status={v} /> },
    {
      key: "startDate",
      header: "Start",
      render: (v) => v ? format(new Date(v), "dd MMM yyyy") : "—",
    },
    {
      key: "id",
      header: "Actions",
      headerClassName: "text-right",
      render: (id, row) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" className="text-blue hover:bg-blue/5" onClick={() => openEdit(row)}>
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="text-red hover:bg-red/5" onClick={() => setDeletingId(id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Investment Opportunities"
        subtitle="Manage all available investment opportunities on the platform."
        actions={
          <Button className="bg-blue hover:bg-darkBlue text-white gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Opportunity
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <DataTable columns={columns} data={opps} loading={isLoading} rowKey={(r) => r.id} />
      </div>

      {/* Create / Edit modal */}
      <Dialog open={isFormOpen} onOpenChange={(v) => { if (!v) { setIsFormOpen(false); setEditingOpp(null); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOpp ? "Edit Opportunity" : "New Opportunity"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => {
              if (editingOpp) updateMutation.mutate({ id: editingOpp.id, data: v });
              else createMutation.mutate(v);
            })} className="space-y-4 pt-1">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="minAmountInKobo" render={({ field }) => (
                  <FormItem><FormLabel>Min Amount (kobo)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="maxAmountInKobo" render={({ field }) => (
                  <FormItem><FormLabel>Max Amount (kobo)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="fundingGoalInKobo" render={({ field }) => (
                  <FormItem><FormLabel>Funding Goal (kobo)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="roiPercentage" render={({ field }) => (
                  <FormItem><FormLabel>ROI %</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="durationInDays" render={({ field }) => (
                  <FormItem><FormLabel>Duration (days)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="funded">Funded</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <Button type="submit" className="w-full bg-blue text-white" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingOpp ? "Save Changes" : "Create Opportunity"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmModal
        open={deletingId !== null}
        onOpenChange={(v) => !v && setDeletingId(null)}
        title="Delete Opportunity"
        message="This will permanently delete this investment opportunity."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deletingId!)}
      />
    </div>
  );
}
