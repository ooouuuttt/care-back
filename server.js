import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import adminRouter from './routes/adminRoute.js';
import connectCloudinary from './config/cloudinary.js';
import morgan from 'morgan';
import doctorRouter from './routes/doctorRoute.js';
import userRouter from './routes/userRoute.js';

// Initialize Cloudinary
connectCloudinary();

// App configuration
const app = express();
const port = process.env.PORT || 8080; // ✅ Use EB's provided port

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'careconnect-db.chskwweauaoi.ap-south-1.rds.amazonaws.com',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'Careconnect',
  database: process.env.DB_NAME || 'careconnect'
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to the database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL database');
});

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// API routes
app.use('/api/admin', adminRouter);
app.use('/api/doctor', doctorRouter);
app.use('/api/user', userRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.send('✅ API is running successfully on Elastic Beanstalk!');
});

// Error handling for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${port}`);
});
