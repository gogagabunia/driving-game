import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './i18n';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

import MainMenu from './pages/MainMenu';
import CitySelect from './pages/CitySelect';
import TheoryExam from './pages/TheoryExam';
import PracticalExam from './pages/PracticalExam';
import CityExam from './pages/CityExam';
import Auth from './pages/Auth';
import Profile from './pages/Profile';

const LoadingScreen: React.FC = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#050D1A',
    color: '#F0F4FF',
    gap: '1.25rem'
  }}>
    <span style={{ fontSize: '3rem', animation: 'float 3s ease-in-out infinite' }}>🇬🇪</span>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <p style={{ fontSize: '1rem', color: '#8BA4C4', fontFamily: 'Inter, sans-serif' }}>Loading...</p>
      <div style={{ width: '120px', height: '3px', background: 'rgba(100,150,220,0.15)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ width: '60%', height: '100%', background: 'linear-gradient(135deg,#E63329,#C0392B)', borderRadius: '99px', animation: 'shimmer 1.5s linear infinite' }} />
      </div>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Main menu */}
              <Route path="/" element={<MainMenu />} />

              {/* Auth */}
              <Route path="/auth" element={<Auth />} />

              {/* Profile */}
              <Route path="/profile" element={<Profile />} />

              {/* Theory exam (no city needed) */}
              <Route path="/theory" element={<TheoryExam />} />

              {/* City selection for practical and city exams */}
              <Route path="/city-select/:examType" element={<CitySelect />} />

              {/* Practical exam (closed course) with city */}
              <Route path="/practical/:cityId" element={<PracticalExam />} />

              {/* City driving exam */}
              <Route path="/city/:cityId" element={<CityExam />} />

              {/* Fallback */}
              <Route path="*" element={<MainMenu />} />
            </Routes>
          </Suspense>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
