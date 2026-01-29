/**
 * Unit tests for slotCapacity.ts
 * Tests pure functions for evaluating slot capacity and token allocation eligibility
 */

import { Slot, SlotCapacity } from "../domain/Slot";
import { Token } from "../domain/Token";
import { TokenSource, TokenStatus, PriorityLevel } from "../domain/enums";
import {
  getTotalAllocated,
  getEmergencyCount,
  getPriorityCount,
  getGeneralCount,
  hasHardCapacity,
  canConsumeEmergencyBuffer,
  canConsumePriorityBuffer,
  canAllocateToken,
} from "../services/slotCapacity";

// Helper to create a test slot
function createTestSlot(
  tokens: Token[] = [],
  capacity: SlotCapacity = { max: 5, emergencyBuffer: 1, priorityBuffer: 1 }
): Slot {
  return {
    id: "test-slot",
    doctorId: "test-doctor",
    startTime: new Date(),
    endTime: new Date(),
    capacity,
    tokens,
    waitlist: [],
  };
}

// Helper to create a test token
function createTestToken(
  source: TokenSource,
  priority: PriorityLevel = PriorityLevel.MEDIUM,
  movable: boolean = true
): Token {
  return {
    id: `token-${Date.now()}-${Math.random()}`,
    patientId: "patient-1",
    doctorId: "test-doctor",
    slotId: "test-slot",
    source,
    priority,
    status: TokenStatus.CREATED,
    createdAt: new Date(),
    movable,
  };
}

