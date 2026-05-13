"use client";

import { useAuthStore } from "@/hooks/useAuthStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { accessToken, user } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (!accessToken) {
        router.push("/login");
      } else if (user?.role?.toUpperCase() !== "ADMIN") {
        router.push("/login");
      }
    }
  }, [accessToken, user, router, mounted]);

  if (!mounted || !accessToken || user?.role?.toUpperCase() !== "ADMIN") {
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
