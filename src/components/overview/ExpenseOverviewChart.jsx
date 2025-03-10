import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function ExpenseOverviewChart({ expenseData,title }) {
  console.log("Expense Data:", expenseData); // Debugging

  return (
    <motion.div
      className="bg-gray-800 bg-opacity-50 col-span-2 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-100">{title}</h2>
      </div>

      <div className="w-full min-h-[300px] h-80">
        <ResponsiveContainer>
          {expenseData.length > 0 ? (
            <AreaChart data={expenseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis angle={-45} textAnchor="end" height={70} dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: "rgba(31, 41, 55, 0.8)", borderColor: "#4B5563" }}
                itemStyle={{ color: "#E5E7EB" }}
              />
              <Area type="monotone" dataKey="total" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
            </AreaChart>
          ) : (
            <p className="text-gray-400 text-center">No expense data available</p>
          )}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export default ExpenseOverviewChart;
