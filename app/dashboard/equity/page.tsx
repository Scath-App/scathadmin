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
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Edit, Trash2, TrendingUp, Lock } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";

// ─── Schemas ──────────────────────────────────────────────────────────────────
// All money fields in these schemas are in NAIRA (what the admin types).

/** Used for creating a new listing — status is NOT sent on create */
const createSchema = z.object({
  companyName: z.string().min(1, "Required"),
  description: z.string().min(1, "Required"),
  sharePrice: z.coerce.number().min(0),
  valuation: z.coerce.number().min(0),
  mrr: z.coerce.number().min(0).optional(),
  arr: z.coerce.number().min(0).optional(),
  totalShares: z.coerce.number().min(0),
  availableShares: z.coerce.number().min(0),
  lockInPeriod: z.coerce.number().min(0),
  isSaveboxEligible: z.boolean(),
});

/** Used for editing an existing listing — status is allowed */
const editSchema = createSchema.extend({
  status: z.enum(["pending", "active", "closed", "suspended"]),
});

/** Used for the standalone "Update Metrics" modal */
const metricsSchema = z.object({
  valuation: z.coerce.number().min(0),
  mrr: z.coerce.number().min(0).optional(),
  arr: z.coerce.number().min(0).optional(),
});



type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;
type MetricsValues = z.infer<typeof metricsSchema>;

const LIMIT = 20;

