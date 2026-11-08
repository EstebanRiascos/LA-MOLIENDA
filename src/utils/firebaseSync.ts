import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  collection,
  doc,
  onSnapshot,
  writeBatch,
  getDocs,
  setDoc,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import { Product, Table, SaleRecord, SystemUser, CashClosingSummary, OrderItem, Employee, PayrollRecord, RentContract, RentPayment } from '../types';

export interface FirebaseConnectionConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export type FirebaseSyncStatus =
  | 'unconfigured'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'offline'
  | 'error';

export interface FirebaseStatusSnapshot {
  status: FirebaseSyncStatus;
  projectId: string | null;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  source: 'local_ui' | 'env' | 'none';
}

export interface FirebaseSyncCallbacks {
  getLocalData: () => {
    products: Product[];
    tables: Table[];
    sales: SaleRecord[];
    users: SystemUser[];
    cashClosings: CashClosingSummary[];
    employees?: Employee[];
    payrollRecords?: PayrollRecord[];
    rentContracts?: RentContract[];
    rentPayments?: RentPayment[];
  };
  onRemoteProducts: (products: Product[]) => void;
  onRemoteTables: (tables: Table[]) => void;
  onRemoteSales: (sales: SaleRecord[]) => void;
  onRemoteUsers: (users: SystemUser[]) => void;
  onRemoteCashClosings: (closings: CashClosingSummary[]) => void;
  onRemoteServiceStatus?: (isOpen: boolean, reason?: string) => void;
  onRemoteEmployees?: (employees: Employee[]) => void;
  onRemotePayrollRecords?: (records: PayrollRecord[]) => void;
  onRemoteRentContracts?: (contracts: RentContract[]) => void;
  onRemoteRentPayments?: (payments: RentPayment[]) => void;
}

const FIREBASE_CONFIG_STORAGE_KEY = 'lamolienda_firebase_config_v1';
const SERVICE_STATUS_STORAGE_KEY = 'lamolienda_service_status_v1';
const FIREBASE_APP_NAME = 'la-molienda-pos-cloud';

export function getStoredServiceStatus(): { isOpen: boolean; reason?: string } {
  try {
    const raw = localStorage.getItem(SERVICE_STATUS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { isOpen: true };
}

export function saveStoredServiceStatus(isOpen: boolean, reason?: string): void {
  try {
    localStorage.setItem(SERVICE_STATUS_STORAGE_KEY, JSON.stringify({ isOpen, reason }));
  } catch {}
}

const COLLECTIONS = {
  products: 'lamolienda_products',
  tables: 'lamolienda_tables',
  sales: 'lamolienda_sales',
  users: 'lamolienda_users',
  cashClosings: 'lamolienda_cash_closings',
  employees: 'lamolienda_employees',
  payrollRecords: 'lamolienda_payroll_records',
  rentContracts: 'lamolienda_rent_contracts',
  rentPayments: 'lamolienda_rent_payments',
  health: 'lamolienda_meta',
} as const;

type CollectionKey =
  | 'products'
  | 'tables'
  | 'sales'
  | 'users'
  | 'cashClosings'
  | 'employees'
  | 'payrollRecords'
  | 'rentContracts'
  | 'rentPayments';

let firebaseAppInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let activeUnsubscribers: Unsubscribe[] = [];
let registeredCallbacks: FirebaseSyncCallbacks | null = null;
let isApplyingRemoteUpdate = false;

// Cache de hashes por documento para escribir en Firestore ÚNICAMENTE los documentos que cambiaron
const syncedDocHashes: Record<CollectionKey, Map<string, string>> = {
  products: new Map(),
  tables: new Map(),
  sales: new Map(),
  users: new Map(),
  cashClosings: new Map(),
  employees: new Map(),
  payrollRecords: new Map(),
  rentContracts: new Map(),
  rentPayments: new Map(),
};

// Control de primera carga por colección para sembrar datos locales si Firestore está vacío
const initialSnapshotHandled: Record<CollectionKey, boolean> = {
  products: false,
  tables: false,
  sales: false,
  users: false,
  cashClosings: false,
  employees: false,
  payrollRecords: false,
  rentContracts: false,
  rentPayments: false,
};

// Timers de debounce por colección para agrupar cambios rápidos (ej: clics seguidos de +1 stock)
const debounceTimers: Partial<Record<CollectionKey, ReturnType<typeof setTimeout>>> = {};

let currentStatus: FirebaseStatusSnapshot = {
  status: 'unconfigured',
  projectId: null,
  lastSyncedAt: null,
  errorMessage: null,
  source: 'none',
};

const statusListeners = new Set<(snapshot: FirebaseStatusSnapshot) => void>();

function emitStatus(partial: Partial<FirebaseStatusSnapshot>): void {
  currentStatus = { ...currentStatus, ...partial };
  statusListeners.forEach((listener) => {
    try {
      listener(currentStatus);
    } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('lamolienda:firebase-status', { detail: currentStatus })
    );
  }
}

export function getFirebaseStatus(): FirebaseStatusSnapshot {
  return currentStatus;
}

export function subscribeFirebaseStatus(
  listener: (snapshot: FirebaseStatusSnapshot) => void
): () => void {
  statusListeners.add(listener);
  listener(currentStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

export function getIsApplyingRemoteUpdate(): boolean {
  return isApplyingRemoteUpdate;
}

/**
 * Obtiene la configuración desde variables de entorno VITE_FIREBASE_* si existen
 */
function getEnvFirebaseConfig(): FirebaseConnectionConfig | null {
  try {
    const env = (import.meta as any).env || {};
    const apiKey = (env.VITE_FIREBASE_API_KEY || '').trim();
    const projectId = (env.VITE_FIREBASE_PROJECT_ID || '').trim();
    if (!apiKey || !projectId) return null;

    return {
      apiKey,
      authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`).trim(),
      projectId,
      storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`).trim(),
      messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
      appId: (env.VITE_FIREBASE_APP_ID || '').trim(),
    };
  } catch {
    return null;
  }
}

/**
 * Obtiene la configuración activa de Firebase (prioriza la guardada en el panel visual y luego .env)
 */
export function getActiveFirebaseConfig(): {
  config: FirebaseConnectionConfig | null;
  source: 'local_ui' | 'env' | 'none';
} {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FirebaseConnectionConfig;
      if (parsed && parsed.apiKey && parsed.projectId) {
        return { config: parsed, source: 'local_ui' };
      }
    }
  } catch {}

  const envConfig = getEnvFirebaseConfig();
  if (envConfig) {
    return { config: envConfig, source: 'env' };
  }

  return { config: null, source: 'none' };
}

/**
 * Extrae automáticamente apiKey, projectId, authDomain, etc. desde cualquier texto pegado:
 * - Código JavaScript completo de Firebase Console (const firebaseConfig = { ... })
 * - Objeto JSON
 * - Archivo .env (VITE_FIREBASE_API_KEY=...)
 */
export function parseFirebaseConfigInput(rawInput: string): FirebaseConnectionConfig | null {
  const text = rawInput.trim();
  if (!text) return null;

  // 1. Intentar JSON directo
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj.apiKey === 'string' && typeof obj.projectId === 'string') {
      return normalizeConfig(obj);
    }
  } catch {}

  // 2. Extraer pares clave/valor de snippet JS/TS o .env
  const extractKey = (keys: string[]): string => {
    for (const k of keys) {
      // Formato JS/JSON: apiKey: "AIza..." o "apiKey": 'AIza...'
      const jsRegex = new RegExp(`["']?${k}["']?\\s*[:=]\\s*["']([^"'\\r\\n]+)["']`, 'i');
      const jsMatch = text.match(jsRegex);
      if (jsMatch?.[1]) return jsMatch[1].trim();

      // Formato .env sin comillas: VITE_FIREBASE_API_KEY=AIza...
      const envRegex = new RegExp(`^\\s*${k}\\s*=\\s*([^\\s#]+)\\s*$`, 'im');
      const envMatch = text.match(envRegex);
      if (envMatch?.[1]) return envMatch[1].trim();
    }
    return '';
  };

  const apiKey = extractKey(['apiKey', 'VITE_FIREBASE_API_KEY']);
  const projectId = extractKey(['projectId', 'VITE_FIREBASE_PROJECT_ID']);
  const authDomain = extractKey(['authDomain', 'VITE_FIREBASE_AUTH_DOMAIN']);
  const storageBucket = extractKey(['storageBucket', 'VITE_FIREBASE_STORAGE_BUCKET']);
  const messagingSenderId = extractKey(['messagingSenderId', 'VITE_FIREBASE_MESSAGING_SENDER_ID']);
  const appId = extractKey(['appId', 'VITE_FIREBASE_APP_ID']);

  if (!apiKey || !projectId) {
    return null;
  }

  return normalizeConfig({
    apiKey,
    projectId,
    authDomain,
    storageBucket,
    messagingSenderId,
    appId,
  });
}

