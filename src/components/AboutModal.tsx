import React from 'react';
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
} from 'lucide-react';
import laMoliendaLogo from '../assets/la_molienda_logo.png';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
          <span className="about-version-badge">Versión 1.0.0 &bull; Release Estable</span>
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
