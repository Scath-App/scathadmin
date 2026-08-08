import api from "./api";

export interface BannerAd {
  id: number;
  title?: string;
  imageUrl: string;
  targetType: "INTERNAL" | "EXTERNAL" | "NONE";
  targetValue?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** GET /admin/banners — Fetch all banner ads */
export const getBanners = async (page = 1, limit = 50) => {
  try {
    const response = await api.get("admin/banners", { params: { page, limit } });
    return response.data;
  } catch (e: any) {
    console.error("[getBanners]", e?.response?.data ?? e?.message);
    return { items: [], meta: { totalItems: 0 } };
  }
};

/** POST /admin/banners — Create a new banner ad (JSON or multipart/form-data) */
export const createBanner = async (data: FormData | object) => {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  const response = await api.post("admin/banners", data, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
  });
  return response.data;
};

/** PATCH /admin/banners/:id — Update a banner ad */
export const updateBanner = async (id: number | string, data: FormData | object) => {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  const response = await api.patch(`admin/banners/${id}`, data, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
  });
  return response.data;
};

/** DELETE /admin/banners/:id — Delete a banner ad */
export const deleteBanner = async (id: number | string) => {
  const response = await api.delete(`admin/banners/${id}`);
  return response.data;
};
