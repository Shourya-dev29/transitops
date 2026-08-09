// ============================================================
// TransitOps — Sidebar Navigation
// ============================================================

import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  BarChart3,
  LogOut,
  ChevronLeft,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { PERMISSIONS, USER_ROLE_LABELS } from '@shared/constants';
import StatusBadge from '../ui/StatusBadge';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  resource: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, resource: 'dashboard' },
  { path: '/vehicles', label: 'Vehicles', icon: Truck, resource: 'vehicles' },
  { path: '/drivers', label: 'Drivers', icon: Users, resource: 'drivers' },
  { path: '/trips', label: 'Trips', icon: Route, resource: 'trips' },
  { path: '/maintenance', label: 'Maintenance', icon: Wrench, resource: 'maintenance' },
  { path: '/fuel-expenses', label: 'Fuel & Expenses', icon: Fuel, resource: 'fuel' },
  { path: '/reports', label: 'Reports', icon: BarChart3, resource: 'reports' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const userPermissions = PERMISSIONS[user.role] || {};
  const visibleItems = NAV_ITEMS.filter(
    (item) => userPermissions[item.resource]?.includes('read')
  );

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="sidebar-overlay"
          onClick={onToggle}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(31,36,33,0.35)',
            zIndex: 49,
            display: 'none',
          }}
        />
      )}

      <aside
        style={{
          width: collapsed ? 0 : 240,
          minHeight: '100vh',
          background: 'var(--bg-surface)',
          borderRight: collapsed ? 'none' : '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          overflow: 'hidden',
          flexShrink: 0,
          position: 'relative',
          zIndex: 50,
        }}
      >
        {/* Logo */}
        <div style={{
          padding: '1.25rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.25rem',
            color: 'var(--accent-green)',
            whiteSpace: 'nowrap',
          }}>
            TransitOps
          </span>
          <button
            className="btn-ghost btn-sm"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            style={{ padding: '0.25rem' }}
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0.5rem', overflow: 'hidden' }}>
          {visibleItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--accent-green)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--accent-green-light)' : 'transparent',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  marginBottom: '0.125rem',
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User info + Logout */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--border)',
          whiteSpace: 'nowrap',
        }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              {user.name}
            </div>
            <span
              className="status-badge"
              style={{
                backgroundColor: 'var(--accent-green-light)',
                color: 'var(--accent-green)',
                fontSize: '0.625rem',
              }}
            >
              {USER_ROLE_LABELS[user.role] || user.role}
            </span>
          </div>
          <button
            onClick={logout}
            className="btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-secondary)' }}
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile hamburger button (only visible when sidebar collapsed) */}
      {collapsed && (
        <button
          onClick={onToggle}
          className="btn-ghost"
          aria-label="Open menu"
          style={{
            position: 'fixed',
            top: '0.75rem',
            left: '0.75rem',
            zIndex: 48,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '0.4rem',
            boxShadow: '0 1px 4px var(--shadow)',
          }}
        >
          <Menu size={20} />
        </button>
      )}

      <style>{`
        @media (max-width: 768px) {
          .sidebar-overlay { display: block !important; }
          aside {
            position: fixed !important;
            left: 0;
            top: 0;
            z-index: 50 !important;
          }
        }
      `}</style>
    </>
  );
}
