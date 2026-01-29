/**
 * In-Memory Store
 * Holds doctors with their slots - initialized with sample data
 * No helper functions, no logic, no mutation helpers
 */

import { Doctor } from "../domain/Doctor";
import { Slot, SlotCapacity } from "../domain/Slot";

// Initialize dates for slots
const today = new Date();
today.setHours(0, 0, 0, 0);

function makeSlot(id: string, doctorId: string, startHour: number, endHour: number, capacity: SlotCapacity): Slot {
  const startTime = new Date(today);
  startTime.setHours(startHour, 0, 0, 0);
  const endTime = new Date(today);
  endTime.setHours(endHour, 0, 0, 0);
  return { id, doctorId, startTime, endTime, capacity, tokens: [], waitlist: [] };
}

const defaultCapacity: SlotCapacity = { max: 5, emergencyBuffer: 1, priorityBuffer: 1 };

/**
 * In-memory store - single export
 */
export const store = {
  doctors: [
    {
      id: "doc-A",
      name: "Dr. Sharma",
      department: "General Medicine",
      slots: [
        makeSlot("doc-A-slot-1", "doc-A", 9, 10, { ...defaultCapacity }),
        makeSlot("doc-A-slot-2", "doc-A", 10, 11, { ...defaultCapacity }),
        makeSlot("doc-A-slot-3", "doc-A", 11, 12, { ...defaultCapacity }),
      ],
    },
    {
      id: "doc-B",
      name: "Dr. Patel",
      department: "Pediatrics",
      slots: [
        makeSlot("doc-B-slot-1", "doc-B", 9, 10, { ...defaultCapacity }),
        makeSlot("doc-B-slot-2", "doc-B", 10, 11, { ...defaultCapacity }),
        makeSlot("doc-B-slot-3", "doc-B", 11, 12, { ...defaultCapacity }),
      ],
    },
    {
      id: "doc-C",
      name: "Dr. Reddy",
      department: "Orthopedics",
      slots: [
        makeSlot("doc-C-slot-1", "doc-C", 9, 10, { ...defaultCapacity }),
        makeSlot("doc-C-slot-2", "doc-C", 10, 11, { ...defaultCapacity }),
        makeSlot("doc-C-slot-3", "doc-C", 11, 12, { ...defaultCapacity }),
      ],
    },
  ] as Doctor[],
};
