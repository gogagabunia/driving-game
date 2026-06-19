import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cities, difficultyColors, difficultyStars } from '../data/cities';
import './CitySelect.css';

const CitySelect: React.FC = () => {
  const { t } = useTranslation();
  const { examType } = useParams<{ examType: string }>();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const hoveredCity = cities.find(c => c.id === hovered);
  const selectedCity = cities.find(c => c.id === selected);

  const difficultyKey = (d: string) => {
    const map: Record<string, string> = {
      easy: 'citySelect.easy',
      medium: 'citySelect.medium',
      hard: 'citySelect.hard',
      veryHard: 'citySelect.veryHard'
    };
    return map[d] || d;
  };

  const handleStart = () => {
    if (!selected) return;
    navigate(`/${examType}/${selected}`);
  };

  // Georgia country SVG viewBox approximately 41.0°–46.7°E, 41.0°–43.6°N
  // Pins are pre-calculated as % of the SVG bounding box
  return (
    <div className="city-select-page">
      {/* Background */}
      <div className="city-select-bg" />

      {/* Header */}
      <header className="cs-header animate-fadeIn">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} id="cs-back-btn">
          ← {t('citySelect.back')}
        </button>
        <h1 className="cs-title">{t('citySelect.title')}</h1>
        <div className="cs-mode-badge">
          {examType === 'practical' ? '🚗' : '🏙️'}&nbsp;
          {examType === 'practical' ? t('menu.practical') : t('menu.city')}
        </div>
      </header>

      <main className="cs-main">
        {/* Map panel */}
        <div className="cs-map-panel animate-fadeIn">
          <div className="cs-map-container">
            {/* Georgia country shape as SVG */}
            <svg
              viewBox="0 0 800 360"
              className="georgia-map-svg"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(46,134,222,0.08)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>

              {/* Country fill */}
              <path
                d="M 80 180 L 120 150 L 160 145 L 200 130 L 250 120 L 300 110 L 340 105 L 380 108 L 420 100 L 460 95 L 500 90 L 540 100 L 580 110 L 620 120 L 660 130 L 700 145 L 720 160 L 710 180 L 690 200 L 680 220 L 660 240 L 640 255 L 620 260 L 600 265 L 580 270 L 560 268 L 540 260 L 520 250 L 500 245 L 480 248 L 460 255 L 440 260 L 420 265 L 400 268 L 380 265 L 360 260 L 340 255 L 320 258 L 300 260 L 280 258 L 260 252 L 240 248 L 220 245 L 200 248 L 180 252 L 160 255 L 140 250 L 120 240 L 100 225 L 85 205 Z"
                fill="rgba(15, 40, 80, 0.7)"
                stroke="rgba(46,134,222,0.4)"
                strokeWidth="1.5"
              />
              {/* Country fill gradient overlay */}
              <path
                d="M 80 180 L 120 150 L 160 145 L 200 130 L 250 120 L 300 110 L 340 105 L 380 108 L 420 100 L 460 95 L 500 90 L 540 100 L 580 110 L 620 120 L 660 130 L 700 145 L 720 160 L 710 180 L 690 200 L 680 220 L 660 240 L 640 255 L 620 260 L 600 265 L 580 270 L 560 268 L 540 260 L 520 250 L 500 245 L 480 248 L 460 255 L 440 260 L 420 265 L 400 268 L 380 265 L 360 260 L 340 255 L 320 258 L 300 260 L 280 258 L 260 252 L 240 248 L 220 245 L 200 248 L 180 252 L 160 255 L 140 250 L 120 240 L 100 225 L 85 205 Z"
                fill="url(#mapGlow)"
              />

              {/* Mountain range hint */}
              <path
                d="M 100 195 L 140 175 L 180 168 L 240 158 L 300 150 L 360 145 L 420 140 L 480 138 L 540 142 L 600 150 L 650 160 L 700 172"
                fill="none"
                stroke="rgba(100,150,220,0.15)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />

              {/* City pins */}
              {cities.map(city => {
                const isHovered = hovered === city.id;
                const isSelected = selected === city.id;
                const color = difficultyColors[city.difficulty];

                // Pin coordinates on the SVG
                const pinPositions: Record<string, { x: number; y: number }> = {
                  rustavi:     { x: 570, y: 200 },
                  telavi:      { x: 610, y: 190 },
                  kutaisi:     { x: 310, y: 195 },
                  batumi:      { x: 155, y: 245 },
                  akhaltsikhe: { x: 360, y: 235 },
                  zugdidi:     { x: 220, y: 190 },
                  gori:        { x: 460, y: 200 },
                  poti:        { x: 170, y: 215 },
                  ozurgeti:    { x: 230, y: 235 },
                  sachkhere:   { x: 370, y: 205 },
                  ambrolauri:  { x: 330, y: 188 },
                  akhalkalaki: { x: 460, y: 248 }
                };

                const pos = pinPositions[city.id] || { x: 400, y: 200 };

                return (
                  <g key={city.id}>
                    {/* Selection ring */}
                    {isSelected && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="18"
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        opacity="0.6"
                        className="pin-ring"
                      />
                    )}
                    {/* Pulse ring on hover */}
                    {isHovered && !isSelected && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="14"
                        fill="none"
                        stroke={color}
                        strokeWidth="1"
                        opacity="0.4"
                      />
                    )}
                    {/* Pin dot */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isSelected ? 9 : isHovered ? 8 : 6}
                      fill={color}
                      stroke={isSelected ? '#fff' : 'rgba(255,255,255,0.5)'}
                      strokeWidth={isSelected ? 2 : 1}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                      onClick={() => setSelected(city.id)}
                      onMouseEnter={() => setHovered(city.id)}
                      onMouseLeave={() => setHovered(null)}
                      filter={`drop-shadow(0 0 6px ${color})`}
                    />
                    {/* City label */}
                    {(isHovered || isSelected) && (
                      <text
                        x={pos.x}
                        y={pos.y - 14}
                        textAnchor="middle"
                        fill="#F0F4FF"
                        fontSize="10"
                        fontWeight="700"
                        fontFamily="Inter, sans-serif"
                        style={{ pointerEvents: 'none' }}
                      >
                        {city.nameEn}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Map legend */}
            <div className="map-legend">
              {Object.entries(difficultyColors).map(([d, color]) => (
                <div key={d} className="legend-item">
                  <span className="legend-dot" style={{ background: color }} />
                  <span className="text-xs text-secondary">{t(difficultyKey(d))}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* City list panel */}
        <div className="cs-list-panel">
          <p className="text-secondary text-sm" style={{ marginBottom: '0.75rem' }}>
            {t('citySelect.subtitle')}
          </p>

          <div className="city-list">
            {cities.map((city, i) => {
              const isSelected = selected === city.id;
              const color = difficultyColors[city.difficulty];
              const stars = difficultyStars[city.difficulty];

              return (
                <button
                  key={city.id}
                  id={`city-btn-${city.id}`}
                  className={`city-list-item animate-slideLeft ${isSelected ? 'selected' : ''}`}
                  style={{
                    '--city-color': color,
                    animationDelay: `${i * 0.04}s`
                  } as React.CSSProperties}
                  onClick={() => setSelected(city.id)}
                >
                  <div className="city-list-left">
                    <div className="city-list-dot" style={{ background: color }} />
                    <div>
                      <div className="city-list-name">{city.nameKa} / {city.nameEn}</div>
                      <div className="city-list-stars">
                        {'⭐'.repeat(stars)}{'☆'.repeat(4 - stars)}
                        <span className="text-xs text-muted" style={{ marginLeft: 4 }}>
                          {t(difficultyKey(city.difficulty))}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isSelected && <span className="city-check">✓</span>}
                </button>
              );
            })}
          </div>

          {/* City detail card */}
          {selectedCity && (
            <div className="city-detail-card animate-fadeInScale">
              <div className="city-detail-header">
                <h3 className="city-detail-name">
                  {selectedCity.nameKa}
                  <span className="text-secondary" style={{ marginLeft: 8, fontWeight: 400 }}>
                    {selectedCity.nameEn}
                  </span>
                </h3>
                <span
                  className="badge"
                  style={{
                    background: `${difficultyColors[selectedCity.difficulty]}22`,
                    color: difficultyColors[selectedCity.difficulty],
                    border: `1px solid ${difficultyColors[selectedCity.difficulty]}44`
                  }}
                >
                  {t(difficultyKey(selectedCity.difficulty))}
                </span>
              </div>
              <p className="city-detail-desc text-secondary text-sm">{selectedCity.descEn}</p>
              <div className="city-detail-tags">
                {selectedCity.hasWeatherEffects && (
                  <span className="badge badge-blue">🌦 Weather Effects</span>
                )}
                {selectedCity.hasNightMode && (
                  <span className="badge badge-purple">🌙 Night Mode</span>
                )}
                <span className="badge badge-gray">📍 {selectedCity.landmarks[0]}</span>
              </div>

              <button
                id="city-start-btn"
                className="btn btn-primary btn-lg w-full"
                style={{ marginTop: '1rem' }}
                onClick={handleStart}
              >
                {t('citySelect.startExam')} →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CitySelect;
