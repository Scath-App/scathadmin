"use client";

import { useAuthStore } from "@/hooks/useAuthStore";
import { useQuery } from "@tanstack/react-query";
import { getAccountDashboard } from "@/lib/financeService";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, Bell, EyeOff } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  PiggyBank,
  CreditCard,
  ShoppingBag,
  UserPlus,
  Briefcase,
  LineChart,
  Settings,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "All Users", href: "/dashboard/users", icon: Users },
  { name: "Audit Logs", href: "/dashboard/users/audit-logs", icon: Users },
  { name: "Local Accounts", href: "/dashboard/accounts", icon: CreditCard },
  {
    name: "SafeHaven Accounts",
    href: "/dashboard/accounts/safehaven",
    icon: CreditCard,
  },
  {
    name: "Treasury Dashboard",
    href: "/dashboard/finance/treasury",
    icon: CreditCard,
  },
  { name: "Payouts", href: "/dashboard/finance/payouts", icon: CreditCard },
  { name: "Fee Configurations", href: "/dashboard/fees", icon: Settings },
  { name: "Revenue Report", href: "/dashboard/fees/revenue", icon: LineChart },
  { name: "Investments", href: "/dashboard/investments", icon: Briefcase },
  { name: "Equity Listings", href: "/dashboard/equity", icon: TrendingUp },
  {
    name: "Exit Requests",
    href: "/dashboard/equity/exit-requests",
    icon: TrendingUp,
  },
  { name: "Savebox Config", href: "/dashboard/savebox", icon: PiggyBank },
  {
    name: "Portfolios",
    href: "/dashboard/savebox/portfolios",
    icon: PiggyBank,
  },
  { name: "Offers", href: "/dashboard/offers", icon: ShoppingBag },
  { name: "Invoices", href: "/dashboard/invoices", icon: Settings },
  { name: "Referral Settings", href: "/dashboard/referrals", icon: UserPlus },
  { name: "Rewards", href: "/dashboard/rewards", icon: UserPlus },
];

export function Header() {
  const { user, logout } = useAuthStore();
  const pathname = usePathname();

  const isDashboardHome = pathname === "/dashboard" || pathname === "/dashboard/";

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["accountDashboard-header"],
    queryFn: () => getAccountDashboard(0, 50),
    enabled: isDashboardHome,
  });

  const accounts = dashboardData?.data ?? [];
  const adminAccount = accounts.find(
    (a: any) => a.accountName === "THESCATHCOMPANIES"
  );

  const mainBalanceValue = adminAccount?.balanceInNaira ?? (Number(adminAccount?.accountBalanceInKobo ?? 0) / 100);
  const mainBalance = mainBalanceValue.toLocaleString("en-NG", { minimumFractionDigits: 2 });

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Dashboard";
    const sorted = [...navItems].sort((a, b) => b.href.length - a.href.length);
    const found = sorted.find((item) => pathname.startsWith(item.href));
    return found ? found.name : "Dashboard";
  };

  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "AD";

  if (isDashboardHome) {
    return (
      <header className="bg-blue px-6 sm:px-8 pt-6 pb-10 text-white">
        {/* Top row */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-white hover:bg-white/10"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-72 p-0 bg-white border-r-0"
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <MobileNav pathname={pathname} />
              </SheetContent>
            </Sheet>
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-white/80 text-sm mt-0.5">
                Welcome back,{" "}
                <span className="font-semibold">
                  {user?.firstName || "Admin"}
                </span>{" "}
                👋
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 relative"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-yellow border-2 border-blue" />
            </Button>
            <UserMenu user={user} logout={logout} initials={initials} light />
          </div>
        </div>

        {/* Balance display */}
        <div>
          <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-2">
            Parent Account Balance
          </p>
          <div className="flex items-center gap-3">
            <EyeOff className="w-5 h-5 text-white/60" />
            <span className="text-4xl font-bold tracking-tight">
              {dashboardLoading ? (
                <span className="opacity-50">₦ ...,...</span>
              ) : (
                <>
                  ₦ {mainBalance.split(".")[0]}
                  <span className="text-2xl">.{mainBalance.split(".")[1]}</span>
                </>
              )}
            </span>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 h-16 w-full flex items-center justify-between border-b bg-white px-6 sm:px-8 shadow-sm">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-gray-600"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-white border-r-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <MobileNav pathname={pathname} />
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-semibold text-gray-900">
          {getPageTitle()}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:text-gray-700 relative"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-red border-2 border-white" />
        </Button>
        <UserMenu user={user} logout={logout} initials={initials} />
      </div>
    </header>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-8 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue flex items-center justify-center">
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <circle cx="10" cy="10" r="7" stroke="white" strokeWidth="2" />
              <path
                d="M7 10l2 2 4-4"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900">Scath App</span>
        </div>
      </div>
      <div className="mx-6 h-px bg-gray-100 mb-4" />
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-blue text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <item.icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  isActive ? "text-white" : "text-gray-400",
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function UserMenu({
  user,
  logout,
  initials,
  light,
}: {
  user: any;
  logout: () => void;
  initials: string;
  light?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "flex items-center gap-2 px-2 py-1 h-9 rounded-full border",
            light
              ? "border-white/20 hover:bg-white/10 text-white"
              : "border-gray-200 hover:bg-gray-50 text-gray-700",
          )}
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback
              className={cn(
                "text-xs font-bold",
                light ? "bg-white/20 text-white" : "bg-blue text-white",
              )}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            className="opacity-70"
          >
            <path
              d="M1 1L5 5L9 1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-0.5">
            <p className="text-sm font-semibold">
              {user?.firstName || "Admin"} {user?.lastName || ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {user?.email || "admin@scath.app"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings" className="cursor-pointer">
            Profile Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={logout}
          className="text-red-500 cursor-pointer"
        >
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
