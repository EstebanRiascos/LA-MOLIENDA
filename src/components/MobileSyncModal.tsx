import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Wifi,
  Copy,
  Check,
  ExternalLink,
  Users,
  AlertCircle,
  RefreshCw,
  Pencil,
} from 'lucide-react';
import QRCode from 'qrcode';

const getCleanInterfaceLabel = (name: string, _address: string) => {
  const isVirtual = /vethernet|hyper-v|wsl|virtual|docker|vbox|vmnet/i.test(name);
  if (/wi-fi|wifi|wlan|inal[aá]mbrica|wireless/i.test(name)) return 'Wi-Fi';
  if (/ethernet|lan|eth/i.test(name)) return isVirtual ? 'Virtual WSL' : 'Ethernet';
  if (isVirtual) return 'Virtual WSL';
  return name.length > 14 ? name.slice(0, 13) + '…' : name;
};

interface MobileSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSyncModal: React.FC<MobileSyncModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [availableInterfaces, setAvailableInterfaces] = useState<Array<{ name: string; address: string; isWifi?: boolean }>>([]);
  const [localIp, setLocalIp] = useState<string>(() => {
    const saved = localStorage.getItem('lamolienda_server_ip');
    // Si se guardó una IP virtual de WSL o Docker (172.16-31.x.x), descartarla
    if (saved && !/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(saved)) {
      return saved;
    }
    return '192.168.1.15';
  });
  const [isEditingIp, setIsEditingIp] = useState<boolean>(false);
  const [tempIp, setTempIp] = useState<string>('');
  const [port, setPort] = useState<number>(() => {
    return Number(window.location.port) || 5173;
  });
  const [connectedClients, setConnectedClients] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const generateQRForUrl = async (targetUrl: string) => {
    try {
      const qr = await QRCode.toDataURL(targetUrl, {
        width: 300,
        margin: 1.5,
        color: {
          dark: '#140c06',
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
      let resolvedPort = port;

      const api = (window as any).electronAPI;
      if (api && typeof api.getServerInfo === 'function') {
        const info = await api.getServerInfo();
        if (info.ip && info.ip !== '127.0.0.1') {
          resolvedIp = info.ip;
        }
        if (info.port) {
          resolvedPort = info.port;
        }
        if (Array.isArray(info.availableInterfaces)) {
          setAvailableInterfaces(info.availableInterfaces);
        }
        setConnectedClients(info.clientsCount || 0);
      } else {
        // En navegador web directo, intentar consultar el backend en puerto 4545
        try {
          const res = await fetch('http://localhost:4545/api/info');
          const data = await res.json();
          if (data.localIp && data.localIp !== '127.0.0.1') {
            resolvedIp = data.localIp;
          }
          if (Array.isArray(data.availableInterfaces)) {
            setAvailableInterfaces(data.availableInterfaces);
          }
          if (data.connectedClients !== undefined) {
            setConnectedClients(data.connectedClients);
          }
        } catch {
          // Si no responde el backend en 4545, usar la IP Wi-Fi detectada o 192.168.1.15
        }
      }

      setLocalIp(resolvedIp);
      setTempIp(resolvedIp);
      setPort(resolvedPort);
      localStorage.setItem('lamolienda_server_ip', resolvedIp);

      // URL accesible para cualquier celular en la red Wi-Fi
      const activePort = window.location.port || String(resolvedPort);
      const fullUrl = `http://${resolvedIp}:${activePort}/?view=waiter`;
      setServerUrl(fullUrl);

      await generateQRForUrl(fullUrl);
    } catch (err) {
      console.error('Error al generar QR de sincronización móvil:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateIp = (newIp: string) => {
    const trimmed = newIp.trim();
    if (!trimmed) return;
    setLocalIp(trimmed);
    setTempIp(trimmed);
    localStorage.setItem('lamolienda_server_ip', trimmed);
    const activePort = window.location.port || String(port);
    const fullUrl = `http://${trimmed}:${activePort}/?view=waiter`;
    setServerUrl(fullUrl);
    generateQRForUrl(fullUrl);
  };

  useEffect(() => {
    fetchServerInfo();

    // Escuchar cambios en la cantidad de meseros conectados en tiempo real
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

  const handleCopyLink = () => {
    if (!serverUrl) return;
    navigator.clipboard.writeText(serverUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleOpenLocalBrowser = () => {
    if (serverUrl) {
      window.open(serverUrl, '_blank');
    }
  };

  return (
    <div className="modal-backdrop mobile-sync-backdrop" onClick={onClose}>
      <div
        className="modal-container mobile-sync-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="mobile-sync-head-box">
            <div className="mobile-sync-icon-glow">
              <Smartphone size={22} />
            </div>
            <div>
              <h2 className="modal-title">Vincular Celulares de Meseros</h2>
              <span className="modal-subtitle">
                Comandero Móvil en tiempo real por red Wi-Fi local
              </span>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Cerrar ventana">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="mobile-sync-body">
          {/* Status Banner */}
          <div className="wifi-server-status-strip">
            <div className="wifi-status-left">
              <span className="wifi-live-dot" />
              <div className="wifi-status-text">
                <strong>Servidor Wi-Fi Local Activo</strong>
                <span>No requiere internet • Comunicación local instantánea</span>
              </div>
            </div>
            <div className="wifi-clients-badge" title="Dispositivos móviles conectados actualmente">
              <Users size={14} />
              <span>{connectedClients} {connectedClients === 1 ? 'móvil conectado' : 'móviles conectados'}</span>
            </div>
          </div>

          <div className="mobile-sync-grid">
            {/* Left: QR Code & Quick Action */}
            <div className="qr-container-box">
              <div className="qr-paper-frame">
                {loading ? (
                  <div className="qr-loading-spinner">
                    <RefreshCw className="animate-spin" size={32} />
                    <span>Generando código QR...</span>
                  </div>
                ) : qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Código QR para Meseros"
                    className="qr-img-display"
                  />
                ) : (
                  <div className="qr-error-box">
                    <AlertCircle size={28} />
                    <span>No se pudo generar el QR</span>
                  </div>
                )}
              </div>
              <span className="qr-scan-instruction">
                Escanea con la cámara de cualquier celular (Android o iPhone)
              </span>

              {/* Botón para probar directamente en el navegador del equipo */}
              <button
                type="button"
                className="btn-preview-local-app"
                onClick={handleOpenLocalBrowser}
                title="Abrir vista de mesero en una nueva pestaña de este equipo"
              >
                <ExternalLink size={13} />
                <span>Abrir en navegador de esta PC</span>
              </button>
            </div>

            {/* Right: Instructions & Connection Card */}
            <div className="mobile-sync-info-col">
              {/* Pasos en 3 tarjetas compactas horizontales */}
              <div className="sync-steps-grid">
                <div className="sync-step-item">
                  <div className="sync-step-badge">1</div>
                  <div className="sync-step-details">
                    <strong>Misma Red Wi-Fi</strong>
                    <p>El celular y este PC deben estar en la misma red Wi-Fi.</p>
                  </div>
                </div>

                <div className="sync-step-item">
                  <div className="sync-step-badge">2</div>
                  <div className="sync-step-details">
                    <strong>Escanear QR</strong>
                    <p>Apunta con la cámara. No requiere descargar app.</p>
                  </div>
                </div>

                <div className="sync-step-item">
                  <div className="sync-step-badge">3</div>
                  <div className="sync-step-details">
                    <strong>¡A Comandar!</strong>
                    <p>Elige mesa y envía; llega a este PC al instante.</p>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Enlace Wi-Fi y Configuración de Red */}
              <div className="sync-network-card">
                {/* Cabecera de la tarjeta */}
                <div className="sync-card-header">
                  <div className="sync-card-title-group">
                    <Wifi size={15} className="sync-card-wifi-icon" />
                    <span className="sync-card-title">Enlace Wi-Fi para Meseros</span>
                  </div>
                  <button
                    type="button"
                    className={`btn-toggle-edit-ip ${isEditingIp ? 'active' : ''}`}
                    onClick={() => {
                      if (!isEditingIp) setTempIp(localIp);
                      setIsEditingIp(!isEditingIp);
                    }}
                    title="Editar IP manualmente"
                  >
                    <Pencil size={11} />
                    <span>{isEditingIp ? 'Cerrar edición' : 'Cambiar IP'}</span>
                  </button>
                </div>

                {/* Input de Enlace o Editor de IP */}
                {isEditingIp ? (
                  <div className="sync-ip-edit-box">
                    <span className="sync-ip-edit-label">Modificar IP del servidor local:</span>
                    <div className="sync-ip-edit-row">
                      <input
                        type="text"
                        value={tempIp}
                        onChange={(e) => setTempIp(e.target.value)}
                        placeholder="Ej: 192.168.1.15"
                        className="sync-ip-edit-input"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateIp(tempIp);
                            setIsEditingIp(false);
                          } else if (e.key === 'Escape') {
                            setIsEditingIp(false);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn-save-ip"
                        onClick={() => {
                          handleUpdateIp(tempIp);
                          setIsEditingIp(false);
                        }}
                      >
                        <Check size={13} />
                        <span>Guardar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="sync-url-bar-group">
                    <input
                      type="text"
                      readOnly
                      value={serverUrl || 'Detectando IP local...'}
                      className="sync-url-input"
                    />
                    <button
                      type="button"
                      className={`btn-sync-copy ${isCopied ? 'copied' : ''}`}
                      onClick={handleCopyLink}
                      title="Copiar enlace completo al portapapeles"
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{isCopied ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                )}

                {/* Pie de la tarjeta: Estado de IP y Selección de interfaces */}
                <div className="sync-card-footer">
                  <div className="sync-ip-status-badge">
                    <span className="sync-ip-status-dot" />
                    <span className="sync-ip-status-text">
                      IP Wi-Fi en uso: <strong>{localIp}</strong>
                    </span>
                  </div>

                  {availableInterfaces.length > 1 && (
                    <div className="sync-interfaces-section">
                      <span className="sync-interfaces-label">Cambiar a otra red detectada:</span>
                      <div className="sync-interfaces-pills">
                        {availableInterfaces.map((iface) => {
                          const isSelected = localIp === iface.address;
                          const cleanName = getCleanInterfaceLabel(iface.name, iface.address);
                          return (
                            <button
                              key={iface.address}
                              type="button"
                              className={`network-iface-pill ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleUpdateIp(iface.address)}
                              title={`${iface.name}: ${iface.address}`}
                            >
                              <span className="pill-dot" />
                              <span className="pill-name">{cleanName}:</span>
                              <span className="pill-address">{iface.address}</span>
                              {isSelected && <Check size={11} className="pill-check-icon" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
