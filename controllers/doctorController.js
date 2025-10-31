import 'dotenv/config';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import jwt from 'jsonwebtoken';

const db = mysql.createPool({
    host: process.env.DB_HOST || 'careconnect-db.chskwweauaoi.ap-south-1.rds.amazonaws.com',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'Careconnect',
    database: process.env.DB_NAME || 'careconnect'
});

const changeAvailability = async (req, res) => {
    try {
        const { docId } = req.body;

        // Fetch doctor data using the given docId
        const [rows] = await db.query('SELECT available FROM doctors WHERE id = ?', [docId]);
        
        if (rows.length === 0) {
            return res.json({ success: false, message: 'Doctor not found' });
        }

        const currentAvailability = rows[0].available;

        // Toggle availability
        const newAvailability = !currentAvailability;

        // Update the doctor's availability in the database
        await db.query('UPDATE doctors SET available = ? WHERE id = ?', [newAvailability, docId]);

        res.json({ success: true, message: 'Availability Changed' });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

const doctorList = async (req,res) => {
    try {
        const [doctors] = await db.query('SELECT id, name, speciality, degree, about, fees, address, created_at, experience, available, image, slots_booked, hospital FROM doctors');
        res.json({success:true, doctors})
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

const hospitalList = async (req,res) => {
    try {
        const [hospitals] = await db.query('SELECT id, name, address, speciality, phone, about, image FROM hospitals');
        res.json({success:true, hospitals})
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

const hosp_doc = async (req, res) => {
    try {
        const { name } = req.body;

        // Fetch doctors based on the hospital name
        const [hospitals] = await db.query(
            `SELECT doctors.*
             FROM doctors
             JOIN hospitals ON doctors.hospital = hospitals.name
             WHERE hospitals.name = ?;`,
            [name]
        );

        res.json({ success: true, hospitals });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

export { changeAvailability, doctorList, hospitalList, hosp_doc };
