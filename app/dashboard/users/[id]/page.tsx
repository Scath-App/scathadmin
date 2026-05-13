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
} from "@/lib/userService";
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
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Loader2 } from "lucide-react";
import { format } from "date-fns";

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

  // Pagination state
  const [invPage, setInvPage] = useState(0);
  const [txPage, setTxPage] = useState(0);
  const [sbPage, setSbPage] = useState(0);
  const [eqPage, setEqPage] = useState(0);
  const [invStatus, setInvStatus] = useState<string>("");

  // ─── Profile query ────────────────────────────────────────────────────────
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => getUserById(userId),
    enabled: !!userId,
  });

  const profile: any = profileData?.data ?? profileData ?? {};

  // ─── Edit form ────────────────────────────────────────────────────────────
  const editForm = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema) as any,
    values: {
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      email: profile.email ?? "",
      phoneNumber: profile.phoneNumber ?? "",
      role: profile.role?.toLowerCase() ?? "user",
    },
  });

  // ─── Update mutation ─────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (v: z.infer<typeof editUserSchema>) => updateUser(userId, v),
    onSuccess: () => {
      toast.success("User details updated.");
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message ?? "Failed to update user.");
    },
  });

  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ["userAccounts", userId],
    queryFn: () => getUserAccounts(userId),
    enabled: !!userId,
  });

  const userAccounts: any[] = Array.isArray(accountsData)
    ? accountsData
    : accountsData?.data ?? [];

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

  const investments: any[] = invData?.data || [];
  const invMeta = invData?.meta || {};
  const invSummary = invData?.summary || {};

  const transactions: any[] = txData?.data || [];
  const txMeta = txData?.meta || {};

  const saveboxes: any[] =
    sbData?.data || Array.isArray(sbData)
      ? (Array.isArray(sbData) ? sbData : sbData?.data) || []
      : [];
  const sbTotal = sbData?.total ?? saveboxes.length;

  const equities: any[] =
    eqData?.data || Array.isArray(eqData)
      ? (Array.isArray(eqData) ? eqData : eqData?.data) || []
      : [];
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
      <div className="flex items-center justify-between gap-4">
        <div>
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
            <p className="text-gray-500 text-sm mt-0.5">
              {profile.email ?? `User ID: ${userId}`}
              {profile.phoneNumber && (
                <span className="ml-3 text-gray-400">{profile.phoneNumber}</span>
              )}
            </p>
          )}
        </div>
        <Button
          size="sm"
          className="bg-blue hover:bg-darkBlue text-white gap-2 shrink-0"
          onClick={() => setIsEditOpen(true)}
          disabled={profileLoading}
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit Details
        </Button>
      </div>

      <Tabs defaultValue="investments" className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-xl w-full max-w-[600px] grid grid-cols-5">
          {[
            { value: "investments", label: "Investments" },
            { value: "transactions", label: "Transactions" },
            { value: "saveboxes", label: "Saveboxes" },
            { value: "equity", label: "Equity" },
            { value: "accounts", label: "Accounts" },
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
              <SelectTrigger className="w-[160px] bg-white border-gray-200 text-sm">
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
                  investments.map((inv: any) => (
                    <TableRow key={inv.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-mono text-xs text-gray-500">
                        #{inv.id}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900 text-sm">
                        {inv.amountInKobo != null ? fmt(inv.amountInKobo) : "—"}
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
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {inv.startDate || inv.createdAt
                          ? format(
                              new Date(inv.startDate || inv.createdAt),
                              "dd MMM yyyy",
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {inv.maturityDate
                          ? format(new Date(inv.maturityDate), "dd MMM yyyy")
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
                  transactions.map((tx: any) => (
                    <TableRow
                      key={tx.reference}
                      className="hover:bg-gray-50/50"
                    >
                      <TableCell className="font-mono text-xs text-gray-500 max-w-[160px] truncate">
                        {tx.reference}
                        {tx.metadata?.payoutRequestId && (
                          <span className="block text-blue text-[10px]">
                            Payout #{tx.metadata.payoutRequestId}
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
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`font-semibold text-sm ${tx.type === "CREDIT" ? "text-greeny" : "text-red"}`}
                      >
                        {tx.amountInKobo != null ? fmt(tx.amountInKobo) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500 max-w-[200px] truncate">
                        {tx.description || tx.narration || "—"}
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
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-400">
                        {tx.createdAt
                          ? format(new Date(tx.createdAt), "dd MMM yyyy, HH:mm")
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
                  saveboxes.map((sb: any) => (
                    <TableRow key={sb.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-mono text-xs text-gray-500">
                        #{sb.id}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900 text-sm">
                        {sb.name || sb.title || "—"}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900 text-sm">
                        {sb.balanceInKobo != null
                          ? fmt(sb.balanceInKobo)
                          : sb.balance != null
                            ? fmt(sb.balance)
                            : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {sb.targetAmountInKobo != null
                          ? fmt(sb.targetAmountInKobo)
                          : sb.targetAmount != null
                            ? fmt(sb.targetAmount)
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
                          {sb.status || "—"}
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
                  equities.map((eq: any) => (
                    <TableRow key={eq.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-mono text-xs text-gray-500">
                        #{eq.id}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-900">
                        {eq.equityListing?.name ||
                          eq.listing?.name ||
                          eq.listingId ||
                          "—"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {eq.quantity ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-gray-900">
                        {eq.purchasePriceInKobo != null
                          ? fmt(eq.purchasePriceInKobo)
                          : eq.purchasePrice != null
                            ? fmt(eq.purchasePrice)
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
                          {eq.status || "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ─── ACCOUNTS TAB ─────────────────────────────────────────────── */}
        <TabsContent value="accounts" className="mt-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="font-semibold text-gray-900">
                Platform Accounts{" "}
                <span className="text-gray-400 font-normal text-sm">
                  ({userAccounts.length} linked)
                </span>
              </h4>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-gray-50/80">
                  {["Account Number", "Name", "Type", "Balance", "Status"].map((h) => (
                    <TableHead key={h} className="font-semibold text-gray-700 text-xs uppercase tracking-wide">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}><Skeleton className="h-4 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : userAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400 h-20 text-sm">
                      No platform accounts linked.
                    </TableCell>
                  </TableRow>
                ) : (
                  userAccounts.map((acc: any) => (
                    <TableRow key={acc.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-mono text-sm">{acc.accountNumber ?? "—"}</TableCell>
                      <TableCell className="font-medium text-sm text-gray-900">{acc.accountName ?? "—"}</TableCell>
                      <TableCell className="text-sm text-gray-500">{acc.accountType ?? "—"}</TableCell>
                      <TableCell className="font-semibold text-sm text-gray-900">
                        {acc.balanceInNaira != null ? `₦${Number(acc.balanceInNaira).toLocaleString("en-NG", { minimumFractionDigits: 2 })}` : acc.balance != null ? fmt(acc.balance) : "—"}
                      </TableCell>
                      <TableCell>{acc.status ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

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
                      <FormControl><Input {...field} /></FormControl>
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
                      <FormControl><Input {...field} /></FormControl>
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
                    <FormControl><Input type="email" {...field} /></FormControl>
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
                    <FormControl><Input type="tel" placeholder="e.g. +2348012345678" {...field} /></FormControl>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-blue text-white"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : "Save Changes"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
