import React, { useState, useEffect } from 'react';
import { Zap, Brain, Shield, Settings, CheckCircle, Lock } from './LocalIcons';
import './styles/ExecutionModeSelector.css';


const ZapIcon = ({ className }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

const BrainIcon = ({ className }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
    <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
    <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
    <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
    <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
    <path d="M6 18a4 4 0 0 1-1.967-.516" />
    <path d="M19.967 17.484A4 4 0 0 1 18 18" />
  </svg>
)

const ShieldIcon = ({ className }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </svg>
)

const CheckCircleIcon = ({ className }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const LockIcon = ({ className }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const SettingsIcon = ({ className }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const ExecutionModeSelector = ({
    currentMode = 'simple',
    availableModes = [
      { id: 'simple', name: 'Simple', description: 'Ejecución directa paso a paso - rápida y eficiente', enabled: true },
      { id: 'planner', name: 'Planificador', description: 'Planificación detallada con replanificación automática', enabled: false },
      { id: 'supervised', name: 'No Supervisado', description: 'Ejecución autónoma con plan validado', enabled: false }
    ],
    onModeChange = (mode) => console.log('Mode changed:', mode),
    isDisabled = false
  }) => {
    const [selectedMode, setSelectedMode] = useState(currentMode);
    const [showSelector, setShowSelector] = useState(false);
  
    useEffect(() => {
      setSelectedMode(currentMode);
    }, [currentMode]);
  
    const handleModeSelect = (mode) => {
      if (!mode.enabled || isDisabled) return;
      
      setSelectedMode(mode.id);
      setShowSelector(false);
      onModeChange(mode.id);
    };
  
    const getModeIcon = (modeId) => {
      switch (modeId) {
        case 'simple': return <Zap className="w-4 h-4" />;
        case 'planner': return <Brain className="w-4 h-4" />;
        case 'supervised': return <Shield className="w-4 h-4" />;
        default: return <Settings className="w-4 h-4" />;
      }
    };
  
    const getCurrentModeConfig = () => {
      return availableModes.find(m => m.id === selectedMode) || availableModes[0];
    };
  
    const currentModeConfig = getCurrentModeConfig();
  
    return (
      <div className="execution-mode-selector">
      {/* Trigger Button */}
      <button
        className={`mode-trigger ${isDisabled ? "disabled" : ""} ${showSelector ? "active" : ""}`}
        onClick={() => !isDisabled && setShowSelector(!showSelector)}
        disabled={isDisabled}
        title={`Modo: ${currentModeConfig.name}`}
      >
        {getModeIcon(selectedMode)}
        <div className="mode-indicator" style={{ backgroundColor: currentModeConfig.color }} />
      </button>

      {/* Dropdown */}
      {showSelector && !isDisabled && (
        <div className="mode-dropdown">
          <div className="mode-dropdown-header">
            <SettingsIcon className="header-icon" />
            <div className="header-text">
              <span className="header-title">Modo de Ejecución</span>
              <span className="header-subtitle">Selecciona cómo procesar tu consulta</span>
            </div>
          </div>

          <div className="mode-list">
            {availableModes.map((mode) => (
              <div
                key={mode.id}
                className={`mode-item ${mode.id === selectedMode ? "selected" : ""} ${
                  mode.enabled ? "enabled" : "disabled"
                }`}
                onClick={() => handleModeSelect(mode)}
              >
                <div className="mode-item-icon" style={{ color: mode.color }}>
                  {getModeIcon(mode.id)}
                </div>

                <div className="mode-item-content">
                  <div className="mode-item-header">
                    <span className="mode-item-name">{mode.name}</span>
                    <div className="mode-item-badges">
                      {mode.id === selectedMode && <CheckCircleIcon className="selected-icon" />}
                      {!mode.enabled && <LockIcon className="locked-icon" />}
                    </div>
                  </div>
                  <p className="mode-item-description">{mode.description}</p>
                  {!mode.enabled && <p className="mode-item-coming-soon">Disponible en futuras versiones</p>}
                </div>

                <div className="mode-item-indicator" style={{ backgroundColor: mode.color }} />
              </div>
            ))}
          </div>

          <div className="mode-dropdown-footer">
            <div className="footer-tip">
              <span className="tip-icon">💡</span>
              <span className="tip-text">Puedes cambiar el modo antes de enviar tu mensaje</span>
            </div>
          </div>
        </div>
      )}

      {/* Overlay */}
      {showSelector && !isDisabled && <div className="mode-overlay" onClick={() => setShowSelector(false)} />}
    </div>
    );
  };


  export default ExecutionModeSelector;