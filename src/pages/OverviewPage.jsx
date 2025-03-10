import { useEffect, useState } from "react";
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
const OverviewPage = () => {
  
  const { totalSales, totalPurchase,period,setPeriod, totalExpense, branchName,salesData,expenseData,purchaseData, loading, error } = useCummulativeContext();
  if (loading) return <p className="text-center text-gray-500">Loading data...</p>;
  if (error) return <p className="text-center text-red-500">Error: {error}</p>;

  return (
    <div className='flex-1 overflow-auto relative z-10'>
      <div className='flex justify-between items-center bg-gray-800 bg-opacity-50 backdrop-blur-md w-full px-4 lg:px-8 py-4'>
      <h1 className="text-2xl font-semibold text-gray-100">Overview Data</h1>
        <select
          className='bg-gray-700 text-white rounded-md px-3 py-1 focus:outline-none focus:ring-2 
                   focus:ring-blue-500'
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option>daily</option>
          <option>weekly</option>
          <option>monthly</option>
          
        </select>
      </div>

      <main className=' max-w-[80vw] mx-auto py-6 px-4 lg:px-8'>
        {/* STATS */}
        <motion.div
          className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <StatCard name='Total Sales' icon={TrendingUp} value={`Rs ${totalSales.toFixed(0)}`} color='#6366F1' />
          <StatCard name='Total Purchases' icon={PackageCheck} value={`Rs ${totalPurchase.toFixed(0)}`} color='#8B5CF6' />
          <StatCard name='Total Expense' icon={Wallet} value={`Rs ${totalExpense.toFixed(0)}`} color='#EC4899' />
          <StatCard name='Branch Name' icon={Wallet} value={branchName} color='#EC4899' />
        
        </motion.div>

        {/* CHARTS */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          <SalesOverviewChart salesData={salesData} />  
          <PurchaseOverviewChart purchaseData={purchaseData} />  {/* ✅ Pass purchase data */}
          <ExpenseOverviewChart expenseData={expenseData} />
        
        </div>
      </main>
    </div>
  );
};

export default OverviewPage;
