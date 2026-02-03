import api from "../api/axios";

export const register = async (data) => {
  const response = await api.post("auth/register/", data);
  return response.data;
};

export const login = async (data) => {
  const response = await api.post("auth/login/", data);
  localStorage.setItem("accessToken", response.data.access);
  localStorage.setItem("refreshToken", response.data.refresh);
  return response.data;
};

export const logout = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

export const getCurrentUser = async () => {
  const response = await api.get("auth/me/");
  return response.data;
};
