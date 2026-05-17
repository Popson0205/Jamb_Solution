import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function LookupPage() {
  const [regNumber, setRegNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const lookup = async () => {
    if (!regNumber.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await axios.get(`/api/student/allocation/${regNumber.trim()}`);
      const { allocation, centre } = res.data;
      navigate('/result', { state: { status: 'allocated', centre, allocation, batch: { number: allocation.batch_number, arrival: allocation.arrival_time, exam_start: allocation.exam_start, exam_end: allocation.exam_end }, exam_date: allocation.exam_date, distance_km: allocation.distance_km } });
    } catch (e: any) {
      setError(e.response?.status === 404 ? 'No allocation found for this registration number.' : 'Lookup failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f0', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'white', borderRadius: '8px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <img src="/jamb-logo.png" alt="JAMB Logo" style={{ height: '64px', width: '64px', objectFit: 'contain', display: 'block', margin: '0 auto 10px' }} />
        <h2 style={{ color: '#006400', marginTop: 0 }}>Look Up Your Allocation</h2>
        <input value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="Enter Registration Number" onKeyDown={e => e.key === 'Enter' && lookup()} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '15px', boxSizing: 'border-box' }} />
        {error && <p style={{ color: '#c0392b', fontSize: '14px', margin: '8px 0' }}>⚠️ {error}</p>}
        <button onClick={lookup} disabled={loading} style={{ marginTop: '12px', width: '100%', background: loading ? '#999' : '#006400', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Searching...' : 'Find My Centre'}
        </button>
        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px' }}><a href="/" style={{ color: '#006400' }}>← Register / New Submission</a></p>
      </div>
    </div>
  );
}
