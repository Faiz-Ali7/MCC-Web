import { Route, Routes, Navigate, useLocation, Router } from "react-router-dom";
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode"; // Import jwt-decode

import Sidebar from "./components/common/Sidebar";
import OverviewPage from "./pages/OverviewPage";
import ProductsPage from "./pages/ProductsPage";
import UsersPage from "./pages/UsersPage";
import SalesPage from "./pages/SalesPage";
import OrdersPage from "./pages/OrdersPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import PurchasePage from "./pages/PurchasePage";
import ExpensePage from "./pages/ExpensePage";
import AdminOverViewPage from "./pages/AdminOverViewPage";
import UserForm from './pages/RegisterUserPage'
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(null); // To store user role
  const location = useLocation();

  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const decoded = jwtDecode(token);
        const currentTime = Math.floor(Date.now() / 1000); // Get current time in seconds

        if (decoded.exp < currentTime) {
          console.warn("Token expired. Logging out...");
          localStorage.removeItem("token");
          setIsAuthenticated(false);
          return;
        }

        setIsAuthenticated(true);
        setRole(decoded.role); // Assuming role is saved in the JWT payload
      } catch (error) {
        console.error("Invalid token format:", error);
        localStorage.removeItem("token");
        setIsAuthenticated(false);
      }
    };

    checkToken();
  }, [location.pathname]); // Check authentication state on route change

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate replace to="/login" />} />
      </Routes>
    );
  }

  // Role-based routing logic
  return (
    <div style={{ display: "flex", height: "100vh" }} className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      <Sidebar /> {/* Sidebar only renders when authenticated */}

      <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
        <Routes>
          <Route path="/" element={role === "admin" ? <AdminOverViewPage /> : <OverviewPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/register" element={<UserForm />} />
          <Route path="/expense" element={<ExpensePage />} />
          <Route path="/purchase" element={<PurchasePage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
