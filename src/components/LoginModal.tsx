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
  Users,
  Building2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import laMoliendaLogo from '../assets/la_molienda_logo.png';
import { SystemUser } from '../types';
import {
  authenticateWithPassword,
  authenticateWithPin,
  getStoredUsers,
} from '../utils/authStorage';

export type SystemDestination = 'pos' | 'nomina';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: SystemUser, selectedSystem?: SystemDestination) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLoginSuccess,
}) => {
  const [authMode, setAuthMode] = useState<'admin' | 'pin'>('admin');
  const [targetSystem, setTargetSystem] = useState<SystemDestination>('pos');

  // Admin form state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // PIN keypad state
  const [pin, setPin] = useState('');
  const [availableUsers, setAvailableUsers] = useState<SystemUser[]>([]);
  const [selectedPinUserId, setSelectedPinUserId] = useState<string>('');

  // UI status
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  // Post-auth selector state for admin when choosing dynamically
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState<SystemUser | null>(null);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Reset states when opening modal or changing mode
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsSuccess(false);
      setPin('');
      setAuthenticatedAdmin(null);

      const users = getStoredUsers().filter((u) => u.active);
      setAvailableUsers(users);
      if (users.length === 1 && !selectedPinUserId) {
        setSelectedPinUserId(users[0].id);
      }

      if (authMode === 'admin') {
        setTimeout(() => passwordInputRef.current?.focus(), 150);
      }
    }
  }, [isOpen, authMode]);

  // Support physical numeric keyboard for PIN entry
  useEffect(() => {
    if (!isOpen || authMode !== 'pin' || isSuccess || authenticatedAdmin) return;

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
  }, [isOpen, authMode, pin, isSuccess, authenticatedAdmin]);

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
      if (res.user.role === 'admin') {
        // If the admin explicitly selected the destination tab upfront, proceed directly
        setIsSuccess(true);
        setTimeout(() => {
          onLoginSuccess(res.user!, targetSystem);
        }, 450);
      } else {
        // Non-admin user can only enter POS
        if (targetSystem === 'nomina') {
          triggerError('⚠️ Acceso denegado: El sistema de nómina es exclusivo para Administradores.');
          return;
        }
        setIsSuccess(true);
        setTimeout(() => {
          onLoginSuccess(res.user!, 'pos');
        }, 450);
      }
    } else {
      triggerError(res.error || 'Credenciales incorrectas.');
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 4) return;
    if (!selectedPinUserId) {
      triggerError('Por favor selecciona tu usuario antes de ingresar el PIN.');
      return;
    }
    const newPin = pin + digit;
    setPin(newPin);
    setErrorMessage(null);

    // Auto submit upon 4 digits
    if (newPin.length === 4) {
      setTimeout(() => {
        const res = authenticateWithPin(newPin, selectedPinUserId);
        if (res.success && res.user) {
          if (res.user.role === 'admin') {
            // Admin entering via PIN
            setIsSuccess(true);
            setTimeout(() => {
              onLoginSuccess(res.user!, targetSystem);
            }, 450);
          } else {
            // Waiter / Cashier entering via PIN
            if (targetSystem === 'nomina') {
              triggerError('⚠️ Los colaboradores (meseros/cajeros) solo tienen acceso al Sistema POS.');
              setPin('');
              return;
            }
            setIsSuccess(true);
            setTimeout(() => {
              onLoginSuccess(res.user!, 'pos');
            }, 450);
          }
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
      <div className={`login-card ${shake ? 'login-card-shake' : ''}`} style={{ maxWidth: '480px' }}>
        {/* Brand Header */}
        <div className="login-header">
          <div className="login-logo-ring">
            <img src={laMoliendaLogo} alt="La Molienda" className="login-logo-img" />
          </div>
          <h2 className="login-title">La Molienda</h2>
          <span className="login-subtitle">Café & Bar &bull; Sistema de Gestión Integral</span>
        </div>

        {/* =========================================================================
            SELECTOR DE SISTEMA AL QUE DESEA INGRESAR
            ========================================================================= */}
        <div style={{ marginBottom: '14px' }}>
          <label className="login-label" style={{ marginBottom: '6px', display: 'block' }}>
            Ingresar al sistema
          </label>
          <div className="login-mode-pills" role="tablist" style={{ marginBottom: 0 }}>
            {/* Opción 1: POS / Restaurante (Ámbar / Naranja) */}
            <button
              type="button"
              className={`login-mode-pill login-system-pill-pos ${targetSystem === 'pos' ? 'active' : ''}`}
              onClick={() => {
                setTargetSystem('pos');
                setErrorMessage(null);
              }}
            >
              <Coffee size={16} className="pos-pill-icon" />
              <span>POS / Ventas</span>
            </button>

            {/* Opción 2: Nómina & Arriendos (Verde Esmeralda) */}
            <button
              type="button"
              className={`login-mode-pill login-system-pill-nomina ${targetSystem === 'nomina' ? 'active' : ''}`}
              onClick={() => {
                setTargetSystem('nomina');
                setErrorMessage(null);
              }}
            >
              <Users size={16} className="nomina-pill-icon" />
              <span>Nómina</span>
              <span
                style={{
                  fontSize: '0.62rem',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: targetSystem === 'nomina' ? 'rgba(5, 150, 105, 0.25)' : 'rgba(5, 150, 105, 0.12)',
                  color: targetSystem === 'nomina' ? '#064e3b' : '#059669',
                  border: '1px solid rgba(16, 185, 129, 0.45)',
                  fontWeight: 800,
                  marginLeft: '2px',
                }}
              >
                Admin
              </span>
            </button>
          </div>
        </div>

        {/* Mode Switcher: Administrador vs PIN */}
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
            <span>Usuario / Clave</span>
          </button>
          <button
            type="button"
            className={`login-mode-pill ${authMode === 'pin' ? 'active' : ''}`}
            onClick={() => {
              setAuthMode('pin');
              setErrorMessage(null);
              setPin('');
            }}
            title="Acceso rápido por PIN de 4 dígitos"
          >
            <KeyRound size={16} />
            <span>PIN Personal</span>
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
            <span>
              ¡Acceso concedido! Abriendo{' '}
              {targetSystem === 'nomina' ? 'Sistema de Nómina & Arriendos' : 'Sistema POS & Restaurante'}...
            </span>
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
              style={{
                background:
                  targetSystem === 'nomina'
                    ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                    : undefined,
              }}
            >
              <ShieldCheck size={18} />
              <span>
                {targetSystem === 'nomina' ? 'Ingresar a Nómina & Arriendos' : 'Ingresar al POS'}
              </span>
            </button>
          </form>
        )}

        {/* Quick PIN Keypad Form */}
        {authMode === 'pin' && (
          <div className="login-pin-container">
            {/* Campo Selector de Usuario */}
            <div className="login-pin-user-box">
              <label className="login-label">Usuario</label>
              <div className="login-input-wrapper">
                <UserIcon size={17} className="login-input-icon" />
                <select
                  value={selectedPinUserId}
                  onChange={(e) => {
                    setSelectedPinUserId(e.target.value);
                    setPin('');
                    setErrorMessage(null);
                  }}
                  className="login-input login-select"
                  disabled={isSuccess}
                >
                  <option value="">-- Selecciona tu usuario --</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'admin' ? 'Administrador' : u.role === 'cajero' ? 'Cajero' : 'Mesero'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="login-pin-instructions">
              Digita tu PIN de 4 dígitos para ingresar al Sistema POS
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
