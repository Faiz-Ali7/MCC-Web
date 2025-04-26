const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sql = require('mssql');
const dotenv = require('dotenv');
const cors = require('cors')
const redis = require('redis');
const authMiddleware = require('./middlewares/authMiddleware');
const { getPool } = require('./db');
const { transform } = require('framer-motion');
const { TableProperties } = require('lucide-react');
// Load environment variables
dotenv.config();


const app = express();

app.use(bodyParser.json());
app.use(cors())
app.use((req, res, next) => {
  if (req.path === '/login') {
    return next();
  }
  authMiddleware(req, res, next);
});
const redisClient = redis.createClient({
  host: '127.0.0.1',  // Redis host
  port: 6379,         // Redis port
});
async function connectToRedis() {
  try {
    // Wait for the Redis connection to be established
    await redisClient.connect();

    console.log('Connected to Redis');
  } catch (error) {
    console.error('Error connecting to Redis:', error);
  }
}
// Database connection function

// Login API
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const pool = await getPool();
    
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM Users WHERE Email = @email');
    
    const user = result.recordset[0];
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.PasswordHash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Include branch in token payload
    const token = jwt.sign({ 
      userId: user.UserId,
      email: user.Email,
      role: user.Role,
      branch: user.Branch_Name // Make sure this matches your DB column name
    }, "s3cR3tK3y@2024!example#", { expiresIn: '24h' });
    
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});
app.get('/Overview-data', authMiddleware, async (req, res) => {
  const branch = req.user?.branch;
  const period = req.query.period || 'daily';
  const referenceDate = new Date('2024-04-01');
  const cacheKey = `Overview-data:${branch}:${referenceDate.toISOString()}`;

  try {
    if (!branch) {
      console.log("❌ Branch is missing in token!");
      return res.status(400).json({ error: "Branch is missing in token" });
    }

    let cachedData = await redisClient.get(cacheKey);
    cachedData = cachedData ? JSON.parse(cachedData) : {};

    if (cachedData[period]) {
      console.log(`✅ Serving from cache for period: ${period}`);
      return res.status(200).json(cachedData[period]);
    }

    const pool = await getPool();

    // Calculate date range
    let dateRangeStart = new Date(referenceDate);
    if (period === 'daily') {
      dateRangeStart.setDate(dateRangeStart.getDate() - 7);
    } else if (period === 'weekly') {
      dateRangeStart.setDate(dateRangeStart.getDate() - 28);
    } else if (period === 'monthly') {
      dateRangeStart.setMonth(dateRangeStart.getMonth() - 12);
    }

    const [salesResult, purchaseResult, expenseResult, inventoryResult] = await Promise.all([
      // Sales Query with Index
      pool.request()
        .input('dateRangeStart', sql.Date, dateRangeStart)
        .input('referenceDate', sql.Date, referenceDate)
        .query(`
          SELECT FORMAT(di_date, 'yyyy-MM-dd') as SaleDate, SUM(fi_Amount) as TotalSales, '${branch}' as Branch 
          FROM ${branch}_InvoicesDetailsandRI 
          WHERE CAST(di_date AS DATE) BETWEEN @dateRangeStart AND @referenceDate 
          GROUP BY FORMAT(di_date, 'yyyy-MM-dd')
          ORDER BY FORMAT(di_date, 'yyyy-MM-dd')  
        `),

      // Purchase Query with Index
      pool.request()
        .input('dateRangeStart', sql.Date, dateRangeStart)
        .input('referenceDate', sql.Date, referenceDate)
        .query(`
          SELECT FORMAT(srDate, 'yyyy-MM-dd') as PurchaseDate, SUM(srFRAmount) as TotalPurchase, '${branch}' as Branch 
          FROM ${branch}_StockReceiptD
          WHERE CAST(srDate AS DATE) BETWEEN @dateRangeStart AND @referenceDate 
          GROUP BY FORMAT(srDate, 'yyyy-MM-dd')
          ORDER BY FORMAT(srDate, 'yyyy-MM-dd') 
        `),

      // Expense Query with Index
      pool.request()
        .input('dateRangeStart', sql.Date, dateRangeStart)
        .input('referenceDate', sql.Date, referenceDate)
        .query(`
          SELECT FORMAT(dTran_Date, 'yyyy-MM-dd') as ExpenseDate, SUM(fTran_Debit) as Total_Expense, '${branch}' as Branch 
          FROM ${branch}_Transactions
          WHERE fTran_Debit > 0 
          AND sITM_Class = 'EXPENSES'
          AND CAST(dTran_Date AS DATE) BETWEEN @dateRangeStart AND @referenceDate 
          GROUP BY FORMAT(dTran_Date, 'yyyy-MM-dd')
          ORDER BY FORMAT(dTran_Date, 'yyyy-MM-dd')  
        `),

      // Inventory Query with Index
      pool.request()
        .input('referenceDate', sql.Date, referenceDate)
        .query(`
          SELECT 
            sITM_Class as Category,
            SUM(iTran_Qty) as Total_Stock,
            '${branch}' as Branch
          FROM ${branch}_Transactions 
          WHERE iTran_Qty > 0
          AND CAST(dTran_Date AS DATE) = @referenceDate
          GROUP BY sITM_Class
          ORDER BY sITM_Class  
        `)
    ]);

    const salesData = salesResult.recordset.map(item => ({
      date: item.SaleDate,
      total: Math.round(item.TotalSales || 0),
      Branch:item.Branch
    }));

    const purchaseData = purchaseResult.recordset.map(item => ({
      date: item.PurchaseDate,
      total: Math.round(item.TotalPurchase || 0),
      Branch:item.Branch
    }));

    const expenseData = expenseResult.recordset.map(item => ({
      date: item.ExpenseDate,
      total: Math.round(item.Total_Expense || 0),
      Branch:item.Branch
    }));

    const inventoryData = inventoryResult.recordset.map(item => ({
      Category: item.Category,
      Total_Stock: Math.round(item.Total_Stock || 0),
      Branch: item.Branch
    }));
    const freshData = { salesData, purchaseData, expenseData, inventoryData };
    console.log(freshData)
    cachedData[period] = freshData;
    await redisClient.setEx(cacheKey, 86400, JSON.stringify(cachedData));

    res.status(200).json(freshData);
  } catch (error) {
    console.error('❌ Error fetching cumulative data:', error);
    res.status(500).json({ 
      error: 'An error occurred while fetching cumulative data', 
      details: error.message 
    });
  }
});
app.delete('/delete', authMiddleware, async (req, res) => {
  const email = req.body.email || req.query.email; // Support both body and query

  if (!email) {
    return res.status(400).json({ message: 'Email is required to delete a user' });
  }

  try {
    const pool = await getPool();

    // Check if the user exists
    const checkRequest = pool.request().input('email', sql.VarChar, email);
    const result = await checkRequest.query('SELECT * FROM Users WHERE Email = @email');

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete the user
    const deleteRequest = pool.request().input('email', sql.VarChar, email);
    await deleteRequest.query('DELETE FROM Users WHERE Email = @email');

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});
app.post('/register', authMiddleware, async (req, res) => {
  try {
    const { branch, email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required' });
    }

    // Connect to SQL Server
    const pool = await getPool();

    // Check if user already exists
    const checkUser = await pool
      .request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM Users WHERE Email = @email');

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert new user
    await pool
      .request()
      .input('email', sql.VarChar, email)
      .input('password', sql.VarChar, hashedPassword)
      .input('role', sql.VarChar, role)
      .input('branch', sql.VarChar, branch)
      .query('INSERT INTO Users (Email, PasswordHash, Role, Branch_Name) VALUES (@email, @password, @role, @branch)');

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});
app.get('/adminOverview-data', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const pool = await getPool();
    const period = req.query.period || 'daily';
    const branch = req.query.branch || null;
    const referenceDate = new Date('2024-04-01');

    let dateRangeStart = new Date(referenceDate);
    switch (period) {
      case 'daily':
        dateRangeStart.setDate(dateRangeStart.getDate() - 7);
        break;
      case 'weekly':
        dateRangeStart.setDate(dateRangeStart.getDate() - 28);
        break;
      case 'monthly':
        dateRangeStart.setMonth(dateRangeStart.getMonth() - 12);
        break;
    }

    const request = pool.request()
      .input('dateRangeStart', sql.Date, dateRangeStart)
      .input('referenceDate', sql.Date, referenceDate)
      .input('branch', sql.VarChar, branch);

    const [salesResult, purchaseResult, expenseResult, inventoryResult] = await Promise.all([
      request.query(`
        SELECT FORMAT(dI_Date, 'yyyy-MM-dd') AS date, Branch_Name AS Branch, SUM(fi_Amount) AS total 
        FROM (
          SELECT dI_Date, 'Branch1' AS Branch_Name, fi_Amount 
          FROM Branch1_InvoicesDetailsandRI
          WHERE CAST(dI_Date AS DATE) BETWEEN @dateRangeStart AND @referenceDate
          ${branch ? "AND @branch = 'Branch1'" : ''}
          UNION ALL
          SELECT dI_Date, 'Branch2', fi_Amount 
          FROM Branch2_InvoicesDetailsandRI
          WHERE CAST(dI_Date AS DATE) BETWEEN @dateRangeStart AND @referenceDate
          ${branch ? "AND @branch = 'Branch2'" : ''}
          UNION ALL
          SELECT dI_Date, 'Branch3', fi_Amount 
          FROM Branch3_InvoicesDetailsandRI
          WHERE CAST(dI_Date AS DATE) BETWEEN @dateRangeStart AND @referenceDate
          ${branch ? "AND @branch = 'Branch3'" : ''}
        ) AS CombinedSales
        GROUP BY FORMAT(dI_Date, 'yyyy-MM-dd'), Branch_Name
        ORDER BY date, Branch_Name
      `),
      request.query(`
        SELECT FORMAT(srDate, 'yyyy-MM-dd') AS date, Branch_Name AS Branch, SUM(srFRAmount) AS total 
        FROM (
          SELECT srDate, 'Branch1' AS Branch_Name, srFRAmount 
          FROM Branch1_StockReceiptD
          WHERE CAST(srDate AS DATE) BETWEEN @dateRangeStart AND @referenceDate
          ${branch ? "AND @branch = 'Branch1'" : ''}
          UNION ALL
          SELECT srDate, 'Branch2', srFRAmount 
          FROM Branch2_StockReceiptD
          WHERE CAST(srDate AS DATE) BETWEEN @dateRangeStart AND @referenceDate
          ${branch ? "AND @branch = 'Branch2'" : ''}
          UNION ALL
          SELECT srDate, 'Branch3', srFRAmount 
          FROM Branch3_StockReceiptD
          WHERE CAST(srDate AS DATE) BETWEEN @dateRangeStart AND @referenceDate
          ${branch ? "AND @branch = 'Branch3'" : ''}
        ) AS CombinedPurchases
        GROUP BY FORMAT(srDate, 'yyyy-MM-dd'), Branch_Name
        ORDER BY date, Branch_Name
      `),
      request.query(`
        SELECT FORMAT(dTran_Date, 'yyyy-MM-dd') AS date, Branch_Name AS Branch, SUM(fTran_Debit) AS total 
        FROM (
          SELECT dTran_Date, 'Branch1' AS Branch_Name, fTran_Debit 
          FROM Branch1_Transactions
          WHERE fTran_Debit > 0 AND sITM_Class = 'EXPENSES'
          AND CAST(dTran_Date AS DATE) BETWEEN @dateRangeStart AND @referenceDate
          ${branch ? "AND @branch = 'Branch1'" : ''}
          UNION ALL
          SELECT dTran_Date, 'Branch2', fTran_Debit 
          FROM Branch2_Transactions
          WHERE fTran_Debit > 0 AND sITM_Class = 'EXPENSES'
          AND CAST(dTran_Date AS DATE) BETWEEN @dateRangeStart AND @referenceDate
          ${branch ? "AND @branch = 'Branch2'" : ''}
          UNION ALL
          SELECT dTran_Date, 'Branch3', fTran_Debit 
          FROM Branch3_Transactions
          WHERE fTran_Debit > 0 AND sITM_Class = 'EXPENSES'
          AND CAST(dTran_Date AS DATE) BETWEEN @dateRangeStart AND @referenceDate
          ${branch ? "AND @branch = 'Branch3'" : ''}
        ) AS CombinedExpenses
        GROUP BY FORMAT(dTran_Date, 'yyyy-MM-dd'), Branch_Name
        ORDER BY date, Branch_Name
      `),
      request.query(`
        SELECT Branch_Name AS Branch, sITM_Class AS Category, SUM(iTran_Qty) AS Total_Stock 
        FROM (
          SELECT 'Branch1' AS Branch_Name, sITM_Class, iTran_Qty 
          FROM Branch1_Transactions
          WHERE iTran_Qty > 0 AND CAST(dTran_Date AS DATE) = @referenceDate
          ${branch ? "AND @branch = 'Branch1'" : ''}
          UNION ALL
          SELECT 'Branch2', sITM_Class, iTran_Qty 
          FROM Branch2_Transactions
          WHERE iTran_Qty > 0 AND CAST(dTran_Date AS DATE) = @referenceDate
          ${branch ? "AND @branch = 'Branch2'" : ''}
          UNION ALL
          SELECT 'Branch3', sITM_Class, iTran_Qty 
          FROM Branch3_Transactions
          WHERE iTran_Qty > 0 AND CAST(dTran_Date AS DATE) = @referenceDate
          ${branch ? "AND @branch = 'Branch3'" : ''}
        ) AS CombinedInventory
        GROUP BY Branch_Name, sITM_Class
      `)
    ]);

    const formatData = (records) => records.map(record => ({
      date: record.date,
      Branch: record.Branch,
      total: Math.round(record.total || 0)
    }));

    const freshData = {
      salesData: formatData(salesResult.recordset),
      purchaseData: formatData(purchaseResult.recordset),
      expenseData: formatData(expenseResult.recordset),
      inventoryData: inventoryResult.recordset.map(record => ({
        Branch: record.Branch,
        Category: record.Category,
        Total_Stock: Math.round(record.Total_Stock || 0)
      }))
    };

    return res.status(200).json(freshData);

  } catch (error) {
    console.error("❌ Error in adminOverview-data:", error);
    return res.status(500).json({ 
      error: "Internal Server Error", 
      details: error.message 
    });
  }
});
app.get('/Expense-data', authMiddleware, async (req, res) => {
  const period = req.query.period || 'daily';
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const branch = req.query.branch || req.user.branch;

  if (!req.user || (!req.user.branch && !req.query.branch)) {
    return res.status(401).json({ error: "Unauthorized. Branch not found." });
  }

  const referenceDate = new Date('2024-04-01');
  const cacheKey = `expense-data:${branch}:${period}:${startDate || ''}:${endDate || ''}`;

  try {
    // Check cache first
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Serving from cache for period: ${period}`);
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (startDate && !endDate) {
      return res.status(400).json({ error: 'End date is required when start date is provided' });
    }
    if (!startDate && endDate) {
      return res.status(400).json({ error: 'Start date is required when end date is provided' });
    }

    const pool = await getPool();
    const tableName = `${branch}_Transactions`;

    if (startDate && endDate) {
      const result = await pool.request()
        .input("startDate", sql.Date, startDate)
        .input("endDate", sql.Date, endDate)
        .query(`
          SELECT sTran_Description, SUM(fTran_Debit) AS Total, dtran_date 
          FROM ${tableName} 
          WHERE fTran_Debit > 0 AND sITM_Class='EXPENSES'
          AND CAST(dTran_Date AS DATE) BETWEEN @startDate AND @endDate 
          GROUP BY sTran_Description, dtran_date
        `);

      const formattedData = result.recordset.map(item => ({
        PostedBy: item.sTran_Description,
        Date: new Date(item.dtran_date).toISOString().split('T')[0],
        Total: Math.round(item.Total).toString()
      }));

      // Store in cache
      await redisClient.setEx(cacheKey, 86400, JSON.stringify(formattedData));

      console.log(`Branch: ${branch}, Period: ${period}, Start Date: ${startDate}, End Date: ${endDate}`);
      return res.status(200).json(formattedData);
    }

    // Handle predefined periods
    let dateRangeStart = new Date(referenceDate);
    if (period === 'daily') {
      dateRangeStart.setDate(dateRangeStart.getDate() - 7);
    } else if (period === 'weekly') {
      dateRangeStart.setDate(dateRangeStart.getDate() - 28);
    } else if (period === 'monthly') {
      dateRangeStart.setMonth(dateRangeStart.getMonth() - 12);
    }

    const formattedDateStart = dateRangeStart.toISOString().split("T")[0];
    const formattedReferenceDate = referenceDate.toISOString().split("T")[0];

    const result = await pool.request()
      .input("dateStart", sql.Date, formattedDateStart)
      .input("referenceDate", sql.Date, formattedReferenceDate)
      .query(`
        SELECT sTran_Description, SUM(fTran_Debit) AS Total, dtran_date 
        FROM ${tableName} 
        WHERE fTran_Debit > 0 AND sITM_Class='EXPENSES'
        AND CAST(dTran_Date AS DATE) BETWEEN @dateStart AND @referenceDate 
        GROUP BY sTran_Description, dtran_date
      `);

    const formattedData = result.recordset.map(item => ({
      PostedBy: item.sTran_Description,
      Date: new Date(item.dtran_date).toISOString().split('T')[0],
      Total: Math.round(item.Total).toString()
    }));

    // Store in cache
    await redisClient.setEx(cacheKey, 86400, JSON.stringify(formattedData));

    console.log(`Branch: ${branch}, Period: ${period}`);
    res.status(200).json(formattedData);
  } catch (error) {
    console.error("❌ Error fetching expense data:", error);
    res.status(500).json({
      error: 'An error occurred while fetching expense data',
      details: error.message
    });
  }
});
app.get('/sales-Data', authMiddleware, async (req, res) => {
  const period = req.query.period || 'daily';
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const branch = req.query.branch || req.user.branch;

  if (!req.user || (!req.user.branch && !req.query.branch)) {
    return res.status(401).json({ error: "Unauthorized. Branch not found." });
  }
  const referenceDate = new Date('2024-04-01');

  const cacheKey = `sales-Data:${branch}:${period}:${startDate || ''}:${endDate || ''}`;

  try {
    // Check cache first
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Serving from cache for period: ${period}`);
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (startDate && !endDate) {
      return res.status(400).json({ error: 'End date is required when start date is provided' });
    }
    if (!startDate && endDate) {
      return res.status(400).json({ error: 'Start date is required when end date is provided' });
    }

    const pool = await getPool();
    const tableName = `${branch}_InvoicesDetailsandRI`;

    if (startDate && endDate) {
      const result = await pool.request()
        .input("startDate", sql.Date, startDate)
        .input("endDate", sql.Date, endDate)
        .query(`
          SELECT sI_SaleCode, SUM(fi_Amount) AS Total 
          FROM ${tableName} 
          WHERE CAST(di_date AS DATE) BETWEEN @startDate AND @endDate 
          GROUP BY sI_SaleCode 
          ORDER BY sI_SaleCode
        `);

      const formattedData = result.recordset.map(item => ({
        Category: item.sI_SaleCode,
        Total: Math.round(item.Total)
      }));

      console.log(`Branch: ${branch}, Period: ${period}, Start Date: ${startDate}, End Date: ${endDate}`);
      return res.status(200).json(formattedData);
    }

    // Handle predefined periods
    let dateRangeStart = new Date(referenceDate);
    if (period === 'daily') {
      dateRangeStart.setDate(dateRangeStart.getDate() - 7);
    } else if (period === 'weekly') {
      dateRangeStart.setDate(dateRangeStart.getDate() - 28);
    } else if (period === 'monthly') {
      dateRangeStart.setMonth(dateRangeStart.getMonth() - 12);
    }

    const formattedDateStart = dateRangeStart.toISOString().split("T")[0];
    const formattedReferenceDate = referenceDate.toISOString().split("T")[0];

    const result = await pool.request()
      .input("dateStart", sql.Date, formattedDateStart)
      .input("referenceDate", sql.Date, formattedReferenceDate)
      .query(`
        SELECT sI_SaleCode, SUM(fi_Amount) AS Total 
        FROM ${tableName} 
        WHERE CAST(di_date AS DATE) BETWEEN @dateStart AND @referenceDate 
        GROUP BY sI_SaleCode 
        ORDER BY sI_SaleCode
      `);

    const formattedData = result.recordset.map(item => ({
      Category: item.sI_SaleCode,
      Total: Math.round(item.Total)
    }));

    // Store in cache
    await redisClient.setEx(cacheKey, 86400, JSON.stringify(formattedData));

    console.log(`Branch: ${branch}, Period: ${period}`);
    res.status(200).json(formattedData);
  } catch (error) {
    console.error("❌ Error fetching sales data:", error);
    res.status(500).json({
      error: 'An error occurred while fetching sales data',
      details: error.message
    });
  }
});
app.get('/purchase-Data', async (req, res) => {
  const period = req.query.period || 'daily';
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const branch = req.query.branch || req.user.branch;
  if (!req.user || (!req.user.branch && !req.query.branch)) {
    return res.status(401).json({ error: "Unauthorized. Branch not found." });
  }

  const referenceDate = new Date('2024-04-01');

  const cacheKey = `Purchase-Data:${branch}:${period}:${startDate || ''}:${endDate || ''}`;

  try {
    // Check cache first
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Serving from cache for period: ${period}`);
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (startDate && !endDate) {
      return res.status(400).json({ error: 'End date is required when start date is provided' });
    }
    if (!startDate && endDate) {
      return res.status(400).json({ error: 'Start date is required when end date is provided' });
    }

    const pool = await getPool();
    const tableName = `${branch}_StockReceiptD`;

    if (startDate && endDate) {
      const result = await pool.request()
        .input("startDate", sql.Date, startDate)
        .input("endDate", sql.Date, endDate)
        .query(`
         SELECT srClass,srsupplierdesc, SUM(srFRAmount) AS TotalPurchase
      FROM ${tableName} 
      WHERE srDate BETWEEN @startDate AND @endDate
      GROUP BY srClass,srsupplierdesc
      ORDER BY srClass,srsupplierdesc;
        `);
      const formattedData = result.recordset.map(item => ({
        Category: item.srClass,
        Supplier: item.srsupplierdesc,
        Total: Math.round(item.TotalPurchase)
      }));

      console.log(`Branch: ${branch}, Period: ${period}, Start Date: ${startDate}, End Date: ${endDate}`);
      return res.status(200).json(formattedData);
    }

    // Handle predefined periods
    let dateRangeStart = new Date(referenceDate);
    if (period === 'daily') {
      dateRangeStart.setDate(dateRangeStart.getDate() - 7);
    } else if (period === 'weekly') {
      dateRangeStart.setDate(dateRangeStart.getDate() - 28);
    } else if (period === 'monthly') {
      dateRangeStart.setMonth(dateRangeStart.getMonth() - 12);
    }

    const formattedDateStart = dateRangeStart.toISOString().split("T")[0];
    const formattedReferenceDate = referenceDate.toISOString().split("T")[0];

    const result = await pool.request()
      .input("dateStart", sql.Date, formattedDateStart)
      .input("referenceDate", sql.Date, formattedReferenceDate)
      .query(`
        SELECT srClass,srsupplierdesc, SUM(srFRAmount) AS TotalPurchase
      FROM ${tableName} 
      WHERE srDate BETWEEN @dateStart AND @referenceDate
      GROUP BY srClass,srsupplierdesc
      ORDER BY srClass,srsupplierdesc;
      `);

    const formattedData = result.recordset.map(item => ({
      Category: item.srClass,
      Supplier: item.srsupplierdesc,
      Total: Math.round(item.TotalPurchase)
    }));

    // Store in cache
    await redisClient.setEx(cacheKey, 86400, JSON.stringify(formattedData));

    console.log(`Branch: ${branch}, Period: ${period}`);
    res.status(200).json(formattedData);
  } catch (error) {
    console.error("❌ Error fetching sales data:", error);
    res.status(500).json({
      error: 'An error occurred while fetching sales data',
      details: error.message
    });
  }
});
app.get('/inventory-Data', async (req, res) => {
  const period = req.query.period || 'daily';
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const branch = req.query.branch || req.user.branch;

  if (!req.user || (!req.user.branch && !req.query.branch)) {
    return res.status(401).json({ error: "Unauthorized. Branch not found." });
  }

  const referenceDate = new Date('2024-04-01');
  const cacheKey = `Inventory-Data:${branch}:${period}:${startDate || ''}:${endDate || ''}`;

  try {
    // Check cache first
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Serving from cache for period: ${period}`);
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (startDate && !endDate) {
      return res.status(400).json({ error: 'End date is required when start date is provided' });
    }
    if (!startDate && endDate) {
      return res.status(400).json({ error: 'Start date is required when end date is provided' });
    }

    const pool = await getPool();
    const tableName = `${branch}_Transactions`;

    if (startDate && endDate) {
      const result = await pool.request()
        .input("startDate", sql.Date, startDate)
        .input("endDate", sql.Date, endDate)
        .query(`
          SELECT DISTINCT sTran_Description, dTran_Date, SUM(iTran_Qty) AS Total_Stock
          FROM ${tableName}
          WHERE iTran_Qty > 0
          AND dTran_Date BETWEEN @startDate AND @endDate
          GROUP BY sTran_Description, dTran_Date
          ORDER BY Total_Stock DESC;
        `);

      const formattedData = result.recordset.map(item => ({
        Description: item.sTran_Description,
        Date: new Date(item.dTran_Date).toISOString().split('T')[0],  // Format date to YYYY-MM-DD
        TotalStock: Math.round(item.Total_Stock)  // Round to nearest whole number
      }));

      console.log(`Branch: ${branch}, Period: ${period}, Start Date: ${startDate}, End Date: ${endDate}`);
      return res.status(200).json(formattedData);
    }

    // Handle predefined periods
    let dateRangeStart = new Date(referenceDate);
    if (period === 'daily') {
      dateRangeStart.setDate(dateRangeStart.getDate() - 7);
    } else if (period === 'weekly') {
      dateRangeStart.setDate(dateRangeStart.getDate() - 28);
    } else if (period === 'monthly') {
      dateRangeStart.setMonth(dateRangeStart.getMonth() - 12);
    }

    const formattedDateStart = dateRangeStart.toISOString().split("T")[0];
    const formattedReferenceDate = referenceDate.toISOString().split("T")[0];

    const result = await pool.request()
      .input("dateStart", sql.Date, formattedDateStart)
      .input("referenceDate", sql.Date, formattedReferenceDate)
      .query(`
        SELECT DISTINCT sTran_Description, dTran_Date, SUM(iTran_Qty) AS Total_Stock
        FROM ${tableName} 
        WHERE iTran_Qty > 0
        AND dTran_Date BETWEEN @dateStart AND @referenceDate
        GROUP BY sTran_Description, dTran_Date
        ORDER BY Total_Stock DESC;
      `);
    const formattedData = result.recordset.map(item => ({
      Description: item.sTran_Description,
      Date: new Date(item.dTran_Date).toISOString().split('T')[0],
      TotalStock: Math.round(item.Total_Stock)
    }));

    // Store in cache for 24 hours
    await redisClient.setEx(cacheKey, 86400, JSON.stringify(formattedData));

    console.log(`Branch: ${branch}, Period: ${period}`);
    res.status(200).json(formattedData);
  } catch (error) {
    console.error("❌ Error fetching inventory data:", error);
    res.status(500).json({
      error: 'An error occurred while fetching inventory data',
      details: error.message
    });
  }
});
app.post('/create-tables', authMiddleware, async (req, res) => {
  try {
    const { branch } = req.body;

    if (!branch) {
      return res.status(400).json({ message: 'Branch name is required' });
    }

    // Connect to SQL Server
    const pool = await getPool();

    // Construct the SQL to create tables dynamically
    const createTablesSQL = `
      CREATE TABLE ${branch}_Invoices (
          fI_TotalAmount FLOAT NOT NULL,  
          sI_PostedBy VARCHAR(255) NOT NULL,  
          sI_Branch VARCHAR(255) NOT NULL,    
          sI_Type VARCHAR(100) NOT NULL,
          dI_Date DATETIME NOT NULL
      );
  
      CREATE TABLE ${branch}_InvoicesDetailsAndRI (
        iI_Number INT NOT NULL,  
        dI_Date DATETIME NOT NULL,  
        fI_Amount FLOAT NOT NULL,  
        sI_Type VARCHAR(100) NOT NULL,  
        sI_PostedBy VARCHAR(255) NOT NULL,  
        sI_SaleCode VARCHAR(100) NOT NULL,  
        sI_Description VARCHAR(255) NOT NULL,  
        fI_CostPrice FLOAT NOT NULL,  
        sI_Supplier VARCHAR(255) NOT NULL,  
        sI_SupplierDesc VARCHAR(255) NOT NULL
      );

      CREATE TABLE ${branch}_Transactions (
        sTran_Type VARCHAR(50) NOT NULL,           
        iTran_VoucherNo INT NOT NULL,              
        dtran_date DATETIME NOT NULL,              
        sITM_Class VARCHAR(100) NOT NULL,           
        sTran_Description VARCHAR(255) NOT NULL,    
        fTran_Debit FLOAT NOT NULL,                 
        fTran_Credit FLOAT NOT NULL,                
        sTran_Branch VARCHAR(255) NOT NULL,         
        sTran_PostedBy VARCHAR(255) NOT NULL,       
        stran_Supplier VARCHAR(255) NOT NULL,       
        stran_Supplierdesc VARCHAR(255) NOT NULL   
    );


     CREATE TABLE ${branch}_Inventory (
        sitm_code VARCHAR(255) NOT NULL,
        sItm_Desc VARCHAR(255) NOT NULL,
        sItm_Class VARCHAR(100) NOT NULL,
        sItm_CostPrice VARCHAR(50) NOT NULL,
        sItm_Price VARCHAR(50) NOT NULL,
        sitm_supplier VARCHAR(255) NOT NULL,
        sitm_supplierdesc VARCHAR(255) NOT NULL
    );

    `;

    // Execute the SQL to create the tables
    await pool.request().query(createTablesSQL);

    res.status(200).json({ message: 'Tables created successfully' });

  } catch (error) {
    // Log the full error and stack trace for debugging
    console.error('Error creating tables:', error.message);
    console.error('Stack Trace:', error.stack); // Log the stack trace

    // Return a detailed error message in the response
    res.status(500).json({
      message: 'Error creating tables',
      error: error.message,
      stack: error.stack // Include the stack trace for better debugging
    });
  }
});
app.get('/get-tables', authMiddleware, async (req, res) => {
  try {
    // Connect to SQL Server
    const pool = await getPool();

    // Query to fetch table names from INFORMATION_SCHEMA.TABLES
    const result = await pool.request().query(`
      SELECT table_name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE table_type = 'BASE TABLE'  -- Fetch only the actual tables, not views
    `);

    // Extract the table names from the result
    const tableNames = result.recordset.map(row => row.table_name);

    // Respond with the table names
    res.status(200).json({ tables: tableNames });
  } catch (error) {
    // Log the error and stack trace for debugging
    console.error('Error fetching table names:', error.message);
    console.error('Stack Trace:', error.stack);

    // Return a detailed error message in the response
    res.status(500).json({
      message: 'Error fetching table names',
      error: error.message,
      stack: error.stack // Include the stack trace for debugging
    });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  await connectToRedis();
  console.log(`Server running on port ${PORT}`);
});