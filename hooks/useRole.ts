import { useAuthStore } from "@/hooks/useAuthStore";

export interface RoleHelpers {
  role: string;
  isAdmin: boolean;
  isStaff: boolean;
  isPartner: boolean;
  /** Returns true if the current role is in `roles` (case-insensitive) */
  can: (roles: string[]) => boolean;
}

export function useRole(): RoleHelpers {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "").toUpperCase();

  return {
    role,
    isAdmin: role === "ADMIN",
    isStaff: role === "STAFF",
    isPartner: role === "PARTNER",
    can: (roles: string[]) =>
      roles.map((r) => r.toUpperCase()).includes(role),
  };
}
