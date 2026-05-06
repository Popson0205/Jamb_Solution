import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png', iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png' });

interface FormData { reg_number: string; full_name: string; phone: string; email: string; state: string; lga: string; ward: string; }

function LocationPicker({ onSelect }: { onSelect: (lat: number, lon: number) => void }) {
  useMapEvents({ click(e) { onSelect(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export default function RegisterPage() {
  const { register, handleSubmit } = useForm<FormData>();
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords([pos.coords.latitude, pos.coords.longitude]),
      () => setError('Could not get location. Please click on the map.')
    );
  };

  const onSubmit = async (data: FormData) => {
    if (!coords) { setError('Please select your location on the map or use "Use My Location"'); return; }
    setLoading(true); setError('');
    try {
      const res = await axios.post('/api/student/register', { ...data, latitude: coords[0], longitude: coords[1] });
      navigate('/result', { state: res.data });
    } catch (e: any) {
      setError(e.response?.data?.error || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', marginTop: '4px' };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f0', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ background: '#006400', color: 'white', padding: '16px 24px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>JAMB CBT Centre Allocation</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.85 }}>Submit your biodata to receive your nearest exam centre</p>
      </header>
      <div style={{ maxWidth: '680px', margin: '24px auto', padding: '0 16px' }}>
        <form onSubmit={handleSubmit(onSubmit)} style={{ background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h2 style={{ marginTop: 0, color: '#006400', fontSize: '18px' }}>Student Biodata</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[['reg_number','Registration Number *','e.g. 20250012345AB'],['full_name','Full Name *','Surname First'],['phone','Phone Number','080XXXXXXXX'],['email','Email Address','you@email.com'],['state','State *','e.g. Lagos'],['lga','LGA *','e.g. Ikeja']].map(([name, label, ph]) => (
              <div key={name}><label style={{ fontSize: '13px', fontWeight: 'bold' }}>{label}</label><input {...register(name as any)} placeholder={ph} style={inp} /></div>
            ))}
            <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: '13px', fontWeight: 'bold' }}>Ward (Optional)</label><input {...register('ward')} placeholder="e.g. Ward 5" style={inp} /></div>
          </div>
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Your Location * <span style={{ fontWeight: 'normal', color: '#666' }}>(click map or use button)</span></label>
              <button type="button" onClick={useMyLocation} style={{ background: '#006400', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>📍 Use My Location</button>
            </div>
            <div style={{ height: '300px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd' }}>
              <MapContainer center={coords || [9.0820, 8.6753]} zoom={coords ? 14 : 6} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                <LocationPicker onSelect={(lat, lon) => setCoords([lat, lon])} />
                {coords && <Marker position={coords} />}
              </MapContainer>
            </div>
            {coords && <p style={{ color: '#006400', fontSize: '13px', margin: '6px 0 0' }}>✅ Location set: {coords[0].toFixed(5)}, {coords[1].toFixed(5)}</p>}
          </div>
          {error && <p style={{ color: '#c0392b', marginTop: '12px', fontSize: '14px' }}>⚠️ {error}</p>}
          <button type="submit" disabled={loading} style={{ marginTop: '20px', width: '100%', background: loading ? '#999' : '#006400', color: 'white', border: 'none', padding: '14px', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Finding Your Centre...' : 'Submit & Get Allocation'}
          </button>
          <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: '#666' }}>Already registered? <a href="/lookup" style={{ color: '#006400' }}>Look up your allocation</a></p>
        </form>
      </div>
    </div>
  );
}
