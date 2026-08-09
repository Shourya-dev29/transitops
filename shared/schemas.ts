// ============================================================
// TransitOps — Shared Zod Validation Schemas
// ============================================================
// Used by BOTH frontend (react-hook-form resolver) and backend
// (express route validation). Never duplicate validation logic.
// ============================================================

import { z } from 'zod';
import {
  USER_ROLES,
  VEHICLE_STATUSES,
  DRIVER_STATUSES,
  TRIP_STATUSES,
  MAINTENANCE_STATUSES,
  VEHICLE_TYPES,
  EXPENSE_CATEGORIES,
  MAINTENANCE_TYPES,
} from './constants.js';

// ── Helpers ─────────────────────────────────────────────────

const userRoleValues = Object.values(USER_ROLES) as [string, ...string[]];
const vehicleStatusValues = Object.values(VEHICLE_STATUSES) as [string, ...string[]];
const driverStatusValues = Object.values(DRIVER_STATUSES) as [string, ...string[]];
const tripStatusValues = Object.values(TRIP_STATUSES) as [string, ...string[]];
const maintenanceStatusValues = Object.values(MAINTENANCE_STATUSES) as [string, ...string[]];
const vehicleTypeValues = [...VEHICLE_TYPES] as [string, ...string[]];
const expenseCategoryValues = [...EXPENSE_CATEGORIES] as [string, ...string[]];
const maintenanceTypeValues = [...MAINTENANCE_TYPES] as [string, ...string[]];

// ── Auth Schemas ────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(userRoleValues),
});

// ── Vehicle Schemas ─────────────────────────────────────────

export const createVehicleSchema = z.object({
  registrationNumber: z.string().min(1, 'Registration number is required').max(20, 'Registration number too long'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.coerce.number().int().min(1900, 'Year must be after 1900').max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
  type: z.enum(vehicleTypeValues, { errorMap: () => ({ message: 'Select a valid vehicle type' }) }),
  maxLoadCapacity: z.coerce.number().positive('Max load capacity must be positive'),
  currentOdometer: z.coerce.number().min(0, 'Odometer cannot be negative').default(0),
  acquisitionCost: z.coerce.number().min(0, 'Acquisition cost cannot be negative').default(0),
  region: z.string().default(''),
});

export const updateVehicleSchema = createVehicleSchema.partial();

// ── Driver Schemas ──────────────────────────────────────────

export const createDriverSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().default(''),
  licenseNumber: z.string().min(1, 'License number is required'),
  licenseExpiryDate: z.string().min(1, 'License expiry date is required'),
  safetyScore: z.coerce.number().min(0, 'Score cannot be negative').max(100, 'Score cannot exceed 100').default(100),
  region: z.string().default(''),
});

export const updateDriverSchema = createDriverSchema.partial();

// Field-level RBAC: Safety Officers can ONLY update these fields
export const updateDriverComplianceSchema = z.object({
  licenseNumber: z.string().min(1).optional(),
  licenseExpiryDate: z.string().min(1).optional(),
  safetyScore: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(driverStatusValues as [string, ...string[]]).optional(),
}).strict(); // .strict() rejects any field not in this schema

// ── Trip Schemas ────────────────────────────────────────────

export const createTripSchema = z.object({
  vehicleId: z.coerce.number().int().positive('Vehicle is required'),
  driverId: z.coerce.number().int().positive('Driver is required'),
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  cargoWeight: z.coerce.number().positive('Cargo weight must be positive'),
  cargoDescription: z.string().default(''),
  quotedRevenue: z.coerce.number().min(0, 'Revenue must be non-negative'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
});
// NOTE: Cargo weight vs. vehicle capacity is checked SERVER-SIDE in
// statusTransition.ts, not in the schema — the schema doesn't have
// access to the vehicle's maxLoadCapacity at parse time.

export const completeTripSchema = z.object({
  finalOdometer: z.coerce.number().positive('Final odometer reading is required'),
  fuelConsumed: z.coerce.number().positive('Fuel consumed is required'),
  distance: z.coerce.number().positive('Distance is required'),
});

// ── Maintenance Schemas ─────────────────────────────────────

export const createMaintenanceSchema = z.object({
  vehicleId: z.coerce.number().int().positive('Vehicle is required'),
  type: z.enum(maintenanceTypeValues, { errorMap: () => ({ message: 'Select a maintenance type' }) }),
  description: z.string().default(''),
  cost: z.coerce.number().min(0, 'Cost cannot be negative').default(0),
  startDate: z.string().optional(),
});

export const closeMaintenanceSchema = z.object({
  endDate: z.string().optional(),
  cost: z.coerce.number().min(0).optional(),
});

// ── Fuel Log Schemas ────────────────────────────────────────

export const createFuelLogSchema = z.object({
  vehicleId: z.coerce.number().int().positive('Vehicle is required'),
  tripId: z.coerce.number().int().positive().optional().nullable(),
  date: z.string().optional(),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  costPerUnit: z.coerce.number().positive('Cost per unit must be positive'),
  totalCost: z.coerce.number().min(0, 'Total cost cannot be negative'),
  odometer: z.coerce.number().min(0, 'Odometer cannot be negative'),
});

// ── Expense Schemas ─────────────────────────────────────────

export const createExpenseSchema = z.object({
  vehicleId: z.coerce.number().int().positive().optional().nullable(),
  category: z.enum(expenseCategoryValues, { errorMap: () => ({ message: 'Select a category' }) }),
  description: z.string().default(''),
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.string().optional(),
});
