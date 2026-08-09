// ============================================================
// TransitOps — Main App Routing
// ============================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

import { USER_ROLES } from '@shared/constants';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import FuelExpenses from './pages/FuelExpenses';
import Reports from './pages/Reports';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export default function App() {
  const adminStaff = [USER_ROLES.FLEET_MANAGER, USER_ROLES.SAFETY_OFFICER, USER_ROLES.FINANCIAL_ANALYST];
  const financeStaff = [USER_ROLES.FLEET_MANAGER, USER_ROLES.FINANCIAL_ANALYST];

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes inside AppLayout */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vehicles" element={<ProtectedRoute allowedRoles={adminStaff}><Vehicles /></ProtectedRoute>} />
            <Route path="/drivers" element={<ProtectedRoute allowedRoles={adminStaff}><Drivers /></ProtectedRoute>} />
            <Route path="/trips" element={<Trips />} />
            <Route path="/maintenance" element={<ProtectedRoute allowedRoles={adminStaff}><Maintenance /></ProtectedRoute>} />
            <Route path="/fuel-expenses" element={<ProtectedRoute allowedRoles={financeStaff}><FuelExpenses /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={adminStaff}><Reports /></ProtectedRoute>} />
          </Route>

          {/* Catch-all redirect to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  );
}
