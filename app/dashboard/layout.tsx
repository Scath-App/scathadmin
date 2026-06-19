"use client";

import { useAuthStore } from "@/hooks/useAuthStore";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Loader2 } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { navSections } from "@/lib/navConfig";

const ALLOWED_ROLES = ["ADMIN", "STAFF", "PARTNER"];

const isRouteAllowed = (path: string, can: (roles: string[]) => boolean) => {
  if (path === "/dashboard" || path.startsWith("/dashboard/settings")) {
    return true;
  }
  let routeMatched = false;
  let hasPermission = false;

  for (const section of navSections) {
    for (const group of section.groups) {
      if (group.children.some((child) => path.startsWith(child.href))) {
        routeMatched = true;
        if (!group.roles || can(group.roles)) {
          hasPermission = true;
          break;
        }
      }
    }
    if (hasPermission) break;
  }

  if (routeMatched && !hasPermission) {
    return false;
  }
  return true;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { accessToken, user } = useAuthStore();
  const { can, role } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userRole = (user?.role || "").toUpperCase();
  const isAllowedRole = ALLOWED_ROLES.includes(userRole);
  const isPageAuthorized = accessToken && isAllowedRole && isRouteAllowed(pathname, can);

  useEffect(() => {
    if (mounted) {
      if (!accessToken || !isAllowedRole) {
        router.push("/login");
      } else {
        const allowed = isRouteAllowed(pathname, can);
        if (!allowed) {
          if (userRole === "PARTNER") {
            router.push("/dashboard/offers");
          } else {
            router.push("/dashboard");
          }
        }
      }
    }
  }, [accessToken, userRole, pathname, router, mounted, isAllowedRole, can]);

  if (!mounted || !isPageAuthorized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue" />
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-screen dark:bg-zinc-900">
      <Sidebar />
      <div className="flex w-full flex-col lg:ml-[300px] relative z-0">
        <Header />
        <main className="flex-1 w-full pb-10">
          <div className="w-full h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
