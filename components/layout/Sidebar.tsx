"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import {
  LayoutDashboard, Users, ShieldAlert, Building2, Landmark,
  DollarSign, ArrowRightLeft, Settings2, BarChart3,
  TrendingUp, LogOut, Briefcase, PiggyBank, ShoppingBag,
  FileText, Gift, Users2, ChevronDown, ChevronRight,
} from "lucide-react";

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: any;
}

interface NavGroup {
  label: string;
  icon: any;
  children: NavItem[];
  /** If set, only these roles see this group */
  roles?: string[];
}

const navGroups: NavGroup[] = [
  {
    label: "Users",
    icon: Users,
    children: [
      { label: "All Users", href: "/dashboard/users", icon: Users2 },
      { label: "Audit Logs", href: "/dashboard/users/audit-logs", icon: ShieldAlert },
    ],
  },
  {
    label: "Accounts",
    icon: Building2,
    children: [
      { label: "Local Accounts", href: "/dashboard/accounts", icon: Landmark },
      { label: "Safe Haven", href: "/dashboard/accounts/safehaven", icon: Building2 },
    ],
  },
  {
    label: "Finance",
    icon: DollarSign,
    children: [
      { label: "Treasury Dashboard", href: "/dashboard/finance/treasury", icon: BarChart3 },
      { label: "Payouts", href: "/dashboard/finance/payouts", icon: ArrowRightLeft },
    ],
  },
  {
    label: "Fees",
    icon: Settings2,
    children: [
      { label: "Configurations", href: "/dashboard/fees", icon: Settings2 },
      { label: "Revenue Report", href: "/dashboard/fees/revenue", icon: BarChart3 },
    ],
  },
  {
    label: "Investments",
    icon: TrendingUp,
    children: [
      { label: "Opportunities", href: "/dashboard/investments", icon: Briefcase },
    ],
  },
  {
    label: "Equity",
    icon: TrendingUp,
    children: [
      { label: "Listings", href: "/dashboard/equity", icon: TrendingUp },
      { label: "Exit Requests", href: "/dashboard/equity/exit-requests", icon: LogOut },
    ],
  },
  {
    label: "Savebox",
    icon: PiggyBank,
    children: [
      { label: "Configurations", href: "/dashboard/savebox", icon: Settings2 },
      { label: "Portfolios", href: "/dashboard/savebox/portfolios", icon: Briefcase },
    ],
  },
  {
    label: "Offers",
    icon: ShoppingBag,
    children: [
      { label: "All Offers", href: "/dashboard/offers", icon: ShoppingBag },
    ],
    roles: ["ADMIN", "STAFF", "PARTNER"],
  },
];

const standaloneItems: NavItem[] = [
  { label: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { label: "Referral", href: "/dashboard/referrals", icon: Users2 },
  { label: "Rewards", href: "/dashboard/rewards", icon: Gift },
];

// ─── Sidebar Component ────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { can, role } = useRole();

  // Keep groups open if current path is inside them
  const defaultOpen = (group: NavGroup) =>
    group.children.some((c) => pathname.startsWith(c.href));

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    navGroups.forEach((g) => {
      state[g.label] = defaultOpen(g);
    });
    return state;
  });

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const isItemActive = (href: string) => {
    // Exact match for leaf pages, prefix for parent routes
    return pathname === href || (pathname.startsWith(href + "/") && href !== "/dashboard");
  };

  return (
    <div className="hidden lg:flex w-[280px] flex-col bg-white border-r border-gray-100 h-screen fixed top-0 left-0 m-3 rounded-3xl shadow-sm z-40 overflow-hidden">
      {/* Logo */}
      <div className="px-6 pt-8 pb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue flex items-center justify-center shrink-0">
            <svg viewBox="0 0 20 20" fill="none" className="w-6 h-6">
              <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" />
              <path d="M7 10l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <span className="text-lg font-bold text-gray-900 tracking-tight block leading-none">Scath</span>
            <span className="text-[10px] font-medium text-blue/70 uppercase tracking-widest">Admin Portal</span>
          </div>
        </div>
      </div>

      <div className="mx-6 h-px bg-gray-100 shrink-0" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {/* Dashboard (standalone) */}
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
            pathname === "/dashboard"
              ? "bg-blue text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
          )}
        >
          <LayoutDashboard className={cn("w-4 h-4 shrink-0", pathname === "/dashboard" ? "text-white" : "text-gray-400")} />
          Dashboard
        </Link>

        {/* Groups */}
        {navGroups.map((group) => {
          // Role filter
          if (group.roles && !can(group.roles)) return null;

          const isGroupActive = group.children.some((c) => isItemActive(c.href));
          const isOpen = openGroups[group.label];

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                  isGroupActive
                    ? "text-blue bg-blue/5"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <group.icon className={cn("w-4 h-4 shrink-0", isGroupActive ? "text-blue" : "text-gray-400")} />
                <span className="flex-1">{group.label}</span>
                {isOpen
                  ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
              </button>

              {isOpen && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-3">
                  {group.children.map((item) => {
                    const active = isItemActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                          active
                            ? "bg-blue text-white font-medium shadow-sm"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                        )}
                      >
                        <item.icon className={cn("w-3.5 h-3.5 shrink-0", active ? "text-white" : "text-gray-400")} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Divider */}
        <div className="mx-2 my-2 h-px bg-gray-100" />

        {/* Standalone items */}
        {standaloneItems.map((item) => {
          const active = isItemActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-blue text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-white" : "text-gray-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom info */}
      <div className="px-5 pb-6 shrink-0">
        <div className="rounded-xl bg-blue/5 border border-blue/10 p-3">
          <p className="text-xs font-semibold text-blue">Scath Platform v1.0</p>
          <p className="text-[10px] text-gray-400 mt-0.5 capitalize">
            Logged in as <span className="font-medium">{role.toLowerCase() || "admin"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
