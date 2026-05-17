import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: '220px', background: '#006400', color: 'white', padding: '20px 12px', flexShrink: 0, position: 'relative' }}>
        <div style={{ padding: '0 8px 20px', borderBottom: '1px solid rgba(255,255,255,0.2)', marginBottom: '16px' }}>
          <img src="/jamb-logo.png" alt="JAMB" style={{ height: '48px', width: '48px', objectFit: 'contain', marginBottom: '6px' }} />
          <h2 style={{ fontSize: '15px', margin: 0 }}>JAMB CBT Admin</h2>
          <p style={{ fontSize: '12px', opacity: 0.7, margin: '4px 0 0' }}>{user?.full_name}</p>
        </div>
        <nav>
          {[['/', '📊 Dashboard'], ['/allocations', '📋 Allocations'], ['/centres', '🏢 Centres']].map(([path, label]) => (
            <NavLink key={path} to={path} end={path === '/'} style={({ isActive }) => ({ display: 'block', padding: '10px 20px', color: isActive ? 'white' : '#cce5cc', background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent', textDecoration: 'none', borderRadius: '4px', marginBottom: '4px', fontWeight: isActive ? 'bold' : 'normal' })}>{label}</NavLink>
          ))}
        </nav>
        <button onClick={() => { logout(); navigate('/login'); }} style={{ position: 'absolute', bottom: '20px', left: '12px', width: '196px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Logout</button>
      </aside>
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}><Outlet /></main>
    </div>
  );
}
