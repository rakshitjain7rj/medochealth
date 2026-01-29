/**
 * Core enums for the OPD Token Allocation System
 * These enums define the foundational types used across the domain
 */

/**
 * Source from which a token was allocated
 */
export enum TokenSource {
  ONLINE = "ONLINE",
  WALK_IN = "WALK_IN",
  PRIORITY = "PRIORITY",
  FOLLOW_UP = "FOLLOW_UP",
  EMERGENCY = "EMERGENCY",
}

/**
 * Current lifecycle state of a token
 */
export enum TokenStatus {
  CREATED = "CREATED",
  CONFIRMED = "CONFIRMED",
  CHECKED_IN = "CHECKED_IN",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  NO_SHOW = "NO_SHOW",
}

/**
 * Priority level with numeric values for sorting (higher = more urgent)
 */
export enum PriorityLevel {
  LOW = 20,
  MEDIUM = 40,
  HIGH = 60,
  VERY_HIGH = 80,
  EMERGENCY = 100,
}
