import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import { DollarSign, Wallet } from "lucide-react";
import ExpenseOverviewChart from '../components/overview/ExpenseOverviewChart';
import ExpenseTable from '../components/Tables/ExpenseTable';
import { useCummulativeContext } from "../context/CummulativeDataContext";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

function ExpensePage() {
    const { expenseData, period, setPeriod, branchName } = useCummulativeContext();
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [filteredExpenseData, setFilteredExpenseData] = useState([]);
    const [error, setError] = useState(null);
    const [topExpense, setTopExpense] = useState({ postedBy: "N/A", total: 0 });
    const [lowExpense, setLowExpense] = useState({ postedBy: "N/A", total: 0 });
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
                if (!token) throw new Error("No token found. Please log in again.");

                const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
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
                    let formattedStartDate = startDate.toISOString().split("T")[0];
                    let formattedEndDate = endDate.toISOString().split("T")[0];
                    url += `&startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
                }

                const response = await axios.get(url, { headers });
                const expensePageData = response.data || [];

                // ✅ Fix: Ensure date format is correct
                const chartData = expensePageData.map(({ Date, Total }) => ({
                    Date,
                    Total
                }));
                const groupedData = chartData.reduce((acc, item) => {
                    if (!acc[item.Date]) {
                        acc[item.Date] = 0; // Initialize if date doesn't exist
                    }
                    acc[item.Date] += item.Total; // Sum up total for the same date
                    return acc;
                }, {});

                // Convert back to an array format for graphing
                const formattedData = Object.keys(groupedData).map(date => ({
                    date,
                    total: groupedData[date]
                }));

                console.log(formattedData);



                setExpenseChartData(formattedData);

                // ✅ Fix: Set total expenses
                const expenseTotal = expensePageData.reduce((acc, item) => acc + item.Total, 0);
                setTotal(expenseTotal);

                // ✅ Set Top & Low Expense
                if (expensePageData.length > 0) {
                    const sortedExpenses = [...expensePageData].sort((a, b) => b.Total - a.Total);
                    setTopExpense({ postedBy: sortedExpenses[0].PostedBy, total: sortedExpenses[0].Total });
                    setLowExpense({ postedBy: sortedExpenses[sortedExpenses.length - 1].PostedBy, total: sortedExpenses[sortedExpenses.length - 1].Total });
                }

                setFilteredExpenseData(expensePageData);

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
                    <select className='bg-gray-700 text-white rounded-md px-3 py-1' value={period} onChange={(e) => setPeriod(e.target.value)} disabled={loading}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                    {role === "admin" && (
                        <select className='bg-gray-700 text-white rounded-md px-3 py-1' value={branch} onChange={(e) => setBranch(e.target.value)} disabled={loading}>
                            <option defaultValue={"branch1"} value="Branch1">Branch1</option>
                            <option value="branch2">Branch2</option>
                            <option value="branch3">Branch3</option>
                        </select>
                    )}
                    <div className='flex items-center gap-2 bg-gray-700 text-white px-3 py-1 rounded-md'>
                        <DatePicker selected={startDate} onChange={setStartDate} selectsStart startDate={startDate} endDate={endDate} placeholderText="Start Date" className='bg-gray-700 text-white outline-none' disabled={loading} />
                        <span>-</span>
                        <DatePicker selected={endDate} onChange={setEndDate} selectsEnd startDate={startDate} endDate={endDate} placeholderText="End Date" className='bg-gray-700 text-white outline-none' disabled={loading} />
                    </div>
                </div>
            </div>
            <main className='max-w-[80vw] mx-auto py-6 px-4 lg:px-8'>
                {error && <div className="bg-red-600 text-white p-3 rounded-md mb-4 text-center">⚠️ {error}</div>}
                {loading ? (<div className="text-center text-white py-6">Loading expense data...</div>) : (
                    <>
                        <motion.div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
                            <StatCard name='Total Expense' icon={DollarSign} value={`Rs ${total}`} color='#6366F1' />
                            <StatCard
                                name='Branch Name'
                                icon={Wallet}
                                value={branch || "Not Selected"}
                                color='#EC4899'
                            />
                            <StatCard name='Top Expense' icon={Wallet} value={`${topExpense.postedBy} (Rs ${topExpense.total})`} color='#10B981' />
                            <StatCard name='Lowest Expense' icon={Wallet} value={`${lowExpense.postedBy} (Rs ${lowExpense.total})`} color='#EF4444' />
                        </motion.div>
                        <ExpenseOverviewChart title={`Expense Data of ${branch}`} expenseData={expenseChartData} />
                        <ExpenseTable filteredExpenseData={filteredExpenseData} />
                    </>
                )}
            </main>
        </div>
    );
}
export default ExpensePage;
