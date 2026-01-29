/**
 * Doctor Routes
 * GET /doctors/:doctorId/slots
 */

import { Router, Request, Response } from "express";
import { store } from "../store/inMemoryStore";

const router = Router();

router.get("/:doctorId/slots", (req: Request, res: Response): void => {
  const { doctorId } = req.params;

  // Defensively find doctor
  const doctor = store.doctors.find((d) => d.id === doctorId);
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }

  // Return slots with tokens and waitlist
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
});

export default router;
