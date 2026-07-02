"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  getUsers,
  createAdminUser,
  getDeletedUsers,
  reactivateUser,
  deleteUser,
  bulkDeleteUsers,
  suspendUser,
  unsuspendUser,
  searchUsers,
} from "@/lib/userService";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { useRole } from "@/hooks/useRole";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  Search,
  Eye,
  RefreshCw,
  UserX,
  AlertCircle,
  Loader2,
  Trash2,
  Mail,
  Megaphone,
  Ban,
  ShieldCheck,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CommunicateModal } from "@/components/ui/CommunicateModal";

type AdminUser = {
  id: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isVerified?: boolean;
  isPhoneVerified?: boolean;
  kycStatus?: boolean;
  hasAccount?: boolean;
  phoneNumber?: string;
  deletedAt?: string;
  status?: string;
};

// ─── Schema ────────────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.literal("admin"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

const roleBadgeClass: Record<string, string> = {
  admin: "bg-red/10 text-red border-red/20",
  staff: "bg-yellow/10 text-yellow border-yellow/20",
  partner: "bg-purple/10 text-purple border-purple/20",
  user: "bg-faintSky text-blue border-blue/20",
  ADMIN: "bg-red/10 text-red border-red/20",
  STAFF: "bg-yellow/10 text-yellow border-yellow/20",
  PARTNER: "bg-purple/10 text-purple border-purple/20",
  USER: "bg-faintSky text-blue border-blue/20",
};

