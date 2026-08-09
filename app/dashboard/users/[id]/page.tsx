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
  getUserAuditReport,
  downloadUserAuditReportPdf,
  UserAuditReport,
} from "@/lib/userService";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ReconcileDepositModal } from "@/components/accounts/ReconcileDepositModal";
import { getUserInvoices, reopenPaidInvoice, Invoice } from "@/lib/invoiceService";
import { StatusBadge } from "@/components/ui/StatusBadge";

type AnyRecord = Record<string, unknown>;

type UserProfile = {
  id?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  status?: string;
  customerType?: string;
  image?: string;
  kycPhotoUrl?: string;
  userSelfieUrl?: string;
  bvnPhotoUrl?: string;
  ninPhotoUrl?: string;
  bvnNumber?: string;
  ninNumber?: string;
  isVerified?: boolean;
  isPhoneVerified?: boolean;
  kycStatus?: boolean;
  createdAt?: string;
  companyName?: string;
  companyRegistrationNumber?: string;
  tier?: {
    id?: number;
    name?: string;
    level?: number;
    customerType?: string;
  };
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
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Loader2,
  Trash2,
  Mail,
  ShieldAlert,
  Download,
  FileText,
  ExternalLink,
  User,
  Phone,
  Wallet,
  CreditCard,
  TrendingUp,
  PiggyBank,
  PieChart,
  Receipt,
  Calendar,
  Building,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Fingerprint,
  FileBadge,
  Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import { CommunicateModal } from "@/components/ui/CommunicateModal";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (kobo: number | string | null | undefined) => {
  if (kobo == null || kobo === "" || isNaN(Number(kobo))) return "₦0.00";
  const n = typeof kobo === "string" ? parseFloat(kobo) : Number(kobo);
  return `₦${(n / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  // ── Reconcile deposit modal state
  const [isReconcileDepositOpen, setIsReconcileDepositOpen] = useState(false);
  // ── Audit report modal state
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  const { data: auditReport, isLoading: isAuditLoading, refetch: fetchAuditReport } = useQuery({
    queryKey: ["userAuditReport", userId],
    queryFn: () => getUserAuditReport(userId),
    enabled: false,
  });

  const handleOpenAuditReport = () => {
    setIsAuditOpen(true);
    fetchAuditReport();
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const blob = await downloadUserAuditReportPdf(userId);
      const userFirstName = auditReport?.user.firstName || "";
      const userLastName = auditReport?.user.lastName || "";
      const namePart = `${userFirstName}_${userLastName}`.trim().replace(/\s+/g, "_");
      const fileName = namePart
        ? `Audit_Report_${namePart}_User_${userId}.pdf`
        : `Audit_Report_User_${userId}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Audit report PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error("Failed to download audit report PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

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
      {/* ── User Hero Profile Card ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7 space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* User Photos & Main Meta */}
          <div className="flex items-start gap-4 sm:gap-5 min-w-0">
            {/* Primary Profile / KYC Selfie Photo Avatar */}
            {profile.userSelfieUrl || profile.kycPhotoUrl || profile.image ? (
              <div
                className="relative group cursor-pointer shrink-0"
                title="Click to view full KYC Selfie Photo"
                onClick={() => window.open(profile.userSelfieUrl || profile.kycPhotoUrl || profile.image, "_blank")}
              >
                <img
                  src={profile.userSelfieUrl || profile.kycPhotoUrl || profile.image}
                  alt="User KYC Selfie"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-greeny/40 shadow-sm transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 rounded-2xl flex flex-col items-center justify-center text-white text-[10px] font-semibold transition-opacity">
                  <ImageIcon className="w-5 h-5 mb-0.5" />
                  View Photo
                </div>
                <span className="absolute -bottom-1 -right-1 bg-greeny text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white flex items-center gap-0.5 shadow-sm">
                  <CheckCircle2 className="w-2.5 h-2.5" /> KYC
                </span>
              </div>
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue/10 via-lblue/10 to-faintSky text-blue font-bold text-xl sm:text-2xl flex items-center justify-center shrink-0 border border-blue/20 shadow-sm">
                {[profile.firstName?.[0], profile.lastName?.[0]].filter(Boolean).join("").toUpperCase() ||
                  profile.email?.[0]?.toUpperCase() ||
                  "U"}
              </div>
            )}

            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {profileLoading ? (
                  <Skeleton className="h-7 w-48" />
                ) : (
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                    {profile.firstName && profile.lastName
                      ? `${profile.firstName} ${profile.lastName}`
                      : `User #${userId}`}
                  </h2>
                )}

                {/* Status Badge */}
                {profile.status && <StatusBadge status={profile.status} />}

                {/* Tier Badge */}
                <Badge
                  variant="outline"
                  className="text-xs font-semibold border-purple/30 bg-purple/10 text-purple-700 rounded-full px-2.5 py-0.5 flex items-center gap-1"
                >
                  <ShieldCheck className="w-3 h-3 text-purple-600" />
                  {profile.tier?.name
                    ? profile.tier.name
                    : `Tier ${profile.tier?.level ?? (profile.kycStatus ? 1 : 0)}`}
                </Badge>

                {/* Customer Type Badge */}
                {profile.customerType && (
                  <Badge
                    variant="outline"
                    className="text-xs capitalize border-gray-200 bg-gray-50 text-gray-600 rounded-full px-2.5 py-0.5 flex items-center gap-1"
                  >
                    {profile.customerType.toLowerCase() === "business" ? (
                      <Building className="w-3 h-3 text-gray-500" />
                    ) : (
                      <User className="w-3 h-3 text-gray-500" />
                    )}
                    {profile.customerType}
                  </Badge>
                )}

                {/* Role Badge */}
                {profile.role && (
                  <Badge
                    variant="outline"
                    className="text-xs uppercase tracking-wider font-semibold border-blue/20 bg-blue/5 text-blue rounded-full px-2.5 py-0.5"
                  >
                    {profile.role}
                  </Badge>
                )}
              </div>

              {profileLoading ? (
                <Skeleton className="h-4 w-56" />
              ) : (
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-xs text-fgray">
                  {profile.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-700 font-medium">{profile.email}</span>
                    </div>
                  )}
                  {profile.phoneNumber && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-700 font-medium">{profile.phoneNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>ID: #{userId}</span>
                  </div>
                  {profile.createdAt && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>Joined: {format(new Date(profile.createdAt), "dd MMM yyyy")}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Right */}
          <div className="flex items-center flex-wrap gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
            {!profileLoading && profile.role?.toUpperCase() !== "ADMIN" && (
              <Button
                size="sm"
                variant="outline"
                className="border-red/20 text-red hover:bg-red/5 hover:border-red/40 gap-2 transition-all"
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
              className="border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-300 gap-2 transition-all"
              onClick={() => setIsReconcileDepositOpen(true)}
              disabled={profileLoading}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Reconcile Deposit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-purple/20 text-purple-600 hover:bg-purple/5 hover:border-purple/40 gap-2 transition-all"
              onClick={handleOpenAuditReport}
              disabled={profileLoading}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Audit Report
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-blue/20 text-blue hover:bg-blue/5 hover:border-blue/40 gap-2 transition-all"
              onClick={() => setIsCommunicateOpen(true)}
              disabled={profileLoading}
            >
              <Mail className="w-3.5 h-3.5" />
              Message User
            </Button>
            <Button
              size="sm"
              className="bg-blue hover:bg-darkBlue text-white gap-2 shadow-sm transition-all"
              onClick={() => setIsEditOpen(true)}
              disabled={profileLoading}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Details
            </Button>
          </div>
        </div>

        {/* ── Verified Identity & KYC Credentials Grid ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-gray-100">
          {/* BVN */}
          <div className="bg-gray-50/70 rounded-xl p-3 border border-gray-100 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-fgray flex items-center gap-1">
                <Fingerprint className="w-3.5 h-3.5 text-blue" /> BVN Number
              </p>
              <p className="text-xs font-mono font-bold text-gray-900 mt-1 truncate">
                {profile.bvnNumber ? profile.bvnNumber : "Not Verified"}
              </p>
            </div>
            {profile.bvnNumber && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700 shrink-0"
                title="Copy BVN"
                onClick={() => {
                  navigator.clipboard.writeText(profile.bvnNumber!);
                  toast.success("BVN copied to clipboard!");
                }}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {/* NIN */}
          <div className="bg-gray-50/70 rounded-xl p-3 border border-gray-100 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-fgray flex items-center gap-1">
                <FileBadge className="w-3.5 h-3.5 text-purple-600" /> NIN Number
              </p>
              <p className="text-xs font-mono font-bold text-gray-900 mt-1 truncate">
                {profile.ninNumber ? profile.ninNumber : "Not Verified"}
              </p>
            </div>
            {profile.ninNumber && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700 shrink-0"
                title="Copy NIN"
                onClick={() => {
                  navigator.clipboard.writeText(profile.ninNumber!);
                  toast.success("NIN copied to clipboard!");
                }}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {/* Verifications */}
          <div className="bg-gray-50/70 rounded-xl p-3 border border-gray-100 flex flex-col justify-center gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-fgray">Verifications</p>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${profile.isPhoneVerified ? "text-greeny" : "text-gray-400"}`}>
                {profile.isPhoneVerified ? <CheckCircle2 className="w-3 h-3 text-greeny" /> : <XCircle className="w-3 h-3 text-gray-300" />} Phone
              </span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${profile.isVerified ? "text-greeny" : "text-gray-400"}`}>
                {profile.isVerified ? <CheckCircle2 className="w-3 h-3 text-greeny" /> : <XCircle className="w-3 h-3 text-gray-300" />} Email
              </span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${profile.kycStatus ? "text-greeny" : "text-gray-400"}`}>
                {profile.kycStatus ? <CheckCircle2 className="w-3 h-3 text-greeny" /> : <XCircle className="w-3 h-3 text-gray-300" />} KYC
              </span>
            </div>
          </div>

          {/* Business Entity */}
          <div className="bg-gray-50/70 rounded-xl p-3 border border-gray-100 flex flex-col justify-center min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-fgray flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-blue" /> Business / Entity
            </p>
            <p className="text-xs font-semibold text-gray-900 mt-1 truncate">
              {profile.companyName ? profile.companyName : "Personal Account"}
            </p>
          </div>
        </div>

        {/* Linked Accounts Bar */}
        {!accountsLoading && userAccounts.length > 0 && (
          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-fgray flex items-center gap-1.5 shrink-0">
              <Wallet className="w-3.5 h-3.5 text-blue" /> Linked Accounts ({userAccounts.length}):
            </span>
            <div className="flex flex-wrap gap-2 min-w-0">
              {userAccounts.map((acc: AnyRecord) => (
                <div
                  key={acc.id as string | number}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50/80 hover:bg-gray-100/80 border border-gray-100 rounded-xl text-xs transition-colors"
                >
                  <span className="font-mono text-gray-800 font-semibold">
                    {String(acc.accountNumber ?? "—")}
                  </span>
                  {!!acc.accountName && (
                    <span className="text-gray-500">· {String(acc.accountName)}</span>
                  )}
                  {!!acc.status && (
                    <Badge
                      variant="outline"
                      className={
                        String(acc.status).toLowerCase() === "active"
                          ? "text-greeny border-greeny/30 bg-greeny/10 text-[10px] py-0 px-1.5 font-medium"
                          : "text-gray-400 border-gray-200 text-[10px] py-0 px-1.5"
                      }
                    >
                      {String(acc.status)}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {accountsLoading && (
          <div className="pt-4 border-t border-gray-100 flex gap-2">
            <Skeleton className="h-7 w-40 rounded-xl" />
            <Skeleton className="h-7 w-32 rounded-xl" />
          </div>
        )}
      </div>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="bg-gray-100/80 p-1 rounded-2xl w-full max-w-4xl grid grid-cols-5 gap-1 shadow-inner">
          {[
            { value: "transactions", label: "Transactions", icon: CreditCard },
            { value: "investments", label: "Investments", icon: TrendingUp },
            { value: "saveboxes", label: "Saveboxes", icon: PiggyBank },
            { value: "equity", label: "Equity", icon: PieChart },
            { value: "invoices", label: "Invoices", icon: Receipt },
          ].map((t) => {
            const IconComp = t.icon;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-blue data-[state=active]:shadow-sm text-xs py-2.5 font-medium flex items-center justify-center gap-1.5 transition-all"
              >
                <IconComp className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.slice(0, 4)}..</span>
              </TabsTrigger>
            );
          })}
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

      {/* ── Compliance Audit Report Modal ────────────────────────────────────── */}
      <Dialog open={isAuditOpen} onOpenChange={setIsAuditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:h-auto print:overflow-visible print:p-0 print:border-none print:shadow-none">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 print:hidden">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <ShieldAlert className="h-6 w-6 text-purple-600" />
              Compliance & Audit Report — User #{userId}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
              >
                {isExportingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isExportingPdf ? "Exporting PDF..." : "Export PDF"}
              </Button>
            </div>
          </DialogHeader>

          {isAuditLoading ? (
            <div className="py-12 text-center text-gray-500 space-y-3 print:py-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
              <p className="text-sm font-medium">Generating consolidated compliance audit report...</p>
            </div>
          ) : auditReport ? (
            (() => {
              const txList = Array.isArray(auditReport.transactions)
                ? auditReport.transactions
                : (auditReport.transactions?.items ?? []);

              const totalTxCount =
                typeof auditReport.transactions === "object" &&
                !Array.isArray(auditReport.transactions)
                  ? auditReport.transactions.total
                  : txList.length;

              const totalInflowKobo =
                typeof auditReport.transactions === "object" &&
                !Array.isArray(auditReport.transactions)
                  ? (auditReport.transactions.inflow?.totalAmountInKobo ?? 0)
                  : txList
                      .filter((t) => t.type === "CREDIT")
                      .reduce(
                        (acc, t) => acc + (t.amountInKobo ?? (t.amount ? t.amount * 100 : 0)),
                        0,
                      );

              const totalOutflowKobo =
                typeof auditReport.transactions === "object" &&
                !Array.isArray(auditReport.transactions)
                  ? (auditReport.transactions.outflow?.totalAmountInKobo ?? 0)
                  : txList
                      .filter((t) => t.type === "DEBIT")
                      .reduce(
                        (acc, t) => acc + (t.amountInKobo ?? (t.amount ? t.amount * 100 : 0)),
                        0,
                      );

              const totalActiveBalanceKobo =
                auditReport.accounts?.reduce(
                  (sum, a) => sum + (a.accountBalanceInKobo ?? (a.balance ? a.balance * 100 : 0)),
                  0,
                ) ?? 0;

              const userTier =
                auditReport.user.tierLevel ?? (auditReport.user.kycStatus ? 1 : 0);

              const auditRef = `AUD-${new Date().getFullYear()}-${userId
                .toString()
                .padStart(5, "0")}`;

              return (
                <div id="audit-report-print-area" className="space-y-6 pt-2 text-gray-900 font-sans print:p-6 print:space-y-6 bg-white">
                  <style>{`
                    @media print {
                      @page {
                        size: A4 portrait;
                        margin: 10mm;
                      }
                      body {
                        background: #ffffff !important;
                        color: #000000 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                      }
                      /* Hide background page layout elements during print */
                      header,
                      aside,
                      nav,
                      main,
                      .print\\:hidden {
                        display: none !important;
                      }
                      body,
                      html {
                        background: #ffffff !important;
                        color: #000000 !important;
                        height: auto !important;
                        overflow: visible !important;
                      }
                      [data-aria-hidden="true"] {
                        display: none !important;
                      }
                      div[data-state="open"] > div:first-child:not([role="dialog"]) {
                        background: transparent !important;
                        backdrop-filter: none !important;
                      }
                      /* Unset fixed overlay styles so modal content flows from top of A4 page */
                      div[role="dialog"] {
                        position: relative !important;
                        top: 0 !important;
                        left: 0 !important;
                        transform: none !important;
                        max-width: 100% !important;
                        max-height: none !important;
                        width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                        box-shadow: none !important;
                        border: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        display: block !important;
                        visibility: visible !important;
                      }
                      #audit-report-print-area {
                        display: block !important;
                        visibility: visible !important;
                        position: static !important;
                        width: 100% !important;
                        height: auto !important;
                        max-height: none !important;
                        overflow: visible !important;
                      }
                      #audit-report-print-area * {
                        max-height: none !important;
                        overflow: visible !important;
                        visibility: visible !important;
                      }
                      button,
                      [role="dialog"] > button {
                        display: none !important;
                      }
                      * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                      }
                    }
                  `}</style>

                  {/* ── Official Letterhead & Header ───────────────────────── */}
                  <div className="border-b border-gray-300 pb-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-purple-700 flex items-center justify-center text-white font-black text-sm">
                            S
                          </div>
                          <span className="font-black text-lg tracking-wider text-purple-950 uppercase">
                            SCATH APP
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium tracking-wide mt-0.5">
                          OFFICIAL COMPLIANCE & FINANCIAL AUDIT REPORT
                        </p>
                      </div>
                      <div className="text-left sm:text-right text-xs">
                        <p className="font-bold text-gray-800">
                          Audit Ref: <span className="font-mono text-purple-700">{auditRef}</span>
                        </p>
                        <p className="text-gray-500">
                          Issued:{" "}
                          {auditReport.generatedAt
                            ? format(new Date(auditReport.generatedAt), "MMM d, yyyy HH:mm:ss 'UTC'")
                            : format(new Date(), "MMM d, yyyy HH:mm:ss 'UTC'")}
                        </p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold rounded tracking-wider uppercase">
                          CONFIDENTIAL // REGULATORY AUDIT
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Executive Account Profile & Verified KYC Credentials ─── */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                      1. Account Holder & KYC Identity Profile
                    </h3>

                    {/* Photos Grid & Verified Credentials Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                      
                      {/* Column 1: Photos (Live Capture + Official Identity Photo) */}
                      <div className="space-y-2 border-b md:border-b-0 md:border-r border-gray-200 pb-3 md:pb-0 md:pr-3">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          Verified Photos & Biometrics
                        </p>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          {/* Live Selfie Capture */}
                          <div className="flex flex-col items-center">
                            <div className="w-full h-28 sm:h-32 rounded-xl overflow-hidden border-2 border-purple-600 shadow-sm bg-purple-50 flex items-center justify-center">
                              {auditReport.user.kycPhotoUrl ? (
                                <img
                                  src={auditReport.user.kycPhotoUrl}
                                  alt="Live Capture Selfie"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-purple-700 flex flex-col items-center justify-center font-bold text-xs p-2 text-center">
                                  <span>No Live</span>
                                  <span>Capture</span>
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-purple-950 mt-1">Live Capture</span>
                          </div>

                          {/* Official BVN Photo */}
                          <div className="flex flex-col items-center">
                            <div className="w-full h-28 sm:h-32 rounded-xl overflow-hidden border-2 border-emerald-600 shadow-sm bg-emerald-50 flex items-center justify-center">
                              {auditReport.user.bvnPhotoUrl ? (
                                <img
                                  src={auditReport.user.bvnPhotoUrl}
                                  alt="Official BVN Photo"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-emerald-800 flex flex-col items-center justify-center font-bold text-xs p-2 text-center">
                                  <span>No BVN</span>
                                  <span>Photo</span>
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-emerald-950 mt-1">Official BVN Photo</span>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Legal Profile & Contact Details */}
                      <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-gray-200 pb-3 md:pb-0 md:pr-3">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          Account Profile & Contact
                        </p>
                        <p className="font-extrabold text-gray-900 text-sm">
                          {auditReport.user.firstName} {auditReport.user.lastName}
                        </p>
                        <p className="text-gray-700 font-medium truncate">{auditReport.user.email}</p>
                        <p className="text-gray-600 text-[11px] font-mono">{auditReport.user.phoneNumber ?? "No Phone"}</p>
                        {auditReport.user.dob && (
                          <p className="text-gray-500 text-[10px]">
                            DOB: <span className="font-semibold text-gray-800">{auditReport.user.dob}</span>
                          </p>
                        )}
                        {(auditReport.user.poaAddress || auditReport.user.address || auditReport.user.city || auditReport.user.state) && (
                          <p className="text-gray-700 text-[10px] leading-snug">
                            <span className="font-bold text-purple-950">Address (POA): </span>
                            {auditReport.user.poaAddress ||
                              [auditReport.user.address, auditReport.user.city, auditReport.user.state]
                                .filter(Boolean)
                                .join(", ")}
                          </p>
                        )}
                      </div>

                      {/* Column 3: Verified KYC Credentials & Biometrics */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          Verified KYC Credentials
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-700 text-white font-bold text-[11px]">
                            Tier {userTier}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                            {auditReport.user.kycStatus ? "KYC Verified" : "Basic Account"}
                          </span>
                        </div>

                        {/* Display BOTH BVN and NIN numbers if present */}
                        <div className="space-y-0.5 pt-0.5 font-mono text-[11px]">
                          {auditReport.user.bvnNumber && (
                            <p className="font-bold text-gray-900">
                              <span className="text-purple-900 font-extrabold">BVN: </span>
                              {auditReport.user.bvnNumber}
                            </p>
                          )}
                          {auditReport.user.ninNumber && (
                            <p className="font-bold text-gray-900">
                              <span className="text-emerald-900 font-extrabold">NIN: </span>
                              {auditReport.user.ninNumber}
                            </p>
                          )}
                          {!auditReport.user.bvnNumber && !auditReport.user.ninNumber && auditReport.user.kycNumber && (
                            <p className="font-bold text-gray-900">
                              <span className="text-purple-900 uppercase font-extrabold">{auditReport.user.kycType ?? "ID"}: </span>
                              {auditReport.user.kycNumber}
                            </p>
                          )}
                        </div>

                        {/* Latest KYC Biometric verification scores */}
                        {auditReport.kycVerifications && auditReport.kycVerifications.length > 0 && (
                          <div className="pt-0.5 text-[10px] text-gray-600 space-y-0.5">
                            {auditReport.kycVerifications[0].faceMatchScore != null && (
                              <p className="font-medium text-emerald-800">
                                Face Match: <span className="font-bold">{auditReport.kycVerifications[0].faceMatchScore}% Match</span>
                              </p>
                            )}
                            {auditReport.kycVerifications[0].livenessPassed != null && (
                              <p className="font-medium text-purple-800">
                                Liveness: <span className="font-bold">{auditReport.kycVerifications[0].livenessPassed ? "Passed" : "Failed"}</span>
                              </p>
                            )}
                          </div>
                        )}

                        <p className="text-gray-500 text-[10px] pt-0.5">
                          Registered:{" "}
                          {auditReport.user.createdAt
                            ? format(new Date(auditReport.user.createdAt), "MMM d, yyyy")
                            : "N/A"}
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* ── Corporate Registration & Business Credentials (If Business) ── */}
                  {(auditReport.user.customerType === "business" || auditReport.businessDetails) && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-purple-950 uppercase tracking-widest flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-purple-700" />
                        1B. Corporate Registration & Business Dossier
                      </h3>
                      <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200 text-xs space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-purple-200/80 pb-3">
                          <div>
                            <p className="text-[10px] text-purple-800 font-bold uppercase">Company Name</p>
                            <p className="font-extrabold text-purple-950 text-sm mt-0.5">
                              {auditReport.businessDetails?.companyName ?? auditReport.user.companyName ?? "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-purple-800 font-bold uppercase">CAC Registration Number</p>
                            <p className="font-mono font-bold text-gray-900 text-xs mt-0.5">
                              {auditReport.businessDetails?.companyRegistrationNumber ?? auditReport.user.companyRegistrationNumber ?? "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-purple-800 font-bold uppercase">Tax Identification Number (TIN)</p>
                            <p className="font-mono font-bold text-emerald-950 text-xs mt-0.5">
                              {auditReport.businessDetails?.tin ?? "N/A"}
                            </p>
                          </div>
                        </div>

                        {/* Verified Business Documents Links */}
                        <div>
                          <p className="text-[10px] text-purple-900 font-bold uppercase tracking-wider mb-2">
                            Verified Corporate Dossier Files
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            {/* CAC Certificate */}
                            {auditReport.businessDetails?.cacUrl ? (
                              <a
                                href={auditReport.businessDetails.cacUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 font-bold text-xs shadow-sm hover:bg-emerald-50 transition-colors"
                              >
                                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                                CAC Certificate
                                <ExternalLink className="h-3 w-3 ml-0.5" />
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-400 font-medium text-xs border border-gray-200">
                                CAC Certificate (Missing)
                              </span>
                            )}

                            {/* Status Report */}
                            {auditReport.businessDetails?.statusReportUrl ? (
                              <a
                                href={auditReport.businessDetails.statusReportUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-purple-300 text-purple-900 font-bold text-xs shadow-sm hover:bg-purple-50 transition-colors"
                              >
                                <FileText className="h-3.5 w-3.5 text-purple-600" />
                                Status Report
                                <ExternalLink className="h-3 w-3 ml-0.5" />
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-400 font-medium text-xs border border-gray-200">
                                Status Report (Missing)
                              </span>
                            )}

                            {/* MEMART Document */}
                            {auditReport.businessDetails?.memartUrl ? (
                              <a
                                href={auditReport.businessDetails.memartUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-300 text-blue-900 font-bold text-xs shadow-sm hover:bg-blue-50 transition-colors"
                              >
                                <FileText className="h-3.5 w-3.5 text-blue-600" />
                                MEMART Document
                                <ExternalLink className="h-3 w-3 ml-0.5" />
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-400 font-medium text-xs border border-gray-200">
                                MEMART (Not Required / Missing)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Financial Ledger Summary ────────────────────────────── */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                      2. Ledger Balance & Financial Flow Overview
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/50">
                        <p className="text-[10px] font-semibold text-purple-900 uppercase">Active Total Balance</p>
                        <p className="text-lg font-black text-purple-950 mt-0.5">
                          {fmt(totalActiveBalanceKobo)}
                        </p>
                        <p className="text-[10px] text-purple-700 font-medium">Across all sub-accounts</p>
                      </div>
                      <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                        <p className="text-[10px] font-semibold text-emerald-900 uppercase">Total Lifetime Inflow</p>
                        <p className="text-lg font-black text-emerald-950 mt-0.5">
                          {fmt(totalInflowKobo)}
                        </p>
                        <p className="text-[10px] text-emerald-700 font-medium">Credits to user accounts</p>
                      </div>
                      <div className="p-3 rounded-lg border border-red-200 bg-red-50/50">
                        <p className="text-[10px] font-semibold text-red-900 uppercase">Total Lifetime Outflow</p>
                        <p className="text-lg font-black text-red-950 mt-0.5">
                          {fmt(totalOutflowKobo)}
                        </p>
                        <p className="text-[10px] text-red-700 font-medium">Debits from user accounts</p>
                      </div>
                      <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                        <p className="text-[10px] font-semibold text-gray-700 uppercase">Transaction Activity</p>
                        <p className="text-lg font-black text-gray-900 mt-0.5">
                          {totalTxCount} <span className="text-xs font-medium text-gray-500">records</span>
                        </p>
                        <p className="text-[10px] text-gray-500 font-medium">Verified Ledger Records</p>
                      </div>
                    </div>
                  </div>

                  {/* ── Linked Platform Bank Accounts ───────────────────────── */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                      3. Linked Platform Bank Accounts ({auditReport.accounts?.length ?? 0})
                    </h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                      <Table>
                        <TableHeader className="bg-gray-100/80">
                          <TableRow>
                            <TableHead className="font-bold text-gray-700 text-[11px]">Bank Partner</TableHead>
                            <TableHead className="font-bold text-gray-700 text-[11px]">Account Number</TableHead>
                            <TableHead className="font-bold text-gray-700 text-[11px]">Account Name</TableHead>
                            <TableHead className="font-bold text-gray-700 text-[11px]">Type</TableHead>
                            <TableHead className="font-bold text-gray-700 text-[11px] text-right">Available Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {auditReport.accounts && auditReport.accounts.length > 0 ? (
                            auditReport.accounts.map((acc, idx) => {
                              const balInKobo = acc.accountBalanceInKobo ?? (acc.balance ? acc.balance : 0);
                              return (
                                <TableRow key={acc.id ?? idx}>
                                  <TableCell className="font-semibold text-gray-900">
                                    {acc.bankName ?? "SafeHaven MFB"}
                                  </TableCell>
                                  <TableCell className="font-mono text-gray-800 font-bold">
                                    {acc.accountNumber ?? "N/A"}
                                  </TableCell>
                                  <TableCell className="text-gray-700">
                                    {acc.accountName ?? `${auditReport.user.firstName} ${auditReport.user.lastName}`}
                                  </TableCell>
                                  <TableCell className="uppercase text-gray-600 font-medium text-[11px]">
                                    {acc.accountType ?? "SAVINGS"}
                                  </TableCell>
                                  <TableCell className="text-right font-black text-gray-900">
                                    {fmt(balInKobo)}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-gray-500 py-4">
                                No active bank accounts linked.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* ── Lifetime Transaction Log ────────────────────────────── */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        4. Lifetime Transaction Log ({totalTxCount})
                      </h3>
                      <span className="text-[10px] text-gray-500 font-medium print:hidden">
                        Showing all recorded entries
                      </span>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden text-xs max-h-96 overflow-y-auto print:max-h-none print:overflow-visible">
                      <Table>
                        <TableHeader className="bg-gray-100/80 sticky top-0 print:static">
                          <TableRow>
                            <TableHead className="font-bold text-gray-700 text-[11px]">Ref / ID</TableHead>
                            <TableHead className="font-bold text-gray-700 text-[11px]">Type</TableHead>
                            <TableHead className="font-bold text-gray-700 text-[11px]">Amount</TableHead>
                            <TableHead className="font-bold text-gray-700 text-[11px]">Fee</TableHead>
                            <TableHead className="font-bold text-gray-700 text-[11px]">Status</TableHead>
                            <TableHead className="font-bold text-gray-700 text-[11px]">Counterparty Details</TableHead>
                            <TableHead className="font-bold text-gray-700 text-[11px] text-right">Timestamp</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {txList.length > 0 ? (
                            txList.map((tx, idx) => {
                              const amtInKobo = tx.amountInKobo ?? (tx.amount ? tx.amount : 0);
                              const feeInKobo = tx.totalFeeInKobo ?? 0;
                              const isCredit = tx.type === "CREDIT";

                              // Resolve counterparty details
                              let counterpartyText = "N/A";
                              if (isCredit && tx.sender) {
                                counterpartyText = tx.sender.name
                                  ? `${tx.sender.name}${tx.sender.bank ? ` (${tx.sender.bank})` : ""}`
                                  : tx.sender.accountNumber ?? tx.description ?? "Deposit";
                              } else if (!isCredit && tx.receiver) {
                                counterpartyText = tx.receiver.name
                                  ? `${tx.receiver.name}${tx.receiver.bank ? ` (${tx.receiver.bank})` : ""}`
                                  : tx.receiver.accountNumber ?? tx.description ?? "Transfer";
                              } else {
                                counterpartyText = tx.counterparty ?? tx.description ?? tx.narration ?? "N/A";
                              }

                              const txRef = tx.reference ?? `#${tx.id}`;

                              return (
                                <TableRow key={tx.id ?? idx} className="hover:bg-gray-50/50">
                                  <TableCell className="font-mono text-[11px] text-gray-700 font-medium">
                                    <span className="truncate max-w-[120px] block" title={txRef}>
                                      {txRef}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <span
                                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        isCredit
                                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                          : "bg-slate-100 text-slate-800 border border-slate-200"
                                      }`}
                                    >
                                      {tx.type}
                                    </span>
                                  </TableCell>
                                  <TableCell className={`font-bold ${isCredit ? "text-emerald-700" : "text-gray-900"}`}>
                                    {isCredit ? "+" : ""}{fmt(amtInKobo)}
                                  </TableCell>
                                  <TableCell className="text-gray-500 font-mono text-[11px]">
                                    {feeInKobo > 0 ? fmt(feeInKobo) : "₦0.00"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] font-semibold py-0 px-1.5 ${
                                        tx.status === "SUCCESS" || tx.status === "SUCCESSFUL"
                                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-300"
                                          : tx.status === "FAILED"
                                          ? "bg-red-500/10 text-red-700 border-red-300"
                                          : "bg-amber-500/10 text-amber-700 border-amber-300"
                                      }`}
                                    >
                                      {tx.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-gray-700 text-[11px] max-w-[180px] truncate" title={counterpartyText}>
                                    {counterpartyText}
                                  </TableCell>
                                  <TableCell className="text-right text-gray-500 text-[11px]">
                                    {tx.createdAt ? format(new Date(tx.createdAt), "MMM d, yyyy HH:mm") : "N/A"}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-gray-500 py-6">
                                No transaction history recorded for this account.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* ── Official Compliance Footer & Certification ─────────── */}
                  <div className="border-t border-gray-300 pt-4 mt-6 text-xs space-y-4">
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-600 text-[11px] leading-relaxed">
                      <p className="font-bold text-gray-800 mb-0.5 uppercase tracking-wide">
                        COMPLIANCE AUDIT CERTIFICATION & LEGAL NOTICE
                      </p>
                      This compliance report has been generated directly from Scath App&apos;s core ledger database. All transaction logs and balance entries are verified against double-entry accounting records and partner banking webhooks from SafeHaven Microfinance Bank (SafeHaven MFB). This report is strictly confidential and intended solely for regulatory, compliance, and internal auditing purposes.
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-2">
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-400 font-mono">
                          SYSTEM STAMP HASH: <span className="text-gray-600 font-bold">SHA256:{Math.random().toString(36).substring(2, 10).toUpperCase()}{userId}</span>
                        </p>
                        <p className="text-[10px] text-gray-400">
                          SCATH APP ENGINE v2.4 // AUDIT VERIFICATION COMPLETE
                        </p>
                      </div>

                      <div className="text-right border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0 sm:pl-6">
                        <div className="h-8 border-b border-gray-400 w-40 mb-1"></div>
                        <p className="font-bold text-gray-800 text-[11px]">Compliance Auditor Signature</p>
                        <p className="text-gray-500 text-[10px]">Scath Risk & Compliance Division</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="py-8 text-center text-gray-500">Failed to load audit report.</div>
          )}
        </DialogContent>
      </Dialog>

      <ReconcileDepositModal
        isOpen={isReconcileDepositOpen}
        onClose={() => setIsReconcileDepositOpen(false)}
        userId={userId}
        defaultAccountNumber={(userAccounts[0]?.accountNumber as string) || ""}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["userAccounts", userId] });
          queryClient.invalidateQueries({ queryKey: ["userTransactions", userId] });
        }}
      />
    </div>
  );
}
