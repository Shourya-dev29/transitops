// ============================================================
// TransitOps — Centralized Status Transition Service
// ============================================================
// EVERY status change in the entire system goes through this
// file. Route handlers NEVER set status directly.
// ============================================================

import prisma from '../prisma.js';
import {
  VEHICLE_STATUSES,
  DRIVER_STATUSES,
  TRIP_STATUSES,
  MAINTENANCE_STATUSES,
  VEHICLE_STATUS_TRANSITIONS,
  DRIVER_STATUS_TRANSITIONS,
} from '../../shared/constants.js';

// ── Vehicle Transitions ─────────────────────────────────────

export async function validateVehicleTransition(
  vehicleId: number,
  targetStatus: string
) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    throw Object.assign(new Error(`Vehicle with ID ${vehicleId} not found`), { statusCode: 404 });
  }

  const currentStatus = vehicle.status as keyof typeof VEHICLE_STATUS_TRANSITIONS;
  const allowed = VEHICLE_STATUS_TRANSITIONS[currentStatus];

  if (!allowed || !allowed.includes(targetStatus as any)) {
    throw Object.assign(
      new Error(
        `Cannot transition vehicle from ${currentStatus} to ${targetStatus}. Allowed transitions: ${allowed?.join(', ') || 'none'}`
      ),
      { statusCode: 400 }
    );
  }

  return vehicle;
}

// ── Driver Transitions ──────────────────────────────────────

export async function validateDriverTransition(
  driverId: number,
  targetStatus: string
) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) {
    throw Object.assign(new Error(`Driver with ID ${driverId} not found`), { statusCode: 404 });
  }

  const currentStatus = driver.status as keyof typeof DRIVER_STATUS_TRANSITIONS;
  const allowed = DRIVER_STATUS_TRANSITIONS[currentStatus];

  if (!allowed || !allowed.includes(targetStatus as any)) {
    throw Object.assign(
      new Error(
        `Cannot transition driver from ${currentStatus} to ${targetStatus}. Allowed transitions: ${allowed?.join(', ') || 'none'}`
      ),
      { statusCode: 400 }
    );
  }

  return driver;
}

// ── Dispatch Trip ───────────────────────────────────────────

export async function dispatchTrip(tripId: number) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, driver: true },
    });

    if (!trip) {
      throw Object.assign(new Error(`Trip with ID ${tripId} not found`), { statusCode: 404 });
    }

    // 1. Verify trip is DRAFT
    if (trip.status !== TRIP_STATUSES.DRAFT) {
      throw Object.assign(
        new Error(`Trip cannot be dispatched — current status is ${trip.status}, expected DRAFT`),
        { statusCode: 400 }
      );
    }

    // 2. Verify vehicle is AVAILABLE
    if (trip.vehicle.status !== VEHICLE_STATUSES.AVAILABLE) {
      throw Object.assign(
        new Error(
          `Vehicle ${trip.vehicle.registrationNumber} is not available — current status is ${trip.vehicle.status}`
        ),
        { statusCode: 400 }
      );
    }

    // 3. Verify driver is AVAILABLE
    if (trip.driver.status !== DRIVER_STATUSES.AVAILABLE) {
      throw Object.assign(
        new Error(
          `Driver ${trip.driver.name} is not available — current status is ${trip.driver.status}`
        ),
        { statusCode: 400 }
      );
    }

    // 4. Verify driver's license is not expired
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (trip.driver.licenseExpiryDate < today) {
      throw Object.assign(
        new Error(
          `Driver ${trip.driver.name}'s license expired on ${trip.driver.licenseExpiryDate.toISOString().split('T')[0]}`
        ),
        { statusCode: 400 }
      );
    }

    // 5. Verify cargo weight <= vehicle capacity
    if (trip.cargoWeight > trip.vehicle.maxLoadCapacity) {
      throw Object.assign(
        new Error(
          `Cargo weight ${trip.cargoWeight}kg exceeds ${trip.vehicle.registrationNumber}'s max capacity of ${trip.vehicle.maxLoadCapacity}kg`
        ),
        { statusCode: 400 }
      );
    }

    // 6. Dispatch: update trip, vehicle, and driver atomically
    const updatedTrip = await tx.trip.update({
      where: { id: tripId },
      data: {
        status: TRIP_STATUSES.DISPATCHED,
        dispatchedAt: new Date(),
      },
      include: { vehicle: true, driver: true },
    });

    await tx.vehicle.update({
      where: { id: trip.vehicleId },
      data: { status: VEHICLE_STATUSES.ON_TRIP },
    });

    await tx.driver.update({
      where: { id: trip.driverId },
      data: { status: DRIVER_STATUSES.ON_TRIP },
    });

    return updatedTrip;
  });
}

// ── Complete Trip ───────────────────────────────────────────

