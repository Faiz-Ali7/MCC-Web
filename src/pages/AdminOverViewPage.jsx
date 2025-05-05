import React, { useEffect, useState } from "react";
import {
  PackageCheck,  // Purchase Icon 📦
  Wallet,        // Expense Icon 💰
  TrendingUp,    // Sales Icon 📈
  Package,        // Stock Icon 📦
  DollarSign,
  ShoppingCart
} from "lucide-react";
import { motion } from "framer-motion";
import StatCard from "../components/common/StatCard";
import PurchaseOverviewChart from "../components/overview/PurchaseOverviewChart";

import SalesOverviewChart from "../components/overview/SalesOverviewChart";
import ExpenseOverviewChart from "../components/overview/ExpenseOverviewChart";
import { useCummulativeContext } from "../context/CummulativeDataContext";
import DatePicker from "react-datepicker";
import { useNavigate } from 'react-router-dom';
import InventoryChart from "../components/overview/InventoryChart";

const AdminOverViewPage = () => {
  const navigate = useNavigate(); // Move useNavigate to top
  const { 
    totalSales,
    totalPurchase,
    totalExpense,
    startDate, 
    endDate,
    setStartDate, 
    setEndDate,
    salesChartData,
    purchaseChartData,
    expenseChartData,
    branchTotals,
    inventoryData,
    period,
    setPeriod,
    loading,
    error,
    formatNumber 
  } = useCummulativeContext();

  // Add safe defaults for potentially undefined values
  const inventoryStats = React.useMemo(() => {
    if (!inventoryData?.length) return { totalStock: 0, categoryTotals: {} };

    return inventoryData.reduce((acc, item) => {
      // Add to total stock
      acc.totalStock += Number(item.Total_Stock || 0);

      // Add to category totals
      if (!acc.categoryTotals[item.Category]) {
        acc.categoryTotals[item.Category] = 0;
      }
      acc.categoryTotals[item.Category] += Number(item.Total_Stock || 0);

      return acc;
    }, { totalStock: 0, categoryTotals: {} });
  }, [inventoryData]);

  const safeTotal = {
    sales: totalSales || 0,
    purchase: totalPurchase || 0,
    expense: totalExpense || 0,
    stock: inventoryStats.totalStock || 0
  };

  const combinedInventoryData = React.useMemo(() => {
    return Object.entries(inventoryStats.categoryTotals).map(([category, total]) => ({
      Category: category,
      Total_Stock: total
    }));
  }, [inventoryStats.categoryTotals]);

  if (loading) return <div className="text-center text-lg">Loading...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;

  return (
    <div className="p-4">
      {/* Header & Period Selection */}
      <div className="flex justify-between items-center bg-gray-800 bg-opacity-50 backdrop-blur-md w-full px-4 lg:px-8 py-4">
        <h1 className="text-2xl font-semibold text-gray-100">Admin Overview</h1>
        <div className="flex flex-row gap-5">
          <select
            className="bg-gray-700 text-white rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>


          <div className='relative flex items-center gap-2 bg-gray-700 text-white px-3 py-1 rounded-md z-10'>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              placeholderText="Start Date"
              className='bg-gray-700 text-white outline-none z-50'
              popperClassName="!z-[9999]"
              portalId="root"
              disabled={loading}
            />
            <span>-</span>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              placeholderText="End Date"
              className='bg-gray-700 text-white outline-none z-50'
              popperClassName="!z-[9999]"
              portalId="root"
              disabled={loading}
            />
          </div>

        </div>
      </div>

      {/* Overall Stats */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
       <StatCard 
          name="Total Sales" 
          icon={DollarSign} 
          value={`Rs ${safeTotal.sales.toFixed(0)}`} 
          color="#4ade80" // Green
        />
        <StatCard 
          name="Total Purchases" 
          icon={ShoppingCart} 
          value={`Rs ${safeTotal.purchase.toFixed(0)}`} 
          color="#f472b6" // Pink
        />
        <StatCard 
          name="Total Expense" 
          icon={Wallet} 
          value={`Rs ${safeTotal.expense.toFixed(0)}`} 
          color="#fbbf24" // Yellow
        />
        <StatCard 
          name="Total Stock" 
          icon={Package} 
          value={safeTotal.stock.toFixed(0)} 
          color="#38bdf8" // Sky Blue
        />
      </motion.div>
      {/* Branch-wise Totals */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">Branch-wise Totals</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 text-white border border-gray-300 rounded-lg shadow-md">
            <thead>
              <tr className="bg-gray-700 text-left">
                <th className="py-2 px-4 border">Branch</th>
                <th className="py-2 px-4 border">Total Sales</th>
                <th className="py-2 px-4 border">Total Purchase</th>
                <th className="py-2 px-4 border">Total Expense</th>
              </tr>
            </thead>
            <tbody>
              {(branchTotals || []).length > 0 ? (
                branchTotals.map(({ branch, sales, purchases, expenses }, index) => (
                  <motion.tr
                    key={branch || index}
                    className="border-t"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <td className="py-2 px-4 border">{branch}</td>
                    <td className="py-2 px-4 border">Rs {formatNumber(sales)}</td>
                    <td className="py-2 px-4 border">Rs {formatNumber(purchases)}</td>
                    <td className="py-2 px-4 border">Rs {formatNumber(expenses)}</td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-2">No branch data available</td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <SalesOverviewChart 
          title="Cumulative Sales Overview" 
          salesData={salesChartData} 
        />
        <PurchaseOverviewChart 
          title="Cumulative Purchase Overview" 
          purchaseData={purchaseChartData} 
        />
        <ExpenseOverviewChart 
          title="Cumulative Expense Overview" 
          expenseData={expenseChartData} 
        />
        
        <InventoryChart 
          title="Total Inventory by Category" 
          inventoryData={combinedInventoryData} 
        />
      </div>
    </div>
  );
};

export default AdminOverViewPage;
