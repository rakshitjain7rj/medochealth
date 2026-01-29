/**
 * Unit tests for allocationEngine.ts
 * Tests the core decision-making logic for OPD token allocation
 */

import { Slot, SlotCapacity } from "../domain/Slot";
import { Token } from "../domain/Token";
import { TokenSource, TokenStatus, PriorityLevel } from "../domain/enums";
import {
  allocateTokenToSlot,
  findLowestPriorityMovableToken,
  AllocationResult,
} from "../services/allocationEngine";

// Helper to create a test slot
function createTestSlot(
  tokens: Token[] = [],
  waitlist: Token[] = [],
  capacity: SlotCapacity = { max: 5, emergencyBuffer: 1, priorityBuffer: 1 }
): Slot {
  return {
    id: "test-slot",
    doctorId: "test-doctor",
    startTime: new Date(),
    endTime: new Date(),
    capacity,
    tokens,
    waitlist,
  };
}

// Helper to create a test token
function createTestToken(
  id: string,
  source: TokenSource,
  priority: PriorityLevel,
  movable: boolean = true
): Token {
  return {
    id,
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

describe("allocationEngine", () => {
  describe("findLowestPriorityMovableToken", () => {
    it("returns null for empty slot", () => {
      const slot = createTestSlot([]);
      expect(findLowestPriorityMovableToken(slot)).toBeNull();
    });

    it("returns null when all tokens are non-movable", () => {
      const tokens = [
        createTestToken("t1", TokenSource.ONLINE, PriorityLevel.MEDIUM, false),
        createTestToken("t2", TokenSource.WALK_IN, PriorityLevel.LOW, false),
      ];
      const slot = createTestSlot(tokens);
      expect(findLowestPriorityMovableToken(slot)).toBeNull();
    });

    it("returns null when all tokens are emergency", () => {
      const tokens = [
        createTestToken("t1", TokenSource.EMERGENCY, PriorityLevel.EMERGENCY, true),
        createTestToken("t2", TokenSource.EMERGENCY, PriorityLevel.EMERGENCY, true),
      ];
      const slot = createTestSlot(tokens);
      expect(findLowestPriorityMovableToken(slot)).toBeNull();
    });

    it("returns the lowest priority movable token", () => {
      const tokens = [
        createTestToken("t1", TokenSource.ONLINE, PriorityLevel.HIGH, true),
        createTestToken("t2", TokenSource.WALK_IN, PriorityLevel.LOW, true),
        createTestToken("t3", TokenSource.PRIORITY, PriorityLevel.VERY_HIGH, true),
      ];
      const slot = createTestSlot(tokens);
      const result = findLowestPriorityMovableToken(slot);
      expect(result).not.toBeNull();
      expect(result!.id).toBe("t2");
      expect(result!.priority).toBe(PriorityLevel.LOW);
    });

    it("ignores emergency tokens even if movable", () => {
      const tokens = [
        createTestToken("t1", TokenSource.EMERGENCY, PriorityLevel.EMERGENCY, true),
        createTestToken("t2", TokenSource.ONLINE, PriorityLevel.MEDIUM, true),
      ];
      const slot = createTestSlot(tokens);
      const result = findLowestPriorityMovableToken(slot);
      expect(result).not.toBeNull();
      expect(result!.id).toBe("t2");
    });

    it("ignores non-movable tokens", () => {
      const tokens = [
        createTestToken("t1", TokenSource.ONLINE, PriorityLevel.LOW, false),
        createTestToken("t2", TokenSource.WALK_IN, PriorityLevel.MEDIUM, true),
      ];
      const slot = createTestSlot(tokens);
      const result = findLowestPriorityMovableToken(slot);
      expect(result).not.toBeNull();
      expect(result!.id).toBe("t2");
    });
  });

  describe("allocateTokenToSlot", () => {
    describe("ALLOCATED status", () => {
      it("allocates token when slot has capacity", () => {
        const slot = createTestSlot([]);
        const token = createTestToken("new-token", TokenSource.ONLINE, PriorityLevel.MEDIUM);

        const result = allocateTokenToSlot(slot, token);

        expect(result.status).toBe("ALLOCATED");
        expect(result.allocatedToken).toBe(token);
        expect(result.displacedToken).toBeUndefined();
      });

      it("does not mutate slot.tokens", () => {
        const slot = createTestSlot([]);
        const originalLength = slot.tokens.length;
        const token = createTestToken("new-token", TokenSource.ONLINE, PriorityLevel.MEDIUM);

        allocateTokenToSlot(slot, token);

        expect(slot.tokens.length).toBe(originalLength);
      });
    });

    describe("DISPLACED status", () => {
      it("displaces lower-priority movable token when slot is full", () => {
        // Fill slot with general tokens (max=5, emergency=1, priority=1, general=3)
        const existingTokens = [
          createTestToken("t1", TokenSource.ONLINE, PriorityLevel.LOW, true),
          createTestToken("t2", TokenSource.ONLINE, PriorityLevel.MEDIUM, true),
          createTestToken("t3", TokenSource.ONLINE, PriorityLevel.MEDIUM, true),
        ];
        const slot = createTestSlot(existingTokens, [], { max: 5, emergencyBuffer: 1, priorityBuffer: 1 });

        // High priority token should displace lowest priority
        const highPriorityToken = createTestToken("new", TokenSource.WALK_IN, PriorityLevel.HIGH);
        const result = allocateTokenToSlot(slot, highPriorityToken);

        expect(result.status).toBe("DISPLACED");
        expect(result.allocatedToken).toBe(highPriorityToken);
        expect(result.displacedToken).not.toBeUndefined();
        expect(result.displacedToken!.id).toBe("t1");
      });

      it("does not displace emergency tokens", () => {
        // Fill slot: 1 emergency + 2 general = 3 tokens, general capacity full
        const existingTokens = [
          createTestToken("t1", TokenSource.EMERGENCY, PriorityLevel.EMERGENCY, true),
          createTestToken("t2", TokenSource.ONLINE, PriorityLevel.MEDIUM, true),
          createTestToken("t3", TokenSource.ONLINE, PriorityLevel.MEDIUM, true),
        ];
        const slot = createTestSlot(existingTokens, [], { max: 3, emergencyBuffer: 1, priorityBuffer: 0 });

        // Even higher priority token cannot displace emergency
        const newToken = createTestToken("new", TokenSource.ONLINE, PriorityLevel.HIGH);
        const result = allocateTokenToSlot(slot, newToken);

        // Should displace t2 or t3, not t1 (emergency)
        if (result.status === "DISPLACED") {
          expect(result.displacedToken!.source).not.toBe(TokenSource.EMERGENCY);
        }
      });

      it("does not displace non-movable tokens", () => {
        const existingTokens = [
          createTestToken("t1", TokenSource.ONLINE, PriorityLevel.LOW, false), // non-movable
          createTestToken("t2", TokenSource.ONLINE, PriorityLevel.MEDIUM, true),
          createTestToken("t3", TokenSource.ONLINE, PriorityLevel.MEDIUM, true),
        ];
        const slot = createTestSlot(existingTokens, [], { max: 3, emergencyBuffer: 0, priorityBuffer: 0 });

        const highPriorityToken = createTestToken("new", TokenSource.WALK_IN, PriorityLevel.HIGH);
        const result = allocateTokenToSlot(slot, highPriorityToken);

        if (result.status === "DISPLACED") {
          expect(result.displacedToken!.movable).toBe(true);
          expect(result.displacedToken!.id).not.toBe("t1");
        }
      });

      it("does not mutate slot when displacing", () => {
        const existingTokens = [
          createTestToken("t1", TokenSource.ONLINE, PriorityLevel.LOW, true),
          createTestToken("t2", TokenSource.ONLINE, PriorityLevel.MEDIUM, true),
          createTestToken("t3", TokenSource.ONLINE, PriorityLevel.MEDIUM, true),
        ];
        const slot = createTestSlot(existingTokens, [], { max: 3, emergencyBuffer: 0, priorityBuffer: 0 });
        const originalTokenCount = slot.tokens.length;
        const originalWaitlistCount = slot.waitlist.length;

        const highPriorityToken = createTestToken("new", TokenSource.WALK_IN, PriorityLevel.HIGH);
        allocateTokenToSlot(slot, highPriorityToken);

        expect(slot.tokens.length).toBe(originalTokenCount);
        expect(slot.waitlist.length).toBe(originalWaitlistCount);
      });
    });

    describe("WAITLISTED status", () => {
      it("waitlists medium priority token when slot is full and no displacement possible", () => {
        // All tokens same priority, non-movable
        const existingTokens = [
          createTestToken("t1", TokenSource.ONLINE, PriorityLevel.HIGH, false),
          createTestToken("t2", TokenSource.ONLINE, PriorityLevel.HIGH, false),
          createTestToken("t3", TokenSource.ONLINE, PriorityLevel.HIGH, false),
        ];
        const slot = createTestSlot(existingTokens, [], { max: 3, emergencyBuffer: 0, priorityBuffer: 0 });

        const mediumToken = createTestToken("new", TokenSource.WALK_IN, PriorityLevel.MEDIUM);
        const result = allocateTokenToSlot(slot, mediumToken);

        expect(result.status).toBe("WAITLISTED");
        expect(result.allocatedToken).toBe(mediumToken);
      });

      it("waitlists high priority token when no lower priority to displace", () => {
        const existingTokens = [
          createTestToken("t1", TokenSource.ONLINE, PriorityLevel.HIGH, true),
          createTestToken("t2", TokenSource.ONLINE, PriorityLevel.HIGH, true),
          createTestToken("t3", TokenSource.ONLINE, PriorityLevel.HIGH, true),
        ];
        const slot = createTestSlot(existingTokens, [], { max: 3, emergencyBuffer: 0, priorityBuffer: 0 });

        // Same priority, cannot displace
        const newHighToken = createTestToken("new", TokenSource.WALK_IN, PriorityLevel.HIGH);
        const result = allocateTokenToSlot(slot, newHighToken);

        expect(result.status).toBe("WAITLISTED");
      });
    });

    describe("REJECTED status", () => {
      it("rejects low priority token when slot is full", () => {
        const existingTokens = [
          createTestToken("t1", TokenSource.ONLINE, PriorityLevel.MEDIUM, false),
          createTestToken("t2", TokenSource.ONLINE, PriorityLevel.MEDIUM, false),
          createTestToken("t3", TokenSource.ONLINE, PriorityLevel.MEDIUM, false),
        ];
        const slot = createTestSlot(existingTokens, [], { max: 3, emergencyBuffer: 0, priorityBuffer: 0 });

        const lowPriorityToken = createTestToken("new", TokenSource.WALK_IN, PriorityLevel.LOW);
        const result = allocateTokenToSlot(slot, lowPriorityToken);

        expect(result.status).toBe("REJECTED");
        expect(result.allocatedToken).toBeUndefined();
      });

      it("rejects when priority is below MEDIUM threshold", () => {
        const existingTokens = [
          createTestToken("t1", TokenSource.ONLINE, PriorityLevel.LOW, false),
          createTestToken("t2", TokenSource.ONLINE, PriorityLevel.LOW, false),
          createTestToken("t3", TokenSource.ONLINE, PriorityLevel.LOW, false),
        ];
        const slot = createTestSlot(existingTokens, [], { max: 3, emergencyBuffer: 0, priorityBuffer: 0 });

        const lowToken = createTestToken("new", TokenSource.WALK_IN, PriorityLevel.LOW);
        const result = allocateTokenToSlot(slot, lowToken);

        expect(result.status).toBe("REJECTED");
      });
    });

    describe("decision correctness", () => {
      it("returns correct reason for allocation", () => {
        const slot = createTestSlot([]);
        const token = createTestToken("new", TokenSource.ONLINE, PriorityLevel.MEDIUM);
        const result = allocateTokenToSlot(slot, token);

        expect(result.reason).toBeDefined();
        expect(result.reason).toContain("capacity");
      });

      it("returns correct reason for displacement", () => {
        const existingTokens = [
          createTestToken("t1", TokenSource.ONLINE, PriorityLevel.LOW, true),
        ];
        const slot = createTestSlot(existingTokens, [], { max: 1, emergencyBuffer: 0, priorityBuffer: 0 });

        const highToken = createTestToken("new", TokenSource.WALK_IN, PriorityLevel.HIGH);
        const result = allocateTokenToSlot(slot, highToken);

        expect(result.status).toBe("DISPLACED");
        expect(result.reason).toContain("displace");
      });
    });
  });
});
