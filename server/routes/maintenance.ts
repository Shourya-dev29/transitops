import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createMaintenanceSchema } from '../../shared/schemas.js';
import { USER_ROLES, MAINTENANCE_STATUSES } from '../../shared/constants.js';
import {
  openMaintenance,
  closeMaintenance,
} from '../services/statusTransition.js';

const router = Router();

// All maintenance routes require authentication
router.use(authenticate);

// ── GET / — list maintenance logs ───────────────────────────
router.get(
  '/',
  authorize(USER_ROLES.FLEET_MANAGER, USER_ROLES.SAFETY_OFFICER, USER_ROLES.FINANCIAL_ANALYST),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vehicleId, status } = req.query;

    const where: any = {};
    if (vehicleId) where.vehicleId = parseInt(vehicleId as string);
    if (status) where.status = status;

    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(logs);
  } catch (err) {
    next(err);
  }
});

// ── GET /:id — single maintenance log ──────────────────────
router.get(
  '/:id',
  authorize(USER_ROLES.FLEET_MANAGER, USER_ROLES.SAFETY_OFFICER, USER_ROLES.FINANCIAL_ANALYST),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const log = await prisma.maintenanceLog.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { vehicle: true },
    });

    if (!log) {
      return res.status(404).json({ error: 'Maintenance log not found' });
    }

    return res.json(log);
  } catch (err) {
    next(err);
  }
});

// ── POST / — create maintenance log ────────────────────────
router.post(
  '/',
  authorize(USER_ROLES.FLEET_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createMaintenanceSchema.parse(req.body);

      const log = await prisma.maintenanceLog.create({
        data: {
          vehicleId: data.vehicleId,
          type: data.type,
          description: data.description ?? '',
          cost: data.cost ?? 0,
          startDate: data.startDate ? new Date(data.startDate) : new Date(),
          status: MAINTENANCE_STATUSES.OPEN,
        },
        include: { vehicle: true },
      });

      // Set vehicle to IN_SHOP via centralized service
      await openMaintenance(log.id);

      return res.status(201).json(log);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /:id/close — close maintenance log ────────────────
router.post(
  '/:id/close',
  authorize(USER_ROLES.FLEET_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const log = await closeMaintenance(id, req.body);
      return res.json(log);
    } catch (err: any) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      next(err);
    }
  }
);

export default router;
