import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import { DollarSign, Store, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import ExpenseOverviewChart from '../components/overview/ExpenseOverviewChart';
import ExpenseTable from '../components/Tables/ExpenseTable';
import { useCummulativeContext } from "../context/CummulativeDataContext";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
const token = localStorage.getItem("token");
    const decoded = token ? jwtDecode(token) : null;
    const role = decoded?.role;
function ExpensePage() {
    const { expenseData, period, setPeriod, } = useCummulativeContext();
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [filteredExpenseData, setFilteredExpenseData] = useState([]);
    const [error, setError] = useState(null);
    const [topExpense, setTopExpense] = useState({ postedBy: "N/A", total: 0 });
    const [lowExpense, setLowExpense] = useState({ postedBy: "N/A", total: 0 });
    const [branch, setBranch] = useState(decoded?.Branch||"Branch1");
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
   // const [expenseChartData, setExpenseChartData] = useState([]);
    const [expensePageGraph, setExpensePageGraph] = useState([]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        }).format(Math.round(amount));
    };

    

    useEffect(() => {
        const fetchExpenseData = async () => {
            setLoading(true);
            setError(null);
            try {
    

                if (!token) throw new Error("No token found. Please log in again.");

                const headers = { 
                    Authorization: `Bearer ${token}`, 
                    "Content-Type": "application/json" 
                };

                let url = `http://localhost:3000/expense-data?period=${period}`;
                if (role === 'admin') {
                    url += `&branch=${branch}`;
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
                const expensePageData = response.data || [];

                // Calculate total expenses with proper number conversion
                const expenseTotal = expensePageData.reduce((acc, item) => 
                    acc + Number(item.Total || 0), 0
                );
                setTotal(Math.round(expenseTotal));

                // Process expense data for stats
                if (expensePageData.length > 0) {
                    const sortedExpenses = [...expensePageData]
                        .map(expense => ({
                            ...expense,
                            Total: Number(expense.Total) || 0
                        }))
                        .sort((a, b) => b.Total - a.Total);

                    setTopExpense({ 
                        postedBy: sortedExpenses[0].PostedBy, 
                        total: Math.round(sortedExpenses[0].Total)
                    });
                    
                    setLowExpense({ 
                        postedBy: sortedExpenses[sortedExpenses.length - 1].PostedBy, 
                        total: Math.round(sortedExpenses[sortedExpenses.length - 1].Total)
                    });
                }
                const aggregatedGraphData = {};

                expensePageData.forEach(item => {
                    const date = item.date || item.Date;
                    const total = Number(item.total || item.Total) || 0;
                
                    if (aggregatedGraphData[date]) {
                        aggregatedGraphData[date] += total;
                    } else {
                        aggregatedGraphData[date] = total;
                    }
                });
                
                const combinedExpensePageGraph = Object.entries(aggregatedGraphData).map(([date, total]) => ({
                    date,
                    total: Math.round(total),
                }));
                
                setExpensePageGraph(combinedExpensePageGraph);
                
                setFilteredExpenseData(expensePageData);
              
            } catch (error) {
                setError(error.response?.data?.message || error.message);
                setFilteredExpenseData([]);
                setExpenseChartData([]);
                setTotal(0);
                setTopExpense({ postedBy: "N/A", total: 0 });
                setLowExpense({ postedBy: "N/A", total: 0 });
            } finally {
                setLoading(false);
            }
        };

        fetchExpenseData();
    }, [period,endDate, branch, expenseData]);

    return (
        <div className='flex-1 overflow-auto relative z-10'>
            <div className='flex justify-between items-center bg-gray-800 bg-opacity-50 backdrop-blur-md w-full px-4 lg:px-8 py-4'>
                <Header title='Expense Dashboard' />
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
                {error && <div className="bg-red-600 text-white p-3 rounded-md mb-4 text-center">⚠️ {error}</div>}
                {loading ? (<div className="text-center text-white py-6">Loading expense data...</div>) : (
                    <>
                        <motion.div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
                            <StatCard name='Total Expense' icon={Wallet} value={`Rs ${formatCurrency(total)}`} color='#fbbf24' />
                            <StatCard
                                name='Branch Name'
                                icon={Store}
                                value={branch || "Not Selected"}
                                color='#ea580c'
                            />
                            <StatCard name='Top Expense' icon={TrendingUp} value={`${topExpense.postedBy} (Rs ${formatCurrency(topExpense.total)})`} color='#10B981' />
                            <StatCard name='Lowest Expense' icon={TrendingDown} value={`${lowExpense.postedBy} (Rs ${formatCurrency(lowExpense.total)})`} color='#EF4444' />
                        </motion.div>
                        <ExpenseOverviewChart title={`Expense Data of ${branch}`} expenseData={expensePageGraph} />
                        <ExpenseTable filteredExpenseData={filteredExpenseData} />
                    </>
                )}
            </main>
        </div>
    );
}
export default ExpensePage;
