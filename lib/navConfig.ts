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
        ],
        roles: ["ADMIN", "STAFF", "PARTNER"],
      },
      {
        label: "Referrals",
        icon: UserPlus,
        children: [
          { label: "Referral Settings", href: "/dashboard/referrals", icon: UserPlus },
        ],
      },
      {
        label: "Rewards",
        icon: Gift,
        children: [
          { label: "Manage Rewards", href: "/dashboard/rewards", icon: Gift },
        ],
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
      },
      {
        label: "Accounts",
        icon: Building2,
        children: [
          { label: "Local Accounts", href: "/dashboard/accounts", icon: Landmark },
          { label: "Safe Haven", href: "/dashboard/accounts/safehaven", icon: Building2 },
        ],
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
          { label: "Platform Analytics", href: "/dashboard/analytics", icon: LineChart },
        ],
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
