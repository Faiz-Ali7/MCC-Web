import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import { DollarSign,  Store, TrendingUp, TrendingDown } from "lucide-react";
import SalesOverviewChart from "../components/overview/SalesOverviewChart";
import { useCummulativeContext } from "../context/CummulativeDataContext";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import InventoryOverviewChart from "../components/overview/InventoryOverviewChart";
import SalesTable from "../components/Tables/SalesTable";
import { use } from "react";
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
const SalesPage = () => {
    const { salesData, period, setPeriod, branchName, startDate,endDate,setStartDate,setEndDate } = useCummulativeContext();

    const [filteredSalesData, setFilteredSalesData] = useState([]);
    const [error, setError] = useState(null);
    const [topSellingCategory, setTopSellingCategory] = useState("N/A");
    const [slowSellingCategory, setSlowSellingCategory] = useState("N/A");
    const [topSellingAmount, setTopSellingAmount] = useState(0);
    const [slowSellingAmount, setSlowSellingAmount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [salesChartData, setSalesChartData] = useState([]);
    // Extract role from token at the start of the component
    const token = localStorage.getItem("token");
    const decoded = token ? jwtDecode(token) : null;
    const role = decoded?.role;
    const [branch, setBranch] = useState(decoded?.branch || "Branch1");
    const debouncedStartDate = useDebounce(startDate, 500);
    const debouncedEndDate = useDebounce(endDate, 500);
    
    useEffect(() => {
        const fetchSalesData = async () => {
            setLoading(true);
            setError(null);
    
            try {
                const branchToUse = role === "admin" ? branch : decoded?.branch;
    
                const filteredChartData = salesData
                    .filter(item => item.Branch?.toString().toLowerCase() === branchToUse?.toString().toLowerCase())
                    .map(item => ({
                        date: item.date,
                        total: Number(item.total || 0),
                        Branch: item.Branch
                    }))
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
    
                setSalesChartData(filteredChartData);
    
                const headers = {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                };
    
                let url = `http://localhost:3000/sales-Data?period=${period}&branch=${branchToUse}`;
    
                if (debouncedStartDate && debouncedEndDate) {
                    const formattedStartDate = debouncedStartDate.toISOString().split("T")[0];
                    const formattedEndDate = debouncedEndDate.toISOString().split("T")[0];
                    url += `&startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
                }
    
                const response = await axios.get(url, { headers });
                const salesPageData = response.data || [];
    
                const salesTotal = salesPageData.reduce((acc, item) => acc + Number(item.Total || 0), 0);
    
                setTotal(salesTotal);
                setFilteredSalesData(salesPageData);
    
                if (salesPageData.length > 0) {
                    const sortedData = [...salesPageData]
                        .map(item => ({ ...item, Total: Number(item.Total) || 0 }))
                        .sort((a, b) => b.Total - a.Total);
    
                    setTopSellingCategory(sortedData[0].Category || 'N/A');
                    setTopSellingAmount(sortedData[0].Total || 0);
                    setSlowSellingCategory(sortedData[sortedData.length - 1].Category || 'N/A');
                    setSlowSellingAmount(sortedData[sortedData.length - 1].Total || 0);
                }
    
            } catch (error) {
                console.error("Sales data fetch error:", error);
                setError(error.response?.data?.message || error.message);
            } finally {
                setLoading(false);
            }
        };
    
        fetchSalesData();
    
    }, [period, debouncedEndDate, debouncedStartDate, branch, salesData]);
    

    return (
        <div className='flex-1 overflow-auto relative z-10'>
            <div className='flex justify-between items-center bg-gray-800 bg-opacity-50 backdrop-blur-md w-full px-4 lg:px-8 py-4'>
                <Header title='Sales Dashboard' />

                <div className='flex gap-4'>
                    <select
                        className='bg-gray-700 text-white rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500'
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        disabled={loading}
                    >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>

                    {/* Role check is now working correctly */}
                    {role === "admin" && (
                        <select
                            className='bg-gray-700 text-white rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 '
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            disabled={loading}
                        >
                            <option value="Branch1">Branch1</option>
                            <option value="Branch2">Branch2</option>
                            <option value="Branch3">Branch3</option>
                        </select>
                    )}
                    <div className='relative flex items-center gap-2 bg-gray-700 text-white px-3 py-1 rounded-md z-10'>
                        <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}  // Updates context
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
                {error && (
                    <div className="bg-red-600 text-white p-3 rounded-md mb-4 text-center">
                        ⚠️ {error}
                    </div>
                )}


                {loading ? (
                    <div className="text-center text-white py-6">
                        Loading sales data...
                    </div>
                ) : (
                    <>
                        <motion.div
                            className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8'
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1 }}
                        >
                            <StatCard name='Total Sales' icon={DollarSign} value={`Rs ${total.toFixed(0).toString()}`} color='#4ade80' />
                            <StatCard name='Branch Name' icon={Store} value={branchName?.trim() ? branchName : branch} color='#ea580c' />
                            <StatCard name='Top Selling Category' icon={TrendingUp} value={`${topSellingCategory} - Rs ${topSellingAmount.toLocaleString()}`} color='#10B981' />
                            <StatCard name='Slow Selling Category' icon={TrendingDown} value={`${slowSellingCategory} - Rs ${slowSellingAmount.toLocaleString()}`} color='#EF4444' />
                        </motion.div>

                        <SalesOverviewChart 
                            title={`Sales Data of ${branch}`} 
                            salesData={salesChartData} // Use the filtered data
                        />

                        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10 mb-8'>
                            <InventoryOverviewChart filteredSalesData={filteredSalesData} />
                        </div>
                        <SalesTable filteredSalesData={filteredSalesData} />
                    </>
                )}
            </main>
        </div>
    );
};

export default SalesPage;
