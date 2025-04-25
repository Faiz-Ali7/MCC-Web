import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "react-datepicker/dist/react-datepicker.css";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import { DollarSign, Wallet } from "lucide-react";

import InventoryTable from '../components/Tables/InventoryTable';
import { useCummulativeContext } from "../context/CummulativeDataContext";
import { jwtDecode } from "jwt-decode";
import InventoryChart from "../components/overview/InventoryChart";

function InventoryPage() {
    const { inventoryWithBranch, inventoryData, period, setPeriod, branchName } = useCummulativeContext();
    const [error, setError] = useState(null);
    const [topInventory, setTopInventory] = useState({ description: "N/A", total: 0 });
    const [lowInventory, setLowInventory] = useState({ description: "N/A", total: 0 });
    const [branch, setBranch] = useState(branchName || "Branch1");
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [inventoryChartData, setInventoryChartData] = useState([]);

    const token = localStorage.getItem("token");
    const decoded = token ? jwtDecode(token) : null;
    const role = decoded?.role;

    // Effect to update branch when branchName changes (for managers)
    useEffect(() => {
        if (!role || role !== 'admin') {
            setBranch(branchName);
        }
    }, [branchName, role]);

    useEffect(() => {
        const processInventoryData = () => {
            setLoading(true);
            setError(null);
            try {
                console.log("Raw inventory data:", role === 'admin' ? inventoryWithBranch : inventoryData);
                let dataToProcess = role === 'admin'
                    ? (inventoryWithBranch || []).filter(item => 
                        item.Branch?.toLowerCase() === branch?.toLowerCase())
                    : inventoryData || [];

                console.log("Filtered inventory data:", dataToProcess);

                if (dataToProcess.length > 0) {
                    // Convert data for chart display
                    const chartData = dataToProcess.map(item => ({
                        Category: item.Category,
                        Total_Stock: Number(item.Total_Stock)
                    }));

                    // Calculate total stock
                    const totalStock = chartData.reduce((acc, item) => acc + item.Total_Stock, 0);

                    // Sort for top and low items
                    const sortedData = [...chartData].sort((a, b) => b.Total_Stock - a.Total_Stock);
                    const topItem = sortedData[0];
                    const lowItem = sortedData[sortedData.length - 1];

                    setInventoryChartData(chartData);
                    setTotal(totalStock.toFixed(0));
                    setTopInventory({ 
                        description: topItem.Category, 
                        total: topItem.Total_Stock.toFixed(0) 
                    });
                    setLowInventory({ 
                        description: lowItem.Category, 
                        total: lowItem.Total_Stock.toFixed(0) 
                    });
                } else {
                    setInventoryChartData([]);
                    setTotal("0");
                    setTopInventory({ description: "N/A", total: "0" });
                    setLowInventory({ description: "N/A", total: "0" });
                }
            } catch (error) {
                console.error("Error processing inventory data:", error);
                setError(error.message || "Error processing inventory data");
            } finally {
                setLoading(false);
            }
        };

        processInventoryData();
    }, [period, branch, inventoryWithBranch, inventoryData, role]);

    return (
        <div className='flex-1 overflow-auto relative z-10'>
            <div className='flex justify-between items-center bg-gray-800 bg-opacity-50 backdrop-blur-md w-full px-4 lg:px-8 py-4'>
                <Header title='Inventory Dashboard' />
                <div className='flex gap-4'>
             
                    {role === "admin" && (
                        <select 
                            className='bg-gray-700 text-white rounded-md px-3 py-1' 
                            value={branch} 
                            onChange={(e) => setBranch(e.target.value)} 
                            disabled={loading}
                        >
                            <option value="Branch1">Branch1</option>
                            <option value="Branch2">Branch2</option>
                            <option value="Branch3">Branch3</option>
                        </select>
                    )}
                </div>
            </div>
            <main className='max-w-[80vw] mx-auto py-6 px-4 lg:px-8'>
                {error && <div className="bg-red-600 text-white p-3 rounded-md mb-4 text-center">⚠️ {error}</div>}
                {loading ? (
                    <div className="text-center text-white py-6">Loading inventory data...</div>
                ) : (
                    <>
                        <motion.div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
                            <StatCard name='Total Stock' icon={DollarSign} value={`Rs ${total}`} color='#6366F1' />
                            <StatCard name='Branch Name' icon={Wallet} value={branch || "Not Selected"} color='#EC4899' />
                            <StatCard name='Top Inventory' icon={Wallet} value={`${topInventory.description} (Rs ${topInventory.total})`} color='#10B981' />
                            <StatCard name='Lowest Inventory' icon={Wallet} value={`${lowInventory.description} (Rs ${lowInventory.total})`} color='#EF4444' />
                        </motion.div>
                        <InventoryChart title={`Inventory Data of ${branch}`} inventoryData={inventoryChartData} />
                        <InventoryTable filteredInventoryData={inventoryChartData} />
                    </>
                )}
            </main>
        </div>
    );
}

export default InventoryPage;
