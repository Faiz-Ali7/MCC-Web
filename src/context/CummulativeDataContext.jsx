import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const CummulativeContext = createContext();

const api = axios.create({
  baseURL: "http://localhost:3000",
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

export function useCummulativeContext() {
  const context = useContext(CummulativeContext);
  if (!context) {
    throw new Error("useCummulativeContext must be used within a CummulativeProvider");
  }
  return context;
}

export function CummulativeProvider({ children, refreshTrigger }) {
  const [overview, setOverview] = useState({
    totalSales: 0,
    totalPurchase: 0,
    totalExpense: 0,
  });

  const [data, setData] = useState({
    salesData: [],
    purchaseData: [],
    expenseData: [],
    salesChartData: [],
    purchaseChartData: [],
    expenseChartData: [],
    branchTotals: [],
    inventoryData: [],
    inventoryWithBranch: [],
  });

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [uiState, setUiState] = useState({
    loading: false,
    error: null,
    branchName: "",
    period: "daily",
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const fetchTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  const formatNumber = useCallback((value) => {
    return Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, []);

  const processData = useCallback((items) => {
    return items.map((item) => ({
      ...item,
      total: Number(item.total || 0),
      formattedTotal: formatNumber(item.total),
    }));
  }, [formatNumber]);

  const processChartData = useCallback((data, selectedBranch = "all") => {
    if (!Array.isArray(data)) return [];

    const filteredData =
      selectedBranch === "all" ? data : data.filter((item) => item.Branch === selectedBranch);

    const dateMap = new Map();

    filteredData.forEach((item) => {
      const date = item.date;
      const total = Number(item.total) || 0;

      dateMap.set(date, (dateMap.get(date) || 0) + total);
    });

    return Array.from(dateMap.entries())
      .map(([date, total]) => ({ date, total: Math.round(total) }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, []);

  const getValidatedToken = useCallback(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsAuthenticated(false);
        return null;
      }

      const decoded = jwtDecode(token);
      const currentTime = Math.floor(Date.now() / 1000);

      if (decoded.exp < currentTime) {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        return null;
      }

      return { token, decoded };
    } catch {
      localStorage.removeItem("token");
      setIsAuthenticated(false);
      return null;
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;

    const tokenData = getValidatedToken();
    if (!tokenData) {
      setUiState((prev) => ({
        ...prev,
        loading: false,
        error: "Authentication required. Please log in.",
      }));
      return;
    }

    const { token, decoded } = tokenData;
    setIsAuthenticated(true);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setUiState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const isAdmin = decoded.role === "admin";
      const endpoint = isAdmin ? "/adminOverview-data" : "/Overview-data";
      
      const formattedStart = startDate?.toISOString().split("T")[0];
      const formattedEnd = endDate?.toISOString().split("T")[0];
      
      const params = new URLSearchParams();
      
      if (!isAdmin) {
        params.append("branch", decoded.branch);
      }
      
      // Apply to both admin and normal user requests
      if (formattedStart && formattedEnd) {
        params.append("startDate", formattedStart);
        params.append("endDate", formattedEnd);
      } else {
        params.append("period", uiState.period);
      }
      console.log("Fetching data with params:", params.toString());
      const response = await api.get(`${endpoint}?${params.toString()}`);
      

      const { salesData = [], purchaseData = [], expenseData = [], inventoryData = [] } =
        response.data;

      const processedData = {
        salesData: processData(salesData),
        purchaseData: processData(purchaseData),
        expenseData: processData(expenseData),
        inventoryData: processData(inventoryData),
        salesChartData: processChartData(salesData, decoded.role === "admin" ? "all" : decoded.branch),
        purchaseChartData: processChartData(purchaseData, decoded.role === "admin" ? "all" : decoded.branch),
        expenseChartData: processChartData(expenseData, decoded.role === "admin" ? "all" : decoded.branch),
      };

      const totals = {
        totalSales: processedData.salesData.reduce((sum, item) => sum + item.total, 0),
        totalPurchase: processedData.purchaseData.reduce((sum, item) => sum + item.total, 0),
        totalExpense: processedData.expenseData.reduce((sum, item) => sum + item.total, 0),
      };

      const branchTotals =
        decoded.role === "admin"
          ? calculateBranchTotals(processedData.salesData, processedData.purchaseData, processedData.expenseData)
          : [];

      setOverview(totals);
      setData({
        ...processedData,
        branchTotals,
        inventoryWithBranch: processedData.inventoryData,
      });

      setUiState((prev) => ({
        ...prev,
        loading: false,
        error: null,
        branchName: decoded.branch || "",
      }));
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        return;
      }

      setUiState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to fetch data",
      }));
    }
  }, [getValidatedToken, processData, processChartData, endDate, uiState.period]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const tokenData = getValidatedToken();
    if (!tokenData) {
      setUiState((prev) => ({
        ...prev,
        loading: false,
        error: "Authentication required. Please log in.",
      }));
      return;
    }

    fetchData();
  }, [refreshTrigger]); // Only on mount or refresh trigger

  useEffect(() => {
    if (isAuthenticated) {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        fetchData();
      }, 300);
    }
  }, [ endDate, uiState.period, isAuthenticated, fetchData]);

  const setPeriod = useCallback((newPeriod) => {
    setUiState((prev) => ({ ...prev, period: newPeriod }));
  }, []);

  const contextValue = {
    ...overview,
    ...data,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    ...uiState,
    isAuthenticated,
    setPeriod,
    formatNumber,
  };

  return <CummulativeContext.Provider value={contextValue}>{children}</CummulativeContext.Provider>;
}

function calculateBranchTotals(salesData, purchaseData, expenseData) {
  const branches = [...new Set(salesData.map((item) => item.Branch))];
  return branches.map((branch) => {
    const branchSales = salesData
      .filter((item) => item.Branch === branch)
      .reduce((acc, item) => acc + item.total, 0);
    const branchPurchases = purchaseData
      .filter((item) => item.Branch === branch)
      .reduce((acc, item) => acc + item.total, 0);
    const branchExpenses = expenseData
      .filter((item) => item.Branch === branch)
      .reduce((acc, item) => acc + item.total, 0);
    return {
      branch,
      sales: branchSales,
      purchases: branchPurchases,
      expenses: branchExpenses,
      profit: branchSales - branchPurchases - branchExpenses,
    };
  });
}
