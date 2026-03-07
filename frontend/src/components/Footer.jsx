import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.jpeg";
import { authUserUpdatedEvent, getAccessToken } from "../auth/storage";

const navigationGroups = [
  {
    title: "Platform",
    links: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Products", to: "/products" },
      { label: "Inventory", to: "/inventory" },
      { label: "Categories", to: "/categories" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Profile", to: "/profile-overview" },
      { label: "Login", to: "/login" },
      { label: "Register", to: "/register" },
    ],
  },
];

const protectedPaths = new Set([
  "/dashboard",
  "/products",
  "/inventory",
  "/categories",
  "/profile-overview",
  "/profile",
]);

const Footer = ({ theme = "dark" }) => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const isLight = theme === "light";
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAccessToken()));

  useEffect(() => {
    const syncAuthState = () => setIsAuthenticated(Boolean(getAccessToken()));

    window.addEventListener("storage", syncAuthState);
    window.addEventListener(authUserUpdatedEvent, syncAuthState);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener(authUserUpdatedEvent, syncAuthState);
    };
  }, []);

  const logoTarget = isAuthenticated ? "/dashboard" : "/";

  const handleLinkAccess = (event, to) => {
    if (!isAuthenticated && protectedPaths.has(to)) {
      event.preventDefault();
      window.alert("You need to login first. Redirecting to home page.");
      navigate("/");
    }
  };

  const styles = isLight
    ? {
        wrapper: "border-t border-slate-200 bg-white px-6 py-8 lg:px-8",
        logoRing: "ring-slate-200",
        title: "text-slate-900",
        subtitle: "text-slate-500",
        description: "text-slate-600",
        meta: "text-slate-600",
        heading: "text-slate-700",
        list: "text-slate-600",
        link: "hover:text-slate-900",
        divider: "border-slate-200",
        legalText: "text-slate-500",
      }
    : {
        wrapper: "border-t border-white/15 bg-slate-950/40 backdrop-blur-xl px-6 py-8 lg:px-8",
        logoRing: "ring-white/20",
        title: "text-white",
        subtitle: "text-white/60",
        description: "text-white/70",
        meta: "text-white/70",
        heading: "text-white/80",
        list: "text-white/65",
        link: "hover:text-white",
        divider: "border-white/10",
        legalText: "text-white/60",
      };

  return (
    <footer className={styles.wrapper}>
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to={logoTarget} className="inline-flex items-center gap-3">
              <img
                src={logo}
                alt="Root Nepal ERP Logo"
                className={`h-10 w-10 rounded-xl object-cover ring-1 ${styles.logoRing}`}
              />
              <div>
                <p className={`font-semibold ${styles.title}`}>Root Nepal ERP System</p>
                <p className={`text-xs ${styles.subtitle}`}>Business operations, simplified.</p>
              </div>
            </Link>
            <p className={`mt-4 max-w-lg text-sm ${styles.description}`}>
              A complete ERP workspace for product, inventory, and category
              management with fast workflows and clear reporting.
            </p>
            <div className={`mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm ${styles.meta}`}>
              <a
                href="mailto:support@rootnepalerp.com"
                className={`${styles.link} transition-colors`}
              >
                support@rootnepalerp.com
              </a>
              <span>Sun - Fri, 9:00 AM - 6:00 PM NPT</span>
              <span>Kathmandu, Nepal</span>
            </div>
          </div>

          {navigationGroups.map((group) => (
            <div key={group.title}>
              <h3 className={`text-sm font-semibold uppercase tracking-wide ${styles.heading}`}>
                {group.title}
              </h3>
              <ul className={`mt-3 space-y-2 text-sm ${styles.list}`}>
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      onClick={(event) => handleLinkAccess(event, link.to)}
                      className={`${styles.link} transition-colors`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={`mt-8 flex flex-col gap-2 border-t pt-4 text-sm md:flex-row md:items-center md:justify-between ${styles.divider} ${styles.legalText}`}>
          <p>&copy; {currentYear} Root Nepal ERP System. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/terms-of-service" className={`${styles.link} transition-colors`}>Terms of Service</Link>
            <Link to="/privacy-policy" className={`${styles.link} transition-colors`}>Privacy Policy</Link>
            <Link to="/security" className={`${styles.link} transition-colors`}>Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
