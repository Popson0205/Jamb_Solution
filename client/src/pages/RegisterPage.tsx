import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface FormData {
  reg_number: string; full_name: string; phone: string;
  email: string; state: string; lga: string; ward: string;
}

function LocationPicker({ onSelect }: { onSelect: (lat: number, lon: number) => void }) {
  useMapEvents({ click(e) { onSelect(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export default function RegisterPage() {
  const { register, handleSubmit } = useForm<FormData>();
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState('');
  const navigate = useNavigate();

  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords([pos.coords.latitude, pos.coords.longitude]),
      () => setError('Could not get location. Please click on the map to set your location.')
    );
  };

  const onSubmit = async (data: FormData) => {
    if (!coords) {
      setError('Please select your location on the map or click "Use My Location".');
      setErrorType('location');
      return;
    }
    setLoading(true); setError(''); setErrorType('');
    try {
      const res = await axios.post('/api/student/register', {
        ...data,
        reg_number: data.reg_number.trim().toUpperCase(),
        full_name: data.full_name.trim().toUpperCase(),
        latitude: coords[0],
        longitude: coords[1],
      });
      navigate('/result', { state: res.data });
    } catch (e: any) {
      const errData = e.response?.data;
      if (errData?.error === 'verification_failed') {
        setErrorType('verification');
        setError(errData.message || 'Verification failed. Please check your registration number and full name.');
      } else {
        setErrorType('general');
        setError(errData?.error || 'Registration failed. Please try again.');
      }
    } finally { setLoading(false); }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1px solid #ddd',
    borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', marginTop: '4px',
  };

  const errorColors: Record<string, { bg: string; border: string; color: string }> = {
    verification: { bg: '#fff3cd', border: '#ffc107', color: '#856404' },
    location: { bg: '#fde8e8', border: '#f5c6cb', color: '#c0392b' },
    general: { bg: '#fde8e8', border: '#f5c6cb', color: '#c0392b' },
  };
  const errStyle = errorColors[errorType] || errorColors.general;

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f0', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ background: '#006400', color: 'white', padding: '16px 24px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>JAMB CBT Centre Allocation</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.85 }}>
          Submit your biodata to receive your nearest exam centre
        </p>
      </header>

      <div style={{ maxWidth: '680px', margin: '24px auto', padding: '0 16px' }}>
        <form onSubmit={handleSubmit(onSubmit)} style={{ background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h2 style={{ marginTop: 0, color: '#006400', fontSize: '18px' }}>Student Biodata</h2>

          {/* Important notice */}
          <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '6px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#2e7d32' }}>
            ℹ️ Your <strong>Registration Number</strong> and <strong>Full Name</strong> must match exactly as registered with JAMB (e.g. <em>OKONKWO GABRIEL CORNELIUS</em>).
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label htmlFor="reg_number" style={{ fontSize: '13px', fontWeight: 'bold' }}>Registration Number *</label>
              <input id="reg_number" {...register('reg_number')} placeholder="e.g. 202664221019KQ" style={{ ...inp, fontFamily: 'monospace', letterSpacing: '1px' }} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label htmlFor="full_name" style={{ fontSize: '13px', fontWeight: 'bold' }}>Full Name * <span style={{ fontWeight: 'normal', color: '#888' }}>(as registered with JAMB — SURNAME FIRSTNAME MIDDLENAME)</span></label>
              <input {...register('full_name')} id="full_name" placeholder="e.g. OKONKWO GABRIEL CORNELIUS" style={{ ...inp, textTransform: 'uppercase' }} />
            </div>
            {[['phone','Phone Number','080XXXXXXXX'],['email','Email Address','you@email.com'],['state','State','e.g. Lagos'],['lga','LGA','e.g. Ikeja']].map(([name, label, ph]) => (
              <div key={name}>
                <label htmlFor={name} style={{ fontSize: '13px', fontWeight: 'bold' }}>{label}</label>
                <input id={name} {...register(name as any)} placeholder={ph} style={inp} />
              </div>
            ))}
            <div style={{ gridColumn: '1/-1' }}>
              <label htmlFor="ward" style={{ fontSize: '13px', fontWeight: 'bold' }}>Ward <span style={{ fontWeight: 'normal', color: '#888' }}>(Optional)</span></label>
              <input id="ward" {...register('ward')} placeholder="e.g. Ward 5" style={inp} />
            </div>
          </div>

          {/* Map */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: 'bold', fontSize: '13px' }}>
                Your Location * <span style={{ fontWeight: 'normal', color: '#666' }}>(click map or use button)</span>
              </label>
              <button type="button" onClick={useMyLocation} style={{ background: '#006400', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                📍 Use My Location
              </button>
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

          {/* Error */}
          {error && (
            <div style={{ marginTop: '16px', padding: '12px 16px', background: errStyle.bg, border: `1px solid ${errStyle.border}`, borderRadius: '6px', color: errStyle.color, fontSize: '14px' }}>
              {errorType === 'verification' ? '🚫' : '⚠️'} {error}
              {errorType === 'verification' && (
                <div style={{ marginTop: '8px', fontSize: '12px' }}>
                  Make sure your name is entered exactly as it appears on your JAMB registration slip — all caps, surname first.
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ marginTop: '20px', width: '100%', background: loading ? '#999' : '#006400', color: 'white', border: 'none', padding: '14px', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '🔍 Verifying & Finding Your Centre...' : 'Submit & Get Allocation'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: '#666' }}>
            Already registered? <a href="/lookup" style={{ color: '#006400' }}>Look up your allocation</a>
          </p>
        </form>
      </div>
    </div>
  );
}
