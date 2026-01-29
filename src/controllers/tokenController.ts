/**
 * Token Controller
 * Thin handlers for token operations
 * Delegates ALL logic to service layer
 */

import { Request, Response } from "express";
import { Token } from "../domain/Token";
import { TokenSource, TokenStatus, PriorityLevel } from "../domain/enums";
import { allocateTokenToSlot } from "../services/allocationEngine";
import { applyAllocationResult, cancelToken, markNoShow } from "../services/slotMutator";
import { store } from "../store/inMemoryStore";

/**
 * POST /tokens
 * Creates a new token and attempts to allocate it to a slot
 */
export function createTokenHandler(req: Request, res: Response): void {
  const { doctorId, slotId, patientId, source, priority, movable } = req.body;

  // Defensively find doctor
  const doctor = store.doctors.find((d) => d.id === doctorId);
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }

  // Defensively find slot
  const slot = doctor.slots.find((s) => s.id === slotId);
  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }

  // Generate globally unique token ID
  const tokenId = `${doctorId}-${slotId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Create the token
  const token: Token = {
    id: tokenId,
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

  // Apply the decision via mutator (controlled mutation)
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
 * Cancels an existing token by searching all doctors and slots
 */
export function cancelTokenHandler(req: Request, res: Response): void {
  const { tokenId } = req.params;

  // Search ALL doctors and ALL slots for the token
  for (const doctor of store.doctors) {
    for (const slot of doctor.slots) {
      const inTokens = slot.tokens.some((t) => t.id === tokenId);
      const inWaitlist = slot.waitlist.some((t) => t.id === tokenId);

      if (inTokens || inWaitlist) {
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
        return;
      }
    }
  }

  // Token not found in any slot
  res.status(404).json({ error: "Token not found" });
}

/**
 * POST /tokens/:tokenId/no-show
 * Marks a token as no-show by searching all doctors and slots
 */
export function markNoShowHandler(req: Request, res: Response): void {
  const { tokenId } = req.params;

  // Search ALL doctors and ALL slots for the token
  for (const doctor of store.doctors) {
    for (const slot of doctor.slots) {
      const inTokens = slot.tokens.some((t) => t.id === tokenId);
      const inWaitlist = slot.waitlist.some((t) => t.id === tokenId);

      if (inTokens || inWaitlist) {
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
        return;
      }
    }
  }

  // Token not found in any slot
  res.status(404).json({ error: "Token not found" });
}
