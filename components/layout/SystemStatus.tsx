"use client";

import { useQuery } from "@tanstack/react-query";
import { getApiHealth, getSafeHavenStatusDirect } from "@/lib/financeService";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useRole } from "@/hooks/useRole";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Building2,
  Database,
  Layers,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemStatusProps {
  mode?: "compact" | "full";
  className?: string;
}

export function SystemStatus({ mode = "compact", className }: SystemStatusProps) {
  const { accessToken } = useAuthStore();
  const { isAdmin, role } = useRole();
  const isAdminOrStaff = isAdmin || role === "STAFF";

  // 1. Scath API Health Check
  const {
    data: apiHealth,
    isLoading: isApiLoading,
    isRefetching: isApiRefetching,
    refetch: refetchApi,
    error: apiError,
  } = useQuery({
    queryKey: ["system-health-api"],
    queryFn: getApiHealth,
    staleTime: 60000, // 1 minute cache
    retry: 2,
    refetchOnWindowFocus: true,
  });

  // 2. SafeHaven Health Check (only run if user is logged in / has token)
  const {
    data: safeHavenHealth,
    isLoading: isShLoading,
    isRefetching: isShRefetching,
    refetch: refetchSh,
    error: shError,
  } = useQuery({
    queryKey: ["system-health-safehaven"],
    queryFn: getSafeHavenStatusDirect,
    enabled: !!accessToken && isAdminOrStaff,
    staleTime: 120000, // 2 minutes cache
    retry: 1,
    refetchOnWindowFocus: true,
  });

  const handleManualRefresh = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    refetchApi();
    if (accessToken) {
      refetchSh();
    }
  };

  const isApiUp = !apiError && apiHealth?.status === "ok";
  const isShUp = accessToken ? (!shError && safeHavenHealth?.status === "up") : true; // default true if not authenticated

  const isAnyDown = !isApiUp || !isShUp;
  const isLoading = isApiLoading || (!!accessToken && isShLoading);
  const isRefetching = isApiRefetching || isShRefetching;

  // Format timestamp safely
  const formatTime = (isoString?: string) => {
    if (!isoString) return new Date().toLocaleTimeString();
    try {
      return new Date(isoString).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (_) {
      return new Date().toLocaleTimeString();
    }
  };

  const getStatusBadge = () => {
    if (isLoading) {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200 animate-pulse">
          <span className="h-2 w-2 rounded-full bg-gray-400" />
          Checking Systems...
        </span>
      );
    }

    if (isAnyDown) {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200/60 shadow-[0_2px_8px_rgba(239,68,68,0.08)] cursor-pointer">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
          </span>
          System Issues
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-emerald-600 border border-emerald-200/60 shadow-[0_2px_8px_rgba(16,185,129,0.08)] cursor-pointer">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Systems Operational
      </span>
    );
  };

  // ─── Compact Mode (Header Navbar Dropdown) ───
  if (mode === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus:outline-none transition-transform active:scale-95">
              {getStatusBadge()}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 p-4 mt-2" align="end" forceMount>
            <div className="flex items-center justify-between mb-3">
              <DropdownMenuLabel className="p-0 font-bold text-gray-900 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue" />
                Service Health Metrics
              </DropdownMenuLabel>
              <button
                onClick={handleManualRefresh}
                disabled={isLoading || isRefetching}
                className={cn(
                  "p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 text-gray-500 transition-all",
                  isRefetching && "animate-spin"
                )}
                title="Refresh Status"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <DropdownMenuSeparator className="my-2" />

            <div className="space-y-3 py-1.5">
              {/* API Health */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-gray-400" />
                    Scath API Gateway
                  </span>
                  {isApiLoading ? (
                    <span className="text-[10px] text-gray-400 animate-pulse">Checking...</span>
                  ) : isApiUp ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">UP</span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">DOWN</span>
                  )}
                </div>

                {isApiUp && apiHealth?.checks && (
                  <div className="grid grid-cols-2 gap-2 mt-1 bg-gray-50 rounded-lg p-2 border border-gray-100/50">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Database className="w-3 h-3 text-gray-400" />
                      <span>DB:</span>
                      <span className={apiHealth.checks.database === "up" ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
                        {apiHealth.checks.database?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Layers className="w-3 h-3 text-gray-400" />
                      <span>Redis:</span>
                      <span className={apiHealth.checks.redis === "up" ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
                        {apiHealth.checks.redis?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
                {apiError && (
                  <p className="text-[10px] text-red-500 mt-0.5 leading-tight">
                    API is currently unreachable.
                  </p>
                )}
              </div>

              {/* SafeHaven Health */}
              {accessToken && (
                <div className="flex flex-col gap-1 pt-1.5 border-t border-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      Safe Haven Provider
                    </span>
                    {isShLoading ? (
                      <span className="text-[10px] text-gray-400 animate-pulse">Checking...</span>
                    ) : isShUp ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">UP</span>
                    ) : (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">DOWN</span>
                    )}
                  </div>
                  {!isShUp && safeHavenHealth?.details && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-2 mt-1">
                      <p className="text-[10px] text-red-600 leading-tight">
                        {safeHavenHealth.details}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DropdownMenuSeparator className="my-2" />

            <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
              <span>Auto-refreshing (30s)</span>
              <span>Checked: {formatTime(safeHavenHealth?.timestamp || apiHealth?.timestamp)}</span>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // ─── Full Mode (Sidebar Card Widget) ───
  return (
    <div className={cn("rounded-2xl border border-gray-100 bg-gray-50/50 p-4.5 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">System Health</span>
        <button
          onClick={handleManualRefresh}
          disabled={isLoading || isRefetching}
          className={cn(
            "p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-gray-700 border border-transparent hover:border-gray-100 transition-all",
            isRefetching && "animate-spin"
          )}
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Scath API item */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-blue/70" />
              Scath API
            </span>
            {isApiLoading ? (
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300 animate-pulse" />
            ) : isApiUp ? (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </div>

          {/* Subsystems info */}
          {isApiUp && apiHealth?.checks && (
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-50 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <Database className="w-2.5 h-2.5" />
                DB: <span className={apiHealth.checks.database === "up" ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                  {apiHealth.checks.database}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <Layers className="w-2.5 h-2.5" />
                Redis: <span className={apiHealth.checks.redis === "up" ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                  {apiHealth.checks.redis}
                </span>
              </span>
            </div>
          )}
          {apiError && (
            <p className="text-[10px] text-red-500 mt-1">Connection failed</p>
          )}
        </div>

        {/* SafeHaven Provider item */}
        {accessToken && (
          <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-blue/70" />
                Safe Haven
              </span>
              {isShLoading ? (
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300 animate-pulse" />
              ) : isShUp ? (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              ) : (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </div>

            {/* Error detail */}
            {!isShUp && safeHavenHealth?.details && (
              <p className="text-[10px] text-red-500 mt-1 bg-red-50/50 p-1.5 rounded border border-red-100/50 leading-tight">
                {safeHavenHealth.details}
              </p>
            )}
            
            {isShUp && !isShLoading && (
              <p className="text-[9px] text-gray-400 mt-1.5">
                Last checked: {formatTime(safeHavenHealth?.timestamp)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
