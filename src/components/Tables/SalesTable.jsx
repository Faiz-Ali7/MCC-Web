import { useState } from "react";

const SalesTable = ({ filteredSalesData }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);

    // Filtered Data based on Search Query
    const filteredData = filteredSalesData.filter(item =>
        item.Category && item.Category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Update suggestions as user types
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);

        if (value.length > 0) {
            const uniqueSuggestions = [...new Set(filteredSalesData.map(item => item.Category))]
                .filter(item => item.toLowerCase().includes(value.toLowerCase()))
                .slice(0, 5); // Limit suggestions to 5

            setSuggestions(uniqueSuggestions);
        } else {
            setSuggestions([]);
        }
    };

    return (
        <div className="mt-6">
            {/* Search Bar */}
            <div className="flex items-center space-x-4 mb-4">
                <div className="relative w-full">
                    <input
                        type="text"
                        className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:ring focus:ring-blue-500"
                        placeholder="Search by Category..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                    />
                    {suggestions.length > 0 && (
                        <ul className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded-lg mt-1">
                            {suggestions.map((suggestion, index) => (
                                <li
                                    key={index}
                                    className="px-4 py-2 text-white hover:bg-gray-700 cursor-pointer"
                                    onClick={() => {
                                        setSearchQuery(suggestion);
                                        setSuggestions([]);
                                    }}
                                >
                                    {suggestion}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Table */}
            {filteredData.length > 0 ? (
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
                            {filteredData.map((item, index) => (
                                <tr key={index} className="border-b border-gray-600 hover:bg-gray-700 transition">
                                    <td className="px-4 py-2 text-white">{index + 1}</td>
                                    <td className="px-4 py-2 text-white">{item.Category}</td>
                                    <td className="px-4 py-2 text-left text-white">{item.Total.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-center text-gray-400 mt-6">No sales data available for the selected filters.</p>
            )}
        </div>
    );
};

export default SalesTable;