import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  PackageCheck,  // Purchase Icon 📦
  Wallet,        // Expense Icon 💰
  TrendingUp     // Sales Icon 📈
} from "lucide-react";
import { motion } from "framer-motion";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import PurchaseOverviewChart from "../components/overview/PurchaseOverviewChart";
import InventoryOverviewChart from "../components/overview/InventoryOverviewChart";
import SalesOverviewChart from "../components/overview/SalesOverviewChart";
import ExpenseOverviewChart from "../components/overview/ExpenseOverviewChart";
import { useCummulativeContext } from "../context/CummulativeDataContext";
import DatePicker from "react-datepicker";
import OrderDistribution from "../components/orders/OrderDistribution";
import { useNavigate } from 'react-router-dom';
function AdminOverViewPage() {
  const {
    totalSales,
    totalPurchase,
    totalExpense,
    startDate, endDate,
    setStartDate, setEndDate,
    salesChartData,
    purchaseChartData,
    expenseChartData,
    branchTotals,

    period,
    setPeriod,
    loading,
    error, } = useCummulativeContext();

  if (loading) return <div className="text-center text-lg">Loading...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;
  const navigate = useNavigate();
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
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <StatCard name="Total Sales" icon={TrendingUp} value={`Rs ${totalSales.toFixed(0)}`} color="#6366F1" />
        <StatCard name="Total Purchases" icon={PackageCheck} value={`Rs ${totalPurchase.toFixed(0)}`} color="#8B5CF6" />
        <StatCard name="Total Expense" icon={Wallet} value={`Rs ${totalExpense.toFixed(0)}`} color="#EC4899" />
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
              {branchTotals.length > 0 ? (
                branchTotals.map(({ branch, sales, purchase, expense }, index) => (
                  <motion.tr
                    key={branch}
                    className="border-t"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <td className="py-2 px-4 border">{branch}</td>
                    <td className="py-2 px-4 border">Rs {sales.toLocaleString()}</td>
                    <td className="py-2 px-4 border">Rs {purchase.toLocaleString()}</td>
                    <td className="py-2 px-4 border">Rs {expense.toLocaleString()}</td>
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

        <SalesOverviewChart title={"All Branches Sales Overview"} salesData={salesChartData} />

        <PurchaseOverviewChart title={"All Branches Purchase Overview"} purchaseData={purchaseChartData} />
        <ExpenseOverviewChart title={"All Branches Expense Overview"} expenseData={expenseChartData} />


      </div>
    </div>
  );
}

export default AdminOverViewPage;
