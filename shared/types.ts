// ============================================================
// TransitOps — Shared TypeScript Types
// ============================================================
// Derived from Zod schemas where possible, supplemented with
// API response types for frontend consumption.
// ============================================================

import { z } from 'zod';
import type { UserRole, VehicleStatus, DriverStatus, TripStatus, MaintenanceStatus } from './constants.js';
import {
  loginSchema,
  createVehicleSchema,
  createDriverSchema,
  createTripSchema,
  completeTripSchema,
  createMaintenanceSchema,
  createFuelLogSchema,
  createExpenseSchema,
} from './schemas.js';

// ── Inferred Input Types ────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type CompleteTripInput = z.infer<typeof completeTripSchema>;
export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type CreateFuelLogInput = z.infer<typeof createFuelLogSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

// ── API Response Types ──────────────────────────────────────

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Vehicle {
  id: number;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  type: string;
  status: VehicleStatus;
  maxLoadCapacity: number;
  currentOdometer: number;
  acquisitionCost: number;
  region: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    trips: number;
    maintenanceLogs: number;
    fuelLogs: number;
  };
}

export interface Driver {
  id: number;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  status: DriverStatus;
  safetyScore: number;
  region: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    trips: number;
  };
}

export interface Trip {
  id: number;
  vehicleId: number;
  driverId: number;
  origin: string;
  destination: string;
  cargoWeight: number;
  cargoDescription: string;
  quotedRevenue: number;
  status: TripStatus;
  scheduledDate: string;
  dispatchedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  finalOdometer: number | null;
  fuelConsumed: number | null;
  distance: number | null;
  createdAt: string;
  updatedAt: string;
  vehicle?: Vehicle;
  driver?: Driver;
}

export interface MaintenanceLog {
  id: number;
  vehicleId: number;
  type: string;
  description: string;
  cost: number;
  startDate: string;
  endDate: string | null;
  status: MaintenanceStatus;
  createdAt: string;
  updatedAt: string;
  vehicle?: Vehicle;
}

export interface FuelLog {
  id: number;
  vehicleId: number;
  tripId: number | null;
  date: string;
  quantity: number;
  costPerUnit: number;
  totalCost: number;
  odometer: number;
  createdAt: string;
  updatedAt: string;
  vehicle?: Vehicle;
  trip?: Trip;
}

export interface Expense {
  id: number;
  vehicleId: number | null;
  category: string;
  description: string;
  amount: number;
  date: string;
  createdAt: string;
  updatedAt: string;
  vehicle?: Vehicle;
}

// ── Dashboard Types ─────────────────────────────────────────

export interface DashboardKPIs {
  activeVehicles: number;
  availableVehicles: number;
  vehiclesInMaintenance: number;
  retiredVehicles: number;
  activeTrips: number;
  pendingTrips: number;
  completedTrips: number;
  driversOnDuty: number;
  availableDrivers: number;
  fleetUtilization: number; // percentage
  totalRevenue: number;
  totalCost: number;
}

export interface ReportData {
  fuelEfficiency: { vehicleId: number; registrationNumber: string; totalDistance: number; totalFuel: number; efficiency: number }[];
  fleetUtilization: { date: string; utilization: number }[];
  operationalCost: { vehicleId: number; registrationNumber: string; fuelCost: number; maintenanceCost: number; totalCost: number }[];
  vehicleROI: { vehicleId: number; registrationNumber: string; revenue: number; cost: number; acquisitionCost: number; roi: number }[];
}

// ── API Error Type ──────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: string;
}
