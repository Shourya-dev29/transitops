// ============================================================
// TransitOps — Vehicles Page
// ============================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Search, Archive } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { createVehicleSchema } from '@shared/schemas';
import { VEHICLE_TYPES, VEHICLE_STATUSES, PERMISSIONS } from '@shared/constants';
import type { Vehicle, CreateVehicleInput } from '@shared/types';
import DataTable, { type Column } from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';

export default function Vehicles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [serverError, setServerError] = useState('');

  const canWrite = user && PERMISSIONS[user.role]?.vehicles?.includes('create');
  const canDelete = user && PERMISSIONS[user.role]?.vehicles?.includes('delete');

  const { data: vehicles = [], isLoading, isError, error, refetch } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => api.get('/vehicles'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateVehicleInput>({
    resolver: zodResolver(createVehicleSchema),
  });

  const saveMutation = useMutation({
    mutationFn: (data: CreateVehicleInput) =>
      editingVehicle
        ? api.patch<Vehicle>(`/vehicles/${editingVehicle.id}`, data)
        : api.post<Vehicle>('/vehicles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      closeModal();
    },
    onError: (err: Error) => setServerError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/vehicles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });

  const openCreate = () => {
    setEditingVehicle(null);
    setServerError('');
    reset({
      registrationNumber: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      type: 'Truck' as const,
      maxLoadCapacity: 0,
      currentOdometer: 0,
      acquisitionCost: 0,
      region: '',
    });
    setModalOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setServerError('');
    reset({
      registrationNumber: v.registrationNumber,
      make: v.make,
      model: v.model,
      year: v.year,
      type: v.type as CreateVehicleInput['type'],
      maxLoadCapacity: v.maxLoadCapacity,
      currentOdometer: v.currentOdometer,
      acquisitionCost: v.acquisitionCost,
      region: v.region,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingVehicle(null);
    setServerError('');
  };

  const handleDelete = (v: Vehicle) => {
    const hasHistory = v._count && (v._count.trips > 0 || v._count.maintenanceLogs > 0);
    const action = hasHistory ? 'retire' : 'delete';
    if (!confirm(`Are you sure you want to ${action} ${v.registrationNumber}?`)) return;

    if (hasHistory) {
      // Retire instead of delete
      api.patch(`/vehicles/${v.id}`, { status: 'RETIRED' }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      });
    } else {
      deleteMutation.mutate(v.id);
    }
  };

  // Filtered data
  const filtered = vehicles.filter((v) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !v.registrationNumber.toLowerCase().includes(s) &&
        !v.make.toLowerCase().includes(s) &&
        !v.model.toLowerCase().includes(s) &&
        !v.region.toLowerCase().includes(s)
      )
        return false;
    }
    if (typeFilter && v.type !== typeFilter) return false;
    if (statusFilter && v.status !== statusFilter) return false;
    return true;
  });

  const columns: Column<Vehicle>[] = [
    { key: 'registrationNumber', header: 'Registration', sortable: true },
    {
      key: 'makeModel',
      header: 'Make / Model',
      render: (v) => `${v.make} ${v.model}`,
      sortable: false,
    },
    { key: 'year', header: 'Year', sortable: true },
    { key: 'type', header: 'Type', sortable: true },
    {
      key: 'status',
      header: 'Status',
      render: (v) => <StatusBadge status={v.status} />,
      sortable: true,
    },
    {
      key: 'maxLoadCapacity',
      header: 'Capacity (kg)',
      render: (v) => v.maxLoadCapacity.toLocaleString(),
      sortable: true,
      align: 'right',
    },
    {
      key: 'currentOdometer',
      header: 'Odometer',
      render: (v) => v.currentOdometer.toLocaleString(),
      sortable: true,
      align: 'right',
    },
    { key: 'region', header: 'Region', sortable: true },
  ];

  if (canWrite || canDelete) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      render: (v) => (
        <div className="flex gap-xs">
          {canWrite && (
            <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(v); }}>
              <Pencil size={14} />
            </button>
          )}
          {canDelete && v.status !== 'RETIRED' && (
            <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(v); }} style={{ color: 'var(--danger)' }}>
              {v._count && (v._count.trips > 0 || v._count.maintenanceLogs > 0) ? <Archive size={14} /> : <Trash2 size={14} />}
            </button>
          )}
        </div>
      ),
    });
  }

  if (isLoading) return <LoadingState message="Loading vehicles…" />;
  if (isError) return <ErrorState error={(error as Error).message} onRetry={() => refetch()} />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Vehicle Registry</h1>
        {canWrite && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Add Vehicle
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="page-filters">
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral)' }} />
          <input
            placeholder="Search registration, make, model…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {VEHICLE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.values(VEHICLE_STATUSES).map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered as unknown as Record<string, unknown>[]}
        emptyMessage="No vehicles found"
        keyExtractor={(v) => (v as unknown as Vehicle).id}
      />

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'} size="lg">
        {serverError && <div className="server-error">{serverError}</div>}
        <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))}>
          <div className="form-row">
            <div className="form-group">
              <label>Registration Number</label>
              <input {...register('registrationNumber')} />
              {errors.registrationNumber && <p className="form-error">{errors.registrationNumber.message}</p>}
            </div>
            <div className="form-group">
              <label>Type</label>
              <select {...register('type')}>
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {errors.type && <p className="form-error">{errors.type.message}</p>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Make</label>
              <input {...register('make')} />
              {errors.make && <p className="form-error">{errors.make.message}</p>}
            </div>
            <div className="form-group">
              <label>Model</label>
              <input {...register('model')} />
              {errors.model && <p className="form-error">{errors.model.message}</p>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Year</label>
              <input type="number" {...register('year')} />
              {errors.year && <p className="form-error">{errors.year.message}</p>}
            </div>
            <div className="form-group">
              <label>Max Load Capacity (kg)</label>
              <input type="number" step="0.01" {...register('maxLoadCapacity')} />
              {errors.maxLoadCapacity && <p className="form-error">{errors.maxLoadCapacity.message}</p>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Current Odometer (km)</label>
              <input type="number" step="0.01" {...register('currentOdometer')} />
              {errors.currentOdometer && <p className="form-error">{errors.currentOdometer.message}</p>}
            </div>
            <div className="form-group">
              <label>Acquisition Cost (₹)</label>
              <input type="number" step="0.01" {...register('acquisitionCost')} />
              {errors.acquisitionCost && <p className="form-error">{errors.acquisitionCost.message}</p>}
            </div>
          </div>

          <div className="form-group">
            <label>Region</label>
            <input {...register('region')} />
          </div>

          <div className="modal-footer" style={{ padding: '1rem 0 0' }}>
            <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <>
                  <div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} />
                  Saving…
                </>
              ) : (
                editingVehicle ? 'Update Vehicle' : 'Add Vehicle'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