function normalizeConfig(cfg: Partial<FirebaseConnectionConfig>): FirebaseConnectionConfig {
  const projectId = (cfg.projectId || '').trim();
  return {
    apiKey: (cfg.apiKey || '').trim(),
    projectId,
    authDomain: (cfg.authDomain || '').trim() || `${projectId}.firebaseapp.com`,
    storageBucket: (cfg.storageBucket || '').trim() || `${projectId}.firebasestorage.app`,
    messagingSenderId: (cfg.messagingSenderId || '').trim(),
    appId: (cfg.appId || '').trim(),
  };
}

/**
 * Limpia campos undefined y evita que imágenes enormes (>850 KB) excedan el límite de 1 MB por documento en Firestore
 */
function sanitizeForFirestore<T extends Record<string, any>>(item: T, sortIndex?: number): Record<string, any> {
  const clean = JSON.parse(JSON.stringify(item));
  delete clean.originalStock;
  delete clean.reservedStock;

  if (typeof clean.image === 'string' && clean.image.startsWith('data:image/')) {
    const approxBytes = clean.image.length;
    if (approxBytes > 850_000) {
      // Proteger el documento de superar 1 MB en Firestore
      clean.image = '';
    }
  }

  if (typeof sortIndex === 'number') {
    clean._sortIndex = sortIndex;
  }

  return clean;
}

function stripInternalFields<T>(docData: Record<string, any>): T {
  const copy = { ...docData };
  delete copy._sortIndex;
  delete copy._updatedAt;
  return copy as T;
}

function computeDocHash(payload: Record<string, any>): string {
  const copy = { ...payload };
  delete copy._updatedAt;
  return JSON.stringify(copy);
}

function translateFirebaseError(err: any): string {
  const code = String(err?.code || '').toLowerCase();
  const msg = String(err?.message || '');

  if (code.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
    return 'Permiso denegado en Firestore. En Firebase Console → Firestore Database → Reglas, habilita lectura/escritura (modo de prueba).';
  }
  if (code.includes('not-found') || msg.includes('database (default) does not exist')) {
    return 'La base de datos Firestore aún no está creada. Entra a Firebase Console → Firestore Database y haz clic en "Crear base de datos".';
  }
  if (code.includes('invalid-api-key') || msg.includes('API key not valid')) {
    return 'La API Key de Firebase no es válida. Verifica el bloque firebaseConfig pegado.';
  }
  if (code.includes('unavailable') || msg.includes('offline')) {
    return 'Sin conexión a internet. Trabajando en modo local Offline (se sincronizará automáticamente al reconectar).';
  }
  return msg || 'Error de conexión con Firebase Firestore.';
}

