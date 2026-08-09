import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createTripSchema, completeTripSchema } from '../../shared/schemas.js';
import { USER_ROLES, TRIP_STATUSES } from '../../shared/constants.js';
import {
  dispatchTrip,
  completeTrip,
  cancelTrip,
} from '../services/statusTransition.js';

const router = Router();

// All trip routes require authentication
router.use(authenticate);

// ── GET / — list trips ──────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, vehicleId, driverId } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (vehicleId) where.vehicleId = parseInt(vehicleId as string);
    
    // Scoping for Driver role
    if (req.user && req.user.role === USER_ROLES.DRIVER) {
      const driverProfile = await prisma.driver.findUnique({
        where: { email: req.user.email },
      });
      if (!driverProfile) {
        return res.json([]);
      }
      where.driverId = driverProfile.id;
    } else if (driverId) {
      where.driverId = parseInt(driverId as string);
    }

    const trips = await prisma.trip.findMany({
      where,
      include: {
        vehicle: true,
        driver: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(trips);
  } catch (err) {
    next(err);
  }
});

// ── GET /:id — single trip ──────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        vehicle: true,
        driver: true,
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Scoping check for Driver role
    if (req.user && req.user.role === USER_ROLES.DRIVER && trip.driver?.email !== req.user.email) {
      return res.status(403).json({ error: 'Access denied: You can only view your own trips' });
    }

    return res.json(trip);
  } catch (err) {
    next(err);
  }
});

// ── POST / — create trip (as DRAFT) ────────────────────────
router.post(
  '/',
  authorize(USER_ROLES.FLEET_MANAGER, USER_ROLES.DRIVER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createTripSchema.parse(req.body);

      // Early feedback: check cargo weight vs vehicle capacity
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: data.vehicleId },
      });

      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      if (data.cargoWeight > vehicle.maxLoadCapacity) {
        return res.status(400).json({
          error: `Cargo weight ${data.cargoWeight}kg exceeds ${vehicle.registrationNumber}'s max capacity of ${vehicle.maxLoadCapacity}kg`,
        });
      }

      const trip = await prisma.trip.create({
        data: {
          ...data,
          scheduledDate: new Date(data.scheduledDate),
          status: TRIP_STATUSES.DRAFT,
        },
        include: {
          vehicle: true,
          driver: true,
        },
      });

      return res.status(201).json(trip);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /:id/dispatch — dispatch trip ──────────────────────
router.post(
  '/:id/dispatch',
  authorize(USER_ROLES.FLEET_MANAGER, USER_ROLES.DRIVER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const trip = await dispatchTrip(id);
      return res.json(trip);
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      next(err);
    }
  }
);

// ── POST /:id/complete — complete trip ──────────────────────
router.post(
  '/:id/complete',
  authorize(USER_ROLES.FLEET_MANAGER, USER_ROLES.DRIVER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const data = completeTripSchema.parse(req.body);
      const trip = await completeTrip(id, data);
      return res.json(trip);
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      next(err);
    }
  }
);

// ── POST /:id/cancel — cancel trip ─────────────────────────
router.post(
  '/:id/cancel',
  authorize(USER_ROLES.FLEET_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const trip = await cancelTrip(id);
      return res.json(trip);
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      next(err);
    }
  }
);

export default router;
