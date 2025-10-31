import express from 'express'
import { doctorList, hosp_doc, hospitalList } from '../controllers/doctorController.js'

const doctorRouter = express.Router()

doctorRouter.get('/list',doctorList)
doctorRouter.get('/hosplist', hospitalList)
doctorRouter.get('/hosp_doctors', hosp_doc)

export default doctorRouter