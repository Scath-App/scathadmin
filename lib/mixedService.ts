import api from "./api";

// ─── Referrals ─────────────────────────────────────────────────────────────────

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
