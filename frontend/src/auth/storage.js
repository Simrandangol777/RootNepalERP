const AUTH_STORAGE_KEY = "auth_storage";
const AUTH_LOCAL = "local";
const AUTH_SESSION = "session";
const AUTH_USER_UPDATED_EVENT = "auth-user-updated";

const emitUserUpdated = () => {
  window.dispatchEvent(new Event(AUTH_USER_UPDATED_EVENT));
};

const getPreferredStorage = () => {
  const localHasAuth = Boolean(localStorage.getItem("access") || localStorage.getItem("refresh"));
  const sessionHasAuth = Boolean(sessionStorage.getItem("access") || sessionStorage.getItem("refresh"));

  if (localHasAuth) return localStorage;
  if (sessionHasAuth) return sessionStorage;

  return localStorage.getItem(AUTH_STORAGE_KEY) === AUTH_SESSION
    ? sessionStorage
    : localStorage;
};

export const getAccessToken = () =>
  localStorage.getItem("access") || sessionStorage.getItem("access");

export const getRefreshToken = () =>
  localStorage.getItem("refresh") || sessionStorage.getItem("refresh");

export const setAuthTokens = (access, refresh, rememberMe = true) => {
  const activeStorage = rememberMe ? localStorage : sessionStorage;
  const inactiveStorage = rememberMe ? sessionStorage : localStorage;

  activeStorage.setItem("access", access);
  activeStorage.setItem("refresh", refresh);
  localStorage.setItem(AUTH_STORAGE_KEY, rememberMe ? AUTH_LOCAL : AUTH_SESSION);

  inactiveStorage.removeItem("access");
  inactiveStorage.removeItem("refresh");
  inactiveStorage.removeItem("user_name");
  inactiveStorage.removeItem("user_email");
};

export const setAccessToken = (access) => {
  const storage = getPreferredStorage();
  storage.setItem("access", access);
};

export const setStoredUser = ({ name, email }) => {
  const storage = getPreferredStorage();
  if (name) storage.setItem("user_name", name);
  if (email) storage.setItem("user_email", email);
  emitUserUpdated();
};

export const getStoredUser = () => ({
  name: localStorage.getItem("user_name") || sessionStorage.getItem("user_name") || "Username",
  email: localStorage.getItem("user_email") || sessionStorage.getItem("user_email") || "name@example.com",
});

export const clearAuthData = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_email");

  sessionStorage.removeItem("access");
  sessionStorage.removeItem("refresh");
  sessionStorage.removeItem("user_name");
  sessionStorage.removeItem("user_email");

  localStorage.removeItem(AUTH_STORAGE_KEY);
  emitUserUpdated();
};

export const authUserUpdatedEvent = AUTH_USER_UPDATED_EVENT;
