import api from "../api/axios";
import { clearAuthData, setAuthTokens } from "./storage";

export const register = async (data) => {
  const response = await api.post("auth/register/", data);
  return response.data;
};

export const login = async (data) => {
  const response = await api.post("auth/login/", data);
  setAuthTokens(response.data.access, response.data.refresh, true);
  return response.data;
};

export const logout = () => {
  clearAuthData();
};

export const getCurrentUser = async () => {
  const response = await api.get("auth/me/");
  return response.data;
};
