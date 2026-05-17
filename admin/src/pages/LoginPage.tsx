import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@jamb.gov.ng');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const inp: React.CSSProperties = { width: '100%', padding: '9px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', marginTop: '4px', display: 'block', boxSizing: 'border-box' };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try { await login(email, password); navigate('/'); }
    catch { setError('Invalid email or password'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#006400', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={submit} style={{ background: 'white', borderRadius: '8px', padding: '36px', width: '360px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <img src="/jamb-logo.png" alt="JAMB Logo" style={{ height: '72px', width: '72px', objectFit: 'contain', marginBottom: '8px' }} />
        <h1 style={{ color: '#006400', fontSize: '20px', marginBottom: '4px' }}>JAMB CBT Admin</h1>
        <p style={{ color: '#666', fontSize: '13px', marginBottom: '24px' }}>Sign in to manage allocations</p>
        <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inp} />
        <label style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '12px', display: 'block' }}>Password</label>
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" style={inp} />
        {error && <p style={{ color: '#c0392b', fontSize: '13px', margin: '8px 0' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ marginTop: '16px', width: '100%', background: loading ? '#999' : '#006400', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
