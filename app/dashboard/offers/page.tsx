"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOffers, createOffer, updateOffer, deleteOffer,
} from "@/lib/offerService";
import { searchUsers } from "@/lib/userService";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
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
import { toast } from "sonner";

const offerSchema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
  url: z.string().url("Must be a valid URL"),
  imageUrl: z.preprocess((v) => v === "" ? undefined : v, z.string().url("Must be a valid URL").optional()),
  partnerId: z.preprocess((v) => {
    if (v === "" || v == null) return undefined;
    const num = Number(v);
    return isNaN(num) || num <= 0 ? undefined : num;
  }, z.number().optional()),
  isActive: z.boolean().optional(),
});

export default function OffersPage() {
  const queryClient = useQueryClient();
  const { role, isAdmin, isStaff } = useRole();
  const isAdminOrStaff = isAdmin || isStaff;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Partner email resolution state
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerStatus, setPartnerStatus] = useState<"idle" | "resolving" | "found" | "not_found" | "not_partner">("idle");
  const [resolvedPartnerName, setResolvedPartnerName] = useState("");

  const [page, setPage] = useState(0);
  const LIMIT = 50;

  const { data: offersRaw, isLoading: offersLoading } = useQuery({
    queryKey: ["offers", role, page],
    queryFn: () => getOffers(page, LIMIT),
  });

  const offers: any[] = Array.isArray(offersRaw) ? offersRaw : [];

  const offerForm = useForm<z.infer<typeof offerSchema>>({
    resolver: zodResolver(offerSchema) as any,
    defaultValues: { name: "", description: "", url: "", imageUrl: "", partnerId: undefined, isActive: false },
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => createOffer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      toast.success("Offer created.");
      setIsFormOpen(false);
      offerForm.reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create offer."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => updateOffer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      toast.success("Offer updated.");
      setEditingOffer(null);
      setIsFormOpen(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update offer."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteOffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      toast.success("Offer deleted.");
      setDeletingId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to delete offer."),
  });

  const resetPartnerState = () => {
    setPartnerEmail("");
    setPartnerStatus("idle");
    setResolvedPartnerName("");
    offerForm.setValue("partnerId", undefined);
  };

  const resolvePartnerEmail = async (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) { resetPartnerState(); return; }
    setPartnerStatus("resolving");
    try {
      const results = await searchUsers(trimmed, 5);
      const match = results.find((u) => u.email.toLowerCase() === trimmed.toLowerCase());
      if (!match) {
        setPartnerStatus("not_found");
        offerForm.setValue("partnerId", undefined);
      } else if (match.role !== "partner") {
        setPartnerStatus("not_partner");
        offerForm.setValue("partnerId", undefined);
      } else {
        setPartnerStatus("found");
        setResolvedPartnerName(match.displayName || match.email);
        offerForm.setValue("partnerId", match.id);
      }
    } catch {
      setPartnerStatus("not_found");
    }
  };

  const openEdit = (offer: any) => {
    setEditingOffer(offer);
    if (offer.partner) {
      const p = offer.partner;
      const email = p.email ?? "";
      setPartnerEmail(email);
      setPartnerStatus("found");
      setResolvedPartnerName([p.firstName, p.lastName].filter(Boolean).join(" ") || email);
    } else {
      resetPartnerState();
    }
    offerForm.reset({
      name: offer.name,
      description: offer.description ?? "",
      url: offer.url ?? "",
      imageUrl: offer.imageUrl ?? "",
      partnerId: offer.partner?.id,
      isActive: offer.isActive ?? false
    });
    setIsFormOpen(true);
  };

  const openCreate = () => {
    setEditingOffer(null);
    resetPartnerState();
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
    // Conditionally include partner column if user is Admin or Staff
    ...(isAdminOrStaff ? [{
      key: "partner",
      header: "Partner",
      render: (v: any) => v ? (
        <span className="text-sm text-gray-700">{[v.firstName, v.lastName].filter(Boolean).join(" ") || `#${v.id}`}</span>
      ) : <span className="text-gray-400 text-xs">—</span>,
    }] : []),
    {
      key: "isActive",
      header: "Status",
      render: (v) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${v ? "bg-green/10 text-green" : "bg-gray-100 text-gray-500"}`}>
          {v ? "ACTIVE" : "INACTIVE"}
        </span>
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
          {isAdmin && (
            <Button size="sm" variant="ghost" className="text-red hover:bg-red/5" onClick={() => setDeletingId(id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Offers" subtitle="Manage platform offers and business services." />
        <Button className="bg-blue hover:bg-darkBlue text-white gap-2 self-start sm:self-auto rounded-xl shadow-sm" onClick={openCreate}>
          <Plus className="w-4 h-4" /> New Offer
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden">
        <DataTable
          columns={offerColumns}
          data={offers}
          loading={offersLoading}
          rowKey={(r) => r.id}
          emptyMessage="No offers found."
        />
      </div>

      {/* Create / Edit offer modal */}
      <Dialog open={isFormOpen} onOpenChange={(v) => { if (!v) { setIsFormOpen(false); setEditingOffer(null); } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingOffer ? "Edit Offer" : "New Offer"}</DialogTitle>
          </DialogHeader>
          <Form {...offerForm}>
            <form onSubmit={offerForm.handleSubmit((v) => {
              if (editingOffer) {
                updateMutation.mutate({ id: editingOffer.id, data: v });
              } else {
                const { isActive, ...createData } = v;
                createMutation.mutate(createData);
              }
            })} className="space-y-4 pt-1">
              <FormField control={offerForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input className="rounded-xl h-11" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={offerForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input className="rounded-xl h-11" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={offerForm.control} name="url" render={({ field }) => (
                <FormItem><FormLabel>URL</FormLabel><FormControl><Input className="rounded-xl h-11" placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={offerForm.control} name="imageUrl" render={({ field }) => (
                <FormItem><FormLabel>Image URL (optional)</FormLabel><FormControl><Input className="rounded-xl h-11" placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              {/* Show Partner ID Lookup and Active Toggle only to ADMIN and STAFF */}
              {isAdminOrStaff && (
                <>
                  <FormField control={offerForm.control} name="partnerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partner email (optional)</FormLabel>
                      <FormControl>
                        <input type="hidden" {...field} />
                      </FormControl>
                      <Input
                        type="email"
                        placeholder="partner@example.com"
                        value={partnerEmail}
                        onChange={(e) => {
                          setPartnerEmail(e.target.value);
                          setPartnerStatus("idle");
                          setResolvedPartnerName("");
                          offerForm.setValue("partnerId", undefined);
                        }}
                        onBlur={(e) => resolvePartnerEmail(e.target.value)}
                        className="rounded-xl h-11 text-sm"
                      />
                      {partnerStatus === "resolving" && (
                        <p className="text-xs text-gray-400 mt-1">Looking up partner…</p>
                      )}
                      {partnerStatus === "found" && (
                        <p className="text-xs text-green mt-1">✓ {resolvedPartnerName}</p>
                      )}
                      {partnerStatus === "not_found" && (
                        <p className="text-xs text-red mt-1">No user found with that email.</p>
                      )}
                      {partnerStatus === "not_partner" && (
                        <p className="text-xs text-red mt-1">This user does not have the partner role.</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={offerForm.control} name="isActive" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-xl border p-4 bg-gray-50/50">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium">Active Status</FormLabel>
                        <p className="text-xs text-gray-400">Toggle visibility on the client application.</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-blue"
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                </>
              )}

              <Button type="submit" className="w-full bg-blue text-white rounded-xl h-11" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingOffer ? "Save Changes" : "Create Offer"}
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
