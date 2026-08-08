import api from "./api";

/** GET /admin/users?page=N&limit=N&status=S  (0-based) */
export const getUsers = async (page = 0, limit = 20, search?: string, status?: string) => {
  const response = await api.get("admin/users", {
    params: { page, limit, ...(search ? { search } : {}), ...(status ? { status } : {}) },
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
  target:
    | "ALL_USERS"
    | "ACTIVE_USERS"
    | "PENDING_USERS"
    | "INCOMPLETE_USERS"
    | "SUSPENDED_USERS"
    | "SPECIFIC_USERS";
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

/** PATCH /admin/users/:userId/status — suspend a user account */
export const suspendUser = async (userId: number, reason?: string) => {
  const response = await api.patch(`admin/users/${userId}/status`, {
    action: "suspend",
    reason,
  });
  return response.data;
};

/** PATCH /admin/users/:userId/status — unsuspend a user account */
export const unsuspendUser = async (userId: number) => {
  const response = await api.patch(`admin/users/${userId}/status`, {
    action: "unsuspend",
  });
  return response.data;
};

// ─── KYC Reviews & Compliance Audit ──────────────────────────────────────────

export interface EnrichedKycVerification {
  id: number;
  userId: number;
  customerType?: "PERSONAL" | "BUSINESS" | string;
  status: string;
  targetTierLevel: number;
  verificationType?: string;
  provider?: string;
  providerMetadata?: {
    tin?: string;
    cacUrl?: string;
    statusReportUrl?: string;
    memartUrl?: string;
    businessType?: string;
    submittedAt?: string;
    [key: string]: any;
  } | null;
  failureStage: string | null;
  failureReason: string | null;
  primaryPhotoUrl: string | null;
  secondaryPhotoUrl: string | null;
  livenessSelfieUrl: string | null;
  triangularFaceScore: number | null;
  triangularFaceStatus: string | null;
  livenessScore: number | null;
  livenessStatus: string | null;
  livenessPassed: boolean | null;
  faceMatchScore: number | null;
  faceMatchPassed: boolean | null;
  poaStatus?: string | null;
  poaAddress?: string | null;
  poaParsedAddress?: { street?: string; city?: string; country?: string } | null;
  demographicData: any | null;
  complementaryIdType: string | null;
  complementaryIdNumber: string | null;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
  } | null;
  adminNotes: string | null;
  reviewedByAdminId: number | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface PendingKycDocument {
  id: number;
  userId: number;
  documentType: string;
  fileUrl: string;
  tinExtracted: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
  } | null;
}

export interface PendingKycReviewsResponse {
  pendingVerifications: EnrichedKycVerification[];
  pendingDocuments: PendingKycDocument[];
}

export interface UserAuditReport {
  generatedAt?: string;
  user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phoneNumber?: string | null;
    isPhoneVerified?: boolean;
    dob?: string | null;
    role: string;
    status?: string;
    isVerified: boolean;
    kycStatus?: boolean;
    kycType?: string | null;
    kycId?: string | null;
    kycNumber?: string | null;
    bvnNumber?: string | null;
    ninNumber?: string | null;
    tierLevel?: number;
    customerType: string | null;
    companyName?: string | null;
    companyRegistrationNumber?: string | null;
    image?: string | null;
    kycPhotoUrl?: string | null;
    bvnPhotoUrl?: string | null;
    ninPhotoUrl?: string | null;
    address?: string | null;
    poaAddress?: string | null;
    poaStatus?: string | null;
    city?: string | null;
    state?: string | null;
    createdAt: string;
  };
  accounts: Array<{
    id?: number;
    accountNumber?: string | null;
    bankName?: string;
    accountName?: string;
    accountType?: string;
    accountBalanceInKobo?: number;
    bookBalanceInKobo?: number;
    currencyCode?: string;
    balance?: number;
    status?: string;
  }>;
  transactions: {
    total: number;
    inflow?: { count: number; totalAmountInKobo: number };
    outflow?: { count: number; totalAmountInKobo: number };
    items: Array<{
      id: number | string;
      reference?: string;
      type: string;
      status: string;
      amountInKobo?: number;
      amount?: number;
      totalFeeInKobo?: number;
      platformFeeInKobo?: number;
      providerFeeInKobo?: number;
      description?: string | null;
      narration?: string | null;
      debitAccountNumber?: string | null;
      creditAccountNumber?: string | null;
      providerReference?: string | null;
      sender?: { name: string | null; bank: string | null; accountNumber: string | null };
      receiver?: { name: string | null; bank: string | null; accountNumber: string | null };
      counterparty?: string;
      createdAt: string;
    }>;
  } | Array<any>;
  kycVerifications?: Array<{
    id: number;
    targetTierLevel: number;
    verificationType: string;
    status: string;
    provider?: string | null;
    faceMatchScore?: number | null;
    livenessScore?: number | null;
    faceMatchPassed?: boolean | null;
    livenessPassed?: boolean | null;
    userSelfieUrl?: string | null;
    secondaryPhotoUrl?: string | null;
    complementaryPhotoUrl?: string | null;
    complementaryIdType?: string | null;
    complementaryIdNumber?: string | null;
    failureReason?: string | null;
    demographicData?: any;
    createdAt: string;
  }>;
  businessDetails?: {
    companyName?: string | null;
    companyRegistrationNumber?: string | null;
    tin?: string | null;
    cacUrl?: string | null;
    statusReportUrl?: string | null;
    memartUrl?: string | null;
    businessType?: string | null;
    documents?: Array<{
      id: number;
      documentType: string;
      fileUrl: string;
      tinExtracted?: string | null;
      status: string;
    }>;
  } | null;
}

/** GET /users/kyc/pending-reviews — fetch manual KYC review queue */
export const getPendingKycReviews = async (): Promise<PendingKycReviewsResponse> => {
  const response = await api.get("users/kyc/pending-reviews");
  return response.data;
};

/** POST /users/kyc/review/:id — approve or reject a manual KYC verification */
export const reviewKycVerification = async (
  verificationId: number,
  data: { approved: boolean; adminNotes?: string },
) => {
  const response = await api.post(`users/kyc/review/${verificationId}`, data);
  return response.data;
};

/** GET /admin/users/:userId/audit-report — fetch consolidated compliance audit report */
export const getUserAuditReport = async (userId: number): Promise<UserAuditReport> => {
  const response = await api.get(`admin/users/${userId}/audit-report`);
  return response.data;
};

/** GET /admin/users/:userId/audit-report/pdf — download vector PDF audit report */
export const downloadUserAuditReportPdf = async (userId: number): Promise<Blob> => {
  const response = await api.get(`admin/users/${userId}/audit-report/pdf`, {
    responseType: "blob",
  });
  return response.data;
};


