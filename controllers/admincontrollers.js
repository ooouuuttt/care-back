import 'dotenv/config';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import jwt from 'jsonwebtoken';

// MySQL connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST || 'careconnect-db.chskwweauaoi.ap-south-1.rds.amazonaws.com',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'Careconnect',
  database: process.env.DB_NAME || 'careconnect'
});

// Function to upload image to Cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream((error, result) => {
      if (result) {
        resolve(result);
      } else {
        reject(error);
      }
    });
    streamifier.createReadStream(buffer).pipe(stream);  // Convert buffer to stream
  });
};

// Add doctor function
const addDoctor = async (req, res) => {
  try {
    const { name, email, password, speciality, degree, experience, about, fees, address, hospital } = req.body;
    const imageFile = req.file;

    // Check required fields
    if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address) {
      return res.json({ success: false, message: 'Missing details' });
    }

    // Validate email
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: 'Invalid email format' });
    }

    // Check if email already exists
    const [existingDoctor] = await db.query('SELECT * FROM doctors WHERE email = ?', [email]);
    if (existingDoctor.length > 0) {
      return res.json({ success: false, message: 'Email already exists' });
    }

    // Validate password (minimum 8 characters, at least one letter and one number)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.json({
        success: false,
        message: 'Password must be at least 8 characters long and contain both letters and numbers.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Upload image to Cloudinary
    let imageUrl = null;
    if (imageFile) {
      const result = await uploadToCloudinary(imageFile.buffer); // Upload image from buffer
      imageUrl = result.secure_url; // Get secure URL from Cloudinary
    }

    // Insert doctor into the database
    const [result] = await db.query(
      `INSERT INTO doctors (name, email, password, speciality, degree, experience, about, fees, address, image, hospital) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, speciality, degree, experience, about, fees, JSON.stringify(address), imageUrl, hospital]
    );

    res.json({ success: true, message: 'Doctor added successfully', doctorId: result.insertId });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const addHospital = async (req, res) => {
  try {
    const { name, email, speciality, phone, about, address } = req.body;
    const imageFile = req.file;

    // Check required fields
    if (!name || !email || !speciality || !phone || !about || !address) {
      return res.json({ success: false, message: 'Missing details' });
    }

    // Validate email
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: 'Invalid email format' });
    }

    // Check if email already exists
    const [existingHospital] = await db.query('SELECT * FROM doctors WHERE email = ?', [email]);
    if (existingHospital.length > 0) {
      return res.json({ success: false, message: 'Email already exists' });
    }

    // Upload image to Cloudinary
    let imageUrl = null;
    if (imageFile) {
      const result = await uploadToCloudinary(imageFile.buffer); // Upload image from buffer
      imageUrl = result.secure_url; // Get secure URL from Cloudinary
    }

    // Insert doctor into the database
    const [result] = await db.query(
      `INSERT INTO hospitals (name, email, image, address, speciality, about, phone) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, imageUrl, JSON.stringify(address), speciality, about, phone]
    );

    res.json({ success: true, message: 'Hospital added successfully', hospitalId: result.insertId });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API for admin login
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check admin credentials
    if (email === 'admin@careconnect.com' && password === 'qwerty123') { // Replace with your admin email and password
      const token = jwt.sign({ email }, 'murtaza', { expiresIn: '1h' }); // Replace with your JWT secret
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: 'Invalid Credentials' });
    }
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

//API to get all doctors list for admin panel
const allDoctors = async (req, res) => {
  try {
    // Fetch all doctors from the MySQL database
    const [doctors] = await db.query('SELECT id, name, email, speciality, degree, about, fees, address, created_at, experience, available, image, hospital FROM doctors'); // Exclude password field
    res.json({ success: true, doctors });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

const allHospitals = async (req, res) => {
  try {
    // Fetch all doctors from the MySQL database
    const [hospitals] = await db.query('SELECT id, name, email, image, address, speciality, about, phone FROM hospitals'); // Exclude password field
    res.json({ success: true, hospitals });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

export { addDoctor, addHospital, loginAdmin, allDoctors, allHospitals};
