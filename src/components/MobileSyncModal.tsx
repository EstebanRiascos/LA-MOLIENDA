import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Copy,
  Check,
  Download,
  FolderOpen,
  Share2,
  Users,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Paperclip,
  FileCheck,
} from 'lucide-react';
import QRCode from 'qrcode';

interface MobileSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSyncModal: React.FC<MobileSyncModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [apkDownloadUrl, setApkDownloadUrl] = useState<string>('');
  const [localIp, setLocalIp] = useState<string>(() => {
    return localStorage.getItem('lamolienda_server_ip') || '192.168.1.15';
  });
  const [connectedClients, setConnectedClients] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isApkFileCopied, setIsApkFileCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const serverPort = 4545;

  const generateQRForUrl = async (targetUrl: string) => {
    try {
      const qr = await QRCode.toDataURL(targetUrl, {
        width: 320,
        margin: 1.5,
        color: {
          dark: '#1a120b',
          light: '#ffffff',
        },
      });
      setQrDataUrl(qr);
    } catch (err) {
      console.error('Error generando QR:', err);
    }
  };

  const fetchServerInfo = async () => {
    setLoading(true);
    try {
      let resolvedIp = localIp;

      const api = (window as any).electronAPI;
      if (api && typeof api.getServerInfo === 'function') {
        const info = await api.getServerInfo();
        if (info.ip && info.ip !== '127.0.0.1') {
          resolvedIp = info.ip;
        }
        setConnectedClients(info.clientsCount || 0);
      } else {
        try {
          const res = await fetch('http://localhost:4545/api/info');
          const data = await res.json();
          if (data.localIp && data.localIp !== '127.0.0.1') {
            resolvedIp = data.localIp;
          }
          if (data.connectedClients !== undefined) {
            setConnectedClients(data.connectedClients);
          }
        } catch {}
      }

      setLocalIp(resolvedIp);
      localStorage.setItem('lamolienda_server_ip', resolvedIp);

      const downloadUrl = `http://${resolvedIp}:${serverPort}/download/apk`;
      setApkDownloadUrl(downloadUrl);
      await generateQRForUrl(downloadUrl);
    } catch (err) {
      console.error('Error al obtener datos del APK:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServerInfo();

    const api = (window as any).electronAPI;
    if (api && typeof api.onMobileClientsChanged === 'function') {
      const unsubscribe = api.onMobileClientsChanged((count: number) => {
        setConnectedClients(count);
      });
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, [isOpen]);

  // Mensaje prediseñado para compartir por WhatsApp
  const whatsappMessage = `☕ *LA MOLIENDA - COMANDERO MÓVIL (APK)* ☕\n\n📲 *Descarga la aplicación en tu celular:* \n${apkDownloadUrl}\n\n*Pasos para instalar:*\n1️⃣ Conéctate al Wi-Fi del restaurante.\n2️⃣ Toca el enlace para descargar el instalador.\n3️⃣ Abre el archivo descargado y presiona *Instalar* (si Android pide permiso, selecciona "Permitir desde esta fuente").\n4️⃣ Abre la App e ingresa tu PIN de mesero.`;

  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(whatsappMessage);
    const whatsappWebUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(whatsappWebUrl, '_blank');
  };

  const handleCopyWhatsAppMessage = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleOpenApkFolder = async () => {
    const api = (window as any).electronAPI;
    if (api && typeof api.openApkFolder === 'function') {
      await api.openApkFolder();
    } else {
      window.open(apkDownloadUrl, '_blank');
    }
  };

  const handleCopyApkFile = async () => {
    const api = (window as any).electronAPI;
    if (api && typeof api.copyApkToClipboard === 'function') {
      const res = await api.copyApkToClipboard();
      if (res && res.success) {
        setIsApkFileCopied(true);
        setTimeout(() => setIsApkFileCopied(false), 3500);
      } else {
        handleOpenApkFolder();
      }
    } else {
      handleOpenApkFolder();
    }
  };

  return (
    <div className="modal-backdrop mobile-sync-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-container mobile-sync-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="apk-modal-title"
      >
        {/* Cabecera idéntica al estándar de La Molienda */}
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
                Instalador oficial para teléfonos celulares de meseros por red Wi-Fi local
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
        <div className="mobile-sync-body">
          {/* Tira de Estado: Servidor Activo + Celulares Conectados */}
          <div className="wifi-server-status-strip">
            <div className="wifi-status-left">
              <span className="wifi-live-dot" />
              <div className="wifi-status-text">
                <strong>Servidor Local Wi-Fi Activo (Puerto {serverPort})</strong>
                <span>El APK se conecta automáticamente a este computador en la red local</span>
              </div>
            </div>
            <div className="wifi-clients-badge" title="Meseros con la APK abierta en este momento">
              <Users size={14} />
              <span>
                {connectedClients} {connectedClients === 1 ? 'celular conectado' : 'celulares conectados'}
              </span>
            </div>
          </div>

          {/* Grilla Principal: QR de Descarga a la izquierda, WhatsApp e Instrucciones a la derecha */}
          <div className="mobile-sync-grid">
            {/* Columna Izquierda: QR de Descarga Directa */}
            <div className="qr-container-box">
              <div className="qr-paper-frame">
                {loading ? (
                  <div className="qr-loading-spinner">
                    <RefreshCw className="animate-spin" size={32} />
                    <span>Cargando enlace...</span>
                  </div>
                ) : qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Escanear para descargar APK"
                    className="qr-img-display"
                  />
                ) : (
                  <div className="qr-error-box">
                    <AlertCircle size={28} />
                    <span>No se pudo generar QR</span>
                  </div>
                )}
              </div>
              <span className="qr-scan-instruction">
                Apunta con la cámara de cualquier celular Android para <strong>descargar el instalador APK</strong>
              </span>

              <button
                type="button"
                className="btn-preview-local-app"
                onClick={handleOpenApkFolder}
                title="Abre la carpeta de Windows donde está guardado el archivo LaMolienda_Comandero.apk"
              >
                <FolderOpen size={14} />
                <span>Abrir carpeta del archivo APK</span>
              </button>
            </div>

            {/* Columna Derecha: Compartir por WhatsApp y Pasos */}
            <div className="mobile-sync-info-col">
              {/* Tarjeta de Compartir por WhatsApp */}
              <div className="apk-whatsapp-card">
                <div className="apk-whatsapp-header">
                  <div className="whatsapp-icon-badge">
                    {/* Icono vectorial SVG de WhatsApp */}
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="whatsapp-card-title">Compartir APK en WhatsApp</h3>
                    <p className="whatsapp-card-desc">
                      Envía el archivo APK como documento directamente al chat o comparte el enlace Wi-Fi.
                    </p>
                  </div>
                </div>

                {/* Método 1: Enviar el archivo APK físico (documento) */}
                <div className="whatsapp-sub-section">
                  <div className="whatsapp-sub-label">
                    <Paperclip size={13} />
                    <span>Enviar archivo instalador .APK (como Documento):</span>
                  </div>
                  <div className="whatsapp-action-buttons">
                    <button
                      type="button"
                      className={`btn-whatsapp-file-copy ${isApkFileCopied ? 'copied-active' : ''}`}
                      onClick={handleCopyApkFile}
                      title="Copia el archivo instalador APK. Luego ve a WhatsApp y presiona Ctrl + V para enviarlo como documento."
                    >
                      {isApkFileCopied ? <FileCheck size={16} /> : <Paperclip size={16} />}
                      <span>
                        {isApkFileCopied
                          ? '¡Archivo Copiado! Pega con Ctrl + V en WhatsApp'
                          : 'Copiar Archivo APK (Pegar en WhatsApp con Ctrl + V)'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn-whatsapp-drag"
                      onClick={handleOpenApkFolder}
                      title="Abre la carpeta de Windows para arrastrar el archivo APK directamente a tu chat de WhatsApp"
                    >
                      <FolderOpen size={15} />
                      <span>Arrastrar archivo al chat</span>
                    </button>
                  </div>
                </div>

                {/* Método 2: Enviar enlace Wi-Fi con mensaje explicativo */}
                <div className="whatsapp-sub-section">
                  <div className="whatsapp-sub-label">
                    <Share2 size={13} />
                    <span>O compartir enlace directo con instrucciones:</span>
                  </div>
                  <div className="whatsapp-action-buttons">
                    <button
                      type="button"
                      className="btn-whatsapp-send"
                      onClick={handleShareWhatsApp}
                      title="Abre WhatsApp Web con el mensaje explicativo y el enlace"
                    >
                      <Share2 size={15} />
                      <span>Abrir mensaje en WhatsApp Web</span>
                    </button>

                    <button
                      type="button"
                      className="btn-whatsapp-copy"
                      onClick={handleCopyWhatsAppMessage}
                      title="Copia el texto del mensaje"
                    >
                      {isCopied ? <Check size={15} /> : <Copy size={15} />}
                      <span>{isCopied ? '¡Texto Copiado!' : 'Copiar Texto'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3 Pasos Ilustrados de Instalación */}
              <div className="sync-steps-grid">
                <div className="sync-step-item">
                  <div className="sync-step-badge">1</div>
                  <div className="sync-step-details">
                    <strong>Conectar a la Red Wi-Fi</strong>
                    <p>El celular del mesero debe estar conectado al mismo Wi-Fi del restaurante.</p>
                  </div>
                </div>

                <div className="sync-step-item">
                  <div className="sync-step-badge">2</div>
                  <div className="sync-step-details">
                    <strong>Descargar e Instalar APK</strong>
                    <p>Toca el enlace de WhatsApp o escanea el QR. Al descargar, toca <em>"Instalar"</em>.</p>
                  </div>
                </div>

                <div className="sync-step-item">
                  <div className="sync-step-badge">3</div>
                  <div className="sync-step-details">
                    <strong>Ingresar con su PIN</strong>
                    <p>Abre la App oficial en el celular y digita el PIN personal de mesero para comandar.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pie del modal */}
        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
