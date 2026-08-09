// ============================================================
// TransitOps — Trips Page
// ============================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Play, CheckCircle, XCircle, Eye, Search } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { createTripSchema, completeTripSchema } from '@shared/schemas';
import { TRIP_STATUSES, PERMISSIONS } from '@shared/constants';
import type { Trip, Vehicle, Driver, CreateTripInput, CompleteTripInput } from '@shared/types';
import DataTable, { type Column } from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Trips() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusTab, setStatusTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completingTrip, setCompletingTrip] = useState<Trip | null>(null);
  const [serverError, setServerError] = useState('');

  const canCreate = user && PERMISSIONS[user.role]?.trips?.includes('create');
  const canDispatch = user && PERMISSIONS[user.role]?.trips?.includes('dispatch');
  const canComplete = user && PERMISSIONS[user.role]?.trips?.includes('complete');
  const canCancel = user && PERMISSIONS[user.role]?.trips?.includes('cancel');

  const { data: trips = [], isLoading, isError, error, refetch } = useQuery<Trip[]>({
    queryKey: ['trips'],
    queryFn: () => api.get('/trips'),
  });

  const { data: availableVehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles', 'available'],
    queryFn: () => api.get('/vehicles/available'),
    enabled: createOpen,
  });

  const { data: availableDrivers = [] } = useQuery<Driver[]>({
    queryKey: ['drivers', 'available'],
    queryFn: () => api.get('/drivers/available'),
    enabled: createOpen,
  });

  // Create Trip form
  const createForm = useForm<CreateTripInput>({
    resolver: zodResolver(createTripSchema),
  });

  // Complete Trip form
  const completeForm = useForm<CompleteTripInput>({
    resolver: zodResolver(completeTripSchema),
  });

  const selectedVehicleId = createForm.watch('vehicleId');
  const selectedVehicle = availableVehicles.find((v) => v.id === Number(selectedVehicleId));

  const createMutation = useMutation({
    mutationFn: (data: CreateTripInput) => api.post<Trip>('/trips', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setCreateOpen(false);
      createForm.reset();
      setServerError('');
    },
    onError: (err: Error) => setServerError(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action, data }: { id: number; action: string; data?: CompleteTripInput }) =>
      api.patch<Trip>(`/trips/${id}/${action}`, data || {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setCompleteOpen(false);
      setCompletingTrip(null);
      setServerError('');
    },
    onError: (err: Error) => setServerError(err.message),
  });

  const openComplete = (trip: Trip) => {
    setCompletingTrip(trip);
    setServerError('');
    completeForm.reset({
      finalOdometer: 0,
      fuelConsumed: 0,
      distance: 0,
    });
    setCompleteOpen(true);
  };

  const handleDispatch = (trip: Trip) => {
    if (!confirm(`Dispatch trip #${trip.id}?`)) return;
    statusMutation.mutate({ id: trip.id, action: 'dispatch' });
  };

  const handleCancel = (trip: Trip) => {
    if (!confirm(`Cancel trip #${trip.id}? This cannot be undone.`)) return;
    statusMutation.mutate({ id: trip.id, action: 'cancel' });
  };

  // Filtered data
  const tabs = ['ALL', ...Object.values(TRIP_STATUSES)];
  const filtered = trips.filter((t) => {
    if (statusTab !== 'ALL' && t.status !== statusTab) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !t.origin.toLowerCase().includes(s) &&
        !t.destination.toLowerCase().includes(s) &&
        !t.vehicle?.registrationNumber?.toLowerCase().includes(s) &&
        !t.driver?.name?.toLowerCase().includes(s) &&
        !String(t.id).includes(s)
      )
        return false;
    }
    return true;
  });

  const columns: Column<Trip>[] = [
    {
      key: 'id',
      header: 'Trip ID',
      sortable: true,
      render: (t) => <span style={{ fontWeight: 600 }}>#{t.id}</span>,
    },
    {
      key: 'route',
      header: 'Route',
      render: (t) => (
        <span>
          {t.origin} <span style={{ color: 'var(--neutral)' }}>→</span> {t.destination}
        </span>
      ),
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (t) => t.vehicle?.registrationNumber || '—',
    },
    {
      key: 'driver',
      header: 'Driver',
      render: (t) => t.driver?.name || '—',
    },
    {
      key: 'cargoWeight',
      header: 'Cargo (kg)',
      sortable: true,
      align: 'right',
      render: (t) => t.cargoWeight.toLocaleString(),
    },
    {
      key: 'quotedRevenue',
      header: 'Revenue',
      sortable: true,
      align: 'right',
      render: (t) => `₹${t.quotedRevenue.toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <StatusBadge status={t.status} />,
      sortable: true,
    },
    {
      key: 'scheduledDate',
      header: 'Scheduled',
      sortable: true,
      render: (t) => formatDate(t.scheduledDate),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (t) => (
        <div className="flex gap-xs">
          {t.status === 'DRAFT' && canDispatch && (
            <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleDispatch(t); }} title="Dispatch" style={{ color: 'var(--accent-green)' }}>
              <Play size={14} />
            </button>
          )}
          {t.status === 'DISPATCHED' && canComplete && (
            <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openComplete(t); }} title="Complete" style={{ color: 'var(--accent-green)' }}>
              <CheckCircle size={14} />
            </button>
          )}
          {(t.status === 'DRAFT' || t.status === 'DISPATCHED') && canCancel && (
            <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleCancel(t); }} title="Cancel" style={{ color: 'var(--danger)' }}>
              <XCircle size={14} />
            </button>
          )}
          {(t.status === 'COMPLETED' || t.status === 'CANCELLED') && (
            <button className="btn-ghost btn-sm" title="View" style={{ color: 'var(--neutral)' }}>
              <Eye size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) return <LoadingState message="Loading trips…" />;
  if (isError) return <ErrorState error={(error as Error).message} onRetry={() => refetch()} />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Trip Management</h1>
        {canCreate && (
          <button className="btn-primary" onClick={() => { setServerError(''); createForm.reset(); setCreateOpen(true); }}>
            <Plus size={16} />
            Create Trip
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div className="filter-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`filter-tab ${statusTab === tab ? 'active' : ''}`}
            onClick={() => setStatusTab(tab)}
          >
            {tab === 'ALL' ? 'All' : tab.replace('_', ' ')}
            {tab !== 'ALL' && (
              <span style={{ marginLeft: 4, opacity: 0.6 }}>
                ({trips.filter((t) => t.status === tab).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="page-filters">
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral)' }} />
          <input
            placeholder="Search origin, destination, vehicle, driver…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered as unknown as Record<string, unknown>[]}
        emptyMessage="No trips found"
        keyExtractor={(t) => (t as unknown as Trip).id}
      />

      {/* Create Trip Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Trip" size="lg">
        {serverError && <div className="server-error">{serverError}</div>}
        <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}>
          <div className="form-row">
            <div className="form-group">
              <label>Vehicle</label>
              <select {...createForm.register('vehicleId')}>
                <option value="">Select a vehicle…</option>
                {availableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber} ({v.make} {v.model})
                  </option>
                ))}
              </select>
              {selectedVehicle && (
                <p className="form-hint">Max capacity: {selectedVehicle.maxLoadCapacity.toLocaleString()} kg</p>
              )}
              {createForm.formState.errors.vehicleId && (
                <p className="form-error">{createForm.formState.errors.vehicleId.message}</p>
              )}
            </div>
            <div className="form-group">
              <label>Driver</label>
              <select {...createForm.register('driverId')}>
                <option value="">Select a driver…</option>
                {availableDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {createForm.formState.errors.driverId && (
                <p className="form-error">{createForm.formState.errors.driverId.message}</p>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Origin</label>
              <input {...createForm.register('origin')} />
              {createForm.formState.errors.origin && (
                <p className="form-error">{createForm.formState.errors.origin.message}</p>
              )}
            </div>
            <div className="form-group">
              <label>Destination</label>
              <input {...createForm.register('destination')} />
              {createForm.formState.errors.destination && (
                <p className="form-error">{createForm.formState.errors.destination.message}</p>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cargo Weight (kg)</label>
              <input type="number" step="0.01" {...createForm.register('cargoWeight')} />
              {createForm.formState.errors.cargoWeight && (
                <p className="form-error">{createForm.formState.errors.cargoWeight.message}</p>
              )}
            </div>
            <div className="form-group">
              <label>Quoted Revenue (₹)</label>
              <input type="number" step="0.01" {...createForm.register('quotedRevenue')} />
              {createForm.formState.errors.quotedRevenue && (
                <p className="form-error">{createForm.formState.errors.quotedRevenue.message}</p>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cargo Description</label>
              <input {...createForm.register('cargoDescription')} />
            </div>
            <div className="form-group">
              <label>Scheduled Date</label>
              <input type="date" {...createForm.register('scheduledDate')} />
              {createForm.formState.errors.scheduledDate && (
                <p className="form-error">{createForm.formState.errors.scheduledDate.message}</p>
              )}
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '1rem 0 0' }}>
            <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} />
                  Creating…
                </>
              ) : (
                'Create Trip'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Complete Trip Modal */}
      <Modal isOpen={completeOpen} onClose={() => { setCompleteOpen(false); setCompletingTrip(null); }} title={`Complete Trip #${completingTrip?.id || ''}`} size="md">
        {serverError && <div className="server-error">{serverError}</div>}
        <form
          onSubmit={completeForm.handleSubmit((data) => {
            if (completingTrip) {
              statusMutation.mutate({ id: completingTrip.id, action: 'complete', data });
            }
          })}
        >
          <div className="form-group">
            <label>Final Odometer (km)</label>
            <input type="number" step="0.01" {...completeForm.register('finalOdometer')} />
            {completeForm.formState.errors.finalOdometer && (
              <p className="form-error">{completeForm.formState.errors.finalOdometer.message}</p>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fuel Consumed (L)</label>
              <input type="number" step="0.01" {...completeForm.register('fuelConsumed')} />
              {completeForm.formState.errors.fuelConsumed && (
                <p className="form-error">{completeForm.formState.errors.fuelConsumed.message}</p>
              )}
            </div>
            <div className="form-group">
              <label>Distance (km)</label>
              <input type="number" step="0.01" {...completeForm.register('distance')} />
              {completeForm.formState.errors.distance && (
                <p className="form-error">{completeForm.formState.errors.distance.message}</p>
              )}
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '1rem 0 0' }}>
            <button type="button" className="btn-secondary" onClick={() => setCompleteOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={statusMutation.isPending}>
              {statusMutation.isPending ? (
                <>
                  <div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} />
                  Completing…
                </>
              ) : (
                'Complete Trip'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
