/**
 * Slot Capacity Service
 * Pure functions for evaluating slot capacity and token allocation eligibility
 * No side effects, no mutations, fully deterministic
 */

import { Slot } from "../domain/Slot";
import { Token } from "../domain/Token";
import { TokenSource, PriorityLevel } from "../domain/enums";

/**
 * Returns total number of tokens currently allocated in the slot
 */
export function getTotalAllocated(slot: Slot): number {
  return slot.tokens.length;
}

/**
 * Returns count of EMERGENCY source tokens in the slot
 */
export function getEmergencyCount(slot: Slot): number {
  return slot.tokens.filter((token) => token.source === TokenSource.EMERGENCY).length;
}

/**
 * Returns count of PRIORITY and FOLLOW_UP source tokens in the slot
 */
export function getPriorityCount(slot: Slot): number {
  return slot.tokens.filter(
    (token) => token.source === TokenSource.PRIORITY || token.source === TokenSource.FOLLOW_UP
  ).length;
}

/**
 * Returns count of ONLINE and WALK_IN source tokens in the slot
 */
export function getGeneralCount(slot: Slot): number {
  return slot.tokens.filter(
    (token) => token.source === TokenSource.ONLINE || token.source === TokenSource.WALK_IN
  ).length;
}

/**
 * Returns true if total allocated tokens is less than the hard max capacity
 */
export function hasHardCapacity(slot: Slot): boolean {
  return getTotalAllocated(slot) < slot.capacity.max;
}

/**
 * Returns true if emergency tokens count is less than the emergency buffer
 */
export function canConsumeEmergencyBuffer(slot: Slot): boolean {
  return getEmergencyCount(slot) < slot.capacity.emergencyBuffer;
}

/**
 * Returns true if priority+followup tokens count is less than the priority buffer
 */
export function canConsumePriorityBuffer(slot: Slot): boolean {
  return getPriorityCount(slot) < slot.capacity.priorityBuffer;
}

/**
 * Determines if a token can be allocated into the slot
 * Rules:
 * - No allocation if hard max capacity is reached
 * - EMERGENCY tokens can use emergency buffer
 * - PRIORITY and FOLLOW_UP tokens can use priority buffer
 * - ONLINE and WALK_IN tokens can only use general capacity
 */
export function canAllocateToken(slot: Slot, token: Token): boolean {
  // No token can exceed hard max capacity
  if (!hasHardCapacity(slot)) {
    return false;
  }

  const totalAllocated = getTotalAllocated(slot);
  const emergencyCount = getEmergencyCount(slot);
  const priorityCount = getPriorityCount(slot);

  // Calculate available general capacity (excludes reserved buffers)
  const reservedCapacity = slot.capacity.emergencyBuffer + slot.capacity.priorityBuffer;
  const generalCapacity = slot.capacity.max - reservedCapacity;
  const generalCount = getGeneralCount(slot);

  switch (token.source) {
    case TokenSource.EMERGENCY:
      // Emergency tokens can use emergency buffer or overflow into general if buffer is full
      return canConsumeEmergencyBuffer(slot) || generalCount < generalCapacity;

    case TokenSource.PRIORITY:
    case TokenSource.FOLLOW_UP:
      // Priority/Follow-up tokens can use priority buffer or overflow into general if buffer is full
      return canConsumePriorityBuffer(slot) || generalCount < generalCapacity;

    case TokenSource.ONLINE:
    case TokenSource.WALK_IN:
      // General tokens can only use general capacity (not reserved buffers)
      return generalCount < generalCapacity;

    default:
      return false;
  }
}