describe("slotCapacity", () => {
  describe("getTotalAllocated", () => {
    it("returns 0 for empty slot", () => {
      const slot = createTestSlot([]);
      expect(getTotalAllocated(slot)).toBe(0);
    });

    it("returns correct count for slot with tokens", () => {
      const tokens = [
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.WALK_IN),
        createTestToken(TokenSource.EMERGENCY),
      ];
      const slot = createTestSlot(tokens);
      expect(getTotalAllocated(slot)).toBe(3);
    });
  });

  describe("getEmergencyCount", () => {
    it("returns 0 when no emergency tokens", () => {
      const tokens = [
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.WALK_IN),
      ];
      const slot = createTestSlot(tokens);
      expect(getEmergencyCount(slot)).toBe(0);
    });

    it("returns correct count of emergency tokens", () => {
      const tokens = [
        createTestToken(TokenSource.EMERGENCY),
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.EMERGENCY),
      ];
      const slot = createTestSlot(tokens);
      expect(getEmergencyCount(slot)).toBe(2);
    });
  });

  describe("getPriorityCount", () => {
    it("returns 0 when no priority or follow-up tokens", () => {
      const tokens = [
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.WALK_IN),
        createTestToken(TokenSource.EMERGENCY),
      ];
      const slot = createTestSlot(tokens);
      expect(getPriorityCount(slot)).toBe(0);
    });

    it("counts both PRIORITY and FOLLOW_UP tokens", () => {
      const tokens = [
        createTestToken(TokenSource.PRIORITY),
        createTestToken(TokenSource.FOLLOW_UP),
        createTestToken(TokenSource.ONLINE),
      ];
      const slot = createTestSlot(tokens);
      expect(getPriorityCount(slot)).toBe(2);
    });
  });

  describe("getGeneralCount", () => {
    it("returns 0 when no general tokens", () => {
      const tokens = [
        createTestToken(TokenSource.PRIORITY),
        createTestToken(TokenSource.EMERGENCY),
      ];
      const slot = createTestSlot(tokens);
      expect(getGeneralCount(slot)).toBe(0);
    });

    it("counts both ONLINE and WALK_IN tokens", () => {
      const tokens = [
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.WALK_IN),
        createTestToken(TokenSource.PRIORITY),
      ];
      const slot = createTestSlot(tokens);
      expect(getGeneralCount(slot)).toBe(2);
    });
  });

  describe("hasHardCapacity", () => {
    it("returns true when slot is empty", () => {
      const slot = createTestSlot([], { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });
      expect(hasHardCapacity(slot)).toBe(true);
    });

    it("returns true when slot has room", () => {
      const tokens = [
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.ONLINE),
      ];
      const slot = createTestSlot(tokens, { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });
      expect(hasHardCapacity(slot)).toBe(true);
    });

    it("returns false when slot is at max capacity", () => {
      const tokens = [
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.ONLINE),
      ];
      const slot = createTestSlot(tokens, { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });
      expect(hasHardCapacity(slot)).toBe(false);
    });
  });

  describe("canConsumeEmergencyBuffer", () => {
    it("returns true when emergency buffer is empty", () => {
      const slot = createTestSlot([], { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });
      expect(canConsumeEmergencyBuffer(slot)).toBe(true);
    });

    it("returns false when emergency buffer is full", () => {
      const tokens = [createTestToken(TokenSource.EMERGENCY)];
      const slot = createTestSlot(tokens, { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });
      expect(canConsumeEmergencyBuffer(slot)).toBe(false);
    });

    it("returns true when emergency buffer has room", () => {
      const tokens = [createTestToken(TokenSource.EMERGENCY)];
      const slot = createTestSlot(tokens, { max: 5, emergencyBuffer: 2, priorityBuffer: 1 });
      expect(canConsumeEmergencyBuffer(slot)).toBe(true);
    });
  });

  describe("canConsumePriorityBuffer", () => {
    it("returns true when priority buffer is empty", () => {
      const slot = createTestSlot([], { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });
      expect(canConsumePriorityBuffer(slot)).toBe(true);
    });

    it("returns false when priority buffer is full", () => {
      const tokens = [createTestToken(TokenSource.PRIORITY)];
      const slot = createTestSlot(tokens, { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });
      expect(canConsumePriorityBuffer(slot)).toBe(false);
    });

    it("counts FOLLOW_UP towards priority buffer", () => {
      const tokens = [createTestToken(TokenSource.FOLLOW_UP)];
      const slot = createTestSlot(tokens, { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });
      expect(canConsumePriorityBuffer(slot)).toBe(false);
    });
  });

  describe("canAllocateToken", () => {
    it("returns false when slot is at max capacity", () => {
      const tokens = [
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.ONLINE),
      ];
      const slot = createTestSlot(tokens, { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });
      const newToken = createTestToken(TokenSource.EMERGENCY, PriorityLevel.EMERGENCY);
      expect(canAllocateToken(slot, newToken)).toBe(false);
    });

    it("allows emergency token when emergency buffer available", () => {
      const slot = createTestSlot([], { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });
      const emergencyToken = createTestToken(TokenSource.EMERGENCY, PriorityLevel.EMERGENCY);
      expect(canAllocateToken(slot, emergencyToken)).toBe(true);
    });

    it("allows priority token when priority buffer available", () => {
      const slot = createTestSlot([], { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });
      const priorityToken = createTestToken(TokenSource.PRIORITY, PriorityLevel.VERY_HIGH);
      expect(canAllocateToken(slot, priorityToken)).toBe(true);
    });

    it("allows follow-up token when priority buffer available", () => {
      const slot = createTestSlot([], { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });
      const followUpToken = createTestToken(TokenSource.FOLLOW_UP, PriorityLevel.HIGH);
      expect(canAllocateToken(slot, followUpToken)).toBe(true);
    });

    it("allows general token when general capacity available", () => {
      const slot = createTestSlot([], { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });
      const onlineToken = createTestToken(TokenSource.ONLINE, PriorityLevel.MEDIUM);
      expect(canAllocateToken(slot, onlineToken)).toBe(true);
    });

    it("rejects general token when only reserved buffers remain", () => {
      // max=5, emergencyBuffer=1, priorityBuffer=1, so general capacity = 3
      const tokens = [
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.ONLINE),
      ];
      const slot = createTestSlot(tokens, { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });
      const walkInToken = createTestToken(TokenSource.WALK_IN, PriorityLevel.LOW);
      expect(canAllocateToken(slot, walkInToken)).toBe(false);
    });

    it("allows emergency token to overflow into general capacity when buffer full", () => {
      // Emergency buffer full (1 emergency), but general capacity available
      const tokens = [createTestToken(TokenSource.EMERGENCY)];
      const slot = createTestSlot(tokens, { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });
      const emergencyToken = createTestToken(TokenSource.EMERGENCY, PriorityLevel.EMERGENCY);
      expect(canAllocateToken(slot, emergencyToken)).toBe(true);
    });

    it("allows priority token to overflow into general capacity when buffer full", () => {
      // Priority buffer full (1 priority), but general capacity available
      const tokens = [createTestToken(TokenSource.PRIORITY)];
      const slot = createTestSlot(tokens, { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });
      const priorityToken = createTestToken(TokenSource.PRIORITY, PriorityLevel.VERY_HIGH);
      expect(canAllocateToken(slot, priorityToken)).toBe(true);
    });

    it("rejects emergency token when buffer full and general capacity full", () => {
      // max=5, emergency=1, priority=1, general=3
      // 1 emergency (buffer full) + 3 general (general full) = 4 tokens
      const tokens = [
        createTestToken(TokenSource.EMERGENCY),
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.ONLINE),
        createTestToken(TokenSource.ONLINE),
      ];
      const slot = createTestSlot(tokens, { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });
      const emergencyToken = createTestToken(TokenSource.EMERGENCY, PriorityLevel.EMERGENCY);
      expect(canAllocateToken(slot, emergencyToken)).toBe(false);
    });
  });
});
