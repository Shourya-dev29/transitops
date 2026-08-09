// ============================================================
// TransitOps — Drivers Page
// ============================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Search, UserX } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { createDriverSchema } from '@shared/schemas';
import { DRIVER_STATUSES, PERMISSIONS, LICENSE_EXPIRY_WARNING_DAYS } from '@shared/constants';
import type { Driver, CreateDriverInput } from '@shared/types';
import DataTable, { type Column } from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';

function getLicenseExpiryStyle(expiryDate: string): { color: string } {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return { color: 'var(--danger)' }; // expired
  if (daysUntil <= LICENSE_EXPIRY_WARNING_DAYS) return { color: 'var(--accent-rust)' }; // warning
  return { color: 'var(--accent-green)' }; // ok
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Drivers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [serverError, setServerError] = useState('');

  const canCreate = user && PERMISSIONS[user.role]?.drivers?.includes('create');
  const canUpdate = user && PERMISSIONS[user.role]?.drivers?.includes('update');
  const canUpdateCompliance = user && PERMISSIONS[user.role]?.drivers?.includes('update_compliance');
  const canDelete = user && PERMISSIONS[user.role]?.drivers?.includes('delete');
  const isSafetyOfficer = user?.role === 'SAFETY_OFFICER';

  const { data: drivers = [], isLoading, isError, error, refetch } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: () => api.get('/drivers'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDriverInput>({
    resolver: zodResolver(createDriverSchema),
  });

  const saveMutation = useMutation({
    mutationFn: (data: CreateDriverInput) => {
      if (editingDriver) {
        // Safety officers use compliance endpoint
        if (isSafetyOfficer) {
          return api.patch<Driver>(`/drivers/${editingDriver.id}/compliance`, {
            licenseNumber: data.licenseNumber,
            licenseExpiryDate: data.licenseExpiryDate,
            safetyScore: data.safetyScore,
          });
        }
        return api.patch<Driver>(`/drivers/${editingDriver.id}`, data);
      }
      return api.post<Driver>('/drivers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      closeModal();
    },
    onError: (err: Error) => setServerError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/drivers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }),
  });

  const openCreate = () => {
    setEditingDriver(null);
    setServerError('');
    reset({
      name: '',
      email: '',
      phone: '',
      licenseNumber: '',
      licenseExpiryDate: '',
      safetyScore: 100,
      region: '',
    });
    setModalOpen(true);
  };

  const openEdit = (d: Driver) => {
    setEditingDriver(d);
    setServerError('');
    reset({
      name: d.name,
      email: d.email,
      phone: d.phone,
      licenseNumber: d.licenseNumber,
      licenseExpiryDate: d.licenseExpiryDate.split('T')[0],
      safetyScore: d.safetyScore,
      region: d.region,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDriver(null);
    setServerError('');
  };

  const handleDelete = (d: Driver) => {
    const hasTrips = d._count && d._count.trips > 0;
    const action = hasTrips ? 'deactivate' : 'delete';
    if (!confirm(`Are you sure you want to ${action} ${d.name}?`)) return;

    if (hasTrips) {
      api.patch(`/drivers/${d.id}`, { status: 'INACTIVE' }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['drivers'] });
      });
    } else {
      deleteMutation.mutate(d.id);
    }
  };

  const filtered = drivers.filter((d) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !d.name.toLowerCase().includes(s) &&
        !d.email.toLowerCase().includes(s) &&
        !d.licenseNumber.toLowerCase().includes(s)
      )
        return false;
    }
    if (statusFilter && d.status !== statusFilter) return false;
    return true;
  });

  const columns: Column<Driver>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'phone', header: 'Phone' },
    { key: 'licenseNumber', header: 'License #', sortable: true },
    {
      key: 'licenseExpiryDate',
      header: 'License Expiry',
      sortable: true,
      render: (d) => (
        <span style={getLicenseExpiryStyle(d.licenseExpiryDate)}>
          {formatDate(d.licenseExpiryDate)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => <StatusBadge status={d.status} />,
      sortable: true,
    },
    {
      key: 'safetyScore',
      header: 'Safety',
      sortable: true,
      align: 'right',
      render: (d) => (
        <span style={{ fontWeight: 600, color: d.safetyScore >= 80 ? 'var(--accent-green)' : d.safetyScore >= 50 ? 'var(--accent-rust)' : 'var(--danger)' }}>
          {d.safetyScore}
        </span>
      ),
    },
  ];

  if (canUpdate || canUpdateCompliance || canDelete) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      render: (d) => (
        <div className="flex gap-xs">
          {(canUpdate || canUpdateCompliance) && (
            <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEdit(d); }}>
              <Pencil size={14} />
            </button>
          )}
          {canDelete && d.status !== 'INACTIVE' && (
            <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(d); }} style={{ color: 'var(--danger)' }}>
              {d._count && d._count.trips > 0 ? <UserX size={14} /> : <Trash2 size={14} />}
            </button>
          )}
        </div>
      ),
    });
  }

  if (isLoading) return <LoadingState message="Loading drivers…" />;
  if (isError) return <ErrorState error={(error as Error).message} onRetry={() => refetch()} />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Driver Management</h1>
        {canCreate && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Add Driver
          </button>
        )}
      </div>

      <div className="page-filters">
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral)' }} />
          <input
            placeholder="Search name, email, license…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.values(DRIVER_STATUSES).map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered as unknown as Record<string, unknown>[]}
        emptyMessage="No drivers found"
        keyExtractor={(d) => (d as unknown as Driver).id}
      />

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingDriver ? 'Edit Driver' : 'Add Driver'} size="lg">
        {serverError && <div className="server-error">{serverError}</div>}
        <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))}>
          {(!isSafetyOfficer || !editingDriver) && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input {...register('name')} disabled={isSafetyOfficer && !!editingDriver} />
                  {errors.name && <p className="form-error">{errors.name.message}</p>}
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" {...register('email')} disabled={isSafetyOfficer && !!editingDriver} />
                  {errors.email && <p className="form-error">{errors.email.message}</p>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input {...register('phone')} disabled={isSafetyOfficer && !!editingDriver} />
                </div>
                <div className="form-group">
                  <label>Region</label>
                  <input {...register('region')} disabled={isSafetyOfficer && !!editingDriver} />
                </div>
              </div>
            </>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>License Number</label>
              <input {...register('licenseNumber')} />
              {errors.licenseNumber && <p className="form-error">{errors.licenseNumber.message}</p>}
            </div>
            <div className="form-group">
              <label>License Expiry Date</label>
              <input type="date" {...register('licenseExpiryDate')} />
              {errors.licenseExpiryDate && <p className="form-error">{errors.licenseExpiryDate.message}</p>}
            </div>
          </div>

          <div className="form-group" style={{ maxWidth: 200 }}>
            <label>Safety Score (0–100)</label>
            <input type="number" min="0" max="100" {...register('safetyScore')} />
            {errors.safetyScore && <p className="form-error">{errors.safetyScore.message}</p>}
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
                editingDriver ? 'Update Driver' : 'Add Driver'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
