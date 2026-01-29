/**
 * Slot domain model
 * Represents a doctor's OPD time slot with capacity management
 */

import { Token } from "./Token";

/**
 * Defines capacity limits and buffer reserves for a slot
 */
export interface SlotCapacity {
  /** Total hard limit of tokens for this slot */
  max: number;

  /** Reserved capacity for emergency tokens */
  emergencyBuffer: number;

  /** Reserved capacity for paid priority tokens */
  priorityBuffer: number;
}

/**
 * A time-bound OPD slot for a doctor
 */
export interface Slot {
  /** Unique identifier for the slot */
  id: string;

  /** Doctor conducting this slot */
  doctorId: string;

  /** Slot start time */
  startTime: Date;

  /** Slot end time */
  endTime: Date;

  /** Capacity configuration for this slot */
  capacity: SlotCapacity;

  /** Tokens allocated to this slot */
  tokens: Token[];

  /** Overflow tokens in waitlist */
  waitlist: Token[];
}
