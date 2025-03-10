import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const PurchaseOverviewChart = ({ purchaseData,title }) => {
	if (!purchaseData || purchaseData.length === 0) {
		return <p className="text-center text-gray-400">No purchase data available</p>;
	}

	return (
		<motion.div
			className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700'
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.2 }}
		>
			<div className='flex items-center justify-between mb-6'>
				<h2 className='text-xl font-semibold text-gray-100'>{title}</h2>
			</div>

			<div className='w-full h-[400px]'> {/* Adjusted height for better visibility */}
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart
						data={purchaseData}
						margin={{ top: 20, right: 30, left: 10, bottom: 50 }} // Adjusted margins
					>
						<CartesianGrid strokeDasharray='3 3' stroke='#374151' />
						<XAxis 
							dataKey='date' 
							stroke='#9CA3AF' 
							angle={-45} // Rotate X-axis labels for better fit
							textAnchor="end"
							height={70} // Give extra space for rotated labels
						/>
						<YAxis 
							stroke='#9CA3AF'
							width={90} // Increase width for better readability
							tickFormatter={(value) => value.toLocaleString()} 
						/>
						<Tooltip
							formatter={(value) => value.toLocaleString()}
							contentStyle={{ backgroundColor: "rgba(31, 41, 55, 0.8)", borderColor: "#4B5563" }}
							itemStyle={{ color: "#E5E7EB" }}
						/>
						<Area
							type='monotone'
							dataKey='total'
							stroke='#8B5CF6'
							fill='#8B5CF6'
							fillOpacity={0.3}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</motion.div>
	);
};

export default PurchaseOverviewChart;
