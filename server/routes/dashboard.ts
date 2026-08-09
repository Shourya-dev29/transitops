import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getDashboardKPIs } from '../services/calculations.js';

const router = Router();

// ── GET / — dashboard KPIs ──────────────────────────────────
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, status, region } = req.query;

    const filters: any = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (region) filters.region = region;

    const kpis = await getDashboardKPIs(filters);

    return res.json(kpis);
  } catch (err) {
    next(err);
  }
});

export default router;
