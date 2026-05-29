import api from "./api";

export type AdminAnalyticsWindow = "7d" | "30d" | "90d";

export type AdminAnalyticsOverviewResponse = {
  window: AdminAnalyticsWindow;
  timezone: string;
  generatedAt: string;
  cards: {
    totalUsers: number;
    totalDeletedUsers: number;
    mainAccountBalanceInKobo: number;
    mainAccountBalanceInNaira: number;
    settledRevenueInNaira: number;
    unsettledRevenueInNaira: number;
    rewardsBalance: number;
  };
  charts: {
    treasuryByPurpose: Array<{
      purpose: string;
      balanceInKobo: number;
      balanceInNaira: number;
    }>;
    revenueByServiceType: {
      settled: Array<{
        serviceType: string;
        transactionCount: number;
        platformRevenue: number;
        providerFees: number;
      }>;
      unsettled: Array<{
        serviceType: string;
        transactionCount: number;
        platformRevenue: number;
        providerFees: number;
      }>;
    };
    userGrowth: Array<{
      bucket: string;
      newUsers: number;
      deletedUsers: number;
    }>;
    rewardActivity: Array<{
      bucket: string;
      credits: number;
      debits: number;
      transactionCount: number;
    }>;
  };
};

export const getAdminAnalyticsOverview = async (
  window: AdminAnalyticsWindow = "30d",
  timezone?: string
): Promise<AdminAnalyticsOverviewResponse> => {
  const params = new URLSearchParams({ window });
  if (timezone) {
    params.append("timezone", timezone);
  }
  const response = await api.get(`/admin/analytics/overview?${params.toString()}`);
  return response.data;
};
