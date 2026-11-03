import React, { useState, useEffect, useMemo } from 'react';
import {
  Coffee,
  Search,
  Plus,
  Minus,
  Send,
  CheckCircle,
  Wifi,
  WifiOff,
  User,
  Clock,
  ArrowLeft,
  Receipt,
  FileText,
  AlertCircle,
  RotateCcw,
  Layers,
  Sun,
  Moon,
  Users,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Delete,
  LogOut,
  CheckCircle2,
  LayoutGrid,
  Sparkles,
  X,
  ArrowRight,
  Download,
  Smartphone,
  Share2,
} from 'lucide-react';
import { Product, Table, TableZone, OrderItem, ProductCategory, SystemUser } from '../types';
import { CATEGORIES, DEFAULT_TABLES, DEFAULT_PRODUCTS } from '../utils/defaults';
import { formatCurrency, getStoredTables, getStoredProducts, getStoredTheme, saveStoredTheme } from '../utils/storage';
import { getStoredUsers, saveStoredUsers } from '../utils/authStorage';
import { playSound } from '../utils/sounds';
import laMoliendaLogo from '../assets/la_molienda_logo.png';
import { OpenTableModal } from './OpenTableModal';
import { TicketModal } from './TicketModal';
import { Capacitor } from '@capacitor/core';
import {
  sendOrderDirectToCloud,
  getStoredServiceStatus,
  subscribeFirebaseStatus,
  getFirebaseStatus,
  updateServiceLockStatus,
  pullAllCloudDataToLocal,
  FirebaseSyncStatus,
} from '../utils/firebaseSync';

