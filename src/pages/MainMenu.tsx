import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLang } from '../contexts/LanguageContext';
import SettingsModal from '../components/SettingsModal';
import './MainMenu.css';

const MainMenu: React.FC = () => {
  const { t } = useTranslation();
  const { lang, toggleLang } = useLang();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Animated starfield / road background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let stars: { x: number; y: number; r: number; speed: number; opacity: number }[] = [];
    let roadLines: { y: number; speed: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create stars
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.6,
        r: Math.random() * 1.5 + 0.3,
        speed: Math.random() * 0.3 + 0.05,
        opacity: Math.random() * 0.8 + 0.2
      });
    }

    // Road dashes
    for (let i = 0; i < 12; i++) {
      roadLines.push({
        y: (canvas.height * 0.65) + i * 80,
        speed: 4 + Math.random() * 2
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.7);
      sky.addColorStop(0, '#020810');
      sky.addColorStop(0.4, '#050D1A');
      sky.addColorStop(0.7, '#0A1628');
      sky.addColorStop(1, '#0D2040');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height * 0.7);

      // Mountain silhouettes
      ctx.fillStyle = '#06111E';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height * 0.68);
      ctx.lineTo(canvas.width * 0.15, canvas.height * 0.45);
      ctx.lineTo(canvas.width * 0.3, canvas.height * 0.58);
      ctx.lineTo(canvas.width * 0.45, canvas.height * 0.38);
      ctx.lineTo(canvas.width * 0.6, canvas.height * 0.52);
      ctx.lineTo(canvas.width * 0.75, canvas.height * 0.42);
      ctx.lineTo(canvas.width * 0.9, canvas.height * 0.55);
      ctx.lineTo(canvas.width, canvas.height * 0.50);
      ctx.lineTo(canvas.width, canvas.height * 0.68);
      ctx.closePath();
      ctx.fill();

      // Stars
      stars.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.opacity})`;
        ctx.fill();
        s.opacity += (Math.random() - 0.5) * 0.04;
        s.opacity = Math.max(0.1, Math.min(1, s.opacity));
      });

      // Road (perspective)
      const road = ctx.createLinearGradient(0, canvas.height * 0.68, 0, canvas.height);
      road.addColorStop(0, '#0F2040');
      road.addColorStop(1, '#1A3060');
      ctx.fillStyle = road;
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.3, canvas.height * 0.68);
      ctx.lineTo(canvas.width * 0.7, canvas.height * 0.68);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.closePath();
      ctx.fill();

      // Road center dashes
      roadLines.forEach(rl => {
        const progress = (rl.y - canvas.height * 0.68) / (canvas.height * 0.32);
        const x = canvas.width / 2;
        const w = 4 + progress * 20;
        const h = 20 + progress * 40;
        ctx.fillStyle = `rgba(245, 166, 35, ${0.3 + progress * 0.4})`;
        ctx.fillRect(x - w / 2, rl.y, w, h);
        rl.y += rl.speed;
        if (rl.y > canvas.height) rl.y = canvas.height * 0.68;
      });

      // Red/white dashed lines (road edges)
      const edgeL = (progress: number) => canvas.width * 0.3 + (progress * 0) + (-canvas.width * 0.3 * progress);
      const edgeR = (progress: number) => canvas.width * 0.7 + (canvas.width * 0.3 * progress);
      for (let p = 0; p < 1; p += 0.08) {
        const y = canvas.height * 0.68 + p * canvas.height * 0.32;
        const lx = canvas.width * 0.3 * (1 - p);
        const rx = canvas.width - lx;
        ctx.strokeStyle = `rgba(230, 51, 41, ${0.15 + p * 0.3})`;
        ctx.lineWidth = 1 + p * 2;
        ctx.setLineDash([20, 10]);
        ctx.beginPath();
        ctx.moveTo(lx, y);
        ctx.lineTo(lx - 5, y + canvas.height * 0.032);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rx, y);
        ctx.lineTo(rx + 5, y + canvas.height * 0.032);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Glow on horizon
      const horizonGlow = ctx.createRadialGradient(
        canvas.width / 2, canvas.height * 0.68, 0,
        canvas.width / 2, canvas.height * 0.68, canvas.width * 0.5
      );
      horizonGlow.addColorStop(0, 'rgba(230, 51, 41, 0.08)');
      horizonGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.3);

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const examModes = [
    {
      id: 'theory',
      icon: '📖',
      titleKey: 'menu.theory',
      descKey: 'menu.theoryDesc',
      color: '#2E86DE',
      glow: 'rgba(46,134,222,0.3)',
      path: '/theory'
    },
    {
      id: 'practical',
      icon: '🚗',
      titleKey: 'menu.practical',
      descKey: 'menu.practicalDesc',
      color: '#F5A623',
      glow: 'rgba(245,166,35,0.3)',
      path: '/city-select/practical'
    },
    {
      id: 'city',
      icon: '🏙️',
      titleKey: 'menu.city',
      descKey: 'menu.cityDesc',
      color: '#E63329',
      glow: 'rgba(230,51,41,0.3)',
      path: '/city-select/city'
    }
  ];

  return (
    <div className="main-menu">
      <canvas ref={canvasRef} className="menu-canvas" />

      {/* Top bar */}
      <header className="menu-header animate-fadeIn">
        <div className="menu-logo">
          <span className="menu-flag">🇬🇪</span>
          <div>
            <h1 className="menu-title-text">{t('app.title')}</h1>
            <p className="menu-subtitle-text">{t('app.subtitle')}</p>
          </div>
        </div>
        <div className="menu-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowSettings(true)} id="menu-settings-btn">
            ⚙️ Settings
          </button>
          <button className="lang-toggle btn btn-ghost btn-sm" onClick={toggleLang} id="lang-toggle-btn">
            {lang === 'ka' ? '🇬🇪 ქართული' : '🇬🇧 English'}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/auth')}
            id="menu-login-btn"
          >
            {t('nav.login')}
          </button>
        </div>
      </header>

      {/* Center content */}
      <main className="menu-main">
        {/* Georgian flag stripe */}
        <div className="flag-stripe animate-fadeIn">
          <div className="stripe-red" />
          <div className="stripe-white" />
          <div className="stripe-red" />
        </div>

        <h2 className="menu-choose-title animate-fadeIn delay-100">
          {t('menu.chooseExam')}
        </h2>

        {/* Exam mode cards */}
        <div className="menu-cards animate-fadeIn delay-200">
          {examModes.map((mode, i) => (
            <button
              key={mode.id}
              id={`exam-card-${mode.id}`}
              className="exam-card"
              style={{ '--card-color': mode.color, '--card-glow': mode.glow } as React.CSSProperties}
              onClick={() => navigate(mode.path)}
            >
              <div className="exam-card-icon">{mode.icon}</div>
              <h3 className="exam-card-title">{t(mode.titleKey)}</h3>
              <p className="exam-card-desc">{t(mode.descKey)}</p>
              <div className="exam-card-arrow">→</div>
              <div className="exam-card-glow" />
            </button>
          ))}
        </div>

        {/* Secondary nav */}
        <nav className="menu-secondary-nav animate-fadeIn delay-300">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/profile')} id="menu-profile-btn">
            👤 {t('nav.myProfile')}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leaderboard')} id="menu-leaderboard-btn">
            🏆 {t('nav.leaderboard')}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/how-to-play')} id="menu-howtoplay-btn">
            ❓ {t('nav.howToPlay')}
          </button>
        </nav>
      </main>

      {/* Bottom credits */}
      <footer className="menu-footer animate-fadeIn delay-400">
        <p className="text-muted text-sm">
          Georgian Driving License Simulator · {new Date().getFullYear()}
        </p>
      </footer>
      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default MainMenu;
