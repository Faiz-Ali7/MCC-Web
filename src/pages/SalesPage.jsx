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

import InventoryOverviewChart from "../components/overview/InventoryOverviewChart";

const SalesPage = () => {
	const { salesData, totalSales, period, setPeriod, branchName, loading, setLoading } = useCummulativeContext();
	const [startDate, setStartDate] = useState(null);
	const [endDate, setEndDate] = useState(null);
	const [filteredSalesData, setFilteredSalesData] = useState([]);
	const [error, setError] = useState(null);  // ✅ Error state

	useEffect(() => {
		const fetchSalesData = async () => {
			setLoading(true);
			setError(null);  // Reset error before fetching

			try {
				const token = localStorage.getItem("token");
				if (!token) {
					throw new Error("No token found. Please log in again.");
				}

				const headers = {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				};

				let url = `http://localhost:3000/sales-Data?period=${period}`;
				if (startDate && endDate) {
					const formattedStartDate = startDate.toISOString().split("T")[0];
					const formattedEndDate = endDate.toISOString().split("T")[0];
					url += `&startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
				}

				const response = await axios.get(url, { headers });
				setFilteredSalesData(response.data || []);
			} catch (error) {
				setError(error.response?.data?.message || error.message);
			} finally {
				setLoading(false);
			}
		};

		fetchSalesData();
	}, [period, startDate && endDate]);

	return (
		<div className='flex-1 overflow-auto relative z-10'>
			<div className='flex justify-between items-center bg-gray-800 bg-opacity-50 backdrop-blur-md w-full px-4 lg:px-8 py-4'>
				<Header title='Sales Dashboard' />

				<div className='flex gap-4'>
					<select
						className='bg-gray-700 text-white rounded-md px-3 py-1 focus:outline-none focus:ring-2 
                   focus:ring-blue-500'
						value={period}
						onChange={(e) => setPeriod(e.target.value)}
						disabled={loading}  // ✅ Disable during loading
					>
						<option defaultValue={"daily"}>daily</option>
						<option>weekly</option>
						<option>monthly</option>
					</select>

					<div className='flex items-center gap-2 bg-gray-700 text-white px-3 py-1 rounded-md'>
						<DatePicker
							selected={startDate}
							onChange={(date) => setStartDate(date)}
							selectsStart
							startDate={startDate}
							endDate={endDate}
							placeholderText="Start Date"
							className='bg-gray-700 text-white outline-none'
							disabled={loading}  // ✅ Disable during loading
						/>
						<span>-</span>
						<DatePicker
							selected={endDate}
							onChange={(date) => setEndDate(date)}
							selectsEnd
							startDate={startDate}
							endDate={endDate}
							placeholderText="End Date"
							className='bg-gray-700 text-white outline-none'
							disabled={loading}  // ✅ Disable during loading
						/>
					</div>
				</div>
			</div>

			<main className='max-w-[80vw] mx-auto py-6 px-4 lg:px-8'>
				{/* ERROR MESSAGE */}
				{error && (
					<div className="bg-red-600 text-white p-3 rounded-md mb-4 text-center">
						⚠️ {error}
					</div>
				)}

				{/* LOADING MESSAGE */}
				{loading && (
					<div className="text-center text-white py-6">
						Loading sales data...
					</div>
				)}

				{!loading && (
					<>
						{/* SALES STATS */}
						<motion.div
							className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8'
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 1 }}
						>
							<StatCard name='Total Sales' icon={DollarSign} value={`Rs ${totalSales.toFixed(0)}`} color='#6366F1' />
							<StatCard name='Branch Name' icon={Wallet} value={branchName} color='#EC4899' />
						</motion.div>

						<SalesOverviewChart salesData={salesData} />

						<div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10 mb-8'>
							<InventoryOverviewChart filteredSalesData={filteredSalesData} />
						</div>
						{filteredSalesData.length > 0 ? (
    <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-2">Filtered Sales Data</h2>
        <div className="overflow-x-auto bg-gray-800 bg-opacity-50 backdrop-blur-md rounded-xl shadow-lg p-4 border border-gray-700">
            <table className="min-w-full bg-transparent border-collapse">
                <thead>
                    <tr className="bg-gray-700 text-white">
					<th className="px-4 py-2 text-left">#</th>
                        <th className="px-4 py-2 text-left">Category</th>
                        <th className="px-4 py-2 text-left">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredSalesData.map((item, index) => (
                        <tr key={index} className="border-b border-gray-600 hover:bg-gray-700 transition">
							  <td className="px-4 py-2 text-white">{index +1}</td>
                            <td className="px-4 py-2 text-white">{item.Category}</td>
                            <td className="px-4 py-2 text-left text-white">{item.Total.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
) : (
    <p className="text-center text-gray-400 mt-6">No sales data available for the selected filters.</p>
)}
				
					</>

				)}
			</main>
		</div>
	);
};

export default SalesPage;
