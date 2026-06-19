import api from "./api";
import axios from "axios";
import { useAuthStore } from "@/hooks/useAuthStore";


// ─── Local Accounts ────────────────────────────────────────────────────────────

/** GET /admin/accounts — 1-based pagination */
export const getAccounts = async (params?: {
  page?: number;
  limit?: number;
  isMainAccount?: boolean;
  isSubAccount?: boolean;
}) => {
  const response = await api.get("admin/accounts", { params });
  return response.data;
};

/** GET /admin/accounts/by-number-local/:accountNumber */
export const getAccountByNumberLocal = async (accountNumber: string) => {
  const response = await api.get(`admin/accounts/by-number-local/${accountNumber}`);
  return response.data;
};

/** POST /admin/accounts/main */
export const createMainAccount = async (data: {
  accountType: string;
  suffix: string;
  purpose: string;
  metadata?: object;
}) => {
  const response = await api.post("admin/accounts/main", data);
  return response.data;
};

/** PATCH /admin/accounts/main/:id/purpose */
export const updateAccountPurpose = async (id: number | string, purpose: string) => {
  const response = await api.patch(`admin/accounts/main/${id}/purpose`, { purpose });
  return response.data;
};

/** POST /admin/accounts/:accountId/sync */
export const syncSingleAccount = async (accountId: number | string) => {
  const response = await api.post(`admin/accounts/${accountId}/sync`);
  return response.data;
};

/** POST /admin/accounts/sync */
export const syncAllAccounts = async () => {
  const response = await api.post("admin/accounts/sync");
  return response.data ?? {};
};

// ─── SafeHaven Accounts ────────────────────────────────────────────────────────

/** GET /admin/accounts/safehaven — 0-based pagination */
export const getSafeHavenAccounts = async (params?: {
  page?: number;
  limit?: number;
  isSubAccount?: boolean;
}) => {
  const response = await api.get("admin/accounts/safehaven", { params });
  return response.data;
};

/** GET /admin/accounts/by-number-safehaven/:accountNumber */
export const getAccountByNumberSafeHaven = async (
  accountNumber: string,
  isSubAccount?: boolean,
) => {
  const response = await api.get(
    `admin/accounts/by-number-safehaven/${accountNumber}`,
    { params: isSubAccount !== undefined ? { isSubAccount } : {} },
  );
  return response.data;
};

// ─── Fees ─────────────────────────────────────────────────────────────────────

export const getFees = async () => {
  try {
    const response = await api.get("admin/fees", { params: { limit: 100, page: 0 } });
    return response.data;
  } catch (_e) {
    return [];
  }
};

/** POST /admin/fees */
export const createFee = async (data: object) => {
  const response = await api.post("admin/fees", data);
  return response.data;
};

/** PATCH /admin/fees/:id — use this, NOT the deprecated PUT /markup */
export const updateFee = async (id: number | string, data: object) => {
  const response = await api.patch(`admin/fees/${id}`, data);
  return response.data;
};

/** PUT /admin/fees/:id/toggle — optimistic active toggle */
export const toggleFee = async (id: number | string) => {
  const response = await api.put(`admin/fees/${id}/toggle`);
  return response.data;
};

export const initializeFees = async (defaultPlatformMarkup = 1000) => {
  const response = await api.post("admin/fees/initialize-safehaven-fees", {
    defaultPlatformMarkup,
  });
  return response.data;
};

export const getRevenueReport = async (startDate: string, endDate: string) => {
  const response = await api.get("admin/fees/revenue-report", {
    params: { startDate, endDate },
  });
  return response.data;
};

/** POST /admin/fees/collections/:id/settle */
export const settleCollection = async (id: number | string) => {
  const response = await api.post(`admin/fees/collections/${id}/settle`);
  return response.data;
};

// ─── Manual Payouts ────────────────────────────────────────────────────────────

export const initiateManualPayout = async (data: {
  userId: number;
  amountInKobo: number;
  description: string;
  accountNumber?: string;
}) => {
  const response = await api.post("admin/finance/payouts/manual", data);
  return response.data;
};

export const getPendingPayouts = async () => {
  const response = await api.get("admin/finance/payouts/pending");
  return response.data;
};

export const approvePayout = async (id: number, reason?: string) => {
  const response = await api.post(`admin/finance/payouts/${id}/approve`, { reason });
  return response.data;
};

export const rejectPayout = async (id: number, reason: string) => {
  const response = await api.post(`admin/finance/payouts/${id}/reject`, { reason });
  return response.data;
};

// ─── Pool Transfer ─────────────────────────────────────────────────────────────

export const poolTransfer = async (data: {
  fromAccountNumber: string;
  toAccountNumber: string;
  amountInKobo: number;
  reason: string;
}) => {
  const response = await api.post("admin/finance/accounts/pool-transfer", data);
  return response.data;
};

// ─── Treasury Dashboard ────────────────────────────────────────────────────────

/** GET /admin/finance/accounts/dashboard — 0-based pagination */
export const getAccountDashboard = async (page = 0, limit = 10) => {
  const response = await api.get("admin/finance/accounts/dashboard", {
    params: { page, limit },
  });
  return response.data;
};

// ─── Deprecated — do not use in UI ────────────────────────────────────────────
// updateFeeMarkup (PUT /admin/fees/:id/markup) is intentionally removed.
// Use updateFee (PATCH /admin/fees/:id) instead.
// syncSafeHavenAccounts (GET safehaven) is replaced by getSafeHavenAccounts.

// ─── Health Checks ───────────────────────────────────────────────────────────

export const getApiHealth = async () => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_ENDPOINT || "https://api-scath-0zj3.onrender.com/api/v1/";
  const rootUrl = baseUrl.replace(/\/api\/v1\/?$/, "");
  const response = await axios.get(`${rootUrl}/health`);
  return response.data;
};

export const getSafeHavenStatusDirect = async () => {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error("No access token available");
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_ENDPOINT || "https://api-scath-0zj3.onrender.com/api/v1/";
  const response = await axios.get(`${baseUrl}admin/accounts/safehaven/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

