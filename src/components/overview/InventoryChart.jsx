import React from 'react'
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
function InventoryChart({ inventoryData, title }) {
    const maxValue = Math.max(...(inventoryData || []).map(item => item.Total_Stock), 0);

    const yAxisMax = maxValue * 1.1; // Adds 10% padding

    // Adds 10% padding for better visualization

    return (
        <motion.div
            className='bg-gray-800 bg-opacity-50  col-span-2 w-full max-w-[80vw] mx-auto backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700'
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
        >
            <h2 className='text-lg font-medium mb-4 text-gray-100 text-center'>{title}</h2>

            <div className='w-full h-96 overflow-x-auto'>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={inventoryData} margin={{ right: 20, top: 10, bottom: 50 }}>
                        <CartesianGrid strokeDasharray='3 3' stroke='#4B5563' />

                        <XAxis
                            dataKey="Category"
                            stroke='#9ca3af'
                            angle={-45}
                            textAnchor="end"
                            interval={0}
                            height={80}
                            tick={{ fontSize: 12, fill: "#E5E7EB" }}
                        />

                        <YAxis
                            stroke='#9ca3af'
                            width={120}
                            tickFormatter={(value) => value.toLocaleString()}
                            domain={[0, yAxisMax]} // Allows space above highest bar
                        />

                        <Tooltip
                            formatter={(value) => value.toLocaleString()} // Formats tooltips
                            contentStyle={{ backgroundColor: "rgba(31, 41, 55, 0.8)", borderColor: "#4B5563" }}
                            itemStyle={{ color: "#E5E7EB" }}
                        />

                        <Bar dataKey='Total_Stock' fill='#6366F1' barSize={window.innerWidth < 768 ? 15 : 25} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};

export default InventoryChart




