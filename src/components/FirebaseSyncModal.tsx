import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CloudOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  ShieldCheck,
  Database,
  Sparkles,
} from 'lucide-react';
import {
  FirebaseConnectionConfig,
  FirebaseStatusSnapshot,
  getActiveFirebaseConfig,
  getFirebaseStatus,
  subscribeFirebaseStatus,
  parseFirebaseConfigInput,
  saveAndConnectFirebaseConfig,
  disconnectAndClearFirebaseConfig,
  pushAllLocalDataToCloud,
  pullAllCloudDataToLocal,
  testActiveFirebaseConnection,
} from '../utils/firebaseSync';

interface FirebaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowNotification?: (msg: string) => void;
}

const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

export const FirebaseSyncModal: React.FC<FirebaseSyncModalProps> = ({
  isOpen,
  onClose,
  onShowNotification,
}) => {
  const [statusSnap, setStatusSnap] = useState<FirebaseStatusSnapshot>(() => getFirebaseStatus());
  const [rawSnippet, setRawSnippet] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [authDomain, setAuthDomain] = useState<string>('');
  const [storageBucket, setStorageBucket] = useState<string>('');
  const [messagingSenderId, setMessagingSenderId] = useState<string>('');
  const [appId, setAppId] = useState<string>('');
  const [showManualFields, setShowManualFields] = useState<boolean>(false);

  const [busyAction, setBusyAction] = useState<'connect' | 'push' | 'pull' | 'test' | 'disconnect' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [rulesCopied, setRulesCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeFirebaseStatus((snap) => setStatusSnap(snap));
    const { config } = getActiveFirebaseConfig();
    if (config) {
      setApiKey(config.apiKey || '');
      setProjectId(config.projectId || '');
      setAuthDomain(config.authDomain || '');
      setStorageBucket(config.storageBucket || '');
      setMessagingSenderId(config.messagingSenderId || '');
      setAppId(config.appId || '');
    } else {
      setApiKey('');
      setProjectId('');
      setAuthDomain('');
      setStorageBucket('');
      setMessagingSenderId('');
      setAppId('');
    }
    setRawSnippet('');
    setFeedback(null);
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRawPasteChange = (value: string) => {
    setRawSnippet(value);
    const parsed = parseFirebaseConfigInput(value);
    if (parsed) {
      setApiKey(parsed.apiKey);
      setProjectId(parsed.projectId);
      setAuthDomain(parsed.authDomain || '');
      setStorageBucket(parsed.storageBucket || '');
      setMessagingSenderId(parsed.messagingSenderId || '');
      setAppId(parsed.appId || '');
      setFeedback({
        type: 'info',
        text: `Credenciales detectadas automáticamente para el proyecto "${parsed.projectId}". Pulsa "Guardar y Conectar".`,
      });
    }
  };

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    let finalConfig: FirebaseConnectionConfig | null = null;
    if (rawSnippet.trim()) {
      finalConfig = parseFirebaseConfigInput(rawSnippet);
    }
    if (!finalConfig && apiKey.trim() && projectId.trim()) {
      finalConfig = {
        apiKey: apiKey.trim(),
        projectId: projectId.trim(),
        authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
        storageBucket: storageBucket.trim() || `${projectId.trim()}.firebasestorage.app`,
        messagingSenderId: messagingSenderId.trim(),
        appId: appId.trim(),
      };
    }

    if (!finalConfig || !finalConfig.apiKey || !finalConfig.projectId) {
      setFeedback({
        type: 'error',
        text: 'Pega el bloque firebaseConfig completo de Firebase Console o completa al menos API Key y Project ID.',
      });
      return;
    }

    setBusyAction('connect');
    try {
      const res = await saveAndConnectFirebaseConfig(finalConfig);
      if (res.success) {
        setRawSnippet('');
        setFeedback({
          type: 'success',
          text: `¡Conectado con éxito al proyecto "${finalConfig.projectId}"! Tus ventas, mesas, inventario, cierres y usuarios ya se sincronizan en tiempo real.`,
        });
        onShowNotification?.(`☁️ Base de datos Firebase (${finalConfig.projectId}) conectada en tiempo real.`);
      } else {
        setFeedback({
          type: 'error',
          text: res.error || 'No se pudo completar la verificación con Firestore.',
        });
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handlePushLocal = async () => {
    setBusyAction('push');
    setFeedback(null);
    try {
      const res = await pushAllLocalDataToCloud();
      if (res.success && res.counts) {
        const msg = `Respaldo subido a Firebase: ${res.counts.products} productos, ${res.counts.tables} mesas, ${res.counts.sales} ventas, ${res.counts.cashClosings} cierres y ${res.counts.users} usuario(s).`;
        setFeedback({ type: 'success', text: msg });
        onShowNotification?.(`☁️ ${msg}`);
      } else {
        setFeedback({ type: 'error', text: res.error || 'Error al subir datos a Firebase.' });
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handlePullCloud = async () => {
    if (
      !window.confirm(
        '¿Descargar los datos almacenados en Firebase Firestore y actualizar este equipo con la información de la nube?'
      )
    ) {
      return;
    }
    setBusyAction('pull');
    setFeedback(null);
    try {
      const res = await pullAllCloudDataToLocal();
      if (res.success && res.counts) {
        const msg = `Datos sincronizados desde Firebase: ${res.counts.products} productos, ${res.counts.tables} mesas, ${res.counts.sales} ventas y ${res.counts.cashClosings} cierres.`;
        setFeedback({ type: 'success', text: msg });
        onShowNotification?.(`☁️ ${msg}`);
      } else {
        setFeedback({ type: 'error', text: res.error || 'Error al descargar datos de Firebase.' });
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleTestConnection = async () => {
    setBusyAction('test');
    setFeedback(null);
    try {
      const res = await testActiveFirebaseConnection();
      if (res.success) {
        setFeedback({
          type: 'success',
          text: 'Lectura y escritura verificadas correctamente en Firebase Firestore.',
        });
      } else {
        setFeedback({
          type: 'error',
          text: res.error || 'Falló la prueba de conexión con Firestore.',
        });
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleDisconnect = async () => {
    if (
      !window.confirm(
        '¿Desvincular Firebase en este equipo? Todos tus datos locales actuales se conservarán intactos en el computador.'
      )
    ) {
      return;
    }
    setBusyAction('disconnect');
    try {
      await disconnectAndClearFirebaseConfig();
      setApiKey('');
      setProjectId('');
      setAuthDomain('');
      setStorageBucket('');
      setMessagingSenderId('');
      setAppId('');
      setRawSnippet('');
      setFeedback({
        type: 'info',
        text: 'Firebase fue desvinculado. El sistema sigue operando al 100% en almacenamiento local.',
      });
      onShowNotification?.('Modo local activado (nube Firebase desvinculada).');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
    setRulesCopied(true);
    setTimeout(() => setRulesCopied(false), 2400);
  };

  const isConfigured = statusSnap.status !== 'unconfigured' && Boolean(statusSnap.projectId);
  const isHealthy = statusSnap.status === 'connected' || statusSnap.status === 'syncing';

  const renderStatusLabel = () => {
    switch (statusSnap.status) {
      case 'connected':
        return 'Conectado a Firebase Firestore (Tiempo Real + Caché Offline)';
      case 'syncing':
        return 'Sincronizando cambios con la nube...';
      case 'connecting':
        return 'Conectando con Firebase Firestore...';
      case 'offline':
        return 'Modo Offline activo — Guardando localmente (sincronizará al volver internet)';
      case 'error':
        return 'Atención requerida en la conexión de Firebase';
      default:
        return 'Modo Local Activo — Pega tu firebaseConfig para activar respaldo en la nube';
    }
  };

  return (
    <div className="modal-backdrop firebase-sync-backdrop" onClick={onClose}>
      <div
        className="modal-container firebase-sync-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="mobile-sync-head-box">
            <div className={`firebase-sync-icon-glow ${isHealthy ? 'connected' : ''}`}>
              {statusSnap.status === 'unconfigured' ? <CloudOff size={21} /> : <Cloud size={21} />}
            </div>
            <div>
              <h2 className="modal-title">Base de Datos en la Nube (Firebase)</h2>
              <span className="modal-subtitle">
                Respaldo automático gratuito + operación híbrida Offline / Tiempo Real
              </span>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Cerrar ventana">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="firebase-sync-body">
          {/* Live Status Banner */}
          <div className={`firebase-status-banner status-${statusSnap.status}`}>
            <div className="firebase-status-left">
              <span className={`firebase-status-dot dot-${statusSnap.status}`} />
              <div className="firebase-status-texts">
                <strong>{renderStatusLabel()}</strong>
                <span>
                  {statusSnap.projectId
                    ? `Proyecto: ${statusSnap.projectId}${
                        statusSnap.lastSyncedAt
                          ? ` • Última sincronización: ${new Date(
                              statusSnap.lastSyncedAt
                            ).toLocaleTimeString('es-CO')}`
                          : ''
                      }`
                    : 'Mesas, ventas, inventario, cierres de caja y usuarios listos para sincronizar'}
                </span>
              </div>
            </div>
            {isConfigured && (
              <span className="firebase-source-pill">
                <Database size={12} />
                {statusSnap.source === 'env' ? 'Archivo .env' : 'Vinculado'}
              </span>
            )}
          </div>

          {/* Error or Action Feedback */}
          {(statusSnap.errorMessage || feedback) && (
            <div
              className={`firebase-feedback-alert ${
                feedback?.type || (statusSnap.errorMessage ? 'error' : 'info')
              }`}
            >
              {(feedback?.type === 'error' || (!feedback && statusSnap.errorMessage)) && (
                <AlertTriangle size={17} />
              )}
              {feedback?.type === 'success' && <CheckCircle2 size={17} />}
              {feedback?.type === 'info' && <Sparkles size={17} />}
              <span>{feedback ? feedback.text : statusSnap.errorMessage}</span>
            </div>
          )}

          {/* Cloud Actions when already configured */}
          {isConfigured && (
            <div className="firebase-actions-panel">
              <div className="firebase-actions-header">
                <ShieldCheck size={16} />
                <span>Acciones de Sincronización y Respaldo</span>
              </div>
              <div className="firebase-actions-grid">
                <button
                  type="button"
                  className="btn-fb-action"
                  onClick={handlePullCloud}
                  disabled={busyAction !== null}
                >
                  {busyAction === 'pull' ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <DownloadCloud size={15} />
                  )}
                  <span>Descargar datos desde Firebase</span>
                </button>

                <button
                  type="button"
                  className="btn-fb-action"
                  onClick={handleTestConnection}
                  disabled={busyAction !== null}
                >
                  {busyAction === 'test' ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <RefreshCw size={15} />
                  )}
                  <span>Probar Conexión</span>
                </button>
              </div>
            </div>
          )}

          {/* Si NO está configurado, mostrar formulario de vinculación */}
          {!isConfigured && (
            <div className="firebase-setup-columns">
              {/* Left Column: 3-Step Guide */}
              <div className="firebase-guide-card">
                <div className="firebase-guide-head">
                  <strong>Cómo obtener tu llave gratis (2 min)</strong>
                  <button
                    type="button"
                    className="btn-open-firebase-console"
                    onClick={() => window.open('https://console.firebase.google.com/', '_blank')}
                  >
                    <ExternalLink size={12} />
                    <span>Abrir Firebase</span>
                  </button>
                </div>

                <div className="firebase-steps-list">
                  <div className="fb-step-row">
                    <span className="fb-step-num">1</span>
                    <div>
                      <strong>Crear proyecto gratuito</strong>
                      <p>En Firebase Console pulsa <em>Crear un proyecto</em> (plan Spark 0 USD).</p>
                    </div>
                  </div>
                  <div className="fb-step-row">
                    <span className="fb-step-num">2</span>
                    <div>
                      <strong>Activar Firestore Database</strong>
                      <p>Menú <em>Compilación → Firestore Database → Crear base de datos</em> (Modo de prueba).</p>
                    </div>
                  </div>
                  <div className="fb-step-row">
                    <span className="fb-step-num">3</span>
                    <div>
                      <strong>Pegar bloque Web &lt;/&gt;</strong>
                      <p>En Descripción general haz clic en el ícono Web <code>&lt;/&gt;</code> y pega el texto a la derecha.</p>
                    </div>
                  </div>
                </div>

                <div className="firebase-rules-helper">
                  <div className="firebase-rules-info">
                    <span>¿Te pide Reglas en Firestore?</span>
                    <small>Copia y pega estas reglas en la pestaña "Reglas" de Firestore:</small>
                  </div>
                  <button
                    type="button"
                    className="btn-copy-fb-rules"
                    onClick={handleCopyRules}
                  >
                    {rulesCopied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{rulesCopied ? '¡Reglas copiadas!' : 'Copiar Reglas'}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Smart Paste Form */}
              <form className="firebase-form-card" onSubmit={handleSaveAndConnect}>
                <label className="fb-form-label">
                  <span>Pegar código <code>firebaseConfig</code> completo aquí:</span>
                  <button
                    type="button"
                    className="btn-link-manual-fields"
                    onClick={() => setShowManualFields((v) => !v)}
                  >
                    {showManualFields ? 'Ocultar campos individuales' : 'Ver / editar campos'}
                  </button>
                </label>

                <textarea
                  className="fb-snippet-textarea"
                  rows={showManualFields ? 3 : 5}
                  value={rawSnippet}
                  onChange={(e) => handleRawPasteChange(e.target.value)}
                  placeholder={`Pega tal cual el código de Firebase, por ejemplo:\nconst firebaseConfig = {\n  apiKey: "AIzaSy...",\n  projectId: "la-molienda-pos",\n  ...\n};`}
                />

                {(showManualFields || projectId || apiKey) && (
                  <div className="fb-manual-fields-grid">
                    <div className="fb-field">
                      <label>Project ID *</label>
                      <input
                        type="text"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        placeholder="la-molienda-pos"
                      />
                    </div>
                    <div className="fb-field">
                      <label>API Key *</label>
                      <input
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                      />
                    </div>
                    {showManualFields && (
                      <>
                        <div className="fb-field">
                          <label>Auth Domain</label>
                          <input
                            type="text"
                            value={authDomain}
                            onChange={(e) => setAuthDomain(e.target.value)}
                            placeholder="la-molienda-pos.firebaseapp.com"
                          />
                        </div>
                        <div className="fb-field">
                          <label>App ID</label>
                          <input
                            type="text"
                            value={appId}
                            onChange={(e) => setAppId(e.target.value)}
                            placeholder="1:123456:web:abcdef"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-fb-connect-submit"
                  disabled={busyAction !== null}
                >
                  {busyAction === 'connect' ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Conectando y verificando Firestore...</span>
                    </>
                  ) : (
                    <>
                      <Cloud size={16} />
                      <span>Guardar y Conectar con Firebase</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cerrar ventana
          </button>
        </div>
      </div>
    </div>
  );
};

