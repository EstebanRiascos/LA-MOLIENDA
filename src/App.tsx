import React, { useState, useEffect, useMemo } from 'react';
import { Product, Table, TableZone, SaleRecord, OrderItem, SystemStats, SystemUser } from './types';
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
} from './utils/storage';
import {
  getStoredSessionUser,
  logoutSession,
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
import { TableFormModal } from './components/TableFormModal';
import { ReserveTableModal } from './components/ReserveTableModal';
import { LoginModal } from './components/LoginModal';
import { UserManagementModal } from './components/UserManagementModal';
import { AboutModal } from './components/AboutModal';
import { ExitConfirmModal } from './components/ExitConfirmModal';
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

  // Core data states
  const [products, setProducts] = useState<Product[]>(() => getStoredProducts());
  const [tables, setTables] = useState<Table[]>(() => getStoredTables());
  const [sales, setSales] = useState<SaleRecord[]>(() => getStoredSales());

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
    return !getStoredSessionUser();
  });
  const [isUserManagementOpen, setIsUserManagementOpen] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('modal') === 'users';
  });

  // Staff state
  const [currentStaff, setCurrentStaff] = useState<string>(() => {
    const session = getStoredSessionUser();
    return session ? session.name : getStoredCurrentStaff();
  });
  const [staffList] = useState<string[]>(() => getStoredStaffList());

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
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('modal') === 'about';
  });

  // Table management states
  const [isTableFormOpen, setIsTableFormOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  // Lock background scrolling when any modal is open
  const isAnyModalOpen = Boolean(
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
    isAboutModalOpen
  );

  useEffect(() => {
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
  }, [isAnyModalOpen]);

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

  const showNotification = (msg: string) => {
    playSound(soundForNotification(msg));
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 3800);
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

  const handleConfirmReserveTable = (
    tableId: string,
    reservationData: {
      name: string;
      phone?: string;
      date: string;
      time: string;
      pax: number;
      notes?: string;
    }
  ) => {
    const updated = tables.map((t) =>
      t.id === tableId
        ? {
            ...t,
            status: 'reservada' as const,
            reservationName: reservationData.name,
            reservationPhone: reservationData.phone,
            reservationDate: reservationData.date,
            reservationTime: reservationData.time,
            reservationPax: reservationData.pax,
            reservationNotes: reservationData.notes,
          }
        : t
    );
    setTables(updated);
    saveStoredTables(updated);
    setIsReserveModalOpen(false);

    const target = updated.find((t) => t.id === tableId);
    showNotification(`Mesa ${target?.number} reservada para ${reservationData.name}.`);
  };

  const handleCancelReservation = (table: Table) => {
    const confirmed = window.confirm(
      `¿Deseas cancelar la reserva de "${table.number}" para ${table.reservationName || 'el cliente'} y dejarla libre?`
    );
    if (!confirmed) return;

    const updated = tables.map((t) =>
      t.id === table.id
        ? {
            ...t,
            status: 'libre' as const,
            reservationName: undefined,
            reservationPhone: undefined,
            reservationDate: undefined,
            reservationTime: undefined,
            reservationPax: undefined,
            reservationNotes: undefined,
          }
        : t
    );
    setTables(updated);
    saveStoredTables(updated);
    showNotification(`Reserva de ${table.number} cancelada. Mesa libre.`);
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
            capacity: pax,
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

    // 2. Deduct inventory stock for sold items
    const updatedProducts = products.map((prod) => {
      const soldItem = saleRecord.items.find((i) => i.productId === prod.id);
      if (soldItem) {
        const newStock = Math.max(0, prod.stock - soldItem.quantity);
        return { ...prod, stock: newStock };
      }
      return prod;
    });
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
    setProducts(updated);
    saveStoredProducts(updated);
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
    setProducts(updated);
    saveStoredProducts(updated);
  };

  // --- SALES HISTORY & CASH CLOSING ---
  const handleViewSaleTicket = (sale: SaleRecord) => {
    setTicketSaleRecord(sale);
    setTicketTable(null);
    setIsTicketOpen(true);
  };

  const handleConfirmCloseShift = (summaryNote: string) => {
    setIsCashClosingOpen(false);
    showNotification('Arqueo de caja y cierre de turno registrados con éxito.');
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
        onClose={() => setIsSplitBillOpen(false)}
        onShowNotification={showNotification}
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
        currentStaff={currentStaff}
        onClose={() => setIsCashClosingOpen(false)}
        onConfirmCloseShift={handleConfirmCloseShift}
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
    </div>
  );
};

export default App;
