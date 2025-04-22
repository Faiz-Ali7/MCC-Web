import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const CummulativeContext = createContext();

export function useCummulativeContext() {
  const context = useContext(CummulativeContext);
  if (!context) {
    throw new Error("useCummulativeContext must be used within a CummulativeProvider");
  }
  return context;
}

export function CummulativeProvider({ children }) {
  const [totalSales, setTotalSales] = useState(0);
  const [totalPurchase, setTotalPurchase] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [salesData, setSalesData] = useState([]);
  const [purchaseData, setPurchaseData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [salesChartData, setSalesChartData] = useState([]);
  const [purchaseChartData, setPurchaseChartData] = useState([]);
  const [expenseChartData, setExpenseChartData] = useState([]);
  const [branchTotals, setBranchTotals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branchName, setBranchName] = useState("");
  const [period, setPeriod] = useState("daily");
  const [inventoryData, setInventoryData] = useState([]);
  const [inventoryWithBranch, setInventoryWithBranch] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const fetchTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  const debouncedFetchData = useCallback((callback) => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(callback, 500);
  }, []);

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
    const fetchData = async () => {
      const MAX_RETRIES = 3;
      let retryCount = 0;

      const attemptFetch = async () => {
        if (!isMountedRef.current) return false;
        try {
          setLoading(true);
          setError(null);

          const token = localStorage.getItem("token");
          if (!token) {
            throw new Error("No token found. Please log in again.");
          }

          const decoded = jwtDecode(token);
          setBranchName(decoded.branch);
          const role = decoded.role;

          const headers = {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          };

          let url = role === "admin" 
            ? `http://localhost:3000/adminOverview-data?period=${period}`
            : `http://localhost:3000/Overview-data?period=${period}`;

          // Add cache busting parameter to prevent browser caching
          url += `&_t=${Date.now()}`;

          const response = await axios.get(url, { 
            headers,
            timeout: 60000 
          });

          if (!isMountedRef.current) return false;

          const { salesData, purchaseData, expenseData, inventoryData } = response.data;

          if (!salesData || !purchaseData || !expenseData || !inventoryData) {
            throw new Error("Incomplete data received from server");
          }

          const formattedInventoryData = inventoryData
            .filter(item => item && item.Category)
            .map(item => ({
              Category: item.Category || item.sITM_Class || '',
              Total_Stock: Number(item.Total_Stock || 0),
              Branch: item.Branch || decoded.branch
            }))
            .filter(item => item.Total_Stock !== 0);

          setInventoryWithBranch(formattedInventoryData);

          const branchInventoryData = role === 'admin'
            ? formattedInventoryData
            : formattedInventoryData.filter(item =>
                item.Branch?.toLowerCase() === decoded.branch?.toLowerCase());

          setInventoryData(branchInventoryData);

          const processedSalesData = salesData.map(item => ({
            ...item,
            total: Number(item.total || 0)
          }));
          setSalesData(processedSalesData);
          setSalesChartData(processedSalesData);

          const processedPurchaseData = purchaseData.map(item => ({
            ...item,
            total: Number(item.total || 0)
          }));
          setPurchaseData(processedPurchaseData);
          setPurchaseChartData(processedPurchaseData);

          const processedExpenseData = expenseData.map(item => ({
            ...item,
            total: Number(item.total || 0)
          }));
          setExpenseData(processedExpenseData);
          setExpenseChartData(processedExpenseData);

          setTotalSales(processedSalesData.reduce((acc, item) => acc + (item.total || 0), 0));
          setTotalPurchase(processedPurchaseData.reduce((acc, item) => acc + (item.total || 0), 0));
          setTotalExpense(processedExpenseData.reduce((acc, item) => acc + (item.total || 0), 0));

          if (role === 'admin') {
            const branches = [...new Set(processedSalesData.map(item => item.Branch))];
            const branchTotals = branches.map(branch => {
              const branchSales = processedSalesData
                .filter(item => item.Branch === branch)
                .reduce((acc, item) => acc + (item.total || 0), 0);
              const branchPurchases = processedPurchaseData
                .filter(item => item.Branch === branch)
                .reduce((acc, item) => acc + (item.total || 0), 0);
              const branchExpenses = processedExpenseData
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
            setBranchTotals(branchTotals);
          }

          setLoading(false);
          return true;
        } catch (error) {
          if (!isMountedRef.current) return false;
          
          if (error.code === 'ECONNABORTED' && retryCount < MAX_RETRIES - 1) {
            return false;
          }
          
          console.error("Error fetching data:", error);
          setError(error.response?.data?.message || error.message || "Failed to fetch data");
          setLoading(false);
          
          if (isMountedRef.current) {
            setSalesData([]);
            setPurchaseData([]);
            setExpenseData([]);
            setInventoryData([]);
            setSalesChartData([]);
            setPurchaseChartData([]);
            setExpenseChartData([]);
            setBranchTotals([]);
            setTotalSales(0);
            setTotalPurchase(0);
            setTotalExpense(0);
          }
          
          throw error;
        }
      };

      debouncedFetchData(async () => {
        while (retryCount < MAX_RETRIES && isMountedRef.current) {
          try {
            const success = await attemptFetch();
            if (success) break;
            retryCount++;
            if (retryCount < MAX_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
            }
          } catch (error) {
            retryCount++;
            if (retryCount === MAX_RETRIES && isMountedRef.current) {
              setError('Maximum retry attempts reached. Please try again later.');
              setLoading(false);
            }
          }
        }
      });
    };

    fetchData();

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [period, debouncedFetchData]);

  const contextValue = {
    totalSales,
    totalPurchase,
    totalExpense,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    inventoryData,
    inventoryWithBranch,
    salesData,
    purchaseData,
    expenseData,
    salesChartData,
    purchaseChartData,
    expenseChartData,
    branchTotals,
    branchName,
    period,
    setPeriod,
    loading,
    error,
  };

  return (
    <CummulativeContext.Provider value={contextValue}>
      {children}
    </CummulativeContext.Provider>
  );
}
