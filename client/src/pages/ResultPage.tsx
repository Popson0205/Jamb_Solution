import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  // Handle both ISO timestamp and plain date string e.g. "2026-05-11" or "2026-05-11T00:00:00.000Z"
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toDateString();
}

function formatTime(t: string): string {
  if (!t) return 'N/A';
  // Strip seconds if present e.g. "08:30:00" → "08:30"
  return t.substring(0, 5);
}

export default function ResultPage() {
  const { state: data } = useLocation();
  const navigate = useNavigate();
  const slipRef = useRef<HTMLDivElement>(null);

  if (!data || data.status === 'unallocated') {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', fontFamily: 'Arial, sans-serif' }}>
        <h2 style={{ color: '#c0392b' }}>⚠️ No Allocation Found</h2>
        <p>All centres within your area are currently full. You have been flagged for manual assignment. Please check back later or contact JAMB.</p>
        <button onClick={() => navigate('/')} style={{ background: '#006400', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', marginTop: '16px' }}>← Back to Registration</button>
      </div>
    );
  }

  const { centre, batch, exam_date, distance_km, allocation } = data;

  // Normalise batch fields — engine returns arrival_time but some paths return arrival
  const arrivalTime  = formatTime(batch?.arrival_time || batch?.arrival || '');
  const examStart    = formatTime(batch?.exam_start || '');
  const examEnd      = formatTime(batch?.exam_end || '');
  const batchNumber  = batch?.number || batch?.batch_number || allocation?.batch_number || '';
  const examDateStr  = exam_date || allocation?.exam_date || '';
  const distanceKm   = distance_km ?? allocation?.distance_km ?? '';

  const downloadPDF = async () => {
    if (!slipRef.current) return;
    const canvas = await html2canvas(slipRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`JAMB_Slip_${allocation?.id?.slice(0, 8) || 'allocation'}.pdf`);
  };

  const rows = [
    ['Exam Centre', centre?.name],
    ['Address', `${centre?.address || ''}, ${centre?.lga || ''}, ${centre?.state || ''}`],
    ['Exam Date', formatDate(examDateStr)],
    ['Batch', `Batch ${batchNumber}`],
    ['Arrival Time', arrivalTime],
    ['Exam Start', examStart],
    ['Exam End', examEnd],
    ['Distance from You', distanceKm ? `${distanceKm} km` : 'N/A'],
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f0', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ background: '#006400', color: 'white', padding: '16px 24px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>✅ Allocation Successful</h1>
      </header>
      <div style={{ maxWidth: '680px', margin: '24px auto', padding: '0 16px' }}>
        <div ref={slipRef} style={{ background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '2px solid #006400' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #006400', paddingBottom: '12px', marginBottom: '16px' }}>
            <h2 style={{ color: '#006400', margin: 0, fontSize: '16px' }}>JOINT ADMISSIONS AND MATRICULATION BOARD</h2>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: '13px' }}>CBT Examination Allocation Slip</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <tbody>
              {rows.map(([label, value], i) => (
                <tr key={label} style={{ background: i % 2 === 0 ? '#f9f9f9' : 'white' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', width: '40%', borderBottom: '1px solid #eee' }}>{label}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{value || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '16px', padding: '12px', background: '#fff3cd', borderRadius: '4px', fontSize: '13px', color: '#856404' }}>
            ⚠️ Arrive at least 30 minutes before your scheduled arrival time. Bring this slip and a valid ID.
          </div>
        </div>

        {/* Map */}
        {centre?.latitude && centre?.longitude && (
          <div style={{ marginTop: '16px', borderRadius: '8px', overflow: 'hidden', height: '280px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <MapContainer center={[centre.latitude, centre.longitude]} zoom={14} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
              <Marker position={[centre.latitude, centre.longitude]} />
            </MapContainer>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          {[
            ['⬇ Download PDF', downloadPDF, '#006400'],
            ['🖨 Print', () => window.print(), '#1a5276'],
            ['← New Registration', () => navigate('/'), '#666'],
          ].map(([label, fn, bg]: any) => (
            <button key={label} onClick={fn} style={{ flex: 1, background: bg, color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
