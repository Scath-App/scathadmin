import api from "./api";

// ─── Savebox Configs ───────────────────────────────────────────────────────────

export const getSaveboxConfigs = async () => {
  try {
    const response = await api.get("admin/savebox/config");
    return response.data;
  } catch (_e) {
    return [];
  }
};

export const createSaveboxConfig = async (data: {
  type: string;
  duration: number;
  interestRate: number;
  upfrontRate: number;
  spreadRate: number;
}) => {
  const response = await api.post("admin/savebox/config", data);
  return response.data;
};

export const updateSaveboxConfig = async (id: number | string, data: object) => {
  const response = await api.patch(`admin/savebox/config/${id}`, data);
  return response.data;
};

/** DELETE /admin/savebox/config/:id — 200/204 = success, no body */
export const deleteSaveboxConfig = async (id: number | string) => {
  const response = await api.delete(`admin/savebox/config/${id}`);
  return response.data;
};

// ─── Portfolios ────────────────────────────────────────────────────────────────

export const getPortfolioStrategies = async () => {
  const response = await api.get("admin/savebox/portfolio-strategies");
  return response.data;
};

export const getPortfolios = async (includeInactive = false) => {
  const response = await api.get("admin/savebox/portfolios", {
    params: { includeInactive },
  });
  return response.data;
};

export const createPortfolio = async (data: object) => {
  const response = await api.post("admin/savebox/portfolios", data);
  return response.data;
};

export const updatePortfolio = async (id: number | string, data: object) => {
  const response = await api.patch(`admin/savebox/portfolios/${id}`, data);
  return response.data;
};
