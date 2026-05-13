"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEquityListings, createEquityListing, updateEquityListing, deleteEquityListing,
} from "@/lib/equityService";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MoneyCell } from "@/components/ui/MoneyCell";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const equitySchema = z.object({
  company: z.string().min(1, "Required"),
  sharePrice: z.coerce.number().min(0),
  totalShares: z.coerce.number().min(0),
  availableShares: z.coerce.number().min(0),
  lockInPeriodDays: z.coerce.number().min(0),
  saveboxEligible: z.boolean(),
  status: z.enum(["open", "closed"]),
  valuation: z.coerce.number().optional(),
});

const LIMIT = 20;

export default function EquityListingsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEquity, setEditingEquity] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["equityListings", page],
    queryFn: () => getEquityListings(page, LIMIT),
  });

  const listings: any[] = data?.data ?? [];
  const meta = data?.meta ?? {};

  const form = useForm<z.infer<typeof equitySchema>>({
    resolver: zodResolver(equitySchema) as any,
    defaultValues: {
      company: "", sharePrice: 0, totalShares: 0, availableShares: 0,
      lockInPeriodDays: 0, saveboxEligible: false, status: "open", valuation: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => createEquityListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equityListings"] });
      toast.success("Listing created.");
      setIsFormOpen(false);
      form.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => updateEquityListing(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equityListings"] });
      toast.success("Listing updated.");
      setEditingEquity(null);
      setIsFormOpen(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEquityListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equityListings"] });
      toast.success("Listing deleted.");
      setDeletingId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to delete."),
  });

  const openEdit = (eq: any) => {
    setEditingEquity(eq);
    form.reset({
      company: eq.company, sharePrice: eq.sharePrice ?? 0,
      totalShares: eq.totalShares ?? 0, availableShares: eq.availableShares ?? 0,
      lockInPeriodDays: eq.lockInPeriodDays ?? 0, saveboxEligible: !!eq.saveboxEligible,
      status: eq.status ?? "open", valuation: eq.valuation,
    });
    setIsFormOpen(true);
  };

  const openCreate = () => {
    setEditingEquity(null);
    form.reset();
    setIsFormOpen(true);
  };

  const columns: Column[] = [
    { key: "company", header: "Company", className: "font-medium text-sm" },
    { key: "status", header: "Status", render: (v) => <StatusBadge status={v} /> },
    {
      key: "sharePrice",
      header: "Share Price",
      headerClassName: "text-right",
      render: (v) => <div className="text-right"><MoneyCell kobo={v} /></div>,
    },
    {
      key: "totalShares",
      header: "Total Shares",
      className: "font-mono text-sm text-right",
      headerClassName: "text-right",
    },
    {
      key: "availableShares",
      header: "Available",
      className: "font-mono text-sm text-right",
      headerClassName: "text-right",
    },
    {
      key: "lockInPeriodDays",
      header: "Lock-in",
      render: (v) => v ? `${v}d` : "—",
    },
    {
      key: "saveboxEligible",
      header: "Savebox",
      render: (v) => (
        <Badge variant="outline" className={v ? "text-greeny border-greeny/30 bg-greeny/5 text-xs" : "text-gray-400 border-gray-200 text-xs"}>
          {v ? "Yes" : "No"}
        </Badge>
      ),
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
        title="Equity Listings"
        subtitle="Manage all equity listings. Valuation changes auto-create history entries."
        actions={
          <Button className="bg-blue hover:bg-darkBlue text-white gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Listing
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={listings}
          loading={isLoading}
          rowKey={(r) => r.id}
          pagination={{ mode: "1-based", page, totalPages: meta.totalPages ?? 1, total: meta.total, onPageChange: setPage }}
        />
      </div>

      <Dialog open={isFormOpen} onOpenChange={(v) => { if (!v) { setIsFormOpen(false); setEditingEquity(null); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEquity ? "Edit Equity Listing" : "New Equity Listing"}</DialogTitle>
          </DialogHeader>
          {editingEquity && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Updating sharePrice, valuation, mrr, or arr will automatically create a valuation history entry.
            </p>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => {
              if (editingEquity) updateMutation.mutate({ id: editingEquity.id, data: v });
              else createMutation.mutate(v);
            })} className="space-y-4 pt-1">
              <FormField control={form.control} name="company" render={({ field }) => (
                <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="sharePrice" render={({ field }) => (
                  <FormItem><FormLabel>Share Price (kobo)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="valuation" render={({ field }) => (
                  <FormItem><FormLabel>Valuation (kobo)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="totalShares" render={({ field }) => (
                  <FormItem><FormLabel>Total Shares</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="availableShares" render={({ field }) => (
                  <FormItem><FormLabel>Available Shares</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="lockInPeriodDays" render={({ field }) => (
                  <FormItem><FormLabel>Lock-in Period (days)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" {...field}>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                    </select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="saveboxEligible" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel>Savebox Eligible</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <Button type="submit" className="w-full bg-blue text-white" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingEquity ? "Save Changes" : "Create Listing"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={deletingId !== null}
        onOpenChange={(v) => !v && setDeletingId(null)}
        title="Delete Equity Listing"
        danger confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deletingId!)}
      />
    </div>
  );
}
