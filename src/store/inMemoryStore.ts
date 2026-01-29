/**
 * In-Memory Store
 * Temporary persistence layer for development and testing
 * Holds doctors with their slots - initialized with sample data
 */

import { Doctor } from "../domain/Doctor";
import { Slot, SlotCapacity } from "../domain/Slot";

/**
 * Creates a slot with specified time range and capacity
 */
function createSlot(
  id: string,
  doctorId: string,
  startHour: number,
  endHour: number,
  capacity: SlotCapacity
): Slot {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startTime = new Date(today);
  startTime.setHours(startHour, 0, 0, 0);

  const endTime = new Date(today);
  endTime.setHours(endHour, 0, 0, 0);

  return {
    id,
    doctorId,
    startTime,
    endTime,
    capacity,
    tokens: [],
    waitlist: [],
  };
}

/**
 * Creates a doctor with 3 OPD slots
 */
function createDoctor(id: string, name: string, department: string): Doctor {
  const capacity: SlotCapacity = {
    max: 5,
    emergencyBuffer: 1,
    priorityBuffer: 1,
  };

  const slots: Slot[] = [
    createSlot(`${id}-slot-1`, id, 9, 10, { ...capacity }),
    createSlot(`${id}-slot-2`, id, 10, 11, { ...capacity }),
    createSlot(`${id}-slot-3`, id, 11, 12, { ...capacity }),
  ];

  return {
    id,
    name,
    department,
    slots,
  };
}

/**
 * In-memory store initialized with sample doctors
 */
export const store = {
  doctors: [
    createDoctor("doc-A", "Dr. Sharma", "General Medicine"),
    createDoctor("doc-B", "Dr. Patel", "Pediatrics"),
    createDoctor("doc-C", "Dr. Reddy", "Orthopedics"),
  ] as Doctor[],
};

/**
 * Helper to find a doctor by ID
 */
export function findDoctorById(doctorId: string): Doctor | undefined {
  return store.doctors.find((d) => d.id === doctorId);
}

/**
 * Helper to find a slot by doctorId and slotId
 */
export function findSlot(doctorId: string, slotId: string): Slot | undefined {
  const doctor = findDoctorById(doctorId);
  if (!doctor) return undefined;
  return doctor.slots.find((s) => s.id === slotId);
}

/**
 * Helper to find a slot containing a specific token
 */
export function findSlotByTokenId(tokenId: string): { slot: Slot; doctor: Doctor } | undefined {
  for (const doctor of store.doctors) {
    for (const slot of doctor.slots) {
      const inTokens = slot.tokens.some((t) => t.id === tokenId);
      const inWaitlist = slot.waitlist.some((t) => t.id === tokenId);
      if (inTokens || inWaitlist) {
        return { slot, doctor };
      }
    }
  }
  return undefined;
}
