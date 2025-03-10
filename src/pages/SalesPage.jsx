import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DatePicker from "react-datepicker";  
import "react-datepicker/dist/react-datepicker.css";  

import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import { DollarSign, Wallet } from "lucide-react";
import SalesOverviewChart from "../components/overview/SalesOverviewChart";
import { useCummulativeContext } from "../context/CummulativeDataContext";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import InventoryOverviewChart from "../components/overview/InventoryOverviewChart";
import SalesTable from "../components/Tables/SalesTable";

const SalesPage = () => {
    const { salesData, period, setPeriod, branchName, startDate,endDate,setStartDate,setEndDate} = useCummulativeContext();

    const [filteredSalesData, setFilteredSalesData] = useState([]);
    const [error, setError] = useState(null);
    const [topSellingCategory, setTopSellingCategory] = useState("N/A");
    const [slowSellingCategory, setSlowSellingCategory] = useState("N/A");
    const [topSellingAmount, setTopSellingAmount] = useState(0);
    const [slowSellingAmount, setSlowSellingAmount] = useState(0);
    const [branch, setBranch] = useState("Branch1");
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const[salesChartData,setSalesChartData]=useState([])
    // Extract role from token at the start of the component
    const token = localStorage.getItem("token");
    const decoded = token ? jwtDecode(token) : null;
    const role = decoded?.role;
   

    useEffect(() => {
        const fetchSalesData = async () => {
            setLoading(true);
            setError(null);
    
            try {
                console.log("salespage SalesData",salesData)
                const filteredData = salesData.filter(item => 
                    item.Branch?.trim().toLowerCase() === branch.trim().toLowerCase()
                );
                console.log("filtered sales Data" , filteredData)
      
        
            setSalesChartData(filteredData);
           
                if (!token) {
                    throw new Error("Unauthorized: No token found. Please log in again.");
                }

                const headers = {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                };
           

                
                let url = `http://localhost:3000/sales-Data?period=${period}`;
                if (role === "admin") {
                    url += `&branch=${branch}`;
                }

                if (startDate && endDate) {
                    const formattedStartDate = startDate.toISOString().split("T")[0];
                    const formattedEndDate = endDate.toISOString().split("T")[0];
                    url += `&startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
                }

                const response = await axios.get(url, { headers });
                console.log("API Response:", response.data);

                if (response.status === 401) {
                    throw new Error("Unauthorized: Session expired. Please log in again.");
                }

                const salesPageData = response.data || [];
                const salesTotal = salesPageData.reduce((acc, item) => acc + Number(item.Total), 0);

                console.log("Computed Total Sales:", salesTotal);
                setTotal(salesTotal);
                

                // Sort data by highest Total first
                const sortedData = [...salesPageData].sort((a, b) => b.Total - a.Total);
                setFilteredSalesData(sortedData);

                if (sortedData.length > 0) {
                    setTopSellingCategory(sortedData[0].Category);
                    setTopSellingAmount(sortedData[0].Total);
                    setSlowSellingCategory(sortedData[sortedData.length - 1].Category);
                    setSlowSellingAmount(sortedData[sortedData.length - 1].Total);
                } else {
                    setTopSellingCategory("N/A");
                    setTopSellingAmount(0);
                    setSlowSellingCategory("N/A");
                    setSlowSellingAmount(0);
                }
            } catch (error) {
                setError(error.response?.data?.message || error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSalesData();
    }, [period, startDate, endDate, branch, salesData]);

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
        onChange={(date) => setEndDate(date)}  // Updates context
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
            <StatCard name='Total Sales' icon={DollarSign} value={`Rs ${total.toFixed(0).toString()}`} color='#6366F1' />
            <StatCard name='Branch Name' icon={Wallet} value={branchName?.trim() ? branchName : branch} color='#EC4899' />
            <StatCard name='Top Selling Category' icon={Wallet} value={`${topSellingCategory} - Rs ${topSellingAmount.toLocaleString()}`} color='#EC4899' />
            <StatCard name='Slow Selling Category' icon={Wallet} value={`${slowSellingCategory} - Rs ${slowSellingAmount.toLocaleString()}`} color='#EC4899' />
        </motion.div>

        <SalesOverviewChart salesData={Array.isArray(salesChartData) ? salesChartData : []} />

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