async function teardownFirebaseInstance(): Promise<void> {
  activeUnsubscribers.forEach((unsub) => {
    try {
      unsub();
    } catch {}
  });
  activeUnsubscribers = [];

  (Object.keys(debounceTimers) as CollectionKey[]).forEach((k) => {
    if (debounceTimers[k]) {
      clearTimeout(debounceTimers[k]);
      delete debounceTimers[k];
    }
  });

  (Object.keys(syncedDocHashes) as CollectionKey[]).forEach((k) => {
    syncedDocHashes[k].clear();
    initialSnapshotHandled[k] = false;
  });

  firestoreInstance = null;
  if (firebaseAppInstance) {
    const appToDelete = firebaseAppInstance;
    firebaseAppInstance = null;
    try {
      await deleteApp(appToDelete);
    } catch {}
  }
}

/**
 * Escribe únicamente las diferencias (altas, modificaciones y bajas) en lotes de máximo 400 operaciones
 */
async function syncCollectionDiff<T extends { id: string }>(
  key: CollectionKey,
  items: T[],
  allowDeletes: boolean,
  preserveOrderIndex: boolean
): Promise<void> {
  if (!firestoreInstance || isApplyingRemoteUpdate) return;
  const db = firestoreInstance;
  const colName = COLLECTIONS[key];
  const hashCache = syncedDocHashes[key];

  const currentIds = new Set<string>();
  const ops: Array<{ type: 'set'; id: string; data: Record<string, any>; hash: string } | { type: 'delete'; id: string }> = [];

  items.forEach((item, index) => {
    if (!item || !item.id) return;
    currentIds.add(item.id);
    const sanitized = sanitizeForFirestore(item as Record<string, any>, preserveOrderIndex ? index : undefined);
    const nextHash = computeDocHash(sanitized);
    const prevHash = hashCache.get(item.id);

    if (prevHash !== nextHash) {
      ops.push({
        type: 'set',
        id: item.id,
        data: { ...sanitized, _updatedAt: new Date().toISOString() },
        hash: nextHash,
      });
    }
  });

  if (allowDeletes) {
    for (const oldId of Array.from(hashCache.keys())) {
      if (!currentIds.has(oldId)) {
        ops.push({ type: 'delete', id: oldId });
      }
    }
  }

  if (ops.length === 0) return;

  try {
    emitStatus({ status: 'syncing', errorMessage: null });

    const BATCH_LIMIT = 400;
    for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
      const chunk = ops.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);

      chunk.forEach((op) => {
        const ref = doc(db, colName, op.id);
        if (op.type === 'set') {
          batch.set(ref, op.data);
        } else {
          batch.delete(ref);
        }
      });

      await batch.commit();

      chunk.forEach((op) => {
        if (op.type === 'set') {
          hashCache.set(op.id, op.hash);
        } else {
          hashCache.delete(op.id);
        }
      });
    }

    emitStatus({
      status: navigator.onLine ? 'connected' : 'offline',
      lastSyncedAt: new Date().toISOString(),
      errorMessage: null,
    });
  } catch (err: any) {
    console.error(`[Firebase Sync] Error sincronizando ${colName}:`, err);
    emitStatus({
      status: navigator.onLine ? 'error' : 'offline',
      errorMessage: translateFirebaseError(err),
    });
  }
}

function scheduleCollectionSync<T extends { id: string }>(
  key: CollectionKey,
  items: T[],
  allowDeletes: boolean,
  preserveOrderIndex: boolean,
  delayMs = 280
): void {
  if (!firestoreInstance || isApplyingRemoteUpdate) return;
  if (debounceTimers[key]) {
    clearTimeout(debounceTimers[key]);
  }
  debounceTimers[key] = setTimeout(() => {
    syncCollectionDiff(key, items, allowDeletes, preserveOrderIndex);
  }, delayMs);
}

// Funciones públicas disparadas automáticamente desde storage.ts, authStorage.ts y cashClosing.ts
export function syncProductsToCloud(products: Product[]): void {
  scheduleCollectionSync('products', products, true, true, 300);
}

export function syncTablesToCloud(tables: Table[]): void {
  scheduleCollectionSync('tables', tables, true, true, 220);
}

export function syncSalesToCloud(sales: SaleRecord[]): void {
  scheduleCollectionSync('sales', sales, false, false, 200);
}

export function syncUsersToCloud(users: SystemUser[]): void {
  scheduleCollectionSync('users', users, true, true, 250);
}

export function syncCashClosingsToCloud(closings: CashClosingSummary[]): void {
  scheduleCollectionSync('cashClosings', closings, false, false, 250);
}

export function syncEmployeesToCloud(employees: Employee[]): void {
  scheduleCollectionSync('employees', employees, true, true, 250);
}

export function syncPayrollRecordsToCloud(records: PayrollRecord[]): void {
  scheduleCollectionSync('payrollRecords', records, true, true, 250);
}

export function syncRentContractsToCloud(contracts: RentContract[]): void {
  scheduleCollectionSync('rentContracts', contracts, true, true, 250);
}

export function syncRentPaymentsToCloud(payments: RentPayment[]): void {
  scheduleCollectionSync('rentPayments', payments, true, true, 250);
}

/**
 * Inicializa o reinicia la sincronización en tiempo real con Firebase Firestore (Offline-First)
 */
