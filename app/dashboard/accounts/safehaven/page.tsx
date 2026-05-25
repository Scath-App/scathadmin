"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSafeHavenAccounts, getAccountByNumberSafeHaven } from "@/lib/financeService";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MoneyCell } from "@/components/ui/MoneyCell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

const LIMIT = 20;

export default function SafeHavenAccountsPage() {
  const [page, setPage] = useState(0);
  const [isSubAccount, setIsSubAccount] = useState<boolean | undefined>(undefined);
  const [searchNumber, setSearchNumber] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["safeHavenAccounts", page, isSubAccount],
    queryFn: () =>
      getSafeHavenAccounts({
        page,
        limit: LIMIT,
        ...(isSubAccount !== undefined ? { isSubAccount } : {}),
      }),
  });

  const accounts: any[] = data?.data ?? [];
  const meta = data?.meta ?? {};

  const handleSearch = async () => {
    if (!searchNumber.trim()) return;
    setSearchLoading(true);
    try {
      const result = await getAccountByNumberSafeHaven(searchNumber.trim(), isSubAccount);
      setSearchResult(result);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? "Account not found.");
      setSearchResult(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const columns: Column[] = [
    { key: "id", header: "Account ID", className: "font-mono text-xs text-gray-500" },
    {
      key: "accountNumber",
      header: "Account Number",
      render: (v) => <span className="font-mono text-sm">{v ?? "—"}</span>,
    },
    { key: "accountName", header: "Name", className: "font-medium text-sm" },
    { key: "accountType", header: "Type", className: "text-sm text-gray-500" },
    {
      key: "accountBalance",
      header: "Balance",
      headerClassName: "text-right",
      render: (v) => <div className="text-right"><MoneyCell naira={v} /></div>,
    },
    {
      key: "bookBalance",
      header: "Book Balance",
      headerClassName: "text-right",
      render: (v) => <div className="text-right"><MoneyCell naira={v} /></div>,
    },
    {
      key: "status",
      header: "Status",
      render: (v) => <StatusBadge status={v} />,
    },
  ];

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Safe Haven Accounts"
        subtitle="Read-only view of all SafeHaven-linked accounts."
      />

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <Switch
            checked={!!isSubAccount}
            onCheckedChange={(v) => { setIsSubAccount(v || undefined); setPage(0); }}
          />
          Sub-accounts only
        </label>

        {/* Search by number */}
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by account number..."
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9 bg-white border-gray-200"
            />
          </div>
          <Button
            className="bg-blue text-white"
            onClick={handleSearch}
            disabled={searchLoading || !searchNumber.trim()}
          >
            {searchLoading ? "Searching..." : "Search"}
          </Button>
          {searchResult && (
            <Button variant="ghost" size="sm" onClick={() => setSearchResult(null)}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search result card */}
      {searchResult && (
        <div className="bg-white rounded-xl border border-blue/20 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{searchResult.accountName}</h3>
            <StatusBadge status={searchResult.status} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Account Number</p>
              <p className="font-mono font-medium">{searchResult.accountNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Type</p>
              <p>{searchResult.accountType ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Balance</p>
              <MoneyCell naira={searchResult.accountBalance} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Book Balance</p>
              <MoneyCell naira={searchResult.bookBalance} />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={accounts}
          loading={isLoading}
          rowKey={(r) => r.id}
          emptyMessage="No SafeHaven accounts found."
          pagination={{
            mode: "0-based",
            page,
            totalPages: meta.totalPages ?? 1,
            total: meta.total,
            onPageChange: setPage,
          }}
        />
      </div>
    </div>
  );
}
