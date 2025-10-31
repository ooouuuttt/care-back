import 'dotenv/config';
import validator from 'validator'
import bcrypt from 'bcryptjs'
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

//API to register user
const registerUser = async (req, res) => {
    try {

        const { name, email, password } = req.body

        if (!name || !password || !email) {
            return res.json({ success: false, message: "Missing Details" })
        }

        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Enter a valid email" })
        }

        if (password.length < 8) {
            return res.json({ success: false, message: "Enter a strong password" })
        }

        // Hashing user password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const userData = {
            name,
            email,
            password: hashedPassword
        }

        const [result] = await db.query(
            `INSERT INTO user (name, email, password) 
            VALUES (?, ?, ?)`,
            [name, email, hashedPassword]
        );

        const userId = result.insertId;

        const token = jwt.sign({ id: userId }, 'Murtaza')

        res.json({ success: true, token })



    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
}

//API for user login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Fetch the user's id, email, and password from the database
        const [results] = await db.query('SELECT id, email, password FROM user WHERE email = ?', [email]);

        // Check if the user exists
        if (results.length === 0) {
            return res.json({ success: false, message: 'User does not exist' });
        }

        const user = results[0]; // Get the first result (user)

        // Compare the provided password with the hashed password from the database
        const isMatch = await bcrypt.compare(password, user.password);

        // If the password matches, generate a JWT token
        if (isMatch) {
            const token = jwt.sign({ id: user.id }, 'Murtaza'); // Use user.id for the JWT token
            return res.json({ success: true, token });
        } else {
            return res.json({ success: false, message: 'Invalid Credentials' });
        }

    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: error.message });
    }
};

//API to get user profile data
const getProfile = async (req, res) => {
    try {
        const { userId } = req.body;

        // Fetch the user's data from the database, excluding the password
        const [results] = await db.query(
            'SELECT id, name, email, address, image, gender, dob, phone FROM user WHERE id = ?',
            [userId]
        );

        // Check if user exists
        if (results.length === 0) {
            return res.json({ success: false, message: 'User not found' });
        }

        const userData = results[0]; // Get the first result (user)

        res.json({ success: true, userData });
    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: error.message });
    }
};

//API to update user profile
const updateProfile = async (req, res) => {
    try {
        const { userId, name, phone, address, dob, gender } = req.body;
        const imageFile = req.file;

        // Validate required fields
        if (!name || !phone || !dob || !gender) {
            return res.json({ success: false, message: "Data Missing" });
        }

        // Ensure the address is a valid JSON object
        let addressObject;
        try {
            addressObject = JSON.parse(address); // Parse the address string to JSON
        } catch (error) {
            return res.json({ success: false, message: "Invalid address format" });
        }

        // Update user profile data in MySQL
        const updateProfileQuery = `
            UPDATE user 
            SET name = ?, phone = ?, address = ?, dob = ?, gender = ? 
            WHERE id = ?
        `;

        await db.query(updateProfileQuery, [name, phone, JSON.stringify(addressObject), dob, gender, userId]);

        if (imageFile) {
            const imageUpload = await uploadToCloudinary(imageFile.buffer); // Upload image from buffer
            const imageURL = imageUpload.secure_url; // Get secure URL from Cloudinary
            const updateImageQuery = `UPDATE user SET image = ? WHERE id = ?`;
            await db.query(updateImageQuery, [imageURL, userId]);
        }

        //if (imageFile) {
        // Upload image to Cloudinary
        //const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: 'image' });
        //const imageURL = imageUpload.secure_url;

        // Update image URL in MySQL
        //const updateImageQuery = `UPDATE user SET image = ? WHERE id = ?`;
        //await db.query(updateImageQuery, [imageURL, userId]);
        //}

        res.json({ success: true, message: "Profile Updated" });

    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: error.message });
    }
};

