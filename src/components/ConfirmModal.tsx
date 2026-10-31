import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, HelpCircle, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: 'trash' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  subtitle,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  icon = 'trash',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const defaultSubtitle =
    variant === 'danger'
      ? 'Atención: Esta acción no se puede deshacer'
      : variant === 'warning'
      ? 'Aviso del sistema de comanda'
      : 'Confirmación requerida';

  return createPortal(
    <div className="modal-backdrop custom-confirm-backdrop" onClick={onCancel} role="presentation">
      <div
        className={`modal-container custom-confirm-card variant-${variant}`}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
      >
        {/* Cabecera idéntica al estándar de La Molienda (como en Abrir Mesa) */}
        <div className="modal-header confirm-modal-header">
          <div className="confirm-header-box">
            <div className={`modal-header-icon-badge confirm-badge-${variant}`}>
              {icon === 'trash' && <Trash2 size={18} />}
              {icon === 'warning' && <AlertTriangle size={18} />}
              {icon === 'info' && <HelpCircle size={18} />}
            </div>
            <div className="confirm-title-col">
              <h2 id="confirm-dialog-title" className="modal-title">
                {title}
              </h2>
              <span className="modal-subtitle">
                {subtitle || defaultSubtitle}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onCancel}
            title="Cerrar modal"
            aria-label="Cerrar diálogo"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del modal con tarjeta de sección translúcida y limpia */}
        <div className="confirm-modal-body">
          <div className={`confirm-section-card section-card-${variant}`}>
            <p id="confirm-dialog-desc" className="confirm-message-text">
              {message}
            </p>
          </div>
        </div>

        {/* Pie del modal con botones al estilo La Molienda */}
        <div className="modal-footer confirm-modal-footer">
          <button
            type="button"
            className="btn-cancel"
            onClick={onCancel}
            autoFocus
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn-confirm-submit btn-variant-${variant}`}
            onClick={onConfirm}
          >
            {icon === 'trash' && <Trash2 size={16} />}
            {icon === 'warning' && <AlertTriangle size={16} />}
            {icon === 'info' && <HelpCircle size={16} />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
