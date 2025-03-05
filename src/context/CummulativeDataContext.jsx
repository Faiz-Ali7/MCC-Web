import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

// ✅ Corrected context name
const CummulativeContext = createContext();

export function CummulativeProvider({ children }) {
  const [totalSales, setTotalSales] = useState(0);
  const [totalPurchase, setTotalPurchase] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [salesData, setSalesData] = useState([]);
  const [purchaseData, setPurchaseData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branchName, setBranchName] = useState("");
  const [period, setPeriod] = useState("daily");

  useEffect(() => {
    const fetchCumulativeData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No token found. Please log in again.");
          return;
        }

        const decoded = jwtDecode(token);
        setBranchName(decoded.branch);

        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        console.log("Fetching Overview Data...");
        const periodParam = encodeURIComponent(period);
        const overviewResponse = await axios.get(
          `http://localhost:3000/Overview-data?period=${periodParam}`,
          { headers }
        );

        const overviewResult = overviewResponse.data;
        if (!overviewResult) {
          console.error("Overview data is empty or undefined.");
        }

        setSalesData(overviewResult.salesData || []);
        setPurchaseData(overviewResult.purchaseData || []);
        setExpenseData(overviewResult.expenseData || []);

        setTotalSales(overviewResult.salesData.reduce((acc, item) => acc + item.total, 0));
        setTotalPurchase(overviewResult.purchaseData.reduce((acc, item) => acc + item.total, 0));
        setTotalExpense(overviewResult.expenseData.reduce((acc, item) => acc + item.total, 0));
      } catch (err) {
        console.error("Error fetching data:", err.response?.data || err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCumulativeData();
  }, [period]);

  return (
    <CummulativeContext.Provider
      value={{
        totalSales,
        totalPurchase,
        totalExpense,
        salesData,
        purchaseData,
        expenseData,
        branchName,
        period,
        setPeriod,
        loading,
        setLoading,
        error,
      }}
    >
      {children}
    </CummulativeContext.Provider>
  );
}

// ✅ Custom hook for using the context
export function useCummulativeContext() {
  return useContext(CummulativeContext);
}
