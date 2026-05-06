import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#006400','#2e8b57','#3cb371','#90ee90'];

export default function DashboardPage() {
  const { ready } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return;
    axios.get('/api/admin/dashboard/summary')
      .then(r => { setSummary(r.data); setLoading(false); })
      .catch(e => { setError(e.response?.data?.error || 'Failed to load dashboard'); setLoading(false); });
  }, [ready]);

  if (loading) return <p style={{ color: '#666', padding: '20px' }}>Loading dashboard...</p>;
  if (error) return <p style={{ color: '#c0392b', padding: '20px' }}>⚠️ {error}</p>;
  if (!summary) return null;

  const batchData = (summary.batch_breakdown || []).map((b: any) => ({ name: `Batch ${b.batch_number}`, students: Number(b.count) }));
  const fillData = (summary.top_centres_by_fill || []).map((c: any) => ({ name: c.name.substring(0, 22) + '...', allocated: Number(c.allocated), capacity: c.capacity_per_batch }));

  return (
    <div>
      <h1 style={{ fontSize: '22px', marginBottom: '20px' }}>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[['Total Students', summary.total_students, '#006400'], ['Total Allocations', summary.total_allocations, '#2e8b57'], ['Active Centres', summary.total_centres, '#1a5276']].map(([label, value, color]: any) => (
          <div key={label} style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}` }}>
            <p style={{ color: '#666', fontSize: '13px', margin: '0 0 6px' }}>{label}</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color, margin: 0 }}>{(value || 0).toLocaleString()}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ marginBottom: '16px' }}>Students by Batch</h3>
          {batchData.length === 0 ? <p style={{ color: '#999', fontSize: '13px' }}>No allocations yet</p> :
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={batchData} dataKey="students" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>{batchData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Legend /><Tooltip /></PieChart>
          </ResponsiveContainer>}
        </div>
        <div style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ marginBottom: '16px' }}>Top Centres by Fill</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={fillData} layout="vertical">
              <XAxis type="number" /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
              <Tooltip /><Bar dataKey="allocated" fill="#006400" name="Allocated" /><Bar dataKey="capacity" fill="#90ee90" name="Capacity" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
