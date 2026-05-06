import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navStyle = (active: boolean): React.CSSProperties => ({ display: 'block', padding: '10px 20px', color: active ? 'white' : '#cce5cc', background: active ? 'rgba(255,255,255,0.15)' : 'transparent', textDecoration: 'none', borderRadius: '4px', marginBottom: '4px', fontWeight: active ? 'bold' : 'normal' });

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: '220px', background: '#006400', color: 'white', padding: '20px 12px', flexShrink: 0 }}>
        <div style={{ padding: '0 8px 20px', borderBottom: '1px solid rgba(255,255,255,0.2)', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', margin: 0 }}>JAMB CBT Admin</h2>
          <p style={{ fontSize: '12px', opacity: 0.7, margin: '4px 0 0' }}>{user?.full_name}</p>
        </div>
        <nav>
          <NavLink to="/" end style={({ isActive }) => navStyle(isActive)}>📊 Dashboard</NavLink>
          <NavLink to="/allocations" style={({ isActive }) => navStyle(isActive)}>📋 Allocations</NavLink>
          <NavLink to="/centres" style={({ isActive }) => navStyle(isActive)}>🏢 Centres</NavLink>
        </nav>
        <button onClick={() => { logout(); navigate('/login'); }} style={{ position: 'absolute', bottom: '20px', left: '12px', width: '196px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Logout</button>
      </aside>
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}><Outlet /></main>
    </div>
  );
}
