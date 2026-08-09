import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createVehicleSchema, updateVehicleSchema } from '../../shared/schemas.js';
import { USER_ROLES, VEHICLE_STATUSES } from '../../shared/constants.js';
import {
  validateVehicleTransition,
  canDeleteVehicle,
} from '../services/statusTransition.js';

const router = Router();

// All vehicle routes require authentication
router.use(authenticate);

// ── GET / — list vehicles ───────────────────────────────────
router.get(
  '/',
  authorize(USER_ROLES.FLEET_MANAGER, USER_ROLES.SAFETY_OFFICER, USER_ROLES.FINANCIAL_ANALYST),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, status, region, search } = req.query;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (region) where.region = region;
    if (search) {
      where.OR = [
        { registrationNumber: { contains: search as string } },
        { make: { contains: search as string } },
        { model: { contains: search as string } },
      ];
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        _count: {
          select: {
            trips: true,
            maintenanceLogs: true,
            fuelLogs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(vehicles);
  } catch (err) {
    next(err);
  }
});

// ── GET /available — only AVAILABLE vehicles ────────────────
router.get('/available', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { status: VEHICLE_STATUSES.AVAILABLE },
      orderBy: { registrationNumber: 'asc' },
    });

    return res.json(vehicles);
  } catch (err) {
    next(err);
  }
});

// ── GET /:id — single vehicle ───────────────────────────────
router.get(
  '/:id',
  authorize(USER_ROLES.FLEET_MANAGER, USER_ROLES.SAFETY_OFFICER, USER_ROLES.FINANCIAL_ANALYST),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: parseInt(req.params.id) },
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

      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }

      return res.json(vehicle);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST / — create vehicle ────────────────────────────────
router.post(
  '/',
  authorize(USER_ROLES.FLEET_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createVehicleSchema.parse(req.body);

      const vehicle = await prisma.vehicle.create({
        data: {
          ...data,
          status: VEHICLE_STATUSES.AVAILABLE,
        },
      });

      return res.status(201).json(vehicle);
    } catch (err) {
      next(err);
    }
  }
);

// ── PATCH /:id — update vehicle ────────────────────────────
router.patch(
  '/:id',
  authorize(USER_ROLES.FLEET_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateVehicleSchema.parse(req.body);

      const vehicle = await prisma.vehicle.update({
        where: { id: parseInt(req.params.id) },
        data,
      });

      return res.json(vehicle);
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /:id — delete vehicle ───────────────────────────
router.delete(
  '/:id',
  authorize(USER_ROLES.FLEET_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const deletable = await canDeleteVehicle(id);

      if (!deletable) {
        return res.status(400).json({
          error:
            'Cannot delete vehicle with existing trip, maintenance, or fuel history. Retire the vehicle instead.',
        });
      }

      await prisma.vehicle.delete({ where: { id } });

      return res.json({ message: 'Vehicle deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

// ── PATCH /:id/status — manual status change ───────────────
router.patch(
  '/:id/status',
  authorize(USER_ROLES.FLEET_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      // Validate transition via centralized service
      await validateVehicleTransition(id, status);

      const vehicle = await prisma.vehicle.update({
        where: { id },
        data: { status },
      });

      return res.json(vehicle);
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      next(err);
    }
  }
);

export default router;
