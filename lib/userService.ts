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
  role: string;
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

export const sendCoins = async (userId: number, data: { amount: number; description?: string }) => {
  const response = await api.post(`admin/rewards/send/${userId}`, data);
  return response.data;
};

// ─── Audit Logs ────────────────────────────────────────────────────────────────

export const getAuditLogs = async (page = 0, limit = 20) => {
  const response = await api.get("admin/users/audit/logs", {
    params: { page, limit },
  });
  return response.data;
};

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
