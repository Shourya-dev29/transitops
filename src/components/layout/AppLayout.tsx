// ============================================================
// TransitOps — AppLayout
// ============================================================

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />
      <main style={{
        flex: 1,
        padding: sidebarCollapsed ? '1.5rem 1.5rem 1.5rem 3.5rem' : '1.5rem',
        maxWidth: '100%',
        overflow: 'auto',
        minHeight: '100vh',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
