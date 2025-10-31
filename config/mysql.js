// Import the MySQL package
import 'dotenv/config';
const mysql = require('mysql2');

// Create a connection object with MySQL database details
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'careconnect-db.chskwweauaoi.ap-south-1.rds.amazonaws.com',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'Careconnect',
  database: process.env.DB_NAME || 'careconnect'
});

// Connect to MySQL database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL: ', err.stack);
    return;
  }
  console.log('Connected to RDS MySQL as ID ' + connection.threadId);
});

// Close the connection
connection.end();

export default connectdb
