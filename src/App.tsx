import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Table, TableZone, SaleRecord, OrderItem, SystemStats, SystemUser, AppNotification, NotificationType, CashClosingSummary } from './types';
import {
  getStoredProducts,
  saveStoredProducts,
  getStoredTables,
  saveStoredTables,
  getStoredSales,
  saveStoredSales,
  getStoredTheme,
  saveStoredTheme,
  getStoredCurrentStaff,
  saveStoredCurrentStaff,
  getStoredStaffList,
  calculateSystemStats,
  formatCurrency,
  deductInventoryForSale,
  syncCompositeProductsStock,
  saveStoredStaffList,
} from './utils/storage';
import {
  getStoredSessionUser,
  logoutSession,
  getStoredUsers,
  broadcastUsersSync,
} from './utils/authStorage';
import { DEFAULT_TABLES, DEFAULT_PRODUCTS } from './utils/defaults';
import { exportLaMoliendaReport, ExportReportOptions } from './utils/excelExporter';
import { playSound, soundForNotification } from './utils/sounds';

import { Header, ActiveSection } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { TablesView } from './components/TablesView';
import { PosView } from './components/PosView';
import { InventoryView } from './components/InventoryView';
import { SalesHistoryView } from './components/SalesHistoryView';
import { AmbientBackgroundCanvas } from './components/AmbientBackgroundCanvas';

import { TableDetailModal } from './components/TableDetailModal';
import { PaymentModal } from './components/PaymentModal';
import { TicketModal } from './components/TicketModal';
import { ProductFormModal } from './components/ProductFormModal';
import { OpenTableModal } from './components/OpenTableModal';
import { SplitBillModal } from './components/SplitBillModal';
import { TableTransferModal } from './components/TableTransferModal';
import { CashClosingModal } from './components/CashClosingModal';
import { CashClosingHistoryModal } from './components/CashClosingHistoryModal';
import { TableFormModal } from './components/TableFormModal';
import { ReserveTableModal } from './components/ReserveTableModal';
import { LoginModal } from './components/LoginModal';
import { UserManagementModal } from './components/UserManagementModal';
import { AboutModal } from './components/AboutModal';
import { ExitConfirmModal } from './components/ExitConfirmModal';
import { MobileSyncModal } from './components/MobileSyncModal';
import { NotificationsPanel } from './components/NotificationsPanel';
import { WaiterView } from './components/WaiterView';
import { Info } from 'lucide-react';

