// ============================================================
// TransitOps — Maintenance Page
// ============================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, CheckCircle, Search } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { createMaintenanceSchema } from '@shared/schemas';
import { MAINTENANCE_TYPES, MAINTENANCE_STATUSES, PERMISSIONS } from '@shared/constants';
import type { MaintenanceLog, Vehicle, CreateMaintenanceInput } from '@shared/types';
import DataTable, { type Column } from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Maintenance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [serverError, setServerError] = useState('');

  const canCreate = user && PERMISSIONS[user.role]?.maintenance?.includes('create');
  const canClose = user && PERMISSIONS[user.role]?.maintenance?.includes('close');

  const { data: logs = [], isLoading, isError, error, refetch } = useQuery<MaintenanceLog[]>({
    queryKey: ['maintenance'],
    queryFn: () => api.get('/maintenance'),
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => api.get('/vehicles'),
    enabled: modalOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMaintenanceInput>({
    resolver: zodResolver(createMaintenanceSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateMaintenanceInput) => api.post<MaintenanceLog>('/maintenance', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setModalOpen(false);
      setServerError('');
      reset();
    },
    onError: (err: Error) => setServerError(err.message),
  });

  const closeMutation = useMutation({
    mutationFn: (id: number) => api.patch<MaintenanceLog>(`/maintenance/${id}/close`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });

  const handleClose = (log: MaintenanceLog) => {
    if (!confirm(`Close maintenance record #${log.id}? Vehicle will be set back to Available.`)) return;
    closeMutation.mutate(log.id);
  };

  const filtered = logs.filter((l) => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !l.vehicle?.registrationNumber?.toLowerCase().includes(s) &&
        !l.type.toLowerCase().includes(s) &&
        !l.description.toLowerCase().includes(s)
      )
        return false;
    }
    return true;
  });

  const columns: Column<MaintenanceLog>[] = [
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (l) => l.vehicle?.registrationNumber || `Vehicle #${l.vehicleId}`,
      sortable: true,
    },
    { key: 'type', header: 'Type', sortable: true },
    {
      key: 'description',
      header: 'Description',
      render: (l) => (
        <span className="truncate" style={{ maxWidth: 200, display: 'inline-block' }}>
          {l.description || '—'}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'Cost',
      sortable: true,
      align: 'right',
      render: (l) => `₹${l.cost.toLocaleString()}`,
    },
    {
      key: 'startDate',
      header: 'Start Date',
      sortable: true,
      render: (l) => formatDate(l.startDate),
    },
    {
      key: 'endDate',
      header: 'End Date',
      render: (l) => l.endDate ? formatDate(l.endDate) : '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (l) => <StatusBadge status={l.status} />,
      sortable: true,
    },
  ];

  if (canClose) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      render: (l) => (
        <div>
          {l.status === 'OPEN' && (
            <button
              className="btn-ghost btn-sm"
              onClick={(e) => { e.stopPropagation(); handleClose(l); }}
              title="Close maintenance"
              style={{ color: 'var(--accent-green)' }}
            >
              <CheckCircle size={14} />
            </button>
          )}
        </div>
      ),
    });
  }

  if (isLoading) return <LoadingState message="Loading maintenance logs…" />;
  if (isError) return <ErrorState error={(error as Error).message} onRetry={() => refetch()} />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Maintenance</h1>
        {canCreate && (
          <button
            className="btn-primary"
            onClick={() => {
              setServerError('');
              reset({ vehicleId: 0, type: 'Oil Change' as CreateMaintenanceInput['type'], description: '', cost: 0, startDate: new Date().toISOString().split('T')[0] });
              setModalOpen(true);
            }}
          >
            <Plus size={16} />
            New Maintenance Log
          </button>
        )}
      </div>

      <div className="page-filters">
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral)' }} />
          <input
            placeholder="Search vehicle, type, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.values(MAINTENANCE_STATUSES).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
        <em>Note: Creating a maintenance log automatically sets the vehicle status to "In Shop."</em>
      </div>

      <DataTable
        columns={columns}
        data={filtered as unknown as Record<string, unknown>[]}
        emptyMessage="No maintenance logs found"
        keyExtractor={(l) => (l as unknown as MaintenanceLog).id}
      />

      {/* Create Maintenance Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Maintenance Log" size="md">
        {serverError && <div className="server-error">{serverError}</div>}
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))}>
          <div className="form-group">
            <label>Vehicle</label>
            <select {...register('vehicleId')}>
              <option value="">Select a vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} ({v.make} {v.model})
                </option>
              ))}
            </select>
            {errors.vehicleId && <p className="form-error">{errors.vehicleId.message}</p>}
          </div>

          <div className="form-group">
            <label>Maintenance Type</label>
            <select {...register('type')}>
              {MAINTENANCE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.type && <p className="form-error">{errors.type.message}</p>}
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea {...register('description')} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cost (₹)</label>
              <input type="number" step="0.01" {...register('cost')} />
              {errors.cost && <p className="form-error">{errors.cost.message}</p>}
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" {...register('startDate')} />
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '1rem 0 0' }}>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} />
                  Creating…
                </>
              ) : (
                'Create Log'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
