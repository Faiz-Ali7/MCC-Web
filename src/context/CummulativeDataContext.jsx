import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const CummulativeContext = createContext();

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export function useCummulativeContext() {
  const context = useContext(CummulativeContext);
  if (!context) {
    throw new Error("useCummulativeContext must be used within a CummulativeProvider");
  }
  return context;
}

export function CummulativeProvider({ children }) {
  // Group related state together
  const [overview, setOverview] = useState({
    totalSales: 0,
    totalPurchase: 0,
    totalExpense: 0
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
    inventoryWithBranch: []
  });

  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });

  const [uiState, setUiState] = useState({
    loading: false,
    error: null,
    branchName: "",
    period: "daily"
  });

  const fetchTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  // Memoize formatNumber
  const formatNumber = useCallback((value) => {
    return Number(value || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, []);

  // Memoize data processing functions
  const processData = useCallback((items) => {
    return items.map(item => ({
      ...item,
      total: Number(item.total || 0),
      formattedTotal: formatNumber(item.total)
    }));
  }, [formatNumber]);

  const processChartData = useCallback((data, selectedBranch = 'all') => {
    if (!Array.isArray(data)) return [];
    
    // Filter data by branch if specified
    const filteredData = selectedBranch === 'all' 
      ? data 
      : data.filter(item => item.Branch === selectedBranch);
    
    // Create a map to store date-wise totals
    const dateMap = new Map();
    
    filteredData.forEach(item => {
      const date = item.date;
      const total = Number(item.total) || 0;
      
      if (dateMap.has(date)) {
        dateMap.set(date, dateMap.get(date) + total);
      } else {
        dateMap.set(date, total);
      }
    });

    // Convert map to array and sort by date
    return Array.from(dateMap.entries())
      .map(([date, total]) => ({
        date,
        total: Math.round(total)
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, []);

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setUiState(prev => ({ ...prev, loading: true, error: null }));

      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found. Please log in again.");

      const decoded = jwtDecode(token);
      const role = decoded.role;
      const selectedBranch = decoded.role === 'admin' ? 'all' : decoded.branch;

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const params = new URLSearchParams({
        period: uiState.period,
        ...(decoded.branch && { branch: decoded.branch })
      });

      const endpoint = role === "admin" ? '/adminOverview-data' : '/Overview-data';
      const response = await api.get(`${endpoint}?${params}&_t=${Date.now()}`);

      if (!isMountedRef.current) return;

      const { salesData, purchaseData, expenseData, inventoryData } = response.data;

      // Process inventory data
      const formattedInventoryData = (inventoryData || [])
        .filter(item => item?.Category && Number(item?.Total_Stock || 0) !== 0)
        .map(item => ({
          Category: item.Category || item.sITM_Class || '',
          Total_Stock: Number(item.Total_Stock || 0),
          Branch: item.Branch || decoded.branch
        }));

      // Process transaction data
      const processedSalesData = processData(salesData || []);
      const processedPurchaseData = processData(purchaseData || []);
      const processedExpenseData = processData(expenseData || []);

      // Process chart data with branch filtering
      const processedSalesChartData = processChartData(salesData || [], selectedBranch);
      const processedPurchaseChartData = processChartData(purchaseData || [], selectedBranch);
      const processedExpenseChartData = processChartData(expenseData || [], selectedBranch);

      // Calculate totals
      const totals = {
        totalSales: processedSalesData.reduce((acc, item) => acc + (item.total || 0), 0),
        totalPurchase: processedPurchaseData.reduce((acc, item) => acc + (item.total || 0), 0),
        totalExpense: processedExpenseData.reduce((acc, item) => acc + (item.total || 0), 0)
      };

      // Update all state at once
      setOverview(totals);
      setData({
        salesData: processedSalesData,
        purchaseData: processedPurchaseData,
        expenseData: processedExpenseData,
        salesChartData: processedSalesChartData,
        purchaseChartData: processedPurchaseChartData,
        expenseChartData: processedExpenseChartData,
        inventoryData: formattedInventoryData,
        inventoryWithBranch: formattedInventoryData,
        branchTotals: role === 'admin' ? calculateBranchTotals(
          processedSalesData,
          processedPurchaseData,
          processedExpenseData
        ) : []
      });
      setUiState(prev => ({
        ...prev,
        loading: false,
        error: null,
        branchName: decoded.branch
      }));

    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error("Error fetching data:", error);
      setUiState(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || error.message || "Failed to fetch data"
      }));

      // Reset data on error
      setOverview({ totalSales: 0, totalPurchase: 0, totalExpense: 0 });
      setData(prev => Object.fromEntries(
        Object.keys(prev).map(key => [key, Array.isArray(prev[key]) ? [] : prev[key]])
      ));
    }
  }, [uiState.period, processData, processChartData]);

  // Cleanup effect
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // Data fetching effect
  useEffect(() => {
    const debouncedFetch = setTimeout(fetchData, 500);
    return () => clearTimeout(debouncedFetch);
  }, [fetchData]);

  const contextValue = {
    ...overview,
    ...data,
    ...dateRange,
    ...uiState,
    setStartDate: (date) => setDateRange(prev => ({ ...prev, startDate: date })),
    setEndDate: (date) => setDateRange(prev => ({ ...prev, endDate: date })),
    setPeriod: (newPeriod) => setUiState(prev => ({ ...prev, period: newPeriod })),
    formatNumber
  };

  return (
    <CummulativeContext.Provider value={contextValue}>
      {children}
    </CummulativeContext.Provider>
  );
}

// Helper function to calculate branch totals
function calculateBranchTotals(salesData, purchaseData, expenseData) {
  const branches = [...new Set(salesData.map(item => item.Branch))];
  return branches.map(branch => {
    const branchSales = salesData
      .filter(item => item.Branch === branch)
      .reduce((acc, item) => acc + (item.total || 0), 0);
    const branchPurchases = purchaseData
      .filter(item => item.Branch === branch)
      .reduce((acc, item) => acc + (item.total || 0), 0);
    const branchExpenses = expenseData
      .filter(item => item.Branch === branch)
      .reduce((acc, item) => acc + (item.total || 0), 0);
    return {
      branch,
      sales: branchSales,
      purchases: branchPurchases,
      expenses: branchExpenses,
      profit: branchSales - branchPurchases - branchExpenses
    };
  });
}
