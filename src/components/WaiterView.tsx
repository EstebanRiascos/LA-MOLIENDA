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
} from 'lucide-react';
import { Product, Table, TableZone, OrderItem, ProductCategory } from '../types';
import { CATEGORIES, DEFAULT_TABLES, DEFAULT_PRODUCTS } from '../utils/defaults';
import { formatCurrency, getStoredTables, getStoredProducts, getStoredTheme, saveStoredTheme } from '../utils/storage';
import { playSound } from '../utils/sounds';
import laMoliendaLogo from '../assets/la_molienda_logo.png';
import { OpenTableModal } from './OpenTableModal';
import { TicketModal } from './TicketModal';

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
  initialStaffList = ['Administrador', 'Mesero 1', 'Mesero 2'],
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
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeZone, setActiveZone] = useState<TableZone>('salon');

  // Mesero activo
  const [currentWaiter, setCurrentWaiter] = useState<string>(() => {
    return localStorage.getItem('lamolienda_waiter_name') || 'Mesero 1';
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
  const [isOpenTableModalOpen, setIsOpenTableModalOpen] = useState(false);
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

  // Garantizar que la vista móvil del mesero nunca herede el bloqueo de scroll
  useEffect(() => {
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
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
          setIsConnected(true);
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
          } catch (err) {
            console.error('Error parseando state-update SSE:', err);
          }
        });

        eventSource.addEventListener('new-order-broadcast', () => {
          playSound('click');
        });

        eventSource.onerror = () => {
          if (!isMounted) return;
          setIsConnected(false);
          // Si la conexión se cayó (p. ej. pantalla bloqueada o reinicio de dev server), programar reintento
          if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              if (isMounted) connectSSE();
            }, 3000);
          }
        };
      } catch (err) {
        setIsConnected(false);
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

  // Actualizar mesero activo en localStorage
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
    if (!selectedTable) return;
    if (newOrderItems.length === 0) {
      alert('Selecciona al menos un producto para enviar la comanda.');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`${apiBase}/api/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          tableId: selectedTable.id,
          tableName: selectedTable.number,
          waiter: currentWaiter,
          items: newOrderItems,
          timestamp: new Date().toISOString(),
        }),
      });

      const resData = await response.json();
      if (resData.success) {
        playSound('dispatch');
        setOrderSuccessMsg(`✅ Comanda enviada exitosamente a la barra para ${selectedTable.number}`);
        setNewOrderItems([]);

        // Limpiar mensaje tras 3.5 segundos
        setTimeout(() => {
          setOrderSuccessMsg(null);
        }, 3500);
      } else {
        alert(`Error al enviar comanda: ${resData.error || 'Error desconocido'}`);
      }
    } catch (err: any) {
      console.error('Error enviando comanda:', err);
      alert('No se pudo conectar con el computador de caja. Verifica la conexión Wi-Fi.');
    } finally {
      setIsSending(false);
    }
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
          waiter: currentWaiter,
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
    try {
      await fetch(`${apiBase}/api/table/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          waiter,
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
            waiter,
            capacity: pax,
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
        capacity: pax,
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

          {/* Conexión Wi-Fi */}
          <button
            type="button"
            className={`mobile-conn-badge ${isConnected ? 'online' : 'offline'}`}
            title={isConnected ? 'Conectado a la caja en tiempo real' : 'Toca para reconectar con la caja'}
            onClick={() => {
              playSound('click');
              setReconnectCounter((c) => c + 1);
            }}
            aria-label={isConnected ? 'En Línea' : 'Desconectado'}
          >
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="mobile-conn-text">{isConnected ? 'En Línea' : 'Desconectado'}</span>
          </button>

          {/* Selector de Mesero */}
          <div className="mobile-waiter-selector-wrap">
            <User size={13} className="waiter-icon" />
            <select
              value={currentWaiter}
              onChange={(e) => handleWaiterChange(e.target.value)}
              className="mobile-waiter-select"
            >
              {staffList.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {!selectedTable ? (
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
                <strong className="mobile-footer-engineer">Ing. Juan Esteban Riascos Madarriaga</strong>
              </p>
              <span className="mobile-footer-subtitle">Ingeniero de Sistemas &bull; La Molienda Coffee POS</span>
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
        currentStaff={currentWaiter}
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
    </div>
  );
};
