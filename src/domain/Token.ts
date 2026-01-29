/**
 * Token domain model
 * Represents a single OPD token allocated to a patient
 */

import { TokenSource, TokenStatus, PriorityLevel } from "./enums";

export interface Token {
  /** Unique identifier for the token */
  id: string;

  /** Patient who owns this token */
  patientId: string;

  /** Doctor assigned to this token */
  doctorId: string;

  /** Time slot this token belongs to */
  slotId: string;

  /** Source from which this token was allocated */
  source: TokenSource;

  /** Priority level of this token */
  priority: PriorityLevel;

  /** Current status of the token */
  status: TokenStatus;

  /** When the token was created */
  createdAt: Date;

  /** When the patient checked in (optional) */
  checkedInAt?: Date;

  /** When the consultation was completed (optional) */
  completedAt?: Date;

  /** Whether this token can be displaced/rescheduled */
  movable: boolean;
}
