import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png', iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png' });

interface FormData {
  reg_number: string; full_name: string; phone: string; email: string;
  state: string; lga: string; ward: string;
}

function LocationPicker({ onSelect }: { onSelect: (lat: number, lon: number) => void }) {
  useMapEvents({ click(e) { onSelect(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
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

  const NIGERIA_CENTER: [number, number] = [9.0820, 8.6753];

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
            <div><label>Registration Number *</label><input {...register('reg_number', { required: true })} placeholder="e.g. 20250012345AB" style={inputStyle} /></div>
            <div><label>Full Name *</label><input {...register('full_name', { required: true })} placeholder="Surname First" style={inputStyle} /></div>
            <div><label>Phone Number</label><input {...register('phone')} placeholder="080XXXXXXXX" style={inputStyle} /></div>
            <div><label>Email Address</label><input {...register('email')} type="email" placeholder="you@email.com" style={inputStyle} /></div>
            <div><label>State *</label><input {...register('state', { required: true })} placeholder="e.g. Lagos" style={inputStyle} /></div>
            <div><label>LGA *</label><input {...register('lga', { required: true })} placeholder="e.g. Ikeja" style={inputStyle} /></div>
            <div style={{ gridColumn: '1/-1' }}><label>Ward (Optional)</label><input {...register('ward')} placeholder="e.g. Ward 5" style={inputStyle} /></div>
          </div>
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: 'bold' }}>Your Location * <span style={{ fontWeight: 'normal', color: '#666', fontSize: '13px' }}>(click on map or use button)</span></label>
              <button type="button" onClick={useMyLocation} style={{ background: '#006400', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>📍 Use My Location</button>
            </div>
            <div style={{ height: '300px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd' }}>
              <MapContainer center={coords || NIGERIA_CENTER} zoom={coords ? 14 : 6} style={{ height: '100%', width: '100%' }}>
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

const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', marginTop: '4px' };