export async function initFirebaseRealtimeSync(
  callbacks?: FirebaseSyncCallbacks
): Promise<boolean> {
  if (callbacks) {
    registeredCallbacks = callbacks;
  }

  await teardownFirebaseInstance();

  const { config, source } = getActiveFirebaseConfig();
  if (!config) {
    emitStatus({
      status: 'unconfigured',
      projectId: null,
      errorMessage: null,
      source: 'none',
    });
    return false;
  }

  emitStatus({
    status: 'connecting',
    projectId: config.projectId,
    errorMessage: null,
    source,
  });

  try {
    const app = initializeApp(config, FIREBASE_APP_NAME);
    firebaseAppInstance = app;

    let db: Firestore;
    try {
      db = initializeFirestore(app, {
        ignoreUndefinedProperties: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      // Fallback en caso de entorno con IndexedDB restringido
      db = initializeFirestore(app, {
        ignoreUndefinedProperties: true,
        localCache: memoryLocalCache(),
      });
    }

    firestoreInstance = db;

    if (registeredCallbacks) {
      attachRealtimeListeners(db, registeredCallbacks);
    }

    emitStatus({
      status: navigator.onLine ? 'connected' : 'offline',
      projectId: config.projectId,
      errorMessage: null,
      source,
    });

    return true;
  } catch (err: any) {
    console.error('[Firebase Sync] Error inicializando Firebase:', err);
    emitStatus({
      status: 'error',
      projectId: config.projectId,
      errorMessage: translateFirebaseError(err),
      source,
    });
    return false;
  }
}

function attachRealtimeListeners(db: Firestore, cb: FirebaseSyncCallbacks): void {
  // 1. PRODUCTOS / INVENTARIO
  const unsubProducts = onSnapshot(
    collection(db, COLLECTIONS.products),
    (snapshot) => {
      const local = cb.getLocalData().products;
      if (!initialSnapshotHandled.products && (snapshot.empty || (snapshot.docs.length <= 2 && local.length > 5))) {
        initialSnapshotHandled.products = true;
        if (local.length > 0) {
          syncCollectionDiff('products', local, true, true);
        }
        return;
      }
      initialSnapshotHandled.products = true;

      const rawDocs = snapshot.docs.map((d) => ({
        raw: d.data(),
        id: d.id,
      }));

      rawDocs.sort((a, b) => (a.raw._sortIndex ?? 9999) - (b.raw._sortIndex ?? 9999));

      const nextMap = new Map<string, string>();
      const remoteProducts: Product[] = rawDocs.map(({ raw, id }) => {
        const cleanDoc = { ...raw, id: raw.id || id };
        nextMap.set(cleanDoc.id, computeDocHash(cleanDoc));
        return stripInternalFields<Product>(cleanDoc);
      });

      syncedDocHashes.products = nextMap;

      if (!snapshot.metadata.hasPendingWrites) {
        isApplyingRemoteUpdate = true;
        try {
          cb.onRemoteProducts(remoteProducts);
        } finally {
          isApplyingRemoteUpdate = false;
        }
        emitStatus({
          status: navigator.onLine ? 'connected' : 'offline',
          lastSyncedAt: new Date().toISOString(),
          errorMessage: null,
        });
      }
    },
    (err) => {
      emitStatus({
        status: navigator.onLine ? 'error' : 'offline',
        errorMessage: translateFirebaseError(err),
      });
    }
  );

  // 2. MESAS Y COMANDAS ACTIVAS
  const unsubTables = onSnapshot(
    collection(db, COLLECTIONS.tables),
    (snapshot) => {
      if (snapshot.empty && !initialSnapshotHandled.tables) {
        initialSnapshotHandled.tables = true;
        const local = cb.getLocalData().tables;
        if (local.length > 0) {
          syncCollectionDiff('tables', local, true, true);
        }
        return;
      }
      initialSnapshotHandled.tables = true;

      const rawDocs = snapshot.docs.map((d) => ({
        raw: d.data(),
        id: d.id,
      }));
      rawDocs.sort((a, b) => (a.raw._sortIndex ?? 9999) - (b.raw._sortIndex ?? 9999));

      const nextMap = new Map<string, string>();
      const remoteTables: Table[] = rawDocs.map(({ raw, id }) => {
        const cleanDoc = { ...raw, id: raw.id || id };
        nextMap.set(cleanDoc.id, computeDocHash(cleanDoc));
        return stripInternalFields<Table>(cleanDoc);
      });

      syncedDocHashes.tables = nextMap;

      if (!snapshot.metadata.hasPendingWrites && remoteTables.length > 0) {
        isApplyingRemoteUpdate = true;
        try {
          cb.onRemoteTables(remoteTables);
        } finally {
          isApplyingRemoteUpdate = false;
        }
        emitStatus({
          status: navigator.onLine ? 'connected' : 'offline',
          lastSyncedAt: new Date().toISOString(),
          errorMessage: null,
        });
      }
    },
    (err) => {
      emitStatus({
        status: navigator.onLine ? 'error' : 'offline',
        errorMessage: translateFirebaseError(err),
      });
    }
  );

  // 3. HISTORIAL DE VENTAS
  const unsubSales = onSnapshot(
    collection(db, COLLECTIONS.sales),
    (snapshot) => {
      if (snapshot.empty && !initialSnapshotHandled.sales) {
        initialSnapshotHandled.sales = true;
        const local = cb.getLocalData().sales;
        if (local.length > 0) {
          syncCollectionDiff('sales', local, false, false);
        }
        return;
      }
      initialSnapshotHandled.sales = true;

      const nextMap = new Map<string, string>();
      const remoteSales: SaleRecord[] = snapshot.docs.map((d) => {
        const raw = d.data();
        const cleanDoc = { ...raw, id: raw.id || d.id };
        nextMap.set(cleanDoc.id, computeDocHash(cleanDoc));
        return stripInternalFields<SaleRecord>(cleanDoc);
      });

      remoteSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      syncedDocHashes.sales = nextMap;

      if (!snapshot.metadata.hasPendingWrites) {
        isApplyingRemoteUpdate = true;
        try {
          cb.onRemoteSales(remoteSales);
        } finally {
          isApplyingRemoteUpdate = false;
        }
        emitStatus({
          status: navigator.onLine ? 'connected' : 'offline',
          lastSyncedAt: new Date().toISOString(),
          errorMessage: null,
        });
      }
    },
    (err) => {
      emitStatus({
        status: navigator.onLine ? 'error' : 'offline',
        errorMessage: translateFirebaseError(err),
      });
    }
  );

  // 4. USUARIOS Y MESEROS (ROLES / PIN)
  const unsubUsers = onSnapshot(
    collection(db, COLLECTIONS.users),
    (snapshot) => {
      if (snapshot.empty && !initialSnapshotHandled.users) {
        initialSnapshotHandled.users = true;
        const local = cb.getLocalData().users;
        if (local.length > 0) {
          syncCollectionDiff('users', local, true, true);
        }
        return;
      }
      initialSnapshotHandled.users = true;

      const rawDocs = snapshot.docs.map((d) => ({
        raw: d.data(),
        id: d.id,
      }));
      rawDocs.sort((a, b) => (a.raw._sortIndex ?? 9999) - (b.raw._sortIndex ?? 9999));

      const nextMap = new Map<string, string>();
      const remoteUsers: SystemUser[] = rawDocs.map(({ raw, id }) => {
        const cleanDoc = { ...raw, id: raw.id || id };
        nextMap.set(cleanDoc.id, computeDocHash(cleanDoc));
        return stripInternalFields<SystemUser>(cleanDoc);
      });

      syncedDocHashes.users = nextMap;

      if (!snapshot.metadata.hasPendingWrites && remoteUsers.length > 0) {
        isApplyingRemoteUpdate = true;
        try {
          cb.onRemoteUsers(remoteUsers);
        } finally {
          isApplyingRemoteUpdate = false;
        }
        emitStatus({
          status: navigator.onLine ? 'connected' : 'offline',
          lastSyncedAt: new Date().toISOString(),
          errorMessage: null,
        });
      }
    },
    (err) => {
      emitStatus({
        status: navigator.onLine ? 'error' : 'offline',
        errorMessage: translateFirebaseError(err),
      });
    }
  );

  // 5. HISTORIAL DE CIERRES DE CAJA
  const unsubCashClosings = onSnapshot(
    collection(db, COLLECTIONS.cashClosings),
    (snapshot) => {
      if (snapshot.empty && !initialSnapshotHandled.cashClosings) {
        initialSnapshotHandled.cashClosings = true;
        const local = cb.getLocalData().cashClosings;
        if (local.length > 0) {
          syncCollectionDiff('cashClosings', local, false, false);
        }
        return;
      }
      initialSnapshotHandled.cashClosings = true;

      const nextMap = new Map<string, string>();
      const remoteClosings: CashClosingSummary[] = snapshot.docs.map((d) => {
        const raw = d.data();
        const cleanDoc = { ...raw, id: raw.id || d.id };
        nextMap.set(cleanDoc.id, computeDocHash(cleanDoc));
        return stripInternalFields<CashClosingSummary>(cleanDoc);
      });

      remoteClosings.sort(
        (a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime()
      );
      syncedDocHashes.cashClosings = nextMap;

      if (!snapshot.metadata.hasPendingWrites) {
        isApplyingRemoteUpdate = true;
        try {
          cb.onRemoteCashClosings(remoteClosings);
        } finally {
          isApplyingRemoteUpdate = false;
        }
        emitStatus({
          status: navigator.onLine ? 'connected' : 'offline',
          lastSyncedAt: new Date().toISOString(),
          errorMessage: null,
        });
      }
    },
    (err) => {
      emitStatus({
        status: navigator.onLine ? 'error' : 'offline',
        errorMessage: translateFirebaseError(err),
      });
    }
  );

  // 6. ESTADO DEL SERVICIO / BLOQUEO DE COMANDAS MÓVILES
  const unsubServiceStatus = onSnapshot(
    doc(db, COLLECTIONS.health, 'service_status'),
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const isOpen = data.isOpen !== false;
        saveStoredServiceStatus(isOpen, data.reason);
        if (cb.onRemoteServiceStatus) {
          cb.onRemoteServiceStatus(isOpen, data.reason);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('lamolienda:service-status-changed', {
              detail: { isOpen, reason: data.reason },
            })
          );
        }
      }
    },
    () => {}
  );

  // 7. EMPLEADOS (NÓMINA)
  const unsubEmployees = onSnapshot(
    collection(db, COLLECTIONS.employees),
    (snapshot) => {
      if (snapshot.empty && !initialSnapshotHandled.employees) {
        initialSnapshotHandled.employees = true;
        const local = cb.getLocalData().employees;
        if (local && local.length > 0) {
          syncCollectionDiff('employees', local, true, true);
        }
        return;
      }
      initialSnapshotHandled.employees = true;

      const rawDocs = snapshot.docs.map((d) => ({ raw: d.data(), id: d.id }));
      rawDocs.sort((a, b) => (a.raw._sortIndex ?? 9999) - (b.raw._sortIndex ?? 9999));

      const nextMap = new Map<string, string>();
      const remoteEmployees: Employee[] = rawDocs.map(({ raw, id }) => {
        const cleanDoc = { ...raw, id: raw.id || id };
        nextMap.set(cleanDoc.id, computeDocHash(cleanDoc));
        return stripInternalFields<Employee>(cleanDoc);
      });

      syncedDocHashes.employees = nextMap;

      if (!snapshot.metadata.hasPendingWrites && remoteEmployees.length > 0 && cb.onRemoteEmployees) {
        isApplyingRemoteUpdate = true;
        try {
          cb.onRemoteEmployees(remoteEmployees);
        } finally {
          isApplyingRemoteUpdate = false;
        }
      }
    },
    () => {}
  );

  // 8. REGISTROS DE NÓMINA
  const unsubPayrollRecords = onSnapshot(
    collection(db, COLLECTIONS.payrollRecords),
    (snapshot) => {
      if (snapshot.empty && !initialSnapshotHandled.payrollRecords) {
        initialSnapshotHandled.payrollRecords = true;
        const local = cb.getLocalData().payrollRecords;
        if (local && local.length > 0) {
          syncCollectionDiff('payrollRecords', local, true, false);
        }
        return;
      }
      initialSnapshotHandled.payrollRecords = true;

      const nextMap = new Map<string, string>();
      const remotePayroll: PayrollRecord[] = snapshot.docs.map((d) => {
        const raw = d.data();
        const cleanDoc = { ...raw, id: raw.id || d.id };
        nextMap.set(cleanDoc.id, computeDocHash(cleanDoc));
        return stripInternalFields<PayrollRecord>(cleanDoc);
      });

      syncedDocHashes.payrollRecords = nextMap;

      if (!snapshot.metadata.hasPendingWrites && remotePayroll.length > 0 && cb.onRemotePayrollRecords) {
        isApplyingRemoteUpdate = true;
        try {
          cb.onRemotePayrollRecords(remotePayroll);
        } finally {
          isApplyingRemoteUpdate = false;
        }
      }
    },
    () => {}
  );

  // 9. CONTRATOS DE ARRIENDO
  const unsubRentContracts = onSnapshot(
    collection(db, COLLECTIONS.rentContracts),
    (snapshot) => {
      if (snapshot.empty && !initialSnapshotHandled.rentContracts) {
        initialSnapshotHandled.rentContracts = true;
        const local = cb.getLocalData().rentContracts;
        if (local && local.length > 0) {
          syncCollectionDiff('rentContracts', local, true, true);
        }
        return;
      }
      initialSnapshotHandled.rentContracts = true;

      const nextMap = new Map<string, string>();
      const remoteContracts: RentContract[] = snapshot.docs.map((d) => {
        const raw = d.data();
        const cleanDoc = { ...raw, id: raw.id || d.id };
        nextMap.set(cleanDoc.id, computeDocHash(cleanDoc));
        return stripInternalFields<RentContract>(cleanDoc);
      });

      syncedDocHashes.rentContracts = nextMap;

      if (!snapshot.metadata.hasPendingWrites && remoteContracts.length > 0 && cb.onRemoteRentContracts) {
        isApplyingRemoteUpdate = true;
        try {
          cb.onRemoteRentContracts(remoteContracts);
        } finally {
          isApplyingRemoteUpdate = false;
        }
      }
    },
    () => {}
  );

  // 10. PAGOS DE ARRIENDO
  const unsubRentPayments = onSnapshot(
    collection(db, COLLECTIONS.rentPayments),
    (snapshot) => {
      if (snapshot.empty && !initialSnapshotHandled.rentPayments) {
        initialSnapshotHandled.rentPayments = true;
        const local = cb.getLocalData().rentPayments;
        if (local && local.length > 0) {
          syncCollectionDiff('rentPayments', local, true, false);
        }
        return;
      }
      initialSnapshotHandled.rentPayments = true;

      const nextMap = new Map<string, string>();
      const remotePayments: RentPayment[] = snapshot.docs.map((d) => {
        const raw = d.data();
        const cleanDoc = { ...raw, id: raw.id || d.id };
        nextMap.set(cleanDoc.id, computeDocHash(cleanDoc));
        return stripInternalFields<RentPayment>(cleanDoc);
      });

      syncedDocHashes.rentPayments = nextMap;

      if (!snapshot.metadata.hasPendingWrites && remotePayments.length > 0 && cb.onRemoteRentPayments) {
        isApplyingRemoteUpdate = true;
        try {
          cb.onRemoteRentPayments(remotePayments);
        } finally {
          isApplyingRemoteUpdate = false;
        }
      }
    },
    () => {}
  );

  activeUnsubscribers.push(
    unsubProducts,
    unsubTables,
    unsubSales,
    unsubUsers,
    unsubCashClosings,
    unsubServiceStatus,
    unsubEmployees,
    unsubPayrollRecords,
    unsubRentContracts,
    unsubRentPayments
  );
}

