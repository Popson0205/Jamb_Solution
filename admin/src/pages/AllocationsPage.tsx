import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Student { allocation_id: string; reg_number: string; full_name: string; phone: string; email: string; state: string; lga: string; centre_name: string; exam_date: string; batch_number: number; arrival_time: string; exam_start: string; exam_end: string; distance_km: number; is_reassigned: boolean; }

export default function AllocationsPage() {
  const [data, setData] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', exam_date: '', batch_number: '', state: '' });
  const [loading, setLoading] = useState(false);
  const [reassignId, setReassignId] = useState<string | null>(null);
  const [reassignForm, setReassignForm] = useState({ centre_id: '', exam_date: '', batch_number: '', notes: '' });
  const [centres, setCentres] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const params = { ...filters, page, limit: 50 };
    const res = await axios.get('/api/admin/students', { params });
    setData(res.data.data); setTotal(res.data.total); setLoading(false);
  };

  useEffect(() => { fetchData(); }, [page, filters]);
  useEffect(() => { axios.get('/api/admin/centres').then(r => setCentres(r.data)); }, []);

  const doReassign = async () => {
    if (!reassignId) return;
    await axios.patch(`/api/admin/allocations/${reassignId}/reassign`, reassignForm);
    setReassignId(null); fetchData();
  };

  return (
    <div>
      <h1 style={{ fontSize: '22px', marginBottom: '16px' }}>Allocations <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>({total.toLocaleString()} total)</span></h1>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {[['search','Search name/reg...'],['exam_date',''],['batch_number',''],['state','State']].map(([key, ph]) => (
          <input key={key} type={key === 'exam_date' ? 'date' : 'text'} placeholder={ph} value={(filters as any)[key]} onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))} style={{ padding: '7px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }} />
        ))}
      </div>
      {/* Table */}
      <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead><tr style={{ background: '#006400', color: 'white' }}>
            {['Reg Number','Full Name','Centre','Date','Batch','Times','Distance','Reassigned','Action'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 'bold' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={9} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading...</td></tr> :
            data.map((s, i) => (
              <tr key={s.allocation_id} style={{ background: i % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '9px 12px' }}>{s.reg_number}</td>
                <td style={{ padding: '9px 12px' }}>{s.full_name}</td>
                <td style={{ padding: '9px 12px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.centre_name}</td>
                <td style={{ padding: '9px 12px' }}>{new Date(s.exam_date).toLocaleDateString()}</td>
                <td style={{ padding: '9px 12px', textAlign: 'center' }}>{s.batch_number}</td>
                <td style={{ padding: '9px 12px', fontSize: '11px' }}>{s.arrival_time} – {s.exam_end}</td>
                <td style={{ padding: '9px 12px' }}>{s.distance_km} km</td>
                <td style={{ padding: '9px 12px', textAlign: 'center' }}>{s.is_reassigned ? '✅' : '—'}</td>
                <td style={{ padding: '9px 12px' }}><button onClick={() => { setReassignId(s.allocation_id); setReassignForm({ centre_id: '', exam_date: s.exam_date, batch_number: String(s.batch_number), notes: '' }); }} style={{ background: '#1a5276', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Reassign</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'center' }}>
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={pgBtn}>← Prev</button>
        <span style={{ padding: '6px 12px', fontSize: '13px', color: '#666' }}>Page {page}</span>
        <button disabled={data.length < 50} onClick={() => setPage(p => p + 1)} style={pgBtn}>Next →</button>
      </div>
      {/* Reassign Modal */}
      {reassignId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '28px', width: '420px' }}>
            <h3 style={{ marginBottom: '16px', color: '#006400' }}>Reassign Student</h3>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>New Centre</label>
            <select value={reassignForm.centre_id} onChange={e => setReassignForm(f => ({ ...f, centre_id: e.target.value }))} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '4px', marginBottom: '12px', fontSize: '13px' }}>
              <option value="">Select centre...</option>
              {centres.map(c => <option key={c.id} value={c.id}>{c.name} ({c.lga}, {c.state})</option>)}
            </select>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>New Date</label>
            <input type="date" value={reassignForm.exam_date} onChange={e => setReassignForm(f => ({ ...f, exam_date: e.target.value }))} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '4px', marginBottom: '12px', fontSize: '13px' }} />
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Batch</label>
            <select value={reassignForm.batch_number} onChange={e => setReassignForm(f => ({ ...f, batch_number: e.target.value }))} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '4px', marginBottom: '12px', fontSize: '13px' }}>
              {[1,2,3,4].map(n => <option key={n} value={n}>Batch {n}</option>)}
            </select>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Notes</label>
            <textarea value={reassignForm.notes} onChange={e => setReassignForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '4px', marginBottom: '16px', fontSize: '13px', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={doReassign} style={{ flex: 1, background: '#006400', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Confirm Reassign</button>
              <button onClick={() => setReassignId(null)} style={{ flex: 1, background: '#eee', color: '#333', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
const pgBtn: React.CSSProperties = { background: '#006400', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };
