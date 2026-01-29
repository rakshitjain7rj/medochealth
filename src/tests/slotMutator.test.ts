/**
 * Unit tests for slotMutator.ts
 * Tests the controlled mutation layer for slot state changes
 */

import { Slot, SlotCapacity } from "../domain/Slot";
import { Token } from "../domain/Token";
import { TokenSource, TokenStatus, PriorityLevel } from "../domain/enums";
import { AllocationResult } from "../services/allocationEngine";
import {
  applyAllocationResult,
  cancelToken,
  markNoShow,
} from "../services/slotMutator";

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

describe("slotMutator", () => {
  describe("applyAllocationResult", () => {
    describe("ALLOCATED status", () => {
      it("adds token to slot.tokens", () => {
        const slot = createTestSlot();
        const token = createTestToken("new-token", TokenSource.ONLINE, PriorityLevel.MEDIUM);
        const result: AllocationResult = {
          status: "ALLOCATED",
          allocatedToken: token,
        };

        applyAllocationResult(slot, result);

        expect(slot.tokens.length).toBe(1);
        expect(slot.tokens[0].id).toBe("new-token");
      });

      it("does not modify waitlist", () => {
        const slot = createTestSlot();
        const token = createTestToken("new-token", TokenSource.ONLINE, PriorityLevel.MEDIUM);
        const result: AllocationResult = {
          status: "ALLOCATED",
          allocatedToken: token,
        };

        applyAllocationResult(slot, result);

        expect(slot.waitlist.length).toBe(0);
      });

      it("handles missing allocatedToken gracefully", () => {
        const slot = createTestSlot();
        const result: AllocationResult = {
          status: "ALLOCATED",
        };

        applyAllocationResult(slot, result);

        expect(slot.tokens.length).toBe(0);
      });
    });

    describe("DISPLACED status", () => {
      it("removes displaced token from slot.tokens", () => {
        const existingToken = createTestToken("existing", TokenSource.ONLINE, PriorityLevel.LOW);
        const slot = createTestSlot([existingToken]);

        const newToken = createTestToken("new-token", TokenSource.WALK_IN, PriorityLevel.HIGH);
        const result: AllocationResult = {
          status: "DISPLACED",
          allocatedToken: newToken,
          displacedToken: existingToken,
        };

        applyAllocationResult(slot, result);

        expect(slot.tokens.find((t) => t.id === "existing")).toBeUndefined();
      });

      it("adds new token to slot.tokens", () => {
        const existingToken = createTestToken("existing", TokenSource.ONLINE, PriorityLevel.LOW);
        const slot = createTestSlot([existingToken]);

        const newToken = createTestToken("new-token", TokenSource.WALK_IN, PriorityLevel.HIGH);
        const result: AllocationResult = {
          status: "DISPLACED",
          allocatedToken: newToken,
          displacedToken: existingToken,
        };

        applyAllocationResult(slot, result);

        expect(slot.tokens.find((t) => t.id === "new-token")).toBeDefined();
      });

      it("adds displaced token to waitlist", () => {
        const existingToken = createTestToken("existing", TokenSource.ONLINE, PriorityLevel.LOW);
        const slot = createTestSlot([existingToken]);

        const newToken = createTestToken("new-token", TokenSource.WALK_IN, PriorityLevel.HIGH);
        const result: AllocationResult = {
          status: "DISPLACED",
          allocatedToken: newToken,
          displacedToken: existingToken,
        };

        applyAllocationResult(slot, result);

        expect(slot.waitlist.length).toBe(1);
        expect(slot.waitlist[0].id).toBe("existing");
      });

      it("maintains correct token count after displacement", () => {
        const existingToken = createTestToken("existing", TokenSource.ONLINE, PriorityLevel.LOW);
        const slot = createTestSlot([existingToken]);

        const newToken = createTestToken("new-token", TokenSource.WALK_IN, PriorityLevel.HIGH);
        const result: AllocationResult = {
          status: "DISPLACED",
          allocatedToken: newToken,
          displacedToken: existingToken,
        };

        applyAllocationResult(slot, result);

        expect(slot.tokens.length).toBe(1);
      });

      it("does not create duplicates", () => {
        const existingToken = createTestToken("existing", TokenSource.ONLINE, PriorityLevel.LOW);
        const slot = createTestSlot([existingToken]);

        const newToken = createTestToken("new-token", TokenSource.WALK_IN, PriorityLevel.HIGH);
        const result: AllocationResult = {
          status: "DISPLACED",
          allocatedToken: newToken,
          displacedToken: existingToken,
        };

        applyAllocationResult(slot, result);

        const allTokenIds = [...slot.tokens, ...slot.waitlist].map((t) => t.id);
        const uniqueIds = new Set(allTokenIds);
        expect(uniqueIds.size).toBe(allTokenIds.length);
      });
    });

    describe("WAITLISTED status", () => {
      it("adds token to slot.waitlist", () => {
        const slot = createTestSlot();
        const token = createTestToken("new-token", TokenSource.ONLINE, PriorityLevel.MEDIUM);
        const result: AllocationResult = {
          status: "WAITLISTED",
          allocatedToken: token,
        };

        applyAllocationResult(slot, result);

        expect(slot.waitlist.length).toBe(1);
        expect(slot.waitlist[0].id).toBe("new-token");
      });

      it("does not add to slot.tokens", () => {
        const slot = createTestSlot();
        const token = createTestToken("new-token", TokenSource.ONLINE, PriorityLevel.MEDIUM);
        const result: AllocationResult = {
          status: "WAITLISTED",
          allocatedToken: token,
        };

        applyAllocationResult(slot, result);

        expect(slot.tokens.length).toBe(0);
      });
    });

    describe("REJECTED status", () => {
      it("does not modify slot.tokens", () => {
        const existingToken = createTestToken("existing", TokenSource.ONLINE, PriorityLevel.MEDIUM);
        const slot = createTestSlot([existingToken]);
        const result: AllocationResult = {
          status: "REJECTED",
          reason: "Slot full and priority too low",
        };

        applyAllocationResult(slot, result);

        expect(slot.tokens.length).toBe(1);
        expect(slot.tokens[0].id).toBe("existing");
      });

      it("does not modify slot.waitlist", () => {
        const slot = createTestSlot();
        const result: AllocationResult = {
          status: "REJECTED",
          reason: "Slot full and priority too low",
        };

        applyAllocationResult(slot, result);

        expect(slot.waitlist.length).toBe(0);
      });
    });
  });

  describe("cancelToken", () => {
    it("removes token from slot.tokens", () => {
      const token = createTestToken("to-cancel", TokenSource.ONLINE, PriorityLevel.MEDIUM);
      const slot = createTestSlot([token]);

      cancelToken(slot, "to-cancel");

      expect(slot.tokens.length).toBe(0);
    });

    it("promotes highest-priority token from waitlist", () => {
      const activeToken = createTestToken("active", TokenSource.ONLINE, PriorityLevel.MEDIUM);
      const waitlistLow = createTestToken("wait-low", TokenSource.WALK_IN, PriorityLevel.LOW);
      const waitlistHigh = createTestToken("wait-high", TokenSource.WALK_IN, PriorityLevel.HIGH);
      const slot = createTestSlot([activeToken], [waitlistLow, waitlistHigh]);

      cancelToken(slot, "active");

      expect(slot.tokens.length).toBe(1);
      expect(slot.tokens[0].id).toBe("wait-high");
      expect(slot.waitlist.length).toBe(1);
      expect(slot.waitlist[0].id).toBe("wait-low");
    });

    it("does not promote if waitlist is empty", () => {
      const token = createTestToken("to-cancel", TokenSource.ONLINE, PriorityLevel.MEDIUM);
      const slot = createTestSlot([token], []);

      cancelToken(slot, "to-cancel");

      expect(slot.tokens.length).toBe(0);
      expect(slot.waitlist.length).toBe(0);
    });

    it("does nothing if token not found", () => {
      const token = createTestToken("existing", TokenSource.ONLINE, PriorityLevel.MEDIUM);
      const slot = createTestSlot([token]);

      cancelToken(slot, "non-existent");

      expect(slot.tokens.length).toBe(1);
      expect(slot.tokens[0].id).toBe("existing");
    });

    it("promotes from waitlist only when token is in slot.tokens", () => {
      const activeToken = createTestToken("active", TokenSource.ONLINE, PriorityLevel.MEDIUM);
      const waitlistToken = createTestToken("wait", TokenSource.WALK_IN, PriorityLevel.HIGH);
      const slot = createTestSlot([activeToken], [waitlistToken]);

      // Cancel non-existent token - should not promote
      cancelToken(slot, "non-existent");

      expect(slot.tokens.length).toBe(1);
      expect(slot.waitlist.length).toBe(1);
    });

    it("handles multiple tokens in waitlist correctly", () => {
      const activeToken = createTestToken("active", TokenSource.ONLINE, PriorityLevel.MEDIUM);
      const wait1 = createTestToken("wait-1", TokenSource.WALK_IN, PriorityLevel.MEDIUM);
      const wait2 = createTestToken("wait-2", TokenSource.WALK_IN, PriorityLevel.VERY_HIGH);
      const wait3 = createTestToken("wait-3", TokenSource.WALK_IN, PriorityLevel.LOW);
      const slot = createTestSlot([activeToken], [wait1, wait2, wait3]);

      cancelToken(slot, "active");

      // wait-2 has highest priority (VERY_HIGH = 80)
      expect(slot.tokens[0].id).toBe("wait-2");
      expect(slot.waitlist.length).toBe(2);
    });
  });

  describe("markNoShow", () => {
    it("behaves same as cancelToken - removes from tokens", () => {
      const token = createTestToken("no-show", TokenSource.ONLINE, PriorityLevel.MEDIUM);
      const slot = createTestSlot([token]);

      markNoShow(slot, "no-show");

      expect(slot.tokens.length).toBe(0);
    });

    it("behaves same as cancelToken - promotes from waitlist", () => {
      const activeToken = createTestToken("no-show", TokenSource.ONLINE, PriorityLevel.MEDIUM);
      const waitlistToken = createTestToken("wait", TokenSource.WALK_IN, PriorityLevel.HIGH);
      const slot = createTestSlot([activeToken], [waitlistToken]);

      markNoShow(slot, "no-show");

      expect(slot.tokens.length).toBe(1);
      expect(slot.tokens[0].id).toBe("wait");
      expect(slot.waitlist.length).toBe(0);
    });

    it("does nothing if token not found", () => {
      const token = createTestToken("existing", TokenSource.ONLINE, PriorityLevel.MEDIUM);
      const slot = createTestSlot([token]);

      markNoShow(slot, "non-existent");

      expect(slot.tokens.length).toBe(1);
    });
  });

  describe("slot invariants", () => {
    it("maintains no duplicate tokens across operations", () => {
      const t1 = createTestToken("t1", TokenSource.ONLINE, PriorityLevel.LOW);
      const t2 = createTestToken("t2", TokenSource.ONLINE, PriorityLevel.MEDIUM);
      const t3 = createTestToken("t3", TokenSource.ONLINE, PriorityLevel.HIGH);
      const slot = createTestSlot([t1], [t2]);

      // Displace t1 with t3
      const result: AllocationResult = {
        status: "DISPLACED",
        allocatedToken: t3,
        displacedToken: t1,
      };
      applyAllocationResult(slot, result);

      // Cancel t3 to promote from waitlist
      cancelToken(slot, "t3");

      // All token IDs should be unique
      const allIds = [...slot.tokens, ...slot.waitlist].map((t) => t.id);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });
  });
});