/**
 * Guarda la configuración pegada por el Administrador y activa la sincronización inmediatamente
 */
export async function saveAndConnectFirebaseConfig(
  config: FirebaseConnectionConfig
): Promise<{ success: boolean; error?: string }> {
  const normalized = normalizeConfig(config);
  if (!normalized.apiKey || !normalized.projectId) {
    return { success: false, error: 'Faltan los campos obligatorios apiKey y projectId.' };
  }

  try {
    localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
  } catch (err: any) {
    return { success: false, error: err?.message || 'No se pudo guardar la configuración.' };
  }

  const ok = await initFirebaseRealtimeSync();
  if (!ok) {
    return {
      success: false,
      error: currentStatus.errorMessage || 'No fue posible conectar con Firebase.',
    };
  }

  // Verificar lectura/escritura real contra Firestore
  return testActiveFirebaseConnection();
}

/**
 * Desconecta Firebase y vuelve a modo 100% local (sin borrar ningún dato local)
 */
export async function disconnectAndClearFirebaseConfig(): Promise<void> {
  try {
    localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
  } catch {}
  await initFirebaseRealtimeSync();
}

/**
 * Prueba real de lectura/escritura en Firestore para confirmar que la base de datos y las reglas están listas
 */
export async function testActiveFirebaseConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!firestoreInstance) {
    return { success: false, error: 'Firebase no está configurado todavía.' };
  }

  try {
    emitStatus({ status: 'syncing', errorMessage: null });
    const pingRef = doc(firestoreInstance, COLLECTIONS.health, 'connection_status');
    await setDoc(
      pingRef,
      {
        app: 'La Molienda POS',
        lastCheckAt: new Date().toISOString(),
        online: true,
      },
      { merge: true }
    );
    emitStatus({
      status: navigator.onLine ? 'connected' : 'offline',
      lastSyncedAt: new Date().toISOString(),
      errorMessage: null,
    });
    return { success: true };
  } catch (err: any) {
    const friendly = translateFirebaseError(err);
    emitStatus({
      status: navigator.onLine ? 'error' : 'offline',
      errorMessage: friendly,
    });
    return { success: false, error: friendly };
  }
}

