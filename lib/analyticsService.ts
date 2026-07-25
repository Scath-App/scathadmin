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
  page?: number;
  limit?: number;
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
    if (params.page) {
      searchParams.append("page", String(params.page));
    }
    if (params.limit) {
      searchParams.append("limit", String(params.limit));
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

// --- Top Users by Transaction Count (Suspicious Activity Monitoring) ---

export type TopUserTransactionItem = {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  role: string;
  status: string;
  transactionCount: number;
  totalVolumeInKobo: number;
  totalVolumeInNaira: number;
  avgTxSizeInKobo: number;
  avgTxSizeInNaira: number;
  isSuspiciousFlag?: boolean;
};

export type TopUsersByTransactionResponse = {
  window: AdminAnalyticsWindow;
  timezone: string;
  generatedAt: string;
  sort: "asc" | "desc";
  data: TopUserTransactionItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const getTopUsersByTransactionCount = async (
  params: (AnalyticsQueryParams & { sort?: "asc" | "desc"; limit?: number; page?: number }) | AdminAnalyticsWindow = "30d",
  timezone?: string
): Promise<TopUsersByTransactionResponse> => {
  const searchParams = buildAnalyticsParams(params, timezone);
  if (typeof params === "object" && params.sort) {
    searchParams.append("sort", params.sort);
  }
  const response = await api.get(`/admin/analytics/users/top-by-transactions?${searchParams.toString()}`);
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
    opportunitiesMeta?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
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
  const response = await api.get(`/admin/analytics/opportunities?${searchParams.toString()}`);
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
    companiesMeta?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
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
  const response = await api.get(`/admin/analytics/opportunities/export?${searchParams.toString()}`, {
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

// ─── Suspicious Activity ───────────────────────────────────────────────────────

export type AlertStatus = "OPEN" | "DISMISSED" | "ACTIONED";
export type AlertAction = "RESTRICT_LIMIT" | "SUSPEND";

export type SuspiciousActivityAlert = {
  id: number;
  userId: number;
  ruleCode: string;
  ruleLabel: string;
  detectedDateBucket: string;
  detectedAt: string;
  evidence: Record<string, unknown>;
  status: AlertStatus;
  reviewedAt: string | null;
  reviewedByAdminId: number | null;
  adminNote: string | null;
  actionTaken: AlertAction | null;
  restrictedDailyLimitInKobo: number | null;
  userName: string | null;
  userEmail: string | null;
  userPhone: string | null;
};

export type SuspiciousActivityRule = {
  id: number;
  ruleCode: string;
  label: string;
  description: string | null;
  isEnabled: boolean;
  thresholdConfig: Record<string, number>;
  sortOrder: number;
};

export type AlertsResponse = {
  data: SuspiciousActivityAlert[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export const getSuspiciousAlerts = async (params?: {
  status?: AlertStatus;
  ruleCode?: string;
  page?: number;
  limit?: number;
}): Promise<AlertsResponse> => {
  const response = await api.get("admin/analytics/alerts/suspicious", { params });
  return response.data;
};

export const dismissAlert = async (id: number, note?: string): Promise<SuspiciousActivityAlert> => {
  const response = await api.patch(`admin/analytics/alerts/suspicious/${id}/dismiss`, { note });
  return response.data;
};

export const restrictUserLimit = async (id: number, newDailyLimitInNaira: number, note?: string): Promise<SuspiciousActivityAlert> => {
  const response = await api.patch(`admin/analytics/alerts/suspicious/${id}/restrict-limit`, { newDailyLimitInNaira, note });
  return response.data;
};

export const suspendUserFromAlert = async (id: number, note?: string): Promise<SuspiciousActivityAlert> => {
  const response = await api.patch(`admin/analytics/alerts/suspicious/${id}/suspend`, { note });
  return response.data;
};

export const getSuspiciousRules = async (): Promise<SuspiciousActivityRule[]> => {
  const response = await api.get("admin/analytics/alerts/rules");
  return response.data;
};

export const updateSuspiciousRule = async (
  id: number,
  patch: Partial<Pick<SuspiciousActivityRule, "isEnabled" | "label" | "description" | "thresholdConfig" | "sortOrder">>,
): Promise<SuspiciousActivityRule> => {
  const response = await api.patch(`admin/analytics/alerts/rules/${id}`, patch);
  return response.data;
};

export const triggerSuspiciousScan = async (): Promise<{ message: string }> => {
  const response = await api.post("admin/analytics/alerts/scan/trigger");
  return response.data;
};
