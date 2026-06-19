import api from "./api";

/** GET /admin/users?page=N&limit=N  (0-based) */
export const getUsers = async (page = 0, limit = 20, search?: string) => {
  const response = await api.get("admin/users", {
    params: { page, limit, ...(search ? { search } : {}) },
  });
  return response.data;
};

/** Alias kept for backward compat (fetches page 0 only) */
export const fetchUsers = async () => {
  const response = await api.get("admin/users", { params: { page: 0, limit: 50 } });
  return response.data;
};

export const getUserById = async (userId: number) => {
  const response = await api.get(`admin/users/${userId}`);
  return response.data;
};

export const createAdminUser = async (data: {
  email: string;
  password: string;
  role: "admin";
  firstName?: string;
  lastName?: string;
}) => {
  const response = await api.post("admin/users", data);
  return response.data;
};

export const updateUser = async (
  userId: number,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    role?: string;
  },
) => {
  const response = await api.patch(`admin/users/${userId}`, data);
  return response.data;
};

export const updateUserRole = async (
  userId: number,
  data: { role: "admin" | "partner" | "staff" },
) => {
  const response = await api.patch(`admin/users/${userId}/role`, data);
  return response.data;
};

export const sendCoins = async (recipientUserId: number, data: { amount: number; description?: string }) => {
  const response = await api.post(`admin/rewards/send`, { recipientUserId, ...data });
  return response.data;
};

// ─── Search Users ──────────────────────────────────────────────────────────────

export interface UserSearchResult {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  role: string;
  displayName: string;
  matchedAccountNumber: string | null;
}

export const searchUsers = async (q: string, limit = 10): Promise<UserSearchResult[]> => {
  const response = await api.get("admin/users/search", {
    params: { q, limit },
  });
  return response.data;
};

// ─── Audit Logs ────────────────────────────────────────────────────────────────

export const getAuditLogs = async (page = 0, limit = 20) => {
  const response = await api.get("admin/users/audit/logs", {
    params: { page, limit },
  });
  return response.data;
};

export function enrichAuditLog(l: any) {
  let targetUserId = l.targetUserId;
  let desc = l.description;

  if (!desc && l.endpoint) {
    const match = l.endpoint.match(/\/admin\/users\/(\d+)(?=\/|$|\?)/);
    const adminStr = l.admin?.displayName ?? `Admin #${l.adminId}`;

    if (match) {
      targetUserId = Number(match[1]);
      const targetStr = l.targetUser?.displayName ?? `User #${targetUserId}`;
      
      if (l.endpoint.includes("/saveboxes")) desc = `${adminStr} viewed ${targetStr}'s saveboxes`;
      else if (l.endpoint.includes("/transactions")) desc = `${adminStr} viewed ${targetStr}'s transactions`;
      else if (l.endpoint.includes("/equity")) desc = `${adminStr} viewed ${targetStr}'s equity portfolio`;
      else if (l.endpoint.includes("/investments")) desc = `${adminStr} viewed ${targetStr}'s investments`;
      else desc = `${adminStr} viewed ${targetStr}'s profile`;
    } else if (l.endpoint.includes("/admin/users/deleted")) {
      desc = `${adminStr} viewed deleted users`;
    } else if (l.endpoint.includes("/admin/users")) {
      if (l.endpoint.includes("/audit/logs")) {
        desc = `${adminStr} viewed audit logs`;
      } else {
        desc = `${adminStr} viewed users list`;
      }
    }
  }

  return {
    ...l,
    targetUserId,
    description: desc,
  };
}

// ─── Per-User Data ─────────────────────────────────────────────────────────────

export const getUserInvestments = async (
  userId: number,
  params?: { page?: number; limit?: number; status?: string },
) => {
  const response = await api.get(`admin/users/${userId}/investments`, { params });
  return response.data;
};

export const getUserTransactions = async (
  userId: number,
  params?: { page?: number; limit?: number },
) => {
  const response = await api.get(`admin/users/${userId}/transactions`, { params });
  return response.data;
};

export const getUserSaveboxes = async (
  userId: number,
  params?: { page?: number; limit?: number },
) => {
  const response = await api.get(`admin/users/${userId}/saveboxes`, { params });
  return response.data;
};

export const getUserEquity = async (
  userId: number,
  params?: { page?: number; limit?: number },
) => {
  const response = await api.get(`admin/users/${userId}/equity`, { params });
  return response.data;
};

/** GET /admin/accounts/by-user/:userId */
export const getUserAccounts = async (userId: number) => {
  const response = await api.get(`admin/accounts/by-user/${userId}`);
  return response.data;
};

// ─── Deleted Users ─────────────────────────────────────────────────────────────

/** GET /admin/users/deleted?page=N&limit=N */
export const getDeletedUsers = async (page = 0, limit = 20) => {
  const response = await api.get("admin/users/deleted", {
    params: { page, limit },
  });
  return response.data;
};

/** POST /admin/users/:userId/reactivate */
export const reactivateUser = async (userId: number) => {
  const response = await api.post(`admin/users/${userId}/reactivate`);
  return response.data;
};

/** DELETE /admin/users/:userId — hard or soft delete determined by backend */
export const deleteUser = async (
  userId: number,
): Promise<{ message: string; deletionType: "hard" | "soft" }> => {
  const response = await api.delete(`admin/users/${userId}`);
  return response.data;
};

/** DELETE /admin/users/bulk — mass delete user accounts in the background */
export const bulkDeleteUsers = async (userIds: number[]) => {
  const response = await api.delete(`admin/users/bulk`, {
    data: { userIds },
  });
  return response.data;
};

export interface CommunicatePayload {
  target: "ALL_USERS" | "SPECIFIC_USERS";
  userIds?: number[];
  channel: "EMAIL" | "PUSH" | "BOTH";
  subject: string;
  message: string;
}

/** POST /admin/users/communicate — send individual or bulk email/push notifications */
export const communicateUsers = async (data: CommunicatePayload) => {
  const response = await api.post("admin/users/communicate", data);
  return response.data;
};

