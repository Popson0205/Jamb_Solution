import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth, fetchWithRetry } from '../context/AuthContext';

export default function CentresPage() {
  const { ready } = useAuth();
  const [centres, setCentres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('');

  useEffect(() => {
    if (!ready) return;
    setLoading(true); setError('');
    fetchWithRetry(() => axios.get('/api/admin/centres'))
      .then(r => setCentres(Array.isArray(r.data) ? r.data : []))
      .catch(e => setError(e.response?.data?.error || 'Failed to load centres. The API may be waking up — try refreshing in 30 seconds.'))
      .finally(() => setLoading(false));
  }, [ready]);

  const states = [...new Set(centres.map(c => c.state))].sort();
  const filtered = centres.filter(c =>
    (!search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.lga?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterState || c.state === filterState)
  );

  return (
    <div>
      <h1 style={{ fontSize: '22px', marginBottom: '16px' }}>
        Centres <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>({filtered.length} of {centres.length})</span>
      </h1>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input placeholder="Search name or LGA..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '280px' }} />
        <select value={filterState} onChange={e => setFilterState(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}>
          <option value="">All States</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || filterState) && (
          <button onClick={() => { setSearch(''); setFilterState(''); }}
            style={{ padding: '8px 14px', background: '#888', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Clear</button>
        )}
      </div>
      {error && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', color: '#856404', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {error}</span>
          <button onClick={() => { setError(''); setLoading(true); fetchWithRetry(() => axios.get('/api/admin/centres')).then(r => setCentres(Array.isArray(r.data) ? r.data : [])).catch(e => setError(e.message)).finally(() => setLoading(false)); }}
            style={{ background: '#856404', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginLeft: '12px' }}>
            Retry
          </button>
        </div>
      )}
      <div style={{ background: 'white', borderRadius: '8px', overflow: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#006400', color: 'white' }}>
              {['#','Centre Name','State','LGA','Town','Capacity/Batch','Latitude','Longitude'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#666' }}>
                Loading centres... <span style={{ fontSize: '12px', color: '#999' }}>(API may be waking up, please wait)</span>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#999' }}>
                {error ? 'Could not load.' : centres.length === 0 ? 'No centres found.' : 'No match.'}
              </td></tr>
            ) : filtered.map((c, i) => (
              <tr key={c.id || i} style={{ background: i % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '9px 12px', color: '#999', fontSize: '11px' }}>{i + 1}</td>
                <td style={{ padding: '9px 12px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.name}>{c.name}</td>
                <td style={{ padding: '9px 12px' }}>{c.state}</td>
                <td style={{ padding: '9px 12px' }}>{c.lga}</td>
                <td style={{ padding: '9px 12px' }}>{c.town}</td>
                <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                  <span style={{ background: '#e8f5e9', color: '#006400', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px' }}>{c.capacity_per_batch}</span>
                </td>
                <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: '11px', color: '#555' }}>{Number(c.latitude).toFixed(5)}</td>
                <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: '11px', color: '#555' }}>{Number(c.longitude).toFixed(5)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && !error && centres.length > 0 && (
        <div style={{ marginTop: '12px', fontSize: '12px', color: '#888', textAlign: 'right' }}>
          Showing {filtered.length.toLocaleString()} of {centres.length.toLocaleString()} centres{filterState && ` in ${filterState}`}
        </div>
      )}
    </div>
  );
}