/**
 * Respaldo completo forzado: Sube todos los datos actuales del PC hacia Firebase Firestore
 */
export async function pushAllLocalDataToCloud(): Promise<{
  success: boolean;
  counts?: { products: number; tables: number; sales: number; users: number; cashClosings: number };
  error?: string;
}> {
  if (!firestoreInstance || !registeredCallbacks) {
    return { success: false, error: 'Firebase no está conectado.' };
  }

  try {
    // Limpiar caché de hashes para forzar subida íntegra
    (Object.keys(syncedDocHashes) as CollectionKey[]).forEach((k) => {
      syncedDocHashes[k].clear();
    });

    const local = registeredCallbacks.getLocalData();
    await syncCollectionDiff('products', local.products, true, true);
    await syncCollectionDiff('tables', local.tables, true, true);
    await syncCollectionDiff('sales', local.sales, false, false);
    await syncCollectionDiff('users', local.users, true, true);
    await syncCollectionDiff('cashClosings', local.cashClosings, false, false);

    if (local.employees) {
      await syncCollectionDiff('employees', local.employees, true, true);
    }
    if (local.payrollRecords) {
      await syncCollectionDiff('payrollRecords', local.payrollRecords, true, false);
    }
    if (local.rentContracts) {
      await syncCollectionDiff('rentContracts', local.rentContracts, true, true);
    }
    if (local.rentPayments) {
      await syncCollectionDiff('rentPayments', local.rentPayments, true, false);
    }

    if (currentStatus.status === 'error') {
      return {
        success: false,
        error: currentStatus.errorMessage || 'Error al subir datos a Firebase.',
      };
    }

    return {
      success: true,
      counts: {
        products: local.products.length,
        tables: local.tables.length,
        sales: local.sales.length,
        users: local.users.length,
        cashClosings: local.cashClosings.length,
      },
    };
  } catch (err: any) {
    return { success: false, error: translateFirebaseError(err) };
  }
}

/**
 * Restauración manual: Descarga todos los datos desde Firebase Firestore hacia el PC local
 */
export async function pullAllCloudDataToLocal(): Promise<{
  success: boolean;
  counts?: { products: number; tables: number; sales: number; users: number; cashClosings: number };
  error?: string;
}> {
  if (!firestoreInstance || !registeredCallbacks) {
    return { success: false, error: 'Firebase no está conectado.' };
  }

  try {
    emitStatus({ status: 'syncing', errorMessage: null });
    const db = firestoreInstance;

    const [prodSnap, tblSnap, salesSnap, usersSnap, closeSnap, empSnap, paySnap, rentSnap, rentPaySnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.products)),
      getDocs(collection(db, COLLECTIONS.tables)),
      getDocs(collection(db, COLLECTIONS.sales)),
      getDocs(collection(db, COLLECTIONS.users)),
      getDocs(collection(db, COLLECTIONS.cashClosings)),
      getDocs(collection(db, COLLECTIONS.employees)),
      getDocs(collection(db, COLLECTIONS.payrollRecords)),
      getDocs(collection(db, COLLECTIONS.rentContracts)),
      getDocs(collection(db, COLLECTIONS.rentPayments)),
    ]);

    const parseSorted = <T>(snap: typeof prodSnap): T[] => {
      const list = snap.docs.map((d) => ({ raw: d.data(), id: d.id }));
      list.sort((a, b) => (a.raw._sortIndex ?? 9999) - (b.raw._sortIndex ?? 9999));
      return list.map(({ raw, id }) => stripInternalFields<T>({ ...raw, id: raw.id || id }));
    };

    const products = parseSorted<Product>(prodSnap);
    const tables = parseSorted<Table>(tblSnap);
    const users = parseSorted<SystemUser>(usersSnap);
    const employees = parseSorted<Employee>(empSnap);
    const rentContracts = parseSorted<RentContract>(rentSnap);
    const payrollRecords = paySnap.docs.map((d) =>
      stripInternalFields<PayrollRecord>({ ...d.data(), id: d.data().id || d.id })
    );
    const rentPayments = rentPaySnap.docs.map((d) =>
      stripInternalFields<RentPayment>({ ...d.data(), id: d.data().id || d.id })
    );
    const sales = salesSnap.docs
      .map((d) => stripInternalFields<SaleRecord>({ ...d.data(), id: d.data().id || d.id }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const cashClosings = closeSnap.docs
      .map((d) =>
        stripInternalFields<CashClosingSummary>({ ...d.data(), id: d.data().id || d.id })
      )
      .sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());

    isApplyingRemoteUpdate = true;
    try {
      if (products.length > 0) registeredCallbacks.onRemoteProducts(products);
      if (tables.length > 0) registeredCallbacks.onRemoteTables(tables);
      if (sales.length > 0) registeredCallbacks.onRemoteSales(sales);
      if (users.length > 0) registeredCallbacks.onRemoteUsers(users);
      if (cashClosings.length > 0) registeredCallbacks.onRemoteCashClosings(cashClosings);
      if (employees.length > 0 && registeredCallbacks.onRemoteEmployees) {
        registeredCallbacks.onRemoteEmployees(employees);
      }
      if (payrollRecords.length > 0 && registeredCallbacks.onRemotePayrollRecords) {
        registeredCallbacks.onRemotePayrollRecords(payrollRecords);
      }
      if (rentContracts.length > 0 && registeredCallbacks.onRemoteRentContracts) {
        registeredCallbacks.onRemoteRentContracts(rentContracts);
      }
      if (rentPayments.length > 0 && registeredCallbacks.onRemoteRentPayments) {
        registeredCallbacks.onRemoteRentPayments(rentPayments);
      }
    } finally {
      isApplyingRemoteUpdate = false;
    }

    emitStatus({
      status: navigator.onLine ? 'connected' : 'offline',
      lastSyncedAt: new Date().toISOString(),
      errorMessage: null,
    });

    return {
      success: true,
      counts: {
        products: products.length,
        tables: tables.length,
        sales: sales.length,
        users: users.length,
        cashClosings: cashClosings.length,
      },
    };
  } catch (err: any) {
    const friendly = translateFirebaseError(err);
    emitStatus({
      status: navigator.onLine ? 'error' : 'offline',
      errorMessage: friendly,
    });
    return { success: false, error: friendly };
  }
}

