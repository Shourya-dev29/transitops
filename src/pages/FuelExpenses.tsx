// ============================================================
// TransitOps — Fuel & Expenses Page
// ============================================================

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, IndianRupee, Fuel, Receipt } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { createFuelLogSchema, createExpenseSchema } from '@shared/schemas';
import { EXPENSE_CATEGORIES } from '@shared/constants';
import type { FuelLog, Expense, Vehicle, CreateFuelLogInput, CreateExpenseInput } from '@shared/types';
import DataTable, { type Column } from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import LoadingState from '../components/ui/LoadingState';
import ErrorState from '../components/ui/ErrorState';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function FuelExpenses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'FUEL' | 'EXPENSE'>('FUEL');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [serverError, setServerError] = useState('');

  const canManage = user && (user.role === 'FLEET_MANAGER' || user.role === 'FINANCIAL_ANALYST');

  // Queries
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: () => api.get('/vehicles'),
  });

  const { data: fuelLogs = [], isLoading: fuelLoading, isError: fuelError, error: fuelErr } = useQuery<FuelLog[]>({
    queryKey: ['fuelLogs', selectedVehicleId],
    queryFn: () => api.get(`/fuel${selectedVehicleId ? `?vehicleId=${selectedVehicleId}` : ''}`),
  });

  const { data: expenses = [], isLoading: expenseLoading, isError: expenseError, error: expenseErr } = useQuery<Expense[]>({
    queryKey: ['expenses', selectedVehicleId],
    queryFn: () => api.get(`/expenses${selectedVehicleId ? `?vehicleId=${selectedVehicleId}` : ''}`),
  });

  // Forms
  const fuelForm = useForm<CreateFuelLogInput>({
    resolver: zodResolver(createFuelLogSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    },
  });

  const expenseForm = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    },
  });

  // Automatically calculate total fuel cost in form
  const qty = fuelForm.watch('quantity');
  const cpu = fuelForm.watch('costPerUnit');
  const calculatedTotal = (Number(qty) || 0) * (Number(cpu) || 0);

  // Mutations
  const createFuelMutation = useMutation({
    mutationFn: (data: CreateFuelLogInput) => api.post<FuelLog>('/fuel', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuelLogs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setFuelModalOpen(false);
      fuelForm.reset();
      setServerError('');
    },
    onError: (err: Error) => setServerError(err.message),
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: CreateExpenseInput) => api.post<Expense>('/expenses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setExpenseModalOpen(false);
      expenseForm.reset();
      setServerError('');
    },
    onError: (err: Error) => setServerError(err.message),
  });

  // Rolling calculation of total costs in the current view
  const currentFuelCost = fuelLogs.reduce((sum, log) => sum + log.totalCost, 0);
  const currentExpenseCost = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Columns definitions
  const fuelColumns: Column<FuelLog>[] = [
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (log) => log.vehicle ? `${log.vehicle.make} ${log.vehicle.model} (${log.vehicle.registrationNumber})` : 'N/A',
    },
    {
      key: 'date',
      header: 'Date',
      render: (log) => formatDate(log.date),
      sortable: true,
    },
    {
      key: 'quantity',
      header: 'Quantity (L)',
      render: (log) => `${log.quantity.toLocaleString()} L`,
      sortable: true,
    },
    {
      key: 'costPerUnit',
      header: 'Cost/Unit',
      render: (log) => `₹${log.costPerUnit.toFixed(2)}`,
    },
    {
      key: 'totalCost',
      header: 'Total Cost',
      render: (log) => `₹${log.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sortable: true,
    },
    {
      key: 'odometer',
      header: 'Odometer (km)',
      render: (log) => `${log.odometer.toLocaleString()} km`,
      sortable: true,
    },
  ];

  const expenseColumns: Column<Expense>[] = [
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (exp) => exp.vehicle ? `${exp.vehicle.make} ${exp.vehicle.model} (${exp.vehicle.registrationNumber})` : 'General Fleet',
    },
    {
      key: 'category',
      header: 'Category',
      render: (exp) => exp.category,
      sortable: true,
    },
    {
      key: 'description',
      header: 'Description',
      render: (exp) => exp.description,
    },
    {
      key: 'date',
      header: 'Date',
      render: (exp) => formatDate(exp.date),
      sortable: true,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (exp) => `₹${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sortable: true,
    },
  ];

  const handleFuelSubmit = (data: CreateFuelLogInput) => {
    // Override totalCost with calculated if not set manually
    createFuelMutation.mutate({
      ...data,
      totalCost: data.totalCost || calculatedTotal,
    });
  };

  const handleExpenseSubmit = (data: CreateExpenseInput) => {
    // If vehicleId is 0 or empty, send null
    createExpenseMutation.mutate({
      ...data,
      vehicleId: data.vehicleId ? Number(data.vehicleId) : null,
    });
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Fuel & Expense Management</h1>
          <p className="page-subtitle">Track operational costs and fleet expenditures</p>
        </div>
        <div className="flex gap-2">
          {canManage && activeTab === 'FUEL' && (
            <button className="btn btn-primary flex items-center gap-1" onClick={() => { setServerError(''); setFuelModalOpen(true); }}>
              <Plus size={16} /> Log Fuel
            </button>
          )}
          {canManage && activeTab === 'EXPENSE' && (
            <button className="btn btn-primary flex items-center gap-1" onClick={() => { setServerError(''); setExpenseModalOpen(true); }}>
              <Plus size={16} /> Add Expense
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card flex items-center gap-4 p-4">
          <div className="kpi-icon" style={{ background: 'var(--accent-green-light)' }}>
            <Fuel size={20} color="var(--accent-green)" />
          </div>
          <div>
            <div className="kpi-value">₹{currentFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="kpi-label">Total Fuel Logged {selectedVehicleId ? '(Filtered)' : ''}</div>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <div className="kpi-icon" style={{ background: 'var(--accent-rust-light)' }}>
            <Receipt size={20} color="var(--accent-rust)" />
          </div>
          <div>
            <div className="kpi-value">₹{currentExpenseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="kpi-label">Total Expenses {selectedVehicleId ? '(Filtered)' : ''}</div>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <div className="kpi-icon" style={{ background: 'var(--neutral-light)' }}>
            <IndianRupee size={20} color="var(--text-primary)" />
          </div>
          <div>
            <div className="kpi-value">₹{(currentFuelCost + currentExpenseCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="kpi-label">Total Combined Operational Cost</div>
          </div>
        </div>
      </div>

      {/* Filter and Tab Section */}
      <div className="card mb-6 p-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          {/* Tabs */}
          <div className="tab-container flex gap-1 bg-neutral-light p-1 rounded">
            <button
              className={`px-4 py-2 rounded text-sm font-medium transition ${activeTab === 'FUEL' ? 'bg-surface shadow text-primary font-semibold' : 'text-secondary hover:text-primary'}`}
              onClick={() => setActiveTab('FUEL')}
            >
              Fuel Logs
            </button>
            <button
              className={`px-4 py-2 rounded text-sm font-medium transition ${activeTab === 'EXPENSE' ? 'bg-surface shadow text-primary font-semibold' : 'text-secondary hover:text-primary'}`}
              onClick={() => setActiveTab('EXPENSE')}
            >
              Other Expenses
            </button>
          </div>

          {/* Vehicle Filter */}
          <div className="flex items-center gap-2">
            <Search size={16} className="text-secondary" />
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="select text-sm py-1.5"
            >
              <option value="">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} — {v.make} {v.model}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tables */}
      {activeTab === 'FUEL' ? (
        fuelError ? (
          <ErrorState error={fuelErr?.message || 'Error loading fuel logs'} />
        ) : (
          <DataTable
            columns={fuelColumns}
            data={fuelLogs}
            loading={fuelLoading}
            emptyMessage="No fuel logs found."
          />
        )
      ) : (
        expenseError ? (
          <ErrorState error={expenseErr?.message || 'Error loading expenses'} />
        ) : (
          <DataTable
            columns={expenseColumns}
            data={expenses}
            loading={expenseLoading}
            emptyMessage="No expenses found."
          />
        )
      )}

      {/* Fuel Log Modal */}
      <Modal isOpen={fuelModalOpen} onClose={() => setFuelModalOpen(false)} title="Log Fuel Purchase">
        <form onSubmit={fuelForm.handleSubmit(handleFuelSubmit)} className="space-y-4">
          {serverError && <div className="text-danger text-sm bg-danger-light p-2.5 rounded border border-danger/20">{serverError}</div>}

          <div>
            <label className="label">Vehicle</label>
            <select {...fuelForm.register('vehicleId')} className="select w-full">
              <option value="">Select a vehicle…</option>
              {vehicles.filter(v => v.status !== 'RETIRED').map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNumber} — {v.make} {v.model}</option>
              ))}
            </select>
            {fuelForm.formState.errors.vehicleId && <p className="text-danger text-xs mt-1">{fuelForm.formState.errors.vehicleId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantity (Liters)</label>
              <input type="number" step="0.01" {...fuelForm.register('quantity')} className="input w-full" />
              {fuelForm.formState.errors.quantity && <p className="text-danger text-xs mt-1">{fuelForm.formState.errors.quantity.message}</p>}
            </div>
            <div>
              <label className="label">Cost per Liter (₹)</label>
              <input type="number" step="0.001" {...fuelForm.register('costPerUnit')} className="input w-full" />
              {fuelForm.formState.errors.costPerUnit && <p className="text-danger text-xs mt-1">{fuelForm.formState.errors.costPerUnit.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Odometer Reading (km)</label>
              <input type="number" {...fuelForm.register('odometer')} className="input w-full" />
              {fuelForm.formState.errors.odometer && <p className="text-danger text-xs mt-1">{fuelForm.formState.errors.odometer.message}</p>}
            </div>
            <div>
              <label className="label">Total Cost (₹) — Calculated</label>
              <input
                type="number"
                step="0.01"
                {...fuelForm.register('totalCost')}
                placeholder={calculatedTotal ? calculatedTotal.toFixed(2) : '0.00'}
                className="input w-full bg-neutral-light cursor-not-allowed"
                readOnly
              />
              {fuelForm.formState.errors.totalCost && <p className="text-danger text-xs mt-1">{fuelForm.formState.errors.totalCost.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Date</label>
            <input type="date" {...fuelForm.register('date')} className="input w-full" />
            {fuelForm.formState.errors.date && <p className="text-danger text-xs mt-1">{fuelForm.formState.errors.date.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setFuelModalOpen(false)}>Cancel</button>
            <button type="submit" disabled={createFuelMutation.isPending} className="btn btn-primary">
              {createFuelMutation.isPending ? 'Logging…' : 'Log Fuel'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Expense Modal */}
      <Modal isOpen={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} title="Record Other Expense">
        <form onSubmit={expenseForm.handleSubmit(handleExpenseSubmit)} className="space-y-4">
          {serverError && <div className="text-danger text-sm bg-danger-light p-2.5 rounded border border-danger/20">{serverError}</div>}

          <div>
            <label className="label">Vehicle (Optional — leave blank for General Fleet)</label>
            <select {...expenseForm.register('vehicleId')} className="select w-full">
              <option value="">General Fleet Expense</option>
              {vehicles.filter(v => v.status !== 'RETIRED').map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNumber} — {v.make} {v.model}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Category</label>
            <select {...expenseForm.register('category')} className="select w-full">
              <option value="">Select Category…</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {expenseForm.formState.errors.category && <p className="text-danger text-xs mt-1">{expenseForm.formState.errors.category.message}</p>}
          </div>

          <div>
            <label className="label">Amount (₹)</label>
            <input type="number" step="0.01" {...expenseForm.register('amount')} className="input w-full" />
            {expenseForm.formState.errors.amount && <p className="text-danger text-xs mt-1">{expenseForm.formState.errors.amount.message}</p>}
          </div>

          <div>
            <label className="label">Description</label>
            <textarea {...expenseForm.register('description')} className="input w-full h-20 py-2 resize-none" placeholder="Provide details about the expenditure…" />
            {expenseForm.formState.errors.description && <p className="text-danger text-xs mt-1">{expenseForm.formState.errors.description.message}</p>}
          </div>

          <div>
            <label className="label">Date</label>
            <input type="date" {...expenseForm.register('date')} className="input w-full" />
            {expenseForm.formState.errors.date && <p className="text-danger text-xs mt-1">{expenseForm.formState.errors.date.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setExpenseModalOpen(false)}>Cancel</button>
            <button type="submit" disabled={createExpenseMutation.isPending} className="btn btn-primary">
              {createExpenseMutation.isPending ? 'Recording…' : 'Record Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
