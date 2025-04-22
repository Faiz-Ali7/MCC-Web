import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { jwtDecode } from "jwt-decode";

import Sidebar from "./components/common/Sidebar";
import OverviewPage from "./pages/OverviewPage";
import ProductsPage from "./pages/ProductsPage";
import UsersPage from "./pages/UsersPage";
import SalesPage from "./pages/SalesPage";

import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import PurchasePage from "./pages/PurchasePage";
import ExpensePage from "./pages/ExpensePage";
import AdminOverViewPage from "./pages/AdminOverViewPage";
import UserForm from './pages/RegisterUserPage';
import InventoryPage from './pages/InventoryPage';
import ManageBranch from './pages/ManageBranch';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(null);
  const [authError, setAuthError] = useState(null);
  const location = useLocation();

  const checkToken = useCallback(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setIsAuthenticated(false);
      setAuthError("Please log in to continue");
      return false;
    }

    try {
      const decoded = jwtDecode(token);
      const currentTime = Math.floor(Date.now() / 1000);

      // Check if token will expire in the next 5 minutes
      if (decoded.exp < currentTime + 300) {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        setAuthError("Your session has expired. Please log in again.");
        return false;
      }

      setIsAuthenticated(true);
      setRole(decoded.role);
      setAuthError(null);
      return true;
    } catch (error) {
      console.error("Token validation error:", error);
      localStorage.removeItem("token");
      setIsAuthenticated(false);
      setAuthError("Authentication error. Please log in again.");
      return false;
    }
  }, []);

  useEffect(() => {
    // Initial token check
    checkToken();
    
    // Check token every 5 minutes instead of every minute
    const intervalId = setInterval(checkToken, 300000);

    return () => clearInterval(intervalId);
  }, [checkToken]);

  // Only check token on login/logout, not on every route change
  useEffect(() => {
    if (location.pathname === '/login') {
      checkToken();
    }
  }, [location.pathname, checkToken]);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route 
          path="/login" 
          element={
            <LoginPage 
              authError={authError} 
              onLoginSuccess={() => {
                setAuthError(null);
                checkToken();
              }} 
            />
          } 
        />
        <Route 
          path="*" 
          element={
            <Navigate 
              replace 
              to="/login" 
              state={{ from: location, message: authError }} 
            />
          } 
        />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 p-5 overflow-y-auto">
        <Routes>
          <Route path="/" element={role === "admin" ? <AdminOverViewPage /> : <OverviewPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/register" element={role === "admin" ? <UserForm /> : <Navigate to="/" />} />
          <Route path="/expense" element={<ExpensePage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/branch" element={role === "admin" ? <ManageBranch /> : <Navigate to="/" />} />
          <Route path="/purchase" element={<PurchasePage />} />
         
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
