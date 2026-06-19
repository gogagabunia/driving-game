import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { logOut } from '../firebase';
import './Profile.css';

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────
type ExamType = 'theory' | 'practical' | 'city';

interface ExamRecord {
  id: string;
  date: string;
  type: ExamType;
  city?: string;
  score: number;
  maxScore: number;
  passed: boolean;
  duration: number; // seconds
}

interface Achievement {
  key: string;
  icon: string;
  label: string;
  earned: boolean;
  earnedAt?: string;
}

const ACHIEVEMENTS: Achievement[] = [
  { key: 'first_pass',       icon: '🎓', label: 'First Pass',         earned: false },
  { key: 'perfect_theory',   icon: '💯', label: 'Perfect Theory',     earned: false },
  { key: 'smooth_driver',    icon: '🚗', label: 'Smooth Driver',      earned: false },
  { key: 'city_explorer',    icon: '🏙️', label: 'City Explorer',      earned: false },
  { key: 'speed_learner',    icon: '⚡', label: 'Speed Learner',      earned: false },
  { key: 'all_city_champ',   icon: '🏆', label: 'All-City Champion',  earned: false },
  { key: 'persistent',       icon: '🔁', label: 'Persistent',         earned: false },
];

// ──────────────────────────────────────────────────────────────────────
// Helper: load local history (for guests)
// ──────────────────────────────────────────────────────────────────────
function getLocalHistory(): ExamRecord[] {
  try {
    return JSON.parse(localStorage.getItem('examHistory') || '[]');
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────
const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [history, setHistory] = useState<ExamRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'achievements' | 'stats'>('stats');

  useEffect(() => {
    // Load from localStorage for now; replace with Firestore query when backend is wired
    setHistory(getLocalHistory());
  }, []);

  const handleLogout = async () => {
    await logOut();
    navigate('/');
  };

  // ── Derived stats ────────────────────────────────────────────────
  const totalExams = history.length;
  const passed = history.filter(e => e.passed).length;
  const passRate = totalExams > 0 ? Math.round((passed / totalExams) * 100) : 0;
  const totalTimeSec = history.reduce((s, e) => s + e.duration, 0);
  const totalMin = Math.floor(totalTimeSec / 60);

  const theoryHistory = history.filter(e => e.type === 'theory');
  const theoryAvg = theoryHistory.length > 0
    ? Math.round(theoryHistory.reduce((s, e) => s + (e.score / e.maxScore) * 100, 0) / theoryHistory.length)
    : 0;

  // ── Category weak areas (mock for now) ──────────────────────────
  const weakAreas = [
    { cat: 'signs',    score: 72 },
    { cat: 'rules',    score: 85 },
    { cat: 'safety',   score: 91 },
    { cat: 'vehicle',  score: 68 },
    { cat: 'firstAid', score: 80 },
    { cat: 'ecology',  score: 95 },
    { cat: 'legal',    score: 75 },
  ].sort((a, b) => a.score - b.score);

  // ── Achievements ─────────────────────────────────────────────────
  const computedAchievements = ACHIEVEMENTS.map(a => ({
    ...a,
    earned: (() => {
      if (a.key === 'first_pass')     return passed > 0;
      if (a.key === 'perfect_theory') return theoryHistory.some(e => e.score === e.maxScore);
      if (a.key === 'persistent')     return totalExams >= 5;
      return false;
    })()
  }));

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Guest';
  const initials = displayName.slice(0, 2).toUpperCase();

  const typeLabel: Record<ExamType, string> = {
    theory: '📖 Theory', practical: '🚗 Practical', city: '🏙️ City'
  };

  return (
    <div className="profile-page">
      <div className="profile-bg" />

      {/* Header */}
      <header className="profile-header animate-fadeIn">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} id="profile-back-btn">
          ← {t('common.back')}
        </button>
        <h1 className="profile-title">{t('profile.title')}</h1>
        {user && (
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} id="profile-logout-btn">
            {t('nav.logout')}
          </button>
        )}
      </header>

      <div className="profile-container">
        {/* User card */}
        <div className="user-card animate-fadeIn">
          <div className="user-avatar">
            {user?.photoURL
              ? <img src={user.photoURL} alt={displayName} className="avatar-img" />
              : <span className="avatar-initials">{initials}</span>
            }
          </div>
          <div className="user-info">
            <h2 className="user-name">{displayName}</h2>
            {user?.email && <p className="user-email text-secondary text-sm">{user.email}</p>}
            {!user && <p className="text-warning text-sm">⚠ Guest mode — progress won't be saved</p>}
          </div>
          {!user && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth')} id="profile-login-btn">
              Login to Save Progress
            </button>
          )}
        </div>

        {/* Stat cards row */}
        <div className="stat-cards animate-fadeIn delay-100">
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-value">{totalExams}</div>
            <div className="stat-label text-secondary text-sm">{t('profile.examsCompleted')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-value">{passRate}%</div>
            <div className="stat-label text-secondary text-sm">{t('profile.passRate')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏱</div>
            <div className="stat-value">{totalMin}m</div>
            <div className="stat-label text-secondary text-sm">{t('profile.totalTime')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📖</div>
            <div className="stat-value">{theoryAvg > 0 ? `${theoryAvg}%` : '—'}</div>
            <div className="stat-label text-secondary text-sm">Theory Avg</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs animate-fadeIn delay-200">
          {(['stats', 'history', 'achievements'] as const).map(tab => (
            <button
              key={tab}
              id={`tab-${tab}`}
              className={`profile-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'stats' && '📊 '}
              {tab === 'history' && '📋 '}
              {tab === 'achievements' && '🏆 '}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'stats' && (
          <div className="profile-card animate-fadeIn">
            <h3 className="section-title">{t('profile.weakAreas')}</h3>
            <div className="weak-areas">
              {weakAreas.map(wa => (
                <div key={wa.cat} className="weak-row">
                  <span className="weak-name text-sm text-secondary">
                    {t(`theory.categories.${wa.cat}`)}
                  </span>
                  <div className="weak-bar-wrap">
                    <div
                      className="weak-bar-fill"
                      style={{
                        width: `${wa.score}%`,
                        background: wa.score < 70 ? '#EF4444' : wa.score < 85 ? '#F59E0B' : '#22C55E'
                      }}
                    />
                  </div>
                  <span className={`weak-score text-sm font-bold ${wa.score < 70 ? 'text-danger' : wa.score < 85 ? 'text-warning' : 'text-success'}`}>
                    {wa.score}%
                  </span>
                </div>
              ))}
            </div>
            {totalExams === 0 && (
              <div className="empty-state">
                <p className="text-secondary text-sm">No exam data yet. Take your first exam!</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/')} style={{ marginTop: '0.75rem' }}>
                  Start Exam
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="profile-card animate-fadeIn">
            <h3 className="section-title">{t('profile.history')}</h3>
            {history.length === 0 ? (
              <div className="empty-state">
                <p className="text-secondary text-sm">No exam history yet. Complete your first exam to see it here.</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/')} style={{ marginTop: '0.75rem' }}>
                  Start Now
                </button>
              </div>
            ) : (
              <div className="history-table">
                <div className="history-header">
                  <span>{t('profile.date')}</span>
                  <span>{t('profile.type')}</span>
                  <span>{t('profile.city')}</span>
                  <span>{t('profile.score')}</span>
                  <span>{t('profile.status')}</span>
                </div>
                {history.map(rec => (
                  <div key={rec.id} className="history-row">
                    <span className="text-sm text-secondary">{new Date(rec.date).toLocaleDateString()}</span>
                    <span className="text-sm">{typeLabel[rec.type]}</span>
                    <span className="text-sm text-secondary">{rec.city || '—'}</span>
                    <span className="text-sm font-bold">{rec.score}/{rec.maxScore}</span>
                    <span className={`badge ${rec.passed ? 'badge-green' : 'badge-red'}`}>
                      {rec.passed ? '✅ Pass' : '❌ Fail'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="profile-card animate-fadeIn">
            <h3 className="section-title">{t('profile.achievements')}</h3>
            <div className="achievements-grid">
              {computedAchievements.map(a => (
                <div
                  key={a.key}
                  className={`achievement-card ${a.earned ? 'earned' : 'locked'}`}
                  title={a.label}
                >
                  <span className="achievement-icon">{a.earned ? a.icon : '🔒'}</span>
                  <span className="achievement-label text-xs">{a.label}</span>
                  {a.earned && <span className="achievement-check">✓</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
