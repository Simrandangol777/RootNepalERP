import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ProfileOverview from "./pages/ProfileOverview";
import Products from './pages/Products';
import Categories from "./pages/Categories";
import Inventory from './pages/Inventory';
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Security from "./pages/Security";
import Sales from "./pages/Sales";
import SalesInvoice from "./pages/SalesInvoice";
import Purchase from "./pages/Purchase";
import PurchaseInvoice from "./pages/PurchaseInvoice";
import Reports from "./pages/Reports";
// import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
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
        
        {/* Catch all route - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
