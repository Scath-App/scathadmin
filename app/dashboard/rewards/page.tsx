"use client";

import { useState, useEffect } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AxiosError } from "axios";
import { searchUsers, UserSearchResult } from "@/lib/userService";
import {
  AdminRewardHistoryItem,
  SendRewardsResponse,
  getAdminRewardsBalance,
  getAdminRewardsHistory,
  sendRewards,
} from "@/lib/rewardsService";
import { PageHeader } from "@/components/ui/PageHeader";
import { useRole } from "@/hooks/useRole";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Gift, CheckCircle, Coins, ArrowDownLeft, ArrowUpRight, Search, User, X, Filter } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const LIMIT = 25;

function CoinAmount({ amount }: { amount: number | string | null | undefined }) {
  const n =
    typeof amount === "number" ? amount : Number.parseFloat(String(amount ?? ""));

  return (
    <span className="font-mono text-sm font-semibold">
      {Number.isNaN(n)
        ? "—"
        : n.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
      <span className="text-xs font-normal text-gray-400 ml-1">coins</span>
    </span>
  );
}

function TypeBadge({ type }: { type: "credit" | "debit" }) {
  if (type === "credit") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-greeny bg-greeny/10 border border-greeny/20 rounded-full px-2 py-0.5">
        <ArrowDownLeft className="w-3 h-3" /> Credit
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red bg-red/10 border border-red/20 rounded-full px-2 py-0.5">
      <ArrowUpRight className="w-3 h-3" /> Debit
    </span>
  );
}

function BalanceCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["adminRewardsBalance"],
    queryFn: getAdminRewardsBalance,
  });

  return (
    <div className="bg-gradient-to-br from-blue/90 to-blue rounded-xl p-5 text-white flex items-center gap-4 shadow-sm max-w-xs">
      <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
        <Coins className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-white/70 font-medium">Platform Rewards Balance</p>
        {isLoading ? (
          <Skeleton className="h-6 w-24 mt-1 bg-white/20" />
        ) : (
          <p className="text-xl font-bold">
            {(data?.balance ?? 0).toLocaleString()}
            <span className="text-sm font-normal text-white/70 ml-1">coins</span>
          </p>
        )}
      </div>
    </div>
  );
}

function RewardsUserCell({ row }: { row: AdminRewardHistoryItem }) {
  if (!row.user) {
    return (
      <div className="text-sm text-gray-500">
        {row.userId !== null ? `User #${row.userId}` : "—"}
      </div>
    );
  }

  const name = [row.user.firstName, row.user.lastName].filter(Boolean).join(" ");
  const totalReferred = row.user.totalReferred ?? 0;

  return (
    <div className="min-w-[220px]">
      <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
        {name || `User #${row.user.id}`}
        {totalReferred > 0 && (
          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue/10 text-blue">
            {totalReferred} referral{totalReferred !== 1 ? "s" : ""}
          </span>
        )}
      </p>
      <p className="text-xs text-gray-500 truncate">{row.user.email}</p>
    </div>
  );
}

function HistoryTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "credit" | "debit">("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "referrals">("date");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["adminRewardsHistory", LIMIT, debouncedSearch, selectedType, sortBy, sortOrder],
    initialPageParam: { cursor: undefined as string | undefined, page: 0 },
    queryFn: ({ pageParam }) =>
      getAdminRewardsHistory({
        limit: LIMIT,
        search: debouncedSearch || undefined,
        type: selectedType === "all" ? undefined : selectedType,
        sortBy,
        sortOrder,
        ...(pageParam.cursor ? { cursor: pageParam.cursor } : { page: pageParam.page }),
      }),
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore
        ? {
            cursor: lastPage.meta.nextCursor ?? undefined,
            page: lastPage.meta.page + 1,
          }
        : undefined,
  });

  const allRows = data?.pages.flatMap((page) => page.data) ?? [];

  const columns = [
    { label: "User", key: "user" as const },
    { label: "Date", key: "createdAt" as const },
    { label: "Type", key: "type" as const },
    { label: "Amount", key: "amount" as const },
    { label: "Description", key: "description" as const },
    { label: "Reference", key: "reference" as const },
    { label: "Status", key: "isRead" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <BalanceCard />

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search users or ref..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-gray-200">
                <Filter className="w-4 h-4 text-gray-500" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Transaction Type</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSelectedType("all")} className="justify-between">
                All {selectedType === "all" && <CheckCircle className="w-4 h-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedType("credit")} className="justify-between">
                Credit {selectedType === "credit" && <CheckCircle className="w-4 h-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedType("debit")} className="justify-between">
                Debit {selectedType === "debit" && <CheckCircle className="w-4 h-4" />}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Sort By</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSortBy("date")} className="justify-between">
                Date {sortBy === "date" && <CheckCircle className="w-4 h-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("amount")} className="justify-between">
                Amount {sortBy === "amount" && <CheckCircle className="w-4 h-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("referrals")} className="justify-between">
                Followers {sortBy === "referrals" && <CheckCircle className="w-4 h-4" />}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Order</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSortOrder("DESC")} className="justify-between">
                Descending {sortOrder === "DESC" && <CheckCircle className="w-4 h-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("ASC")} className="justify-between">
                Ascending {sortOrder === "ASC" && <CheckCircle className="w-4 h-4" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-gray-50/80">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className="font-semibold text-gray-700 text-xs uppercase tracking-wide"
                  >
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : allRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <EmptyState
                      icon={Gift}
                      title="No reward transactions yet"
                      message="Platform reward transactions across all users will appear here once activity starts."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                allRows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50/50">
                    <TableCell>
                      <RewardsUserCell row={row} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-700 whitespace-nowrap">
                      {row.createdAt
                        ? format(new Date(row.createdAt), "dd MMM yyyy, HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={row.type} />
                    </TableCell>
                    <TableCell>
                      <CoinAmount amount={row.amount} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                      {row.description ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-400 max-w-[180px] truncate">
                      {row.reference ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={row.isRead ? "true" : "false"}
                        label={row.isRead ? "Read" : "Unread"}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Load more */}
        {allRows.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing {allRows.length} transaction{allRows.length !== 1 ? "s" : ""}
              {!hasNextPage && " · all loaded"}
            </p>
            {hasNextPage && (
              <Button
                size="sm"
                variant="outline"
                className="border-gray-200"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Send tab ─────────────────────────────────────────────────────────────────
function SendTab() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<SendRewardsResponse | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ["usersSearch", debouncedSearch],
    queryFn: () => searchUsers(debouncedSearch),
    enabled: debouncedSearch.trim().length >= 2 && !selectedUser,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      sendRewards(selectedUser!.id, Number(amount), description.trim() || undefined),
    onSuccess: (res) => {
      setResult(res);
      setSelectedUser(null);
      setSearchTerm("");
      setAmount("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["adminRewardsBalance"] });
      queryClient.invalidateQueries({ queryKey: ["adminRewardsHistory"] });
      toast.success("Rewards sent successfully.");
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast.error(error.response?.data?.message ?? "Failed to send rewards.");
    },
  });

  const isValid = selectedUser !== null && Number(amount) >= 1;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5 max-w-lg">
      <div>
        <h3 className="font-semibold text-gray-900 mb-0.5">Send Coins to User</h3>
        <p className="text-sm text-gray-500">
          The user will receive this amount as a coin reward transaction.
        </p>
      </div>

      {result && (
        <div className="rounded-xl bg-greeny/5 border border-greeny/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-greeny" />
            <p className="font-semibold text-greeny">Coins Sent</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Transaction ID</p>
              <p className="font-mono text-xs">#{result.id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Amount</p>
              <CoinAmount amount={result.amount} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Type</p>
              <TypeBadge type={result.type ?? "credit"} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Reference</p>
              <p className="font-mono text-xs truncate">{result.reference ?? "—"}</p>
            </div>
            {result.description && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400">Description</p>
                <p className="text-sm">{result.description}</p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-xs text-gray-400">Created At</p>
              <p className="text-sm">
                {result.createdAt
                  ? format(new Date(result.createdAt), "dd MMM yyyy, HH:mm:ss")
                  : "—"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => setResult(null)}
          >
            Send Another
          </Button>
        </div>
      )}

      {!result && (
        <div className="space-y-4">
          <div className="space-y-1.5 relative">
            <label className="text-sm font-medium text-gray-700">
              Recipient User <span className="text-red">*</span>
            </label>
            
            {selectedUser ? (
              <div className="flex items-center justify-between p-3 border border-blue/20 bg-blue/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-blue" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selectedUser.displayName}</p>
                    <p className="text-xs text-gray-500">
                      {selectedUser.email} {selectedUser.phoneNumber ? `· ${selectedUser.phoneNumber}` : ""}
                    </p>
                    {selectedUser.matchedAccountNumber && (
                      <p className="text-xs text-gray-500 font-mono mt-0.5">Account: {selectedUser.matchedAccountNumber}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1.5 text-gray-400 hover:text-red hover:bg-red/10 rounded-md transition-colors"
                  title="Remove selected user"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by email, phone, name, account..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                />
                
                {isDropdownOpen && searchTerm.length >= 2 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg max-h-[280px] overflow-y-auto">
                    {isSearching ? (
                      <div className="p-4 text-sm text-center text-gray-500">Searching users...</div>
                    ) : searchResults && searchResults.length > 0 ? (
                      <ul className="py-1 text-sm text-gray-700">
                        {searchResults.map((user) => (
                          <li
                            key={user.id}
                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedUser(user);
                              setSearchTerm("");
                              setIsDropdownOpen(false);
                            }}
                          >
                            <p className="font-medium text-gray-900">{user.displayName}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                            {user.phoneNumber && <p className="text-xs text-gray-500">{user.phoneNumber}</p>}
                            {user.matchedAccountNumber && <p className="text-xs text-gray-500 font-mono mt-0.5">Matched Acc: {user.matchedAccountNumber}</p>}
                          </li>
                        ))}
                      </ul>
                    ) : debouncedSearch.length >= 2 ? (
                      <div className="p-4 text-sm text-center text-gray-500">No users found for "{debouncedSearch}"</div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Amount (coins) <span className="text-red">*</span>{" "}
              <span className="text-gray-400 font-normal">(min 1)</span>
            </label>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Description{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <Input
              placeholder="Reward reason..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button
            className="w-full bg-blue text-white"
            disabled={!isValid || sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
          >
            {sendMutation.isPending ? "Sending..." : "Send Coins"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Tab = "history" | "send";

export default function RewardsPage() {
  const [tab, setTab] = useState<Tab>("history");
  const { isAdmin } = useRole();

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Rewards"
        subtitle="View platform-wide reward history and send rewards to users."
      />

      {/* Tab bar */}
      {isAdmin && (
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {(["history", "send"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === t
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "history" ? "History" : "Send Coins"}
            </button>
          ))}
        </div>
      )}

      {tab === "history" || !isAdmin ? <HistoryTab /> : <SendTab />}
    </div>
  );
}
