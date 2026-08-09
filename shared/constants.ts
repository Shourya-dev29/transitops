// ============================================================
// TransitOps — Single Source of Truth for All Constants
// ============================================================
// EVERY enum value, vehicle type, status color, permission,
// and valid state transition is defined HERE and only here.
// If you need to reference a status anywhere in the codebase,
// import from this file. Never re-type a status string inline.
// ============================================================

// ── User Roles ──────────────────────────────────────────────
export const USER_ROLES = {
  FLEET_MANAGER: 'FLEET_MANAGER',
  DRIVER: 'DRIVER',
  SAFETY_OFFICER: 'SAFETY_OFFICER',
  FINANCIAL_ANALYST: 'FINANCIAL_ANALYST',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  FLEET_MANAGER: 'Fleet Manager',
  DRIVER: 'Driver',
  SAFETY_OFFICER: 'Safety Officer',
  FINANCIAL_ANALYST: 'Financial Analyst',
};

// ── Vehicle Statuses ────────────────────────────────────────
export const VEHICLE_STATUSES = {
  AVAILABLE: 'AVAILABLE',
  ON_TRIP: 'ON_TRIP',
  IN_SHOP: 'IN_SHOP',
  RETIRED: 'RETIRED',
} as const;

export type VehicleStatus = (typeof VEHICLE_STATUSES)[keyof typeof VEHICLE_STATUSES];

// ── Driver Statuses ─────────────────────────────────────────
export const DRIVER_STATUSES = {
  AVAILABLE: 'AVAILABLE',
  ON_TRIP: 'ON_TRIP',
  OFF_DUTY: 'OFF_DUTY',
  SUSPENDED: 'SUSPENDED',
  INACTIVE: 'INACTIVE',
} as const;

export type DriverStatus = (typeof DRIVER_STATUSES)[keyof typeof DRIVER_STATUSES];

// ── Trip Statuses ───────────────────────────────────────────
export const TRIP_STATUSES = {
  DRAFT: 'DRAFT',
  DISPATCHED: 'DISPATCHED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type TripStatus = (typeof TRIP_STATUSES)[keyof typeof TRIP_STATUSES];

// ── Maintenance Statuses ────────────────────────────────────
export const MAINTENANCE_STATUSES = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[keyof typeof MAINTENANCE_STATUSES];

// ── Vehicle Types (config-driven, never hardcoded in forms) ─
export const VEHICLE_TYPES = [
  'Truck',
  'Van',
  'Bus',
  'Sedan',
  'SUV',
  'Trailer',
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

// ── Expense Categories ──────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  'Fuel',
  'Maintenance',
  'Insurance',
  'Toll',
  'Parking',
  'Other',
] as const;

// ── Maintenance Types ───────────────────────────────────────
export const MAINTENANCE_TYPES = [
  'Oil Change',
  'Tire Replacement',
  'Brake Service',
  'Engine Repair',
  'Transmission',
  'Electrical',
  'Body Work',
  'Inspection',
  'Other',
] as const;

// ── Status Color Map (consistent across entire UI) ──────────
// Design system palette — no blues, purples, pinks, yellows, neons.
export const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  // Green family — success / available / completed
  AVAILABLE:  { bg: '#E8F0E8', text: '#2C5F2D', label: 'Available' },
  COMPLETED:  { bg: '#E8F0E8', text: '#2C5F2D', label: 'Completed' },
  CLOSED:     { bg: '#E8F0E8', text: '#2C5F2D', label: 'Closed' },

  // Terracotta family — attention / active / in-progress
  ON_TRIP:    { bg: '#FBF0E8', text: '#B5502D', label: 'On Trip' },
  IN_SHOP:    { bg: '#FBF0E8', text: '#B5502D', label: 'In Shop' },
  DISPATCHED: { bg: '#FBF0E8', text: '#B5502D', label: 'Dispatched' },
  OPEN:       { bg: '#FBF0E8', text: '#B5502D', label: 'Open' },

  // Brick red family — danger / terminal / blocked
  RETIRED:    { bg: '#F5E8E8', text: '#A62C2C', label: 'Retired' },
  SUSPENDED:  { bg: '#F5E8E8', text: '#A62C2C', label: 'Suspended' },
  CANCELLED:  { bg: '#F5E8E8', text: '#A62C2C', label: 'Cancelled' },

  // Neutral family — passive / inactive
  OFF_DUTY:   { bg: '#F0EFED', text: '#6B6660', label: 'Off Duty' },
  INACTIVE:   { bg: '#F0EFED', text: '#6B6660', label: 'Inactive' },
  DRAFT:      { bg: '#F0EFED', text: '#6B6660', label: 'Draft' },
};