export default function EquityListingsPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useRole();
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEquity, setEditingEquity] = useState<any>(null);
  const [metricsEquity, setMetricsEquity] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["equityListings", page],
    queryFn: () => getEquityListings(page, LIMIT),
    enabled: isAdmin,
  });

  const listings: any[] = data?.data ?? [];
  const meta = data?.meta ?? {};

  // ─── Create form ────────────────────────────────────────────────────────────
  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema) as any,
    defaultValues: {
      companyName: "", description: "",
      sharePrice: 0, valuation: 0, mrr: 0, arr: 0,
      totalShares: 0, availableShares: 0,
      lockInPeriod: 0, isSaveboxEligible: false,
    },
  });

  // ─── Edit form ──────────────────────────────────────────────────────────────
  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema) as any,
    defaultValues: {
      companyName: "", description: "",
      sharePrice: 0, valuation: 0, mrr: 0, arr: 0,
      totalShares: 0, availableShares: 0,
      lockInPeriod: 0, isSaveboxEligible: false, status: "pending",
    },
  });

  // ─── Metrics form ────────────────────────────────────────────────────────────
  const metricsForm = useForm<MetricsValues>({
    resolver: zodResolver(metricsSchema) as any,
    defaultValues: { valuation: 0, mrr: 0, arr: 0 },
  });

  // ─── Mutations ───────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: object) => createEquityListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equityListings"] });
      toast.success("Listing created.");
      setIsFormOpen(false);
      createForm.reset();
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

  const metricsMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => updateEquityListing(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equityListings"] });
      toast.success("Metrics updated. A valuation history entry has been recorded.");
      setMetricsEquity(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update metrics."),
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

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const openEdit = (eq: any) => {
    setEditingEquity(eq);
    // Pre-fill money fields as naira (backend stores raw base currency)
    editForm.reset({
      companyName: eq.companyName ?? eq.company ?? "",
      description: eq.description ?? "",
      sharePrice: eq.sharePrice ?? 0,
      valuation: eq.valuation ?? 0,
      mrr: eq.mrr ?? 0,
      arr: eq.arr ?? 0,
      totalShares: eq.totalShares ?? 0,
      availableShares: eq.availableShares ?? 0,
      lockInPeriod: eq.lockInPeriod ?? eq.lockInPeriodDays ?? 0,
      isSaveboxEligible: !!eq.isSaveboxEligible,
      status: (["pending", "active", "closed", "suspended"].includes(eq.status?.toLowerCase())
        ? eq.status.toLowerCase()
        : "pending") as "pending" | "active" | "closed" | "suspended",
    });
    setIsFormOpen(true);
  };

  const openCreate = () => {
    setEditingEquity(null);
    createForm.reset();
    setIsFormOpen(true);
  };

  const openMetrics = (eq: any) => {
    setMetricsEquity(eq);
    // Pre-fill as naira
    metricsForm.reset({
      valuation: eq.valuation ?? 0,
      mrr: eq.mrr ?? 0,
      arr: eq.arr ?? 0,
    });
  };

  // ─── Columns ─────────────────────────────────────────────────────────────────
  const columns: Column[] = [
    { key: "companyName", header: "Company", className: "font-medium text-sm" },
    { key: "status", header: "Status", render: (v) => <StatusBadge status={v} /> },
    {
      key: "sharePrice",
      header: "Share Price",
      headerClassName: "text-right",
      render: (v) => <div className="text-right"><MoneyCell naira={v} /></div>,
    },
    {
      key: "valuation",
      header: "Valuation",
      headerClassName: "text-right",
      render: (v) => <div className="text-right">{v ? <MoneyCell naira={v} /> : "—"}</div>,
    },
    {
      key: "mrr",
      header: "MRR",
      headerClassName: "text-right",
      render: (v) => <div className="text-right">{v ? <MoneyCell naira={v} /> : "—"}</div>,
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
      key: "lockInPeriod",
      header: "Lock-in",
      render: (v) => v ? `${v}d` : "—",
    },
    {
      key: "isSaveboxEligible",
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
      render: (id, row) => isAdmin ? (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm" variant="ghost" className="text-amber-600 hover:bg-amber-50"
            title="Update Metrics (valuation, MRR, ARR)"
            onClick={() => openMetrics(row)}
          >
            <TrendingUp className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="text-blue hover:bg-blue/5" onClick={() => openEdit(row)}>
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="text-red hover:bg-red/5" onClick={() => setDeletingId(id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : <div className="text-right text-xs text-gray-300">—</div>,
    },
  ];

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3 px-6">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Lock className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-base font-semibold text-gray-700">Admin Access Required</p>
        <p className="text-sm text-gray-400 max-w-xs">Equity listings are restricted to administrators.</p>
      </div>
    );
  }

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Equity Listings"
        subtitle="Manage all equity listings. Valuation changes auto-create history entries."
        actions={
          isAdmin ? (
            <Button className="bg-blue hover:bg-darkBlue text-white gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" /> New Listing
            </Button>
          ) : undefined
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

      {/* ── Create / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={(v) => { if (!v) { setIsFormOpen(false); setEditingEquity(null); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEquity ? "Edit Equity Listing" : "New Equity Listing"}</DialogTitle>
          </DialogHeader>

          {editingEquity && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Updating sharePrice, valuation, MRR, or ARR will automatically create a valuation history entry.
            </p>
          )}

          {/* CREATE FORM */}
          {!editingEquity && (
            <Form {...createForm}>
              <form
                onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}
                className="space-y-4 pt-1"
              >
                <FormField control={createForm.control} name="companyName" render={({ field }) => (
                  <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={createForm.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea rows={3} placeholder="A short explanation of the company shown to investors…" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={createForm.control} name="sharePrice" render={({ field }) => (
                    <FormItem><FormLabel>Share Price (₦)</FormLabel><FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={createForm.control} name="valuation" render={({ field }) => (
                    <FormItem><FormLabel>Valuation (₦)</FormLabel><FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={createForm.control} name="mrr" render={({ field }) => (
                    <FormItem><FormLabel>MRR (₦) <span className="text-gray-400 font-normal text-xs">(Optional)</span></FormLabel><FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={createForm.control} name="arr" render={({ field }) => (
                    <FormItem><FormLabel>ARR (₦) <span className="text-gray-400 font-normal text-xs">(Optional)</span></FormLabel><FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={createForm.control} name="totalShares" render={({ field }) => (
                    <FormItem><FormLabel>Total Shares</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={createForm.control} name="availableShares" render={({ field }) => (
                    <FormItem><FormLabel>Available Shares</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={createForm.control} name="lockInPeriod" render={({ field }) => (
                    <FormItem><FormLabel>Lock-in Period (days)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={createForm.control} name="isSaveboxEligible" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>Savebox Eligible</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <Button type="submit" className="w-full bg-blue text-white" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating…" : "Create Listing"}
                </Button>
              </form>
            </Form>
          )}

          {/* EDIT FORM */}
          {editingEquity && (
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit((v) => updateMutation.mutate({ id: editingEquity.id, data: v }))}
                className="space-y-4 pt-1"
              >
                <FormField control={editForm.control} name="companyName" render={({ field }) => (
                  <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={editForm.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea rows={3} placeholder="A short explanation of the company shown to investors…" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={editForm.control} name="sharePrice" render={({ field }) => (
                    <FormItem><FormLabel>Share Price (₦)</FormLabel><FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={editForm.control} name="valuation" render={({ field }) => (
                    <FormItem><FormLabel>Valuation (₦)</FormLabel><FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={editForm.control} name="mrr" render={({ field }) => (
                    <FormItem><FormLabel>MRR (₦) <span className="text-gray-400 font-normal text-xs">(Optional)</span></FormLabel><FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={editForm.control} name="arr" render={({ field }) => (
                    <FormItem><FormLabel>ARR (₦) <span className="text-gray-400 font-normal text-xs">(Optional)</span></FormLabel><FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={editForm.control} name="totalShares" render={({ field }) => (
                    <FormItem><FormLabel>Total Shares</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={editForm.control} name="availableShares" render={({ field }) => (
                    <FormItem><FormLabel>Available Shares</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={editForm.control} name="lockInPeriod" render={({ field }) => (
                    <FormItem><FormLabel>Lock-in Period (days)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={editForm.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" {...field}>
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="closed">Closed</option>
                        <option value="suspended">Suspended</option>
                      </select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={editForm.control} name="isSaveboxEligible" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel>Savebox Eligible</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <Button type="submit" className="w-full bg-blue text-white" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Update Metrics Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!metricsEquity} onOpenChange={(v) => { if (!v) setMetricsEquity(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Metrics</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1 mb-1">
            Updating any of these values will automatically record a valuation history entry for{" "}
            <span className="font-medium text-foreground">{metricsEquity?.companyName ?? metricsEquity?.company}</span>.
          </p>
          <Form {...metricsForm}>
            <form
              onSubmit={metricsForm.handleSubmit((v) =>
                metricsMutation.mutate({ id: metricsEquity.id, data: v })
              )}
              className="space-y-4"
            >
              <FormField control={metricsForm.control} name="valuation" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valuation (₦)</FormLabel>
                  <FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={metricsForm.control} name="mrr" render={({ field }) => (
                <FormItem>
                  <FormLabel>MRR — Monthly Recurring Revenue (₦)</FormLabel>
                  <FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={metricsForm.control} name="arr" render={({ field }) => (
                <FormItem>
                  <FormLabel>ARR — Annual Recurring Revenue (₦)</FormLabel>
                  <FormControl><Input type="number" min={0} step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setMetricsEquity(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-blue text-white" disabled={metricsMutation.isPending}>
                  {metricsMutation.isPending ? "Saving…" : "Update Metrics"}
                </Button>
              </div>
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
