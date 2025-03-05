import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const SalesOverviewChart = ({ salesData }) => {
	if (!salesData || salesData.length === 0) {
		return <p className="text-center text-gray-400">No sales data available</p>;
	}

	return (
		<motion.div
			className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700'
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.2 }}
		>
			<h2 className='text-lg font-medium mb-4 text-gray-100'>Sales Overview</h2>

			<div className='w-full h-96'>
				<ResponsiveContainer width="100%" height="100%">
					<LineChart
						data={salesData}
						margin={{ left: 5, right: 50, top: 20, bottom: 30 }}
					>
						<CartesianGrid strokeDasharray='3 3' stroke='#4B5563' />
						<XAxis
							dataKey="date" // Updated to match your data format
							stroke='#9ca3af'
							angle={-45}
							textAnchor="end"
							height={50}
						/>
						<YAxis
							width={100}
							stroke='#9ca3af'
							tickFormatter={(value) => value.toLocaleString()}
						/>
						<Tooltip
							formatter={(value) => value.toLocaleString()}
							contentStyle={{
								backgroundColor: "rgba(31, 41, 55, 0.8)",
								borderColor: "#4B5563",
							}}
							itemStyle={{ color: "#E5E7EB" }}
						/>
						<Line
							type='monotone'
							dataKey='total' // Updated to match your data format
							stroke='#6366F1'
							strokeWidth={3}
							dot={{ fill: "#6366F1", strokeWidth: 2, r: 6 }}
							activeDot={{ r: 8, strokeWidth: 2 }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</motion.div>
	);
};

export default SalesOverviewChart;
