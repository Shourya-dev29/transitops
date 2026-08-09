// ============================================================
// TransitOps — Centralized Calculations Service
// ============================================================
// Single source of truth for ALL computed metrics. Every number
// displayed on dashboard/reports comes from here.
// ============================================================

import prisma from '../prisma.js';
import {
  VEHICLE_STATUSES,
  DRIVER_STATUSES,
  TRIP_STATUSES,
} from '../../shared/constants.js';

// ── Vehicle Operational Cost ────────────────────────────────
// Sum of fuel log totalCost + maintenance log cost for a vehicle

export async function getVehicleOperationalCost(vehicleId: number) {
  const [fuelAgg, maintenanceAgg] = await Promise.all([
    prisma.fuelLog.aggregate({
      where: { vehicleId },
      _sum: { totalCost: true },
    }),
    prisma.maintenanceLog.aggregate({
      where: { vehicleId },
      _sum: { cost: true },
    }),
  ]);

  const fuelCost = fuelAgg._sum.totalCost ?? 0;
  const maintenanceCost = maintenanceAgg._sum.cost ?? 0;

  return { fuelCost, maintenanceCost, totalCost: fuelCost + maintenanceCost };
}

// ── Fuel Efficiency ─────────────────────────────────────────
// Total distance from completed trips / total fuel consumed

export async function getFuelEfficiency(vehicleId: number) {
  const result = await prisma.trip.aggregate({
    where: {
      vehicleId,
      status: TRIP_STATUSES.COMPLETED,
      distance: { not: null },
      fuelConsumed: { not: null },
    },
    _sum: {
      distance: true,
      fuelConsumed: true,
    },
  });

  const totalDistance = result._sum.distance ?? 0;
  const totalFuel = result._sum.fuelConsumed ?? 0;

  if (totalFuel === 0) return null;

  return {
    totalDistance,
    totalFuel,
    efficiency: totalDistance / totalFuel,
  };
}

// ── Fleet Utilization ───────────────────────────────────────
// (vehicles ON_TRIP / total non-retired vehicles) * 100

export async function getFleetUtilization() {
  const [onTrip, totalNonRetired] = await Promise.all([
    prisma.vehicle.count({ where: { status: VEHICLE_STATUSES.ON_TRIP } }),
    prisma.vehicle.count({
      where: { status: { not: VEHICLE_STATUSES.RETIRED } },
    }),
  ]);

  if (totalNonRetired === 0) return 0;

  return (onTrip / totalNonRetired) * 100;
}

// ── Vehicle ROI ─────────────────────────────────────────────
// (revenue from COMPLETED trips - (maintenance + fuel costs)) / acquisitionCost * 100

export async function getVehicleROI(vehicleId: number) {
  const [vehicle, revenueAgg, costs] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: vehicleId } }),
    prisma.trip.aggregate({
      where: { vehicleId, status: TRIP_STATUSES.COMPLETED },
      _sum: { quotedRevenue: true },
    }),
    getVehicleOperationalCost(vehicleId),
  ]);

  if (!vehicle) {
    throw Object.assign(new Error(`Vehicle with ID ${vehicleId} not found`), { statusCode: 404 });
  }

  const revenue = revenueAgg._sum.quotedRevenue ?? 0;
  const acquisitionCost = vehicle.acquisitionCost || 1; // avoid division by zero

  return {
    revenue,
    cost: costs.totalCost,
    acquisitionCost: vehicle.acquisitionCost,
    roi: ((revenue - costs.totalCost) / acquisitionCost) * 100,
  };
}

// ── Dashboard KPIs ──────────────────────────────────────────

export async function getDashboardKPIs(filters?: {
  type?: string;
  status?: string;
  region?: string;
}) {
  const vehicleWhere: any = {};
  if (filters?.type) vehicleWhere.type = filters.type;
  if (filters?.status) vehicleWhere.status = filters.status;
  if (filters?.region) vehicleWhere.region = filters.region;

  const [
    activeVehicles,
    availableVehicles,
    vehiclesInMaintenance,
    retiredVehicles,
    activeTrips,
    pendingTrips,
    completedTrips,
    driversOnDuty,
    availableDrivers,
    fleetUtilization,
    revenueAgg,
    fuelCostAgg,
    maintenanceCostAgg,
  ] = await Promise.all([
    prisma.vehicle.count({
      where: {
        ...vehicleWhere,
        status: { not: VEHICLE_STATUSES.RETIRED },
      },
    }),
    prisma.vehicle.count({
      where: { ...vehicleWhere, status: VEHICLE_STATUSES.AVAILABLE },
    }),
    prisma.vehicle.count({
      where: { ...vehicleWhere, status: VEHICLE_STATUSES.IN_SHOP },
    }),
    prisma.vehicle.count({
      where: { ...vehicleWhere, status: VEHICLE_STATUSES.RETIRED },
    }),
    prisma.trip.count({ where: { status: TRIP_STATUSES.DISPATCHED } }),
    prisma.trip.count({ where: { status: TRIP_STATUSES.DRAFT } }),
    prisma.trip.count({ where: { status: TRIP_STATUSES.COMPLETED } }),
    prisma.driver.count({ where: { status: DRIVER_STATUSES.ON_TRIP } }),
    prisma.driver.count({ where: { status: DRIVER_STATUSES.AVAILABLE } }),
    getFleetUtilization(),
    prisma.trip.aggregate({
      where: { status: TRIP_STATUSES.COMPLETED },
      _sum: { quotedRevenue: true },
    }),
    prisma.fuelLog.aggregate({ _sum: { totalCost: true } }),
    prisma.maintenanceLog.aggregate({ _sum: { cost: true } }),
  ]);

  return {
    activeVehicles,
    availableVehicles,
    vehiclesInMaintenance,
    retiredVehicles,
    activeTrips,
    pendingTrips,
    completedTrips,
    driversOnDuty,
    availableDrivers,
    fleetUtilization: Math.round(fleetUtilization * 100) / 100,
    totalRevenue: revenueAgg._sum.quotedRevenue ?? 0,
    totalCost: (fuelCostAgg._sum.totalCost ?? 0) + (maintenanceCostAgg._sum.cost ?? 0),
  };
}

// ── Report Data ─────────────────────────────────────────────

export async function getReportData() {
  const vehicles = await prisma.vehicle.findMany({
    select: {
      id: true,
      registrationNumber: true,
      acquisitionCost: true,
    },
  });

  // Fuel efficiency per vehicle
  const fuelEfficiency = await Promise.all(
    vehicles.map(async (v) => {
      const eff = await getFuelEfficiency(v.id);
      return {
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        totalDistance: eff?.totalDistance ?? 0,
        totalFuel: eff?.totalFuel ?? 0,
        efficiency: eff?.efficiency ?? 0,
      };
    })
  );

  // Fleet utilization — snapshot
  const utilization = await getFleetUtilization();
  const fleetUtilization = [
    {
      date: new Date().toISOString().split('T')[0],
      utilization: Math.round(utilization * 100) / 100,
    },
  ];

  // Operational cost per vehicle
  const operationalCost = await Promise.all(
    vehicles.map(async (v) => {
      const costs = await getVehicleOperationalCost(v.id);
      return {
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        ...costs,
      };
    })
  );

  // Vehicle ROI
  const vehicleROI = await Promise.all(
    vehicles.map(async (v) => {
      const roi = await getVehicleROI(v.id);
      return {
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        ...roi,
      };
    })
  );

  return { fuelEfficiency, fleetUtilization, operationalCost, vehicleROI };
}
