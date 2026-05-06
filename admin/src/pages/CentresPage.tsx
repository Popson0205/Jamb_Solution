import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function CentresPage() {
  const [centres, setCentres] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('');

  useEffect(() => { axios.get('/api/admin/centres').then(r => setCentres(r.data)); }, []);

  const filtered = centres.filter(c =>
    (!search || c.name.toLowerCase().includes(search.toLowerCase()) || c.lga.toLowerCase().includes(search.toLowerCase())) &&
    (!filterState || c.state.toLowerCase() === filterState.toLowerCase())
  );

  const states = [...new Set(centres.map(c => c.state))].sort();

  return (
    <div>
      <h1 style={{ fontSize: '22px', marginBottom: '16px' }}>Centres <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>({filtered.length} of {centres.length})</span></h1>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <input placeholder="Search centre name or LGA..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '280px' }} />
        <select value={filterState} onChange={e => setFilterState(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
          <option value="">All States</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead><tr style={{ background: '#006400', color: 'white' }}>
            {['Centre Name','State','LGA','Town','Capacity/Batch','Lat','Lon'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.id} style={{ background: i % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '9px 12px', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.name}>{c.name}</td>
                <td style={{ padding: '9px 12px' }}>{c.state}</td>
                <td style={{ padding: '9px 12px' }}>{c.lga}</td>
                <td style={{ padding: '9px 12px' }}>{c.town}</td>
                <td style={{ padding: '9px 12px', textAlign: 'center' }}>{c.capacity_per_batch}</td>
                <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: '11px' }}>{Number(c.latitude).toFixed(5)}</td>
                <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: '11px' }}>{Number(c.longitude).toFixed(5)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
