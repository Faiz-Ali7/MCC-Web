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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ message: 'Email and password are required' });
  }

  try {
    const pool = await getPool();


    // Query to find the user by email
    const result = await pool.request()
      .input('Email', sql.VarChar, email)
      .query('SELECT * FROM Users WHERE Email = @Email');

    if (result.recordset.length === 0) {
      return res.status(404).send({ message: 'User not found' });
    }

    const user = result.recordset[0];

    // Check if the password matches
    const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
    if (!isPasswordValid) {
      return res.status(401).send({ message: 'Invalid password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.Id, email: user.Email, role: user.Role, branch: user.Branch_Name, },
      "s3cR3tK3y@2024!example#",
      { expiresIn: '1h' }
    );

    res.send({ user, token, message: 'Login successful' });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).send({ message: 'Server error', error: err.message });
  }
});
app.get('/Overview-data', authMiddleware, async (req, res) => {
  const branch = req.user?.branch;
  const period = req.query.period || 'daily'; // Period from query (daily, weekly, monthly)
  const referenceDate = new Date('2024-04-01');
  const cacheKey = `Overview-data:${branch}`;

  try {
    if (!branch) {
      console.log("❌ Branch is missing in token!");
      return res.status(400).json({ error: "Branch is missing in token" });
    }

    // Step 1: Retrieve Cached Data (All Periods)
    let cachedData = await redisClient.get(cacheKey);
    cachedData = cachedData ? JSON.parse(cachedData) : {};

    // Step 2: Check if Requested Period Exists in Cache
    if (cachedData[period]) {
      console.log(`✅ Serving from cache for period: ${period}`);
      return res.status(200).json(cachedData[period]);
    } else {
      console.log(`⚠️ ${period} data not found in cache. Fetching from DB...`);
    }

    // Step 3: Compute Date Range Start Based on Period
    let dateRangeStart = new Date(referenceDate);
    if (period === 'daily') {
      dateRangeStart.setDate(dateRangeStart.getDate() - 7);
    } else if (period === 'weekly') {
      dateRangeStart.setDate(dateRangeStart.getDate() - 28);
    } else if (period === 'monthly') {
      dateRangeStart.setMonth(dateRangeStart.getMonth() - 12);
    }


    console.log("📅 Reference Date:", referenceDate.toISOString().split("T")[0]);
    console.log("📅 Start Date:", dateRangeStart.toISOString().split("T")[0]);

    // Step 4: SQL Connection
    const pool = await getPool();
    const salesTable = `${branch}_InvoicesDetailsandRI`;
    const purchaseTable = `${branch}_StockReceiptD`;
    const expenseTable = `${branch}_Transactions`;
    const inventorytable = `${branch}_Transactions`;

    // Step 5: SQL Queries
    const salesQuery = `
      SELECT FORMAT(dI_Date, 'yyyy-MM-dd') AS SaleDate, SUM(fi_Amount) AS TotalSales
      FROM ${salesTable}
      WHERE di_Date BETWEEN @dateRangeStart AND @referenceDate
      GROUP BY FORMAT(dI_Date, 'yyyy-MM-dd')
      ORDER BY SaleDate;
      
    `;

    const purchaseQuery = `
      SELECT FORMAT(srDate, 'yyyy-MM-dd') AS PurchaseDate, SUM(srFRAmount) AS TotalPurchase
      FROM ${purchaseTable}
      WHERE srDate BETWEEN @dateRangeStart AND @referenceDate
      GROUP BY FORMAT(srDate, 'yyyy-MM-dd')
      ORDER BY PurchaseDate;
    `;

    const expenseQuery = `
      SELECT FORMAT(dTran_Date, 'yyyy-MM-dd') AS ExpenseDate, SUM(ftran_debit) AS Total_Expense
      FROM ${expenseTable}
      WHERE fTran_Debit > 0 
      AND sITM_Class='EXPENSES'
      GROUP BY FORMAT(dTran_Date, 'yyyy-MM-dd')
      ORDER BY ExpenseDate;
    `;
    const inventoryQuery = `
     select  distinct sTran_Description,FORMAT(dTran_Date, 'yyyy-MM-dd') AS inventorydate,sum(iTran_Qty) as Total_Stock
      from ${inventorytable}
       where itran_qty>0 
       group by iTran_Qty,sTran_Description,dTran_Date
       Order by inventorydate
    `;

    // Step 6: Execute Queries
    const [salesResult, purchaseResult, expenseResult, inventoryresult] = await Promise.all([
      pool.request()
        .input('dateRangeStart', sql.Date, dateRangeStart)
        .input('referenceDate', sql.Date, referenceDate)
        .query(salesQuery),
      pool.request()
        .input('dateRangeStart', sql.Date, dateRangeStart)
        .input('referenceDate', sql.Date, referenceDate)
        .query(purchaseQuery),
      pool.request()
        .input('dateRangeStart', sql.Date, dateRangeStart)
        .input('referenceDate', sql.Date, referenceDate)
        .query(expenseQuery),
      pool.request()
        .input('dateRangeStart', sql.Date, dateRangeStart)
        .input('referenceDate', sql.Date, referenceDate)
        .query(inventoryQuery)
    ]);

    // Step 7: Format SQL Data
    const salesData = salesResult.recordset.map(item => ({
      date: item.SaleDate,
      total: Math.round(item.TotalSales)
    }));

    const purchaseData = purchaseResult.recordset.map(item => ({
      date: item.PurchaseDate,
      total: Math.round(item.TotalPurchase)
    }));

    const expenseData = expenseResult.recordset.map(item => ({
      date: item.ExpenseDate,
      total: Math.round(item.Total_Expense)
    }));
    const inventoryData = inventoryresult.recordset.map(item => ({
      date: item.ExpenseDate,
      total: Math.round(item.Total_stock)
    }));

    const freshData = { salesData, purchaseData, expenseData, inventoryData };

    // Step 8: Update Cache with New Data While Keeping Old Data
    cachedData[period] = freshData;
    await redisClient.setEx(cacheKey, 86400, JSON.stringify(cachedData));
    console.log(`♻️ Cache updated with fresh ${period} data.`);

    res.status(200).json(freshData);

  } catch (error) {
    console.error('❌ Error fetching cumulative data:', error);
    res.status(500).json({ error: 'An error occurred while fetching cumulative data', details: error.message });
  } finally {
    sql.close();
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
app.get('/adminOverview-data', async (req, res) => {
  try {
    const pool = await getPool();
    const period = req.query.period || 'daily';
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const referenceDate = new Date('2024-04-01');

    let dateRangeStart = new Date(referenceDate);
    if (!startDate || !endDate) {
      if (period === 'daily') dateRangeStart.setDate(referenceDate.getDate() - 7);
      else if (period === 'weekly') dateRangeStart.setDate(referenceDate.getDate() - 28);
      else if (period === 'monthly') dateRangeStart.setMonth(referenceDate.getMonth() - 12);
    }

    const cacheKey = startDate && endDate
      ? `adminOverview-data-${startDate}-${endDate}`
      : `adminOverview-data-${period}`;

    let cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Serving from cache for period: ${period}`);
      return res.status(200).json(JSON.parse(cachedData));
    }

    console.log(`⚠️ ${period} data not found in cache. Fetching from DB...`);

    // Define the query parameters
    const queryParams = {
      startDate: startDate || dateRangeStart.toISOString().split('T')[0],
      endDate: endDate || referenceDate.toISOString().split('T')[0],
    };

    console.log("Query Parameters:", queryParams); // Debugging

    const salesQuery = `
      SELECT FORMAT(dI_Date, 'yyyy-MM-dd') AS date, 'branch1' AS Branch, SUM(fi_Amount) AS total 
      FROM [Branch1_InvoicesDetailsandRI] WHERE di_Date BETWEEN @startDate AND @endDate GROUP BY FORMAT(dI_Date, 'yyyy-MM-dd')
      UNION ALL
      SELECT FORMAT(dI_Date, 'yyyy-MM-dd'), 'branch2' AS Branch, SUM(fi_Amount) AS total FROM [Branch2_InvoicesDetailsandRI] 
      WHERE di_Date BETWEEN @startDate AND @endDate GROUP BY FORMAT(dI_Date, 'yyyy-MM-dd')
      UNION ALL
      SELECT FORMAT(dI_Date, 'yyyy-MM-dd'), 'branch3' AS Branch, SUM(fi_Amount) as total FROM [Branch3_InvoicesDetailsandRI] 
      WHERE di_Date BETWEEN @startDate AND @endDate GROUP BY FORMAT(dI_Date, 'yyyy-MM-dd')
      ORDER BY date;
    `;

    const inventoryQuery = `
      SELECT 'branch1' AS Branch, sITM_Class, SUM(iTran_Qty) AS Total_Stock FROM Branch1_Transactions WHERE iTran_Qty > 0 GROUP BY sITM_Class
      UNION ALL
      SELECT 'branch2' AS Branch, sITM_Class, SUM(iTran_Qty)AS Total_Stock FROM Branch2_Transactions WHERE iTran_Qty > 0 GROUP BY sITM_Class
      UNION ALL
      SELECT 'branch3' AS Branch, sITM_Class, SUM(iTran_Qty) AS Total_Stock FROM Branch3_Transactions WHERE iTran_Qty > 0 GROUP BY sITM_Class
      ORDER BY Total_Stock;
    `;

    const purchaseQuery = `
      SELECT FORMAT(srDate, 'yyyy-MM-dd') AS date, 'branch1' AS Branch, SUM(srFRAmount) AS total FROM [Branch1_StockReceiptD] 
      WHERE srDate BETWEEN @startDate AND @endDate GROUP BY FORMAT(srDate, 'yyyy-MM-dd')
      UNION ALL
      SELECT FORMAT(srDate, 'yyyy-MM-dd') AS date, 'branch2' AS Branch, SUM(srFRAmount) AS total FROM [Branch2_StockReceiptD] 
      WHERE srDate BETWEEN @startDate AND @endDate GROUP BY FORMAT(srDate, 'yyyy-MM-dd')
      UNION ALL
      SELECT FORMAT(srDate, 'yyyy-MM-dd') AS date, 'branch3' AS Branch, SUM(srFRAmount) AS total FROM [Branch3_StockReceiptD] 
      WHERE srDate BETWEEN @startDate AND @endDate GROUP BY FORMAT(srDate, 'yyyy-MM-dd')
      ORDER BY date;
    `;

    const expenseQuery = `
      SELECT FORMAT(dTran_Date, 'yyyy-MM-dd') AS date, 'branch1' AS Branch, SUM(ftran_debit) AS total FROM [Branch1_Transactions] 
      WHERE fTran_Debit > 0 AND sITM_Class='EXPENSES' AND dTran_Date BETWEEN @startDate AND @endDate GROUP BY FORMAT(dTran_Date, 'yyyy-MM-dd')
      UNION ALL
      SELECT FORMAT(dTran_Date, 'yyyy-MM-dd') AS date, 'branch2' AS Branch, SUM(ftran_debit) AS total FROM [Branch2_Transactions] 
      WHERE fTran_Debit > 0 AND sITM_Class='EXPENSES' AND dTran_Date BETWEEN @startDate AND @endDate GROUP BY FORMAT(dTran_Date, 'yyyy-MM-dd')
      UNION ALL
      SELECT FORMAT(dTran_Date, 'yyyy-MM-dd') AS date, 'branch3' AS Branch, SUM(ftran_debit) AS total FROM [Branch3_Transactions] 
      WHERE fTran_Debit > 0 AND sITM_Class='EXPENSES' AND dTran_Date BETWEEN @startDate AND @endDate GROUP BY FORMAT(dTran_Date, 'yyyy-MM-dd')
      ORDER BY date;
    `;

    // Use a single request object for all queries
    const request = pool.request();
    request.input("startDate", sql.Date, queryParams.startDate);
    request.input("endDate", sql.Date, queryParams.endDate);

    const [salesResult, purchaseResult, expenseResult, inventoryResult] = await Promise.all([
      request.query(salesQuery),
      request.query(purchaseQuery),
      request.query(expenseQuery),
      pool.request().query(inventoryQuery), // No date filtering needed here
    ]);

    console.log("Sales Data:", salesResult.recordset.length);
    console.log("Purchase Data:", purchaseResult.recordset.length);
    console.log("Expense Data:", expenseResult.recordset.length);
    console.log("Inventory Data:", inventoryResult.recordset.length);

    const transformData = (result) =>
      result.recordset.map(({ Branch, date, total }) => ({
        Branch,
        date,
        total: Math.round(total),
      }));

    const inventoryData = inventoryResult.recordset.map(({ Branch, sITM_Class, Total_Stock }) => ({
      Branch,
      Category: sITM_Class, // Keep 'Category' for the frontend
      Total_Stock // Ensure this matches the frontend key
    }));


    const freshData = {
      salesData: transformData(salesResult),
      purchaseData: transformData(purchaseResult),
      expenseData: transformData(expenseResult),
      inventoryData
    };

    console.log(freshData);

    await redisClient.setEx(cacheKey, 3600, JSON.stringify(freshData)); // Cache for 1 hour
    return res.status(200).json(freshData);
  } catch (error) {
    console.error("❌ Error fetching data:", error);
    return res.status(500).json({ error: "Internal Server Error" });
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