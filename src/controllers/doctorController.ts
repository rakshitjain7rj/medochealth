/**
 * Doctor Controller
 * Handles HTTP requests for doctor operations
 */

import { Request, Response } from "express";
import { findDoctorById, store } from "../store/inMemoryStore";

/**
 * GET /doctors
 * Returns list of all doctors
 */
export function getAllDoctorsHandler(req: Request, res: Response): void {
  const doctors = store.doctors.map((d) => ({
    id: d.id,
    name: d.name,
    department: d.department,
    slotsCount: d.slots.length,
  }));

  res.status(200).json({ doctors });
}

/**
 * GET /doctors/:doctorId/slots
 * Returns all slots for a specific doctor
 */
export function getDoctorSlotsHandler(req: Request, res: Response): void {
  const { doctorId } = req.params;

  const doctor = findDoctorById(doctorId);
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }

  const slots = doctor.slots.map((slot) => ({
    id: slot.id,
    startTime: slot.startTime,
    endTime: slot.endTime,
    capacity: slot.capacity,
    tokensCount: slot.tokens.length,
    waitlistCount: slot.waitlist.length,
    tokens: slot.tokens.map((t) => ({
      id: t.id,
      patientId: t.patientId,
      source: t.source,
      priority: t.priority,
      status: t.status,
      movable: t.movable,
    })),
    waitlist: slot.waitlist.map((t) => ({
      id: t.id,
      patientId: t.patientId,
      source: t.source,
      priority: t.priority,
    })),
  }));

  res.status(200).json({
    doctor: {
      id: doctor.id,
      name: doctor.name,
      department: doctor.department,
    },
    slots,
  });
}
