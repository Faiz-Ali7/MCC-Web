import React from 'react'
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
import PurchaseOverviewChart from "../components/overview/PurchaseOverviewChart";
import { jwtDecode } from "jwt-decode";
import ExpenseOverviewChart from '../components/overview/ExpenseOverviewChart';
import ExpenseTable from '../components/Tables/ExpenseTable';
function ExpensePage() {
    const {
        expenseData,
        period,
        setPeriod,
        branchName,
    } = useCummulativeContext();
    const [topPurchaseSupplierTotal, setTopPurchaseSupplierTotal] = useState(0);
    const [lowPurchaseSupplierTotal, setLowPurchaseSupplierTotal] = useState(0);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [filteredExpenseData, setFilteredExpenseData] = useState([]);
    const [error, setError] = useState(null);
    const [topPurchaseSupplier, setTopPurchaseSupplier] = useState("N/A");
    const [lowPurchaseSupplier, setLowPurchaseSupplier] = useState("N/A");
    const [branch, setBranch] = useState("Branch1");
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [expenseChartData, setExpenseChartData] = useState([]);
    const token = localStorage.getItem("token");
    const decoded = token ? jwtDecode(token) : null;
    const role = decoded?.role;

    useEffect(() => {
        const fetchExpenseData = async () => {
            setLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem("token");
                if (!token) throw new Error("No token found. Please log in again.");
                console.log("ExpensePage", expenseData);
                const filteredData = expenseData.filter(item =>
                    item.Branch?.trim().toLowerCase() === branch.trim().toLowerCase()
                );
                setExpenseChartData(filteredData);

                const headers = {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                };
                let url;

                if (role === 'manager') {
                    url = `http://localhost:3000/Expense-data?period=${period}`, { headers };
                } else if (decoded.role === 'admin') {
                    url = `http://localhost:3000/Expense-data?period=${period}&branch=${branch}`, { headers };
                }

                if (startDate && endDate) {
                    if (startDate > endDate) {
                        setError("Start date cannot be after end date.");
                        setLoading(false);
                        return;
                    }

                    const formattedStartDate = startDate.toISOString().split("T")[0];
                    const formattedEndDate = endDate.toISOString().split("T")[0];
                    url += `&startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
                }

                const response = await axios.get(url, { headers });
                console.log("API Response Data:", response.data);

                const expensePageData = response.data || [];
                const expenseTotal = expensePageData.reduce((acc, item) => acc + Number(item.Total), 0);
                setTotal(expenseTotal);

                if (response.data.length > 0) {
                    // Ensure Total is a number and sort suppliers correctly
                    const sortedSuppliers = [...response.data]
                        .map(supplier => ({
                            ...supplier,
                            Total: Number(supplier.Total) || 0, // Ensure Total is a number
                        }))
                        .sort((a, b) => b.Total - a.Total);

                    const topSupplier = sortedSuppliers[0]; // Highest total
                    const lowSupplier = sortedSuppliers[sortedSuppliers.length - 1]; // Lowest total

                    setFilteredExpenseData(sortedSuppliers);

                    setTopPurchaseSupplier(topSupplier?.PostedBy || "N/A");
                    setLowPurchaseSupplier(lowSupplier?.PostedBy || "N/A");
                    setTopPurchaseSupplierTotal(topSupplier?.Total || 0);
                    setLowPurchaseSupplierTotal(lowSupplier?.Total || 0);
                } else {
                    setTopPurchaseSupplier("N/A");
                    setLowPurchaseSupplier("N/A");
                    setTopPurchaseSupplierTotal(0);
                    setLowPurchaseSupplierTotal(0);
                }
            } catch (error) {
                setError(error.response?.data?.message || error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchExpenseData();
    }, [period, startDate, endDate, branch, expenseData]);

    return (
        <div className='flex-1 overflow-auto relative z-10'>
            <div className='flex justify-between items-center bg-gray-800 bg-opacity-50 backdrop-blur-md w-full px-4 lg:px-8 py-4'>
                <Header title='Expense Dashboard' />

                <div className='flex gap-4'>
                    <select
                        className='bg-gray-700 text-white rounded-md px-3 py-1 focus:outline-none focus:ring-2 
                   focus:ring-blue-500'
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        disabled={loading}
                    >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>

                    {role === "admin" && (
                        <select
                            className='bg-gray-700 text-white rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500'
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            disabled={loading}
                        >
                            <option value="Branch1">Branch1</option>
                            <option value="Branch2">Branch2</option>
                            <option value="Branch3">Branch3</option>
                        </select>
                    )}

                    <div className=' relative flex items-center gap-2 bg-gray-700 text-white px-3 py-1 rounded-md'>
                        <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            placeholderText="Start Date"
                            className='bg-gray-700 text-white outline-none'
                            disabled={loading}
                            popperClassName="!z-[9999]"
                            portalId="root"
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
                            disabled={loading}
                            popperClassName="!z-[9999]"
                            portalId="root"
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

                {loading ? (
                    <div className="text-center text-white py-6">
                        Loading expense data...
                    </div>
                ) : (<>
                    <motion.div
                        className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8'
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                    >
                        <StatCard
                            name='Total Expense'
                            icon={DollarSign}
                            value={`Rs ${total?.toFixed(0).toString() || 0}`}
                            color='#6366F1'
                        />
                        <StatCard
                            name='Branch Name'
                            icon={Wallet}
                            value={branch || "Not Selected"}
                            color='#EC4899'
                        />
                        <StatCard
                            name='Top Purchase Supplier'
                            icon={Wallet}
                            value={`${topPurchaseSupplier} (Rs ${topPurchaseSupplierTotal})`}
                            color='#10B981'
                        />
                        <StatCard
                            name='Low Purchase Supplier'
                            icon={Wallet}
                            value={`${lowPurchaseSupplier} (Rs ${lowPurchaseSupplierTotal})`}
                            color='#EF4444'
                        />
                    </motion.div>

                    <ExpenseOverviewChart purchaseData={Array.isArray(expenseChartData) ? expenseChartData : []} />
                    <ExpenseTable filteredExpenseData={filteredExpenseData} />
                </>)
                }
            </main>
        </div>
    );
}


export default ExpensePage
