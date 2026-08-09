import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { USER_ROLES } from '../../shared/constants.js';
import { getReportData } from '../services/calculations.js';

const router = Router();

// ── GET / — report data (JSON) ──────────────────────────────
router.get(
  '/',
  authenticate,
  authorize(USER_ROLES.FLEET_MANAGER, USER_ROLES.FINANCIAL_ANALYST),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getReportData();
      return res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /export/csv — CSV export ────────────────────────────
router.get(
  '/export/csv',
  authenticate,
  authorize(USER_ROLES.FLEET_MANAGER, USER_ROLES.FINANCIAL_ANALYST),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reportType = (req.query.type as string) || 'fuel-efficiency';
      const data = await getReportData();

      let csv = '';
      let filename = 'report.csv';

      switch (reportType) {
        case 'fuel-efficiency':
          filename = 'fuel-efficiency.csv';
          csv = 'Vehicle ID,Registration Number,Total Distance (km),Total Fuel (L),Efficiency (km/L)\n';
          csv += data.fuelEfficiency
            .map(
              (r) =>
                `${r.vehicleId},${r.registrationNumber},${r.totalDistance},${r.totalFuel},${r.efficiency.toFixed(2)}`
            )
            .join('\n');
          break;

        case 'fleet-utilization':
          filename = 'fleet-utilization.csv';
          csv = 'Date,Utilization (%)\n';
          csv += data.fleetUtilization
            .map((r) => `${r.date},${r.utilization}`)
            .join('\n');
          break;

        case 'operational-cost':
          filename = 'operational-cost.csv';
          csv = 'Vehicle ID,Registration Number,Fuel Cost,Maintenance Cost,Total Cost\n';
          csv += data.operationalCost
            .map(
              (r) =>
                `${r.vehicleId},${r.registrationNumber},${r.fuelCost.toFixed(2)},${r.maintenanceCost.toFixed(2)},${r.totalCost.toFixed(2)}`
            )
            .join('\n');
          break;

        case 'vehicle-roi':
          filename = 'vehicle-roi.csv';
          csv = 'Vehicle ID,Registration Number,Revenue,Cost,Acquisition Cost,ROI (%)\n';
          csv += data.vehicleROI
            .map(
              (r) =>
                `${r.vehicleId},${r.registrationNumber},${r.revenue.toFixed(2)},${r.cost.toFixed(2)},${r.acquisitionCost.toFixed(2)},${r.roi.toFixed(2)}`
            )
            .join('\n');
          break;

        default:
          return res.status(400).json({
            error: `Invalid report type: ${reportType}. Valid types: fuel-efficiency, fleet-utilization, operational-cost, vehicle-roi`,
          });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      return res.send(csv);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
