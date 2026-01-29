/**
 * Doctor domain model
 * Represents a doctor with their associated OPD slots
 */

import { Slot } from "./Slot";

export interface Doctor {
  /** Unique identifier for the doctor */
  id: string;

  /** Doctor's full name */
  name: string;

  /** Medical department the doctor belongs to */
  department: string;

  /** OPD slots assigned to this doctor */
  slots: Slot[];
}
