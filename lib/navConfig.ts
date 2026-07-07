import {
  LayoutDashboard,
  Users,
  Users2,
  ShieldAlert,
  BarChart3,
  ArrowRightLeft,
  FileText,
  Briefcase,
  TrendingUp,
  LogOut,
  PiggyBank,
  Settings2,
  ShoppingBag,
  UserPlus,
  Gift,
  Receipt,
  Building2,
  Landmark,
  LineChart,
  Settings,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface NavLeaf {
  label: string;
  href: string;
  icon: any;
}

export interface NavGroup {
  label: string;
  icon: any;
  children: NavLeaf[];
  /** If set, only these roles see this group */
  roles?: string[];
}

export interface NavSection {
  /** Section heading shown as a divider label. Omit for the top (no label). */
  sectionLabel?: string;
  groups: NavGroup[];
}

// ─── Dashboard standalone (top, no section label) ──────────────────────────────

export const dashboardItem: NavLeaf = {
  label: "Dashboard",
  href: "/dashboard",
  icon: LayoutDashboard,
};

// ─── Main nav sections ─────────────────────────────────────────────────────────

export const navSections: NavSection[] = [
  // ── User Management ─────────────────────────────────────────────────────────
  {
    sectionLabel: "User Management",
    groups: [
      {
        label: "Users",
        icon: Users,
        children: [
          { label: "All Users", href: "/dashboard/users", icon: Users2 },
          { label: "Audit Logs", href: "/dashboard/users/audit-logs", icon: ShieldAlert },
        ],
        roles: ["ADMIN", "STAFF"],
      },
    ],
  },

  // ── Finance ─────────────────────────────────────────────────────────────────
  {
    sectionLabel: "Finance",
    groups: [
      {
        label: "Treasury & Payouts",
        icon: BarChart3,
        children: [
          { label: "Treasury Dashboard", href: "/dashboard/finance/treasury", icon: BarChart3 },
          { label: "Payouts", href: "/dashboard/finance/payouts", icon: ArrowRightLeft },
        ],
        roles: ["ADMIN", "STAFF"],
      },
    ],
  },

  // ── Products ─────────────────────────────────────────────────────────────────
  {
    sectionLabel: "Products",
    groups: [
      {
        label: "Investments",
        icon: Briefcase,
        children: [
          { label: "Opportunities", href: "/dashboard/investments", icon: Briefcase },
        ],
        roles: ["ADMIN", "STAFF"],
      },
      {
        label: "Equity",
        icon: TrendingUp,
        children: [
          { label: "Listings", href: "/dashboard/equity", icon: TrendingUp },
          { label: "Exit Requests", href: "/dashboard/equity/exit-requests", icon: LogOut },
        ],
        // Equity write endpoints are ADMIN-only; staff can view but backend guards reads too
        roles: ["ADMIN"],
      },
      {
        label: "Savebox",
        icon: PiggyBank,
        children: [
          { label: "Configurations", href: "/dashboard/savebox", icon: Settings2 },
          { label: "Portfolios", href: "/dashboard/savebox/portfolios", icon: Briefcase },
        ],
        roles: ["ADMIN", "STAFF"],
      },
    ],
  },

  // ── Growth ──────────────────────────────────────────────────────────────────
  {
    sectionLabel: "Growth",
    groups: [
      {
        label: "Offers",
        icon: ShoppingBag,
        children: [
          { label: "All Offers", href: "/dashboard/offers", icon: ShoppingBag },
          { label: "Service Requests", href: "/dashboard/service-requests", icon: FileText },
        ],
        roles: ["ADMIN"],
      },
      {
        label: "Offers",
        icon: ShoppingBag,
        children: [
          { label: "All Offers", href: "/dashboard/offers", icon: ShoppingBag },
        ],
        roles: ["STAFF", "PARTNER"],
      },
      {
        label: "Service Requests",
        icon: FileText,
        children: [
          { label: "Service Requests", href: "/dashboard/service-requests", icon: FileText },
        ],
        roles: ["PARTNER"],
      },
      {
        label: "Referrals",
        icon: UserPlus,
        children: [
          { label: "Referral Settings", href: "/dashboard/referrals", icon: UserPlus },
        ],
        roles: ["ADMIN", "STAFF"],
      },
      {
        label: "Rewards",
        icon: Gift,
        children: [
          { label: "Manage Rewards", href: "/dashboard/rewards", icon: Gift },
        ],
        roles: ["ADMIN", "STAFF"],
      },
    ],
  },

  // ── Platform Config ─────────────────────────────────────────────────────────
  {
    sectionLabel: "Platform Config",
    groups: [
      {
        label: "Fees",
        icon: Receipt,
        children: [
          { label: "Configurations", href: "/dashboard/fees", icon: Receipt },
          { label: "Revenue Report", href: "/dashboard/fees/revenue", icon: BarChart3 },
        ],
        // Fee config & revenue report call ADMIN-only backend endpoints
        roles: ["ADMIN"],
      },
      {
        label: "Accounts",
        icon: Building2,
        children: [
          { label: "Account Reconciliation", href: "/dashboard/accounts", icon: Landmark },
        ],
        // Account endpoints are ADMIN-only
        roles: ["ADMIN"],
      },
    ],
  },

  // ── Reporting ────────────────────────────────────────────────────────────────
  {
    sectionLabel: "Reporting",
    groups: [
      {
        label: "Analytics",
        icon: LineChart,
        children: [
          { label: "Overview", href: "/dashboard/analytics", icon: LineChart },
          { label: "Platform Volume", href: "/dashboard/analytics/volume", icon: BarChart3 },
          { label: "Savebox", href: "/dashboard/analytics/savebox", icon: PiggyBank },
          { label: "Investments", href: "/dashboard/analytics/opportunities", icon: Briefcase },
          { label: "Equity", href: "/dashboard/analytics/equity", icon: TrendingUp },
        ],
        roles: ["ADMIN", "STAFF"],
      },
    ],
  },
];

// ─── Settings (pinned bottom) ─────────────────────────────────────────────────

export const settingsItem: NavLeaf = {
  label: "Settings",
  href: "/dashboard/settings",
  icon: Settings,
};

// ─── Flat list helper (for mobile nav & page title lookup) ─────────────────────

export const allNavLeaves: NavLeaf[] = [
  dashboardItem,
  ...navSections.flatMap((s) => s.groups.flatMap((g) => g.children)),
  settingsItem,
];
