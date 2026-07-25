import api from "./api";

export type AdminAnalyticsWindow = "1d" | "7d" | "30d" | "90d";

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
    // New Pulse metrics
    lifetimeGtvInKobo?: number;
    lifetimeInflowInKobo?: number;
    lifetimeOutflowInKobo?: number;
    activeSaveboxCount?: number;
    totalInvestorsCount?: number;
    totalEquityCompaniesCount?: number;
    lifetimeRevenueBalanceInNaira?: number;
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

export type AnalyticsQueryParams = {
  window?: AdminAnalyticsWindow;
  startDate?: string;
  endDate?: string;
  timezone?: string;
};

const buildAnalyticsParams = (
  params?: AdminAnalyticsWindow | AnalyticsQueryParams,
  timezone?: string
): URLSearchParams => {
  const searchParams = new URLSearchParams();
  if (typeof params === "string") {
    searchParams.append("window", params);
    if (timezone) searchParams.append("timezone", timezone);
  } else if (params) {
    if (params.startDate && params.endDate) {
      searchParams.append("startDate", params.startDate);
      searchParams.append("endDate", params.endDate);
      if (params.window) searchParams.append("window", params.window);
    } else {
      searchParams.append("window", params.window || "30d");
    }
    if (params.timezone || timezone) {
      searchParams.append("timezone", params.timezone || timezone || "");
    }
  } else {
    searchParams.append("window", "30d");
    if (timezone) searchParams.append("timezone", timezone);
  }
  return searchParams;
};

export const getAdminAnalyticsOverview = async (
  params: AdminAnalyticsWindow | AnalyticsQueryParams = "30d",
  timezone?: string
): Promise<AdminAnalyticsOverviewResponse> => {
  const searchParams = buildAnalyticsParams(params, timezone);
  const response = await api.get(`/admin/analytics/overview?${searchParams.toString()}`);
  return response.data;
};

// --- Volume Analytics ---

export type VolumeAnalyticsResponse = {
  window: AdminAnalyticsWindow;
  timezone: string;
  generatedAt: string;
  cards: {
    totalInflow: number;
    totalOutflow: number;
    grossTransactionVolume: number;
    netPlatformFlow: number;
    totalTransactionCount: number;
    lifetimePlatformRevenue: number;
  };
  charts: {
    volumeByCategory: Array<{
      category: string;
      volume: number;
      count: number;
    }>;
    accountBreakdown: {
      totalSubAccounts: number;
      personalAccounts: number;
      businessAccounts: number;
      activeAccounts30d: number;
      avgBalance: number;
    };
    transactionHealth: {
      successRate: number;
      failureRate: number;
      reversalRate: number;
    };
    volumeOverTime: Array<{
      bucket: string;
      inflow: number;
      outflow: number;
    }>;
  };
};

export const getVolumeAnalytics = async (
  params: AdminAnalyticsWindow | AnalyticsQueryParams = "30d",
  timezone?: string
): Promise<VolumeAnalyticsResponse> => {
  const searchParams = buildAnalyticsParams(params, timezone);
  const response = await api.get(`/admin/analytics/volume?${searchParams.toString()}`);
  return response.data;
};

// --- Savebox Analytics ---

export type SaveboxAnalyticsResponse = {
  window: AdminAnalyticsWindow;
  timezone: string;
  generatedAt: string;
  cards: {
    totalCreated: number;
    currentlyActive: number;
    matured: number;
    withdrawnEarly: number;
    totalCapitalHeld: number;
    totalInterestEarned: number;
    totalDeposited: number;
    totalWithdrawn: number;
  };
  charts: {
    breakdownByType: Array<{
      type: string;
      count: number;
      capital: number;
      avgInterestRate: number;
      completionRate: number;
    }>;
    portfolioAllocations: Array<{
      equityListingId: number;
      companyName: string;
      saveboxCount: number;
      totalEquityCapital: number;
      avgAllocation: number;
    }>;
    lifecycleFunnel: {
      created: number;
      active: number;
      matured: number;
      withdrawn: number;
    };
    interestEconomy: {
      totalAccruedSystemWide: number;
      paidOut30d: number;
      avgActiveInterestRate: number;
    };
  };
};

export const getSaveboxAnalytics = async (
  params: AdminAnalyticsWindow | AnalyticsQueryParams = "30d",
  timezone?: string
): Promise<SaveboxAnalyticsResponse> => {
  const searchParams = buildAnalyticsParams(params, timezone);
  const response = await api.get(`/admin/analytics/savebox?${searchParams.toString()}`);
  return response.data;
};

// --- Opportunities Analytics ---

export type OpportunityAnalyticsResponse = {
  window: AdminAnalyticsWindow;
  timezone: string;
  generatedAt: string;
  cards: {
    totalCreated: number;
    active: number;
    soldOut: number;
    totalCapitalDeployed: number;
    totalCapitalRaised: number;
    totalReturnsPaid: number;
    totalInvestors: number;
    avgRoi: number;
    payoutSuccessRate: number;
  };
  charts: {
    opportunities: Array<{
      id: number;
      name: string;
      status: string;
      fundingGoal: number;
      totalRaised: number;
      investorCount: number;
      avgInvestment: number;
      totalReturnsPaid: number;
      roiPercentage: number;
    }>;
    investorDistribution: {
      personal: number;
      business: number;
      saveboxSourced: number;
      direct: number;
      repeatInvestors: number;
    };
    payoutHealth: {
      onTime: number;
      late: number;
      pending: number;
    };
  };
};

