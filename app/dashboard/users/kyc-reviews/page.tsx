"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPendingKycReviews,
  reviewKycVerification,
  EnrichedKycVerification,
  PendingKycDocument,
} from "@/lib/userService";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  User,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Eye,
  Building2,
  UserCheck,
  Percent,
  ZoomIn,
  AlertOctagon,
  MapPin,
  Check,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { JsonViewer } from "@/components/ui/JsonViewer";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatMediaUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  return `https://${trimmed.replace(/^\/+/, "")}`;
};

const failureStageLabels: Record<string, { label: string; color: string }> = {
  DEMOGRAPHIC_MISMATCH_REJECTED: {
    label: "Name Mismatch (Blocked)",
    color: "bg-red-500/15 text-red-500 border-red-500/30",
  },
  DEMOGRAPHIC_MISMATCH: {
    label: "Name Mismatch",
    color: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  },
  DIDIT_FACE_MISMATCH: {
    label: "Face Match Failed",
    color: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  },
  DIDIT_LIVENESS_FAILED: {
    label: "Liveness Failed",
    color: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  },
  BVN_NIN_FACE_MISMATCH: {
    label: "BVN/NIN Face Mismatch",
    color: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  },
  SAFEHAVEN_OTP_FAILED: {
    label: "OTP Verification Failed",
    color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  },
  OTP_MAX_ATTEMPTS: {
    label: "OTP Lockout (24h)",
    color: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  },
};

const docTypeLabels: Record<string, string> = {
  CAC_CERTIFICATE: "CAC Certificate",
  STATUS_REPORT: "Status Report (CAC 1.1)",
  MEMART: "MEMART Dossier",
  UTILITY_BILL: "Proof of Address (Utility Bill)",
  OTHER: "Supporting Document",
};

const computeNameMatch = (nameA: string, nameB: string): { score: number; isMatch: boolean } => {
  if (!nameA || !nameB) return { score: 0, isMatch: false };
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 1);
  const setA = new Set(normalize(nameA));
  const setB = new Set(normalize(nameB));
  if (setA.size === 0 || setB.size === 0) return { score: 0, isMatch: false };
  let matches = 0;
  for (const token of setA) {
    if (setB.has(token)) matches++;
  }
  const minTokens = Math.min(setA.size, setB.size);
  const score = minTokens > 0 ? Math.round((matches / minTokens) * 100) : 0;
  return { score, isMatch: score >= 75 };
};

const extractRegistryDemographics = (data: any) => {
  if (!data) return { fullName: "", dob: "", phone: "", gender: "", idNumber: "" };
  const d = data.demographic_data || data.providerResponse || data;
  const firstName = d.firstName || d.first_name || d.name || "";
  const lastName = d.lastName || d.last_name || d.surname || "";
  const middleName = d.middleName || d.middle_name || "";
  let fullName = d.fullName || d.full_name || "";
  if (!fullName && (firstName || lastName)) {
    fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
  }
  const dob = d.dob || d.dateOfBirth || d.date_of_birth || d.birthdate || "";
  const phone = d.phone || d.phoneNumber || d.phone_number || d.mobile || "";
  const gender = d.gender || d.sex || "";
  const idNumber = d.nin || d.bvn || d.idNumber || d.id_number || "";
  return { fullName: fullName.trim(), dob, phone, gender, idNumber };
};

const normalizeDob = (dStr: string | null | undefined): string => {
  if (!dStr) return "";
  const parts = dStr.split(/[-/]/);
  if (parts.length !== 3) return dStr;
  if (parts[0].length === 4) return parts[0] + "-" + parts[1].padStart(2, "0") + "-" + parts[2].padStart(2, "0");
  if (parts[2].length === 4) return parts[2] + "-" + parts[1].padStart(2, "0") + "-" + parts[0].padStart(2, "0");
  return dStr;
};

