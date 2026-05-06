import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#006400','#2e8b57','#3cb371','#90ee90'];

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/admin/dashboard/summary').then(r => { setSummary(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#666' }}>Loading dashboard...</p>;
  if (!summary) return <p style={{ color: '#c0392b' }}>Failed to load dashboard. Check API connection.</p>;

  const batchData = summary.batch_breakdown?.map((b: any) => ({ name: `Batch ${b.batch_number}`, students: Number(b.count) })) || [];
  const fillData = summary.top_centres_by_fill?.map((c: any) => ({ name: c.name.substring(0, 25) + '...', allocated: Number(c.allocated), capacity: c.capacity_per_batch })) || [];

  return (
    <div>
      <h1 style={{ fontSize: '22px', marginBottom: '20px', color: '#1a1a1a' }}>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Students', value: summary.total_students?.toLocaleString() || 0, color: '#006400' },
          { label: 'Total Allocations', value: summary.total_allocations?.toLocaleString() || 0, color: '#2e8b57' },
          { label: 'Active Centres', value: summary.total_centres?.toLocaleString() || 0, color: '#1a5276' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}` }}>
            <p style={{ color: '#666', fontSize: '13px', margin: '0 0 6px' }}>{label}</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ marginBottom: '16px', color: '#1a1a1a' }}>Students by Batch</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={batchData} dataKey="students" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>{batchData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Legend /><Tooltip /></PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ marginBottom: '16px', color: '#1a1a1a' }}>Top Centres by Fill</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={fillData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" /><YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip /><Bar dataKey="allocated" fill="#006400" name="Allocated" /><Bar dataKey="capacity" fill="#90ee90" name="Capacity" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
