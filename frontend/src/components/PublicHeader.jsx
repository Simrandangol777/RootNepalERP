import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.jpeg";
import { authUserUpdatedEvent, getAccessToken } from "../auth/storage";

const navItems = [
  { label: "Terms", to: "/terms-of-service" },
  { label: "Privacy", to: "/privacy-policy" },
  { label: "Security", to: "/security" },
];

const PublicHeader = () => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAccessToken()));

  useEffect(() => {
    const syncAuth = () => setIsAuthenticated(Boolean(getAccessToken()));

    window.addEventListener("storage", syncAuth);
    window.addEventListener(authUserUpdatedEvent, syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener(authUserUpdatedEvent, syncAuth);
    };
  }, []);

  const logoTarget = isAuthenticated ? "/dashboard" : "/";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link to={logoTarget} className="flex items-center gap-3">
          <img
            src={logo}
            alt="Root Nepal ERP Logo"
            className="h-9 w-9 rounded-lg object-cover ring-1 ring-slate-200"
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">Root Nepal ERP</p>
            <p className="text-xs text-slate-500">Legal & Trust Center</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`text-sm font-medium transition-colors ${
                  isActive ? "text-slate-900" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {!isAuthenticated ? (
          <Link
            to="/login"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign In
          </Link>
        ) : (
          <div className="w-[72px]" aria-hidden="true" />
        )}
      </div>
    </header>
  );
};

export default PublicHeader;
