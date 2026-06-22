import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AudioSettings } from '../engine/SoundSynthesizer';
import './SettingsModal.css';

interface SettingsModalProps {
  onClose: () => void;
  onChanged?: () => void;
  isLive?: boolean;
}

interface SuspensionSettings {
  yStiffness: number;
  yDamping: number;
  pitchStiffness: number;
  pitchDamping: number;
  rollStiffness: number;
  rollDamping: number;
  squatDiveFactor: number;
  bodyRollFactor: number;
  fwdGripLimit: number;
  fwdUndersteer: number;
  fwdWeightTransfer: number;
  fwdSlipLoss: number;
}

const DEFAULT_SUSPENSION: SuspensionSettings = {
  yStiffness: 180,
  yDamping: 18,
  pitchStiffness: 150,
  pitchDamping: 16,
  rollStiffness: 150,
  rollDamping: 16,
  squatDiveFactor: 0.001,
  bodyRollFactor: 0.0,
  fwdGripLimit: 0.85,
  fwdUndersteer: 0.70,
  fwdWeightTransfer: 0.10,
  fwdSlipLoss: 0.40
};

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onChanged, isLive = false }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'audio' | 'suspension'>('audio');
  
  // Audio Settings State
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    master: 0.7,
    engine: 0.8,
    ambient: 0.6,
    ui: 0.8,
    muted: false
  });

  // Suspension Settings State
  const [suspensionSettings, setSuspensionSettings] = useState<SuspensionSettings>(DEFAULT_SUSPENSION);

  useEffect(() => {
    // Load Audio settings
    try {
      const storedAudio = localStorage.getItem('audioSettings');
      if (storedAudio) {
        setAudioSettings(JSON.parse(storedAudio));
      }
    } catch (e) {
      console.warn('Failed to load audio settings:', e);
    }

    // Load Suspension settings
    try {
      const storedSuspension = localStorage.getItem('suspensionSettings');
      if (storedSuspension) {
        setSuspensionSettings({
          ...DEFAULT_SUSPENSION,
          ...JSON.parse(storedSuspension)
        });
      }
    } catch (e) {
      console.warn('Failed to load suspension settings:', e);
    }
  }, []);

  const saveAudioSettings = (next: AudioSettings) => {
    setAudioSettings(next);
    try {
      localStorage.setItem('audioSettings', JSON.stringify(next));
      if (onChanged) onChanged();
    } catch (e) {
      console.warn('Failed to save audio settings:', e);
    }
  };

  const saveSuspensionSettings = (next: SuspensionSettings) => {
    setSuspensionSettings(next);
    try {
      localStorage.setItem('suspensionSettings', JSON.stringify(next));
      window.dispatchEvent(new Event('suspensionSettingsChanged'));
    } catch (e) {
      console.warn('Failed to save suspension settings:', e);
    }
  };

  const handleAudioSliderChange = (key: keyof Omit<AudioSettings, 'muted'>, val: number) => {
    saveAudioSettings({
      ...audioSettings,
      [key]: val
    });
  };

  const handleMuteToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    saveAudioSettings({
      ...audioSettings,
      muted: e.target.checked
    });
  };

  const handleSuspensionSliderChange = (key: keyof SuspensionSettings, val: number) => {
    saveSuspensionSettings({
      ...suspensionSettings,
      [key]: val
    });
  };

  const handleResetSuspension = () => {
    saveSuspensionSettings(DEFAULT_SUSPENSION);
  };

  return (
    <div className={`settings-modal-overlay ${isLive ? 'live-mode' : ''}`}>
      <div className="settings-box animate-fadeInScale">
        {/* Header */}
        <div className="settings-header">
          <h2 className="settings-title">⚙️ {t('practical.controls')} & Tuning</h2>
          <button className="settings-close-btn" onClick={onClose} id="settings-close-x">
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="settings-tabs">
          <button 
            className={`settings-tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
            onClick={() => setActiveTab('audio')}
          >
            🔊 Audio
          </button>
          <button 
            className={`settings-tab-btn ${activeTab === 'suspension' ? 'active' : ''}`}
            onClick={() => setActiveTab('suspension')}
          >
            🏎️ Suspension Tuning
          </button>
        </div>

        {/* Modal Body */}
        <div className="settings-body">
          {activeTab === 'audio' && (
            <>
              {/* Master Volume */}
              <div className="setting-row">
                <div className="setting-info">
                  <span>Master Volume</span>
                  <span>{Math.round(audioSettings.master * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioSettings.master}
                  onChange={(e) => handleAudioSliderChange('master', parseFloat(e.target.value))}
                  className="setting-slider"
                  id="slider-master"
                />
              </div>

              {/* Engine Volume */}
              <div className="setting-row">
                <div className="setting-info">
                  <span>Engine Sounds</span>
                  <span>{Math.round(audioSettings.engine * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioSettings.engine}
                  onChange={(e) => handleAudioSliderChange('engine', parseFloat(e.target.value))}
                  className="setting-slider"
                  id="slider-engine"
                />
              </div>

              {/* Ambient Volume */}
              <div className="setting-row">
                <div className="setting-info">
                  <span>Ambient Sounds</span>
                  <span>{Math.round(audioSettings.ambient * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioSettings.ambient}
                  onChange={(e) => handleAudioSliderChange('ambient', parseFloat(e.target.value))}
                  className="setting-slider"
                  id="slider-ambient"
                />
              </div>

              {/* UI Volume */}
              <div className="setting-row">
                <div className="setting-info">
                  <span>UI / SFX Volume</span>
                  <span>{Math.round(audioSettings.ui * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioSettings.ui}
                  onChange={(e) => handleAudioSliderChange('ui', parseFloat(e.target.value))}
                  className="setting-slider"
                  id="slider-ui"
                />
              </div>

              {/* Mute toggle */}
              <div className="settings-mute-row">
                <span className="mute-label">Mute All Sounds</span>
                <label className="mute-toggle">
                  <input
                    type="checkbox"
                    checked={audioSettings.muted}
                    onChange={handleMuteToggle}
                    id="checkbox-mute"
                  />
                  <span className="slider-switch" />
                </label>
              </div>
            </>
          )}

          {activeTab === 'suspension' && (
            <>
              {/* Height Stiffness */}
              <div className="setting-row">
                <div className="setting-info">
                  <span>Suspension Stiffness (Height)</span>
                  <span>{suspensionSettings.yStiffness} N/m</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="400"
                  step="10"
                  value={suspensionSettings.yStiffness}
                  onChange={(e) => handleSuspensionSliderChange('yStiffness', parseInt(e.target.value))}
                  className="setting-slider"
                />
              </div>

              {/* Height Damping */}
              <div className="setting-row">
                <div className="setting-info">
                  <span>Suspension Damping (Height)</span>
                  <span>{suspensionSettings.yDamping} N·s/m</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={suspensionSettings.yDamping}
                  onChange={(e) => handleSuspensionSliderChange('yDamping', parseInt(e.target.value))}
                  className="setting-slider"
                />
              </div>

              {/* Pitch Stiffness */}
              <div className="setting-row">
                <div className="setting-info">
                  <span>Pitch Stiffness (Tilt)</span>
                  <span>{suspensionSettings.pitchStiffness} N·m/rad</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="400"
                  step="10"
                  value={suspensionSettings.pitchStiffness}
                  onChange={(e) => handleSuspensionSliderChange('pitchStiffness', parseInt(e.target.value))}
                  className="setting-slider"
                />
              </div>

              {/* Pitch Damping */}
              <div className="setting-row">
                <div className="setting-info">
                  <span>Pitch Damping (Tilt)</span>
                  <span>{suspensionSettings.pitchDamping} N·m·s/rad</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={suspensionSettings.pitchDamping}
                  onChange={(e) => handleSuspensionSliderChange('pitchDamping', parseInt(e.target.value))}
                  className="setting-slider"
                />
              </div>

              {/* Roll Stiffness */}
              <div className="setting-row">
                <div className="setting-info">
                  <span>Roll Stiffness (Lean)</span>
                  <span>{suspensionSettings.rollStiffness} N·m/rad</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="400"
                  step="10"
                  value={suspensionSettings.rollStiffness}
                  onChange={(e) => handleSuspensionSliderChange('rollStiffness', parseInt(e.target.value))}
                  className="setting-slider"
                />
              </div>

              {/* Roll Damping */}
              <div className="setting-row">
                <div className="setting-info">
                  <span>Roll Damping (Lean)</span>
                  <span>{suspensionSettings.rollDamping} N·m·s/rad</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={suspensionSettings.rollDamping}
                  onChange={(e) => handleSuspensionSliderChange('rollDamping', parseInt(e.target.value))}
                  className="setting-slider"
                />
              </div>

              {/* Squat / Dive Factor */}
              <div className="setting-row">
                <div className="setting-info">
                  <span>Acceleration Squat / Dive</span>
                  <span>{suspensionSettings.squatDiveFactor.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.05"
                  step="0.001"
                  value={suspensionSettings.squatDiveFactor}
                  onChange={(e) => handleSuspensionSliderChange('squatDiveFactor', parseFloat(e.target.value))}
                  className="setting-slider"
                />
              </div>

              {/* Body Roll Factor */}
              <div className="setting-row">
                <div className="setting-info">
                  <span>Cornering Body Roll</span>
                  <span>{suspensionSettings.bodyRollFactor.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.1"
                  step="0.002"
                  value={suspensionSettings.bodyRollFactor}
                  onChange={(e) => handleSuspensionSliderChange('bodyRollFactor', parseFloat(e.target.value))}
                  className="setting-slider"
                />
              </div>

              {/* Drivetrain Header */}
              <div style={{ margin: '1rem 0 0.5rem 0', fontSize: '0.8rem', color: '#ff4d4d', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🚗 FWD Drivetrain & Traction Physics
              </div>

              {/* FWD Grip Limit */}
              <div className="setting-row">
                <div className="setting-info">
                  <span>FWD Road Grip Limit</span>
                  <span>{suspensionSettings.fwdGripLimit.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.30"
                  max="1.20"
                  step="0.05"
                  value={suspensionSettings.fwdGripLimit}
                  onChange={(e) => handleSuspensionSliderChange('fwdGripLimit', parseFloat(e.target.value))}
                  className="setting-slider"
                />
              </div>

              {/* FWD Understeer */}
              <div className="setting-row">
                <div className="setting-info">
                  <span>FWD Understeer Coefficient</span>
                  <span>{suspensionSettings.fwdUndersteer.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="1.00"
                  step="0.05"
                  value={suspensionSettings.fwdUndersteer}
                  onChange={(e) => handleSuspensionSliderChange('fwdUndersteer', parseFloat(e.target.value))}
                  className="setting-slider"
                />
              </div>

              {/* FWD Weight Transfer */}
              <div className="setting-row">
                <div className="setting-info">
                  <span>FWD Accel Weight Transfer</span>
                  <span>{suspensionSettings.fwdWeightTransfer.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="0.30"
                  step="0.01"
                  value={suspensionSettings.fwdWeightTransfer}
                  onChange={(e) => handleSuspensionSliderChange('fwdWeightTransfer', parseFloat(e.target.value))}
                  className="setting-slider"
                />
              </div>

              {/* FWD Slip Loss */}
              <div className="setting-row">
                <div className="setting-info">
                  <span>FWD Wheel Spin Power Loss</span>
                  <span>{suspensionSettings.fwdSlipLoss.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="0.80"
                  step="0.05"
                  value={suspensionSettings.fwdSlipLoss}
                  onChange={(e) => handleSuspensionSliderChange('fwdSlipLoss', parseFloat(e.target.value))}
                  className="setting-slider"
                />
              </div>

              {/* Reset to Defaults button */}
              <button 
                style={{ 
                  marginTop: '0.5rem', 
                  background: 'rgba(255, 255, 255, 0.08)', 
                  border: '1.5px solid rgba(255, 255, 255, 0.15)', 
                  color: '#fff', 
                  padding: '0.65rem', 
                  borderRadius: '10px', 
                  cursor: 'pointer', 
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'background 0.2s'
                }}
                onClick={handleResetSuspension}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                id="btn-reset-suspension"
              >
                🔄 Reset to Defaults
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <button className="btn btn-primary w-full" onClick={onClose} id="settings-save-btn">
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
