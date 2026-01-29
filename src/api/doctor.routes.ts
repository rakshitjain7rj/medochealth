/**
 * Doctor Routes
 * API endpoints for doctor operations
 */

import { Router } from "express";
import {
  getAllDoctorsHandler,
  getDoctorSlotsHandler,
} from "../controllers/doctorController";

const router = Router();

// GET /doctors - List all doctors
router.get("/", getAllDoctorsHandler);

// GET /doctors/:doctorId/slots - Get all slots for a doctor
router.get("/:doctorId/slots", getDoctorSlotsHandler);

export default router;
