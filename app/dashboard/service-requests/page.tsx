"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPendingOfferRequests, submitOfferQuote, getQuotedOfferRequests } from "@/lib/offerService";
import { useRole } from "@/hooks/useRole";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Send, FileText, Lock } from "lucide-react";
import { toast } from "sonner";

const quoteSchema = z.object({
  amount: z.preprocess(
    (v) => (v === "" ? undefined : Number(v)),
    z.number({ message: "Required" }).positive("Amount must be greater than zero")
  ),
  serviceDescription: z.string().min(5, "Description must be at least 5 characters long"),
});

export default function ServiceRequestsPage() {
  const queryClient = useQueryClient();
  const { role, isAdmin } = useRole();
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const { data: requestsRaw, isLoading } = useQuery({
    queryKey: ["service-requests", role],
    queryFn: getPendingOfferRequests,
    enabled: isAdmin || role === "PARTNER",
  });

  const { data: quotedRaw, isLoading: isQuotedLoading } = useQuery({
    queryKey: ["service-requests-quoted", role],
    queryFn: getQuotedOfferRequests,
    enabled: isAdmin || role === "PARTNER",
    retry: false, // Don't retry if endpoint fails (e.g. 404)
  });

  const requests = Array.isArray(requestsRaw)
    ? requestsRaw
    : (requestsRaw as any)?.data ?? [];

  const quotedRequests = Array.isArray(quotedRaw)
    ? quotedRaw
    : (quotedRaw as any)?.data ?? [];

  const quoteForm = useForm<z.infer<typeof quoteSchema>>({
    resolver: zodResolver(quoteSchema) as any,
    defaultValues: { amount: undefined, serviceDescription: "" },
  });

  const quoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: any }) => submitOfferQuote(id, data),
    onSuccess: () => {
      // Use prefix-only keys so they match ["service-requests", role] etc.
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      queryClient.invalidateQueries({ queryKey: ["service-requests-quoted"] });
      toast.success("Quote submitted successfully.");
      setIsQuoteOpen(false);
      quoteForm.reset();
      setSelectedRequest(null);
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message ?? "Failed to submit quote.");
    },
  });

  const openQuoteModal = (req: any) => {
    setSelectedRequest(req);
    quoteForm.reset({ amount: undefined, serviceDescription: "" });
    setIsQuoteOpen(true);
  };

  const columns: Column[] = [
    {
      key: "offer",
      header: "Offer",
      className: "font-medium text-sm text-gray-900",
      render: (v: any, row: any) => v?.name ?? row.offerName ?? "—",
    },
    {
      key: "customer",
      header: "Customer",
      render: (v: any) => {
        if (!v) return <span className="text-gray-400 text-xs">—</span>;
        const name = [v.firstName, v.lastName].filter(Boolean).join(" ");
        const display = name || v.companyName;
        const sub = name && v.companyName ? v.companyName : null;
        return (
          <div className="min-w-[160px]">
            <p className="text-sm font-medium text-gray-800">{display || "—"}</p>
            {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
            {v.email && <p className="text-xs text-gray-500 truncate">{v.email}</p>}
            {v.customerType && (
              <span className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5 block">{v.customerType}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (v: any) => <StatusBadge status={v} />,
    },
    {
      key: "clickedAt",
      header: "Requested At",
      className: "text-xs text-gray-400 whitespace-nowrap",
      render: (v: any) => (v ? format(new Date(v), "dd MMM yyyy, HH:mm") : "—"),
    },
    {
      key: "id",
      header: "Action",
      headerClassName: "text-right",
      render: (id: any, row: any) => {
        const canQuote =
          (row.status === "clicked" ||
            row.status === "CLICKED" ||
            row.status === "pending" ||
            row.status === "PENDING") &&
          (isAdmin || role === "PARTNER");
        if (canQuote) {
          return (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="text-blue border-blue/20 hover:bg-blue/5 rounded-lg text-xs"
                onClick={() => openQuoteModal(row)}
              >
                Submit Quote
              </Button>
            </div>
          );
        }
        return <span className="text-xs text-gray-400 flex justify-end pr-4">—</span>;
      },
    },
  ];

  const quotedColumns: Column[] = [
    {
      key: "offer",
      header: "Offer",
      className: "font-medium text-sm text-gray-900",
      render: (v: any, row: any) => v?.name ?? row.offerName ?? "—",
    },
    {
      key: "customer",
      header: "Customer",
      render: (v: any) => {
        if (!v) return <span className="text-gray-400 text-xs">—</span>;
        const name = [v.firstName, v.lastName].filter(Boolean).join(" ");
        const display = name || v.companyName;
        const sub = name && v.companyName ? v.companyName : null;
        return (
          <div className="min-w-[160px]">
            <p className="text-sm font-medium text-gray-800">{display || "—"}</p>
            {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
            {v.email && <p className="text-xs text-gray-500 truncate">{v.email}</p>}
            {v.customerType && (
              <span className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5 block">{v.customerType}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "quotedAmount",
      header: "Quoted Amount",
      className: "font-mono text-sm text-gray-700",
      render: (v: any) => {
        return v != null ? (
          `₦${Number(v).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`
        ) : (
          <span className="text-gray-400">—</span>
        );
      },
    },
    {
      key: "serviceDescription",
      header: "Quote Note",
      className: "text-xs text-gray-500 max-w-[200px] truncate",
      render: (v: any) => v ?? <span className="text-gray-400">—</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (v: any) => <StatusBadge status={v} />,
    },
    {
      key: "quotedAt",
      header: "Quoted At",
      className: "text-xs text-gray-400 whitespace-nowrap",
      render: (v: any) => (v ? format(new Date(v), "dd MMM yyyy, HH:mm") : "—"),
    },
  ];

  if (role === "STAFF") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3 px-6">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Lock className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-base font-semibold text-gray-700">Access Restricted</p>
        <p className="text-sm text-gray-400 max-w-xs">Service requests are restricted to administrators and partners.</p>
      </div>
    );
  }

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Service Requests"
        subtitle="Review customer service requests, manage quotes, and follow up on inquiries."
      />

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
          <TabsTrigger
            value="pending"
            className="rounded-lg text-sm font-medium data-[state=active]:bg-gray-50 data-[state=active]:text-blue data-[state=active]:shadow-sm"
          >
            Pending Requests
          </TabsTrigger>
          <TabsTrigger
            value="quoted"
            className="rounded-lg text-sm font-medium data-[state=active]:bg-gray-50 data-[state=active]:text-blue data-[state=active]:shadow-sm"
          >
            Quoted History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-0 outline-none">
          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden">
            <DataTable
              columns={columns}
              data={requests}
              loading={isLoading}
              rowKey={(r) => r.id}
              emptyMessage="No pending service requests found."
            />
          </div>
        </TabsContent>

        <TabsContent value="quoted" className="mt-0 outline-none">
          <div className="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden">
            <DataTable
              columns={quotedColumns}
              data={quotedRequests}
              loading={isQuotedLoading}
              rowKey={(r) => r.id}
              emptyMessage="No quoted service requests found."
            />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={isQuoteOpen}
        onOpenChange={(v) => {
          if (!v) {
            setIsQuoteOpen(false);
            setSelectedRequest(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Submit Service Quote</DialogTitle>
          </DialogHeader>
          <div className="text-xs text-gray-500 bg-gray-50 border p-3 rounded-xl space-y-1">
            <p>
              <strong>Offer:</strong> {selectedRequest?.offer?.name ?? selectedRequest?.offerName ?? "—"}
            </p>
            <p>
              <strong>Customer:</strong> {selectedRequest?.user?.email ?? "—"}
            </p>
          </div>
          <Form {...quoteForm}>
            <form
              onSubmit={quoteForm.handleSubmit((values) =>
                quoteMutation.mutate({ id: selectedRequest.id, data: values })
              )}
              className="space-y-4 pt-1"
            >
              <FormField
                control={quoteForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proposed Quote Amount (₦)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 15000"
                        className="rounded-xl h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={quoteForm.control}
                name="serviceDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Description & Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide details about the service scope, delivery times, and pricing terms..."
                        className="rounded-xl min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-blue hover:bg-darkBlue text-white rounded-xl h-11 gap-2"
                disabled={quoteMutation.isPending}
              >
                <Send className="w-4 h-4" />
                {quoteMutation.isPending ? "Submitting Quote..." : "Send Quote"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