export const App: React.FC = () => {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('theme') === 'light') return 'light';
    if (params.get('theme') === 'dark') return 'dark';
    return getStoredTheme();
  });

  // Active section pill
  const [activeSection, setActiveSection] = useState<ActiveSection>(() => {
    const params = new URLSearchParams(window.location.search);
    const sec = params.get('section') as ActiveSection;
    if (['mesas', 'pos', 'inventario', 'caja'].includes(sec)) return sec;
    return 'mesas';
  });
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');

  const handleSectionChange = (newSec: ActiveSection) => {
    if (newSec === activeSection) return;
    if (currentUser?.role === 'mesero' && (newSec === 'inventario' || newSec === 'caja')) {
      showNotification('⚠️ Acceso restringido: Los meseros solo tienen acceso a Mesas y POS.');
      return;
    }
    const order: ActiveSection[] = ['mesas', 'pos', 'inventario', 'caja'];
    const oldIdx = order.indexOf(activeSection);
    const newIdx = order.indexOf(newSec);
    setSlideDirection(newIdx >= oldIdx ? 'right' : 'left');
    setActiveSection(newSec);
    playSound('tab');
  };

  const [products, setProducts] = useState<Product[]>(() => getStoredProducts());
  const [tables, setTables] = useState<Table[]>(() => getStoredTables());
  const [sales, setSales] = useState<SaleRecord[]>(() => getStoredSales());

  useEffect(() => {
    const stored = getStoredTables();
    if (stored.length !== tables.length) {
      setTables(stored);
    }
  }, [tables.length]);

  // Authentication & Users state
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mockAdmin') === '1') {
      return { id: 'admin-1', username: 'admin', name: 'Administrador Principal', role: 'admin', active: true, createdAt: new Date().toISOString() };
    }
    return getStoredSessionUser();
  });
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === '1') return true;
    if (params.get('mockAdmin') === '1') return false;
    const api = (window as any).electronAPI;
    const isMobile = !api || !api.isElectron;
    if (isMobile && params.get('view') !== 'admin' && params.get('view') !== 'pos') {
      return false;
    }
    return !getStoredSessionUser();
  });
  const [isUserManagementOpen, setIsUserManagementOpen] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('modal') === 'users';
  });

  // Staff & System Users state
  const [currentStaff, setCurrentStaff] = useState<string>(() => {
    const session = getStoredSessionUser();
    return session ? session.name : getStoredCurrentStaff();
  });
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(() => getStoredUsers());
  const [staffList, setStaffList] = useState<string[]>(() => {
    const storedStaff = getStoredStaffList();
    const users = getStoredUsers();
    const activeStaff = users.filter((u) => u.active).map((u) => u.name);
    const combined = Array.from(new Set([...storedStaff, ...activeStaff]));
    return combined.length > 0 ? combined : ['Administrador'];
  });

  // Escuchar actualizaciones de usuarios y mantener sincronizado el personal activo
  useEffect(() => {
    const handleUsersEvent = (e: any) => {
      const updated = e.detail?.users || getStoredUsers();
      setSystemUsers(updated);
      const activeStaff = updated.filter((u: any) => u.active).map((u: any) => u.name);
      if (activeStaff.length > 0) {
        setStaffList(activeStaff);
        saveStoredStaffList(activeStaff);
      }
    };

    window.addEventListener('lamolienda:users-changed', handleUsersEvent);

    // Sincronizar inmediatamente al iniciar la aplicación con el servidor Wi-Fi
    const currentUsers = getStoredUsers();
    broadcastUsersSync(currentUsers);
    const timer = setTimeout(() => {
      broadcastUsersSync(getStoredUsers());
    }, 1500);

    return () => {
      window.removeEventListener('lamolienda:users-changed', handleUsersEvent);
      clearTimeout(timer);
    };
  }, []);

  // Exit confirmation (Electron window close)
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState<boolean>(false);
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api || typeof api.onCloseRequested !== 'function') return;
    const unsubscribe = api.onCloseRequested(() => setIsExitConfirmOpen(true));
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleConfirmExit = () => {
    const api = (window as any).electronAPI;
    playSound('goodbye');
    // Se espera a que termine la melodía de despedida antes de cerrar
    setTimeout(() => {
      if (api && typeof api.confirmClose === 'function') {
        api.confirmClose();
      } else {
        setIsExitConfirmOpen(false);
      }
    }, 650);
  };

  // Sonido de advertencia al pedir confirmación de cierre
  useEffect(() => {
    if (isExitConfirmOpen) playSound('warning');
  }, [isExitConfirmOpen]);

  // Sonido de clic en todos los botones (excepto los que tienen sonido propio)
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest('button') as HTMLButtonElement | null;
      if (!btn || btn.disabled) return;
      if (btn.closest('[data-sound="none"], .nav-pill, .btn-icon-circle')) return;
      playSound('click');
    };
    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, []);

  // Notification state
  const [notification, setNotification] = useState<string | null>(null);

  // Modal states
  const [activeTableDetail, setActiveTableDetail] = useState<Table | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('modal') === 'table') {
      const stored = getStoredTables();
      return stored.find((t) => t.status !== 'libre') || stored[0] || null;
    }
    return null;
  });
  const [isTableDetailOpen, setIsTableDetailOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('modal') === 'table';
  });

  const [paymentTable, setPaymentTable] = useState<Table | null>(null);
  const [directPaymentItems, setDirectPaymentItems] = useState<OrderItem[] | null>(null);
  const [directPatronName, setDirectPatronName] = useState<string>('');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const [ticketSaleRecord, setTicketSaleRecord] = useState<SaleRecord | null>(null);
  const [ticketTable, setTicketTable] = useState<Table | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('modal') === 'ticket') {
      const stored = getStoredTables();
      return stored.find((t) => t.status !== 'libre') || stored[0] || null;
    }
    return null;
  });
  const [isTicketOpen, setIsTicketOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('modal') === 'ticket';
  });

  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isOpenTableModalOpen, setIsOpenTableModalOpen] = useState(false);
  const [preSelectedOpenTable, setPreSelectedOpenTable] = useState<Table | null>(null);

  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [preSelectedReserveTable, setPreSelectedReserveTable] = useState<Table | null>(null);

  const [splitBillTable, setSplitBillTable] = useState<Table | null>(null);
  const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);

  const [transferOriginTable, setTransferOriginTable] = useState<Table | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const [isCashClosingOpen, setIsCashClosingOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('modal') === 'closing';
  });
  const [isCashClosingHistoryOpen, setIsCashClosingHistoryOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('modal') === 'about';
  });

  // Table management states
  const [isTableFormOpen, setIsTableFormOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  // Mobile Sync (Comandero Móvil por Wi-Fi) states
  const [isMobileSyncOpen, setIsMobileSyncOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('modal') === 'mobilesync';
  });
  const [connectedClientsCount, setConnectedClientsCount] = useState<number>(0);

  // Determinar si quien carga es un celular de mesero o la ventana de Electron
  const isMobileClient = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'waiter') return true;
    if (params.get('view') === 'pos' || params.get('view') === 'admin') return false;
    const api = (window as any).electronAPI;
    return !api || !api.isElectron;
  }, []);

  // Lock background scrolling when any modal is open (solo en escritorio)
  const isAnyModalOpen = !isMobileClient && Boolean(
    isTableDetailOpen ||
    isPaymentOpen ||
    isTicketOpen ||
    isProductFormOpen ||
    isOpenTableModalOpen ||
    isReserveModalOpen ||
    isSplitBillOpen ||
    isTransferModalOpen ||
    isCashClosingOpen ||
    isTableFormOpen ||
    isLoginOpen ||
    isUserManagementOpen ||
    isAboutModalOpen ||
    isMobileSyncOpen
  );

  useEffect(() => {
    if (isMobileClient) {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
      return;
    }

    if (isAnyModalOpen) {
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');

      const handleWheel = (e: WheelEvent) => {
        const target = e.target as HTMLElement | null;
        if (target && target.classList.contains('modal-backdrop')) {
          e.preventDefault();
        }
      };

      window.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
        window.removeEventListener('wheel', handleWheel);
      };
    } else {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }
  }, [isAnyModalOpen, isMobileClient]);

  // Sonido al abrir / cerrar ventanas (se ignora el login, que tiene su propio sonido)
  const isSoundModalOpen = isAnyModalOpen && !isLoginOpen;
  const prevSoundModalOpen = React.useRef<boolean>(isSoundModalOpen);
  useEffect(() => {
    if (prevSoundModalOpen.current !== isSoundModalOpen) {
      playSound(isSoundModalOpen ? 'open' : 'close');
      prevSoundModalOpen.current = isSoundModalOpen;
    }
  }, [isSoundModalOpen]);

  // POS active comanda state (preserved across tab navigation)
  const [posCartItems, setPosCartItems] = useState<OrderItem[]>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cart') === '1') {
      const prods = getStoredProducts();
      return prods.slice(0, 3).map((p, idx) => ({
        id: `demo-${idx}`,
        productId: p.id,
        productName: p.name,
        productImage: p.image,
        unitPrice: p.price,
        quantity: idx === 0 ? 2 : 1,
        status: 'pending' as const,
      }));
    }
    return [];
  });
  const [posTargetTableId, setPosTargetTableId] = useState<string>('direct_takeaway');
  const [posTipPercentage, setPosTipPercentage] = useState<number>(0);
  const [posPatronNote, setPosPatronNote] = useState<string>('');

  // Sincronización en tiempo real del inventario con las selecciones del POS y mesas abiertas
  const synchronizedProducts = useMemo(() => {
    return products.map((prod) => {
      // 1. Unidades seleccionadas en la comanda activa del POS
      const inCart = posCartItems
        .filter((i) => i.productId === prod.id)
        .reduce((sum, i) => sum + i.quantity, 0);

      // 2. Unidades seleccionadas / servidas en mesas no libres
      const inTables = tables
        .filter((t) => t.status !== 'libre')
        .flatMap((t) => t.items)
        .filter((i) => i.productId === prod.id)
        .reduce((sum, i) => sum + i.quantity, 0);

      const reserved = inCart + inTables;
      const currentStock = Math.max(0, prod.stock - reserved);

      return {
        ...prod,
        stock: currentStock,
        originalStock: prod.stock,
        reservedStock: reserved,
      };
    });
  }, [products, posCartItems, tables]);

  // Theme synchronization
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveStoredTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    playSound('toggle');
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Historial y Centro de Notificaciones
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('lamolienda_notifications_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const lastNotificationTimeRef = useRef<{ [msg: string]: number }>({});

  const showNotification = (msg: string, explicitType?: NotificationType) => {
    const now = Date.now();
    const lastTime = lastNotificationTimeRef.current[msg] || 0;
    if (now - lastTime < 1800) {
      return;
    }
    lastNotificationTimeRef.current[msg] = now;

    playSound(soundForNotification(msg));
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 4200);

    let notifType: NotificationType = explicitType || 'system';
    if (!explicitType) {
      const lower = msg.toLowerCase();
      if (lower.includes('precuenta') || lower.includes('cobro')) notifType = 'prebill';
      else if (lower.includes('comanda') || lower.includes('pedido')) notifType = 'order';
      else if (lower.includes('mesa') || lower.includes('abierta') || lower.includes('espacio')) notifType = 'table';
      else if (lower.includes('inventario') || lower.includes('stock') || lower.includes('producto')) notifType = 'inventory';
    }

    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      message: msg,
      type: notifType,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => {
      const updated = [newNotif, ...prev.slice(0, 99)];
      try {
        localStorage.setItem('lamolienda_notifications_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      try {
        localStorage.setItem('lamolienda_notifications_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleMarkAllAsRead = () => {
    playSound('click');
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem('lamolienda_notifications_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearAllNotifications = () => {
    if (notifications.length === 0) return;
    if (window.confirm('¿Deseas vaciar todo el historial de notificaciones?')) {
      playSound('delete');
      setNotifications([]);
      try {
        localStorage.removeItem('lamolienda_notifications_history');
      } catch {}
    }
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      try {
        localStorage.setItem('lamolienda_notifications_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleSelectTableFromNotification = (tableNameOrId: string) => {
    const found = tables.find(
      (t) =>
        t.id === tableNameOrId ||
        (t.number && t.number.toLowerCase() === tableNameOrId.toLowerCase()) ||
        tableNameOrId.toLowerCase().includes(t.number.toLowerCase())
    );
    if (found) {
      setActiveSection('mesas');
      setActiveTableDetail(found);
      setIsTableDetailOpen(true);
      playSound('click');
    }
  };

  // Staff switch
  const handleChangeStaff = (staff: string) => {
    setCurrentStaff(staff);
    saveStoredCurrentStaff(staff);
    showNotification(`Turno activo asignado a: ${staff}`);
  };

  // System Stats live calculation
  const stats: SystemStats = calculateSystemStats(tables, sales, synchronizedProducts);

  // --- TABLE OPERATIONS ---
  const handleOpenNewTableForm = () => {
    setEditingTable(null);
    setIsTableFormOpen(true);
  };

  const handleEditTableForm = (table: Table) => {
    setEditingTable(table);
    setIsTableFormOpen(true);
  };

  const handleSaveTableForm = (data: {
    id?: string;
    number: string;
    zone: TableZone;
    capacity: number;
  }) => {
    if (data.id) {
      // Edit existing table
      const updated = tables.map((t) =>
        t.id === data.id
          ? {
              ...t,
              number: data.number,
              zone: data.zone,
              capacity: data.capacity,
            }
          : t
      );
      setTables(updated);
      saveStoredTables(updated);
      showNotification(`Espacio "${data.number}" actualizado correctamente.`);
    } else {
      // Create new table
      const newTable: Table = {
        id: `tbl-${data.zone}-${Date.now()}`,
        number: data.number,
        zone: data.zone,
        capacity: data.capacity,
        status: 'libre',
        items: [],
        subtotal: 0,
        total: 0,
      };
      const updated = [...tables, newTable];
      setTables(updated);
      saveStoredTables(updated);
      showNotification(`Nuevo espacio "${data.number}" agregado con éxito.`);
    }
    setIsTableFormOpen(false);
    setEditingTable(null);
  };

  const handleDeleteTable = (table: Table) => {
    if (table.status !== 'libre') {
      alert(
        `No puedes eliminar "${table.number}" porque tiene una cuenta activa o pre-cuenta. Debes cobrar o cancelar la cuenta primero.`
      );
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar permanentemente el espacio "${table.number}"?`
    );
    if (!confirmed) return;

    const updated = tables.filter((t) => t.id !== table.id);
    setTables(updated);
    saveStoredTables(updated);
    showNotification(`Espacio "${table.number}" eliminado del sistema.`);
  };

  const handleOpenTableModal = (table?: Table) => {
    setPreSelectedOpenTable(table || null);
    setIsOpenTableModalOpen(true);
  };

  const handleOpenReserveModal = (table?: Table) => {
    setPreSelectedReserveTable(table || null);
    setIsReserveModalOpen(true);
  };

  const clearedReservationFields = {
    reservationGroupId: undefined,
    reservationName: undefined,
    reservationPhone: undefined,
    reservationDate: undefined,
    reservationTime: undefined,
    reservationPax: undefined,
    reservationNotes: undefined,
  };

  const handleConfirmReserveTable = (
    tableIds: string[],
    reservationData: {
      name: string;
      phone?: string;
      date: string;
      time: string;
      pax: number;
      notes?: string;
    }
  ) => {
    // Si se edita una reserva conjunta existente, se conserva su groupId
    const previousGroupId = preSelectedReserveTable?.reservationGroupId;
    const groupId =
      tableIds.length > 1 ? previousGroupId || `rsv-${Date.now()}` : undefined;

    const updated = tables.map((t) => {
      if (tableIds.includes(t.id)) {
        return {
          ...t,
          status: 'reservada' as const,
          reservationGroupId: groupId,
          reservationName: reservationData.name,
          reservationPhone: reservationData.phone,
          reservationDate: reservationData.date,
          reservationTime: reservationData.time,
          reservationPax: reservationData.pax,
          reservationNotes: reservationData.notes,
        };
      }
      // Mesas que pertenecían a la reserva editada y fueron desmarcadas: quedan libres
      if (
        previousGroupId &&
        t.reservationGroupId === previousGroupId &&
        t.status === 'reservada'
      ) {
        return { ...t, status: 'libre' as const, ...clearedReservationFields };
      }
      return t;
    });
    setTables(updated);
    saveStoredTables(updated);
    setIsReserveModalOpen(false);

    const names = updated
      .filter((t) => tableIds.includes(t.id))
      .map((t) => t.number)
      .join(', ');
    showNotification(
      tableIds.length > 1
        ? `Mesas ${names} reservadas en conjunto para ${reservationData.name}.`
        : `Mesa ${names} reservada para ${reservationData.name}.`
    );
  };

  const handleCancelReservation = (
    table: Table,
    scope: 'table' | 'group' = 'table'
  ) => {
    const groupMembers = table.reservationGroupId
      ? tables.filter((t) => t.reservationGroupId === table.reservationGroupId)
      : [table];
    const targets = scope === 'group' ? groupMembers : [table];
    const label =
      targets.length > 1
        ? `las ${targets.length} mesas (${targets.map((t) => t.number).join(', ')})`
        : `"${table.number}"`;

    const confirmed = window.confirm(
      `¿Quitar la reserva de ${label} para ${table.reservationName || 'el cliente'}? ${targets.length > 1 ? 'Quedarán libres' : 'Quedará libre'}.`
    );
    if (!confirmed) return false;

    const ids = targets.map((t) => t.id);
    const remaining = groupMembers.filter((t) => !ids.includes(t.id));
    const updated = tables.map((t) => {
      if (ids.includes(t.id)) {
        return { ...t, status: 'libre' as const, ...clearedReservationFields };
      }
      // Si en el grupo solo queda una mesa, deja de ser una reserva conjunta
      if (remaining.length === 1 && t.id === remaining[0].id) {
        return { ...t, reservationGroupId: undefined };
      }
      return t;
    });
    setTables(updated);
    saveStoredTables(updated);
    showNotification(
      targets.length > 1
        ? `Reserva quitada. ${targets.length} mesas libres.`
        : `Reserva de ${table.number} quitada. Mesa libre.`
    );
    return true;
  };

  const handleConfirmOpenTable = (
    tableId: string,
    patronName: string,
    waiter: string,
    pax: number
  ) => {
    const updated = tables.map((t) =>
      t.id === tableId
        ? {
            ...t,
            status: 'ocupada' as const,
            openedAt: new Date().toISOString(),
            patronName,
            waiter,
            capacity: 4,
            reservationGroupId: undefined,
            reservationName: undefined,
            reservationPhone: undefined,
            reservationDate: undefined,
            reservationTime: undefined,
            reservationPax: undefined,
            reservationNotes: undefined,
            items: [],
            subtotal: 0,
            tipPercentage: 0,
            tipAmount: 0,
            total: 0,
          }
        : t
    );
    setTables(updated);
    saveStoredTables(updated);
    setIsOpenTableModalOpen(false);

    const opened = updated.find((t) => t.id === tableId);
    if (opened) {
      setActiveTableDetail(opened);
      setIsTableDetailOpen(true);
    }
    showNotification(`Mesa ${opened?.number} abierta para ${patronName}.`);
  };

  const handleSelectTable = (table: Table) => {
    setActiveTableDetail(table);
    setIsTableDetailOpen(true);
  };

  const handleUpdateAllTables = (updatedTables: Table[]) => {
    setTables(updatedTables);
    saveStoredTables(updatedTables);
  };

  const handleUpdateTable = (updatedTable: Table) => {
    const updated = tables.map((t) => (t.id === updatedTable.id ? updatedTable : t));
    setTables(updated);
    saveStoredTables(updated);
    setActiveTableDetail(updatedTable);
  };

  // Referencia a las mesas actuales para lecturas asíncronas sin romper efectos
  const tablesRef = useRef<Table[]>(tables);
  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);

  // Registro de órdenes ya procesadas para evitar duplicación entre IPC y SSE
  const processedOrderIdsRef = useRef<Set<string>>(new Set());
  const recentOrdersSignaturesRef = useRef<Map<string, number>>(new Map());

  const handleApplyMobileOrder = (
    tableId: string,
    itemsToAdd: OrderItem[],
    waiterName?: string,
    orderId?: string
  ) => {
    if (orderId) {
      if (processedOrderIdsRef.current.has(orderId)) return;
      processedOrderIdsRef.current.add(orderId);
    }

    setTables((prevTables) => {
      const target = prevTables.find(
        (t) =>
          t.id === tableId ||
          (t.number && tableId && t.number.toLowerCase() === tableId.toLowerCase())
      );
      if (!target) return prevTables;

      let merged = [...(target.items || [])];
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
            id: newItem.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            status: newItem.status || 'pending',
          });
        }
      });

      const subtotal = merged.reduce((acc, i) => acc + (i.unitPrice || 0) * (i.quantity || 1), 0);
      const tipAmount = target.tipPercentage
        ? Math.round((subtotal * target.tipPercentage) / 100)
        : 0;
      const total = subtotal + tipAmount;

      const updatedTable: Table = {
        ...target,
        status: 'ocupada',
        openedAt: target.openedAt || new Date().toISOString(),
        waiter: waiterName || target.waiter || currentStaff || 'Mesero',
        items: merged,
        subtotal,
        tipAmount,
        total,
      };

      const updatedAll = prevTables.map((t) => (t.id === target.id ? updatedTable : t));
      saveStoredTables(updatedAll);

      // Si la mesa está abierta en detalle en el PC del cajero, sincronizarla en vivo
      setActiveTableDetail((curr) => (curr && (curr.id === target.id || curr.number === target.number) ? updatedTable : curr));

      return updatedAll;
    });
  };

  // Transmitir cualquier cambio de mesas, productos, personal y usuarios del sistema a los celulares conectados
  useEffect(() => {
    const timer = setTimeout(() => {
      const payload = {
        tables,
        products: synchronizedProducts,
        staffList,
        systemUsers: systemUsers.map((u) => ({
          id: u.id,
          name: u.name,
          username: u.username,
          role: u.role,
          pin: u.pin,
          password: u.password,
          active: u.active,
        })),
      };
      const api = (window as any).electronAPI;
      if (api && typeof api.broadcastState === 'function') {
        api.broadcastState(payload);
      } else {
        // Sincronización HTTP directa con el servidor local cuando no estamos en Electron
        fetch('http://localhost:4545/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {});
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [tables, synchronizedProducts, staffList, systemUsers]);

  // Escuchar eventos en tiempo real desde el Servidor Wi-Fi (Celulares de Meseros)
  useEffect(() => {
    const api = (window as any).electronAPI;
    let unsubClients: any;
    let unsubOrder: any;
    let unsubOpen: any;
    let unsubBill: any;

    const processIncomingMobileOrder = (orderData: {
      orderId?: string;
      tableId: string;
      tableName?: string;
      items: OrderItem[];
      waiter?: string;
      notes?: string;
    }) => {
      if (!orderData || !orderData.tableId) return;

      // 1. Deduplicación por orderId único
      if (orderData.orderId) {
        if (processedOrderIdsRef.current.has(orderData.orderId)) {
          return;
        }
        processedOrderIdsRef.current.add(orderData.orderId);
        if (processedOrderIdsRef.current.size > 200) {
          const arr = Array.from(processedOrderIdsRef.current);
          processedOrderIdsRef.current = new Set(arr.slice(100));
        }
      }

      // 2. Deduplicación temporal por firma (misma mesa, mesero y cantidad de productos en < 2.5s)
      const totalCount = (orderData.items || []).reduce((s: number, i: any) => s + (i.quantity || 1), 0);
      const signature = `${orderData.tableId}-${orderData.waiter || ''}-${totalCount}`;
      const now = Date.now();
      const lastTime = recentOrdersSignaturesRef.current.get(signature);
      if (lastTime && now - lastTime < 2500) {
        return;
      }
      recentOrdersSignaturesRef.current.set(signature, now);

      // 3. Aplicar comanda a las mesas
      handleApplyMobileOrder(orderData.tableId, orderData.items, orderData.waiter, orderData.orderId);

      // 4. Sonido y Notificación única en caja
      playSound('dispatch');
      const currentTables = tablesRef.current;
      const targetTable = currentTables.find(
        (t: Table) =>
          t.id === orderData.tableId ||
          (t.number && orderData.tableId && t.number.toLowerCase() === orderData.tableId.toLowerCase())
      );
      const tableName = orderData.tableName || (targetTable ? targetTable.number : 'Mesa');
      showNotification(
        `🛎️ ¡Nueva Comanda Móvil! ${orderData.waiter || 'Mesero'} envió ${totalCount} producto(s) a ${tableName}.`
      );
    };

    // 1. Vía IPC en Electron
    if (api && api.isElectron) {
      unsubClients = api.onMobileClientsChanged?.((count: number) => {
        setConnectedClientsCount(count);
      });

      unsubOrder = api.onMobileOrder?.((orderData: {
        orderId?: string;
        tableId: string;
        tableName?: string;
        items: OrderItem[];
        waiter?: string;
        notes?: string;
      }) => {
        processIncomingMobileOrder(orderData);
      });

      unsubOpen = api.onMobileOpenTable?.((data: {
        tableId: string;
        waiter: string;
        patronName?: string;
        diners?: number;
      }) => {
        setTables((prevTables) => {
          const updated = prevTables.map((t) => {
            if (t.id === data.tableId || (t.number && t.number.toLowerCase() === data.tableId.toLowerCase())) {
              return {
                ...t,
                status: 'ocupada' as const,
                openedAt: new Date().toISOString(),
                patronName: data.patronName || 'Cliente',
                waiter: data.waiter || 'Mesero',
                capacity: 4,
                items: [],
                subtotal: 0,
                tipPercentage: 0,
                tipAmount: 0,
                total: 0,
              };
            }
            return t;
          });
          saveStoredTables(updated);
          return updated;
        });
        playSound('click');
        const currentTables = tablesRef.current;
        const targetTable = currentTables.find(
          (t: Table) => t.id === data.tableId || (t.number && t.number.toLowerCase() === data.tableId.toLowerCase())
        );
        const tableName = targetTable ? targetTable.number : 'Mesa';
        showNotification(`📱 ${tableName} abierta por ${data.waiter || 'Mesero'} desde celular.`);
      });

      unsubBill = api.onMobileRequestBill?.((data: {
        tableId: string;
        tableName: string;
        waiter: string;
      }) => {
        setTables((prevTables) => {
          const updated = prevTables.map((t) => {
            if (
              (t.id === data.tableId || (t.number && t.number.toLowerCase() === data.tableId.toLowerCase())) &&
              t.items.length > 0
            ) {
              return { ...t, status: 'por_cobrar' as const };
            }
            return t;
          });
          saveStoredTables(updated);
          return updated;
        });
        playSound('cash');
        const currentTables = tablesRef.current;
        const targetTable = currentTables.find(
          (t: Table) => t.id === data.tableId || (t.number && t.number.toLowerCase() === data.tableId?.toLowerCase())
        );
        const resolvedTableName = data.tableName || (targetTable ? targetTable.number : 'la mesa');
        showNotification(`🧾 Mesero ${data.waiter || 'Mesero'} solicita la precuenta / cobro de ${resolvedTableName}.`, 'prebill');
      });
    }

    // 2. Vía Server-Sent Events (SSE) hacia el servidor local (únicamente cuando se ejecuta en navegador sin Electron)
    let sse: EventSource | null = null;
    const isElectronEnv = Boolean(api && api.isElectron);

    if (!isElectronEnv) {
      try {
        const serverPort = window.location.port === '5173' ? '4545' : (window.location.port || '4545');
        const sseUrl = `http://${window.location.hostname || 'localhost'}:${serverPort}/api/stream`;
        sse = new EventSource(sseUrl);

        sse.addEventListener('clients-changed', (e: any) => {
          try {
            const count = JSON.parse(e.data);
            if (typeof count === 'number') setConnectedClientsCount(count);
          } catch {}
        });

        sse.addEventListener('mobile-open-table', (e: any) => {
          try {
            const data = JSON.parse(e.data);
            setTables((prevTables) => {
              const updated = prevTables.map((t) => {
                if (t.id === data.tableId || (t.number && t.number.toLowerCase() === data.tableId.toLowerCase())) {
                  return {
                    ...t,
                    status: 'ocupada' as const,
                    openedAt: new Date().toISOString(),
                    patronName: data.patronName || 'Cliente',
                    waiter: data.waiter || 'Mesero',
                    capacity: 4,
                    items: [],
                    subtotal: 0,
                    tipPercentage: 0,
                    tipAmount: 0,
                    total: 0,
                  };
                }
                return t;
              });
              saveStoredTables(updated);
              return updated;
            });
            playSound('click');
            const currentTables = tablesRef.current;
            const targetTable = currentTables.find(
              (t: Table) => t.id === data.tableId || (t.number && t.number.toLowerCase() === data.tableId.toLowerCase())
            );
            const tableName = targetTable ? targetTable.number : 'Mesa';
            showNotification(`📱 ${tableName} abierta por ${data.waiter || 'Mesero'} desde celular.`);
          } catch {}
        });

        sse.addEventListener('mobile-request-bill', (e: any) => {
          try {
            const data = JSON.parse(e.data);
            setTables((prevTables) => {
              const updated = prevTables.map((t) => {
                if (
                  (t.id === data.tableId || (t.number && t.number.toLowerCase() === data.tableId.toLowerCase())) &&
                  t.items.length > 0
                ) {
                  return { ...t, status: 'por_cobrar' as const };
                }
                return t;
              });
              saveStoredTables(updated);
              return updated;
            });
            playSound('cash');
            const currentTables = tablesRef.current;
            const targetTable = currentTables.find(
              (t: Table) => t.id === data.tableId || (t.number && t.number.toLowerCase() === data.tableId?.toLowerCase())
            );
            const resolvedTableName = data.tableName || (targetTable ? targetTable.number : 'la mesa');
            showNotification(`🧾 Mesero ${data.waiter || 'Mesero'} solicita la precuenta / cobro de ${resolvedTableName}.`, 'prebill');
          } catch {}
        });

        sse.addEventListener('new-order-broadcast', (e: any) => {
          try {
            const orderData = JSON.parse(e.data);
            if (typeof processIncomingMobileOrder === 'function') {
              processIncomingMobileOrder(orderData);
            }
          } catch (err) {
            console.error('Error procesando new-order-broadcast SSE:', err);
          }
        });
      } catch {}
    }

    return () => {
      if (typeof unsubClients === 'function') unsubClients();
      if (typeof unsubOrder === 'function') unsubOrder();
      if (typeof unsubOpen === 'function') unsubOpen();
      if (typeof unsubBill === 'function') unsubBill();
      sse?.close();
    };
  }, []);

  const handleTransferTable = (table: Table) => {
    setTransferOriginTable(table);
    setIsTransferModalOpen(true);
  };

  const handleConfirmTransfer = (originId: string, destinationId: string) => {
    const origin = tables.find((t) => t.id === originId);
    const dest = tables.find((t) => t.id === destinationId);
    if (!origin || !dest) return;

    const updated = tables.map((t) => {
      if (t.id === destinationId) {
        return {
          ...t,
          status: 'ocupada' as const,
          openedAt: origin.openedAt || new Date().toISOString(),
          patronName: origin.patronName,
          waiter: origin.waiter,
          items: origin.items,
          subtotal: origin.subtotal,
          tipPercentage: origin.tipPercentage,
          tipAmount: origin.tipAmount,
          total: origin.total,
        };
      }
      if (t.id === originId) {
        return {
          ...t,
          status: 'libre' as const,
          openedAt: undefined,
          patronName: undefined,
          waiter: undefined,
          items: [],
          subtotal: 0,
          tipPercentage: 0,
          tipAmount: 0,
          total: 0,
        };
      }
      return t;
    });

    setTables(updated);
    saveStoredTables(updated);
    setIsTransferModalOpen(false);
    if (isTableDetailOpen) setIsTableDetailOpen(false);
    showNotification(`Cuenta trasladada con éxito de ${origin.number} a ${dest.number}.`);
  };

  // --- PRE-BILL / TICKET PREVIEW ---
  const handlePreBill = (table: Table) => {
    const updated = tables.map((t) =>
      t.id === table.id ? { ...t, status: 'por_cobrar' as const } : t
    );
    setTables(updated);
    saveStoredTables(updated);

    const currentT = updated.find((t) => t.id === table.id) || table;
    setTicketSaleRecord(null);
    setTicketTable(currentT);
    setIsTicketOpen(true);
  };

  const handleSplitBill = (table: Table) => {
    setSplitBillTable(table);
    setIsSplitBillOpen(true);
  };

  // --- CHECKOUT & PAYMENTS ---
  const handleCheckoutTable = (table: Table) => {
    const pendingItems = table.items.filter((i) => (i.status || 'pending') !== 'served');
    if (pendingItems.length > 0) {
      showNotification(
        `⚠️ No se puede cobrar: Hay ${pendingItems.length} producto(s) sin despachar (${pendingItems.map((p) => p.productName).slice(0, 2).join(', ')}${pendingItems.length > 2 ? '...' : ''}). Márcalos como "Servido" antes de cobrar.`
      );
      return;
    }
    setPaymentTable(table);
    setDirectPaymentItems(null);
    setDirectPatronName('');
    setIsPaymentOpen(true);
    if (isTableDetailOpen) setIsTableDetailOpen(false);
  };

  const handleDirectSaleCheckout = (items: OrderItem[], patronName?: string) => {
    if (currentUser?.role === 'mesero') {
      showNotification('⚠️ Función exclusiva de Caja: Carga el pedido a una mesa para registrar la comanda.');
      return;
    }
    setPaymentTable(null);
    setDirectPaymentItems(items);
    setDirectPatronName(patronName || 'Venta Rápida / Llevar');
    setIsPaymentOpen(true);
  };

  const handleCompletePayment = (saleRecord: SaleRecord, freedTableId?: string) => {
    // 1. Save Sale record
    const updatedSales = [saleRecord, ...sales];
    setSales(updatedSales);
    saveStoredSales(updatedSales);

    // 2. Deduct inventory stock for sold items (supports composite recipes)
    const updatedProducts = deductInventoryForSale(products, saleRecord.items);
    setProducts(updatedProducts);
    saveStoredProducts(updatedProducts);

    // 3. Free up table if table sale
    if (freedTableId) {
      const updatedTables = tables.map((t) =>
        t.id === freedTableId
          ? {
              ...t,
              status: 'libre' as const,
              openedAt: undefined,
              patronName: undefined,
              waiter: undefined,
              items: [],
              subtotal: 0,
              tipPercentage: 0,
              tipAmount: 0,
              total: 0,
            }
          : t
      );
      setTables(updatedTables);
      saveStoredTables(updatedTables);
    } else {
      setPosCartItems([]);
      setPosPatronNote('');
      setPosTipPercentage(0);
    }

    // 4. Close payment modal & Open Receipt for Printing
    setIsPaymentOpen(false);
    setTicketSaleRecord(saleRecord);
    setTicketTable(null);
    setIsTicketOpen(true);

    showNotification(
      `Venta ${saleRecord.ticketNumber} registrada exitosamente (${saleRecord.paymentMethod.toUpperCase()}).`
    );
  };

  // --- FACTURACIÓN PARCIAL POR COMENSAL (SPLIT BILL) ---
  const handleCompletePartialPayment = (
    saleRecord: SaleRecord,
    tableId: string,
    paidItems: { id: string; quantity: number }[]
  ) => {
    // 1. Guardar la venta en el historial y arqueo de caja
    const updatedSales = [saleRecord, ...sales];
    setSales(updatedSales);
    saveStoredSales(updatedSales);

    // 2. Descontar stock de inventario por los productos vendidos al comensal (supports composite recipes)
    const updatedProducts = deductInventoryForSale(products, saleRecord.items);
    setProducts(updatedProducts);
    saveStoredProducts(updatedProducts);

    // 3. Actualizar la comanda de la mesa restando únicamente lo pagado
    let remainingTotal = 0;
    let isTableFreed = false;
    let targetTableNumber = '';

    const updatedTables = tables.map((t) => {
      if (t.id !== tableId) return t;

      targetTableNumber = t.number;
      const remainingItems: OrderItem[] = [];

      t.items.forEach((item) => {
        const paid = paidItems.find((p) => p.id === item.id);
        const qtyPaid = paid ? paid.quantity : 0;
        const newQty = item.quantity - qtyPaid;

        if (newQty > 0) {
          remainingItems.push({
            ...item,
            quantity: newQty,
          });
        }
      });

      // Si no quedan productos pendientes en la comanda, se libera la mesa
      if (remainingItems.length === 0) {
        isTableFreed = true;
        return {
          ...t,
          status: 'libre' as const,
          openedAt: undefined,
          patronName: undefined,
          waiter: undefined,
          items: [],
          subtotal: 0,
          tipPercentage: 0,
          tipAmount: 0,
          total: 0,
        };
      }

      // Si aún quedan productos, la mesa continúa ABIERTA (ocupada) con saldo restante
      const subtotal = remainingItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const tipPercentage = t.tipPercentage || 0;
      const tipAmount = tipPercentage > 0 ? Math.round((subtotal * tipPercentage) / 100) : 0;
      const total = subtotal + tipAmount;
      remainingTotal = total;

      return {
        ...t,
        items: remainingItems,
        subtotal,
        tipAmount,
        total,
      };
    });

    setTables(updatedTables);
    saveStoredTables(updatedTables);

    // Sincronizar activeTableDetail si la mesa está abierta en el panel de detalle
    if (activeTableDetail && activeTableDetail.id === tableId) {
      if (isTableFreed) {
        setActiveTableDetail(null);
        setIsTableDetailOpen(false);
      } else {
        const updatedTableObj = updatedTables.find((t) => t.id === tableId);
        if (updatedTableObj) {
          setActiveTableDetail(updatedTableObj);
        }
      }
    }

    // 4. Cerrar el modal de Dividir Cuenta
    setIsSplitBillOpen(false);
    setSplitBillTable(null);

    // 5. Abrir el modal de ticket térmico para el comensal que se retira
    setTicketSaleRecord(saleRecord);
    setTicketTable(null);
    setIsTicketOpen(true);

    // 6. Notificación y sonido de éxito
    playSound('success');
    if (isTableFreed) {
      showNotification(
        `✅ Venta ${saleRecord.ticketNumber} registrada (${saleRecord.paymentMethod.toUpperCase()}). ${targetTableNumber} completó su cuenta y quedó liberada.`
      );
    } else {
      showNotification(
        `✅ Cobro individual registrado (${saleRecord.paymentMethod.toUpperCase()}). ${targetTableNumber} continúa abierta con saldo de ${formatCurrency(remainingTotal)}.`
      );
    }
  };

  // --- POS TO TABLE DISPATCH ---
  const handleAddItemsToTable = (tableId: string, newItems: OrderItem[]) => {
    const updated = tables.map((t) => {
      if (t.id === tableId) {
        const mergedItems = [...t.items];
        newItems.forEach((ni) => {
          const existIdx = mergedItems.findIndex(
            (i) => i.productId === ni.productId && (!i.notes || i.notes.trim() === '')
          );
          if (existIdx >= 0) {
            mergedItems[existIdx].quantity += ni.quantity;
          } else {
            mergedItems.push(ni);
          }
        });

        const subtotal = mergedItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
        const tipPercent = t.tipPercentage ?? 0;
        const tipAmount = Math.round(subtotal * (tipPercent / 100));
        const total = subtotal + tipAmount;

        return {
          ...t,
          status: 'ocupada' as const,
          openedAt: t.openedAt || new Date().toISOString(),
          waiter: t.waiter || currentStaff,
          items: mergedItems,
          subtotal,
          tipAmount,
          total,
        };
      }
      return t;
    });

    setTables(updated);
    saveStoredTables(updated);
    setPosCartItems([]);
    setPosPatronNote('');
    setPosTipPercentage(0);
  };

  // --- INVENTORY OPERATIONS (ADMIN ONLY) ---
  const handleOpenNewProduct = () => {
    if (currentUser?.role !== 'admin') {
      showNotification('⚠️ Acción restringida: Solo el Administrador puede registrar nuevos productos.');
      return;
    }
    setEditingProduct(null);
    setIsProductFormOpen(true);
  };

  const handleEditProduct = (prod: Product) => {
    if (currentUser?.role !== 'admin') {
      showNotification('⚠️ Acción restringida: Solo el Administrador puede modificar los datos del producto.');
      return;
    }
    setEditingProduct(prod);
    setIsProductFormOpen(true);
  };

  const handleSaveProduct = (prod: Product) => {
    const inCart = posCartItems
      .filter((i) => i.productId === prod.id)
      .reduce((sum, i) => sum + i.quantity, 0);
    const inTables = tables
      .filter((t) => t.status !== 'libre')
      .flatMap((t) => t.items)
      .filter((i) => i.productId === prod.id)
      .reduce((sum, i) => sum + i.quantity, 0);
    const reserved = inCart + inTables;

    const baseStockToSave = Math.max(0, (Number(prod.stock) || 0) + reserved);
    const prodToSave = { ...prod, stock: baseStockToSave };

    let updated: Product[];
    const exists = products.some((p) => p.id === prod.id);
    if (exists) {
      updated = products.map((p) => (p.id === prod.id ? prodToSave : p));
      showNotification(`Producto "${prod.name}" actualizado.`);
    } else {
      updated = [prodToSave, ...products];
      showNotification(`Nuevo producto "${prod.name}" registrado en catálogo.`);
    }
    const synced = syncCompositeProductsStock(updated);
    setProducts(synced);
    saveStoredProducts(synced);
    setIsProductFormOpen(false);
  };

  const handleDeleteProduct = (productId: string) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    if (window.confirm(`¿Estás seguro de eliminar el producto "${target.name}"?`)) {
      const updated = products.filter((p) => p.id !== productId);
      setProducts(updated);
      saveStoredProducts(updated);
      showNotification(`Producto "${target.name}" eliminado del catálogo.`);
    }
  };

  const handleQuickUpdatePrice = (productId: string, newPrice: number) => {
    if (currentUser?.role !== 'admin') {
      showNotification('⚠️ Acción restringida: Solo el Administrador puede modificar precios.');
      return;
    }
    const updated = products.map((p) => (p.id === productId ? { ...p, price: newPrice } : p));
    setProducts(updated);
    saveStoredProducts(updated);
  };

  const handleQuickUpdateCost = (productId: string, newCost: number) => {
    if (currentUser?.role !== 'admin') {
      showNotification('⚠️ Acción restringida: Solo el Administrador puede modificar costos.');
      return;
    }
    const updated = products.map((p) => (p.id === productId ? { ...p, cost: newCost } : p));
    setProducts(updated);
    saveStoredProducts(updated);
  };

  const handleQuickAdjustStock = (productId: string, delta: number) => {
    if (currentUser?.role !== 'admin') {
      showNotification('⚠️ Acción restringida: Solo el Administrador puede alterar el stock de inventario.');
      return;
    }
    const inCart = posCartItems
      .filter((i) => i.productId === productId)
      .reduce((sum, i) => sum + i.quantity, 0);
    const inTables = tables
      .filter((t) => t.status !== 'libre')
      .flatMap((t) => t.items)
      .filter((i) => i.productId === productId)
      .reduce((sum, i) => sum + i.quantity, 0);
    const reserved = inCart + inTables;

    const updated = products.map((p) => {
      if (p.id === productId) {
        // Stock disponible actual en pantalla
        const currentAvailable = Math.max(0, p.stock - reserved);
        const newAvailable = Math.max(0, currentAvailable + delta);
        // El stock físico en almacén debe ser el nuevo disponible + las unidades ya en curso
        const newPhysicalStock = newAvailable + reserved;
        return { ...p, stock: newPhysicalStock };
      }
      return p;
    });
    const synced = syncCompositeProductsStock(updated);
    setProducts(synced);
    saveStoredProducts(synced);
  };

  // --- SALES HISTORY & CASH CLOSING ---
  const handleViewSaleTicket = (sale: SaleRecord) => {
    setTicketSaleRecord(sale);
    setTicketTable(null);
    setIsTicketOpen(true);
  };

  const handleConfirmCloseShift = (summary: CashClosingSummary) => {
    setIsCashClosingOpen(false);
    const cajero = summary.cashier || 'Cajero';
    const total = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(summary.totalSales);
    showNotification(`✅ Turno cerrado — ${cajero} · ${total} facturados · ${summary.salesCount} venta(s)`);
  };

  // --- EXPORT TO EXCEL ---
  const handleExportExcel = async (customSales?: SaleRecord[], options?: ExportReportOptions) => {
    try {
      const salesToExport = customSales !== undefined ? customSales : sales;
      await exportLaMoliendaReport(salesToExport, products, tables, options);
      const desc = options?.periodLabel ? ` (${options.periodLabel})` : '';
      showNotification(`Reporte oficial de La Molienda descargado en Excel${desc}.`);
    } catch (err: any) {
      alert(`Error al generar reporte Excel: ${err.message}`);
    }
  };

  // Auth Handlers
  const handleLoginSuccess = (user: SystemUser) => {
    setCurrentUser(user);
    setIsLoginOpen(false);
    setCurrentStaff(user.name);
    saveStoredCurrentStaff(user.name);
    // Si el usuario es mesero y estaba en inventario o caja, devolverlo a mesas
    if (user.role === 'mesero' && (activeSection === 'inventario' || activeSection === 'caja')) {
      setActiveSection('mesas');
    }
    showNotification(`¡Bienvenido, ${user.name}! Sesión iniciada con rol ${user.role.toUpperCase()}.`);
  };

  const handleLogout = () => {
    logoutSession();
    setCurrentUser(null);
    setIsLoginOpen(true);
    showNotification('Sesión cerrada. Hasta pronto.');
  };

  const handleUserUpdated = (updatedUser: SystemUser) => {
    setCurrentUser(updatedUser);
    setCurrentStaff(updatedUser.name);
    saveStoredCurrentStaff(updatedUser.name);
  };

  // Si quien carga es un celular de mesero (o modo ?view=waiter), mostrar directamente el comandero móvil
  if (isMobileClient) {
    return (
      <WaiterView
        initialTables={tables}
        initialProducts={products}
        initialStaffList={staffList}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Multi-logo ambient background canvas across the entire system */}
      <AmbientBackgroundCanvas />

      {/* Header */}
      <Header
        theme={theme}
        onToggleTheme={handleToggleTheme}
        activeSection={activeSection}
        onChangeSection={handleSectionChange}
        onOpenNewTable={() => handleOpenTableModal()}
        onOpenNewProduct={handleOpenNewProduct}
        onExportExcel={handleExportExcel}
        activeTablesCount={stats.activeTablesCount}
        lowStockCount={stats.lowStockAlertCount}
        todaySalesCount={stats.todayOrdersCount}
        currentStaff={currentStaff}
        staffList={staffList}
        onChangeStaff={handleChangeStaff}
        currentUser={currentUser}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        onOpenMobileSync={() => setIsMobileSyncOpen(true)}
        connectedClientsCount={connectedClientsCount}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => {
          playSound('click');
          setIsNotificationsOpen((prev) => !prev);
        }}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="app-main">
        {/* Floating Toast Notification */}
        {notification && (
          <div className="toast-notification">
            <span className="toast-check">✓</span>
            <span>{notification}</span>
          </div>
        )}

        {/* Top KPI Statistics Strip */}
        <StatsCards stats={stats} currentUserRole={currentUser?.role} />

        {/* Section 1: Mesas & Cuentas (Floor map & Live orders) */}
        {activeSection === 'mesas' && (
          <div key="mesas" className={`view-slider-container ${slideDirection === 'right' ? 'slide-from-right' : 'slide-from-left'}`}>
            <TablesView
              tables={tables}
              products={synchronizedProducts}
              onSelectTable={handleSelectTable}
              onOpenTable={(t) => handleOpenTableModal(t)}
              onPreBill={handlePreBill}
              onCheckout={handleCheckoutTable}
              onTransferTable={handleTransferTable}
              onQuickAddItem={(tableId, prodId) => {
                const prod = synchronizedProducts.find((p) => p.id === prodId);
                if (prod) {
                  handleAddItemsToTable(tableId, [
                    {
                      id: `quick-${Date.now()}`,
                      productId: prod.id,
                      productName: prod.name,
                      productImage: prod.image,
                      unitPrice: prod.price,
                      quantity: 1,
                      status: 'pending',
                    },
                  ]);
                }
              }}
              onOpenNewTableForm={handleOpenNewTableForm}
              onEditTableForm={handleEditTableForm}
              onDeleteTable={handleDeleteTable}
              onReserveTable={handleOpenReserveModal}
              onCancelReservation={handleCancelReservation}
              onUpdateTables={handleUpdateAllTables}
              currentUserRole={currentUser?.role}
            />
          </div>
        )}

        {/* Section 2: Punto de Venta (POS) & Menú Visual */}
        {activeSection === 'pos' && (
          <div key="pos" className={`view-slider-container ${slideDirection === 'right' ? 'slide-from-right' : 'slide-from-left'}`}>
            <PosView
              products={synchronizedProducts}
              tables={tables}
              onAddItemsToTable={handleAddItemsToTable}
              onDirectSaleCheckout={handleDirectSaleCheckout}
              onShowNotification={showNotification}
              cartItems={posCartItems}
              setCartItems={setPosCartItems}
              targetTableId={posTargetTableId}
              setTargetTableId={setPosTargetTableId}
              tipPercentage={posTipPercentage}
              setTipPercentage={setPosTipPercentage}
              patronNote={posPatronNote}
              setPatronNote={setPosPatronNote}
              currentUserRole={currentUser?.role}
            />
          </div>
        )}

        {/* Section 3: Gestión de Inventario & Precios (Solo Admin y Cajero) */}
        {activeSection === 'inventario' && currentUser?.role !== 'mesero' && (
          <div key="inventario" className={`view-slider-container ${slideDirection === 'right' ? 'slide-from-right' : 'slide-from-left'}`}>
            <InventoryView
              products={synchronizedProducts}
              sales={sales}
              onOpenNewProduct={handleOpenNewProduct}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProduct}
              onQuickUpdatePrice={handleQuickUpdatePrice}
              onQuickUpdateCost={handleQuickUpdateCost}
              onQuickAdjustStock={handleQuickAdjustStock}
              onShowNotification={showNotification}
              currentUserRole={currentUser?.role}
            />
          </div>
        )}

        {/* Section 4: Caja, Arqueo & Historial de Ventas (Solo Admin y Cajero) */}
        {activeSection === 'caja' && currentUser?.role !== 'mesero' && (
          <div key="caja" className={`view-slider-container ${slideDirection === 'right' ? 'slide-from-right' : 'slide-from-left'}`}>
            <SalesHistoryView
              sales={sales}
              onViewSaleTicket={handleViewSaleTicket}
              onOpenCashClosing={() => setIsCashClosingOpen(true)}
              onOpenCashClosingHistory={() => setIsCashClosingHistoryOpen(true)}
              onExportExcel={handleExportExcel}
            />
          </div>
        )}
      </main>

      {/* System Status & Developer Attribution Footer */}
      <footer className="app-system-footer">
        <div className="footer-content">
          <div className="footer-left">
            <span className="footer-status-indicator" title="Sistema operando normalmente" />
            <span className="footer-app-label">La Molienda POS</span>
            <span className="footer-sep">&bull;</span>
            <span className="footer-version-tag">v1.0.0</span>
          </div>

          <div className="footer-center">
            <span className="footer-dev-attribution">
              Desarrollado por{' '}
              <strong className="footer-dev-highlight">Juan Esteban Riascos Madarriaga</strong>
              <span className="footer-sep-bar">|</span>
              <span className="footer-profession">Ingeniero de Sistemas</span>
            </span>
          </div>

          <div className="footer-right">
            <button
              type="button"
              className="footer-info-btn"
              onClick={() => setIsAboutModalOpen(true)}
              title="Ficha técnica del sistema y autoría de desarrollo"
            >
              <Info size={13} />
              <span>Acerca del Sistema</span>
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}

      {/* 1. Table Order Detail Drawer */}
      <TableDetailModal
        isOpen={isTableDetailOpen}
        table={activeTableDetail}
        products={synchronizedProducts}
        onClose={() => setIsTableDetailOpen(false)}
        onUpdateTable={handleUpdateTable}
        onOpenCheckout={handleCheckoutTable}
        onOpenPreBill={handlePreBill}
        onOpenSplitBill={handleSplitBill}
        onOpenTransfer={handleTransferTable}
        onShowNotification={showNotification}
        currentUserRole={currentUser?.role}
      />

      {/* 2. Checkout / Payment Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        table={paymentTable}
        directItems={directPaymentItems || undefined}
        directPatronName={directPatronName}
        ticketConsecutive={sales.length + 1}
        onClose={() => setIsPaymentOpen(false)}
        onCompletePayment={handleCompletePayment}
      />

      {/* 3. Thermal Receipt / Pre-bill Modal */}
      <TicketModal
        isOpen={isTicketOpen}
        onClose={() => setIsTicketOpen(false)}
        saleRecord={ticketSaleRecord}
        table={ticketTable}
      />

      {/* 4. Product & Price Form Modal */}
      <ProductFormModal
        isOpen={isProductFormOpen}
        onClose={() => setIsProductFormOpen(false)}
        onSave={handleSaveProduct}
        initialData={editingProduct}
        availableProducts={products}
      />

      {/* 5. Open Table Modal */}
      <OpenTableModal
        isOpen={isOpenTableModalOpen}
        tables={tables}
        preSelectedTable={preSelectedOpenTable}
        staffList={staffList}
        currentStaff={currentStaff}
        onClose={() => setIsOpenTableModalOpen(false)}
        onConfirmOpen={handleConfirmOpenTable}
      />

      {/* 6. Split Bill Modal */}
      <SplitBillModal
        isOpen={isSplitBillOpen}
        table={splitBillTable}
        ticketConsecutive={sales.length + 1}
        onClose={() => setIsSplitBillOpen(false)}
        onShowNotification={showNotification}
        onCompletePartialPayment={handleCompletePartialPayment}
      />

      {/* 7. Table Transfer Modal */}
      <TableTransferModal
        isOpen={isTransferModalOpen}
        originTable={transferOriginTable}
        tables={tables}
        onClose={() => setIsTransferModalOpen(false)}
        onConfirmTransfer={handleConfirmTransfer}
      />

      {/* 8. Cash Register Closing Modal */}
      <CashClosingModal
        isOpen={isCashClosingOpen}
        sales={sales}
        tables={tables}
        currentStaff={currentStaff}
        onClose={() => setIsCashClosingOpen(false)}
        onConfirmCloseShift={handleConfirmCloseShift}
      />

      {/* 8b. Cash Closing History Modal */}
      <CashClosingHistoryModal
        isOpen={isCashClosingHistoryOpen}
        onClose={() => setIsCashClosingHistoryOpen(false)}
      />

      {/* 9. Table / Bar Add & Edit Modal */}
      <TableFormModal
        isOpen={isTableFormOpen}
        table={editingTable}
        existingTables={tables}
        onClose={() => {
          setIsTableFormOpen(false);
          setEditingTable(null);
        }}
        onSave={handleSaveTableForm}
      />

      {/* 9.1. Table Reservation Modal */}
      <ReserveTableModal
        isOpen={isReserveModalOpen}
        tables={tables}
        preSelectedTable={preSelectedReserveTable}
        onClose={() => setIsReserveModalOpen(false)}
        onConfirmReserve={handleConfirmReserveTable}
        onCancelReservation={(t) => {
          if (handleCancelReservation(t, 'group')) setIsReserveModalOpen(false);
        }}
      />

      {/* 10. Authentication & Shift Login Screen */}
      <LoginModal
        isOpen={isLoginOpen}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* 11. Admin User & Permissions Management Modal */}
      {currentUser && (
        <UserManagementModal
          isOpen={isUserManagementOpen}
          onClose={() => setIsUserManagementOpen(false)}
          currentUser={currentUser}
          onUserUpdated={handleUserUpdated}
          onUsersChanged={(updated) => {
            setSystemUsers(updated);
            const activeStaff = updated.filter((u) => u.active).map((u) => u.name);
            if (activeStaff.length > 0) {
              setStaffList(activeStaff);
              saveStoredStaffList(activeStaff);
            }
          }}
        />
      )}

      {/* 12. About System & Developer Credits Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* 13. Exit Confirmation Modal */}
      <ExitConfirmModal
        isOpen={isExitConfirmOpen}
        onCancel={() => setIsExitConfirmOpen(false)}
        onConfirm={handleConfirmExit}
      />

      {/* 14. Mobile Sync (Meseros Wi-Fi) Modal */}
      <MobileSyncModal
        isOpen={isMobileSyncOpen}
        onClose={() => setIsMobileSyncOpen(false)}
      />

      {/* 15. Centro y Drawer de Notificaciones */}
      <NotificationsPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onClearAll={handleClearAllNotifications}
        onDeleteNotification={handleDeleteNotification}
        onSelectTable={handleSelectTableFromNotification}
      />
    </div>
  );
};

export default App;
