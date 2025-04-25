import { motion } from "framer-motion";
import { TrendingUp, Users, ShoppingBag, DollarSign, Calendar, TrendingDown, AlertCircle, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';



// Moving Average calculation
const calculateMovingAverage = (data, window = 3) => {
    if (!data || data.length < window) return [];
    const result = [];
    for (let i = window - 1; i < data.length; i++) {
        const sum = data.slice(i - window + 1, i + 1).reduce((acc, val) => acc + val.total, 0);
        result.push(sum / window);
    }
    return result;
};

// Exponential Smoothing
const calculateExponentialSmoothing = (data, alpha = 0.3) => {
    if (!data || !data.length) return [];
    const result = [data[0].total];
    for (let i = 1; i < data.length; i++) {
        result.push(alpha * data[i].total + (1 - alpha) * result[i - 1]);
    }
    return result;
};

// Seasonal decomposition
const calculateSeasonality = (data, period) => {
    if (!data || data.length < period) return { seasonalFactors: [], deseasonalized: [] };
    
    // Calculate seasonal indices
    const seasons = new Array(period).fill(0);
    const counts = new Array(period).fill(0);
    
    data.forEach((point, i) => {
        const seasonIndex = i % period;
        seasons[seasonIndex] += point.total;
        counts[seasonIndex]++;
    });
    
    const seasonalFactors = seasons.map((sum, i) => sum / counts[i]);
    const averageFactor = seasonalFactors.reduce((a, b) => a + b) / period;
    const normalizedFactors = seasonalFactors.map(factor => factor / averageFactor);
    
    // Deseasonalize the data
    const deseasonalized = data.map((point, i) => ({
        ...point,
        total: point.total / normalizedFactors[i % period]
    }));
    
    return { seasonalFactors: normalizedFactors, deseasonalized };
};

// ARIMA-like prediction (simplified AR model)
const calculateARModel = (data, order = 3) => {
    if (!data || data.length < order + 1) return [];
    
    // Calculate coefficients using least squares
    const X = [];
    const y = [];
    for (let i = order; i < data.length; i++) {
        const row = [];
        for (let j = 1; j <= order; j++) {
            row.push(data[i - j].total);
        }
        X.push(row);
        y.push(data[i].total);
    }
    
    // Simple coefficient calculation
    const coefficients = new Array(order).fill(1/order); // Simplified coefficients
    
    // Generate predictions
    const predictions = [];
    for (let i = order; i < data.length; i++) {
        let prediction = 0;
        for (let j = 0; j < order; j++) {
            prediction += coefficients[j] * data[i - j - 1].total;
        }
        predictions.push(prediction);
    }
    
    return predictions;
};

// Linear regression helper function
const linearRegression = (data) => {
    const n = data.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    data.forEach((point, i) => {
        sumX += i;
        sumY += point.total;
        sumXY += i * point.total;
        sumXX += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return (x) => slope * x + intercept;
};

// Ensemble prediction
const generateEnsemblePrediction = (salesData, timeframe) => {
    if (!salesData || salesData.length < 4) return [];
    
    // Generate predictions from each model
    const ma = calculateMovingAverage(salesData);
    const es = calculateExponentialSmoothing(salesData);
    const ar = calculateARModel(salesData);
    const linear = linearRegression(salesData);
    
    // Get seasonal factors if applicable
    const period = timeframe === 'daily' ? 7 : timeframe === 'weekly' ? 4 : 12;
    const { seasonalFactors } = calculateSeasonality(salesData, period);
    
    // Generate future dates
    const lastDate = salesData[salesData.length - 1].date;
    const futureDates = generateFutureDates(lastDate, timeframe, 3);
    
    // Combine predictions with weights
    const weights = {
        ma: 0.25,
        es: 0.25,
        ar: 0.25,
        linear: 0.25
    };
    
    return futureDates.map((date, index) => {
        const i = salesData.length + index;
        
        // Get predictions from each model
        const maPred = ma[ma.length - 1] || 0;
        const esPred = es[es.length - 1] || 0;
        const arPred = ar[ar.length - 1] || 0;
        const linearPred = linear(i);
        
        // Combine predictions
        let prediction = (
            maPred * weights.ma +
            esPred * weights.es +
            arPred * weights.ar +
            linearPred * weights.linear
        );
        
        // Apply seasonal factor if available
        if (seasonalFactors.length) {
            prediction *= seasonalFactors[i % period];
        }
        
        return {
            date,
            total: Math.max(0, Math.round(prediction)),
            isPredicted: true,
            models: {
                ma: Math.round(maPred),
                es: Math.round(esPred),
                ar: Math.round(arPred),
                linear: Math.round(linearPred)
            }
        };
    });
};

// Generate future dates based on timeframe
const generateFutureDates = (lastDate, timeframe, count) => {
    const date = new Date(lastDate);
    const dates = [];
    
    for (let i = 1; i <= count; i++) {
        if (timeframe === 'daily') {
            date.setDate(date.getDate() + 1);
        } else if (timeframe === 'weekly') {
            date.setDate(date.getDate() + 7);
        } else {
            date.setMonth(date.getMonth() + 1);
        }
        dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
};

// Prediction validation metrics
const calculateMAPE = (actual, predicted) => {
    if (actual.length !== predicted.length) return 0;
    const sum = actual.reduce((acc, val, i) => {
        return acc + Math.abs((val - predicted[i]) / val);
    }, 0);
    return (sum / actual.length) * 100;
};

const calculateRMSE = (actual, predicted) => {
    if (actual.length !== predicted.length) return 0;
    const sum = actual.reduce((acc, val, i) => {
        return acc + Math.pow(val - predicted[i], 2);
    }, 0);
    return Math.sqrt(sum / actual.length);
};

const calculateConfidenceInterval = (prediction, historicalErrors) => {
    const standardDeviation = Math.sqrt(
        historicalErrors.reduce((acc, error) => acc + Math.pow(error, 2), 0) / historicalErrors.length
    );
    const confidenceLevel = 1.96; // 95% confidence interval
    return {
        lower: prediction - (confidenceLevel * standardDeviation),
        upper: prediction + (confidenceLevel * standardDeviation)
    };
};

const validatePredictions = (salesData, timeframe) => {
    // Use the last 20% of data for validation
    const testSize = Math.floor(salesData.length * 0.2);
    const trainingData = salesData.slice(0, -testSize);
    const testData = salesData.slice(-testSize);
    
    // Generate predictions for test period
    const predictions = generateEnsemblePrediction(trainingData, timeframe);
    
    // Calculate errors
    const actualValues = testData.map(d => d.total);
    const predictedValues = predictions.slice(0, testSize).map(p => p.total);
    
    const mape = calculateMAPE(actualValues, predictedValues);
    const rmse = calculateRMSE(actualValues, predictedValues);
    
    // Calculate historical errors for confidence intervals
    const errors = actualValues.map((actual, i) => actual - predictedValues[i]);
    
    return {
        mape,
        rmse,
        historicalErrors: errors,
        accuracyScore: Math.max(0, 100 - mape) // Convert MAPE to accuracy percentage
    };
};

const BranchSelector = ({ value, onChange }) => (
    <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-700 text-gray-200 rounded-md px-3 py-1 border border-gray-600"
    >
        <option value="all">All Branches</option>
        <option value="Branch1">Branch 1</option>
        <option value="Branch2">Branch 2</option>
        <option value="Branch3">Branch 3</option>
    </select>
);

const processDataForAllBranches = (data) => {
    if (!Array.isArray(data)) return [];

    // Create a map to store totals by date
    const dateMap = new Map();

    data.forEach(item => {
        const date = item.date;
        const total = Number(item.total) || 0;

        if (dateMap.has(date)) {
            dateMap.set(date, dateMap.get(date) + total);
        } else {
            dateMap.set(date, total);
        }
    });

    // Convert map back to array and sort by date
    return Array.from(dateMap.entries())
        .map(([date, total]) => ({
            date,
            total: Math.round(total)
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
};

const AIPoweredInsights = () => {
    const [timeframe, setTimeframe] = useState('daily');
    const [data, setData] = useState(null);
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [predictions, setPredictions] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [validationMetrics, setValidationMetrics] = useState(null);
    const [error, setError] = useState(null);
    const [selectedBranch, setSelectedBranch] = useState('all');
    const navigate = useNavigate();
    const fetchTimeoutRef = useRef(null);
    const isMountedRef = useRef(true);

    const checkAndRefreshToken = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return false;
        }

        try {
            const decoded = jwtDecode(token);
            const currentTime = Math.floor(Date.now() / 1000);

            if (decoded.exp < currentTime + 300) {
                localStorage.removeItem('token');
                navigate('/login');
                return false;
            }

            const isUserAdmin = decoded.role === 'admin';
            setIsAdmin(isUserAdmin);

            if (isUserAdmin) {
                return true;
            }

            if (!decoded.branch) {
                throw new Error('Branch is missing in token');
            }

            return true;
        } catch (error) {
            console.error('Token validation error:', error);
            localStorage.removeItem('token');
            navigate('/login');
            return false;
        }
    }, [navigate]);

    const generatePredictions = useCallback((salesData) => {
        if (!salesData || salesData.length < 2) return [];
        
        const metrics = validatePredictions(salesData, timeframe);
        setValidationMetrics(metrics);
        
        const predictions = generateEnsemblePrediction(salesData, timeframe);
        
        return predictions.map(pred => {
            const interval = calculateConfidenceInterval(pred.total, metrics.historicalErrors);
            return {
                ...pred,
                confidenceLower: Math.max(0, Math.round(interval.lower)),
                confidenceUpper: Math.round(interval.upper)
            };
        });
    }, [timeframe]);

    const calculateProfitMargin = (salesData, expenseData, purchaseData) => {
        if (!salesData?.length || !expenseData?.length || !purchaseData?.length) {
            return {
                grossProfitMargin: 0,
                netProfitMargin: 0,
                grossProfit: 0,
                netProfit: 0,
                totalSales: 0,
                totalPurchases: 0,
                totalExpenses: 0
            };
        }

        // Calculate totals using reduce with Number conversion
        const totalSales = salesData.reduce((sum, item) => sum + Number(item.total || 0), 0);
        const totalPurchases = purchaseData.reduce((sum, item) => sum + Number(item.total || 0), 0);
        const totalExpenses = expenseData.reduce((sum, item) => sum + Number(item.total || 0), 0);

        // Prevent division by zero
        if (totalSales === 0) {
            return {
                grossProfitMargin: 0,
                netProfitMargin: 0,
                grossProfit: 0,
                netProfit: 0,
                totalSales: 0,
                totalPurchases,
                totalExpenses
            };
        }

        // Calculate profits
        const grossProfit = totalSales - totalPurchases;
        const netProfit = grossProfit - totalExpenses;

        // Calculate margins as percentages
        const grossProfitMargin = Math.round((grossProfit / totalSales) * 100);
        const netProfitMargin = Math.round((netProfit / totalSales) * 100);

        return {
            grossProfitMargin,
            netProfitMargin,
            grossProfit,
            netProfit,
            totalSales,
            totalPurchases,
            totalExpenses
        };
    };

    const calculateTrend = (data) => {
        if (!Array.isArray(data) || data.length < 2) return 0;

        // Get last two periods with proper number conversion
        const latest = Number(data[data.length - 1]?.total || 0);
        const previous = Number(data[data.length - 2]?.total || 0);

        // Prevent division by zero
        if (previous === 0) return 0;

        // Calculate percentage change
        return Math.round(((latest - previous) / previous) * 100);
    };

    const calculateSmoothedTrend = (data, window = 3) => {
        if (!Array.isArray(data) || data.length < window * 2) return 0;

        // Calculate moving averages for current and previous periods
        const getCurrentMA = () => {
            const slice = data.slice(-window);
            return slice.reduce((sum, item) => sum + Number(item.total || 0), 0) / window;
        };

        const getPreviousMA = () => {
            const slice = data.slice(-window * 2, -window);
            return slice.reduce((sum, item) => sum + Number(item.total || 0), 0) / window;
        };

        const currentMA = getCurrentMA();
        const previousMA = getPreviousMA();

        // Prevent division by zero
        if (previousMA === 0) return 0;

        // Calculate trend based on moving averages
        return Math.round(((currentMA - previousMA) / previousMA) * 100);
    };

    const calculateRevenue = (salesData) => {
        if (!Array.isArray(salesData)) return 0;

        return salesData.reduce((total, sale) => {
            const amount = Number(sale.total || 0);
            return total + (isNaN(amount) ? 0 : amount);
        }, 0);
    };

    const generateInsights = useCallback((data, predictionChange = 0) => {
        if (!data?.salesData?.length) return [];

        const { salesData, purchaseData, expenseData, inventoryData } = data;

        // Calculate trends with smoothing for more stability
        const salesTrend = calculateSmoothedTrend(salesData) || 0;
        const purchaseTrend = calculateSmoothedTrend(purchaseData) || 0;
        const expenseTrend = calculateSmoothedTrend(expenseData) || 0;

        // Calculate financial metrics
        const profitData = calculateProfitMargin(salesData, expenseData, purchaseData);
        const revenue = calculateRevenue(salesData);

        return [
            {
                icon: TrendingUp,
                color: predictionChange > 0 ? "text-green-500" : "text-red-500",
                insight: `Predicted ${timeframe} sales: ${predictionChange > 0 ? 'increase' : 'decrease'} by ${Math.abs(predictionChange) || 0}%`,
                priority: Math.abs(predictionChange) > 10 ? "high" : "medium",
            },
            {
                icon: DollarSign,
                color: profitData.netProfitMargin > 15 ? "text-green-500" : "text-yellow-500",
                insight: `Net profit margin: ${profitData.netProfitMargin}% (Gross: ${profitData.grossProfitMargin}%) - ${
                    profitData.netProfitMargin < 15 
                        ? 'Action needed: Review pricing and costs' 
                        : 'Healthy profit margins'
                }`,
                priority: profitData.netProfitMargin < 15 ? "high" : "medium",
            },
            {
                icon: TrendingUp,
                color: salesTrend > 0 ? "text-green-500" : "text-red-500",
                insight: `Revenue ${salesTrend > 0 ? 'up' : 'down'} by ${Math.abs(salesTrend)}% - Total: ${revenue.toLocaleString()}`,
                priority: Math.abs(salesTrend) > 10 ? "high" : "medium",
            },
            {
                icon: ShoppingBag,
                color: purchaseTrend > 0 ? "text-yellow-500" : "text-green-500",
                insight: `Purchase costs ${purchaseTrend > 0 ? 'increased' : 'decreased'} by ${Math.abs(purchaseTrend)}% - Total: ${profitData.totalPurchases.toLocaleString()}`,
                priority: purchaseTrend > 15 ? "high" : "medium",
            },
            {
                icon: TrendingDown,
                color: expenseTrend > 0 ? "text-red-500" : "text-green-500",
                insight: `Operating expenses ${expenseTrend > 0 ? 'increased' : 'decreased'} by ${Math.abs(expenseTrend)}% - Total: ${profitData.totalExpenses.toLocaleString()}`,
                priority: expenseTrend > 10 ? "high" : "medium",
            }
        ];
    }, [timeframe]);

    const fetchData = useCallback(async () => {
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }

        fetchTimeoutRef.current = setTimeout(async () => {
            try {
                setLoading(true);
                setError(null);

                const isTokenValid = await checkAndRefreshToken();
                if (!isTokenValid) return;

                const token = localStorage.getItem('token');
                const decoded = jwtDecode(token);
                
                const endpoint = decoded.role === 'admin' ? 'adminOverview-data' : 'Overview-data';
                
                const params = new URLSearchParams({
                    period: timeframe,
                    ...(selectedBranch !== 'all' && { branch: selectedBranch })
                });

                const response = await axios.get(`http://localhost:3000/${endpoint}?${params}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!response.data) {
                    throw new Error('No data received from server');
                }

                // Process data based on branch selection
                const processedData = {
                    salesData: selectedBranch === 'all' ? 
                        processDataForAllBranches(response.data.salesData) : 
                        response.data.salesData,
                    purchaseData: selectedBranch === 'all' ? 
                        processDataForAllBranches(response.data.purchaseData) : 
                        response.data.purchaseData,
                    expenseData: selectedBranch === 'all' ? 
                        processDataForAllBranches(response.data.expenseData) : 
                        response.data.expenseData,
                    inventoryData: response.data.inventoryData
                };

                setData(processedData);

                if (processedData.salesData.length > 0) {
                    const newPredictions = generatePredictions(processedData.salesData);
                    setPredictions(newPredictions);
                    
                    const nextPeriodPrediction = newPredictions[0]?.total || 0;
                    const currentPeriodSales = processedData.salesData[processedData.salesData.length - 1]?.total || 0;
                    
                    let predictionChange = 0;
                    if (currentPeriodSales > 0 && nextPeriodPrediction > 0) {
                        predictionChange = Math.round(((nextPeriodPrediction - currentPeriodSales) / currentPeriodSales) * 100);
                    }

                    const newInsights = generateInsights(processedData, predictionChange);
                    setInsights(newInsights);
                }

            } catch (error) {
                console.error('Fetch error:', error);
                setError(error.message || 'Error loading data');
                setData(null);
                setPredictions([]);
                setInsights([]);
            } finally {
                setLoading(false);
            }
        }, 500);
    }, [timeframe, selectedBranch, navigate, checkAndRefreshToken, generateInsights, generatePredictions]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const initializeComponent = async () => {
            const isValid = await checkAndRefreshToken();
            if (isValid) {
                fetchData();
            }
        };
        
        initializeComponent();
    }, [fetchData, checkAndRefreshToken]);

    useEffect(() => {
        if (isAdmin) {
            fetchData();
        }
    }, [selectedBranch, isAdmin, fetchData]);

    const analyzeInventory = (inventoryData) => {
        if (!inventoryData?.length) {
            return { status: 'unknown', message: 'Insufficient inventory data' };
        }

        const totalStock = inventoryData.reduce((sum, item) => sum + item.total, 0);
        if (totalStock > 1000) {
            return { 
                status: 'warning',
                message: 'High inventory levels detected - Consider running promotions'
            };
        }
        if (totalStock < 100) {
            return {
                status: 'warning',
                message: 'Low inventory levels - Consider restocking soon'
            };
        }
        return {
            status: 'good',
            message: 'Inventory levels are optimal'
        };
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <motion.div
            className='bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-lg shadow-lg rounded-xl p-6 border border-gray-700'
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
        >
            <div className="flex justify-between items-center mb-6">
                <h2 className='text-xl font-semibold text-gray-100'>AI-Powered Insights & Predictions</h2>
                <div className="flex items-center space-x-4">
                    {isAdmin && (
                        <BranchSelector
                            value={selectedBranch}
                            onChange={setSelectedBranch}
                        />
                    )}
                    <select 
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="bg-gray-700 text-gray-200 rounded-md px-3 py-1 border border-gray-600"
                    >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>
            </div>

            {error && (
                <div className="mb-4 text-red-500 text-sm">
                    {error}
                </div>
            )}

            {validationMetrics && (
                <div className="mb-4 grid grid-cols-3 gap-4">
                    <div className="bg-gray-700 bg-opacity-30 p-3 rounded-lg">
                        <div className="text-sm text-gray-400">Prediction Accuracy</div>
                        <div className="text-xl text-green-400">
                            {Math.round(validationMetrics.accuracyScore)}%
                        </div>
                    </div>
                    <div className="bg-gray-700 bg-opacity-30 p-3 rounded-lg">
                        <div className="text-sm text-gray-400">Mean Error (MAPE)</div>
                        <div className="text-xl text-yellow-400">
                            {Math.round(validationMetrics.mape)}%
                        </div>
                    </div>
                    <div className="bg-gray-700 bg-opacity-30 p-3 rounded-lg">
                        <div className="text-sm text-gray-400">Root Mean Square Error</div>
                        <div className="text-xl text-blue-400">
                            {Math.round(validationMetrics.rmse)}
                        </div>
                    </div>
                </div>
            )}

            {data && (
                <div className="mb-6 bg-gray-700 bg-opacity-50 p-4 rounded-lg">
                    <h3 className="text-gray-200 mb-3">Sales & Revenue Forecast</h3>
                    <div style={{ width: '100%', height: 250, paddingLeft: '10px', paddingRight: '10px' }}>
                        <ResponsiveContainer>
                            <LineChart 
                                data={[...data.salesData, ...predictions]}
                                margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#9CA3AF"
                                    padding={{ left: 20, right: 20 }}
                                />
                                <YAxis 
                                    stroke="#9CA3AF"
                                    width={70}
                                    tickFormatter={(value) => value.toLocaleString()}
                                    padding={{ top: 20, bottom: 20 }}
                                />
                                
                                {/* Confidence interval area */}
                                <Area
                                    dataKey="confidenceUpper"
                                    stroke="none"
                                    fill="#8B5CF6"
                                    fillOpacity={0.1}
                                />
                                <Area
                                    dataKey="confidenceLower"
                                    stroke="none"
                                    fill="#8B5CF6"
                                    fillOpacity={0.1}
                                />
                                
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: "rgba(31, 41, 55, 0.8)",
                                        borderColor: "#4B5563",
                                        color: "#E5E7EB"
                                    }}
                                    formatter={(value, name, props) => {
                                        if (props.payload.isPredicted) {
                                            const models = props.payload.models;
                                            return [
                                                <div>
                                                    <div>Final Prediction: {value}</div>
                                                    <div className="text-xs mt-1 text-gray-400">95% Confidence Interval:</div>
                                                    <div className="text-xs">Lower: {props.payload.confidenceLower}</div>
                                                    <div className="text-xs">Upper: {props.payload.confidenceUpper}</div>
                                                    <div className="text-xs mt-1 text-gray-400">Individual Models:</div>
                                                    <div className="text-xs">Moving Average: {models.ma}</div>
                                                    <div className="text-xs">Exponential Smoothing: {models.es}</div>
                                                    <div className="text-xs">AutoRegressive: {models.ar}</div>
                                                    <div className="text-xs">Linear Trend: {models.linear}</div>
                                                </div>,
                                                name
                                            ];
                                        }
                                        return [value, name];
                                    }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="total" 
                                    stroke="#8B5CF6" 
                                    strokeWidth={2}
                                    dot={(props) => {
                                        if (props.payload.isPredicted) {
                                            return (
                                                <circle
                                                    key={`dot-${props.cx}-${props.cy}`}
                                                    cx={props.cx}
                                                    cy={props.cy}
                                                    r={4}
                                                    fill="#8B5CF6"
                                                    stroke="#8B5CF6"
                                                    strokeWidth={2}
                                                    strokeDasharray="3 3"
                                                />
                                            );
                                        }
                                        return (
                                            <circle
                                                key={`dot-${props.cx}-${props.cy}`}
                                                cx={props.cx}
                                                cy={props.cy}
                                                r={4}
                                                fill="#8B5CF6"
                                                stroke="#8B5CF6"
                                                strokeWidth={2}
                                            />
                                        );
                                    }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className='space-y-4'>
                {insights.map((item, index) => (
                    <div 
                        key={index} 
                        className={`flex items-center space-x-3 p-3 rounded-lg ${
                            item.priority === 'high' ? 'bg-opacity-20 bg-red-900' : 'bg-opacity-10 bg-gray-700'
                        }`}
                    >
                        <div className={`p-2 rounded-full ${item.color} bg-opacity-20`}>
                            <item.icon className={`size-6 ${item.color}`} />
                        </div>
                        <p className='text-gray-300 flex-1'>{item.insight}</p>
                        {item.priority === 'high' && (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-500 bg-opacity-20 text-red-400">
                                High Priority
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default AIPoweredInsights;
