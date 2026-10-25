import React, { useState, useEffect } from 'react';
import { X, Smartphone, Wifi, Copy, Check, ExternalLink, Users, AlertCircle, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';

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
            {/* Left: QR Code */}
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
            </div>

            {/* Right: Instructions & Link */}
            <div className="mobile-sync-info-col">
              <h3 className="sync-steps-title">Instrucciones de Conexión:</h3>
              <ol className="sync-steps-list">
                <li>
                  <div className="step-num">1</div>
                  <div className="step-content">
                    <strong>Misma red Wi-Fi:</strong> Asegúrate de que el celular del mesero esté conectado a la misma red Wi-Fi de este computador.
                  </div>
                </li>
                <li>
                  <div className="step-num">2</div>
                  <div className="step-content">
                    <strong>Escanear QR:</strong> Abre la cámara del celular y enfoca el código QR de la izquierda. No necesitas descargar ninguna aplicación de la tienda.
                  </div>
                </li>
                <li>
                  <div className="step-num">3</div>
                  <div className="step-content">
                    <strong>Comandar en segundos:</strong> El mesero elige la mesa, agrega productos y presiona <em>"Enviar Comanda"</em>; aparecerá de inmediato en este PC con sonido de aviso.
                  </div>
                </li>
              </ol>

              {/* Direct Link box */}
              <div className="direct-link-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="direct-link-lbl">Enlace Wi-Fi para Meseros:</span>
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 'none', color: '#f59e0b', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => setIsEditingIp(!isEditingIp)}
                  >
                    {isEditingIp ? 'Cerrar edición' : 'Cambiar IP Wi-Fi'}
                  </button>
                </div>

                {isEditingIp ? (
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
                    <input
                      type="text"
                      defaultValue={localIp}
                      placeholder="Ej: 192.168.1.13"
                      className="direct-link-input"
                      style={{ color: '#ffffff' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateIp((e.target as HTMLInputElement).value);
                          setIsEditingIp(false);
                        }
                      }}
                      onBlur={(e) => {
                        handleUpdateIp(e.target.value);
                      }}
                    />
                    <button
                      type="button"
                      className="btn-copy-link"
                      onClick={() => setIsEditingIp(false)}
                    >
                      Guardar
                    </button>
                  </div>
                ) : (
                  <div className="direct-link-input-group">
                    <input
                      type="text"
                      readOnly
                      value={serverUrl || 'Detectando IP local...'}
                      className="direct-link-input"
                    />
                    <button
                      type="button"
                      className={`btn-copy-link ${isCopied ? 'copied' : ''}`}
                      onClick={handleCopyLink}
                      title="Copiar enlace al portapapeles"
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{isCopied ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                )}
                <span style={{ fontSize: '0.7rem', color: '#a39282' }}>
                  IP de esta computadora en el Wi-Fi: <strong style={{ color: '#10b981' }}>{localIp}</strong>
                </span>

                {availableInterfaces.length > 1 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.68rem', color: '#d1d5db' }}>Cambiar de red detectada:</span>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {availableInterfaces.map((iface) => {
                        const isSelected = localIp === iface.address;
                        return (
                          <button
                            key={iface.address}
                            type="button"
                            style={{
                              background: isSelected ? '#10b981' : 'rgba(255,255,255,0.08)',
                              color: isSelected ? '#000000' : '#e5e7eb',
                              border: `1px solid ${isSelected ? '#10b981' : 'rgba(255,255,255,0.15)'}`,
                              borderRadius: '6px',
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.68rem',
                              cursor: 'pointer',
                              fontWeight: isSelected ? 'bold' : 'normal',
                            }}
                            onClick={() => handleUpdateIp(iface.address)}
                          >
                            {iface.name}: {iface.address}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mobile-test-hint">
                <button
                  type="button"
                  className="btn-open-preview-tab"
                  onClick={handleOpenLocalBrowser}
                >
                  <ExternalLink size={13} />
                  <span>Probar vista de mesero en una pestaña</span>
                </button>
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
