import { BarChart2, DollarSign, Menu, Settings, ShoppingBag, ShoppingCart, TrendingUp, Users, PackageCheck, Banknote, Activity, Store, Package2, Wallet, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom"; // add useNavigate
import { jwtDecode } from "jwt-decode";

const ALL_SIDEBAR_ITEMS = [
    {
        name: "Overview",
        icon: BarChart2,
        color: "#6366f1", // Indigo
        href: "/",
        showFor: ["admin", "manager"]
    },
    { 
        name: "Sales", 
        icon: DollarSign, 
        color: "#4ade80", // Green
        href: "/sales",
        showFor: ["admin", "manager"]
    },
    { 
        name: "Purchase", 
        icon: ShoppingCart, 
        color: "#f472b6", // Pink
        href: "/purchase",
        showFor: ["admin", "manager"]
    },
    { 
        name: "Inventory", 
        icon: Package2, 
        color: "#38bdf8", // Sky Blue
        href: "/inventory",
        showFor: ["admin", "manager"]
    },
    { 
        name: "Expense", 
        icon: Wallet, 
        color: "#fbbf24", // Yellow
        href: "/expense",
        showFor: ["admin", "manager"]
    },
    { 
        name: "User Management", 
        icon: Users, 
        color: "#8b5cf6", // Violet
        href: "/register",
        showFor: ["admin"]
    },
    { 
        name: "Branch Management", 
        icon: Store, 
        color: "#ea580c", // Orange
        href: "/branch",
        showFor: ["admin"]
    },
    { 
        name: "AI-Powered Analytics", 
        icon: TrendingUp, 
        color: "#22d3ee", // Cyan
        href: "/analytics",
        showFor: ["admin", "manager"]
    },
];

const Sidebar = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [sidebarItems, setSidebarItems] = useState([]);
    const navigate = useNavigate(); // add navigate hook

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUserRole(decoded.role);
            } catch (error) {
                console.error("Error decoding token:", error);
            }
        }
    }, []);

    useEffect(() => {
        if (userRole) {
            const filteredItems = ALL_SIDEBAR_ITEMS.filter(item => 
                item.showFor.includes(userRole.toLowerCase())
            );
            setSidebarItems(filteredItems);
        }
    }, [userRole]);

    const handleLogout = () => {
        localStorage.removeItem("token"); // clear token
        navigate("/login"); // navigate to login page
    };

    return (
        <motion.div
            className={`relative z-10 transition-all duration-300 ease-in-out flex-shrink-0 ${isSidebarOpen ? "w-64" : "w-20"}`}
            animate={{ width: isSidebarOpen ? 256 : 80 }}
        >
            <div className='h-full bg-gray-800 bg-opacity-50 backdrop-blur-md p-4 flex flex-col border-r border-gray-700'>
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className='p-2 rounded-full hover:bg-gray-700 transition-colors max-w-fit'
                >
                    <Menu size={24} />
                </motion.button>

                <nav className='mt-8 flex-grow'>
                    {sidebarItems.map((item) => (
                        <Link key={item.href} to={item.href}>
                            <motion.div className='flex items-center p-4 text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors mb-2'>
                                <item.icon size={20} style={{ color: item.color, minWidth: "20px" }} />
                                <AnimatePresence>
                                    {isSidebarOpen && (
                                        <motion.span
                                            className='ml-4 whitespace-nowrap'
                                            initial={{ opacity: 0, width: 0 }}
                                            animate={{ opacity: 1, width: "auto" }}
                                            exit={{ opacity: 0, width: 0 }}
                                            transition={{ duration: 0.2, delay: 0.3 }}
                                        >
                                            {item.name}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </Link>
                    ))}
                </nav>

                {/* Logout Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogout}
                    className='flex items-center p-4 text-sm font-medium rounded-lg hover:bg-red-600 transition-colors mb-2 mt-auto text-white bg-red-500'
                >
                    <LogOut size={20} style={{ minWidth: "20px" }} />
                    <AnimatePresence>
                        {isSidebarOpen && (
                            <motion.span
                                className='ml-4 whitespace-nowrap'
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2, delay: 0.3 }}
                            >
                                Logout
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.button>
            </div>
        </motion.div>
    );
};

export default Sidebar;