export const getOpportunityAnalytics = async (
  params: AdminAnalyticsWindow | AnalyticsQueryParams = "30d",
  timezone?: string
): Promise<OpportunityAnalyticsResponse> => {
  const searchParams = buildAnalyticsParams(params, timezone);
  const response = await api.get(`/admin/analytics/opportunity?${searchParams.toString()}`);
  return response.data;
};

// --- Equity Analytics ---

export type EquityAnalyticsResponse = {
  window: AdminAnalyticsWindow;
  timezone: string;
  generatedAt: string;
  cards: {
    totalCompaniesListed: number;
    activeListings: number;
    totalShareholders: number;
    totalEquityCapital: number;
    totalSharesIssued: number;
    totalExitValueRequested: number;
    approvedExitValue: number;
    lockInComplianceCount: number;
  };
  charts: {
    companies: Array<{
      id: number;
      companyName: string;
      status: string;
      valuation: number;
      sharePrice: number;
      sharesSold: number;
      shareholdersCount: number;
      capitalRaised: number;
      pendingExitsValue: number;
      mrr: number;
      arr: number;
    }>;
    shareholderBreakdown: Array<{
      companyId: number;
      companyName: string;
      firstName: string;
      lastName: string;
      customerType: string;
      shares: number;
      totalInvestment: number;
      sourceType: string;
    }>;
    exitRequests: {
      pendingCount: number;
      pendingValue: number;
      approvedCount: number;
      approvedValue: number;
      rejectedCount: number;
      rejectedValue: number;
      expiredCount: number;
      expiredValue: number;
    };
    saveboxLinkedEquity: {
      sharesViaSavebox: number;
      capitalViaSavebox: number;
      capitalViaDirect: number;
    };
  };
};

export const getEquityAnalytics = async (
  params: AdminAnalyticsWindow | AnalyticsQueryParams = "30d",
  timezone?: string
): Promise<EquityAnalyticsResponse> => {
  const searchParams = buildAnalyticsParams(params, timezone);
  const response = await api.get(`/admin/analytics/equity?${searchParams.toString()}`);
  return response.data;
};

// ─── PDF Report Downloads ─────────────────────────────────────────────────────

const triggerBlobDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const downloadVolumeReportPdf = async (
  params: AdminAnalyticsWindow | AnalyticsQueryParams = "30d",
  timezone?: string
): Promise<void> => {
  const searchParams = buildAnalyticsParams(params, timezone);
  const response = await api.get(`/admin/analytics/volume/export?${searchParams.toString()}`, {
    responseType: "blob",
  });
  const filename = typeof params === "object" && params.startDate && params.endDate
    ? `volume-report-${params.startDate}-to-${params.endDate}.pdf`
    : `volume-report-${typeof params === "string" ? params : params?.window || "30d"}.pdf`;
  triggerBlobDownload(response.data as Blob, filename);
};

export const downloadSaveboxReportPdf = async (
  params: AdminAnalyticsWindow | AnalyticsQueryParams = "30d",
  timezone?: string
): Promise<void> => {
  const searchParams = buildAnalyticsParams(params, timezone);
  const response = await api.get(`/admin/analytics/savebox/export?${searchParams.toString()}`, {
    responseType: "blob",
  });
  const filename = typeof params === "object" && params.startDate && params.endDate
    ? `savebox-report-${params.startDate}-to-${params.endDate}.pdf`
    : `savebox-report-${typeof params === "string" ? params : params?.window || "30d"}.pdf`;
  triggerBlobDownload(response.data as Blob, filename);
};

export const downloadOpportunitiesReportPdf = async (
  params: AdminAnalyticsWindow | AnalyticsQueryParams = "30d",
  timezone?: string
): Promise<void> => {
  const searchParams = buildAnalyticsParams(params, timezone);
  const response = await api.get(`/admin/analytics/opportunity/export?${searchParams.toString()}`, {
    responseType: "blob",
  });
  const filename = typeof params === "object" && params.startDate && params.endDate
    ? `opportunities-report-${params.startDate}-to-${params.endDate}.pdf`
    : `opportunities-report-${typeof params === "string" ? params : params?.window || "30d"}.pdf`;
  triggerBlobDownload(response.data as Blob, filename);
};

export const downloadEquityReportPdf = async (
  params: AdminAnalyticsWindow | AnalyticsQueryParams = "30d",
  timezone?: string
): Promise<void> => {
  const searchParams = buildAnalyticsParams(params, timezone);
  const response = await api.get(`/admin/analytics/equity/export?${searchParams.toString()}`, {
    responseType: "blob",
  });
  const filename = typeof params === "object" && params.startDate && params.endDate
    ? `equity-report-${params.startDate}-to-${params.endDate}.pdf`
    : `equity-report-${typeof params === "string" ? params : params?.window || "30d"}.pdf`;
  triggerBlobDownload(response.data as Blob, filename);
};
