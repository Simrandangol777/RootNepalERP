import axios from "axios";
import {
  clearAuthData,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from "../auth/storage";

const buildApiBaseUrl = () => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!envBaseUrl) {
    return "http://127.0.0.1:8000/api/";
  }

  const cleaned = envBaseUrl.replace(/\/+$/, "");
  if (/\/api(?:\/|$)/.test(cleaned)) {
    return `${cleaned}/`;
  }

  return `${cleaned}/api/`;
};

const isPublicAuthRequest = (url = "") => {
  const normalizedUrl = String(url).replace(/^\/+/, "");
  return (
    normalizedUrl.startsWith("auth/login") ||
    normalizedUrl.startsWith("auth/register") ||
    normalizedUrl.startsWith("auth/token/refresh")
  );
};

const api = axios.create({
  baseURL: buildApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !isPublicAuthRequest(config.url)) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers = [];

const clearAuthAndRedirect = () => {
  clearAuthData();
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

const notifyRefreshSubscribers = (newToken) => {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isRefreshCall = String(originalRequest?.url || "").includes("auth/token/refresh");

    if (status === 401 && originalRequest && !originalRequest._retry && !isRefreshCall) {
      const refresh = getRefreshToken();
      if (!refresh) {
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            if (!newToken) {
              reject(error);
              return;
            }
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${buildApiBaseUrl()}auth/token/refresh/`,
          { refresh }
        );
        const newAccess = refreshResponse.data?.access;
        if (!newAccess) {
          throw new Error("Refresh response missing access token");
        }

        setAccessToken(newAccess);
        notifyRefreshSubscribers(newAccess);
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        notifyRefreshSubscribers(null);
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403) {
      console.error("Authorization Error: Ensure backend allows requests from this origin.");
    } else if (!error.response) {
      console.error("Network Error: Unable to reach the server.");
    }

    return Promise.reject(error);
  }
);

export default api;