export async function completeTrip(
  tripId: number,
  data: { finalOdometer: number; fuelConsumed: number; distance: number }
) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, driver: true },
    });

    if (!trip) {
      throw Object.assign(new Error(`Trip with ID ${tripId} not found`), { statusCode: 404 });
    }

    // Verify trip is DISPATCHED
    if (trip.status !== TRIP_STATUSES.DISPATCHED) {
      throw Object.assign(
        new Error(
          `Trip cannot be completed — current status is ${trip.status}, expected DISPATCHED`
        ),
        { statusCode: 400 }
      );
    }

    // Update trip
    const updatedTrip = await tx.trip.update({
      where: { id: tripId },
      data: {
        status: TRIP_STATUSES.COMPLETED,
        finalOdometer: data.finalOdometer,
        fuelConsumed: data.fuelConsumed,
        distance: data.distance,
        completedAt: new Date(),
      },
      include: { vehicle: true, driver: true },
    });

    // Update vehicle odometer and revert status
    await tx.vehicle.update({
      where: { id: trip.vehicleId },
      data: {
        currentOdometer: data.finalOdometer,
        status: VEHICLE_STATUSES.AVAILABLE,
      },
    });

    // Revert driver status
    await tx.driver.update({
      where: { id: trip.driverId },
      data: { status: DRIVER_STATUSES.AVAILABLE },
    });

    return updatedTrip;
  });
}

// ── Cancel Trip ─────────────────────────────────────────────

export async function cancelTrip(tripId: number) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, driver: true },
    });

    if (!trip) {
      throw Object.assign(new Error(`Trip with ID ${tripId} not found`), { statusCode: 404 });
    }

    // Verify trip is DRAFT or DISPATCHED
    if (
      trip.status !== TRIP_STATUSES.DRAFT &&
      trip.status !== TRIP_STATUSES.DISPATCHED
    ) {
      throw Object.assign(
        new Error(
          `Trip cannot be cancelled — current status is ${trip.status}. Only DRAFT or DISPATCHED trips can be cancelled`
        ),
        { statusCode: 400 }
      );
    }

    const wasDispatched = trip.status === TRIP_STATUSES.DISPATCHED;

    // Cancel trip
    const updatedTrip = await tx.trip.update({
      where: { id: tripId },
      data: {
        status: TRIP_STATUSES.CANCELLED,
        cancelledAt: new Date(),
      },
      include: { vehicle: true, driver: true },
    });

    // If was dispatched, revert vehicle and driver
    if (wasDispatched) {
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: VEHICLE_STATUSES.AVAILABLE },
      });

      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: DRIVER_STATUSES.AVAILABLE },
      });
    }

    return updatedTrip;
  });
}

// ── Open Maintenance ────────────────────────────────────────

export async function openMaintenance(maintenanceId: number) {
  const maintenance = await prisma.maintenanceLog.findUnique({
    where: { id: maintenanceId },
    include: { vehicle: true },
  });

  if (!maintenance) {
    throw Object.assign(new Error(`Maintenance log with ID ${maintenanceId} not found`), {
      statusCode: 404,
    });
  }

  // Set vehicle to IN_SHOP unless it's RETIRED
  if (maintenance.vehicle.status !== VEHICLE_STATUSES.RETIRED) {
    await prisma.vehicle.update({
      where: { id: maintenance.vehicleId },
      data: { status: VEHICLE_STATUSES.IN_SHOP },
    });
  }

  return maintenance;
}

// ── Close Maintenance ───────────────────────────────────────

export async function closeMaintenance(
  maintenanceId: number,
  data?: { endDate?: string; cost?: number }
) {
  const maintenance = await prisma.maintenanceLog.findUnique({
    where: { id: maintenanceId },
    include: { vehicle: true },
  });

  if (!maintenance) {
    throw Object.assign(new Error(`Maintenance log with ID ${maintenanceId} not found`), {
      statusCode: 404,
    });
  }

  if (maintenance.status === MAINTENANCE_STATUSES.CLOSED) {
    throw Object.assign(new Error('Maintenance record is already closed'), {
      statusCode: 400,
    });
  }

  // Close the maintenance record
  const updated = await prisma.maintenanceLog.update({
    where: { id: maintenanceId },
    data: {
      status: MAINTENANCE_STATUSES.CLOSED,
      endDate: data?.endDate ? new Date(data.endDate) : new Date(),
      ...(data?.cost !== undefined && { cost: data.cost }),
    },
    include: { vehicle: true },
  });

  // Revert vehicle to AVAILABLE if it's IN_SHOP (keep RETIRED if RETIRED)
  if (maintenance.vehicle.status === VEHICLE_STATUSES.IN_SHOP) {
    await prisma.vehicle.update({
      where: { id: maintenance.vehicleId },
      data: { status: VEHICLE_STATUSES.AVAILABLE },
    });
  }

  return updated;
}

// ── Delete Guards ───────────────────────────────────────────

export async function canDeleteVehicle(vehicleId: number): Promise<boolean> {
  const counts = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      _count: {
        select: {
          trips: true,
          maintenanceLogs: true,
          fuelLogs: true,
        },
      },
    },
  });

  if (!counts) {
    throw Object.assign(new Error(`Vehicle with ID ${vehicleId} not found`), { statusCode: 404 });
  }

  return (
    counts._count.trips === 0 &&
    counts._count.maintenanceLogs === 0 &&
    counts._count.fuelLogs === 0
  );
}

export async function canDeleteDriver(driverId: number): Promise<boolean> {
  const counts = await prisma.driver.findUnique({
    where: { id: driverId },
    include: {
      _count: {
        select: { trips: true },
      },
    },
  });

  if (!counts) {
    throw Object.assign(new Error(`Driver with ID ${driverId} not found`), { statusCode: 404 });
  }

  return counts._count.trips === 0;
}
