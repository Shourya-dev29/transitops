import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createDriverSchema,
  updateDriverSchema,
  updateDriverComplianceSchema,
} from '../../shared/schemas.js';
import { USER_ROLES, DRIVER_STATUSES } from '../../shared/constants.js';
import {
  validateDriverTransition,
  canDeleteDriver,
} from '../services/statusTransition.js';

const router = Router();

// All driver routes require authentication
router.use(authenticate);

// ── GET / — list drivers ────────────────────────────────────
router.get(
  '/',
  authorize(USER_ROLES.FLEET_MANAGER, USER_ROLES.SAFETY_OFFICER, USER_ROLES.FINANCIAL_ANALYST),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, status, region } = req.query;

      const where: any = {};
      if (status) where.status = status;
      if (region) where.region = region;
      if (search) {
        where.OR = [
          { name: { contains: search as string } },
          { email: { contains: search as string } },
          { licenseNumber: { contains: search as string } },
        ];
      }

      const drivers = await prisma.driver.findMany({
        where,
        include: {
          _count: { select: { trips: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(drivers);
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /available — only AVAILABLE drivers with valid license
router.get('/available', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = {
      status: DRIVER_STATUSES.AVAILABLE,
      licenseExpiryDate: { gte: today },
    };

    // If logged in user is a DRIVER, they should only see themselves
    if (req.user && req.user.role === USER_ROLES.DRIVER) {
      where.email = req.user.email;
    }

    const drivers = await prisma.driver.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return res.json(drivers);
  } catch (err) {
    next(err);
  }
});

// ── GET /:id — single driver ────────────────────────────────
router.get(
  '/:id',
  authorize(USER_ROLES.FLEET_MANAGER, USER_ROLES.SAFETY_OFFICER, USER_ROLES.FINANCIAL_ANALYST),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const driver = await prisma.driver.findUnique({
        where: { id: parseInt(req.params.id) },
        include: {
          _count: { select: { trips: true } },
        },
      });

      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      return res.json(driver);
    } catch (err) {
      next(err);
    }
  }
);

// ── POST / — create driver ──────────────────────────────────
router.post(
  '/',
  authorize(USER_ROLES.FLEET_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createDriverSchema.parse(req.body);

      const driver = await prisma.driver.create({
        data: {
          ...data,
          licenseExpiryDate: new Date(data.licenseExpiryDate),
          status: DRIVER_STATUSES.AVAILABLE,
        },
      });

      return res.status(201).json(driver);
    } catch (err) {
      next(err);
    }
  }
);

// ── PATCH /:id — update driver (FIELD-LEVEL RBAC) ──────────
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const role = req.user!.role;

    let data: any;

    if (role === USER_ROLES.FLEET_MANAGER) {
      // Full access
      data = updateDriverSchema.parse(req.body);
    } else if (role === USER_ROLES.SAFETY_OFFICER) {
      // Restricted: only compliance fields, .strict() rejects extras
      data = updateDriverComplianceSchema.parse(req.body);
    } else {
      return res.status(403).json({
        error: 'Access denied. Only Fleet Managers and Safety Officers can update drivers.',
      });
    }

    // If status change is requested, validate transition
    if (data.status) {
      await validateDriverTransition(id, data.status);
    }

    // Convert licenseExpiryDate string to Date if present
    if (data.licenseExpiryDate) {
      data.licenseExpiryDate = new Date(data.licenseExpiryDate);
    }

    const driver = await prisma.driver.update({
      where: { id },
      data,
    });

    return res.json(driver);
  } catch (err: any) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

// ── DELETE /:id — delete driver ─────────────────────────────
router.delete(
  '/:id',
  authorize(USER_ROLES.FLEET_MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const deletable = await canDeleteDriver(id);

      if (!deletable) {
        return res.status(400).json({
          error:
            'Cannot delete driver with existing trip history. Suspend or deactivate the driver instead.',
        });
      }

      await prisma.driver.delete({ where: { id } });

      return res.json({ message: 'Driver deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