// ── Valid Status Transitions (state machine rules) ──────────
// Used by statusTransition.ts to enforce legal transitions.
// If a transition isn't listed here, it's illegal.

export const VEHICLE_STATUS_TRANSITIONS: Record<VehicleStatus, VehicleStatus[]> = {
  AVAILABLE: ['ON_TRIP', 'IN_SHOP', 'RETIRED'],
  ON_TRIP:   ['AVAILABLE'],
  IN_SHOP:   ['AVAILABLE', 'RETIRED'],
  RETIRED:   [],  // Terminal state — no transitions out
};

export const DRIVER_STATUS_TRANSITIONS: Record<DriverStatus, DriverStatus[]> = {
  AVAILABLE:  ['ON_TRIP', 'OFF_DUTY', 'SUSPENDED', 'INACTIVE'],
  ON_TRIP:    ['AVAILABLE'],
  OFF_DUTY:   ['AVAILABLE', 'SUSPENDED', 'INACTIVE'],
  SUSPENDED:  ['AVAILABLE', 'INACTIVE'],
  INACTIVE:   [],  // Terminal state
};

export const TRIP_STATUS_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  DRAFT:      ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['COMPLETED', 'CANCELLED'],
  COMPLETED:  [],  // Terminal
  CANCELLED:  [],  // Terminal
};

// ── Permission Matrix ───────────────────────────────────────
// Defines what each role can do on each resource.
// Backend middleware reads this to authorize requests.
export const PERMISSIONS: Record<UserRole, Record<string, string[]>> = {
  FLEET_MANAGER: {
    vehicles:    ['create', 'read', 'update', 'delete'],
    drivers:     ['create', 'read', 'update', 'delete'],
    trips:       ['create', 'read', 'update', 'dispatch', 'complete', 'cancel'],
    maintenance: ['create', 'read', 'update', 'close'],
    fuel:        ['create', 'read'],
    expenses:    ['create', 'read'],
    reports:     ['read', 'export'],
    dashboard:   ['read'],
  },
  DRIVER: {
    trips:       ['create', 'read', 'dispatch', 'complete'],
    dashboard:   ['read'],
  },
  SAFETY_OFFICER: {
    vehicles:    ['read'],
    drivers:     ['read', 'update_compliance'],
    trips:       ['read'],
    maintenance: ['read'],
    fuel:        ['read'],
    expenses:    ['read'],
    reports:     ['read'],
    dashboard:   ['read'],
  },
  FINANCIAL_ANALYST: {
    vehicles:    ['read'],
    drivers:     ['read'],
    trips:       ['read'],
    maintenance: ['read'],
    fuel:        ['create', 'read', 'update'],
    expenses:    ['create', 'read', 'update'],
    reports:     ['read', 'export'],
    dashboard:   ['read'],
  },
};

// ── Chart Colors (overrides default chart palette) ──────────
// No blues, purples, pinks — only palette-compliant colors.
export const CHART_COLORS = [
  '#2C5F2D',  // Forest green
  '#B5502D',  // Terracotta
  '#A62C2C',  // Brick red
  '#6B6660',  // Warm slate
  '#4A7C4B',  // Medium green
  '#D4764E',  // Light terracotta
  '#8B4C4C',  // Muted red
  '#918B84',  // Light slate
] as const;

// ── License Expiry Thresholds ───────────────────────────────
export const LICENSE_EXPIRY_WARNING_DAYS = 30;
export const LICENSE_EXPIRY_CRITICAL_DAYS = 7;
