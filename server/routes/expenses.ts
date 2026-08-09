import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createExpenseSchema } from '../../shared/schemas.js';
import { USER_ROLES } from '../../shared/constants.js';

const router = Router();

// All expense routes require authentication
router.use(authenticate);

// ── GET / — list expenses ───────────────────────────────────
router.get(
  '/',
  authorize(USER_ROLES.FLEET_MANAGER, USER_ROLES.FINANCIAL_ANALYST),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vehicleId, category } = req.query;

    const where: any = {};
    if (vehicleId) where.vehicleId = parseInt(vehicleId as string);
    if (category) where.category = category;

    const expenses = await prisma.expense.findMany({
      where,
      include: { vehicle: true },
      orderBy: { date: 'desc' },
    });

    return res.json(expenses);
  } catch (err) {
    next(err);
  }
});

// ── POST / — create expense ────────────────────────────────
router.post(
  '/',
  authorize(USER_ROLES.FLEET_MANAGER, USER_ROLES.FINANCIAL_ANALYST),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createExpenseSchema.parse(req.body);

      const expense = await prisma.expense.create({
        data: {
          vehicleId: data.vehicleId ?? null,
          category: data.category,
          description: data.description ?? '',
          amount: data.amount,
          date: data.date ? new Date(data.date) : new Date(),
        },
        include: { vehicle: true },
      });

      return res.status(201).json(expense);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
