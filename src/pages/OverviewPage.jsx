import { 
  PackageCheck,  // Purchase Icon 📦
  Wallet,        // Expense Icon 💰
  TrendingUp,    // Sales Icon 📈
  Package        // Inventory Icon 📦
} from "lucide-react";

import { motion } from "framer-motion";
import StatCard from "../components/common/StatCard";
import PurchaseOverviewChart from "../components/overview/PurchaseOverviewChart";
import SalesOverviewChart from "../components/overview/SalesOverviewChart";
import ExpenseOverviewChart from "../components/overview/ExpenseOverviewChart";
import { useCummulativeContext } from "../context/CummulativeDataContext";

const OverviewPage = () => {
  const { 
    totalSales,
    inventoryData,
    totalPurchase,
    period,
    setPeriod, 
    totalExpense, 
    branchName,
    salesData,
    expenseData,
    purchaseData, 
    loading, 
    error
  } = useCummulativeContext();

  // Calculate total stock - sum up Total_Stock from all categories
  const totalStock = inventoryData?.reduce((sum, item) => {
    return sum + (Number(item.Total_Stock) || 0);
  }, 0);

  if (loading) return <p className="text-center text-gray-500">Loading data...</p>;
  if (error) return <p className="text-center text-red-500">Error: {error}</p>;

  return (
    <div className='flex-1 overflow-auto relative z-10'>
      <div className='flex justify-between items-center bg-gray-800 bg-opacity-50 backdrop-blur-md w-full px-4 lg:px-8 py-4'>
        <h1 className="text-2xl font-semibold text-gray-100">Overview Data</h1>
        <select
          className='bg-gray-700 text-white rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500'
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <main className='max-w-[80vw] mx-auto py-6 px-4 lg:px-8'>
        <motion.div
          className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <StatCard name='Total Sales' icon={TrendingUp} value={`Rs ${totalSales?.toFixed(0) || 0}`} color='#6366F1' />
          <StatCard name='Total Purchases' icon={PackageCheck} value={`Rs ${totalPurchase?.toFixed(0) || 0}`} color='#8B5CF6' />
          <StatCard name='Total Expense' icon={Wallet} value={`Rs ${totalExpense?.toFixed(0) || 0}`} color='#EC4899' />
          <StatCard name='Total Stock' icon={Package} value={totalStock?.toLocaleString() || '0'} color='#10B981' />
          <StatCard name='Branch Name' icon={Wallet} value={branchName || 'N/A'} color='#EC4899' />
        </motion.div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          <SalesOverviewChart salesData={salesData} title={"Sales Overview"} />
          <PurchaseOverviewChart purchaseData={purchaseData} title={"Purchase Overview"} />
          <ExpenseOverviewChart expenseData={expenseData} title={"Expense Overview"} />
        </div>
      </main>
    </div>
  );
};

export default OverviewPage;