const UserAvatar = ({
  firstName,
  lastName,
  email,
}: {
  firstName?: string;
  lastName?: string;
  email?: string;
}) => {
  const initials =
    [firstName?.[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() ||
    email?.[0]?.toUpperCase() ||
    "?";
  return (
    <div className="w-8 h-8 rounded-full bg-blue/10 text-blue flex items-center justify-center text-xs font-bold shrink-0">
      {initials}
    </div>
  );
};

const LIMIT = 20;

// ─── Deleted-user skeleton rows ────────────────────────────────────────────────

function DeletedUserSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isAdmin, isStaff } = useRole();

  // ── Active users state
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [conflictError, setConflictError] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearchLoading(true);
    try {
      const results = await searchUsers(search.trim());
      if (results && results.length > 0) {
        setSearchResults(results);
      } else {
        toast.error("No users found.");
        setSearchResults(null);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Search failed.");
      setSearchResults(null);
    } finally {
      setSearchLoading(false);
    }
  };

  // ── Suspend / Unsuspend user state
  const [suspendTarget, setSuspendTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [unsuspendTarget, setUnsuspendTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // ── Delete user state
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
    role?: string;
  } | null>(null);

  // ── Bulk delete state
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // ── Communicate modal state
  const [isCommunicateOpen, setIsCommunicateOpen] = useState(false);
  const [communicateTarget, setCommunicateTarget] = useState<{
    target: "ALL_USERS" | "SPECIFIC_USERS";
    preselectedUsers?: Array<{ id: number; email: string; firstName?: string; lastName?: string }>;
  }>({ target: "ALL_USERS" });

  // ── Deleted users state
  const [deletedPage, setDeletedPage] = useState(0);
  const [reactivateTarget, setReactivateTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // ── Active users query
  const { data, isLoading } = useQuery({
    queryKey: ["users", page, statusFilter],
    queryFn: () =>
      getUsers(
        page,
        LIMIT,
        undefined,
        statusFilter === "ALL"
          ? undefined
          : statusFilter === "ACTIVE"
          ? "active"
          : statusFilter === "PENDING"
          ? "pending"
          : statusFilter === "INACTIVE"
          ? "incomplete"
          : "suspended"
      ),
  });

  const users = (data?.data ??
    (Array.isArray(data) ? data : [])) as AdminUser[];
  const meta = data?.meta ?? {};

  const filtered = users.filter((u: AdminUser) => {
    // Text Search
    if (search && !searchResults) {
      const matchSearch =
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
    }
    return true;
  });

  // ── Suspend mutation
  const suspendMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason?: string }) =>
      suspendUser(userId, reason),
    onSuccess: () => {
      setSuspendTarget(null);
      toast.success("User account has been suspended.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? "Failed to suspend user.");
    },
  });

  // ── Unsuspend mutation
  const unsuspendMutation = useMutation({
    mutationFn: (userId: number) => unsuspendUser(userId),
    onSuccess: () => {
      setUnsuspendTarget(null);
      toast.success("User account has been unsuspended.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? "Failed to unsuspend user.");
    },
  });

  // ── Deleted users query
  const {
    data: deletedData,
    isLoading: deletedLoading,
    isError: deletedError,
    refetch: refetchDeleted,
  } = useQuery({
    queryKey: ["deletedUsers", deletedPage],
    queryFn: () => getDeletedUsers(deletedPage, LIMIT),
  });

  const deletedUsers = (deletedData?.data ??
    (Array.isArray(deletedData) ? deletedData : [])) as AdminUser[];
  const deletedMeta = deletedData?.meta ?? {};

  // ── Create user mutation
  const form = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "admin",
      firstName: "",
      lastName: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (v: z.infer<typeof createUserSchema>) => createAdminUser(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Admin user created.");
      setIsCreateOpen(false);
      setConflictError("");
      form.reset();
    },
    onError: (e: unknown) => {
      const err = e as {
        response?: { status?: number; data?: { message?: string } };
      };
      if (err.response?.status === 409) {
        setConflictError("Email already exists.");
      } else {
        toast.error(
          err.response?.data?.message ?? "Failed to create admin user.",
        );
      }
    },
  });

  // ── Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: (result) => {
      setDeleteTarget(null);
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
    },
    onError: (e: unknown) => {
      const err = e as {
        response?: { status?: number; data?: { message?: string } };
      };
      const msg = err.response?.data?.message ?? "Failed to delete user.";
      toast.error(msg);
    },
  });

  // ── Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (userIds: number[]) => bulkDeleteUsers(userIds),
    onSuccess: () => {
      setIsBulkDeleteOpen(false);
      setSelectedUsers([]);
      toast.success("Bulk deletion process started in the background");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["deletedUsers"] });
    },
    onError: (e: unknown) => {
      const err = e as {
        response?: { status?: number; data?: { message?: string } };
      };
      const msg =
        err.response?.data?.message ?? "Failed to initiate bulk delete.";
      toast.error(msg);
    },
  });

  // ── Reactivate mutation
  const reactivateMutation = useMutation({
    mutationFn: (userId: number) => reactivateUser(userId),
    onSuccess: () => {
      toast.success("Account reactivated successfully");
      setReactivateTarget(null);
      // Refresh both lists so the user moves back to active
      queryClient.invalidateQueries({ queryKey: ["deletedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => {
      toast.error("Could not reactivate account");
    },
  });

  // ── Active users table columns
  const columns: Column[] = [
    ...(isAdmin ? [{
      key: "selection",
      header: "",
      headerClassName: "w-10",
      renderHeader: () => {
        const allSelectable = filtered.filter(
          (u: AdminUser) => u.role?.toUpperCase() !== "ADMIN",
        );
        const allSelected =
          allSelectable.length > 0 &&
          allSelectable.every((u: AdminUser) => selectedUsers.includes(u.id));
        return (
          <input
            type="checkbox"
            className="rounded border-gray-300 w-4 h-4 text-blue focus:ring-blue"
            checked={allSelected}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedUsers(allSelectable.map((u: AdminUser) => u.id));
              } else {
                setSelectedUsers([]);
              }
            }}
          />
        );
      },
      render: (_: any, row: AdminUser) => {
        const isSelectable = row.role?.toUpperCase() !== "ADMIN";
        if (!isSelectable) return null;
        return (
          <input
            type="checkbox"
            className="rounded border-gray-300 w-4 h-4 text-blue focus:ring-blue"
            checked={selectedUsers.includes(row.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedUsers((prev) => [...prev, row.id]);
              } else {
                setSelectedUsers((prev) => prev.filter((id) => id !== row.id));
              }
            }}
          />
        );
      },
    }] : []),
    {
      key: "firstName",
      header: "User",
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <UserAvatar
            firstName={row.firstName}
            lastName={row.lastName}
            email={row.email}
          />
          <span className="font-medium text-gray-900 text-sm">
            {row.firstName && row.lastName
              ? `${row.firstName} ${row.lastName}`
              : "—"}
          </span>
        </div>
      ),
    },
    { key: "email", header: "Email", className: "text-sm text-gray-500" },
    {
      key: "role",
      header: "Role",
      render: (v) => (
        <Badge
          variant="outline"
          className={`text-xs ${roleBadgeClass[v ?? "user"] ?? "text-gray-500 border-gray-200"}`}
        >
          {v ?? "user"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: "createdAt",
      header: "Created",
      render: (v) => (v ? format(new Date(v), "dd MMM yyyy") : "—"),
    },
    {
      key: "id",
      header: "Actions",
      headerClassName: "text-right",
      render: (id, row) => {
        const isStaffOrAdminRow = ["ADMIN", "STAFF"].includes(row.role?.toUpperCase() ?? "");
        const isSuspended = row.status?.toLowerCase() === "suspended";
        const canSuspend = (isAdmin || isStaff) && !isStaffOrAdminRow;

        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="text-blue hover:bg-blue/10 gap-1"
              onClick={() => router.push(`/dashboard/users/${id}`)}
            >
              <Eye className="w-4 h-4" /> View
            </Button>
            {canSuspend && (
              isSuspended ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-greeny hover:text-greeny hover:bg-greeny/10 gap-1"
                  onClick={() =>
                    setUnsuspendTarget({
                      id,
                      name:
                        row.firstName && row.lastName
                          ? `${row.firstName} ${row.lastName}`
                          : (row.email ?? `User #${id}`),
                    })
                  }
                >
                  <ShieldCheck className="w-4 h-4" /> Unsuspend
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-1"
                  onClick={() =>
                    setSuspendTarget({
                      id,
                      name:
                        row.firstName && row.lastName
                          ? `${row.firstName} ${row.lastName}`
                          : (row.email ?? `User #${id}`),
                    })
                  }
                >
                  <Ban className="w-4 h-4" /> Suspend
                </Button>
              )
            )}
            {/* Admins cannot delete other admins or staff — hide the button for safety */}
            {!isStaffOrAdminRow && isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red/70 hover:text-red hover:bg-red/8 gap-1"
                onClick={() =>
                  setDeleteTarget({
                    id,
                    name:
                      row.firstName && row.lastName
                        ? `${row.firstName} ${row.lastName}`
                        : (row.email ?? `User #${id}`),
                    role: row.role,
                  })
                }
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Users"
        subtitle="Manage platform users and their roles."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-gray-200 text-gray-700 hover:bg-gray-50 gap-2 shadow-sm"
              onClick={() => {
                setCommunicateTarget({ target: "ALL_USERS" });
                setIsCommunicateOpen(true);
              }}
            >
              <Megaphone className="w-4 h-4 text-gray-500" /> Broadcast Message
            </Button>
            {isAdmin && (
              <Button
                className="bg-blue hover:bg-darkBlue text-white gap-2"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="w-4 h-4" /> Create Admin
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-xl w-auto inline-flex">
          <TabsTrigger
            value="active"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm px-5"
          >
            Active Users
          </TabsTrigger>
          <TabsTrigger
            value="deleted"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm px-5 gap-1.5"
          >
            <UserX className="w-3.5 h-3.5" />
            Deleted Users
            {deletedMeta.total > 0 && (
              <span className="ml-1 text-[10px] font-bold bg-red/10 text-red border border-red/20 rounded-full px-1.5 py-0">
                {deletedMeta.total}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── ACTIVE USERS TAB ──────────────────────────────────────────── */}
        <TabsContent value="active" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 flex-1 w-full sm:max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, email or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9 bg-white border-gray-200"
                />
              </div>
              <Button
                size="sm"
                className="bg-blue hover:bg-darkBlue text-white h-10 px-4 font-medium"
                onClick={handleSearch}
                disabled={searchLoading || !search.trim()}
              >
                {searchLoading ? "Searching..." : "Search"}
              </Button>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44 bg-white border-gray-200">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Users</SelectItem>
                <SelectItem value="ACTIVE">Fully Active</SelectItem>
                <SelectItem value="PENDING">Pending Setup</SelectItem>
                <SelectItem value="INACTIVE">Incomplete / Abandoned</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>

            {selectedUsers.length > 0 && (
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  className="border-blue/30 text-blue hover:bg-blue/5 hover:border-blue/50 gap-2 shadow-sm"
                  onClick={() => {
                    const mapped = selectedUsers
                      .map((id) => users.find((u) => u.id === id))
                      .filter(Boolean) as AdminUser[];
                    setCommunicateTarget({
                      target: "SPECIFIC_USERS",
                      preselectedUsers: mapped.map((u) => ({
                        id: u.id,
                        email: u.email ?? "",
                        firstName: u.firstName,
                        lastName: u.lastName,
                      })),
                    });
                    setIsCommunicateOpen(true);
                  }}
                >
                  <Mail className="w-4 h-4" />
                  Message Selected ({selectedUsers.length})
                </Button>
                <Button
                  variant="outline"
                  className="border-red/30 text-red hover:bg-red/5 hover:border-red/50 gap-2 shadow-sm"
                  onClick={() => setIsBulkDeleteOpen(true)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected ({selectedUsers.length})
                </Button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {searchResults && (
              <div className="border-b border-gray-100 bg-blue/5 px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-blue">Search Result</p>
                  <p className="text-xs text-blue/70 font-medium">Showing {searchResults.length} match(es) for &quot;{search}&quot;</p>
                </div>
                <Button variant="ghost" size="sm" className="h-8 px-3 text-blue hover:bg-blue/10 font-medium" onClick={() => { setSearchResults(null); setSearch(""); }}>
                  <X className="w-4 h-4 mr-1.5" /> Clear Search
                </Button>
              </div>
            )}
            <DataTable
              columns={columns}
              data={searchResults ? searchResults : filtered}
              loading={searchLoading || (!searchResults && isLoading)}
              rowKey={(r) => r.id}
              emptyMessage={
                search && !searchResults ? "No users match your local search. Press 'Search' to check all pages." : "No users found."
              }
              pagination={
                searchResults
                  ? undefined
                  : {
                      mode: "0-based",
                      page,
                      totalPages: meta.totalPages ?? 1,
                      total: meta.total,
                      onPageChange: setPage,
                    }
              }
            />
          </div>
        </TabsContent>

        {/* ── DELETED USERS TAB ─────────────────────────────────────────── */}
        <TabsContent value="deleted" className="mt-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Deleted Users</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Accounts that have been removed. You can restore them at any
                  time.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-gray-200 gap-1.5 text-gray-500 hover:text-gray-900"
                onClick={() => refetchDeleted()}
                disabled={deletedLoading}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${deletedLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            {/* Loading */}
            {deletedLoading && <DeletedUserSkeleton />}

            {/* Error */}
            {!deletedLoading && deletedError && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <AlertCircle className="w-10 h-10 text-red/60" />
                <p className="text-sm font-medium text-gray-700">
                  Failed to load deleted users
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-200 mt-1"
                  onClick={() => refetchDeleted()}
                >
                  Try again
                </Button>
              </div>
            )}

            {/* Empty */}
            {!deletedLoading && !deletedError && deletedUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                <UserX className="w-10 h-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">
                  No deleted users found
                </p>
                <p className="text-xs text-gray-400">
                  Users who delete their accounts will appear here.
                </p>
              </div>
            )}

            {/* Table */}
            {!deletedLoading && !deletedError && deletedUsers.length > 0 && (
              <>
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_1.5fr_auto_auto_auto_auto] gap-4 items-center px-6 py-3 bg-gray-50/80 border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <span>User</span>
                  <span>Email</span>
                  <span>Role</span>
                  <span>Deleted On</span>
                  <span>Status</span>
                  <span className="text-right">Action</span>
                </div>

                <div className="divide-y divide-gray-100">
                  {deletedUsers.map((u: AdminUser) => {
                    const name =
                      u.firstName && u.lastName
                        ? `${u.firstName} ${u.lastName}`
                        : (u.email ?? `User #${u.id}`);
                    const isRunning =
                      reactivateMutation.isPending &&
                      reactivateTarget?.id === u.id;

                    return (
                      <div
                        key={u.id}
                        className="grid grid-cols-[1fr_1.5fr_auto_auto_auto_auto] gap-4 items-center px-6 py-4 hover:bg-gray-50/60 transition-colors"
                      >
                        {/* User */}
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            firstName={u.firstName}
                            lastName={u.lastName}
                            email={u.email}
                          />
                          <span className="font-medium text-gray-900 text-sm truncate">
                            {name}
                          </span>
                        </div>

                        {/* Email */}
                        <span className="text-sm text-gray-500 truncate">
                          {u.email ?? "—"}
                        </span>

                        {/* Role */}
                        <Badge
                          variant="outline"
                          className={`text-xs whitespace-nowrap ${roleBadgeClass[u.role ?? "user"] ?? "text-gray-500 border-gray-200"}`}
                        >
                          {u.role ?? "user"}
                        </Badge>

                        {/* Deleted on */}
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {u.deletedAt
                            ? format(new Date(u.deletedAt), "dd MMM yyyy")
                            : "—"}
                        </span>

                        {/* Status */}
                        <StatusBadge status="deleted" label="Deleted" />

                        {/* Reactivate */}
                        <div className="text-right">
                          {isAdmin ? (
                            <Button
                              size="sm"
                              className="bg-blue hover:bg-darkBlue text-white gap-1.5 whitespace-nowrap"
                              disabled={isRunning}
                              onClick={() =>
                                setReactivateTarget({ id: u.id, name })
                              }
                            >
                              {isRunning ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Restoring…
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Reactivate
                                </>
                              )}
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">View Only</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {(deletedMeta.totalPages ?? 1) > 1 && (
                  <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      Page {deletedPage + 1} of {deletedMeta.totalPages} ·{" "}
                      {deletedMeta.total} deleted accounts
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-200"
                        disabled={deletedPage === 0}
                        onClick={() =>
                          setDeletedPage((p) => Math.max(0, p - 1))
                        }
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-200"
                        disabled={
                          deletedPage >= (deletedMeta.totalPages ?? 1) - 1
                        }
                        onClick={() => setDeletedPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Delete confirmation modal ───────────────────────────────────────── */}
      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v && !deleteMutation.isPending) setDeleteTarget(null);
        }}
        title="Delete user account"
        message={
          <span>
            You are about to delete{" "}
            <span className="font-semibold text-gray-900">
              {deleteTarget?.name ?? "this user"}
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
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        danger
      />

      {/* ── Bulk Delete confirmation modal ───────────────────────────────────────── */}
      <ConfirmModal
        open={isBulkDeleteOpen}
        onOpenChange={(v) => {
          if (!v && !bulkDeleteMutation.isPending) setIsBulkDeleteOpen(false);
        }}
        title="Bulk delete users"
        message={
          <span>
            You are about to delete{" "}
            <span className="font-semibold text-gray-900">
              {selectedUsers.length} users
            </span>
            .<br />
            <span className="text-gray-500 text-sm">
              The system will automatically perform a{" "}
              <span className="font-medium text-red">permanent deletion</span>{" "}
              for inactive accounts, and a{" "}
              <span className="font-medium text-amber-600">deactivation</span>{" "}
              for active accounts. This process will run in the background.
            </span>
          </span>
        }
        confirmLabel="Start bulk delete"
        cancelLabel="Cancel"
        loading={bulkDeleteMutation.isPending}
        onConfirm={() => bulkDeleteMutation.mutate(selectedUsers)}
        danger
      />

      {/* ── Reactivate confirmation modal ──────────────────────────────────── */}
      <ConfirmModal
        open={!!reactivateTarget}
        onOpenChange={(v) => {
          if (!v && !reactivateMutation.isPending) setReactivateTarget(null);
        }}
        title="Reactivate account"
        message={`This will restore ${reactivateTarget?.name ?? "this user"}'s deleted account and allow them to sign in again. Continue?`}
        confirmLabel="Reactivate account"
        cancelLabel="Cancel"
        loading={reactivateMutation.isPending}
        onConfirm={() => {
          if (reactivateTarget) reactivateMutation.mutate(reactivateTarget.id);
        }}
      />

      {/* ── Suspend confirmation modal ─────────────────────────────────────── */}
      <ConfirmModal
        open={!!suspendTarget}
        onOpenChange={(v) => {
          if (!v && !suspendMutation.isPending) setSuspendTarget(null);
        }}
        title="Suspend user account"
        message={
          <span>
            Are you sure you want to suspend{" "}
            <span className="font-semibold text-gray-900">
              {suspendTarget?.name}
            </span>
            's account? They will be signed out immediately and blocked from logging in.
          </span>
        }
        confirmLabel="Suspend account"
        cancelLabel="Cancel"
        reasonField={true}
        reasonLabel="Reason for suspension"
        reasonRequired={false}
        loading={suspendMutation.isPending}
        onConfirm={(reason) => {
          if (suspendTarget) {
            suspendMutation.mutate({ userId: suspendTarget.id, reason });
          }
        }}
        danger={true}
      />

      {/* ── Unsuspend confirmation modal ───────────────────────────────────── */}
      <ConfirmModal
        open={!!unsuspendTarget}
        onOpenChange={(v) => {
          if (!v && !unsuspendMutation.isPending) setUnsuspendTarget(null);
        }}
        title="Unsuspend user account"
        message={
          <span>
            Are you sure you want to unsuspend{" "}
            <span className="font-semibold text-gray-900">
              {unsuspendTarget?.name}
            </span>
            's account? This will restore their access to the platform.
          </span>
        }
        confirmLabel="Restore access"
        cancelLabel="Cancel"
        loading={unsuspendMutation.isPending}
        onConfirm={() => {
          if (unsuspendTarget) {
            unsuspendMutation.mutate(unsuspendTarget.id);
          }
        }}
        danger={false}
      />

      {/* ── Create user modal ──────────────────────────────────────────────── */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(v) => {
          setIsCreateOpen(v);
          if (!v) {
            setConflictError("");
            form.reset();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Admin</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => {
                setConflictError("");
                createMutation.mutate(v);
              })}
              className="space-y-4 pt-2"
            >
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    {conflictError && (
                      <p className="text-xs text-red mt-1">{conflictError}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (6–128 chars)</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-sm text-gray-500">
                This action creates an internal admin account. The role is fixed
                as
                <span className="font-medium text-gray-900"> admin</span>.
              </p>
              <Button
                type="submit"
                className="w-full bg-blue text-white"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Admin"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Communicate modal ──────────────────────────────────────────────── */}
      <CommunicateModal
        open={isCommunicateOpen}
        onOpenChange={setIsCommunicateOpen}
        defaultTarget={communicateTarget.target}
        preselectedUsers={communicateTarget.preselectedUsers}
        onSuccess={() => {
          setSelectedUsers([]); // Clear selection upon successful send
        }}
      />
    </div>
  );
}
