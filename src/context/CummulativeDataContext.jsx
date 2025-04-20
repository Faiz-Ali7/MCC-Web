import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const CummulativeContext = createContext();

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
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [inventoryWithBranch, setInventoryWithBranch] = useState([])
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No token found. Please log in again.");
          setError("Authentication error. Please log in again.");
          setLoading(false);
          return;
        }

        const decoded = jwtDecode(token);
        setBranchName(decoded.branch);
        const role = decoded.role;

        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        // Format dates safely
        const formatDate = (date) =>
          date instanceof Date ? date.toISOString().split("T")[0] : "";

        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);

        // Construct URL dynamically
        let url =
          role === "admin"
            ? `http://localhost:3000/adminOverview-data?period=${period}`
            : `http://localhost:3000/Overview-data?period=${period}`;

        if (formattedStartDate && formattedEndDate) {
          url += `&startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
        }

        // Fetch data from API
        const response = await axios.get(url, { headers });
        const { salesData, purchaseData, expenseData, inventoryData } =
          response.data || {};

        if (!salesData || !purchaseData || !expenseData || !inventoryData) {
          throw new Error("Data not available");
        }
        setInventoryWithBranch(inventoryData)
        setSalesData(salesData);
        setPurchaseData(purchaseData);
        setExpenseData(expenseData);

        setTotalSales(
          salesData.reduce((acc, item) => acc + (item.total || 0), 0)
        );
        setTotalPurchase(
          purchaseData.reduce((acc, item) => acc + (item.total || 0), 0)
        );
        setTotalExpense(
          expenseData.reduce((acc, item) => acc + (item.total || 0), 0)
        );

        // Format inventory data
        if (Array.isArray(inventoryData)) {
          const groupedInventory = inventoryData.reduce((acc, item) => {
            const { Category, Total_Stock } = item;

            if (!acc[Category]) {
              acc[Category] = { Category, Total_Stock: 0 };
            }

            acc[Category].Total_Stock += Total_Stock;

            return acc;
          }, {});

          // Convert object back to an array

          const inventoryDataAggregated = Object.values(groupedInventory);
          setInventoryData(inventoryDataAggregated)
        }

        // Convert object back to an array

        // Aggregate data by date for charts
        const aggregateByDate = (data) =>
          data.reduce((acc, { date, total }) => {
            acc[date] = (acc[date] || 0) + (total || 0);
            return acc;
          }, {});

        setSalesChartData(
          Object.entries(aggregateByDate(salesData)).map(([date, total]) => ({
            date,
            total,
          }))
        );
        setPurchaseChartData(
          Object.entries(aggregateByDate(purchaseData)).map(
            ([date, total]) => ({
              date,
              total,
            })
          )
        );
        setExpenseChartData(
          Object.entries(aggregateByDate(expenseData)).map(([date, total]) => ({
            date,
            total,
          }))
        );

        // Process branch totals
        if (role === "admin") {
          const branchSummary = {};
          const processBranchData = (data, type) => {
            if (!Array.isArray(data)) return;
            data.forEach(({ Branch, total }) => {
              if (!Branch) return;
              if (!branchSummary[Branch]) {
                branchSummary[Branch] = { sales: 0, purchase: 0, expense: 0 };
              }
              branchSummary[Branch][type] += total || 0;
            });
          };

          processBranchData(salesData, "sales");
          processBranchData(purchaseData, "purchase");
          processBranchData(expenseData, "expense");

          setBranchTotals(
            Object.entries(branchSummary).map(([branch, totals]) => ({
              branch,
              sales: totals.sales,
              purchase: totals.purchase,
              expense: totals.expense,
            }))
          );
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message || "Failed to fetch data");
        setLoading(false);
      }
    };

    fetchData();
  }, [period, startDate, endDate]);

  return (
    <CummulativeContext.Provider
      value={{
        totalSales,
        inventoryData,
        totalPurchase,
        totalExpense,
        startDate,
        endDate,
        setStartDate,
        setEndDate,
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
      }}
    >
      {children}
    </CummulativeContext.Provider>
  );
}

export function useCummulativeContext() {
  return useContext(CummulativeContext);
}
