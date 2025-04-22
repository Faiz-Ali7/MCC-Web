import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const SalesOverviewChart = ({ salesData, title }) => {
    // Add data validation
    if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
        return (
            <motion.div
                className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h2 className='text-lg font-medium mb-4 text-gray-100'>{title}</h2>
                <p className="text-center text-gray-400">No sales data available</p>
            </motion.div>
        );
    }

    // Get max value for better Y-axis scaling
    const maxValue = Math.max(...salesData.map(item => Number(item.total) || 0));
    const yAxisMax = maxValue * 1.1; // Add 10% padding

    return (
        <motion.div
            className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700'
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
        >
            <h2 className='text-lg font-medium mb-4 text-gray-100'>{title}</h2>

            <div className='w-full h-96'>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={salesData}
                        margin={{ left: 20, right: 30, top: 20, bottom: 50 }}
                    >
                        <CartesianGrid strokeDasharray='3 3' stroke='#4B5563' />
                        <XAxis
                            dataKey="date"
                            stroke='#9ca3af'
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                        />
                        <YAxis
                            width={80}
                            stroke='#9ca3af'
                            domain={[0, yAxisMax]}
                            tickFormatter={(value) => value.toLocaleString()}
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                        />
                        <Tooltip
                            formatter={(value) => [`Rs ${Number(value).toLocaleString()}`, 'Sales']}
                            contentStyle={{
                                backgroundColor: "rgba(31, 41, 55, 0.8)",
                                borderColor: "#4B5563",
                                color: "#E5E7EB"
                            }}
                            labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Line
                            type='monotone'
                            dataKey='total'
                            stroke='#6366F1'
                            strokeWidth={2}
                            dot={(props) => (
                                <circle
                                    key={`dot-${props.cx}-${props.cy}`}
                                    cx={props.cx}
                                    cy={props.cy}
                                    r={4}
                                    fill="#6366F1"
                                    strokeWidth={2}
                                />
                            )}
                            activeDot={(props) => (
                                <circle
                                    key={`activeDot-${props.cx}-${props.cy}`}
                                    cx={props.cx}
                                    cy={props.cy}
                                    r={6}
                                    fill="#6366F1"
                                    strokeWidth={2}
                                />
                            )}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};

export default SalesOverviewChart;
