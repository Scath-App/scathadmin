import api from "./api";

// ─── Referrals ─────────────────────────────────────────────────────────────────

export interface ReferralLeaderboardUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  referralCode: string;
  totalReferred: number;
  verifiedReferred: number;
  pendingReferred: number;
  createdAt: string;
}

export interface ReferralAnalyticsResponse {
  summary: {
    totalReferrals: number;
    verifiedReferrals: number;
    pendingReferrals: number;
    totalBonusPaid: number;
  };
  leaderboard: ReferralLeaderboardUser[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export const getReferralAnalytics = async (params?: { page?: number; limit?: number }) => {
  const response = await api.get("admin/referral/analytics", { params });
  return response.data as ReferralAnalyticsResponse;
};

export const getReferralSettings = async () => {
  try {
    const response = await api.get("admin/referral/settings");
    return response.data;
  } catch (_e) {
    return {
      referrerBonusAmount: 500,
      referredUserBonusAmount: 0,
      kycRequired: true,
      isActive: true,
      maxReferralsPerUser: 10,
    };
  }
};

export const updateReferralSettings = async (data: object) => {
  const response = await api.patch("admin/referral/settings", data);
  return response.data;
};

// ─── Investment Opportunities ──────────────────────────────────────────────────

export const getOpportunities = async () => {
  try {
    const response = await api.get("admin/investments/opportunities");
    return response.data;
  } catch (_e) {
    return [];
  }
};

export const getOpportunityById = async (id: number | string) => {
  const response = await api.get(`admin/investments/opportunities/${id}`);
  return response.data;
};

export const createOpportunity = async (data: object) => {
  const response = await api.post("admin/investments/opportunities", data);
  return response.data;
};

export const updateOpportunity = async (id: number | string, data: object) => {
  const response = await api.patch(`admin/investments/opportunities/${id}`, data);
  return response.data;
};

/** DELETE returns a message string — show in toast */
export const deleteOpportunity = async (id: number | string) => {
  const response = await api.delete(`admin/investments/opportunities/${id}`);
  return response.data;
};
