/**
 * Token Controller
 * Handles HTTP requests for token operations
 * Delegates all business logic to service layer
 */

import { Request, Response } from "express";
import { Token } from "../domain/Token";
import { TokenSource, TokenStatus, PriorityLevel } from "../domain/enums";
import { allocateTokenToSlot } from "../services/allocationEngine";
import { applyAllocationResult, cancelToken, markNoShow } from "../services/slotMutator";
import { findSlot, findSlotByTokenId } from "../store/inMemoryStore";

/**
 * POST /tokens
 * Creates a new token and attempts to allocate it to a slot
 */
export function createTokenHandler(req: Request, res: Response): void {
  const { doctorId, slotId, patientId, source, priority, movable } = req.body;

  // Find the target slot
  const slot = findSlot(doctorId, slotId);
  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }

  // Create the token
  const token: Token = {
    id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    patientId: patientId || `patient-${Date.now()}`,
    doctorId,
    slotId,
    source: source as TokenSource,
    priority: priority as PriorityLevel,
    status: TokenStatus.CREATED,
    createdAt: new Date(),
    movable: movable ?? true,
  };

  // Delegate to allocation engine (decision only)
  const result = allocateTokenToSlot(slot, token);

  // Apply the decision (mutation)
  applyAllocationResult(slot, result);

  // Return result with updated slot state
  res.status(201).json({
    result,
    slot: {
      id: slot.id,
      tokensCount: slot.tokens.length,
      waitlistCount: slot.waitlist.length,
      capacity: slot.capacity,
    },
  });
}

/**
 * POST /tokens/:tokenId/cancel
 * Cancels an existing token
 */
export function cancelTokenHandler(req: Request, res: Response): void {
  const { tokenId } = req.params;

  // Find the slot containing this token
  const found = findSlotByTokenId(tokenId);
  if (!found) {
    res.status(404).json({ error: "Token not found" });
    return;
  }

  const { slot } = found;

  // Delegate to mutator
  cancelToken(slot, tokenId);

  res.status(200).json({
    message: "Token cancelled successfully",
    slot: {
      id: slot.id,
      tokensCount: slot.tokens.length,
      waitlistCount: slot.waitlist.length,
    },
  });
}

/**
 * POST /tokens/:tokenId/no-show
 * Marks a token as no-show
 */
export function markNoShowHandler(req: Request, res: Response): void {
  const { tokenId } = req.params;

  // Find the slot containing this token
  const found = findSlotByTokenId(tokenId);
  if (!found) {
    res.status(404).json({ error: "Token not found" });
    return;
  }

  const { slot } = found;

  // Delegate to mutator
  markNoShow(slot, tokenId);

  res.status(200).json({
    message: "Token marked as no-show",
    slot: {
      id: slot.id,
      tokensCount: slot.tokens.length,
      waitlistCount: slot.waitlist.length,
    },
  });
}
