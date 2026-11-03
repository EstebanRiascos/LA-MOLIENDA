import React, { useState } from 'react';
import {
  X,
  Smartphone,
  FolderOpen,
  FileCheck,
  Check,
  Package,
} from 'lucide-react';

interface MobileSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSyncModal: React.FC<MobileSyncModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [copiedTip, setCopiedTip] = useState<boolean>(false);

  const handleShareApkToWhatsApp = async () => {
    const api = (window as any).electronAPI;
    if (api && typeof api.copyApkToClipboard === 'function') {
      try {
        await api.copyApkToClipboard();
      } catch (err) {
        console.error('Error copiando archivo APK:', err);
      }
    }

    setIsCopied(true);
    setCopiedTip(true);

    // Abrir WhatsApp Web
    window.open('https://web.whatsapp.com', '_blank');

    setTimeout(() => {
      setIsCopied(false);
    }, 5000);
  };

  const handleOpenFolder = async () => {
    const api = (window as any).electronAPI;
    if (api && typeof api.openApkFolder === 'function') {
      await api.openApkFolder();
    }
  };

  return (
    <div className="modal-backdrop mobile-sync-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-container mobile-apk-share-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="apk-modal-title"
      >
        {/* Cabecera del Modal */}
        <div className="modal-header">
          <div className="mobile-sync-head-box">
            <div className="mobile-sync-icon-glow">
              <Smartphone size={22} />
            </div>
            <div>
              <h2 id="apk-modal-title" className="modal-title">
                App Móvil para Meseros (APK Android)
              </h2>
              <span className="modal-subtitle">
                Compartir el archivo instalador oficial directamente a WhatsApp
              </span>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="mobile-apk-body">
          {/* Tarjeta de Archivo APK */}
          <div className="apk-file-preview-box">
            <div className="apk-file-icon-box">
              <Package size={34} />
            </div>
            <div className="apk-file-info">
              <span className="apk-file-name">LaMolienda_Comandero.apk</span>
              <div className="apk-file-meta">
                <span className="apk-badge-size">6.3 MB</span>
                <span className="apk-badge-type">Instalador Oficial Android</span>
              </div>
            </div>
          </div>

          {/* Tarjeta de Acción WhatsApp */}
          <div className="apk-share-main-card">
            <div className="apk-share-header">
              <div className="whatsapp-logo-badge">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <h3 className="apk-share-title">Enviar archivo APK al chat de WhatsApp</h3>
                <p className="apk-share-desc">
                  Envía el instalador directamente como archivo para que los meseros lo instalen en sus teléfonos.
                </p>
              </div>
            </div>

            <div className="apk-action-buttons-row">
              <button
                type="button"
                className={`btn-primary-whatsapp-share ${isCopied ? 'btn-copied' : ''}`}
                onClick={handleShareApkToWhatsApp}
              >
                {isCopied ? <Check size={18} /> : <FileCheck size={18} />}
                <span>
                  {isCopied
                    ? '¡Archivo Copiado! Pega en WhatsApp (Ctrl + V)'
                    : 'Compartir Archivo APK en WhatsApp'}
                </span>
              </button>

              <button
                type="button"
                className="btn-secondary-apk-folder"
                onClick={handleOpenFolder}
                title="Abre la carpeta del computador con el archivo APK seleccionado"
              >
                <FolderOpen size={16} />
                <span>Arrastrar archivo al chat</span>
              </button>
            </div>

            {copiedTip && (
              <div className="apk-paste-tip-box">
                <Check size={15} className="tip-check-icon" />
                <span>
                  <strong>¡Listo!</strong> Se abrió WhatsApp. Ve al chat de los meseros y presiona{' '}
                  <kbd>Ctrl</kbd> + <kbd>V</kbd> para enviar el archivo como documento.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pie del modal */}
        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cerrar ventana
          </button>
        </div>
      </div>
    </div>
  );
};
