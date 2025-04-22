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

const AIPoweredInsights = () => {
    const [timeframe, setTimeframe] = useState('daily');
    const [data, setData] = useState(null);
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [predictions, setPredictions] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [validationMetrics, setValidationMetrics] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const fetchTimeoutRef = useRef(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, []);

    const generateInsights = useCallback((data, predictionChange) => {
        if (!data) return;

        const { salesData, purchaseData, expenseData, inventoryData } = data;
        
        // Calculate trends and insights
        const salesTrend = calculateTrend(salesData);
        const profitData = calculateProfitMargin(salesData, expenseData, purchaseData);
        const inventoryHealth = analyzeInventory(inventoryData);
        const expenseTrend = calculateTrend(expenseData);
        const purchaseTrend = calculateTrend(purchaseData);

        return [
            {
                icon: TrendingUp,
                color: predictionChange > 0 ? "text-green-500" : "text-red-500",
                insight: `Predicted ${timeframe} sales: ${predictionChange > 0 ? 'increase' : 'decrease'} by ${Math.abs(predictionChange)}%`,
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
                insight: `Revenue ${salesTrend > 0 ? 'up' : 'down'} by ${Math.abs(salesTrend)}% - Total: ${profitData.totalSales.toLocaleString()}`,
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

    const checkAndRefreshToken = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return false;
        }

        try {
            const decoded = jwtDecode(token);
            const currentTime = Math.floor(Date.now() / 1000);

            // If token is expired or about to expire in 5 minutes
            if (decoded.exp < currentTime + 300) {
                // Clear token and redirect to login
                localStorage.removeItem('token');
                navigate('/login');
                return false;
            }

            setIsAdmin(decoded.role === 'admin');
            return true;
        } catch (error) {
            console.error('Error decoding token:', error);
            localStorage.removeItem('token');
            navigate('/login');
            return false;
        }
    }, [navigate]);

    const generatePredictions = (salesData) => {
        if (!salesData || salesData.length < 2) return [];
        
        // Calculate validation metrics
        const metrics = validatePredictions(salesData, timeframe);
        setValidationMetrics(metrics);
        
        const predictions = generateEnsemblePrediction(salesData, timeframe);
        
        // Add confidence intervals to predictions
        return predictions.map(pred => {
            const interval = calculateConfidenceInterval(pred.total, metrics.historicalErrors);
            return {
                ...pred,
                confidenceLower: Math.max(0, Math.round(interval.lower)),
                confidenceUpper: Math.round(interval.upper)
            };
        });
    };

    const fetchData = useCallback(async () => {
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }

        fetchTimeoutRef.current = setTimeout(async () => {
            let retryCount = 0;
            const MAX_RETRIES = 3;
            
            const attemptFetch = async () => {
                if (!isMountedRef.current) return false;
                try {
                    setLoading(true);
                    setError(null);

                    // Check token validity
                    const isTokenValid = await checkAndRefreshToken();
                    if (!isTokenValid) return;

                    const token = localStorage.getItem('token');
                    const endpoint = isAdmin ? 'adminOverview-data' : 'Overview-data';
                    
                    const response = await axios.get(`http://localhost:3000/${endpoint}?period=${timeframe}`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        },
                        timeout: 30000
                    });

                    if (!response.data) {
                        throw new Error('No data received from server');
                    }

                    const responseData = {
                        salesData: response.data.salesData || [],
                        purchaseData: response.data.purchaseData || [],
                        expenseData: response.data.expenseData || [],
                        inventoryData: response.data.inventoryData || []
                    };
                    
                    if (responseData.salesData.length > 0) {
                        const newPredictions = generatePredictions(responseData.salesData);
                        setPredictions(newPredictions);
                        
                        const nextPeriodPrediction = newPredictions[0]?.total || 0;
                        const currentPeriodSales = responseData.salesData[responseData.salesData.length - 1]?.total || 0;
                        const predictionChange = currentPeriodSales ? Math.round(((nextPeriodPrediction - currentPeriodSales) / currentPeriodSales) * 100) : 0;
                        
                        responseData.salesPredictions = newPredictions;
                        setData(responseData);
                        const newInsights = generateInsights(responseData, predictionChange, timeframe);
                        setInsights(newInsights);
                    } else {
                        setError('No data available for the selected period');
                    }
                    return true; // Success
                } catch (error) {
                    if (!isMountedRef.current) return false;
                    console.error(`Attempt ${retryCount + 1} failed:`, error);
                    
                    if (error.code === 'ECONNABORTED' && retryCount < MAX_RETRIES - 1) {
                        return false;
                    }
                    
                    if (error.response) {
                        if (error.response.status === 401) {
                            navigate('/login');
                            return false;
                        } else if (error.response.status === 403) {
                            setError('You don\'t have permission to access this data');
                            return false;
                        } else {
                            const errorMessage = error.response.data?.error || 
                                               error.response.data?.message || 
                                               error.response.data?.details ||
                                               'An error occurred while fetching data';
                            setError(`Error loading data: ${errorMessage}`);
                        }
                    } else if (error.code === 'ECONNABORTED') {
                        setError('Request timed out. The operation is taking longer than expected.');
                    } else if (error.message) {
                        setError(error.message);
                    } else {
                        setError('Unable to connect to server. Please check your connection.');
                    }
                    
                    // Clear data states on error
                    setData(null);
                    setPredictions([]);
                    setInsights([]);
                    return false;
                }
            };

            while (retryCount < MAX_RETRIES && isMountedRef.current) {
                try {
                    const success = await attemptFetch();
                    if (success) break;
                    retryCount++;
                    if (retryCount < MAX_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
                    }
                } catch (error) {
                    retryCount++;
                    if (retryCount === MAX_RETRIES && isMountedRef.current) {
                        setError('Maximum retry attempts reached. Please try again later.');
                        setData(null);
                        setPredictions([]);
                        setInsights([]);
                    }
                }
            }
            
            setLoading(false);
        }, 500); // 500ms debounce
    }, [timeframe, isAdmin, navigate, checkAndRefreshToken, generateInsights]);

    const calculateProfitMargin = (salesData, expenseData, purchaseData) => {
        if (!salesData?.length || !expenseData?.length || !purchaseData?.length) return 0;
        
        // Calculate total revenue
        const totalSales = salesData.reduce((sum, item) => sum + item.total, 0);
        
        // Calculate total costs (purchases + operating expenses)
        const totalPurchases = purchaseData.reduce((sum, item) => sum + item.total, 0);
        const totalExpenses = expenseData.reduce((sum, item) => sum + item.total, 0);
        const totalCosts = totalPurchases + totalExpenses;
        
        // Calculate gross profit (sales - purchases)
        const grossProfit = totalSales - totalPurchases;
        const grossProfitMargin = Math.round((grossProfit / totalSales) * 100);
        
        // Calculate net profit (gross profit - expenses)
        const netProfit = grossProfit - totalExpenses;
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
        if (!data || data.length < 2) return 0;
        const latest = data[data.length - 1].total;
        const previous = data[data.length - 2].total;
        return Math.round(((latest - previous) / previous) * 100);
    };

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

    useEffect(() => {
        fetchData();
        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, [timeframe, fetchData]);

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
                    <div style={{ width: '100%', height: 250, paddingLeft: '0px', paddingRight: '10px' }}>
                        <ResponsiveContainer >
                            <LineChart data={[...data.salesData, ...predictions]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="date" stroke="#9CA3AF" />
                                <YAxis stroke="#9CA3AF" />
                                
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
