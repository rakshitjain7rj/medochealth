/**
 * OPD Day Simulation
 * Simulates a full OPD day with multiple doctors, slots, and real-world events
 * This is a testing/demo module - console output is allowed here
 */

import { Doctor } from "../domain/Doctor";
import { Slot, SlotCapacity } from "../domain/Slot";
import { Token } from "../domain/Token";
import { TokenSource, TokenStatus, PriorityLevel } from "../domain/enums";
import { allocateTokenToSlot, AllocationResult } from "../services/allocationEngine";
import { applyAllocationResult, cancelToken, markNoShow } from "../services/slotMutator";

// ============================================================================
// Counters for end-of-day summary
// ============================================================================
let totalTokensProcessed = 0;
let totalEmergencies = 0;
let totalDisplaced = 0;
let totalRejected = 0;
let totalWaitlisted = 0;
let totalAllocated = 0;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a slot with specified time range and capacity
 */
function createSlot(
  id: string,
  doctorId: string,
  startHour: number,
  endHour: number,
  capacity: SlotCapacity
): Slot {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startTime = new Date(today);
  startTime.setHours(startHour, 0, 0, 0);

  const endTime = new Date(today);
  endTime.setHours(endHour, 0, 0, 0);

  return {
    id,
    doctorId,
    startTime,
    endTime,
    capacity,
    tokens: [],
    waitlist: [],
  };
}

/**
 * Creates a token with specified attributes
 */
function createToken(
  id: string,
  patientId: string,
  doctorId: string,
  slotId: string,
  source: TokenSource,
  priority: PriorityLevel,
  movable: boolean
): Token {
  return {
    id,
    patientId,
    doctorId,
    slotId,
    source,
    priority,
    status: TokenStatus.CREATED,
    createdAt: new Date(),
    movable,
  };
}

/**
 * Returns a random element from an array
 */
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Returns a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Maps TokenSource to appropriate PriorityLevel
 */
function getPriorityForSource(source: TokenSource): PriorityLevel {
  switch (source) {
    case TokenSource.EMERGENCY:
      return PriorityLevel.EMERGENCY;
    case TokenSource.PRIORITY:
      return PriorityLevel.VERY_HIGH;
    case TokenSource.FOLLOW_UP:
      return PriorityLevel.HIGH;
    case TokenSource.ONLINE:
      return PriorityLevel.MEDIUM;
    case TokenSource.WALK_IN:
      return PriorityLevel.LOW;
    default:
      return PriorityLevel.LOW;
  }
}

/**
 * Determines if a token should be movable based on source
 */
function isMovableSource(source: TokenSource): boolean {
  // Emergency and Priority tokens are not movable
  return source !== TokenSource.EMERGENCY && source !== TokenSource.PRIORITY;
}

// ============================================================================
// Doctor and Slot Setup
// ============================================================================

/**
 * Creates a doctor with 3 OPD slots
 */
function createDoctor(id: string, name: string, department: string): Doctor {
  const capacity: SlotCapacity = {
    max: 5,
    emergencyBuffer: 1,
    priorityBuffer: 1,
  };

  const slots: Slot[] = [
    createSlot(`${id}-slot-1`, id, 9, 10, { ...capacity }),
    createSlot(`${id}-slot-2`, id, 10, 11, { ...capacity }),
    createSlot(`${id}-slot-3`, id, 11, 12, { ...capacity }),
  ];

  return {
    id,
    name,
    department,
    slots,
  };
}

// ============================================================================
// Simulation Logic
// ============================================================================

/**
 * Simulates token allocation for a single slot
 */
function simulateSlot(slot: Slot, doctorName: string): void {
  console.log(`\n  📅 Slot: ${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`);

  // Generate 4-7 random regular tokens
  const regularSources = [
    TokenSource.ONLINE,
    TokenSource.WALK_IN,
    TokenSource.PRIORITY,
    TokenSource.FOLLOW_UP,
  ];

  const tokenCount = randomInt(4, 7);
  let tokenIndex = 1;

  // Process regular tokens
  for (let i = 0; i < tokenCount; i++) {
    const source = randomFrom(regularSources);
    const priority = getPriorityForSource(source);
    const movable = isMovableSource(source);

    const token = createToken(
      `${slot.id}-token-${tokenIndex++}`,
      `patient-${randomInt(1000, 9999)}`,
      slot.doctorId,
      slot.id,
      source,
      priority,
      movable
    );

    processToken(slot, token);
  }

  // Randomly insert 0-2 emergency tokens
  const emergencyCount = randomInt(0, 2);
  for (let i = 0; i < emergencyCount; i++) {
    const token = createToken(
      `${slot.id}-emg-${tokenIndex++}`,
      `patient-${randomInt(1000, 9999)}`,
      slot.doctorId,
      slot.id,
      TokenSource.EMERGENCY,
      PriorityLevel.EMERGENCY,
      false
    );

    totalEmergencies++;
    processToken(slot, token);
  }

  // Randomly cancel one token (30% chance)
  if (Math.random() < 0.3 && slot.tokens.length > 0) {
    const tokenToCancel = randomFrom(slot.tokens);
    console.log(`    ❌ Cancelling token: ${tokenToCancel.id}`);
    cancelToken(slot, tokenToCancel.id);
  }

  // Randomly mark one as no-show (20% chance)
  if (Math.random() < 0.2 && slot.tokens.length > 0) {
    const tokenNoShow = randomFrom(slot.tokens);
    console.log(`    👻 No-show: ${tokenNoShow.id}`);
    markNoShow(slot, tokenNoShow.id);
  }

  // Print slot summary
  printSlotSummary(slot);
}