interface WaiterViewProps {
  initialTables?: Table[];
  initialProducts?: Product[];
  initialStaffList?: string[];
  serverUrl?: string;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const WaiterView: React.FC<WaiterViewProps> = ({
  initialTables = [],
  initialProducts = [],
  initialStaffList = ['Administrador'],
  serverUrl = '',
  theme: themeProp,
  onToggleTheme: onToggleThemeProp,
}) => {
  // Estado central sincronizado (garantizar mesas iniciales siempre visibles)
  const [tables, setTables] = useState<Table[]>(() => {
    if (initialTables && initialTables.length > 0) return initialTables;
    const stored = getStoredTables();
    return stored && stored.length > 0 ? stored : DEFAULT_TABLES;
  });
  const [products, setProducts] = useState<Product[]>(() => {
    if (initialProducts && initialProducts.length > 0) return initialProducts;
    const stored = getStoredProducts();
    return stored && stored.length > 0 ? stored : DEFAULT_PRODUCTS;
  });
  const [staffList, setStaffList] = useState<string[]>(initialStaffList);
  const [isSseConnected, setIsSseConnected] = useState<boolean>(false);
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseSyncStatus>(() => getFirebaseStatus().status);
  const [isNetworkOnline, setIsNetworkOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const unsub = subscribeFirebaseStatus((snap) => {
      setFirebaseStatus(snap.status);
    });
    const handleOnline = () => setIsNetworkOnline(true);
    const handleOffline = () => setIsNetworkOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isConnected = useMemo(() => {
    if (!isNetworkOnline) return false;
    if (isSseConnected) return true;
    if (firebaseStatus === 'connected' || firebaseStatus === 'syncing') return true;
    if (firebaseStatus === 'connecting') return true;
    return firebaseStatus !== 'error' && firebaseStatus !== 'offline';
  }, [isNetworkOnline, isSseConnected, firebaseStatus]);

  const [activeZone, setActiveZone] = useState<TableZone>('salon');

  useEffect(() => {
    const stored = getStoredTables();
    if (stored.length !== tables.length) {
      setTables(stored);
    }
  }, [tables.length]);

  // Sesión del usuario autenticado en el comandero móvil
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => {
    try {
      const raw = localStorage.getItem('lamolienda_mobile_session_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Lista de usuarios del sistema sincronizados
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(() => {
    const stored = getStoredUsers();
    return stored && stored.length > 0
      ? stored
      : [
          {
            id: 'user_admin_01',
            username: 'admin',
            name: 'Administrador',
            role: 'admin',
            password: 'admin',
            pin: '1234',
            active: true,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ];
  });

  // Mesero activo enlazado a la sesión
  const [currentWaiter, setCurrentWaiter] = useState<string>(() => {
    try {
      const raw = localStorage.getItem('lamolienda_mobile_session_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && u.name) return u.name;
      }
    } catch {}
    return localStorage.getItem('lamolienda_waiter_name') || 'Mesero 1';
  });

  // Mantener currentWaiter en sintonía con el usuario activo
  useEffect(() => {
    if (currentUser && currentUser.name) {
      setCurrentWaiter(currentUser.name);
      localStorage.setItem('lamolienda_waiter_name', currentUser.name);
    }
  }, [currentUser]);

  // Estados para el formulario de login y perfil
  const [authMode, setAuthMode] = useState<'pin' | 'admin'>('pin');
  const [selectedUserForPin, setSelectedUserForPin] = useState<SystemUser | null>(null);
  const [loginPin, setLoginPin] = useState('');
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginSuccess, setIsLoginSuccess] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginShake, setLoginShake] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('modal') === 'profile';
  });

  // Mesa seleccionada para comandar
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  // Ítems de la comanda en preparación
  const [newOrderItems, setNewOrderItems] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);
  const [reconnectCounter, setReconnectCounter] = useState(0);

  // Estado del servicio (Bloqueo de comandero al cierre de caja)
  const [serviceStatus, setServiceStatus] = useState<{ isOpen: boolean; reason?: string }>(() =>
    getStoredServiceStatus()
  );
  const [isServiceBannerDismissed, setIsServiceBannerDismissed] = useState<boolean>(false);

  useEffect(() => {
    const handleServiceStatusChange = (e: any) => {
      if (e.detail) {
        setServiceStatus(e.detail);
        if (e.detail.isOpen) {
          setIsServiceBannerDismissed(false);
        }
      }
    };
    window.addEventListener('lamolienda:service-status-changed', handleServiceStatusChange);
    return () =>
      window.removeEventListener('lamolienda:service-status-changed', handleServiceStatusChange);
  }, []);


  const [isOpenTableModalOpen, setIsOpenTableModalOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('modal') === 'opentable';
  });
  const [preSelectedTable, setPreSelectedTable] = useState<Table | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketTable, setTicketTable] = useState<Table | null>(null);

  // Estado de tema (claro / oscuro) con soporte local y sincronización
  const [localTheme, setLocalTheme] = useState<'dark' | 'light'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('theme') === 'light') return 'light';
    if (params.get('theme') === 'dark') return 'dark';
    return getStoredTheme();
  });

  const effectiveTheme = themeProp !== undefined ? themeProp : localTheme;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    saveStoredTheme(effectiveTheme);
  }, [effectiveTheme]);

  // Detección de aplicación nativa (APK Android Capacitor / Cordova / WebView)
  const isNative = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (Capacitor.isNativePlatform()) return true;
      if (Capacitor.getPlatform() !== 'web') return true;
    } catch {}
    if ((window as any).Capacitor?.isNativePlatform?.()) return true;
    if ((window as any).Capacitor?.getPlatform?.() && (window as any).Capacitor.getPlatform() !== 'web') return true;
    if (window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:') return true;
    if (document.referrer && document.referrer.includes('android-app://')) return true;
    return false;
  }, []);

  // Detección de si ya está instalada (APK nativa o PWA standalone)
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'web') return true;
    } catch {}
    if ((window as any).Capacitor?.isNativePlatform?.()) return true;
    if (window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:') return true;
    if (document.referrer && document.referrer.includes('android-app://')) return true;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (window.navigator as any).standalone === true
    );
  });
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, []);

  const handleInstallPwa = async () => {
    playSound('click');
    if (deferredInstallPrompt) {
      try {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsStandalone(true);
          setDeferredInstallPrompt(null);
        }
      } catch (err) {
        console.warn('Error launching install prompt:', err);
        setShowInstallGuideModal(true);
      }
    } else {
      setShowInstallGuideModal(true);
    }
  };

  const handleToggleTheme = () => {
    playSound('toggle');
    if (onToggleThemeProp) {
      onToggleThemeProp();
    } else {
      const nextTheme = effectiveTheme === 'dark' ? 'light' : 'dark';
      setLocalTheme(nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
      saveStoredTheme(nextTheme);
    }
  };

  // Garantizar que la vista móvil del mesero nunca herede el bloqueo de scroll y soporte sticky
  useEffect(() => {
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
    document.body.classList.add('mobile-waiter-active');
    document.documentElement.classList.add('mobile-waiter-active');
    return () => {
      document.body.classList.remove('mobile-waiter-active');
      document.documentElement.classList.remove('mobile-waiter-active');
    };
  }, []);

  // Determinar la URL base de la API
  const apiBase = useMemo(() => {
    if (serverUrl) return serverUrl;
    // Si corre en Vite en puerto 5173, el API server está en 4545
    if (window.location.port === '5173') {
      return `http://${window.location.hostname}:4545`;
    }
    return window.location.origin;
  }, [serverUrl]);

  // Tiempo transcurrido para mesas ocupadas
  const getElapsedTime = (openedAt?: string) => {
    if (!openedAt) return null;
    const diffMs = Date.now() - new Date(openedAt).getTime();
    if (isNaN(diffMs) || diffMs < 0) return null;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Sincronización SSE en tiempo real con el PC del Cajero
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isMounted = true;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      if (!isMounted) return;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      try {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        eventSource = new EventSource(`${apiBase}/api/stream`);

        eventSource.onopen = () => {
          if (!isMounted) return;
          setIsSseConnected(true);
        };

        eventSource.addEventListener('init', (e: any) => {
          try {
            const state = JSON.parse(e.data);
            if (state.tables && Array.isArray(state.tables) && state.tables.length > 0) {
              setTables(state.tables);
            }
            if (state.products && Array.isArray(state.products) && state.products.length > 0) {
              setProducts(state.products);
            }
            if (state.staffList && Array.isArray(state.staffList) && state.staffList.length > 0) {
              setStaffList(state.staffList);
            }
            if (state.systemUsers && Array.isArray(state.systemUsers) && state.systemUsers.length > 0) {
              setSystemUsers(state.systemUsers);
              saveStoredUsers(state.systemUsers);
            }
          } catch (err) {
            console.error('Error parseando init SSE:', err);
          }
        });

        eventSource.addEventListener('state-update', (e: any) => {
          try {
            const state = JSON.parse(e.data);
            if (state.tables && Array.isArray(state.tables) && state.tables.length > 0) {
              setTables(state.tables);
              setSelectedTable((prev) => (prev ? state.tables.find((t: Table) => t.id === prev.id) || prev : null));
            }
            if (state.products && Array.isArray(state.products) && state.products.length > 0) {
              setProducts(state.products);
            }
            if (state.staffList && Array.isArray(state.staffList) && state.staffList.length > 0) {
              setStaffList(state.staffList);
            }
            if (state.systemUsers && Array.isArray(state.systemUsers) && state.systemUsers.length > 0) {
              setSystemUsers(state.systemUsers);
              saveStoredUsers(state.systemUsers);
            }
          } catch (err) {
            console.error('Error parseando state-update SSE:', err);
          }
        });

        eventSource.addEventListener('new-order-broadcast', () => {
          playSound('click');
        });

        eventSource.onerror = () => {
          if (!isMounted) return;
          setIsSseConnected(false);
          // Si la conexión se cayó (p. ej. pantalla bloqueada o reinicio de dev server), programar reintento
          if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              if (isMounted) connectSSE();
            }, 3000);
          }
        };
      } catch (err) {
        setIsSseConnected(false);
        if (!reconnectTimeout) {
          reconnectTimeout = setTimeout(() => {
            if (isMounted) connectSSE();
          }, 3000);
        }
      }
    };

    connectSSE();

    // Reconectar automáticamente cuando la pantalla del móvil se desbloquea o Safari vuelve al primer plano
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        connectSSE();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', connectSSE);
    window.addEventListener('online', connectSSE);

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', connectSSE);
      window.removeEventListener('online', connectSSE);
      eventSource?.close();
    };
  }, [apiBase, reconnectCounter]);

  // Carga inicial directa de estado desde la API HTTP
  useEffect(() => {
    fetch(`${apiBase}/api/state`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          if (data.data.tables && Array.isArray(data.data.tables) && data.data.tables.length > 0) {
            setTables(data.data.tables);
          }
          if (data.data.products && Array.isArray(data.data.products) && data.data.products.length > 0) {
            setProducts(data.data.products);
          }
          if (data.data.staffList && Array.isArray(data.data.staffList) && data.data.staffList.length > 0) {
            setStaffList(data.data.staffList);
          }
          if (data.data.systemUsers && Array.isArray(data.data.systemUsers) && data.data.systemUsers.length > 0) {
            setSystemUsers(data.data.systemUsers);
            saveStoredUsers(data.data.systemUsers);
          }
        }
      })
      .catch(() => {});

    // Carga directa y específica de usuarios
    fetch(`${apiBase}/api/users`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.users) && data.users.length > 0) {
          setSystemUsers(data.users);
          saveStoredUsers(data.users);
        }
      })
      .catch(() => {});
  }, [apiBase]);

  // Manejo de errores y animaciones de login
  const triggerLoginError = (msg: string) => {
    playSound('error');
    setLoginError(msg);
    setLoginShake(true);
    setTimeout(() => setLoginShake(false), 500);
    setLoginPin('');
  };

  // Ejecución de login (servidor local primero, fallback local en caso de red)
  const handleExecuteLogin = async (credentials: { pin?: string; username?: string; password?: string }) => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const resp = await fetch(`${apiBase}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await resp.json();
      if (data.success && data.user) {
        setIsLoginSuccess(true);
        playSound('success');
        setTimeout(() => {
          setCurrentUser(data.user);
          setCurrentWaiter(data.user.name);
          localStorage.setItem('lamolienda_mobile_session_user', JSON.stringify(data.user));
          localStorage.setItem('lamolienda_waiter_name', data.user.name);
          setIsLoginSuccess(false);
          setLoginPin('');
          setLoginPassword('');
          setSelectedUserForPin(null);
        }, 400);
        return;
      } else {
        // Fallback inmediato si el backend respondió 401 pero localmente el usuario ya está disponible
        const localUsers = systemUsers && systemUsers.length > 0 ? systemUsers : getStoredUsers();
        let localMatched: SystemUser | undefined;

        if (credentials.pin) {
          const p = credentials.pin.trim();
          if (selectedUserForPin && selectedUserForPin.pin === p && selectedUserForPin.active) {
            localMatched = selectedUserForPin;
          } else {
            localMatched = localUsers.find((u) => u.pin === p && u.active);
          }
        } else if (credentials.username && credentials.password) {
          const u = credentials.username.trim().toLowerCase();
          localMatched = localUsers.find(
            (user) => user.username.toLowerCase() === u && user.password === credentials.password && user.active
          );
        }

        if (localMatched) {
          const safe = {
            id: localMatched.id,
            name: localMatched.name,
            username: localMatched.username,
            role: localMatched.role,
            active: localMatched.active,
            createdAt: localMatched.createdAt,
          };
          setIsLoginSuccess(true);
          playSound('success');
          setTimeout(() => {
            setCurrentUser(safe as any);
            setCurrentWaiter(safe.name);
            localStorage.setItem('lamolienda_mobile_session_user', JSON.stringify(safe));
            localStorage.setItem('lamolienda_waiter_name', safe.name);
            setIsLoginSuccess(false);
            setLoginPin('');
            setLoginPassword('');
            setSelectedUserForPin(null);
          }, 400);
          return;
        }

        triggerLoginError(data.error || 'Credenciales o PIN inválidos.');
        return;
      }
    } catch {
      // Si la red no respondió o está fuera de línea, autenticar localmente
      const users = systemUsers && systemUsers.length > 0 ? systemUsers : getStoredUsers();
      let matched: SystemUser | undefined;

      if (credentials.pin) {
        const p = credentials.pin.trim();
        if (selectedUserForPin) {
          if (selectedUserForPin.pin === p && selectedUserForPin.active) {
            matched = selectedUserForPin;
          }
        } else {
          matched = users.find((u) => u.pin === p && u.active);
        }
      } else if (credentials.username && credentials.password) {
        const u = credentials.username.trim().toLowerCase();
        matched = users.find(
          (user) => user.username.toLowerCase() === u && user.password === credentials.password && user.active
        );
      }

      if (matched) {
        const safe = {
          id: matched.id,
          name: matched.name,
          username: matched.username,
          role: matched.role,
          active: matched.active,
          createdAt: matched.createdAt,
        };
        setIsLoginSuccess(true);
        playSound('success');
        setTimeout(() => {
          setCurrentUser(safe as any);
          setCurrentWaiter(safe.name);
          localStorage.setItem('lamolienda_mobile_session_user', JSON.stringify(safe));
          localStorage.setItem('lamolienda_waiter_name', safe.name);
          setIsLoginSuccess(false);
          setLoginPin('');
          setLoginPassword('');
          setSelectedUserForPin(null);
        }, 400);
      } else {
        triggerLoginError('PIN o contraseña no válidos.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Teclado numérico táctil PIN
  const handleMobilePinDigit = (digit: string) => {
    if (loginPin.length >= 4 || isLoggingIn || isLoginSuccess) return;
    playSound('click');
    const newPin = loginPin + digit;
    setLoginPin(newPin);
    setLoginError(null);

    if (newPin.length === 4) {
      setTimeout(() => {
        handleExecuteLogin({
          pin: newPin,
          ...(selectedUserForPin ? { userId: selectedUserForPin.id } : {}),
        } as any);
      }, 100);
    }
  };

  const handleMobilePinBackspace = () => {
    playSound('click');
    setLoginPin((prev) => prev.slice(0, -1));
    setLoginError(null);
  };

  const handleMobilePinClear = () => {
    playSound('click');
    setLoginPin('');
    setLoginError(null);
  };

  const handleAdminFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim()) {
      triggerLoginError('Ingresa el nombre de usuario.');
      return;
    }
    if (!loginPassword) {
      triggerLoginError('Ingresa la contraseña.');
      return;
    }
    handleExecuteLogin({ username: loginUsername, password: loginPassword });
  };

  // Cerrar sesión del mesero y retornar al login
  const handleLogoutWaiter = () => {
    playSound('click');
    localStorage.removeItem('lamolienda_mobile_session_user');
    setCurrentUser(null);
    setIsProfileModalOpen(false);
    setLoginPin('');
    setLoginPassword('');
    setLoginError(null);
    setSelectedUserForPin(null);
  };

  // Soporte para teclado físico al digitar PIN
  useEffect(() => {
    if (currentUser || authMode !== 'pin' || isLoginSuccess) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleMobilePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleMobilePinBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleMobilePinClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser, authMode, loginPin, isLoginSuccess, isLoggingIn]);

  // Actualizar mesero activo en localStorage (si se cambia manualmente)
  const handleWaiterChange = (name: string) => {
    setCurrentWaiter(name);
    localStorage.setItem('lamolienda_waiter_name', name);
  };

  // Filtrado de productos disponibles
  const filteredProducts = useMemo(() => {
    const list = products && products.length > 0 ? products : DEFAULT_PRODUCTS;
    return list.filter((p) => {
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesSearch =
        searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Mesas filtradas por zona
  const zoneTables = useMemo(() => {
    const list = tables && tables.length > 0 ? tables : DEFAULT_TABLES;
    return list.filter((t) => t.zone === activeZone);
  }, [tables, activeZone]);

  // Agregar producto a la orden
  const handleAddItem = (product: Product) => {
    if (product.stock <= 0) {
      alert('Este producto no tiene stock disponible.');
      return;
    }

    setNewOrderItems((prev) => {
      const existIdx = prev.findIndex((i) => i.productId === product.id && (!i.notes || i.notes === ''));
      if (existIdx >= 0) {
        const next = [...prev];
        next[existIdx].quantity += 1;
        return next;
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          productId: product.id,
          productName: product.name,
          productImage: product.image,
          unitPrice: product.price,
          quantity: 1,
          status: 'pending',
          notes: '',
        },
      ];
    });

    playSound('click');
  };

  // Modificar cantidad en la comanda
  const handleUpdateQty = (itemId: string, delta: number) => {
    setNewOrderItems((prev) => {
      return prev
        .map((i) => {
          if (i.id === itemId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as OrderItem[];
    });
  };

  // Agregar nota especial (ej: "Sin hielo", "Bien cargado")
  const handleAddNote = (itemId: string) => {
    const item = newOrderItems.find((i) => i.id === itemId);
    const note = prompt('Nota especial para la barra / cocina (ej: Sin azúcar, poco hielo):', item?.notes || '');
    if (note !== null) {
      setNewOrderItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, notes: note.trim() } : i))
      );
    }
  };

  // Total de la nueva comanda
  const newOrderSubtotal = newOrderItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  // ENVIAR COMANDA AL COMPUTADOR DEL CAJERO
  const handleSendOrder = async () => {
    if (!serviceStatus.isOpen) {
      alert(`Servicio cerrado por Administración: ${serviceStatus.reason || 'El comandero móvil se encuentra pausado temporalmente.'}`);
      return;
    }

    if (!selectedTable) return;
    if (newOrderItems.length === 0) {
      alert('Selecciona al menos un producto para enviar la comanda.');
      return;
    }

    setIsSending(true);
    const waiterName = currentUser ? currentUser.name : currentWaiter;

    // 1. Intentar enviar vía Wi-Fi local primero (0 ms de latencia)
    let sentLocally = false;
    try {
      const response = await fetch(`${apiBase}/api/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          tableId: selectedTable.id,
          tableName: selectedTable.number,
          waiter: waiterName,
          items: newOrderItems,
          timestamp: new Date().toISOString(),
        }),
      });
      const resData = await response.json();
      if (resData.success) {
        sentLocally = true;
      }
    } catch {
      sentLocally = false;
    }

    // 2. Si no hay conexión al servidor local Wi-Fi, enviar directamente a Firebase Firestore (Nube / Datos Móviles)
    if (!sentLocally) {
      try {
        const cloudRes = await sendOrderDirectToCloud(selectedTable.id, newOrderItems, waiterName);
        if (cloudRes.success) {
          sentLocally = true;
        } else {
          alert(`Error al enviar comanda: ${cloudRes.error || 'Verifica tu conexión a internet o Wi-Fi'}`);
          setIsSending(false);
          return;
        }
      } catch (cloudErr: any) {
        alert('No se pudo conectar ni por Wi-Fi local ni por internet a Firebase.');
        setIsSending(false);
        return;
      }
    }

    if (sentLocally) {
      playSound('dispatch');
      setOrderSuccessMsg(`✅ Comanda enviada exitosamente para ${selectedTable.number}`);
      setNewOrderItems([]);
      setTimeout(() => {
        setOrderSuccessMsg(null);
      }, 3500);
    }
    setIsSending(false);
  };

  // ABRIR TICKET DE PRECUENTA DETALLADO
  const handleOpenTicket = (tbl?: Table | null) => {
    const target = tbl || selectedTable;
    if (!target) return;
    if ((!target.items || target.items.length === 0) && newOrderItems.length === 0) {
      alert('La mesa no tiene consumos registrados para generar precuenta.');
      return;
    }
    playSound('click');
    setTicketTable(target);
    setIsTicketModalOpen(true);
  };

  // SOLICITAR CUENTA A CAJA DIRECTAMENTE (DESDE EL TICKET O ACCIÓN RÁPIDA)
  const handleConfirmRequestBillFromTicket = async () => {
    const target = ticketTable || selectedTable;
    if (!target) return;

    try {
      await fetch(`${apiBase}/api/table/request-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: target.id,
          tableName: target.number,
          waiter: currentUser ? currentUser.name : currentWaiter,
        }),
      });
      playSound('success');

      // Actualizar estado local para feedback visual inmediato
      setTables((prev) =>
        prev.map((t) => (t.id === target.id ? { ...t, status: 'por_cobrar' } : t))
      );
      if (selectedTable && selectedTable.id === target.id) {
        setSelectedTable((prev) => (prev ? { ...prev, status: 'por_cobrar' } : null));
      }
      if (ticketTable && ticketTable.id === target.id) {
        setTicketTable((prev) => (prev ? { ...prev, status: 'por_cobrar' } : null));
      }
      alert(`🧾 ¡Cuenta solicitada a caja para ${target.number}! La alerta ha sido enviada al cajero.`);
    } catch (err) {
      console.error('Error solicitando cuenta a caja:', err);
      alert('Error al comunicar con la caja. Verifica la conexión Wi-Fi.');
    }
  };

  // Abrir comanda / mesa desde el comandero móvil
  const handleConfirmOpenTable = async (
    tableId: string,
    patronName: string,
    waiter: string,
    pax: number
  ) => {
    const waiterToUse = waiter || (currentUser ? currentUser.name : currentWaiter);
    try {
      await fetch(`${apiBase}/api/table/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          waiter: waiterToUse,
          patronName,
          diners: pax,
        }),
      });
    } catch (err) {
      console.error('Error notificando apertura de mesa:', err);
    }

    let openedTable: Table | null = null;
    setTables((prev) => {
      const updated = prev.map((t) => {
        if (t.id === tableId || (t.number && t.number.toLowerCase() === tableId.toLowerCase())) {
          const opened: Table = {
            ...t,
            status: 'ocupada' as const,
            openedAt: new Date().toISOString(),
            patronName,
            waiter: waiterToUse,
            capacity: 4,
            items: [],
            subtotal: 0,
            tipPercentage: 0,
            tipAmount: 0,
            total: 0,
          };
          openedTable = opened;
          return opened;
        }
        return t;
      });
      return updated;
    });

    setIsOpenTableModalOpen(false);
    setPreSelectedTable(null);
    playSound('success');

    // Entrar directamente a tomar el pedido de la mesa recién abierta
    const target = openedTable || tables.find((t) => t.id === tableId);
    if (target) {
      setSelectedTable({
        ...target,
        status: 'ocupada',
        patronName,
        waiter,
        capacity: 4,
        items: target.items || [],
      });
      setNewOrderItems([]);
    }
  };

  const handleTableCardClick = (tbl: Table) => {
    playSound('click');
    if (tbl.status === 'libre') {
      setPreSelectedTable(tbl);
      setIsOpenTableModalOpen(true);
    } else {
      setSelectedTable(tbl);
      setNewOrderItems([]);
    }
  };

  return (
    <div className="mobile-waiter-app">
      {/* Top Mobile Bar */}
      <header className="mobile-waiter-header">
        <div className="mobile-brand-box">
          <img src={laMoliendaLogo} alt="Logo" className="mobile-logo-img" />
          <div className="mobile-brand-text-col">
            <h1 className="mobile-brand-name">LA MOLIENDA</h1>
            <span className="mobile-app-label">Comandero Móvil</span>
          </div>
        </div>

        <div className="mobile-header-right">
          {/* Botón Instalar App PWA (solo visible en navegador web si no es APK ni está instalada) */}
          {!isStandalone && !isNative && (
            <button
              type="button"
              className="mobile-install-pwa-btn"
              onClick={handleInstallPwa}
              title="Instalar App oficial de La Molienda en tu teléfono"
              aria-label="Instalar App"
            >
              <Download size={13} />
              <span className="mobile-install-btn-text">Instalar App</span>
            </button>
          )}

          {/* Botón Cambiar Tema (Claro / Oscuro) */}
          <button
            type="button"
            className="mobile-theme-toggle-btn"
            onClick={handleToggleTheme}
            title={`Cambiar a modo ${effectiveTheme === 'dark' ? 'claro' : 'oscuro'}`}
            aria-label="Cambiar tema de color"
          >
            {effectiveTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Conexión Wi-Fi / Nube en tiempo real */}
          <button
            type="button"
            className={`mobile-conn-badge ${isConnected ? 'online' : 'offline'}`}
            title={
              !isNetworkOnline
                ? 'Sin conexión a Internet en este dispositivo'
                : isSseConnected
                ? 'Conectado a la caja local (Red Wi-Fi)'
                : (firebaseStatus === 'connected' || firebaseStatus === 'syncing')
                ? 'Conectado a la nube en tiempo real'
                : isConnected
                ? 'En línea'
                : 'Sin conexión: Toca para reconectar con el servidor o la nube'
            }
            onClick={() => {
              playSound('click');
              setReconnectCounter((c) => c + 1);
              pullAllCloudDataToLocal().catch(() => {});
            }}
            aria-label={isConnected ? 'En Línea' : 'Desconectado'}
          >
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="mobile-conn-text">{isConnected ? 'En Línea' : 'Desconectado'}</span>
          </button>

          {/* Perfil del Mesero Autenticado */}
          {currentUser ? (
            <button
              type="button"
              className="mobile-waiter-profile-badge"
              onClick={() => {
                playSound('click');
                setIsProfileModalOpen(true);
              }}
              title="Toca para ver perfil o cambiar de mesero"
            >
              <span className="mobile-waiter-badge-avatar">
                <User size={13} />
              </span>
              <div className="mobile-waiter-badge-text">
                <span className="mobile-waiter-badge-name">{currentUser.name}</span>
                <span className="mobile-waiter-badge-role">
                  {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'cajero' ? 'Caja' : 'Mesero'}
                </span>
              </div>
              <LogOut size={12} className="mobile-waiter-badge-logout-icon" />
            </button>
          ) : (
            <div className="mobile-waiter-login-hint">
              <KeyRound size={13} />
              <span>Acceso</span>
            </div>
          )}
        </div>
      </header>

      {/* BANNER DE SERVICIO CERRADO / BLOQUEADO POR CIERRE DE CAJA (Solo PC puede abrir o cerrar) */}
      {!serviceStatus.isOpen && !isServiceBannerDismissed && (
        <div className="mobile-service-closed-banner">
          <div className="mobile-service-closed-content">
            <Lock size={16} />
            <div>
              <strong>Servicio Suspendido por Administración</strong>
              <span>{serviceStatus.reason || 'Turno cerrado. Las comandas están deshabilitadas hasta la próxima apertura desde la caja.'}</span>
            </div>
          </div>
          <button
            type="button"
            className="mobile-service-dismiss-btn"
            onClick={() => {
              playSound('click');
              setIsServiceBannerDismissed(true);
            }}
            title="Cerrar aviso"
            aria-label="Cerrar aviso"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {!currentUser ? (
        /* VISTA 0: LOGIN SI NO HAY USUARIO AUTENTICADO */
        <div className="mobile-login-view">
          <div className={`mobile-login-card ${loginShake ? 'shake' : ''}`}>
            {/* Header del Login */}
            <div className="mobile-login-card-header">
              <div className="mobile-login-logo-wrap">
                <img src={laMoliendaLogo} alt="La Molienda" className="mobile-login-logo" />
              </div>
              <h2 className="mobile-login-title">Acceso de Personal</h2>
              <p className="mobile-login-subtitle">
                Ingresa con tu PIN de mesero para gestionar pedidos y mesas
              </p>
            </div>

            {/* Selector de Modo (PIN / Admin) */}
            <div className="mobile-login-tabs">
              <button
                type="button"
                className={`mobile-login-tab ${authMode === 'pin' ? 'active' : ''}`}
                onClick={() => {
                  playSound('click');
                  setAuthMode('pin');
                  setLoginError(null);
                  setLoginPin('');
                }}
              >
                <KeyRound size={15} />
                <span>PIN</span>
              </button>
              <button
                type="button"
                className={`mobile-login-tab ${authMode === 'admin' ? 'active' : ''}`}
                onClick={() => {
                  playSound('click');
                  setAuthMode('admin');
                  setLoginError(null);
                }}
              >
                <ShieldCheck size={15} />
                <span>Administrador</span>
              </button>
            </div>

            {/* Mensajes de Alerta */}
            {loginError && (
              <div className="mobile-login-alert error" role="alert">
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}
            {isLoginSuccess && (
              <div className="mobile-login-alert success">
                <CheckCircle2 size={16} />
                <span>¡Acceso concedido! Entrando al comandero...</span>
              </div>
            )}

            {/* MODO PIN */}
            {authMode === 'pin' && (
              <div className="mobile-pin-section">
                {/* Opcional: Chips de usuarios para selección rápida */}
                {systemUsers.length > 1 && (
                  <div className="mobile-users-chips-wrap">
                    <span className="mobile-users-chips-label">Selecciona tu usuario (o digita tu PIN):</span>
                    <div className="mobile-users-chips-list">
                      {systemUsers
                        .filter((u) => u.active)
                        .map((u) => {
                          const isSel = selectedUserForPin?.id === u.id;
                          return (
                            <button
                              key={u.id}
                              type="button"
                              className={`mobile-user-chip ${isSel ? 'selected' : ''}`}
                              onClick={() => {
                                playSound('click');
                                setSelectedUserForPin(isSel ? null : u);
                                setLoginPin('');
                                setLoginError(null);
                              }}
                            >
                              <User size={12} />
                              <span>{u.name}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Visualización de los 4 Dígitos */}
                <div className="mobile-pin-dots-display">
                  {[0, 1, 2, 3].map((idx) => {
                    const filled = loginPin.length > idx;
                    return (
                      <div
                        key={idx}
                        className={`mobile-pin-dot ${filled ? 'filled' : ''} ${isLoginSuccess ? 'success' : ''}`}
                      >
                        {filled && <span className="mobile-pin-dot-glow" />}
                      </div>
                    );
                  })}
                </div>

                <p className="mobile-pin-hint">
                  {selectedUserForPin
                    ? `Mesero: ${selectedUserForPin.name} (${selectedUserForPin.role})`
                    : 'Digita tu PIN de 4 dígitos'}
                </p>

                {/* Teclado Táctil 3x4 */}
                <div className="mobile-keypad-grid">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      className="mobile-keypad-btn"
                      onClick={() => handleMobilePinDigit(digit)}
                      disabled={isLoggingIn || isLoginSuccess || loginPin.length >= 4}
                    >
                      <span className="mobile-keypad-num">{digit}</span>
                    </button>
                  ))}

                  <button
                    type="button"
                    className="mobile-keypad-btn action-btn clear"
                    onClick={handleMobilePinClear}
                    disabled={isLoggingIn || isLoginSuccess || loginPin.length === 0}
                    title="Limpiar"
                  >
                    <span>C</span>
                  </button>

                  <button
                    type="button"
                    className="mobile-keypad-btn"
                    onClick={() => handleMobilePinDigit('0')}
                    disabled={isLoggingIn || isLoginSuccess || loginPin.length >= 4}
                  >
                    <span className="mobile-keypad-num">0</span>
                  </button>

                  <button
                    type="button"
                    className="mobile-keypad-btn action-btn backspace"
                    onClick={handleMobilePinBackspace}
                    disabled={isLoggingIn || isLoginSuccess || loginPin.length === 0}
                    title="Borrar dígito"
                  >
                    <Delete size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* MODO ADMIN (USUARIO Y CONTRASEÑA) */}
            {authMode === 'admin' && (
              <form onSubmit={handleAdminFormSubmit} className="mobile-admin-login-form">
                <div className="mobile-input-group">
                  <label className="mobile-input-label">Usuario</label>
                  <div className="mobile-input-wrap">
                    <User size={16} className="mobile-input-icon" />
                    <input
                      type="text"
                      className="mobile-login-input"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="admin"
                      autoCapitalize="none"
                      autoCorrect="off"
                      disabled={isLoggingIn || isLoginSuccess}
                    />
                  </div>
                </div>

                <div className="mobile-input-group">
                  <label className="mobile-input-label">Contraseña</label>
                  <div className="mobile-input-wrap">
                    <Lock size={16} className="mobile-input-icon" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      className="mobile-login-input"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isLoggingIn || isLoginSuccess}
                    />
                    <button
                      type="button"
                      className="mobile-eye-btn"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      tabIndex={-1}
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="mobile-login-submit-btn"
                  disabled={isLoggingIn || isLoginSuccess}
                >
                  <ShieldCheck size={18} />
                  <span>{isLoggingIn ? 'Verificando...' : 'Iniciar Sesión'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Banner de Instalación PWA en pantalla de login (solo en navegador web si no es APK) */}
          {!isStandalone && !isNative && (
            <div
              className="mobile-login-pwa-banner"
              onClick={handleInstallPwa}
              role="button"
              tabIndex={0}
              title="Toca para instalar la aplicación oficial"
            >
              <div className="mobile-pwa-banner-icon">
                <Smartphone size={20} />
              </div>
              <div className="mobile-pwa-banner-info">
                <strong>¿Instalar App oficial en tu celular?</strong>
                <span>Toca aquí para guardarla con ícono oficial y usarla a pantalla completa</span>
              </div>
              <Download size={16} className="mobile-pwa-banner-dl-icon" />
            </div>
          )}

          {/* Footer institucional de autoría técnica */}
          <footer className="mobile-waiter-footer">
            <div className="mobile-footer-inner">
              <p className="mobile-footer-dev">
                Sistema desarrollado por{' '}
                <strong className="mobile-footer-engineer">Juan Esteban Riascos Madarriaga</strong>
              </p>
              <span className="mobile-footer-subtitle">Ingeniero de Sistemas &bull; La Molienda POS</span>
            </div>
          </footer>
        </div>
      ) : !selectedTable ? (
        /* VISTA 1: PLANO / SELECCIÓN DE MESAS */
        <main className="mobile-tables-view">
          {/* Zone Tabs & Abrir Mesa Shortcut */}
          <div className="mobile-tables-header-row">
            <div className="mobile-zone-tabs">
              <button
                type="button"
                className={`mobile-zone-tab ${activeZone === 'salon' ? 'active' : ''}`}
                onClick={() => setActiveZone('salon')}
              >
                Salón
              </button>
              <button
                type="button"
                className={`mobile-zone-tab ${activeZone === 'terraza' ? 'active' : ''}`}
                onClick={() => setActiveZone('terraza')}
              >
                Terraza
              </button>
              <button
                type="button"
                className={`mobile-zone-tab ${activeZone === 'barra' ? 'active' : ''}`}
                onClick={() => setActiveZone('barra')}
              >
                Barra
              </button>
            </div>

            <button
              type="button"
              className="btn-mobile-open-table-shortcut"
              onClick={() => {
                playSound('click');
                const firstFree = zoneTables.find((t) => t.status === 'libre') || tables.find((t) => t.status === 'libre');
                setPreSelectedTable(firstFree || null);
                setIsOpenTableModalOpen(true);
              }}
              title="Abrir nueva mesa o asignar comanda"
            >
              <Plus size={14} />
              <span>Abrir Mesa</span>
            </button>
          </div>

          {/* Línea divisoria entre la botonera de zonas y las tarjetas de mesas */}
          <div className="mobile-zone-tables-divider" />

          {/* Grid de Mesas */}
          <div className="mobile-tables-grid">
            {zoneTables.length === 0 ? (
              <div style={{ gridColumn: 'span 2', padding: '2.5rem 1rem', textAlign: 'center', color: '#a39282' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No hay mesas asignadas en la zona <strong>{activeZone.toUpperCase()}</strong>.</p>
                <button
                  type="button"
                  style={{ marginTop: '0.8rem', background: '#d97706', color: '#ffffff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 'bold' }}
                  onClick={() => setActiveZone('salon')}
                >
                  Ver mesas del Salón Principal
                </button>
              </div>
            ) : (
              zoneTables.map((tbl) => {
                const isOccupied = tbl.status === 'ocupada';
                const isPrebill = tbl.status === 'por_cobrar';
                const isFree = tbl.status === 'libre';
                const totalItemsCount = tbl.items.reduce((s, i) => s + i.quantity, 0);
                const timeText = getElapsedTime(tbl.openedAt);

                return (
                  <div
                    key={tbl.id}
                    className={`mobile-table-card status-${tbl.status}`}
                    onClick={() => handleTableCardClick(tbl)}
                  >
                    {/* 1. Cabecera: Número de Mesa y Estado */}
                    <div className="mobile-tbl-top">
                      <span className="mobile-tbl-num">{tbl.number}</span>
                      <span className={`mobile-status-pill pill-${tbl.status}`}>
                        {isFree && 'Libre'}
                        {isOccupied && 'Ocupada'}
                        {isPrebill && 'Precuenta'}
                      </span>
                    </div>

                    {/* 2. Subcabecera / Metadatos (Mesero asignado, tiempo o capacidad) */}
                    <div className="mobile-tbl-meta">
                      {isFree ? (
                        <>
                          <span className="mobile-tbl-meta-item">
                            <Users size={11} />
                            <span>{tbl.capacity} pax</span>
                          </span>
                          <span className="mobile-tbl-meta-zone">{tbl.zone.toUpperCase()}</span>
                        </>
                      ) : (
                        <>
                          <span className="mobile-tbl-meta-item waiter-tag" title={`Atendido por: ${tbl.waiter || 'Mesero'}`}>
                            <User size={11} />
                            <span>{tbl.waiter || 'Mesero'}</span>
                          </span>
                          {timeText && (
                            <span className="mobile-tbl-meta-item elapsed-tag">
                              <Clock size={11} />
                              <span>{timeText}</span>
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* 3. Cuerpo principal: Contenedor destacado de consumo o disponibilidad */}
                    <div className="mobile-tbl-body-box">
                      {isFree ? (
                        <div className="mobile-tbl-free-box">
                          <span className="free-box-icon">☕</span>
                          <span className="free-box-label">Disponible</span>
                        </div>
                      ) : (
                        <div className="mobile-tbl-order-box">
                          <span className="mobile-tbl-total">{formatCurrency(tbl.total)}</span>
                          <span className="mobile-tbl-items-count">
                            {totalItemsCount} {totalItemsCount === 1 ? 'ítem servido' : 'ítems servidos'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 4. Pie de acción interactivo */}
                    <div className="mobile-tbl-footer-action">
                      {!isFree && tbl.items && tbl.items.length > 0 ? (
                        <button
                          type="button"
                          className="mobile-tbl-quick-ticket-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTicket(tbl);
                          }}
                          title="Ver ticket de precuenta"
                        >
                          <Receipt size={12} />
                          <span>Ver Ticket</span>
                        </button>
                      ) : !isFree ? (
                        <button
                          type="button"
                          className="mobile-tbl-quick-order-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTable(tbl);
                            setNewOrderItems([]);
                          }}
                          title="Tomar pedido"
                        >
                          <Plus size={12} />
                          <span>Tomar Pedido</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="mobile-tbl-quick-open-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreSelectedTable(tbl);
                            setIsOpenTableModalOpen(true);
                          }}
                          title="Abrir mesa"
                        >
                          <Plus size={12} />
                          <span>Abrir Mesa</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer institucional de autoría técnica */}
          <footer className="mobile-waiter-footer">
            <div className="mobile-footer-inner">
              <p className="mobile-footer-dev">
                Sistema desarrollado por{' '}
                <strong className="mobile-footer-engineer">Juan Esteban Riascos Madarriaga</strong>
              </p>
              <span className="mobile-footer-subtitle">Ingeniero de Sistemas &bull; La Molienda POS</span>
            </div>
          </footer>
        </main>
      ) : (
        /* VISTA 2: COMANDAR EN LA MESA SELECCIONADA */
        <main className="mobile-order-view">
          {/* Order Header */}
          <div className="mobile-order-header">
            <button
              type="button"
              className="btn-back-tables"
              onClick={() => {
                if (newOrderItems.length > 0 && !window.confirm('¿Descartar los productos agregados a esta comanda?')) {
                  return;
                }
                setSelectedTable(null);
                setNewOrderItems([]);
              }}
            >
              <ArrowLeft size={16} />
              <span>Mesas</span>
            </button>

            <div className="mobile-order-target-title">
              <h2>{selectedTable.number}</h2>
              <span className={`tbl-badge-mini badge-${selectedTable.status}`}>
                {selectedTable.status.toUpperCase()}
              </span>
            </div>

            {(selectedTable.status === 'ocupada' || selectedTable.status === 'por_cobrar') && (
              <button
                type="button"
                className={`btn-req-prebill ${selectedTable.status === 'por_cobrar' ? 'is-requested' : ''}`}
                onClick={() => handleOpenTicket(selectedTable)}
                title="Ver ticket de precuenta detallado"
              >
                <Receipt size={14} />
                <span>{selectedTable.status === 'por_cobrar' ? 'Ver Precuenta' : 'Precuenta'}</span>
              </button>
            )}
          </div>

          {/* Toast de Éxito al Enviar Comanda */}
          {orderSuccessMsg && (
            <div className="mobile-order-success-toast">
              <CheckCircle size={18} />
              <span>{orderSuccessMsg}</span>
            </div>
          )}

          {/* Consumos ya existentes en la mesa */}
          {selectedTable.items.length > 0 && (
            <div
              className="mobile-existing-bill-card"
              onClick={() => handleOpenTicket(selectedTable)}
              title="Toca para ver el ticket de precuenta completo"
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
            >
              <div className="existing-bill-head">
                <span>Consumo acumulado en mesa ({selectedTable.items.length} refs):</span>
                <strong className="existing-total">{formatCurrency(selectedTable.total)}</strong>
              </div>
              <div className="existing-items-mini-list">
                {selectedTable.items.map((it) => (
                  <span key={it.id} className="existing-item-chip">
                    {it.quantity}x {it.productName}
                  </span>
                ))}
              </div>
              <div className="existing-bill-action-bar">
                <span className="existing-bill-hint">
                  <Receipt size={12} />
                  <span>Ver ticket de precuenta</span>
                </span>
                <span className="existing-bill-touch-cta">Toca para abrir 🧾</span>
              </div>
            </div>
          )}

          {/* Selector de Categorías de la Carta */}
          <div className="mobile-cat-scroll">
            <button
              type="button"
              className={`mobile-cat-pill ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              Todos
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`mobile-cat-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* Buscador de Productos */}
          <div className="mobile-search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar bebida, café, cóctel o cerveza..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mobile-search-input"
            />
          </div>

          {/* Grid de Productos para Agregar */}
          <div className="mobile-products-grid">
            {filteredProducts.map((prod) => {
              const isOut = prod.stock <= 0;
              const inCartItem = newOrderItems.find((i) => i.productId === prod.id);

              return (
                <div
                  key={prod.id}
                  className={`mobile-product-card ${isOut ? 'out-of-stock' : ''} ${inCartItem ? 'in-cart' : ''}`}
                  onClick={() => !isOut && handleAddItem(prod)}
                >
                  <div className="mobile-prod-img-box">
                    <img src={prod.image || laMoliendaLogo} alt={prod.name} className="mobile-prod-img" />
                    {prod.isComposite && (
                      <span className="prod-composite-indicator" title="Producto preparado con receta">
                        <Layers size={10} />
                      </span>
                    )}
                    {isOut && <span className="prod-out-badge">Agotado</span>}
                    {inCartItem && (
                      <span className="prod-cart-badge">{inCartItem.quantity} en comanda</span>
                    )}
                  </div>

                  <div className="mobile-prod-info">
                    <span className="mobile-prod-name">{prod.name}</span>
                    <div className="mobile-prod-price-row">
                      <span className="mobile-prod-price">{formatCurrency(prod.price)}</span>
                      <span className="mobile-prod-stock">{prod.stock} disp</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* BANDEJA INFERIOR DE LA NUEVA COMANDA (FLOTANTE) */}
          {newOrderItems.length > 0 && (
            <div className="mobile-comanda-tray">
              <div className="comanda-tray-header">
                <strong>Nueva Comanda a Enviar ({newOrderItems.reduce((s, i) => s + i.quantity, 0)} ítems):</strong>
                <span className="tray-total-val">{formatCurrency(newOrderSubtotal)}</span>
              </div>

              <div className="comanda-tray-items-list">
                {newOrderItems.map((item) => (
                  <div key={item.id} className="comanda-tray-row">
                    <div className="tray-row-info">
                      <span className="tray-item-name">{item.productName}</span>
                      <span className="tray-item-price">{formatCurrency(item.unitPrice * item.quantity)}</span>
                      {item.notes && <span className="tray-item-note">📝 {item.notes}</span>}
                    </div>

                    <div className="tray-row-controls">
                      <button
                        type="button"
                        className="btn-tray-note"
                        onClick={() => handleAddNote(item.id)}
                        title="Agregar nota a cocina/barra"
                      >
                        Nota
                      </button>
                      <button
                        type="button"
                        className="btn-tray-qty minus"
                        onClick={() => handleUpdateQty(item.id, -1)}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="tray-qty-num">{item.quantity}</span>
                      <button
                        type="button"
                        className="btn-tray-qty plus"
                        onClick={() => handleUpdateQty(item.id, 1)}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="comanda-tray-actions">
                <button
                  type="button"
                  className="btn-clear-tray"
                  onClick={() => setNewOrderItems([])}
                >
                  <RotateCcw size={14} />
                  <span>Borrar</span>
                </button>
                <button
                  type="button"
                  className="btn-send-tray"
                  disabled={isSending}
                  onClick={handleSendOrder}
                >
                  <Send size={15} />
                  <span>{isSending ? 'Enviando...' : `Enviar Comanda (${formatCurrency(newOrderSubtotal)})`}</span>
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      {/* Modal de Abrir Mesa / Asignar Comanda */}
      <OpenTableModal
        isOpen={isOpenTableModalOpen}
        tables={tables}
        preSelectedTable={preSelectedTable}
        staffList={staffList}
        currentStaff={currentUser ? currentUser.name : currentWaiter}
        onClose={() => {
          setIsOpenTableModalOpen(false);
          setPreSelectedTable(null);
        }}
        onConfirmOpen={handleConfirmOpenTable}
      />

      {/* Modal de Ticket de Precuenta Térmico */}
      <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false);
          setTicketTable(null);
        }}
        table={ticketTable || selectedTable}
        onRequestBill={handleConfirmRequestBillFromTicket}
        isMobileWaiter={true}
      />

      {/* Modal / Sheet de Perfil de Mesero y Cambio de Turno */}
      {isProfileModalOpen && currentUser && (
        <div className="mobile-profile-modal-overlay" onClick={() => setIsProfileModalOpen(false)}>
          <div className="mobile-profile-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Indicador táctil superior */}
            <div className="mobile-sheet-drag-handle" />

            <div className="mobile-profile-modal-header">
              <div className="mobile-profile-avatar-large">
                <User size={30} />
                <span className="avatar-status-dot" title="Sesión activa" />
              </div>

              <div className="mobile-profile-title-col">
                <h3 className="mobile-profile-user-name">{currentUser.name}</h3>
                <div className="mobile-profile-badges-row">
                  <span className={`mobile-role-tag role-${currentUser.role}`}>
                    {currentUser.role === 'admin' ? (
                      <>
                        <ShieldCheck size={12} />
                        <span>Administrador</span>
                      </>
                    ) : currentUser.role === 'cajero' ? (
                      <>
                        <Receipt size={12} />
                        <span>Cajero</span>
                      </>
                    ) : (
                      <>
                        <Coffee size={12} />
                        <span>Mesero</span>
                      </>
                    )}
                  </span>
                  <span className="mobile-active-tag">
                    <span className="active-pulse-dot" />
                    <span>Sesión Activa</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="mobile-profile-close-btn"
                onClick={() => setIsProfileModalOpen(false)}
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mobile-profile-info-body">
              {/* Tarjeta de Métrica: Mesas Asignadas */}
              <div className="mobile-profile-stat-box">
                <div className="stat-left-group">
                  <div className="stat-icon-wrapper">
                    <LayoutGrid size={18} />
                  </div>
                  <div className="stat-text-col">
                    <span className="stat-label">Mesas activas a tu cargo</span>
                    <span className="stat-desc">Asignadas a tu nombre en este turno</span>
                  </div>
                </div>
                <div className="stat-count-pill">
                  <strong>{tables.filter((t) => t.status !== 'libre' && t.waiter === currentUser.name).length}</strong>
                  <span>{tables.filter((t) => t.status !== 'libre' && t.waiter === currentUser.name).length === 1 ? 'mesa' : 'mesas'}</span>
                </div>
              </div>

              {/* Tarjeta de Aviso Contextual de Registro de Comandas */}
              <div className="mobile-profile-notice">
                <div className="notice-icon-circle">
                  <Sparkles size={16} />
                </div>
                <div className="notice-content-col">
                  <strong>Registro automático de comandas</strong>
                  <p>
                    Todas las comandas y aperturas de mesas que realices se registrarán automáticamente con tu nombre (<strong>{currentUser.name}</strong>).
                  </p>
                </div>
              </div>
            </div>

            <div className="mobile-profile-modal-actions">
              {!isStandalone && !isNative && (
                <button
                  type="button"
                  className="btn-mobile-install-sheet"
                  onClick={() => {
                    setIsProfileModalOpen(false);
                    handleInstallPwa();
                  }}
                >
                  <Download size={15} />
                  <span>Instalar App en este celular</span>
                </button>
              )}

              <button
                type="button"
                className="btn-mobile-continue"
                onClick={() => setIsProfileModalOpen(false)}
              >
                <span>Continuar Comandando</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="btn-mobile-change-waiter"
                onClick={handleLogoutWaiter}
              >
                <LogOut size={15} />
                <span>Cerrar Sesión / Cambiar Mesero</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Guía de Instalación PWA */}
      {showInstallGuideModal && (
        <div className="mobile-pwa-modal-overlay" onClick={() => setShowInstallGuideModal(false)}>
          <div className="mobile-pwa-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="mobile-pwa-modal-close"
              onClick={() => setShowInstallGuideModal(false)}
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>

            <div className="mobile-pwa-modal-header">
              <div className="mobile-pwa-modal-icon-badge">
                <img src="/pwa-192x192.png" alt="La Molienda" className="mobile-pwa-preview-icon" />
              </div>
              <div className="mobile-pwa-modal-title-col">
                <h3 className="mobile-pwa-modal-title">Instalar La Molienda</h3>
                <span className="mobile-pwa-modal-sub">App Oficial &bull; Pantalla Completa</span>
              </div>
            </div>

            <div className="mobile-pwa-modal-body">
              <div className="mobile-pwa-feature-pills">
                <span className="mobile-pwa-pill">⚡ 100% Gratis</span>
                <span className="mobile-pwa-pill">📶 Funciona en Red Wi-Fi</span>
                <span className="mobile-pwa-pill">📱 Pantalla Completa</span>
              </div>

              {deferredInstallPrompt ? (
                <div className="mobile-pwa-prompt-ready">
                  <p className="mobile-pwa-ready-desc">
                    Tu teléfono permite instalar la app oficial directamente con un solo toque:
                  </p>
                  <button
                    type="button"
                    className="btn-pwa-install-direct"
                    onClick={() => {
                      setShowInstallGuideModal(false);
                      handleInstallPwa();
                    }}
                  >
                    <Download size={18} />
                    <span>Instalar Ahora en Pantalla de Inicio</span>
                  </button>
                </div>
              ) : /iPad|iPhone|iPod/.test(navigator.userAgent) ? (
                <div className="mobile-pwa-instructions ios-instructions">
                  <div className="pwa-instruction-step">
                    <div className="step-num">1</div>
                    <div className="step-content">
                      <p>
                        Toca el botón <strong>Compartir</strong> en la barra de Safari (el ícono del recuadro con la flecha hacia arriba <Share2 size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />).
                      </p>
                    </div>
                  </div>
                  <div className="pwa-instruction-step">
                    <div className="step-num">2</div>
                    <div className="step-content">
                      <p>
                        Desplaza hacia abajo en las opciones y selecciona <strong>"Agregar a pantalla de inicio"</strong> (ícono con el signo <strong>＋</strong>).
                      </p>
                    </div>
                  </div>
                  <div className="pwa-instruction-step">
                    <div className="step-num">3</div>
                    <div className="step-content">
                      <p>
                        Toca <strong>"Agregar"</strong> arriba a la derecha. ¡Listo! Se creará el ícono oficial de La Molienda en tu iPhone.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mobile-pwa-instructions android-instructions">
                  <div className="pwa-instruction-step">
                    <div className="step-num">1</div>
                    <div className="step-content">
                      <p>
                        Toca el menú de opciones de Chrome (los <strong>tres puntos verticales ⋮</strong> arriba a la derecha).
                      </p>
                    </div>
                  </div>
                  <div className="pwa-instruction-step">
                    <div className="step-num">2</div>
                    <div className="step-content">
                      <p>
                        Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="pwa-instruction-step">
                    <div className="step-num">3</div>
                    <div className="step-content">
                      <p>
                        Confirma tocando <strong>"Instalar"</strong>. La app se guardará con su ícono y abrirá a pantalla completa.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mobile-pwa-modal-footer">
              <button
                type="button"
                className="btn-pwa-understood"
                onClick={() => setShowInstallGuideModal(false)}
              >
                <CheckCircle2 size={16} />
                <span>¡Entendido, gracias!</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
