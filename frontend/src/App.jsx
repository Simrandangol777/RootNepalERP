import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
// import ProtectedRoute from "./components/ProtectedRoute";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileOverview = lazy(() => import("./pages/ProfileOverview"));
const Products = lazy(() => import("./pages/Products"));
const Categories = lazy(() => import("./pages/Categories"));
const Inventory = lazy(() => import("./pages/Inventory"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Security = lazy(() => import("./pages/Security"));
const Sales = lazy(() => import("./pages/Sales"));
const SalesInvoice = lazy(() => import("./pages/SalesInvoice"));
const Purchase = lazy(() => import("./pages/Purchase"));
const PurchaseInvoice = lazy(() => import("./pages/PurchaseInvoice"));
const Reports = lazy(() => import("./pages/Reports"));
const Notifications = lazy(() => import("./pages/Notifications"));

const RouteLoadingFallback = () => (
  <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
      <div className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
      <span className="text-sm font-medium text-white/80">Loading page...</span>
    </div>
  </div>
);

function App() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/security" element={<Security />} />

          {/* Protected Routes - Uncomment when ProtectedRoute component is ready */}
          {/* <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          /> */}

        {/* Dashboard Pages */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile-overview" element={<ProfileOverview />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/products" element={<Products />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/salesinvoice" element={<SalesInvoice />} />
        <Route path="/sales/invoice/:saleId" element={<SalesInvoice />} />
        <Route path="/purchase/invoice/:purchaseId" element={<PurchaseInvoice />} />

        {/* Placeholder routes for other pages */}
        <Route path="/product" element={<Products />} />
        <Route path="/purchase" element={<Purchase />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/notifications" element={<Notifications />} />

          {/* Catch all route - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
