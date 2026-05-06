import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import ResultPage from './pages/ResultPage';
import LookupPage from './pages/LookupPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RegisterPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/lookup" element={<LookupPage />} />
      </Routes>
    </BrowserRouter>
  );
}
