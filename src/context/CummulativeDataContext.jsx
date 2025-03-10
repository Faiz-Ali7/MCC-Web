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
  
  const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
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

        if (role === "admin") {
          // Fetch admin overview data
          let url=`http://localhost:3000/adminOverview-data?period=${period}`
          if (startDate && endDate) {
            const formattedStartDate = startDate.toISOString().split("T")[0];
            const formattedEndDate = endDate.toISOString().split("T")[0];
            url += `&startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
        }
          const response = await axios.get(url, { headers });
          const { salesData, purchaseData, expenseData } = response.data || {};

          if (!salesData || !purchaseData || !expenseData) {
            console.log("Data not available");
            setLoading(false);
            return;
          }
          setSalesData(salesData);
          setPurchaseData(purchaseData)
          console.log("Sales Data:", salesData);
          console.log("purchaseData :",purchaseData)
          
          const totalSales = salesData.reduce((acc, item) => acc + (item.total || 0), 0);
          const totalPurchase = purchaseData.reduce((acc, item) => acc + (item.total || 0), 0);
          const totalExpense = expenseData.reduce((acc, item) => acc + (item.total || 0), 0);
         
          setTotalSales(totalSales);
          setTotalPurchase(totalPurchase);
          setTotalExpense(totalExpense);

          const aggregateByDate = (data) => {
            return data.reduce((acc, { date, total }) => {
              if (!acc[date]) acc[date] = 0;
              acc[date] += total || 0;
              return acc;
            }, {});
          };

          setSalesChartData(Object.entries(aggregateByDate(salesData)).map(([date, total]) => ({ date, total })));
          setPurchaseChartData(Object.entries(aggregateByDate(purchaseData)).map(([date, total]) => ({ date, total })));
          setExpenseChartData(Object.entries(aggregateByDate(expenseData)).map(([date, total]) => ({ date, total })));

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
        } else {
          // Fetch normal manager overview data
          const overviewResponse = await axios.get(
            `http://localhost:3000/Overview-data?period=${encodeURIComponent(period)}`,
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
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch data");
        setLoading(false);
      }
    };

    fetchData();
  }, [period,startDate&&endDate]);

  return (
    <CummulativeContext.Provider
      value={{
        totalSales,
        totalPurchase,
        totalExpense,
        startDate,
        endDate,setStartDate,setEndDate,
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