export default function KycReviewsPage() {
  const queryClient = useQueryClient();
  const [selectedVerification, setSelectedVerification] =
    useState<EnrichedKycVerification | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["pendingKycReviews"],
    queryFn: getPendingKycReviews,
  });

  // ── Mutation ───────────────────────────────────────────────────────────────
  const reviewMutation = useMutation({
    mutationFn: (args: { verificationId: number; approved: boolean; adminNotes?: string }) =>
      reviewKycVerification(args.verificationId, {
        approved: args.approved,
        adminNotes: args.adminNotes,
      }),
    onSuccess: (_, variables) => {
      toast.success(
        `KYC Verification #${variables.verificationId} ${
          variables.approved ? "APPROVED" : "REJECTED"
        } successfully.`,
      );
      queryClient.invalidateQueries({ queryKey: ["pendingKycReviews"] });
      setSelectedVerification(null);
      setAdminNotes("");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Action failed";
      toast.error(msg);
    },
  });

  const pendingVerifications = data?.pendingVerifications ?? [];
  const pendingDocuments = data?.pendingDocuments ?? [];

  // Metrics
  const tier2Count = pendingVerifications.filter((v) => v.targetTierLevel === 2).length;
  const tier3Count = pendingVerifications.filter((v) => v.targetTierLevel === 3).length;
  const tier4Count = pendingVerifications.filter((v) => v.targetTierLevel === 4).length;

  const [tierFilter, setTierFilter] = useState<"ALL" | "TIER_2" | "TIER_3" | "TIER_4">("ALL");

  const filteredVerifications = pendingVerifications.filter((v) => {
    if (tierFilter === "TIER_2") return v.targetTierLevel === 2;
    if (tierFilter === "TIER_3") return v.targetTierLevel === 3;
    if (tierFilter === "TIER_4") return v.targetTierLevel === 4;
    return true;
  });

  const isDemographicBlocked =
    selectedVerification?.failureStage === "DEMOGRAPHIC_MISMATCH_REJECTED";

  return (
    <div className="space-y-6 p-6">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <PageHeader
        title="KYC Verification & Document Queue"
        subtitle="Review pending manual KYC tier upgrades, forensic visual photo scores, and corporate dossiers."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh Queue
          </Button>
        }
      />

      {/* ── Summary Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Pending Queue"
          value={isLoading ? "..." : pendingVerifications.length.toString()}
          tooltip="Total manual tier upgrade requests requiring review"
          icon={ShieldAlert}
        />
        <StatCard
          title="Tier 2 & 3 Personal"
          value={isLoading ? "..." : (tier2Count + tier3Count).toString()}
          tooltip="Personal identity & liveness reviews"
          icon={UserCheck}
        />
        <StatCard
          title="Business Tier 4 Corporate"
          value={isLoading ? "..." : tier4Count.toString()}
          tooltip="Corporate dossiers & CAC reviews"
          icon={Building2}
        />
        <StatCard
          title="Flagged / Manual Review"
          value={isLoading ? "..." : pendingVerifications.filter((v) => v.failureStage).length.toString()}
          tooltip="Verifications flagged by automated checks"
          icon={ShieldCheck}
        />
      </div>

      {/* ── Main Unified Verification Queue with Tier Tabs ───────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <Tabs defaultValue="ALL" value={tierFilter} onValueChange={(val) => setTierFilter(val as any)}>
            <TabsList className="bg-muted/60 p-1">
              <TabsTrigger value="ALL" className="text-xs">
                All Queue ({pendingVerifications.length})
              </TabsTrigger>
              <TabsTrigger value="TIER_2" className="text-xs">
                Tier 2 ({tier2Count})
              </TabsTrigger>
              <TabsTrigger value="TIER_3" className="text-xs">
                Tier 3 ({tier3Count})
              </TabsTrigger>
              <TabsTrigger value="TIER_4" className="text-xs">
                Business Tier 4 ({tier4Count})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User / Customer</TableHead>
                <TableHead>Customer Type</TableHead>
                <TableHead>Target Tier</TableHead>
                <TableHead>Verification Status / Failure</TableHead>
                <TableHead>Date Submitted</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredVerifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                    No pending verifications found for this category.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVerifications.map((item) => {
                const failInfo = item.failureStage
                  ? failureStageLabels[item.failureStage] || {
                      label: item.failureStage,
                      color: "bg-slate-500/15 text-slate-400 border-slate-500/30",
                    }
                  : null;

                const userName = item.user
                  ? `${item.user.firstName ?? ""} ${item.user.lastName ?? ""}`.trim() || "User #" + item.userId
                  : `User #${item.userId}`;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="text-sm font-semibold">{userName}</p>
                        <p className="text-xs text-muted-foreground">{item.user?.email ?? `ID: ${item.userId}`}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.customerType ?? "PERSONAL"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          item.targetTierLevel === 4
                            ? "bg-purple-500/15 text-purple-500 border-purple-500/30"
                            : item.targetTierLevel === 3
                            ? "bg-blue-500/15 text-blue-500 border-blue-500/30"
                            : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                        }
                      >
                        Tier {item.targetTierLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {failInfo ? (
                        <Badge variant="outline" className={failInfo.color}>
                          {failInfo.label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Manual Review</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.createdAt ? format(new Date(item.createdAt), "MMM d, yyyy HH:mm") : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setSelectedVerification(item);
                          setAdminNotes("");
                        }}
                        className="gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect & Review
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      </div>

      {/* ── Forensic Visual Inspection Modal ────────────────────────────────── */}
      <Dialog
        open={!!selectedVerification}
        onOpenChange={(open) => !open && setSelectedVerification(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Manual KYC Forensic Review — #{selectedVerification?.id}
            </DialogTitle>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-6 pt-2">
              {/* Blocked Warning Banner */}
              {isDemographicBlocked && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-red-500 text-sm">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    DEMOGRAPHIC MISMATCH REJECTED
                  </div>
                  Backend compliance rules block direct manual approval for demographic name mismatches.
                  Update the user's account profile name to match their BVN/NIN slip, then ask the user to re-verify.
                </div>
              )}

              {/* User Snapshot & Tier Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/40 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Target Upgrade</p>
                  <p className="font-semibold">Tier {selectedVerification.targetTierLevel}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customer Type</p>
                  <p className="font-semibold capitalize">{selectedVerification.customerType ?? "PERSONAL"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Complementary ID</p>
                  <p className="font-semibold">
                    {selectedVerification.complementaryIdType ?? "NIN"}: {selectedVerification.complementaryIdNumber ?? "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Failure Reason</p>
                  <p className="text-xs font-mono text-amber-500 truncate" title={selectedVerification.failureReason ?? ""}>
                    {selectedVerification.failureReason ?? "None logged"}
                  </p>
                </div>
              </div>

              {/* Didit AI Fraud & Biometric Alert Banner */}
              {((selectedVerification.diditWarnings && selectedVerification.diditWarnings.length > 0) ||
                (selectedVerification.duplicateFaces && selectedVerification.duplicateFaces.length > 0)) && (() => {
                const raw = selectedVerification.diditWarnings || [];
                const hasMismatchName = raw.some(
                  (w) =>
                    w.log_type === "DUPLICATED_FACE_NAME_MISMATCH" ||
                    w.short_description?.toLowerCase().includes("different name")
                );

                const filteredWarnings = raw.filter((w) => {
                  if (
                    hasMismatchName &&
                    w.log_type !== "DUPLICATED_FACE_NAME_MISMATCH" &&
                    w.short_description?.toLowerCase().includes("approved session")
                  ) {
                    return false;
                  }
                  return true;
                });

                return (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-700 dark:text-red-400 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <AlertOctagon className="h-5 w-5 text-red-600 flex-shrink-0" />
                      DIDIT AI FRAUD & BIOMETRIC DUPLICATE WARNING
                    </div>
                    <div className="space-y-2 text-xs">
                      {filteredWarnings.map((w, idx) => (
                        <div key={idx} className="bg-background/80 p-3 rounded-lg border border-red-500/20 text-foreground space-y-1">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-red-600 dark:text-red-400 flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {w.short_description || w.log_type}
                            </span>
                            {w.similarity_percentage != null && (
                              <Badge variant="destructive" className="text-[10px]">
                                {w.similarity_percentage}% Biometric Match
                              </Badge>
                            )}
                          </div>
                          {w.long_description && (
                            <p className="text-muted-foreground text-xs leading-relaxed">{w.long_description}</p>
                          )}
                        </div>
                      ))}
                      {selectedVerification.duplicateFaces?.map((dup, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-background/80 p-3 rounded-lg border border-red-500/20 text-xs text-foreground">
                          <div>
                            <span className="font-semibold text-red-600 dark:text-red-400">Previous Identity Session:</span>{" "}
                            <span className="font-mono text-[11px] text-muted-foreground">{dup.session_id}</span>
                            {dup.verification_date && (
                              <span className="text-[11px] text-muted-foreground ml-2">({format(new Date(dup.verification_date), "MMM d, yyyy")})</span>
                            )}
                          </div>
                          {dup.similarity_percentage != null && (
                            <Badge variant="destructive" className="text-[10px]">
                              {dup.similarity_percentage}% Biometric Similarity
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Visual Inspection Section: Business Corporate Dossier (Tier 4) vs Personal 3-Way Photo Comparison (Tier 2/3) */}
              {selectedVerification.targetTierLevel === 4 ||
              selectedVerification.customerType?.toUpperCase() === "BUSINESS" ||
              selectedVerification.verificationType === "BUSINESS_REGISTRATION" ? (
                <div className="space-y-4 rounded-xl border p-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-purple-600" />
                      Business Tier 4 Corporate Verification Dossier
                    </p>
                    <div className="flex items-center gap-2">
                      {selectedVerification.providerMetadata?.businessType && (
                        <Badge variant="outline" className="font-mono text-xs border-purple-500/30 text-purple-600 bg-purple-500/10">
                          {selectedVerification.providerMetadata.businessType === "RC" ? "Registered Co. (RC)" : "Business Name (BN)"}
                        </Badge>
                      )}
                      {selectedVerification.providerMetadata?.tin && (
                        <Badge variant="outline" className="font-mono text-xs border-purple-500/30 text-purple-600 bg-purple-500/10">
                          TIN: {selectedVerification.providerMetadata.tin}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const isRcCompany =
                      selectedVerification.providerMetadata?.businessType === "RC" ||
                      Boolean(selectedVerification.providerMetadata?.memartUrl);

                    return (
                      <div className={`grid grid-cols-1 ${isRcCompany ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4`}>
                        {/* CAC Certificate Document */}
                        <div className="rounded-lg border p-3 bg-card text-center space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">1. CAC Certificate</p>
                          {formatMediaUrl(selectedVerification.providerMetadata?.cacUrl) ? (
                            <div className="space-y-2">
                              <iframe
                                src={formatMediaUrl(selectedVerification.providerMetadata?.cacUrl)!}
                                title="CAC Certificate"
                                className="h-44 w-full rounded border bg-white"
                              />
                              <a
                                href={formatMediaUrl(selectedVerification.providerMetadata?.cacUrl)!}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1"
                              >
                                Open PDF in New Tab <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          ) : (
                            <div className="h-44 w-full rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                              No CAC Certificate Provided
                            </div>
                          )}
                        </div>

                        {/* Status Report (CAC 1.1) */}
                        <div className="rounded-lg border p-3 bg-card text-center space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">2. Status Report (CAC 1.1)</p>
                          {formatMediaUrl(selectedVerification.providerMetadata?.statusReportUrl) ? (
                            <div className="space-y-2">
                              <iframe
                                src={formatMediaUrl(selectedVerification.providerMetadata?.statusReportUrl)!}
                                title="Status Report"
                                className="h-44 w-full rounded border bg-white"
                              />
                              <a
                                href={formatMediaUrl(selectedVerification.providerMetadata?.statusReportUrl)!}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1"
                              >
                                Open PDF in New Tab <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          ) : (
                            <div className="h-44 w-full rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                              No Status Report Provided
                            </div>
                          )}
                        </div>

                        {/* MEMART Dossier — Only rendered for Registered Company (RC) */}
                        {isRcCompany && (
                          <div className="rounded-lg border p-3 bg-card text-center space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">3. MEMART Dossier</p>
                            {formatMediaUrl(selectedVerification.providerMetadata?.memartUrl) ? (
                              <div className="space-y-2">
                                <iframe
                                  src={formatMediaUrl(selectedVerification.providerMetadata?.memartUrl)!}
                                  title="MEMART Dossier"
                                  className="h-44 w-full rounded border bg-white"
                                />
                                <a
                                  href={formatMediaUrl(selectedVerification.providerMetadata?.memartUrl)!}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1"
                                >
                                  Open PDF in New Tab <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            ) : (
                              <div className="h-44 w-full rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                No MEMART Dossier Provided
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (() => {
                /* 3-Way Personal Forensic Photo Comparison */
                  const isNinPrimary = selectedVerification.user?.kycType?.toUpperCase() === "NIN";
                  
                  const photo1Title = isNinPrimary ? "1. NIN Slip / Document" : "1. BVN Reference Photo";
                  const photo1Url = isNinPrimary
                    ? (selectedVerification.ninPhotoUrl || selectedVerification.user?.ninPhotoUrl || selectedVerification.primaryPhotoUrl)
                    : (selectedVerification.bvnPhotoUrl || selectedVerification.user?.bvnPhotoUrl || selectedVerification.primaryPhotoUrl);
                  const photo1Empty = isNinPrimary ? "No NIN Slip Uploaded" : "No BVN Photo Available";

                  const photo2Title = isNinPrimary ? "2. BVN Reference Photo (Tier 3)" : "2. NIN Slip / Document (Tier 3)";
                  const photo2Url = isNinPrimary
                    ? (selectedVerification.bvnPhotoUrl || selectedVerification.user?.bvnPhotoUrl || selectedVerification.secondaryPhotoUrl)
                    : (selectedVerification.ninPhotoUrl || selectedVerification.user?.ninPhotoUrl || selectedVerification.secondaryPhotoUrl);
                  const photo2Empty = isNinPrimary ? "No BVN Photo Available" : "No NIN Document Uploaded";

                  const photo3Title = "3. Didit Liveness Selfie";
                  const photo3Url = selectedVerification.livenessSelfieUrl;
                  const photo3Empty = "No Liveness Selfie Available";

                  return (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <Eye className="h-4 w-4 text-blue-500" />
                        3-Way Visual Photo Forensic Comparison
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Photo 1: Primary Photo */}
                        <div className="rounded-xl border p-3 bg-card text-center space-y-2 flex flex-col justify-between">
                          <p className="text-xs font-semibold text-muted-foreground">{photo1Title}</p>
                          {formatMediaUrl(photo1Url) ? (
                            <div className="relative aspect-[3/4] max-h-56 mx-auto w-full overflow-hidden rounded-lg border bg-zinc-900/5 dark:bg-zinc-950/40 flex items-center justify-center group">
                              <img
                                src={formatMediaUrl(photo1Url)!}
                                alt={photo1Title}
                                className="h-full w-full object-contain rounded-md transition-transform duration-200 group-hover:scale-105"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImage({
                                    url: formatMediaUrl(photo1Url)!,
                                    title: photo1Title,
                                  })
                                }
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-medium cursor-pointer"
                              >
                                <ZoomIn className="h-4 w-4" /> Click to Zoom
                              </button>
                            </div>
                          ) : (
                            <div className="aspect-[3/4] max-h-56 w-full rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                              {photo1Empty}
                            </div>
                          )}
                          {formatMediaUrl(photo1Url) && (
                            <a
                              href={formatMediaUrl(photo1Url)!}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-500 hover:underline inline-flex items-center justify-center gap-1"
                            >
                              Open Full Resolution <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>

                        {/* Photo 2: Complementary Photo */}
                        <div className="rounded-xl border p-3 bg-card text-center space-y-2 flex flex-col justify-between">
                          <p className="text-xs font-semibold text-muted-foreground">{photo2Title}</p>
                          {formatMediaUrl(photo2Url) ? (
                            <div className="relative aspect-[3/4] max-h-56 mx-auto w-full overflow-hidden rounded-lg border bg-zinc-900/5 dark:bg-zinc-950/40 flex items-center justify-center group">
                              <img
                                src={formatMediaUrl(photo2Url)!}
                                alt={photo2Title}
                                className="h-full w-full object-contain rounded-md transition-transform duration-200 group-hover:scale-105"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImage({
                                    url: formatMediaUrl(photo2Url)!,
                                    title: photo2Title,
                                  })
                                }
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-medium cursor-pointer"
                              >
                                <ZoomIn className="h-4 w-4" /> Click to Zoom
                              </button>
                            </div>
                          ) : (
                            <div className="aspect-[3/4] max-h-56 w-full rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                              {photo2Empty}
                            </div>
                          )}
                          {formatMediaUrl(photo2Url) && (
                            <a
                              href={formatMediaUrl(photo2Url)!}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-500 hover:underline inline-flex items-center justify-center gap-1"
                            >
                              Open Full Resolution <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>

                        {/* Photo 3: Didit Liveness Selfie */}
                        <div className="rounded-xl border p-3 bg-card text-center space-y-2 flex flex-col justify-between">
                          <p className="text-xs font-semibold text-muted-foreground">{photo3Title}</p>
                          {formatMediaUrl(photo3Url) ? (
                            <div className="relative aspect-[3/4] max-h-56 mx-auto w-full overflow-hidden rounded-lg border bg-zinc-900/5 dark:bg-zinc-950/40 flex items-center justify-center group">
                              <img
                                src={formatMediaUrl(photo3Url)!}
                                alt={photo3Title}
                                className="h-full w-full object-contain rounded-md transition-transform duration-200 group-hover:scale-105"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImage({
                                    url: formatMediaUrl(photo3Url)!,
                                    title: photo3Title,
                                  })
                                }
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-medium cursor-pointer"
                              >
                                <ZoomIn className="h-4 w-4" /> Click to Zoom
                              </button>
                            </div>
                          ) : (
                            <div className="aspect-[3/4] max-h-56 w-full rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                              {photo3Empty}
                            </div>
                          )}
                          {formatMediaUrl(photo3Url) && (
                            <a
                              href={formatMediaUrl(photo3Url)!}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-500 hover:underline inline-flex items-center justify-center gap-1"
                            >
                              Open Full Resolution <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
              })()}

              {/* Score Diagnostics Grid */}
              <div className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Percent className="h-4 w-4 text-emerald-500" />
                  Biometric & Proof of Address Diagnostics
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border bg-card space-y-1">
                    <p className="text-xs text-muted-foreground">Didit Liveness Score</p>
                    <p className="text-lg font-bold">
                      {selectedVerification.livenessScore != null ? `${selectedVerification.livenessScore}%` : "N/A"}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        selectedVerification.livenessPassed
                          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                          : "bg-red-500/15 text-red-600 border-red-500/30"
                      }`}
                    >
                      {selectedVerification.livenessStatus ?? (selectedVerification.livenessPassed ? "Passed" : "Failed")}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-lg border bg-card space-y-1">
                    <p className="text-xs text-muted-foreground">Didit Face Match Score</p>
                    <p className="text-lg font-bold">
                      {selectedVerification.faceMatchScore != null ? `${selectedVerification.faceMatchScore}%` : "N/A"}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        selectedVerification.faceMatchPassed
                          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                          : selectedVerification.faceMatchPassed === false
                          ? "bg-red-500/15 text-red-600 border-red-500/30"
                          : ""
                      }`}
                    >
                      {selectedVerification.faceMatchPassed != null
                        ? selectedVerification.faceMatchPassed
                          ? "Passed"
                          : "Failed"
                        : "N/A"}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-lg border bg-card space-y-1">
                    <p className="text-xs text-muted-foreground">Pre-SDK Face Score (BVN/NIN)</p>
                    <p className="text-lg font-bold">
                      {selectedVerification.triangularFaceScore != null ? `${selectedVerification.triangularFaceScore}%` : "N/A"}
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      {selectedVerification.triangularFaceStatus ?? "N/A"}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-lg border bg-card space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Proof of Address (PoA)</p>
                      {selectedVerification.poaDocumentUrl && (
                        <a
                          href={formatMediaUrl(selectedVerification.poaDocumentUrl)!}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-500 hover:underline inline-flex items-center gap-0.5 font-medium"
                        >
                          PDF <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs font-semibold truncate" title={selectedVerification.poaAddress ?? "No address submitted"}>
                      {selectedVerification.poaAddress ?? "N/A"}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        selectedVerification.poaStatus?.toLowerCase() === "approved"
                          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                          : ""
                      }`}
                    >
                      {selectedVerification.poaStatus ?? "Pending"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Structured Demographic Cross-Validation Table */}
              {(() => {
                const reg = extractRegistryDemographics(selectedVerification.demographicData);
                const profileName = `${selectedVerification.user?.firstName ?? ""} ${selectedVerification.user?.lastName ?? ""}`.trim();
                const nameMatch = computeNameMatch(profileName, reg.fullName);
                const profileDob = selectedVerification.user?.dob ? normalizeDob(selectedVerification.user.dob) : "";
                const registryDob = reg.dob ? normalizeDob(reg.dob) : "";
                const isDobMatch = profileDob && registryDob ? profileDob === registryDob : null;

                return (
                  <div className="rounded-xl border bg-card overflow-hidden space-y-0">
                    <div className="bg-muted/40 px-4 py-2.5 border-b flex items-center justify-between">
                      <p className="text-xs font-semibold flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-primary" />
                        Demographic Cross-Validation (Profile vs Registry)
                      </p>
                      <span className="text-[11px] text-muted-foreground">Source: SafeHaven & Didit KYC Services</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/20 border-b text-muted-foreground uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-4 font-semibold">Identity Field</th>
                            <th className="py-2.5 px-4 font-semibold">User Account Profile</th>
                            <th className="py-2.5 px-4 font-semibold">Government / Registry Slip</th>
                            <th className="py-2.5 px-4 font-semibold">Audit Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {/* Full Legal Name */}
                          <tr>
                            <td className="py-2.5 px-4 font-medium text-muted-foreground">Full Legal Name</td>
                            <td className="py-2.5 px-4 font-semibold">{profileName || "—"}</td>
                            <td className="py-2.5 px-4 font-semibold">{reg.fullName || "—"}</td>
                            <td className="py-2.5 px-4">
                              {reg.fullName ? (
                                <Badge
                                  variant="outline"
                                  className={`gap-1 font-mono text-[10px] ${
                                    nameMatch.isMatch
                                      ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                                      : "bg-red-500/15 text-red-600 border-red-500/30"
                                  }`}
                                >
                                  {nameMatch.isMatch ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                  {nameMatch.score}% Match
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                  Pending Ext.
                                </Badge>
                              )}
                            </td>
                          </tr>

                          {/* Date of Birth */}
                          <tr>
                            <td className="py-2.5 px-4 font-medium text-muted-foreground">Date of Birth</td>
                            <td className="py-2.5 px-4 font-mono">{profileDob || "—"}</td>
                            <td className="py-2.5 px-4 font-mono">{registryDob || "—"}</td>
                            <td className="py-2.5 px-4">
                              {isDobMatch === true ? (
                                <Badge variant="outline" className="gap-1 font-mono text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                                  <Check className="h-3 w-3" /> Exact Match
                                </Badge>
                              ) : isDobMatch === false ? (
                                <Badge variant="outline" className="gap-1 font-mono text-[10px] bg-red-500/15 text-red-600 border-red-500/30">
                                  <X className="h-3 w-3" /> Mismatch
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                  Unverified
                                </Badge>
                              )}
                            </td>
                          </tr>

                          {/* Identification Numbers */}
                          <tr>
                            <td className="py-2.5 px-4 font-medium text-muted-foreground">Identity Numbers</td>
                            <td className="py-2.5 px-4 font-mono">
                              {selectedVerification.user?.kycType}:{" "}
                              {selectedVerification.user?.kycType === "BVN"
                                ? selectedVerification.user?.bvnNumber
                                : selectedVerification.user?.ninNumber || selectedVerification.complementaryIdNumber || "—"}
                            </td>
                            <td className="py-2.5 px-4 font-mono">
                              {reg.idNumber ? `Verified: ${reg.idNumber}` : selectedVerification.complementaryIdNumber ? `${selectedVerification.complementaryIdType}: ${selectedVerification.complementaryIdNumber}` : "—"}
                            </td>
                            <td className="py-2.5 px-4">
                              <Badge variant="outline" className="gap-1 font-mono text-[10px] bg-blue-500/15 text-blue-600 border-blue-500/30">
                                <Check className="h-3 w-3" /> Verified
                              </Badge>
                            </td>
                          </tr>

                          {/* Phone Number */}
                          <tr>
                            <td className="py-2.5 px-4 font-medium text-muted-foreground">Primary Mobile</td>
                            <td className="py-2.5 px-4 font-mono">{selectedVerification.user?.phoneNumber || "—"}</td>
                            <td className="py-2.5 px-4 font-mono">{reg.phone || "—"}</td>
                            <td className="py-2.5 px-4">
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                {reg.phone ? "Record Linked" : "Not Provided"}
                              </Badge>
                            </td>
                          </tr>

                          {/* Gender */}
                          {reg.gender && (
                            <tr>
                              <td className="py-2.5 px-4 font-medium text-muted-foreground">Gender</td>
                              <td className="py-2.5 px-4 text-muted-foreground">—</td>
                              <td className="py-2.5 px-4 font-semibold capitalize">{reg.gender.toLowerCase()}</td>
                              <td className="py-2.5 px-4">
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                  Record Info
                                </Badge>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Developer Raw JSON Collapsible */}
                    {selectedVerification.demographicData && (
                      <div className="p-3 bg-muted/10 border-t">
                        <JsonViewer
                          data={selectedVerification.demographicData}
                          collapsed={true}
                          label="Raw Provider Demographic JSON Payload (For Auditing / Dev)"
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Admin Decision Form */}
              <div className="space-y-3 pt-2 border-t">
                <label className="text-xs font-semibold">Admin Notes & Reason</label>
                <Textarea
                  placeholder="Provide justification or notes for approval/rejection..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                />
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedVerification(null)}
                    disabled={reviewMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({
                        verificationId: selectedVerification.id,
                        approved: false,
                        adminNotes,
                      })
                    }
                    className="gap-1.5"
                  >
                    {reviewMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Reject Verification
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    disabled={reviewMutation.isPending || isDemographicBlocked}
                    onClick={() =>
                      reviewMutation.mutate({
                        verificationId: selectedVerification.id,
                        approved: true,
                        adminNotes,
                      })
                    }
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {reviewMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Approve Verification
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
{/* ── Photo Zoom Lightbox Modal ─────────────────────────────────────── */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-2xl p-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{previewImage?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center py-2 max-h-[75vh] overflow-hidden">
            {previewImage?.url && (
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[70vh] w-auto object-contain rounded-lg border shadow-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
