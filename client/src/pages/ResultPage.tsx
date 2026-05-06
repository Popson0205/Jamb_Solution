import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png', iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png' });

export default function ResultPage() {
  const { state: data } = useLocation();
  const navigate = useNavigate();
  const slipRef = useRef<HTMLDivElement>(null);

  if (!data || data.status === 'unallocated') {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', fontFamily: 'Arial, sans-serif' }}>
        <h2 style={{ color: '#c0392b' }}>⚠️ No Allocation Found</h2>
        <p>All centres within your area are currently full. You have been flagged for manual assignment. Please check back later or contact JAMB.</p>
        <button onClick={() => navigate('/')} style={btnStyle('#006400')}>← Back to Registration</button>
      </div>
    );
  }

  const { centre, batch, exam_date, distance_km, allocation } = data;
  const studentCoords: [number, number] | null = null; // Would come from stored student data

  const downloadPDF = async () => {
    if (!slipRef.current) return;
    const canvas = await html2canvas(slipRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`JAMB_Allocation_${allocation?.student_id?.slice(0,8) || 'slip'}.pdf`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f0', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ background: '#006400', color: 'white', padding: '16px 24px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>✅ Allocation Successful</h1>
      </header>
      <div style={{ maxWidth: '680px', margin: '24px auto', padding: '0 16px' }}>
        {/* Printable slip */}
        <div ref={slipRef} style={{ background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '2px solid #006400' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #006400', paddingBottom: '12px', marginBottom: '16px' }}>
            <h2 style={{ color: '#006400', margin: 0 }}>JOINT ADMISSIONS AND MATRICULATION BOARD</h2>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>CBT Examination Allocation Slip</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            {[
              ['Exam Centre', centre?.name],
              ['Address', `${centre?.address}, ${centre?.lga}, ${centre?.state}`],
              ['Exam Date', new Date(exam_date).toDateString()],
              ['Batch', `Batch ${batch?.number}`],
              ['Arrival Time', batch?.arrival],
              ['Exam Start', batch?.exam_start],
              ['Exam End', batch?.exam_end],
              ['Distance from You', `${distance_km} km`],
            ].map(([label, value], i) => (
              <tr key={label} style={{ background: i % 2 === 0 ? '#f9f9f9' : 'white' }}>
                <td style={{ padding: '10px', fontWeight: 'bold', width: '40%', borderBottom: '1px solid #eee' }}>{label}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{value}</td>
              </tr>
            ))}
          </table>
          <div style={{ marginTop: '16px', padding: '12px', background: '#fff3cd', borderRadius: '4px', fontSize: '13px', color: '#856404' }}>
            ⚠️ Arrive at least 30 minutes before your scheduled arrival time. Bring this slip and a valid ID.
          </div>
        </div>

        {/* Map */}
        <div style={{ marginTop: '16px', borderRadius: '8px', overflow: 'hidden', height: '280px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <MapContainer center={[centre?.latitude || 9.08, centre?.longitude || 8.67]} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
            {centre && <Marker position={[centre.latitude, centre.longitude]} />}
          </MapContainer>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button onClick={downloadPDF} style={btnStyle('#006400')}>⬇ Download PDF Slip</button>
          <button onClick={() => window.print()} style={btnStyle('#1a5276')}>🖨 Print</button>
          <button onClick={() => navigate('/')} style={btnStyle('#666')}>← New Registration</button>
        </div>
      </div>
    </div>
  );
}

const btnStyle = (bg: string): React.CSSProperties => ({ background: bg, color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', flex: 1 });
