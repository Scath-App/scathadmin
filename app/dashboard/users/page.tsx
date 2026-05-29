"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  getUsers,
  createAdminUser,
  getDeletedUsers,
  reactivateUser,
} from "@/lib/userService";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type AdminUser = {
  id: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isEmailVerified?: boolean;
  isVerified?: boolean;
  phoneNumber?: string;
  deletedAt?: string;
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

  // ── Active users state
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [conflictError, setConflictError] = useState("");

  // ── Deleted users state
  const [deletedPage, setDeletedPage] = useState(0);
  const [reactivateTarget, setReactivateTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // ── Active users query
  const { data, isLoading } = useQuery({
    queryKey: ["users", page],
    queryFn: () => getUsers(page, LIMIT),
  });

  const users = (data?.data ?? (Array.isArray(data) ? data : [])) as AdminUser[];
  const meta = data?.meta ?? {};

  const filtered = search
    ? users.filter(
        (u: AdminUser) =>
          u.email?.toLowerCase().includes(search.toLowerCase()) ||
          u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
          u.lastName?.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

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

  const deletedUsers =
    (deletedData?.data ?? (Array.isArray(deletedData) ? deletedData : [])) as AdminUser[];
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
      const err = e as { response?: { status?: number; data?: { message?: string } } };
      if (err.response?.status === 409) {
        setConflictError("Email already exists.");
      } else {
        toast.error(err.response?.data?.message ?? "Failed to create admin user.");
      }
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
      key: "isEmailVerified",
      header: "Verified",
      render: (v) => (
        <StatusBadge status={v ? "active" : "inactive"} label={v ? "Yes" : "No"} />
      ),
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
      render: (id) => (
        <div className="text-right">
          <Button
            size="sm"
            variant="ghost"
            className="text-blue hover:bg-blue/10 gap-1"
            onClick={() => router.push(`/dashboard/users/${id}`)}
          >
            <Eye className="w-4 h-4" /> View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Users"
        subtitle="Manage platform users and their roles."
        actions={
          <Button
            className="bg-blue hover:bg-darkBlue text-white gap-2"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="w-4 h-4" /> Create Admin
          </Button>
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
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border-gray-200"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <DataTable
              columns={columns}
              data={filtered}
              loading={isLoading}
              rowKey={(r) => r.id}
              emptyMessage={
                search ? "No users match your search." : "No users found."
              }
              pagination={{
                mode: "0-based",
                page,
                totalPages: meta.totalPages ?? 1,
                total: meta.total,
                onPageChange: setPage,
              }}
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
                  Accounts that have been removed. You can restore them at any time.
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
                        : u.email ?? `User #${u.id}`;
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
                        onClick={() => setDeletedPage((p) => Math.max(0, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-200"
                        disabled={deletedPage >= (deletedMeta.totalPages ?? 1) - 1}
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
                This action creates an internal admin account. The role is fixed as
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
    </div>
  );
}
