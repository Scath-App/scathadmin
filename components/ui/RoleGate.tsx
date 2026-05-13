"use client";

import { ReactNode } from "react";
import { useRole } from "@/hooks/useRole";

interface RoleGateProps {
  /** Allowed roles — at least one must match. Case-insensitive. */
  roles: string[];
  /** Rendered when role does NOT match (optional) */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Renders `children` only when the authenticated user's role is included in `roles`.
 * Use `fallback` to render something else for unauthorized users.
 */
export function RoleGate({ roles, fallback = null, children }: RoleGateProps) {
  const { can } = useRole();
  return can(roles) ? <>{children}</> : <>{fallback}</>;
}
