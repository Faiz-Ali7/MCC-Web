import { 
  PackageCheck,  // Purchase Icon 📦
  Store,        // Expense Icon 💰
  TrendingUp, 
  DollarSign,   // Sales Icon 📈
  Package , 
  Wallet,      // Inventory Icon 📦
  ShoppingCart
} from "lucide-react";
import DatePicker from "react-datepicker";
import { motion } from "framer-motion";
import StatCard from "../components/common/StatCard";
import PurchaseOverviewChart from "../components/overview/PurchaseOverviewChart";
import SalesOverviewChart from "../components/overview/SalesOverviewChart";
import ExpenseOverviewChart from "../components/overview/ExpenseOverviewChart";
import { useCummulativeContext } from "../context/CummulativeDataContext";
import InventoryChart from "../components/overview/InventoryChart";

const OverviewPage = () => {
  const { 
    totalSales,
    inventoryData,
    totalPurchase,
    period,
    setPeriod, 
    startDate,
    endDate,
    setStartDate,
    setEndDate,
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

      <main className='max-w-[80vw] mx-auto py-6 px-4 lg:px-8'>
        <motion.div
          className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
             <StatCard name='Total Sales' icon={DollarSign} value={`Rs ${totalSales?.toFixed(0) || 0}`} color='#4ade80' /> {/* Green */}
          <StatCard name='Total Purchases' icon={ShoppingCart} value={`Rs ${totalPurchase?.toFixed(0) || 0}`} color='#f472b6' /> {/* Pink */}
          <StatCard name='Total Expense' icon={Wallet} value={`Rs ${totalExpense?.toFixed(0) || 0}`} color='#fbbf24' /> {/* Yellow */}
          <StatCard name='Total Stock' icon={Package} value={totalStock?.toLocaleString() || '0'} color='#38bdf8' /> {/* Sky Blue */}
          <StatCard name='Branch Name' icon={Store} value={branchName || 'N/A'} color='#ea580c' />
        </motion.div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          <SalesOverviewChart salesData={salesData} title={"Sales Overview"} />
          <PurchaseOverviewChart purchaseData={purchaseData} title={"Purchase Overview"} />
          <ExpenseOverviewChart expenseData={expenseData} title={"Expense Overview"} />
          <InventoryChart inventoryData={inventoryData} title={"Inventory Overview"} />
        </div>
      </main>
    </div>
  );
};

export default OverviewPage;
