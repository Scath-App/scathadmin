"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserInvestments,
  getUserTransactions,
  getUserSaveboxes,
  getUserEquity,
  getUserAccounts,
  getUserById,
  updateUser,
  updateUserRole,
  deleteUser,
} from "@/lib/userService";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { getUserInvoices, reopenPaidInvoice, Invoice } from "@/lib/invoiceService";

type AnyRecord = Record<string, unknown>;

type UserProfile = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
};

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Loader2, Trash2, Mail } from "lucide-react";
import { format } from "date-fns";
import { CommunicateModal } from "@/components/ui/CommunicateModal";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (kobo: number | string) => {
  const n = typeof kobo === "string" ? parseFloat(kobo) : kobo;
  return `₦${(n / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
};

const PAGE_LIMIT = 10;

// ─── Edit User Schema ──────────────────────────────────────────────────────────

const editUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phoneNumber: z.string().optional(),
  role: z.enum(["admin", "staff", "partner", "user"]).optional(),
});


// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  loading,
  accent,
}: {
  label: string;
  value: string;
  loading: boolean;
  accent?: boolean;
}) {
  return (
    <Card
      className={`shadow-sm ${accent ? "border-blue/20 bg-blue/5" : "border-gray-100"}`}
    >
      <CardContent className="p-5">
        <p
          className={`text-xs font-medium mb-1.5 ${accent ? "text-blue" : "text-gray-500"}`}
        >
          {label}
        </p>
        {loading ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <p
            className={`text-2xl font-bold ${accent ? "text-blue" : "text-gray-900"}`}
          >
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Pagination bar ────────────────────────────────────────────────────────────

function PaginationBar({
  page,
  totalPages,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
      <p className="text-xs text-gray-400">
        Page {page + 1} of {totalPages} · {total} records
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-gray-200"
          disabled={page === 0}
          onClick={onPrev}
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-gray-200"
          disabled={page >= totalPages - 1}
          onClick={onNext}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = Number(params.id);

  // ── Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  // ── Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  // ── Communicate modal state
  const [isCommunicateOpen, setIsCommunicateOpen] = useState(false);

  // Pagination state
  const [invPage, setInvPage] = useState(0);
  const [txPage, setTxPage] = useState(0);
  const [sbPage] = useState(0);
  const [eqPage] = useState(0);
  const [invStatus, setInvStatus] = useState<string>("");

  // ─── Profile query ────────────────────────────────────────────────────────
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => getUserById(userId),
    enabled: !!userId,
  });

  const profile: UserProfile = profileData?.data ?? profileData ?? {};

  // ─── Edit form ────────────────────────────────────────────────────────────
  const editForm = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
    values: {
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      email: profile.email ?? "",
      phoneNumber: profile.phoneNumber ?? "",
      role: (profile.role?.toLowerCase() ?? "user") as "user" | "admin" | "partner" | "staff",
    },
  });

  // ─── Update mutation ─────────────────────────────────────────────────────
  type EditUserPayload = {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    role?: string;
  };

  const updateMutation = useMutation({
    mutationFn: async (v: z.infer<typeof editUserSchema>) => {
      const roleChanged =
        v.role && v.role.toLowerCase() !== profile.role?.toLowerCase();
      if (roleChanged && ["admin", "partner", "staff"].includes(v.role!.toLowerCase())) {
        await updateUserRole(userId, { role: v.role!.toLowerCase() as "admin" | "partner" | "staff" });
      }
    },
    onSuccess: () => {
      toast.success("User details updated.");
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Failed to update user.");
    },
  });

  // ── Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(userId),
    onSuccess: (result) => {
      setIsDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["deletedUsers"] });
      if (result.deletionType === "hard") {
        toast.success(
          "Account permanently deleted. The user's email and phone number are now available for a new registration.",
        );
      } else {
        toast.success(
          "Account deactivated successfully. Financial records have been preserved for compliance.",
        );
      }
      router.push("/dashboard/users");
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Failed to delete user.");
    },
  });

  const reopenMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      reopenPaidInvoice(id, reason),
    onSuccess: (updated: Invoice) => {
      toast.success(
        `Invoice ${updated.invoiceNumber ?? `#${updated.id}`} reopened — now ${updated.status}.`,
      );
      setReopenTarget(null);
      queryClient.invalidateQueries({ queryKey: ["userInvoices", userId] });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? "Failed to reopen invoice.");
    },
  });

  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ["userAccounts", userId],
    queryFn: () => getUserAccounts(userId),
    enabled: !!userId,
  });

  const userAccounts = (Array.isArray(accountsData)
    ? accountsData
    : accountsData?.data ?? []) as AnyRecord[];

  const [invoicePage, setInvoicePage] = useState(0);
  const [invoiceStatus, setInvoiceStatus] = useState("");
  const [reopenTarget, setReopenTarget] = useState<Invoice | null>(null);

  const { data: invoiceData, isLoading: invoiceLoading } = useQuery({
    queryKey: ["userInvoices", userId, invoicePage, invoiceStatus],
    queryFn: () =>
      getUserInvoices(userId, {
        page: invoicePage,
        limit: PAGE_LIMIT,
        status: invoiceStatus || undefined,
      }),
    enabled: !!userId,
  });

  const invoices: Invoice[] =
    invoiceData?.data ?? (Array.isArray(invoiceData) ? invoiceData : []);
  const invoiceMeta = invoiceData?.meta ?? {};

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: invData, isLoading: invLoading } = useQuery({
    queryKey: ["userInvestments", userId, invPage, invStatus],
    queryFn: () =>
      getUserInvestments(userId, {
        page: invPage,
        limit: PAGE_LIMIT,
        status: invStatus || undefined,
      }),
    enabled: !!userId,
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ["userTransactions", userId, txPage],
    queryFn: () =>
      getUserTransactions(userId, { page: txPage, limit: PAGE_LIMIT }),
    enabled: !!userId,
  });

  const { data: sbData, isLoading: sbLoading } = useQuery({
    queryKey: ["userSaveboxes", userId, sbPage],
    queryFn: () =>
      getUserSaveboxes(userId, { page: sbPage, limit: PAGE_LIMIT }),
    enabled: !!userId,
  });

  const { data: eqData, isLoading: eqLoading } = useQuery({
    queryKey: ["userEquity", userId, eqPage],
    queryFn: () => getUserEquity(userId, { page: eqPage, limit: PAGE_LIMIT }),
    enabled: !!userId,
  });

  // ─── Derived data ─────────────────────────────────────────────────────────

  const investments = (invData?.data || []) as AnyRecord[];
  const invMeta = invData?.meta || {};
  const invSummary = invData?.summary || {};

  const transactions = (txData?.data || []) as AnyRecord[];
  const txMeta = txData?.meta || {};

  const saveboxes =
    (sbData?.data || (Array.isArray(sbData) ? sbData : sbData?.data) || []) as AnyRecord[];
  const sbTotal = sbData?.total ?? saveboxes.length;

  const equities =
    (eqData?.data || (Array.isArray(eqData) ? eqData : eqData?.data) || []) as AnyRecord[];
  const eqTotal = eqData?.total ?? equities.length;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-900 gap-1.5 -ml-2"
          onClick={() => router.push("/dashboard/users")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Button>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {profileLoading ? (
            <Skeleton className="h-7 w-48 mb-1" />
          ) : (
            <h2 className="text-2xl font-bold text-gray-900">
              {profile.firstName && profile.lastName
                ? `${profile.firstName} ${profile.lastName}`
                : `User #${userId}`}
            </h2>
          )}
          {profileLoading ? (
            <Skeleton className="h-4 w-56 mt-1" />
          ) : (
            <div className="text-gray-500 text-sm mt-0.5 flex items-center flex-wrap gap-x-3 gap-y-1">
              <span>{profile.email ?? `User ID: ${userId}`}</span>
              {profile.phoneNumber && (
                <span className="text-gray-400">{profile.phoneNumber}</span>
              )}
              {profile.role && (
                <Badge variant="outline" className="text-xs capitalize border-gray-200 text-gray-500">
                  {profile.role}
                </Badge>
              )}
            </div>
          )}

          {/* ── Linked Platform Accounts ─────────────────────────────── */}
          {!accountsLoading && userAccounts.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {userAccounts.map((acc: AnyRecord) => (
                <div
                  key={acc.id as string | number}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-lg shadow-sm text-xs"
                >
                  <span className="font-mono text-gray-600 font-medium">
                    {String(acc.accountNumber ?? "—")}
                  </span>
                  {!!acc.accountName && (
                    <span className="text-gray-400">· {String(acc.accountName)}</span>
                  )}
                  {!!acc.accountType && (
                    <span className="text-gray-300">· {String(acc.accountType)}</span>
                  )}
                  {!!acc.status && (
                    <Badge
                      variant="outline"
                      className={
                        String(acc.status).toLowerCase() === "active"
                          ? "text-greeny border-greeny/30 bg-greeny/5 text-[10px] py-0 px-1.5"
                          : "text-gray-400 border-gray-200 text-[10px] py-0 px-1.5"
                      }
                    >
                      {String(acc.status)}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
          {accountsLoading && (
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-7 w-40 rounded-lg" />
              <Skeleton className="h-7 w-32 rounded-lg" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Delete — hidden for admin accounts */}
          {!profileLoading && profile.role?.toUpperCase() !== "ADMIN" && (
            <Button
              size="sm"
              variant="outline"
              className="border-red/30 text-red hover:bg-red/5 hover:border-red/50 gap-2"
              onClick={() => setIsDeleteOpen(true)}
              disabled={profileLoading}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Account
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-blue/30 text-blue hover:bg-blue/5 hover:border-blue/50 gap-2"
            onClick={() => setIsCommunicateOpen(true)}
            disabled={profileLoading}
          >
            <Mail className="w-3.5 h-3.5" />
            Message User
          </Button>
          <Button
            size="sm"
            className="bg-blue hover:bg-darkBlue text-white gap-2"
            onClick={() => setIsEditOpen(true)}
            disabled={profileLoading}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Details
          </Button>
        </div>
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-xl w-full max-w-4xl grid grid-cols-5 gap-1">
          {[
            { value: "transactions", label: "Transactions" },
            { value: "investments", label: "Investments" },
            { value: "saveboxes", label: "Saveboxes" },
            { value: "equity", label: "Equity" },
            { value: "invoices", label: "Invoices" },
          ].map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─── INVESTMENTS TAB ──────────────────────────────────────────── */}
        <TabsContent value="investments" className="mt-6 space-y-5">
          {/* Stat tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatTile
              label="Total Invested"
              value={
                invSummary.totalInvested ? fmt(invSummary.totalInvested) : "—"
              }
              loading={invLoading}
              accent
            />
            <StatTile
              label="Active Capital"
              value={
                invSummary.activeInvestments
                  ? fmt(invSummary.activeInvestments)
                  : "—"
              }
              loading={invLoading}
            />
            <StatTile
              label="Matured Count"
              value={invSummary.maturedInvestments ?? "—"}
              loading={invLoading}
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600">Status:</label>
            <Select
              value={invStatus || "ALL"}
              onValueChange={(v) => {
                setInvStatus(v === "ALL" ? "" : v);
                setInvPage(0);
              }}
            >
              <SelectTrigger className="w-40 bg-white border-gray-200 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="matured">Matured</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-gray-50/80">
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    ID
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Amount
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Start Date
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Maturity Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : investments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-gray-400 h-24 text-sm"
                    >
                      No investments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  investments.map((inv: AnyRecord) => (
                    <TableRow key={inv.id as string | number} className="hover:bg-gray-50/50">
                      <TableCell className="font-mono text-xs text-gray-500">
                        #{inv.id as string | number}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900 text-sm">
                        {inv.amountInKobo != null ? fmt(inv.amountInKobo as number) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            inv.status === "active"
                              ? "text-greeny border-greeny/30 bg-greeny/5 text-xs capitalize"
                              : inv.status === "matured"
                                ? "text-blue border-blue/20 bg-faintSky text-xs capitalize"
                                : "text-gray-400 border-gray-200 text-xs capitalize"
                          }
                        >
                          {String(inv.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {inv.startDate || inv.createdAt
                          ? format(
                              new Date(inv.startDate as string | number | Date || inv.createdAt as string | number | Date),
                              "dd MMM yyyy",
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {inv.maturityDate
                          ? format(new Date(inv.maturityDate as string | number | Date), "dd MMM yyyy")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <PaginationBar
              page={invPage}
              totalPages={invMeta.totalPages ?? 1}
              total={invMeta.total ?? investments.length}
              onPrev={() => setInvPage((p) => Math.max(0, p - 1))}
              onNext={() => setInvPage((p) => p + 1)}
            />
          </div>
        </TabsContent>

        {/* ─── TRANSACTIONS TAB ─────────────────────────────────────────── */}
        <TabsContent value="transactions" className="mt-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-gray-50/80">
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Reference
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Type
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Amount
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Description
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-gray-400 h-24 text-sm"
                    >
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx: AnyRecord) => (
                    <TableRow
                      key={tx.id as string | number}
                      className="hover:bg-gray-50/50"
                    >
                      <TableCell className="font-mono text-xs text-gray-500 max-w-40 truncate">
                        {String(tx.reference)}
                        {!!(tx.metadata as Record<string, unknown> | undefined)?.payoutRequestId && (
                          <span className="block text-blue text-[10px]">
                            Payout #{String((tx.metadata as Record<string, unknown>).payoutRequestId)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            tx.type === "CREDIT"
                              ? "text-greeny border-greeny/30 bg-greeny/5 text-xs"
                              : "text-red border-red/20 bg-red/5 text-xs"
                          }
                        >
                          {String(tx.type)}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`font-semibold text-sm ${String(tx.type) === "CREDIT" ? "text-greeny" : "text-red"}`}
                      >
                        {tx.amountInKobo != null ? fmt(tx.amountInKobo as number) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500 max-w-50 truncate">
                        {String(tx.description || tx.narration || "—")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            tx.status === "SUCCESS"
                              ? "text-greeny border-greeny/30 text-xs"
                              : tx.status === "PENDING"
                                ? "text-yellow border-yellow/30 text-xs"
                                : "text-gray-400 border-gray-200 text-xs"
                          }
                        >
                          {String(tx.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-400">
                        {tx.createdAt
                          ? format(new Date(tx.createdAt as string | number | Date), "dd MMM yyyy, HH:mm")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <PaginationBar
              page={txPage}
              totalPages={txMeta.totalPages ?? 1}
              total={txMeta.total ?? transactions.length}
              onPrev={() => setTxPage((p) => Math.max(0, p - 1))}
              onNext={() => setTxPage((p) => p + 1)}
            />
          </div>
        </TabsContent>

        {/* ─── INVOICES TAB ─────────────────────────────────────────────── */}
        <TabsContent value="invoices" className="mt-6">
          <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Invoices</h4>
                <p className="text-sm text-gray-500">
                  View invoices for this user and reopen manually settled paid invoices.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-600">Status:</label>
                <Select
                  value={invoiceStatus || "ALL"}
                  onValueChange={(v) => {
                    setInvoiceStatus(v === "ALL" ? "" : v);
                    setInvoicePage(0);
                  }}
                >
                  <SelectTrigger className="w-44 bg-white border-gray-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-gray-50/80">
                    <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                      Invoice
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                      Amount
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                      Due Date
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                      Paid At
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-gray-400 h-24 text-sm"
                      >
                        No invoices found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice) => {
                      const canReopen =
                        invoice.status === "paid" &&
                        invoice.settlementMode === "manual_external";
                      const isRunning =
                        reopenMutation.isPending && reopenTarget?.id === invoice.id;

                      return (
                        <TableRow key={invoice.id} className="hover:bg-gray-50/50">
                          <TableCell className="font-medium text-sm text-gray-900">
                            {invoice.invoiceNumber ?? `#${invoice.id}`}
                          </TableCell>
                          <TableCell className="text-sm text-gray-900">
                            {invoice.total != null ? fmt(invoice.total) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                invoice.status === "paid"
                                  ? "text-blue border-blue/20 bg-faintSky text-xs capitalize"
                                  : invoice.status === "overdue"
                                    ? "text-red border-red/20 bg-red/5 text-xs capitalize"
                                    : "text-gray-400 border-gray-200 text-xs capitalize"
                              }
                            >
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {invoice.dueDate
                              ? format(new Date(invoice.dueDate), "dd MMM yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {invoice.paidAt
                              ? format(new Date(invoice.paidAt), "dd MMM yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {canReopen ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 gap-1.5 whitespace-nowrap"
                                disabled={isRunning}
                                onClick={() => setReopenTarget(invoice)}
                              >
                                {isRunning ? "Reopening…" : "Reopen"}
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <PaginationBar
                page={invoicePage}
                totalPages={invoiceMeta.totalPages ?? 1}
                total={invoiceMeta.total ?? invoices.length}
                onPrev={() => setInvoicePage((p) => Math.max(0, p - 1))}
                onNext={() => setInvoicePage((p) => p + 1)}
              />
            </div>
          </div>
        </TabsContent>

        {/* ─── SAVEBOXES TAB ────────────────────────────────────────────── */}
        <TabsContent value="saveboxes" className="mt-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="font-semibold text-gray-900">
                Saveboxes{" "}
                <span className="text-gray-400 font-normal text-sm">
                  ({sbTotal} total)
                </span>
              </h4>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-gray-50/80">
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    ID
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Name
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Balance
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Target
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sbLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : saveboxes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-gray-400 h-24 text-sm"
                    >
                      No saveboxes found.
                    </TableCell>
                  </TableRow>
                ) : (
                  saveboxes.map((sb: AnyRecord) => (
                    <TableRow key={sb.id as string | number} className="hover:bg-gray-50/50">
                      <TableCell className="font-mono text-xs text-gray-500">
                        #{String(sb.id)}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900 text-sm">
                        {String(sb.name || sb.title || "—")}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900 text-sm">
                        {sb.balanceInKobo != null
                          ? fmt(sb.balanceInKobo as number)
                          : sb.balance != null
                            ? fmt(sb.balance as number)
                            : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {sb.targetAmountInKobo != null
                          ? fmt(sb.targetAmountInKobo as number)
                          : sb.targetAmount != null
                            ? fmt(sb.targetAmount as number)
                            : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            sb.status === "active"
                              ? "text-greeny border-greeny/30 bg-greeny/5 text-xs capitalize"
                              : "text-gray-400 border-gray-200 text-xs capitalize"
                          }
                        >
                          {String(sb.status || "—")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ─── EQUITY TAB ───────────────────────────────────────────────── */}
        <TabsContent value="equity" className="mt-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="font-semibold text-gray-900">
                Equity Holdings{" "}
                <span className="text-gray-400 font-normal text-sm">
                  ({eqTotal} total)
                </span>
              </h4>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-gray-50/80">
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    ID
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Listing
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Quantity
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Purchase Price
                  </TableHead>
                  <TableHead className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eqLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : equities.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-gray-400 h-24 text-sm"
                    >
                      No equity holdings found.
                    </TableCell>
                  </TableRow>
                ) : (
                  equities.map((eq: AnyRecord) => (
                    <TableRow key={eq.id as string | number} className="hover:bg-gray-50/50">
                      <TableCell className="font-mono text-xs text-gray-500">
                        #{String(eq.id)}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-900">
                        {String(
                          (eq.equityListing as Record<string, unknown> | undefined)?.name ||
                          (eq.listing as Record<string, unknown> | undefined)?.name ||
                          eq.listingId ||
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {String(eq.quantity ?? "—")}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-gray-900">
                        {eq.purchasePriceInKobo != null
                          ? fmt(eq.purchasePriceInKobo as number)
                          : eq.purchasePrice != null
                            ? fmt(eq.purchasePrice as number)
                            : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            eq.status === "active"
                              ? "text-greeny border-greeny/30 bg-greeny/5 text-xs capitalize"
                              : "text-gray-400 border-gray-200 text-xs capitalize"
                          }
                        >
                          {String(eq.status || "—")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

      </Tabs>

      {/* ── Delete Account Modal ──────────────────────────────────────── */}
      <ConfirmModal
        open={isDeleteOpen}
        onOpenChange={(v) => {
          if (!v && !deleteMutation.isPending) setIsDeleteOpen(false);
        }}
        title="Delete user account"
        message={
          <span>
            You are about to delete{" "}
            <span className="font-semibold text-gray-900">
              {profile.firstName && profile.lastName
                ? `${profile.firstName} ${profile.lastName}`
                : profile.email ?? `User #${userId}`}
            </span>
            .<br />
            <span className="text-gray-500 text-sm">
              If the account is inactive the deletion is{" "}
              <span className="font-medium text-red">permanent</span>. If the
              account has verified details or financial history it will be{" "}
              <span className="font-medium text-amber-600">deactivated</span>{" "}
              and records will be preserved for compliance.
            </span>
          </span>
        }
        confirmLabel="Yes, delete account"
        cancelLabel="Cancel"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        danger
      />

      <ConfirmModal
        open={!!reopenTarget}
        onOpenChange={(v) => {
          if (!v && !reopenMutation.isPending) setReopenTarget(null);
        }}
        title="Reopen paid invoice"
        message={
          reopenTarget
            ? `This will reverse the manual settlement for ${reopenTarget.invoiceNumber ?? `invoice #${reopenTarget.id}`} and set it back to Sent or Overdue. This action cannot be undone.`
            : undefined
        }
        confirmLabel="Reopen invoice"
        cancelLabel="Cancel"
        reasonField
        reasonLabel="Reason for reopening"
        reasonRequired
        loading={reopenMutation.isPending}
        onConfirm={(reason) => {
          if (reopenTarget && reason) {
            reopenMutation.mutate({ id: reopenTarget.id, reason });
          }
        }}
      />

      {/* ── Edit User Modal ─────────────────────────────────────────────────── */}
      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) editForm.reset(); }}>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((v) => updateMutation.mutate(v))}
              className="space-y-4 pt-2"
            >
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl><Input disabled {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl><Input disabled {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" disabled {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl><Input type="tel" placeholder="e.g. +2348012345678" disabled {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={profile.role?.toUpperCase() !== "USER"}
                    >
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                      </SelectContent>
                    </Select>
                    {profile.role?.toUpperCase() !== "USER" && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        Only regular users can be elevated. Elevated roles cannot be demoted or changed.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-blue text-white"
                disabled={updateMutation.isPending || profile.role?.toUpperCase() !== "USER"}
              >
                {updateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : "Save Changes"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Communicate modal ──────────────────────────────────────────────── */}
      <CommunicateModal
        open={isCommunicateOpen}
        onOpenChange={setIsCommunicateOpen}
        defaultTarget="SPECIFIC_USERS"
        preselectedUsers={
          profile.email
            ? [
                {
                  id: userId,
                  email: profile.email,
                  firstName: profile.firstName,
                  lastName: profile.lastName,
                },
              ]
            : []
        }
      />
    </div>
  );
}
