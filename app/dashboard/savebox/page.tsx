"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSaveboxConfigs, createSaveboxConfig, updateSaveboxConfig, deleteSaveboxConfig,
} from "@/lib/saveboxService";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
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

const configSchema = z.object({
  type: z.string().min(1, "Required"),
  duration: z.coerce.number().min(1),
  interestRate: z.coerce.number().min(0).max(100),
  upfrontRate: z.coerce.number().min(0).max(100),
  spreadRate: z.coerce.number().min(0).max(100),
});

export default function SaveboxConfigPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: configsRaw, isLoading } = useQuery({
    queryKey: ["saveboxConfigs"],
    queryFn: getSaveboxConfigs,
  });

  const configs: any[] = Array.isArray(configsRaw) ? configsRaw : configsRaw?.data ?? [];

  const form = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema) as any,
    defaultValues: { type: "", duration: 30, interestRate: 0, upfrontRate: 0, spreadRate: 0 },
  });

  const createMutation = useMutation({
    mutationFn: (v: z.infer<typeof configSchema>) => createSaveboxConfig(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saveboxConfigs"] });
      toast.success("Config created.");
      setIsFormOpen(false);
      form.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => updateSaveboxConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saveboxConfigs"] });
      toast.success("Config updated.");
      setEditingConfig(null);
      setIsFormOpen(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSaveboxConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saveboxConfigs"] });
      toast.success("Config deleted.");
      setDeletingId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to delete."),
  });

  const openCreate = () => { setEditingConfig(null); form.reset(); setIsFormOpen(true); };
  const openEdit = (c: any) => {
    setEditingConfig(c);
    form.reset({ type: c.type, duration: c.duration, interestRate: c.interestRate, upfrontRate: c.upfrontRate, spreadRate: c.spreadRate });
    setIsFormOpen(true);
  };

  const columns: Column[] = [
    { key: "type", header: "Type", className: "font-medium text-sm" },
    { key: "duration", header: "Duration (months)", className: "font-mono text-sm" },
    { key: "interestRate", header: "Interest Rate", render: (v) => `${v}%` },
    { key: "upfrontRate", header: "Upfront Rate", render: (v) => `${v}%` },
    { key: "spreadRate", header: "Spread Rate", render: (v) => `${v}%` },
    {
      key: "adminId",
      header: "Admin",
      render: (v) => v ? `Admin #${v}` : "—",
    },
    {
      key: "createdAt",
      header: "Created",
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
        title="Savebox Configurations"
        subtitle="Manage interest rates and duration settings for saveboxes."
        actions={
          <Button className="bg-blue hover:bg-darkBlue text-white gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Config
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <DataTable columns={columns} data={configs} loading={isLoading} rowKey={(r) => r.id} />
      </div>

      <Dialog open={isFormOpen} onOpenChange={(v) => { if (!v) { setIsFormOpen(false); setEditingConfig(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingConfig ? "Edit Config" : "New Savebox Config"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => {
              if (editingConfig) updateMutation.mutate({ id: editingConfig.id, data: v });
              else createMutation.mutate(v);
            })} className="space-y-4 pt-1">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Type</FormLabel><FormControl><Input placeholder="e.g. FLEXIBLE, FIXED" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="duration" render={({ field }) => (
                  <FormItem><FormLabel>Duration (months)</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="interestRate" render={({ field }) => (
                  <FormItem><FormLabel>Interest Rate (%)</FormLabel><FormControl><Input type="number" step="0.01" min={0} max={100} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="upfrontRate" render={({ field }) => (
                  <FormItem><FormLabel>Upfront Rate (%)</FormLabel><FormControl><Input type="number" step="0.01" min={0} max={100} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="spreadRate" render={({ field }) => (
                  <FormItem><FormLabel>Spread Rate (%)</FormLabel><FormControl><Input type="number" step="0.01" min={0} max={100} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <Button type="submit" className="w-full bg-blue text-white" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingConfig ? "Save Changes" : "Create Config"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={deletingId !== null}
        onOpenChange={(v) => !v && setDeletingId(null)}
        title="Delete Savebox Config"
        message="This config will be permanently deleted."
        danger
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deletingId!)}
      />
    </div>
  );
}
