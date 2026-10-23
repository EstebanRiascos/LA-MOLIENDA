import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle,
  Delete,
  Coffee,
  CheckCircle2,
} from 'lucide-react';
import laMoliendaLogo from '../assets/la_molienda_logo.png';
import { SystemUser } from '../types';
import {
  authenticateWithPassword,
  authenticateWithPin,
  getStoredUsers,
} from '../utils/authStorage';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: SystemUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLoginSuccess,
}) => {
  const [authMode, setAuthMode] = useState<'admin' | 'pin'>('admin');

  // Admin form state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // PIN keypad state
  const [pin, setPin] = useState('');

  // UI status
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Reset states when opening modal or changing mode
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsSuccess(false);
      setPin('');
      if (authMode === 'admin') {
        setTimeout(() => passwordInputRef.current?.focus(), 150);
      }
    }
  }, [isOpen, authMode]);

  // Support physical numeric keyboard for PIN entry
  useEffect(() => {
    if (!isOpen || authMode !== 'pin' || isSuccess) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handlePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handlePinBackspace();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        handlePinClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, authMode, pin, isSuccess]);

  if (!isOpen) return null;

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim()) {
      triggerError('Por favor ingresa el nombre de usuario.');
      return;
    }
    if (!password) {
      triggerError('Por favor ingresa la contraseña.');
      return;
    }

    const res = authenticateWithPassword(username, password);
    if (res.success && res.user) {
      setIsSuccess(true);
      setTimeout(() => {
        onLoginSuccess(res.user!);
      }, 500);
    } else {
      triggerError(res.error || 'Credenciales incorrectas.');
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setErrorMessage(null);

    // Auto submit upon 4 digits
    if (newPin.length === 4) {
      setTimeout(() => {
        const res = authenticateWithPin(newPin);
        if (res.success && res.user) {
          setIsSuccess(true);
          setTimeout(() => {
            onLoginSuccess(res.user!);
          }, 450);
        } else {
          triggerError(res.error || 'PIN no válido.');
          setPin('');
        }
      }, 100);
    }
  };

  const handlePinBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handlePinClear = () => {
    setPin('');
    setErrorMessage(null);
  };

  return (
    <div className="login-backdrop">
      <div className={`login-card ${shake ? 'login-card-shake' : ''}`}>
        {/* Brand Header */}
        <div className="login-header">
          <div className="login-logo-ring">
            <img src={laMoliendaLogo} alt="La Molienda" className="login-logo-img" />
          </div>
          <h2 className="login-title">La Molienda</h2>
          <span className="login-subtitle">Café & Bar &bull; Sistema POS y Control de Operaciones</span>
        </div>

        {/* Mode Switcher */}
        <div className="login-mode-pills" role="tablist">
          <button
            type="button"
            className={`login-mode-pill ${authMode === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setAuthMode('admin');
              setErrorMessage(null);
            }}
          >
            <ShieldCheck size={16} />
            <span>Administrador</span>
          </button>
          <button
            type="button"
            className={`login-mode-pill ${authMode === 'pin' ? 'active' : ''}`}
            onClick={() => {
              setAuthMode('pin');
              setErrorMessage(null);
              setPin('');
            }}
          >
            <KeyRound size={16} />
            <span>PIN Rápido</span>
          </button>
        </div>

        {/* Error notification banner */}
        {errorMessage && (
          <div className="login-error-alert" role="alert">
            <AlertCircle size={17} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success notification banner */}
        {isSuccess && (
          <div className="login-success-alert">
            <CheckCircle2 size={18} />
            <span>¡Acceso concedido! Iniciando turno...</span>
          </div>
        )}

        {/* Admin Form: Username & Password */}
        {authMode === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="login-form">
            <div className="login-input-group">
              <label className="login-label">Usuario Administrador</label>
              <div className="login-input-wrapper">
                <UserIcon size={17} className="login-input-icon" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej: admin"
                  className="login-input"
                  autoCapitalize="none"
                  autoCorrect="off"
                  disabled={isSuccess}
                />
              </div>
            </div>

            <div className="login-input-group">
              <label className="login-label">Contraseña</label>
              <div className="login-input-wrapper">
                <Lock size={17} className="login-input-icon" />
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="login-input"
                  disabled={isSuccess}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-eye-btn"
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isSuccess}
            >
              <ShieldCheck size={18} />
              <span>Ingresar al Sistema</span>
            </button>
          </form>
        )}

        {/* Quick PIN Keypad Form */}
        {authMode === 'pin' && (
          <div className="login-pin-container">
            <p className="login-pin-instructions">
              Digita tu PIN de 4 dígitos para ingresar a tu turno
            </p>

            {/* 4 PIN Dots */}
            <div className="login-pin-dots">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`login-pin-dot ${filled ? 'filled' : ''}`}
                  >
                    {filled && <span className="login-pin-dot-glow" />}
                  </div>
                );
              })}
            </div>

            {/* Keypad Grid */}
            <div className="login-keypad-grid">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className="login-keypad-btn"
                  onClick={() => handlePinDigit(digit)}
                  disabled={isSuccess || pin.length >= 4}
                >
                  <span className="keypad-digit">{digit}</span>
                </button>
              ))}

              <button
                type="button"
                className="login-keypad-btn keypad-action"
                onClick={handlePinClear}
                disabled={isSuccess || pin.length === 0}
                title="Limpiar"
              >
                <span className="keypad-subtext">C</span>
              </button>

              <button
                type="button"
                className="login-keypad-btn"
                onClick={() => handlePinDigit('0')}
                disabled={isSuccess || pin.length >= 4}
              >
                <span className="keypad-digit">0</span>
              </button>

              <button
                type="button"
                className="login-keypad-btn keypad-action"
                onClick={handlePinBackspace}
                disabled={isSuccess || pin.length === 0}
                title="Borrar dígito"
              >
                <Delete size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
