/**
 * Allocation Engine
 * Core decision-making logic for OPD token allocation
 * This module only DECIDES, it does not APPLY changes
 * No mutations, no side effects, fully deterministic
 */

import { Slot } from "../domain/Slot";
import { Token } from "../domain/Token";
import { PriorityLevel, TokenSource } from "../domain/enums";
import { canAllocateToken } from "./slotCapacity";

/**
 * Possible outcomes of an allocation attempt
 */
export type AllocationStatus = "ALLOCATED" | "WAITLISTED" | "REJECTED" | "DISPLACED";

/**
 * Result of an allocation decision
 */
export interface AllocationResult {
  /** The decision status */
  status: AllocationStatus;
  /** The token that was allocated (for ALLOCATED status) */
  allocatedToken?: Token;
  /** The token that would be displaced (for DISPLACED status) */
  displacedToken?: Token;
  /** Human-readable explanation of the decision */
  reason?: string;
}

/**
 * Finds the token with the lowest priority that can be displaced
 * - Token must have movable === true
 * - Emergency source tokens are excluded (cannot be displaced)
 * - Returns null if no eligible token exists
 */
export function findLowestPriorityMovableToken(slot: Slot): Token | null {
  // Filter to movable tokens that are not emergency source
  const eligibleTokens = slot.tokens.filter(
    (token) => token.movable === true && token.source !== TokenSource.EMERGENCY
  );

  // No eligible tokens found
  if (eligibleTokens.length === 0) {
    return null;
  }

  // Find the token with the lowest priority value
  let lowestToken = eligibleTokens[0];
  for (const token of eligibleTokens) {
    if (token.priority < lowestToken.priority) {
      lowestToken = token;
    }
  }

  return lowestToken;
}

/**
 * Attempts to allocate a token to a slot and returns the decision
 * This function does NOT mutate the slot - it only returns what action should be taken
 *
 * Decision logic:
 * 1. If slot has capacity for the token → ALLOCATED
 * 2. If a lower-priority movable token exists → DISPLACED
 * 3. If token has medium+ priority → WAITLISTED
 * 4. Otherwise → REJECTED
 */
export function allocateTokenToSlot(slot: Slot, token: Token): AllocationResult {
  // Step 1: Check if slot can directly accommodate the token
  if (canAllocateToken(slot, token)) {
    return {
      status: "ALLOCATED",
      allocatedToken: token,
      reason: "Slot has available capacity for this token",
    };
  }

  // Step 2: Slot is full - attempt displacement of a lower-priority token
  const lowestPriorityToken = findLowestPriorityMovableToken(slot);

  if (lowestPriorityToken !== null && token.priority > lowestPriorityToken.priority) {
    // Incoming token has higher priority - displacement is possible
    return {
      status: "DISPLACED",
      allocatedToken: token,
      displacedToken: lowestPriorityToken,
      reason: `Token can displace lower-priority token (${lowestPriorityToken.priority} < ${token.priority})`,
    };
  }

  // Step 3: Cannot allocate or displace - decide between waitlist or rejection
  if (token.priority >= PriorityLevel.MEDIUM) {
    // Medium priority or higher gets waitlisted
    return {
      status: "WAITLISTED",
      allocatedToken: token,
      reason: "Slot full, token added to waitlist due to sufficient priority",
    };
  }

  // Step 4: Low priority token with no capacity - reject
  return {
    status: "REJECTED",
    reason: "Slot full and token priority too low for waitlist",
  };
}
