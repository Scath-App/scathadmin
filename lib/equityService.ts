import api from "./api";

// ─── Listings ─────────────────────────────────────────────────────────────────

/** GET /admin/equity — 1-based pagination */
export const getEquityListings = async (page = 1, limit = 20) => {
  try {
    const response = await api.get("admin/equity", { params: { page, limit } });
    return response.data;
  } catch (_e) {
    return { data: [], meta: {} };
  }
};

export const getEquityListingById = async (id: number | string) => {
  const response = await api.get(`admin/equity/${id}`);
  return response.data;
};

export const createEquityListing = async (data: object) => {
  const response = await api.post("admin/equity", data);
  return response.data;
};

export const updateEquityListing = async (id: number | string, data: object) => {
  const response = await api.patch(`admin/equity/${id}`, data);
  return response.data;
};

export const deleteEquityListing = async (id: number | string) => {
  const response = await api.delete(`admin/equity/${id}`);
  return response.data;
};

// ─── Exit Requests ─────────────────────────────────────────────────────────────

/** GET /admin/equity/exit-requests — 1-based pagination */
export const getExitRequests = async (page = 1, limit = 20, status?: string) => {
  const response = await api.get("admin/equity/exit-requests", {
    params: { page, limit, ...(status ? { status } : {}) },
  });
  return response.data;
};

export const approveExitRequest = async (id: number | string, adminNote: string) => {
  const response = await api.post(`admin/equity/exit-request/${id}/approve`, {
    adminNote,
  });
  return response.data;
};

export const rejectExitRequest = async (id: number | string, adminNote: string) => {
  const response = await api.post(`admin/equity/exit-request/${id}/reject`, {
    adminNote,
  });
  return response.data;
};
