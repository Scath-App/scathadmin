import axios from "axios";
import { useAuthStore } from "@/hooks/useAuthStore";
import { toast } from "sonner";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_ENDPOINT ||
  "https://api-scath-0zj3.onrender.com/api/v1/";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // 401 — try refresh, then logout
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const res = await axios.post(
            `${BASE_URL}auth/refresh`,
            { refreshToken },
          );
          const { access_token } = res.data;
          useAuthStore.getState().setTokens(access_token, refreshToken);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (_err) {
        // fall through to logout
      }
      useAuthStore.getState().logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    // 403 — permission denied
    if (status === 403) {
      toast.error("Access Denied: Your account role does not have permission to execute this operation.");
      return Promise.reject(error);
    }

    // 429 — rate limit: attach retryAfter for callers to surface countdown
    if (status === 429) {
      const retryAfter =
        Number(error.response?.headers?.["retry-after"] ?? 60);
      (error as any).rateLimited = true;
      (error as any).retryAfter = retryAfter;
      return Promise.reject(error);
    }

    // 5xx — server error
    if (status && status >= 500) {
      toast.error("Server error — please try again.");
      console.error("[API 5xx]", error.response?.data);
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default api;
