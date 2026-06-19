import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  signInWithGoogle,
  signInWithFacebook,
  signInEmail,
  registerEmail
} from '../firebase';
import './Auth.css';

const Auth: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleError = (err: unknown) => {
    const code = (err as { code?: string })?.code || '';
    const messages: Record<string, string> = {
      'auth/email-already-in-use': 'This email is already registered.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/popup-closed-by-user': 'Sign-in was cancelled.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
    };
    setError(messages[code] || 'Something went wrong. Please try again.');
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await signInEmail(email, password);
      } else {
        await registerEmail(email, password, name);
      }
      navigate('/');
    } catch (err) {
      handleError(err);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      handleError(err);
    }
  };

  const handleFacebook = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithFacebook();
      navigate('/');
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />

      <button className="btn btn-ghost btn-sm auth-back" onClick={() => navigate('/')} id="auth-back-btn">
        ← {t('common.back')}
      </button>

      <div className="auth-card animate-fadeInScale">
        {/* Logo */}
        <div className="auth-logo">
          <span className="auth-flag">🇬🇪</span>
          <p className="text-sm text-secondary">Georgian Driving Simulator</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
            id="tab-login"
          >
            {t('nav.login')}
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
            id="tab-register"
          >
            {t('nav.register')}
          </button>
        </div>

        <h1 className="auth-title">
          {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
        </h1>

        {/* Social auth */}
        <div className="social-btns">
          <button
            className="btn btn-ghost social-btn"
            onClick={handleGoogle}
            disabled={loading}
            id="btn-google"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('auth.loginGoogle')}
          </button>
          <button
            className="btn btn-ghost social-btn"
            onClick={handleFacebook}
            disabled={loading}
            id="btn-facebook"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            {t('auth.loginFacebook')}
          </button>
        </div>

        <div className="auth-divider">
          <div className="divider" />
          <span className="text-muted text-xs">or</span>
          <div className="divider" />
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label text-sm text-secondary">{t('auth.name')}</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="John Doe"
                required
                id="input-name"
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label text-sm text-secondary">{t('auth.email')}</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              id="input-email"
            />
          </div>
          <div className="form-group">
            <label className="form-label text-sm text-secondary">{t('auth.password')}</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              id="input-password"
            />
          </div>

          {error && (
            <div className="auth-error">
              <span>⚠</span> {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
            id="btn-submit-auth"
          >
            {loading ? <span className="animate-spin" style={{ fontSize: '1.1rem' }}>⚙</span>
              : mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
          </button>
        </form>

        <div className="auth-switch">
          <span className="text-secondary text-sm">
            {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            id="btn-mode-switch"
          >
            {mode === 'login' ? t('auth.signUp') : t('auth.signIn')}
          </button>
        </div>

        <button
          className="btn btn-ghost btn-sm w-full"
          onClick={() => navigate('/')}
          style={{ marginTop: '0.5rem', opacity: 0.6 }}
          id="btn-guest"
        >
          {t('auth.continueGuest')}
        </button>
      </div>
    </div>
  );
};

export default Auth;
