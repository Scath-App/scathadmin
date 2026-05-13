"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOffers, createOffer, updateOffer, deleteOffer,
  getPendingOfferRequests, submitOfferQuote,
} from "@/lib/offerService";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MoneyCell } from "@/components/ui/MoneyCell";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { RoleGate } from "@/components/ui/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit, Trash2, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const offerSchema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  partnerId: z.coerce.number().optional(),
});

const quoteSchema = z.object({
  amount: z.coerce.number().positive("Amount required"),
  serviceDescription: z.string().min(3, "Required"),
});

export default function OffersPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [quotingRequest, setQuotingRequest] = useState<any>(null);

  const { data: offersRaw, isLoading: offersLoading } = useQuery({
    queryKey: ["offers"],
    queryFn: () => getOffers(),
  });

  const { data: pendingRaw, isLoading: pendingLoading } = useQuery({
    queryKey: ["pendingOfferRequests"],
    queryFn: getPendingOfferRequests,
  });

  const offers: any[] = Array.isArray(offersRaw) ? offersRaw : offersRaw?.data ?? [];
  const pending: any[] = Array.isArray(pendingRaw) ? pendingRaw : pendingRaw?.data ?? [];

  const offerForm = useForm<z.infer<typeof offerSchema>>({
    resolver: zodResolver(offerSchema) as any,
    defaultValues: { name: "", description: "", url: "", partnerId: undefined },
  });

  const quoteForm = useForm<z.infer<typeof quoteSchema>>({
    resolver: zodResolver(quoteSchema) as any,
    defaultValues: { amount: undefined as any, serviceDescription: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => createOffer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      toast.success("Offer created.");
      setIsFormOpen(false);
      offerForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => updateOffer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      toast.success("Offer updated.");
      setEditingOffer(null);
      setIsFormOpen(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteOffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      toast.success("Offer deleted.");
      setDeletingId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed."),
  });

  const quoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { amount: number; serviceDescription: string } }) =>
      submitOfferQuote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingOfferRequests"] });
      toast.success("Quote submitted. Request moved to pending_payment.");
      setQuotingRequest(null);
      quoteForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to submit quote."),
  });

  const openEdit = (offer: any) => {
    setEditingOffer(offer);
    offerForm.reset({ name: offer.name, description: offer.description ?? "", url: offer.url ?? "", partnerId: offer.partnerId });
    setIsFormOpen(true);
  };

  const openCreate = () => {
    setEditingOffer(null);
    offerForm.reset();
    setIsFormOpen(true);
  };

  const offerColumns: Column[] = [
    { key: "name", header: "Name", className: "font-medium text-sm" },
    { key: "description", header: "Description", className: "text-sm text-gray-500 max-w-[200px] truncate" },
    {
      key: "url",
      header: "URL",
      render: (v) => v ? <a href={v} target="_blank" rel="noreferrer" className="text-blue text-xs underline truncate block max-w-[160px]">{v}</a> : "—",
    },
    { key: "partnerId", header: "Partner ID", render: (v) => v ? `#${v}` : "—" },
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

  const pendingColumns: Column[] = [
    { key: "id", header: "ID", render: (v) => `#${v}`, className: "font-mono text-xs text-gray-500" },
    {
      key: "offerName",
      header: "Offer Name",
      render: (_, row) => row.offer?.name ?? row.offerName ?? "—",
    },
    {
      key: "userId",
      header: "Customer",
      render: (v, row) => row.user?.email ?? `User #${v}`,
    },
    { key: "status", header: "Status", render: (v) => <StatusBadge status={v} /> },
    {
      key: "clickedAt",
      header: "Clicked At",
      render: (v) => v ? format(new Date(v), "dd MMM yyyy, HH:mm") : "—",
    },
    {
      key: "quotedAmount",
      header: "Quoted Amount",
      headerClassName: "text-right",
      render: (v) => v != null ? <div className="text-right"><MoneyCell kobo={v} /></div> : "—",
    },
    {
      key: "id",
      header: "Actions",
      headerClassName: "text-right",
      render: (id, row) =>
        row.status === "clicked" || row.status === "CLICKED" ? (
          <RoleGate roles={["ADMIN", "PARTNER"]}>
            <div className="text-right">
              <Button
                size="sm"
                variant="ghost"
                className="text-blue hover:bg-blue/5 gap-1 text-xs"
                onClick={() => { setQuotingRequest(row); quoteForm.reset(); }}
              >
                <DollarSign className="w-3.5 h-3.5" /> Quote
              </Button>
            </div>
          </RoleGate>
        ) : null,
    },
  ];

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader title="Offers" subtitle="Manage platform offers and pending customer requests." />

      <Tabs defaultValue="offers" className="w-full">
        <div className="flex items-center justify-between gap-4 mb-4">
          <TabsList className="bg-gray-100 p-1 rounded-xl">
            <TabsTrigger value="offers" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">
              All Offers
            </TabsTrigger>
            <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">
              Pending Requests
              {pending.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red text-white text-[10px] font-bold">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <Button className="bg-blue hover:bg-darkBlue text-white gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Offer
          </Button>
        </div>

        <TabsContent value="offers">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <DataTable columns={offerColumns} data={offers} loading={offersLoading} rowKey={(r) => r.id} />
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <DataTable columns={pendingColumns} data={pending} loading={pendingLoading} rowKey={(r) => r.id} emptyMessage="No pending offer requests." />
          </div>
        </TabsContent>
      </Tabs>

      {/* Create / Edit offer modal */}
      <Dialog open={isFormOpen} onOpenChange={(v) => { if (!v) { setIsFormOpen(false); setEditingOffer(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOffer ? "Edit Offer" : "New Offer"}</DialogTitle>
          </DialogHeader>
          <Form {...offerForm}>
            <form onSubmit={offerForm.handleSubmit((v) => {
              if (editingOffer) updateMutation.mutate({ id: editingOffer.id, data: v });
              else createMutation.mutate(v);
            })} className="space-y-4 pt-1">
              <FormField control={offerForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={offerForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={offerForm.control} name="url" render={({ field }) => (
                <FormItem><FormLabel>URL</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={offerForm.control} name="partnerId" render={({ field }) => (
                <FormItem><FormLabel>Partner ID (optional)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full bg-blue text-white" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingOffer ? "Save Changes" : "Create Offer"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Quote modal */}
      <Dialog open={!!quotingRequest} onOpenChange={(v) => { if (!v) setQuotingRequest(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Submit Quote</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-1">For: {quotingRequest?.offer?.name ?? `Request #${quotingRequest?.id}`}</p>
          <Form {...quoteForm}>
            <form onSubmit={quoteForm.handleSubmit((v) => quoteMutation.mutate({ id: quotingRequest.id, data: v }))} className="space-y-4 pt-1">
              <FormField control={quoteForm.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount (kobo) <span className="text-xs text-gray-400">— min 1</span></FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={quoteForm.control} name="serviceDescription" render={({ field }) => (
                <FormItem><FormLabel>Service Description</FormLabel><FormControl><Input placeholder="What will be provided..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full bg-blue text-white" disabled={quoteMutation.isPending}>
                {quoteMutation.isPending ? "Submitting..." : "Submit Quote"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={deletingId !== null}
        onOpenChange={(v) => !v && setDeletingId(null)}
        title="Delete Offer"
        message="This offer will be permanently deleted."
        danger
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deletingId!)}
      />
    </div>
  );
}
