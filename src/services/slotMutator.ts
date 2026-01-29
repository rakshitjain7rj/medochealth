/**
 * Slot Mutator
 * Applies allocation decisions to slot state through controlled mutations
 * This is the ONLY layer that mutates slot.tokens and slot.waitlist
 */

import { Slot } from "../domain/Slot";
import { Token } from "../domain/Token";
import { AllocationResult } from "./allocationEngine";

/**
 * Finds and removes a token from an array by its ID
 * Returns the removed token or undefined if not found
 */
function removeTokenById(tokens: Token[], tokenId: string): Token | undefined {
  const index = tokens.findIndex((t) => t.id === tokenId);
  if (index === -1) {
    return undefined;
  }
  return tokens.splice(index, 1)[0];
}

/**
 * Finds the highest priority token in the waitlist
 * Returns the index or -1 if waitlist is empty
 */
function findHighestPriorityIndex(waitlist: Token[]): number {
  if (waitlist.length === 0) {
    return -1;
  }

  let highestIndex = 0;
  for (let i = 1; i < waitlist.length; i++) {
    if (waitlist[i].priority > waitlist[highestIndex].priority) {
      highestIndex = i;
    }
  }
  return highestIndex;
}

/**
 * Promotes the highest-priority token from waitlist to tokens
 */
function promoteFromWaitlist(slot: Slot): void {
  const highestIndex = findHighestPriorityIndex(slot.waitlist);
  if (highestIndex === -1) {
    return;
  }

  // Remove from waitlist and add to tokens
  const promoted = slot.waitlist.splice(highestIndex, 1)[0];
  slot.tokens.push(promoted);
}

/**
 * Applies an AllocationResult decision to the slot
 * Mutates slot.tokens and slot.waitlist based on the decision status
 */
export function applyAllocationResult(slot: Slot, result: AllocationResult): void {
  switch (result.status) {
    case "ALLOCATED":
      // Direct allocation - add token to slot
      if (result.allocatedToken) {
        slot.tokens.push(result.allocatedToken);
      }
      break;

    case "DISPLACED":
      // Remove displaced token, add incoming token, waitlist displaced
      if (result.displacedToken && result.allocatedToken) {
        removeTokenById(slot.tokens, result.displacedToken.id);
        slot.tokens.push(result.allocatedToken);
        slot.waitlist.push(result.displacedToken);
      }
      break;

    case "WAITLISTED":
      // Add token to waitlist
      if (result.allocatedToken) {
        slot.waitlist.push(result.allocatedToken);
      }
      break;

    case "REJECTED":
      // No action needed
      break;
  }
}

/**
 * Cancels a token and promotes the highest-priority waitlisted token
 * Used when a patient cancels their appointment
 */
export function cancelToken(slot: Slot, tokenId: string): void {
  // Remove token from slot.tokens if present
  const removed = removeTokenById(slot.tokens, tokenId);

  // If token was in slot, promote from waitlist
  if (removed) {
    promoteFromWaitlist(slot);
  }
}

/**
 * Marks a token as no-show and promotes from waitlist
 * Behaves identically to cancelToken for slot mutation purposes
 */
export function markNoShow(slot: Slot, tokenId: string): void {
  // Same behavior as cancel - remove and promote
  cancelToken(slot, tokenId);
}
