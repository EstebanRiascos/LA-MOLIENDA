import React, { useEffect } from 'react';
import { Power, ArrowLeft } from 'lucide-react';
import laMoliendaLogo from '../assets/la_molienda_logo.png';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="exit-modal-backdrop" onClick={onCancel}>
      <div
        className="exit-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="exit-modal-title"
      >
        <div className="exit-modal-logo-wrapper">
          <img src={laMoliendaLogo} alt="La Molienda Café Bar" className="exit-modal-logo" />
        </div>
        <h2 id="exit-modal-title" className="exit-modal-title">¿Cerrar La Molienda POS?</h2>
        <p className="exit-modal-text">
          Estás a punto de salir del sistema.
          <br />
          Tus ventas, mesas e inventario quedan guardados de forma segura.
        </p>
        <div className="exit-modal-actions">
          <button type="button" className="exit-btn-cancel" onClick={onCancel} autoFocus>
            <ArrowLeft size={15} />
            <span>Volver al sistema</span>
          </button>
          <button type="button" className="exit-btn-confirm" data-sound="none" onClick={onConfirm}>
            <Power size={15} />
            <span>Sí, cerrar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