// Monitorear reconexión o caída de internet del equipo automáticamente
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (firestoreInstance && currentStatus.status === 'offline') {
      emitStatus({ status: 'connected', errorMessage: null });
    }
  });
  window.addEventListener('offline', () => {
    if (firestoreInstance) {
      emitStatus({
        status: 'offline',
        errorMessage: null,
      });
    }
  });
}



/**
 * Cambia el estado del servicio de comandas móviles en Firebase Firestore y red local
 */
export async function updateServiceLockStatus(
  isOpen: boolean,
  reason: string = 'Local cerrado por turno'
): Promise<{ success: boolean; error?: string }> {
  saveStoredServiceStatus(isOpen, reason);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('lamolienda:service-status-changed', {
        detail: { isOpen, reason },
      })
    );
  }

  if (!firestoreInstance) {
    return { success: true };
  }

  try {
    const statusRef = doc(firestoreInstance, COLLECTIONS.health, 'service_status');
    await setDoc(
      statusRef,
      {
        isOpen,
        reason,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (err: any) {
    return { success: false, error: translateFirebaseError(err) };
  }
}

/**
 * Permite a cualquier cliente (ej: APK móvil de meseros o navegador)
 * enviar una comanda directamente a Firebase Firestore
 */
export async function sendOrderDirectToCloud(
  tableId: string,
  itemsToAdd: OrderItem[],
  waiterName: string
): Promise<{ success: boolean; error?: string }> {
  const current = getStoredServiceStatus();
  if (!current.isOpen) {
    return {
      success: false,
      error: `Servicio cerrado: ${current.reason || 'Comandero bloqueado por la administración.'}`,
    };
  }

  if (!firestoreInstance) {
    return { success: false, error: 'Sin conexión a Firebase Firestore' };
  }
  const db = firestoreInstance;

  try {
    const tableRef = doc(db, COLLECTIONS.tables, tableId);
    const existingSnap = await getDocs(collection(db, COLLECTIONS.tables));
    const targetDoc = existingSnap.docs.find((d) => d.id === tableId);

    let merged: OrderItem[] = [];
    let tipPercentage = 0;
    let patronName = 'Cliente';
    let zone: any = 'salon';
    let capacity = 4;
    let number = 'Mesa';

    if (targetDoc && targetDoc.exists()) {
      const data = targetDoc.data() as Table;
      merged = [...(data.items || [])];
      tipPercentage = data.tipPercentage || 0;
      patronName = data.patronName || 'Cliente';
      zone = data.zone || 'salon';
      capacity = data.capacity || 4;
      number = data.number || 'Mesa';
    }

    itemsToAdd.forEach((newItem) => {
      const existingIdx = merged.findIndex(
        (i) => i.productId === newItem.productId && (i.notes || '') === (newItem.notes || '')
      );
      if (existingIdx >= 0) {
        merged[existingIdx] = {
          ...merged[existingIdx],
          quantity: merged[existingIdx].quantity + (newItem.quantity || 1),
        };
      } else {
        merged.push({
          ...newItem,
          id: newItem.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          status: newItem.status || 'pending',
        });
      }
    });

    const subtotal = merged.reduce((acc, i) => acc + (i.unitPrice || 0) * (i.quantity || 1), 0);
    const tipAmount = tipPercentage ? Math.round((subtotal * tipPercentage) / 100) : 0;
    const total = subtotal + tipAmount;

    await setDoc(
      tableRef,
      {
        id: tableId,
        number,
        zone,
        capacity,
        status: 'ocupada',
        openedAt: new Date().toISOString(),
        waiter: waiterName,
        patronName,
        items: merged,
        subtotal,
        tipPercentage,
        tipAmount,
        total,
        _updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: translateFirebaseError(err) };
  }
}
