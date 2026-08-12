"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEquityListings, createEquityListing, updateEquityListing, deleteEquityListing, getEquityCategories,
  getCategoryEntities, createEquityCategory, updateEquityCategory, deleteEquityCategory,
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
import { Plus, Edit, Trash2, TrendingUp, Lock, FolderTree, Pencil } from "lucide-react";
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
  portfolioCategory: z.string().optional(),
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
  const [isCustomCreateCategory, setIsCustomCreateCategory] = useState(false);
  const [isCustomEditCategory, setIsCustomEditCategory] = useState(false);

  // Category Management state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatSlug, setEditCatSlug] = useState("");
  const [editCatDesc, setEditCatDesc] = useState("");
  const [editCatIsActive, setEditCatIsActive] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["equityListings", page],
    queryFn: () => getEquityListings(page, LIMIT),
    enabled: isAdmin,
  });

  const { data: categoriesRaw } = useQuery({
    queryKey: ["equityCategories"],
    queryFn: getEquityCategories,
  });

  const { data: categoryEntitiesRaw, isLoading: isLoadingCategoryEntities } = useQuery({
    queryKey: ["categoryEntities"],
    queryFn: () => getCategoryEntities(true),
    enabled: isAdmin && isCategoryModalOpen,
  });

  const categoryEntities: any[] = Array.isArray(categoryEntitiesRaw) ? categoryEntitiesRaw : [];

  const createCatMutation = useMutation({
    mutationFn: (v: { name: string; description?: string }) => createEquityCategory(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryEntities"] });
      queryClient.invalidateQueries({ queryKey: ["equityCategories"] });
      toast.success("Category created successfully.");
      setNewCatName("");
      setNewCatDesc("");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create category."),
  });

  const updateCatMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateEquityCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryEntities"] });
      queryClient.invalidateQueries({ queryKey: ["equityCategories"] });
      queryClient.invalidateQueries({ queryKey: ["equityListings"] });
      toast.success("Category updated.");
      setEditingCategory(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update category."),
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id: number) => deleteEquityCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryEntities"] });
      queryClient.invalidateQueries({ queryKey: ["equityCategories"] });
      toast.success("Category deleted.");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to delete category."),
  });

  const categories: string[] = Array.isArray(categoriesRaw) ? categoriesRaw : [];

  const listings: any[] = data?.data ?? [];
  const meta = data?.meta ?? {};

  // ─── Create form ────────────────────────────────────────────────────────────
  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema) as any,
    defaultValues: {
      companyName: "", description: "",
      sharePrice: 0, valuation: 0, mrr: 0, arr: 0,
      totalShares: 0, availableShares: 0,
      lockInPeriod: 0, isSaveboxEligible: false, portfolioCategory: "",
    },
  });

  // ─── Edit form ──────────────────────────────────────────────────────────────
  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema) as any,
    defaultValues: {
      companyName: "", description: "",
      sharePrice: 0, valuation: 0, mrr: 0, arr: 0,
      totalShares: 0, availableShares: 0,
      lockInPeriod: 0, isSaveboxEligible: false, status: "pending", portfolioCategory: "",
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
    // Pre-fill money fields as naira (backend returns raw Kobo)
    editForm.reset({
      companyName: eq.companyName ?? eq.company ?? "",
      description: eq.description ?? "",
      sharePrice: eq.sharePrice ? eq.sharePrice / 100 : 0,
      valuation: eq.valuation ? eq.valuation / 100 : 0,
      mrr: eq.mrr ? eq.mrr / 100 : 0,
      arr: eq.arr ? eq.arr / 100 : 0,
      totalShares: eq.totalShares ?? 0,
      availableShares: eq.availableShares ?? 0,
      lockInPeriod: eq.lockInPeriod ?? eq.lockInPeriodDays ?? 0,
      isSaveboxEligible: !!eq.isSaveboxEligible,
      portfolioCategory: eq.portfolioCategory ?? "",
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
      valuation: eq.valuation ? eq.valuation / 100 : 0,
      mrr: eq.mrr ? eq.mrr / 100 : 0,
      arr: eq.arr ? eq.arr / 100 : 0,
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
      render: (v) => <div className="text-right"><MoneyCell kobo={v} /></div>,
    },
    {
      key: "valuation",
      header: "Valuation",
      headerClassName: "text-right",
      render: (v) => <div className="text-right">{v ? <MoneyCell kobo={v} /> : "—"}</div>,
    },
    {
      key: "mrr",
      header: "MRR",
      headerClassName: "text-right",
      render: (v) => <div className="text-right">{v ? <MoneyCell kobo={v} /> : "—"}</div>,
    },
    {
      key: "totalShares",
      header: "Total Shares",
      className: "font-mono text-sm text-right",
      headerClassName: "text-right",
      render: (v) => v != null ? Number(v).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 }) : "—",
    },
    {
      key: "availableShares",
      header: "Available",
      className: "font-mono text-sm text-right",
      headerClassName: "text-right",
      render: (v) => v != null ? Number(v).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 }) : "—",
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
            <div className="flex items-center gap-2">
              <Button variant="outline" className="border-gray-200 text-gray-700 gap-2" onClick={() => setIsCategoryModalOpen(true)}>
                <FolderTree className="w-4 h-4" /> Manage Categories
              </Button>
              <Button className="bg-blue hover:bg-darkBlue text-white gap-2" onClick={openCreate}>
                <Plus className="w-4 h-4" /> New Listing
              </Button>
            </div>
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
                onSubmit={createForm.handleSubmit((v) => createMutation.mutate({
                  ...v,
                  sharePrice: Math.round(v.sharePrice * 100),
                  valuation: Math.round(v.valuation * 100),
                  mrr: v.mrr ? Math.round(v.mrr * 100) : 0,
                  arr: v.arr ? Math.round(v.arr * 100) : 0,
                }))}
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
                    <FormItem><FormLabel>Total Shares</FormLabel><FormControl><Input type="number" min={0} step="0.0001" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={createForm.control} name="availableShares" render={({ field }) => (
                    <FormItem><FormLabel>Available Shares</FormLabel><FormControl><Input type="number" min={0} step="0.0001" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={createForm.control} name="lockInPeriod" render={({ field }) => (
                    <FormItem><FormLabel>Lock-in Period (days)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={createForm.control} name="portfolioCategory" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portfolio Category</FormLabel>
                      <div className="space-y-2">
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm capitalize"
                          value={isCustomCreateCategory ? "__custom__" : (field.value ?? "")}
                          onChange={(e) => {
                            if (e.target.value === "__custom__") {
                              setIsCustomCreateCategory(true);
                              field.onChange("");
                            } else {
                              setIsCustomCreateCategory(false);
                              field.onChange(e.target.value);
                            }
                          }}
                        >
                          <option value="">None / Unassigned</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat} className="capitalize">
                              {cat.replace("_", " ")}
                            </option>
                          ))}
                          <option value="__custom__">+ Add Custom Category...</option>
                        </select>
                        {isCustomCreateCategory && (
                          <Input
                            placeholder="Type new category name..."
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value.toLowerCase().trim())}
                          />
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
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
                onSubmit={editForm.handleSubmit((v) => updateMutation.mutate({
                  id: editingEquity.id,
                  data: {
                    ...v,
                    sharePrice: Math.round(v.sharePrice * 100),
                    valuation: Math.round(v.valuation * 100),
                    mrr: v.mrr ? Math.round(v.mrr * 100) : 0,
                    arr: v.arr ? Math.round(v.arr * 100) : 0,
                  }
                }))}
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
                    <FormItem><FormLabel>Total Shares</FormLabel><FormControl><Input type="number" min={0} step="0.0001" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={editForm.control} name="availableShares" render={({ field }) => (
                    <FormItem><FormLabel>Available Shares</FormLabel><FormControl><Input type="number" min={0} step="0.0001" {...field} /></FormControl><FormMessage /></FormItem>
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
                  <FormField control={editForm.control} name="portfolioCategory" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portfolio Category</FormLabel>
                      <div className="space-y-2">
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm capitalize"
                          value={isCustomEditCategory ? "__custom__" : (field.value ?? "")}
                          onChange={(e) => {
                            if (e.target.value === "__custom__") {
                              setIsCustomEditCategory(true);
                              field.onChange("");
                            } else {
                              setIsCustomEditCategory(false);
                              field.onChange(e.target.value);
                            }
                          }}
                        >
                          <option value="">None / Unassigned</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat} className="capitalize">
                              {cat.replace("_", " ")}
                            </option>
                          ))}
                          <option value="__custom__">+ Add Custom Category...</option>
                        </select>
                        {isCustomEditCategory && (
                          <Input
                            placeholder="Type new category name..."
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value.toLowerCase().trim())}
                          />
                        )}
                      </div>
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
                metricsMutation.mutate({
                  id: metricsEquity.id,
                  data: {
                    ...v,
                    valuation: Math.round(v.valuation * 100),
                    mrr: v.mrr ? Math.round(v.mrr * 100) : 0,
                    arr: v.arr ? Math.round(v.arr * 100) : 0,
                  }
                })
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

      {/* ── Manage Categories Modal ────────────────────────────────────────── */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FolderTree className="w-5 h-5 text-blue" /> Portfolio Categories Management
            </DialogTitle>
          </DialogHeader>

          {/* Create new category row */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Create New Category</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="Category Name (e.g. AgriTech)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
              <Input
                placeholder="Description (Optional)"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="bg-blue hover:bg-darkBlue text-white gap-2 w-full sm:w-auto"
              disabled={!newCatName.trim() || createCatMutation.isPending}
              onClick={() => createCatMutation.mutate({ name: newCatName, description: newCatDesc })}
            >
              <Plus className="w-4 h-4" /> {createCatMutation.isPending ? "Creating..." : "Add Category"}
            </Button>
          </div>

          {/* Categories list table */}
          <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Slug</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoadingCategoryEntities ? (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-400 py-8 text-xs">
                      Loading categories...
                    </td>
                  </tr>
                ) : categoryEntities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-400 py-8 text-xs">
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  categoryEntities.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{cat.slug}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate">{cat.description ?? "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            updateCatMutation.mutate({
                              id: cat.id,
                              data: { isActive: !cat.isActive },
                            })
                          }
                          className="focus:outline-none"
                          title="Click to toggle status"
                        >
                          <Badge
                            variant="outline"
                            className={
                              cat.isActive
                                ? "text-greeny border-greeny/30 bg-greeny/5 text-xs cursor-pointer hover:bg-greeny/10"
                                : "text-gray-400 border-gray-200 text-xs cursor-pointer hover:bg-gray-100"
                            }
                          >
                            {cat.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-blue hover:bg-blue/5 gap-1"
                            onClick={() => {
                              setEditingCategory(cat);
                              setEditCatName(cat.name);
                              setEditCatSlug(cat.slug);
                              setEditCatDesc(cat.description ?? "");
                              setEditCatIsActive(cat.isActive);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red hover:bg-red/5"
                            onClick={() => deleteCatMutation.mutate(cat.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Category Modal ────────────────────────────────────────── */}
      <Dialog open={editingCategory !== null} onOpenChange={(v) => !v && setEditingCategory(null)}>
        <DialogContent className="max-w-md space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Pencil className="w-5 h-5 text-blue" /> Edit Category
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editingCategory) return;
              updateCatMutation.mutate({
                id: editingCategory.id,
                data: {
                  name: editCatName,
                  slug: editCatSlug,
                  description: editCatDesc,
                  isActive: editCatIsActive,
                },
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Category Name</label>
              <Input
                placeholder="Name"
                value={editCatName}
                onChange={(e) => setEditCatName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Slug (Unique Identifier)</label>
              <Input
                placeholder="slug (e.g. tech, real_estate)"
                value={editCatSlug}
                onChange={(e) => setEditCatSlug(e.target.value)}
              />
              <p className="text-[11px] text-gray-400">Updating slug automatically re-links all assigned equity listings.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Description</label>
              <Textarea
                placeholder="Description"
                value={editCatDesc}
                onChange={(e) => setEditCatDesc(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-xs font-semibold text-gray-700">Active Status</span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editCatIsActive}
                  onCheckedChange={setEditCatIsActive}
                />
                <span className="text-xs text-gray-500">{editCatIsActive ? "Active" : "Inactive"}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingCategory(null)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-blue text-white" disabled={updateCatMutation.isPending}>
                {updateCatMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
