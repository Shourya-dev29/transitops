// ============================================================
// TransitOps — Reports Page
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { Download, BarChart3, TrendingUp, IndianRupee, Fuel } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { api } from '../lib/api';
import { CHART_COLORS } from '@shared/constants';
import type { ReportData } from '@shared/types';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';

export default function Reports() {
  const { data: reportData, isLoading, isError, error, refetch } = useQuery<ReportData>({
    queryKey: ['reports'],
    queryFn: () => api.get('/reports'),
  });

  if (isLoading) return <LoadingState message="Calculating and gathering report analytics…" />;
  if (isError) return <ErrorState error={(error as Error).message} onRetry={() => refetch()} />;
  if (!reportData) return null;

  const handleExportCSV = (type: string) => {
    // Direct link to the CSV export endpoint
    window.open(`/api/reports/export/csv?type=${type}`, '_blank');
  };

  return (
    <div className="fade-in space-y-8 pb-12">
      <div className="page-header">
        <div>
          <h1>Reports & Analytics</h1>
          <p className="page-subtitle">Live computed operational insight and exportable spreadsheets</p>
        </div>
      </div>

      {/* ── 1. Fuel Efficiency Report ───────────────────────────── */}
      <div className="card">
        <div className="card-header flex justify-between items-center border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Fuel size={20} className="text-secondary" />
            <h2 className="text-lg font-semibold">Fuel Efficiency by Vehicle</h2>
          </div>
          <button className="btn btn-secondary flex items-center gap-1 text-sm py-1.5" onClick={() => handleExportCSV('fuel-efficiency')}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={reportData.fuelEfficiency} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="registrationNumber" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis label={{ value: 'km / L', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-secondary)' } }} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                  formatter={(value: any) => [`${Number(value).toFixed(2)} km/L`, 'Efficiency']}
                />
                <Bar dataKey="efficiency" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-secondary">
                  <th className="py-2">Vehicle</th>
                  <th className="py-2 text-right">Distance Run</th>
                  <th className="py-2 text-right">Fuel Consumed</th>
                  <th className="py-2 text-right">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {reportData.fuelEfficiency.map((item) => (
                  <tr key={item.vehicleId} className="border-b hover:bg-neutral-light/30 transition">
                    <td className="py-2 font-medium">{item.registrationNumber}</td>
                    <td className="py-2 text-right">{item.totalDistance.toLocaleString()} km</td>
                    <td className="py-2 text-right">{item.totalFuel.toLocaleString()} L</td>
                    <td className="py-2 text-right font-semibold">
                      {item.efficiency > 0 ? `${item.efficiency.toFixed(2)} km/L` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── 2. Operational Cost Rollup Report ───────────────────── */}
      <div className="card">
        <div className="card-header flex justify-between items-center border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <IndianRupee size={20} className="text-secondary" />
            <h2 className="text-lg font-semibold">Operational Cost Rollup</h2>
          </div>
          <button className="btn btn-secondary flex items-center gap-1 text-sm py-1.5" onClick={() => handleExportCSV('operational-cost')}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={reportData.operationalCost} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="registrationNumber" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, '']}
                />
                <Legend iconType="circle" />
                <Bar dataKey="fuelCost" name="Fuel Cost" stackId="a" fill={CHART_COLORS[0]} />
                <Bar dataKey="maintenanceCost" name="Maintenance" stackId="a" fill={CHART_COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-secondary">
                  <th className="py-2">Vehicle</th>
                  <th className="py-2 text-right">Fuel Cost</th>
                  <th className="py-2 text-right">Maintenance Cost</th>
                  <th className="py-2 text-right">Total Opcost</th>
                </tr>
              </thead>
              <tbody>
                {reportData.operationalCost.map((item) => (
                  <tr key={item.vehicleId} className="border-b hover:bg-neutral-light/30 transition">
                    <td className="py-2 font-medium">{item.registrationNumber}</td>
                    <td className="py-2 text-right">₹{item.fuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 text-right">₹{item.maintenanceCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 text-right font-semibold">₹{item.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── 3. Vehicle ROI Report ───────────────────────────────── */}
      <div className="card">
        <div className="card-header flex justify-between items-center border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-secondary" />
            <h2 className="text-lg font-semibold">Vehicle Return on Investment (ROI)</h2>
          </div>
          <button className="btn btn-secondary flex items-center gap-1 text-sm py-1.5" onClick={() => handleExportCSV('vehicle-roi')}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={reportData.vehicleROI} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="registrationNumber" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis label={{ value: 'ROI %', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-secondary)' } }} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                  formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'ROI']}
                />
                <Bar dataKey="roi" radius={[4, 4, 0, 0]}>
                  {reportData.vehicleROI.map((entry, index) => (
                    <cell key={`cell-${index}`} fill={entry.roi >= 0 ? 'var(--accent-green)' : 'var(--danger)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-secondary">
                  <th className="py-2">Vehicle</th>
                  <th className="py-2 text-right">Acquisition</th>
                  <th className="py-2 text-right">Revenue (Completed)</th>
                  <th className="py-2 text-right">Opcost</th>
                  <th className="py-2 text-right">ROI %</th>
                </tr>
              </thead>
              <tbody>
                {reportData.vehicleROI.map((item) => (
                  <tr key={item.vehicleId} className="border-b hover:bg-neutral-light/30 transition">
                    <td className="py-2 font-medium">{item.registrationNumber}</td>
                    <td className="py-2 text-right">₹{item.acquisitionCost.toLocaleString()}</td>
                    <td className="py-2 text-right">₹{item.revenue.toLocaleString()}</td>
                    <td className="py-2 text-right">₹{item.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className={`py-2 text-right font-semibold ${item.roi >= 0 ? 'text-accent-green' : 'text-danger'}`}>
                      {item.roi.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── 4. Fleet Utilization Trend ──────────────────────────── */}
      <div className="card">
        <div className="card-header flex justify-between items-center border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-secondary" />
            <h2 className="text-lg font-semibold">Fleet Utilization History</h2>
          </div>
          <button className="btn btn-secondary flex items-center gap-1 text-sm py-1.5" onClick={() => handleExportCSV('fleet-utilization')}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={reportData.fleetUtilization} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis domain={[0, 100]} label={{ value: 'Utilization %', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-secondary)' } }} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                  formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Utilization']}
                />
                <Bar dataKey="utilization" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-secondary">
                  <th className="py-2">Date</th>
                  <th className="py-2 text-right">Fleet Utilization Rate</th>
                </tr>
              </thead>
              <tbody>
                {reportData.fleetUtilization.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-neutral-light/30 transition">
                    <td className="py-2 font-medium">{item.date}</td>
                    <td className="py-2 text-right font-semibold text-accent-green">{item.utilization.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
