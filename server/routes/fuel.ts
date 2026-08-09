import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createFuelLogSchema } from '../../shared/schemas.js';
import { USER_ROLES } from '../../shared/constants.js';

const router = Router();

// All fuel routes require authentication
router.use(authenticate);

// ── GET / — list fuel logs ──────────────────────────────────
router.get(
  '/',
  authorize(USER_ROLES.FLEET_MANAGER, USER_ROLES.FINANCIAL_ANALYST),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vehicleId } = req.query;

    const where: any = {};
    if (vehicleId) where.vehicleId = parseInt(vehicleId as string);

    const logs = await prisma.fuelLog.findMany({
      where,
      include: { vehicle: true },
      orderBy: { date: 'desc' },
    });

    return res.json(logs);
  } catch (err) {
    next(err);
  }
});

// ── POST / — create fuel log ────────────────────────────────
router.post(
  '/',
  authorize(USER_ROLES.FLEET_MANAGER, USER_ROLES.FINANCIAL_ANALYST),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createFuelLogSchema.parse(req.body);

      const log = await prisma.fuelLog.create({
        data: {
          vehicleId: data.vehicleId,
          tripId: data.tripId ?? null,
          date: data.date ? new Date(data.date) : new Date(),
          quantity: data.quantity,
          costPerUnit: data.costPerUnit,
          totalCost: data.totalCost,
          odometer: data.odometer,
        },
        include: { vehicle: true },
      });

      return res.status(201).json(log);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
