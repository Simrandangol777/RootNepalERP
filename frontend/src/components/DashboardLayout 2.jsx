import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authUserUpdatedEvent, clearAuthData, getStoredUser } from "../auth/storage";
import api from "../api/axios";
import logo from '../assets/logo.jpeg';
import Footer from "./Footer";
import { normalizeReportData } from "../utils/reportData";

const THEME_STORAGE_KEY = "ui-theme-mode";
const VALID_THEME_MODES = new Set(["light", "dark", "system"]);

const getSystemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const resolveTheme = (mode) => (mode === "system" ? getSystemTheme() : mode);

const getStoredThemeMode = () => {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  return VALID_THEME_MODES.has(saved) ? saved : "system";
};

const applyThemeToDocument = (theme) => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
};

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [user, setUser] = useState(getStoredUser());
  const [themeMode, setThemeMode] = useState(getStoredThemeMode);
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(getStoredThemeMode()));
  const [notificationSummary, setNotificationSummary] = useState({ total: 0, high: 0 });

  const isLightTheme = resolvedTheme === "light";

  useEffect(() => {
    const syncUser = () => {
      setUser(getStoredUser());
    };

    window.addEventListener("storage", syncUser);
    window.addEventListener(authUserUpdatedEvent, syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener(authUserUpdatedEvent, syncUser);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleBreakpointChange = (event) => {
      setIsSidebarOpen(event.matches);
    };

    handleBreakpointChange(mediaQuery);
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleBreakpointChange);
    } else {
      mediaQuery.addListener(handleBreakpointChange);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleBreakpointChange);
      } else {
        mediaQuery.removeListener(handleBreakpointChange);
      }
    };
  }, []);

  useEffect(() => {
    const nextTheme = resolveTheme(themeMode);
    setResolvedTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    applyThemeToDocument(nextTheme);
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      const nextTheme = mediaQuery.matches ? "dark" : "light";
      setResolvedTheme(nextTheme);
      applyThemeToDocument(nextTheme);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
    } else {
      mediaQuery.addListener(handleSystemThemeChange);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, [themeMode]);

  useEffect(() => {
    let isActive = true;

    const fetchNotificationSummary = async () => {
      try {
        const res = await api.get("reports/dashboard/", { params: { date_range: "all_time" } });
        if (!isActive) return;

        const reportData = normalizeReportData(res.data);
        const restockSuggestions = Array.isArray(reportData.restockSuggestions)
          ? reportData.restockSuggestions
          : [];

        const highPriorityCount = restockSuggestions.filter((item) => item?.priority === "High").length;

        setNotificationSummary({
          total: restockSuggestions.length,
          high: highPriorityCount,
        });
      } catch (error) {
        if (!isActive) return;
        setNotificationSummary({ total: 0, high: 0 });
      }
    };

    fetchNotificationSummary();

    return () => {
      isActive = false;
    };
  }, []);

  const handleLogout = () => {
    clearAuthData();
    navigate('/login');
  };

  // Navigation items matching your design
  const navItems = [
    { 
      id: 'dashboard', 
      name: 'Dashboard', 
      path: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    { 
      id: 'product', 
      name: 'Product', 
      path: '/products',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    { 
      id: 'inventory', 
      name: 'Inventory', 
      path: '/inventory',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    { 
      id: 'categories', 
      name: 'Categories', 
      path: '/categories',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    { 
      id: 'purchase', 
      name: 'Purchase', 
      path: '/purchase',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    },
    { 
      id: 'sales', 
      name: 'Sales', 
      path: '/sales',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      id: 'reports', 
      name: 'Reports', 
      path: '/reports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      id: 'profile', 
      name: 'Profile', 
      path: '/profile-overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  const isActive = (item) => {
    if (item.id === "profile") {
      return location.pathname === "/profile-overview" || location.pathname === "/profile";
    }
    return location.pathname === item.path;
  };

  const notificationCountLabel =
    notificationSummary.total > 99 ? "99+" : String(notificationSummary.total);
  const isNotificationsPage = location.pathname === "/notifications";

  return (
    <div
      data-dashboard-theme={resolvedTheme}
      className={`dashboard-shell min-h-screen relative overflow-hidden ${
        isLightTheme
          ? "bg-gradient-to-br from-slate-100 via-blue-100 to-slate-100"
          : "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
      }`}
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl animate-blob ${isLightTheme ? "bg-sky-300 opacity-30" : "bg-purple-500 opacity-20"}`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000 ${isLightTheme ? "bg-emerald-300 opacity-30" : "bg-blue-500 opacity-20"}`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000 ${isLightTheme ? "bg-amber-300 opacity-25" : "bg-pink-500 opacity-20"}`}></div>
      </div>

      <div className="relative flex min-h-screen">
        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          id="dashboard-sidebar"
          className={`fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-300 backdrop-blur-xl border-r lg:static ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } ${
            isSidebarOpen ? "w-64" : "w-64 lg:w-20"
          } ${isLightTheme ? "bg-white/85 border-slate-200" : "bg-white/10 border-white/20"}`}
        >
          {/* User Profile Section - Top */}
          <div className={`p-4 border-b ${isLightTheme ? 'border-slate-200' : 'border-white/20'}`}>
            <Link
              to="/profile-overview"
              className={`flex items-center gap-3 rounded-xl p-2 -m-2 transition-all ${!isSidebarOpen && 'justify-center'} ${isLightTheme ? 'hover:bg-slate-100' : 'hover:bg-white/10'}`}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  (user.name?.charAt(0) || "U").toUpperCase()
                )}
              </div>
              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate text-sm ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>{user.name}</p>
                  <p className={`text-xs truncate ${isLightTheme ? 'text-slate-500' : 'text-white/60'}`}>{user.email}</p>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive(item)
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : isLightTheme
                      ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.icon}
                {isSidebarOpen && <span className="font-medium text-sm">{item.name}</span>}
              </Link>
            ))}
          </nav>

          {/* Collapse Button */}
          <div className={`p-4 border-t ${isLightTheme ? 'border-slate-200' : 'border-white/20'}`}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${
                isLightTheme
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                  : 'bg-white/5 hover:bg-white/10 text-white'
              }`}
              aria-expanded={isSidebarOpen}
              aria-controls="dashboard-sidebar"
            >
              <svg className={`w-5 h-5 transition-transform ${!isSidebarOpen && 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              {isSidebarOpen && <span className="text-sm font-medium">Collapse</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Top Navigation Bar */}
          <header className={`backdrop-blur-xl border-b px-6 py-4 flex-shrink-0 ${isLightTheme ? 'bg-white/85 border-slate-200' : 'bg-white/10 border-white/20'}`}>
            <div className="flex items-center justify-between">
              {/* Left - Logo and Title */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={`lg:hidden p-2 transition-colors ${isLightTheme ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white'}`}
                  aria-expanded={isSidebarOpen}
                  aria-controls="dashboard-sidebar"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <Link to="/dashboard" className="flex items-center gap-3 group">
                  <img src={logo} alt="Logo" className={`w-8 h-8 rounded-lg object-cover ring-1 transition-all ${isLightTheme ? 'ring-slate-200 group-hover:ring-slate-400' : 'ring-white/20 group-hover:ring-white/40'}`} />
                  <h1 className={`font-bold text-xl hidden sm:block transition-colors ${isLightTheme ? 'text-slate-900 group-hover:text-slate-700' : 'text-white group-hover:text-white/90'}`}>
                    Root Nepals ERP System
                  </h1>
                </Link>
              </div>

              {/* Right - Actions */}
              <div className="flex items-center gap-3">
                <Link
                  to="/notifications"
                  aria-label="Open notifications"
                  className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition-all ${
                    isNotificationsPage
                      ? "border-cyan-400/40 bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg"
                      : isLightTheme
                        ? "border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200"
                        : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.389 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
                  </svg>

                  {notificationSummary.high > 0 && (
                    <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-400 ring-2 ring-white/40 animate-pulse"></span>
                  )}

                  {notificationSummary.total > 0 && (
                    <span className={`absolute -right-2 -top-2 min-w-[1.4rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${
                      notificationSummary.high > 0
                        ? "bg-red-500 text-white"
                        : "bg-cyan-500 text-white"
                    }`}>
                      {notificationCountLabel}
                    </span>
                  )}
                </Link>

                {/* Theme Mode */}
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${isLightTheme ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-white/10 border-white/20 text-white'}`}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m7.778-4.222l-1.414-1.414M6.636 6.636L5.222 5.222m14.556 0l-1.414 1.414M6.636 17.364l-1.414 1.414M21 12h-2M5 12H3m9 5a5 5 0 100-10 5 5 0 000 10z" />
                  </svg>
                  <select
                    value={themeMode}
                    onChange={(event) => setThemeMode(event.target.value)}
                    className={`bg-transparent text-sm font-medium focus:outline-none ${isLightTheme ? 'text-slate-900' : 'text-white'}`}
                    aria-label="Theme mode"
                  >
                    <option value="light" className="text-slate-900">Light</option>
                    <option value="dark" className="text-slate-900">Dark</option>
                    <option value="system" className="text-slate-900">System</option>
                  </select>
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isLightTheme
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="dashboard-content flex-1 overflow-auto flex flex-col">
            <div className="flex-1">
              {children}
            </div>
            <Footer theme={resolvedTheme} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