/**
 * Processes a single token allocation
 */
function processToken(slot: Slot, token: Token): void {
  totalTokensProcessed++;

  const result: AllocationResult = allocateTokenToSlot(slot, token);
  applyAllocationResult(slot, result);

  const statusIcon = getStatusIcon(result.status);
  console.log(
    `    ${statusIcon} [${token.source}] Token ${token.id} → ${result.status}` +
      (result.reason ? ` (${result.reason})` : "")
  );

  // Update counters
  switch (result.status) {
    case "ALLOCATED":
      totalAllocated++;
      break;
    case "DISPLACED":
      totalDisplaced++;
      totalAllocated++;
      break;
    case "WAITLISTED":
      totalWaitlisted++;
      break;
    case "REJECTED":
      totalRejected++;
      break;
  }
}

/**
 * Returns an icon for allocation status
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case "ALLOCATED":
      return "✅";
    case "DISPLACED":
      return "🔄";
    case "WAITLISTED":
      return "⏳";
    case "REJECTED":
      return "🚫";
    default:
      return "❓";
  }
}

/**
 * Formats a Date to HH:MM string
 */
function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

/**
 * Prints summary for a single slot
 */
function printSlotSummary(slot: Slot): void {
  const emergencyInSlot = slot.tokens.filter(
    (t) => t.source === TokenSource.EMERGENCY
  ).length;

  console.log(`    ────────────────────────────────`);
  console.log(`    📊 Tokens: ${slot.tokens.length}/${slot.capacity.max}`);
  console.log(`    🚨 Emergency: ${emergencyInSlot}`);
  console.log(`    📋 Waitlist: ${slot.waitlist.length}`);
}

/**
 * Simulates a full day for one doctor
 */
function simulateDoctor(doctor: Doctor): void {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`👨‍⚕️ Dr. ${doctor.name} (${doctor.department})`);
  console.log(`${"═".repeat(60)}`);

  for (const slot of doctor.slots) {
    simulateSlot(slot, doctor.name);
  }

  // Doctor summary
  const totalTokens = doctor.slots.reduce((sum, s) => sum + s.tokens.length, 0);
  const totalWaitlist = doctor.slots.reduce((sum, s) => sum + s.waitlist.length, 0);
  const totalEmergency = doctor.slots.reduce(
    (sum, s) => sum + s.tokens.filter((t) => t.source === TokenSource.EMERGENCY).length,
    0
  );

  console.log(`\n  📈 Doctor Summary:`);
  console.log(`     Total tokens allocated: ${totalTokens}`);
  console.log(`     Total emergencies handled: ${totalEmergency}`);
  console.log(`     Total in waitlist: ${totalWaitlist}`);
}

/**
 * Prints end-of-day summary
 */
function printDaySummary(): void {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📊 END OF DAY SUMMARY`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  Total tokens processed:  ${totalTokensProcessed}`);
  console.log(`  Total allocated:         ${totalAllocated}`);
  console.log(`  Total emergencies:       ${totalEmergencies}`);
  console.log(`  Total displaced:         ${totalDisplaced}`);
  console.log(`  Total waitlisted:        ${totalWaitlisted}`);
  console.log(`  Total rejected:          ${totalRejected}`);
  console.log(`${"═".repeat(60)}\n`);
}

// ============================================================================
// Main Simulation Entry Point
// ============================================================================

/**
 * Runs the full OPD day simulation
 */
function runSimulation(): void {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🏥 OPD TOKEN ALLOCATION SIMULATION`);
  console.log(`📅 Date: ${new Date().toDateString()}`);
  console.log(`${"═".repeat(60)}`);

  // Create 3 doctors
  const doctors: Doctor[] = [
    createDoctor("doc-A", "Sharma", "General Medicine"),
    createDoctor("doc-B", "Patel", "Pediatrics"),
    createDoctor("doc-C", "Reddy", "Orthopedics"),
  ];

  // Simulate each doctor's day
  for (const doctor of doctors) {
    simulateDoctor(doctor);
  }

  // Print final summary
  printDaySummary();
}

// Run the simulation
runSimulation();
