import express from 'express';
import { addDoctor, addHospital, allDoctors, allHospitals, loginAdmin } from '../controllers/admincontrollers.js';
import upload from '../middlewares/multer.js';
import authAdmin from '../middlewares/authAdmin.js';
import { changeAvailability } from '../controllers/doctorController.js';

const adminRouter = express.Router();

// Use multer for image upload while adding a doctor
adminRouter.post('/add-doctor', authAdmin, upload.single('image'), addDoctor);
adminRouter.post('/add-hospital', authAdmin, upload.single('image'), addHospital);
adminRouter.post('/login', loginAdmin);
adminRouter.post('/all-doctors', authAdmin ,allDoctors);
adminRouter.post('/all-hospitals', authAdmin ,allHospitals);
adminRouter.post('/change-availability', authAdmin ,changeAvailability);

export default adminRouter;
