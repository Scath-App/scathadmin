import api from "./api";

export interface RewardHistoryUserSummary {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface AdminRewardHistoryItem {
  id: number;
  userId: number | null;
  amount: number;
  type: "credit" | "debit";
  description: string | null;
  reference: string | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  user: RewardHistoryUserSummary | null;
}

export interface AdminRewardsHistoryResponse {
  data: AdminRewardHistoryItem[];
  meta: {
    page: number;
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface AdminRewardsBalanceResponse {
  balance: number;
}

export interface SendRewardsResponse {
  id: number;
  amount: number;
  type: "credit" | "debit";
  description: string | null;
  reference: string | null;
  createdAt: string;
}

/**
 * GET /api/v1/admin/rewards/history?limit=N&cursor=opaque
 */
export const getAdminRewardsHistory = async (params?: {
  limit?: number;
  cursor?: string;
}): Promise<AdminRewardsHistoryResponse> => {
  const response = await api.get("admin/rewards/history", {
    params,
  });
  return response.data;
};

/**
 * GET /api/v1/admin/rewards/balance
 * Returns { balance: number }
 */
export const getAdminRewardsBalance =
  async (): Promise<AdminRewardsBalanceResponse> => {
    const response = await api.get("admin/rewards/balance");
    return response.data;
  };

/**
 * POST /api/v1/admin/rewards/send/:userId
 */
export const sendRewards = async (
  recipientUserId: number,
  amount: number,
  description?: string,
): Promise<SendRewardsResponse> => {
  const response = await api.post(`admin/rewards/send`, {
    recipientUserId,
    amount,
    ...(description ? { description } : {}),
  });
  return response.data;
};