//API to book Appointment
const bookAppointment = async (req, res) => {
    try {
        const { userId, docId, slotDate, slotTime } = req.body;

        // Fetch doctor data
        const [docData] = await db.query(
            'SELECT id, name, email, speciality, degree, about, fees, address, created_at, experience, available, image, slots_booked, hospital FROM doctors WHERE id = ?',
            [docId]
        );

        // Check if doctor data exists and if the doctor is available
        if (!docData || docData.length === 0) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        // Check if the doctor is available
        if (!docData[0].available) {
            return res.status(404).json({ success: false, message: 'Doctor not available' });
        }

        // Parse slots_booked if it's a string, otherwise use it directly
        let slots_booked;
        if (typeof docData[0].slots_booked === 'string') {
            slots_booked = JSON.parse(docData[0].slots_booked || '{}');
        } else {
            slots_booked = docData[0].slots_booked || {};
        }

        // Checking for slot availability
        if (slots_booked[slotDate]) {
            if (slots_booked[slotDate].includes(slotTime)) {
                return res.json({ success: false, message: 'Slot not available' });
            } else {
                slots_booked[slotDate].push(slotTime);
            }
        } else {
            slots_booked[slotDate] = [slotTime];
        }

        // Fetch user data to ensure the user exists
        const [userData] = await db.query(
            'SELECT id FROM user WHERE id = ?',
            [userId]
        );

        // Check if user data exists
        if (!userData || userData.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get current date when the appointment is created
        const currentDate = new Date().toISOString().slice(0, 10); // Format 'YYYY-MM-DD'

        // Save new appointment directly into MySQL
        const insertAppointmentQuery = `
            INSERT INTO appointment (userId, docId, amount, slotTime, slotDate, payment, cancelled, isCompleted, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await db.query(insertAppointmentQuery, [
            userId,
            docId,
            docData[0].fees,    // Use doctor’s fees as the amount
            slotTime,
            slotDate,
            0,                  // Default payment status (0 for unpaid)
            0,                  // Default cancelled status (0 for not cancelled)
            0,                  // Default isCompleted status (0 for not completed)
            currentDate          // Store the current date
        ]);

        // Update slots_booked in the doctor's data
        const updateSlotQuery = `
            UPDATE doctors 
            SET slots_booked = ?
            WHERE id = ?
        `;
        await db.query(updateSlotQuery, [JSON.stringify(slots_booked), docId]);

        // Respond with success
        res.json({ success: true, message: 'Appointment Booked' });

    } catch (error) {
        // Log the full error for debugging
        console.error('Error in bookAppointment:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

// API to get user appointments with doctor and user data
const listAppointment = async (req, res) => {
    try {
        const { userId } = req.body;

        // Fetch appointments along with doctor details without aliases
        const [appointments] = await db.query(
            `SELECT appointment.*, doctors.name, doctors.speciality, doctors.fees, doctors.image, doctors.address
             FROM appointment 
             JOIN doctors ON appointment.docId = doctors.id 
             WHERE appointment.userId = ?
             ORDER BY appointment.created__at DESC`,
            [userId]
        );

        res.json({ success: true, appointments });

    } catch (error) {
        console.error('Error in listAppointment:', error);
        return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};


//API to cancel appointment
const cancelAppointment = async (req, res) => {
    try {
        const { userId, id } = req.body;

        if (!userId || !id) {
            return res.json({ success: false, message: 'User ID and Appointment ID are required.' });
        }

        const [appointmentData] = await db.query('SELECT * FROM appointment WHERE id = ?', [id]);

        if (!appointmentData || appointmentData.length === 0) {
            return res.json({ success: false, message: 'Appointment not found.' });
        }

        console.log('Appointment Data:', appointmentData);

        const { docId, slotDate, slotTime } = appointmentData[0];

        if (!slotDate || !slotTime) {
            return res.json({ success: false, message: 'Slot date or time is undefined.' });
        }

        await db.query('UPDATE appointment SET cancelled = true WHERE id = ?', [id]);

        const [doctorData] = await db.query('SELECT * FROM doctors WHERE id = ?', [docId]);

        if (!doctorData || doctorData.length === 0) {
            return res.json({ success: false, message: 'Doctor not found.' });
        }

        let slots_booked = doctorData[0].slots_booked;

        console.log('Fetched slots_booked:', slots_booked);

        // `slots_booked` is already an object, no need to parse it
        // Remove the specified slot from the object
        console.log('Before slot release:', slots_booked);

        if (slots_booked[slotDate]) {
            const initialLength = slots_booked[slotDate].length;

            slots_booked[slotDate] = slots_booked[slotDate].filter(time => time !== slotTime);

            const finalLength = slots_booked[slotDate].length;
            if (initialLength > finalLength) {
                console.log(`Slot ${slotTime} removed for date ${slotDate}`);
            } else {
                console.log(`Slot ${slotTime} was not found for date ${slotDate}`);
            }

            if (slots_booked[slotDate].length === 0) {
                delete slots_booked[slotDate];
            }
        } else {
            console.log(`No slots found for date ${slotDate}`);
        }

        console.log('After slot release:', slots_booked);

        try {
            const result = await db.query(
                'UPDATE doctors SET slots_booked = ? WHERE id = ?',
                [JSON.stringify(slots_booked), docId]
            );

            console.log('Update result:', result);

            if (result.affectedRows === 0) {
                return res.json({ success: false, message: 'Failed to update slots_booked.' });
            }
        } catch (error) {
            console.error('Error updating slots_booked:', error);
            return res.json({ success: false, message: error.message });
        }

        res.json({ success: true, message: 'Appointment Cancelled' });

    } catch (error) {
        console.error('Error cancelling appointment:', error);
        res.json({ success: false, message: error.message });
    }
};

{/** Not Working **/}

//API to fetch doctor by their speciality
const doctorSpeciality = async (req, res) => {
    try {
        const { speciality } = req.body

        const [specialityData] = await db.query(
            'SELECT * FROM doctors WHERE speciality = ?',
            [speciality]
        )

        console.log(specialityData)
        res.json({success:true})
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
}

const searchDoctors = async (req, res) => {
    try {
        const { hospital } = req.body;

        // Check if the hospital name is provided
        if (!hospital) {
            return res.status(400).json({ success: false, message: "Hospital name is required." });
        }

        // Query to search for doctors by hospital name
        const [doctors] = await db.query(`
            SELECT id, name, speciality, degree, about, fees, address,
                   created_at, experience, available, image, slots_booked 
            FROM doctors
            WHERE hospital LIKE ?
        `, [`%${hospital}%`]); // Using wildcards for partial matching

        // Return the list of doctors
        res.json({ success: true, doctors });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};




export { registerUser, loginUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, doctorSpeciality, searchDoctors }