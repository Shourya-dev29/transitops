// ============================================================
// TransitOps — Dashboard Page
// ============================================================

import { useQuery } from '@tanstack/react-query';
import {
  Truck, Users, Route, Wrench, TrendingUp, IndianRupee, Clock, CheckCircle,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../lib/api';
import { CHART_COLORS, STATUS_COLORS } from '@shared/constants';
import type { DashboardKPIs } from '@shared/types';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';

export default function Dashboard() {
  const { data: kpis, isLoading, isError, error, refetch } = useQuery<DashboardKPIs>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard'),
  });

  if (isLoading) return <LoadingState message="Loading dashboard…" />;
  if (isError) return <ErrorState error={(error as Error).message} onRetry={() => refetch()} />;
  if (!kpis) return null;

  const kpiCards = [
    { label: 'Active Vehicles', value: kpis.activeVehicles, icon: Truck, color: 'var(--accent-green)', bg: 'var(--accent-green-light)' },
    { label: 'Available Vehicles', value: kpis.availableVehicles, icon: CheckCircle, color: 'var(--accent-green)', bg: 'var(--accent-green-light)' },
    { label: 'In Maintenance', value: kpis.vehiclesInMaintenance, icon: Wrench, color: 'var(--accent-rust)', bg: 'var(--accent-rust-light)' },
    { label: 'Active Trips', value: kpis.activeTrips, icon: Route, color: 'var(--accent-rust)', bg: 'var(--accent-rust-light)' },
    { label: 'Pending Trips', value: kpis.pendingTrips, icon: Clock, color: 'var(--neutral)', bg: 'var(--neutral-light)' },
    { label: 'Drivers On Duty', value: kpis.driversOnDuty, icon: Users, color: 'var(--accent-green)', bg: 'var(--accent-green-light)' },
    { label: 'Fleet Utilization', value: `${kpis.fleetUtilization}%`, icon: TrendingUp, color: 'var(--accent-green)', bg: 'var(--accent-green-light)' },
    { label: 'Total Revenue', value: `₹${kpis.totalRevenue.toLocaleString()}`, icon: IndianRupee, color: 'var(--accent-green)', bg: 'var(--accent-green-light)' },
  ];

  const fleetStatusData = [
    { name: 'Available', value: kpis.availableVehicles, color: STATUS_COLORS.AVAILABLE.text },
    { name: 'On Trip', value: kpis.activeTrips, color: STATUS_COLORS.ON_TRIP.text },
    { name: 'In Shop', value: kpis.vehiclesInMaintenance, color: STATUS_COLORS.IN_SHOP.text },
    { name: 'Retired', value: kpis.retiredVehicles, color: STATUS_COLORS.RETIRED.text },
  ].filter((d) => d.value > 0);

  const tripStatusData = [
    { name: 'Draft', count: kpis.pendingTrips, fill: CHART_COLORS[3] },
    { name: 'Dispatched', count: kpis.activeTrips, fill: CHART_COLORS[1] },
    { name: 'Completed', count: kpis.completedTrips, fill: CHART_COLORS[0] },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid-kpi">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="kpi-icon" style={{ background: kpi.bg }}>
              <kpi.icon size={20} color={kpi.color} />
            </div>
            <div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid-charts">
        {/* Fleet Status Pie */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Fleet Status</span>
          </div>
          {fleetStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={fleetStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {fleetStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.8125rem',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '0.75rem' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-secondary text-sm" style={{ padding: '2rem', textAlign: 'center' }}>
              No fleet data available
            </p>
          )}
        </div>

        {/* Trip Status Bar */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Trip Overview</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={tripStatusData}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.8125rem',
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {tripStatusData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
