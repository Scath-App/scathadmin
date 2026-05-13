import api from "./api";

/** GET /admin/offers — correct admin endpoint */
export const getOffers = async (page = 1, limit = 20) => {
  try {
    const response = await api.get("admin/offers", { params: { page, limit } });
    return response.data;
  } catch (_e) {
    return { data: [], meta: {} };
  }
};

export const createOffer = async (data: object) => {
  const response = await api.post("admin/offers", data);
  return response.data;
};

/**
 * PATCH /admin/offers/:id — returns TypeORM result { affected: 1 }.
 * Callers must re-fetch the list after success.
 */
export const updateOffer = async (id: number | string, data: object) => {
  const response = await api.patch(`admin/offers/${id}`, data);
  return response.data;
};

/**
 * DELETE /admin/offers/:id — returns TypeORM result { affected: 1 }.
 */
export const deleteOffer = async (id: number | string) => {
  const response = await api.delete(`admin/offers/${id}`);
  return response.data;
};

// ─── Pending Offer Requests ────────────────────────────────────────────────────

export const getPendingOfferRequests = async () => {
  const response = await api.get("admin/offers/requests/pending");
  return response.data;
};

export const submitOfferQuote = async (
  id: number | string,
  data: { amount: number; serviceDescription: string },
) => {
  const response = await api.post(`admin/offers/requests/${id}/quote`, data);
  return response.data;
};
