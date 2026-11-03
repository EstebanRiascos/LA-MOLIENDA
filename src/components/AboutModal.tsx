import React, { useState, useEffect } from 'react';
import {
  X,
  Code2,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  Terminal,
  Coffee,
  CheckCircle2,
  Award,
  Database,
  RefreshCw,
  DownloadCloud,
  ArrowUpCircle,
  AlertCircle,
  Check,
} from 'lucide-react';
import laMoliendaLogo from '../assets/la_molienda_logo.png';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [updateState, setUpdateState] = useState<{
    status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error' | 'dev';
    percent?: number;
    version?: string;
    message?: string;
  }>({ status: 'idle' });
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const api = (window as any).electronAPI;
    if (!api || !api.onUpdateStatus) return;

    const unsub = api.onUpdateStatus((data: any) => {
      if (data) {
        setUpdateState(data);
        if (data.status !== 'checking') {
          setIsChecking(false);
        }
      }
    });

    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckUpdates = async () => {
    const api = (window as any).electronAPI;
    if (!api || !api.checkForUpdates) {
      setUpdateState({
        status: 'dev',
        message: 'Las actualizaciones automáticas se ejecutan en la versión de escritorio instalada.',
      });
      return;
    }

    setIsChecking(true);
    setUpdateState({ status: 'checking', message: 'Buscando actualizaciones en GitHub Releases...' });

    try {
      const res = await api.checkForUpdates();
      if (res?.status === 'error') {
        setUpdateState({ status: 'error', message: res.error || 'No se pudo verificar en este momento.' });
        setIsChecking(false);
      } else if (res?.status === 'dev') {
        setUpdateState({ status: 'dev', message: res.message });
        setIsChecking(false);
      }
    } catch (err: any) {
      setUpdateState({ status: 'error', message: err?.message || 'Error al conectar con GitHub.' });
      setIsChecking(false);
    }
  };

  const handleApplyUpdate = () => {
    const api = (window as any).electronAPI;
    if (api && api.installUpdate) {
      api.installUpdate();
    }
  };

  return (
    <div className="about-modal-backdrop" onClick={onClose}>
      <div
        className="about-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="about-system-title"
      >
        {/* Close Button */}
        <button
          type="button"
          className="about-modal-close"
          onClick={onClose}
          title="Cerrar ventana"
        >
          <X size={18} />
        </button>

        {/* Brand Header */}
        <div className="about-header">
          <div className="about-logo-wrapper">
            <img src={laMoliendaLogo} alt="La Molienda Café Bar" className="about-logo-img" />
          </div>
          <h2 id="about-system-title" className="about-title">La Molienda POS</h2>
          <span className="about-subtitle">Sistema Integral de Gestión Gastronómica & Punto de Venta</span>
          <span className="about-version-badge">Versión 1.1.1 &bull; Release Estable</span>
        </div>

        {/* Auto-Updater Panel */}
        <div className="about-updater-card">
          <div className="about-updater-header">
            <div className="about-updater-title-box">
              <ArrowUpCircle size={17} className="about-updater-icon" />
              <span className="about-updater-title">Actualizaciones por Internet</span>
            </div>
            {updateState.status === 'downloaded' ? (
              <span className="about-update-pill pill-ready">¡Nueva versión lista!</span>
            ) : updateState.status === 'downloading' ? (
              <span className="about-update-pill pill-downloading">Descargando {updateState.percent || 0}%</span>
            ) : (
              <span className="about-update-pill pill-connected">GitHub Releases</span>
            )}
          </div>

          {/* Estado / Mensaje */}
          {updateState.status === 'downloading' ? (
            <div className="about-updater-progress-wrap">
              <div className="about-updater-progress-bar">
                <div
                  className="about-updater-progress-fill"
                  style={{ width: `${Math.min(100, Math.max(5, updateState.percent || 0))}%` }}
                />
              </div>
              <span className="about-updater-progress-label">
                Descargando versión en segundo plano ({updateState.percent || 0}%)...
              </span>
            </div>
          ) : updateState.status === 'downloaded' ? (
            <div className="about-updater-action-wrap">
              <p className="about-updater-ready-desc">
                La nueva versión <strong>v{updateState.version || ''}</strong> se descargó exitosamente. Haz clic abajo para reiniciar e instalar al instante.
              </p>
              <button
                type="button"
                className="btn-updater-restart"
                onClick={handleApplyUpdate}
              >
                <Sparkles size={16} />
                Reiniciar y Actualizar Ahora
              </button>
            </div>
          ) : (
            <div className="about-updater-footer-row">
              <span className="about-updater-status-txt">
                {updateState.status === 'checking'
                  ? 'Verificando repositorio en GitHub...'
                  : updateState.status === 'not-available'
                  ? 'El sistema está al día con la última versión oficial.'
                  : updateState.status === 'available'
                  ? `Nueva versión v${updateState.version || ''} detectada. Descargando...`
                  : updateState.status === 'error' || updateState.status === 'dev'
                  ? (updateState.message || 'Sistema preparado para actualizaciones automáticas.')
                  : 'Sincronizado con releases oficiales de GitHub.'}
              </span>

              <button
                type="button"
                className="btn-updater-check"
                onClick={handleCheckUpdates}
                disabled={isChecking || updateState.status === 'checking'}
                title="Buscar nuevas versiones publicadas en GitHub"
              >
                <RefreshCw size={13} className={isChecking ? 'spin-anim' : ''} />
                {isChecking ? 'Buscando...' : 'Buscar actualización'}
              </button>
            </div>
          )}
        </div>

        {/* Developer Spotlight Card */}
        <div className="about-developer-card">
          <div className="about-dev-badge">
            <Award size={15} />
            <span>Autoría & Desarrollo de Software</span>
          </div>

          <div className="about-dev-profile">
            <div className="about-dev-avatar">
              <Code2 size={28} />
            </div>
            <div className="about-dev-info">
              <span className="about-dev-role-tag">INGENIERO DE SISTEMAS</span>
              <h3 className="about-dev-name">Juan Esteban Riascos Madarriaga</h3>
              <p className="about-dev-desc">
                Arquitectura del software, diseño de interfaz (UI/UX), lógica de inventario,
                control de comandas por mesa y motor de ventas.
              </p>
            </div>
          </div>
        </div>

        {/* System Highlights Grid */}
        <div className="about-specs-grid">
          <div className="about-spec-item">
            <div className="about-spec-icon">
              <Cpu size={16} />
            </div>
            <div className="about-spec-content">
              <span className="about-spec-label">Arquitectura</span>
              <span className="about-spec-val">Offline-First (Electron)</span>
            </div>
          </div>

          <div className="about-spec-item">
            <div className="about-spec-icon">
              <Database size={16} />
            </div>
            <div className="about-spec-content">
              <span className="about-spec-label">Persistencia</span>
              <span className="about-spec-val">Almacenamiento Local</span>
            </div>
          </div>

          <div className="about-spec-item">
            <div className="about-spec-icon">
              <ShieldCheck size={16} />
            </div>
            <div className="about-spec-content">
              <span className="about-spec-label">Seguridad</span>
              <span className="about-spec-val">Roles PIN y Clave</span>
            </div>
          </div>

          <div className="about-spec-item">
            <div className="about-spec-icon">
              <Layers size={16} />
            </div>
            <div className="about-spec-content">
              <span className="about-spec-label">Módulos</span>
              <span className="about-spec-val">Mesas, POS, Stock & Caja</span>
            </div>
          </div>
        </div>

        {/* Legal & Footer */}
        <div className="about-modal-footer">
          <div className="about-copyright-container">
            <p className="about-copyright-brand">
              &copy; {new Date().getFullYear()} La Molienda Café Bar
            </p>
            <p className="about-copyright-dev">
              Software desarrollado por
            </p>
            <p className="about-copyright-author">
              <strong>Juan Esteban Riascos Madarriaga</strong>
            </p>
          </div>
          <button type="button" className="btn-about-accept" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
