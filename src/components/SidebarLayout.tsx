import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutGrid,
  ShoppingBag,
  Package,
  Receipt,
  Sun,
  Moon,
  ShieldCheck,
  UserCheck,
  Users,
  LogOut,
  Smartphone,
  Bell,
  Cloud,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2,
} from 'lucide-react';
import laMoliendaLogo from '../assets/la_molienda_logo.png';
import { isSoundEnabled, setSoundEnabled } from '../utils/sounds';
import { SystemUser } from '../types';
import { FirebaseSyncStatus } from '../utils/firebaseSync';

export type ActiveSection = 'mesas' | 'pos' | 'inventario' | 'caja';

interface SidebarLayoutProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeSection: ActiveSection;
  onChangeSection: (section: ActiveSection) => void;
  activeTablesCount: number;
  lowStockCount: number;
  todaySalesCount: number;
  currentStaff: string;
  staffList: string[];
  onChangeStaff: (staff: string) => void;
  currentUser?: SystemUser | null;
  onOpenUserManagement?: () => void;
  onOpenMobileSync?: () => void;
  connectedClientsCount?: number;
  isServiceOpen?: boolean;
  onToggleServiceLock?: () => void;
  onOpenFirebaseSync?: () => void;
  firebaseStatus?: FirebaseSyncStatus;
  firebaseProjectId?: string | null;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  onLogout?: () => void;
  children: React.ReactNode;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  theme,
  onToggleTheme,
  activeSection,
  onChangeSection,
  activeTablesCount,
  lowStockCount,
  todaySalesCount,
  currentStaff,
  currentUser,
  onOpenUserManagement,
  onOpenMobileSync,
  connectedClientsCount = 0,
  isServiceOpen = true,
  onToggleServiceLock,
  onOpenFirebaseSync,
  firebaseStatus = 'unconfigured',
  firebaseProjectId = null,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onLogout,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    return localStorage.getItem('lamolienda_sidebar_expanded') === 'true';
  });

  const handleToggleExpand = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    localStorage.setItem('lamolienda_sidebar_expanded', String(next));
  };

  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
  };

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userCardRef = useRef<HTMLDivElement>(null);

  // Cerrar menú de usuario al hacer clic fuera
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userCardRef.current && !userCardRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  // Al hacer clic en el botón de usuario: Si el sidebar está colapsado, expandirlo obligatoriamente
  const handleUserCardClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      localStorage.setItem('lamolienda_sidebar_expanded', 'true');
      setIsUserMenuOpen(true);
    } else {
      setIsUserMenuOpen((prev) => !prev);
    }
  };

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'mesas':
        return { title: 'Mesas & Cuentas', subtitle: 'Salón Principal y Barras' };
      case 'pos':
        return { title: 'Punto de Venta (POS)', subtitle: 'Toma rápida de comandas' };
      case 'inventario':
        return { title: 'Inventario & Precios', subtitle: 'Control de existencias y costos' };
      case 'caja':
        return { title: 'Caja & Ventas', subtitle: 'Historial, arqueo y cierre de turnos' };
      default:
        return { title: 'La Molienda', subtitle: 'Sistema POS' };
    }
  };

  const currentInfo = getSectionTitle();

  return (
    <div className={`pos-sidebar-shell ${isExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      {/* ================= SIDEBAR LATERAL ================= */}
      <aside className="pos-sidebar-aside">
        {/* Bloque Superior: Marca y Toggle */}
        <div className="sidebar-brand-box">
          <div
            className="sidebar-brand-clickable"
            onClick={() => onChangeSection('mesas')}
            title="Ir a Mesas"
          >
            <div className="sidebar-logo-frame">
              <img src={laMoliendaLogo} alt="La Molienda" className="sidebar-logo-img" />
            </div>
            <div className="sidebar-brand-text sidebar-collapsible-text">
              <span className="brand-name">La Molienda</span>
              <span className="brand-sub">Café & Bar</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={handleToggleExpand}
            title={isExpanded ? 'Colapsar barra lateral' : 'Expandir barra lateral'}
          >
            <ChevronRight
              size={16}
              className={`sidebar-toggle-icon ${isExpanded ? 'expanded' : ''}`}
            />
          </button>
        </div>

        {/* Navegación Principal */}
        <nav className="sidebar-nav-list" role="tablist">
          {/* 1. Mesas & Cuentas */}
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'mesas'}
            className={`sidebar-nav-item ${activeSection === 'mesas' ? 'active' : ''}`}
            onClick={() => onChangeSection('mesas')}
            title="Mesas & Cuentas"
          >
            <div className="nav-item-icon">
              <LayoutGrid size={20} />
            </div>
            <span className="nav-item-label sidebar-collapsible-text">Mesas & Cuentas</span>
            {activeTablesCount > 0 && (
              <span className="sidebar-badge active-tables">{activeTablesCount}</span>
            )}
          </button>

          {/* 2. Punto de Venta */}
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'pos'}
            className={`sidebar-nav-item ${activeSection === 'pos' ? 'active' : ''}`}
            onClick={() => onChangeSection('pos')}
            title="Punto de Venta (POS)"
          >
            <div className="nav-item-icon">
              <ShoppingBag size={20} />
            </div>
            <span className="nav-item-label sidebar-collapsible-text">Punto de Venta</span>
          </button>

          {/* 3. Inventario (Oculto para meseros) */}
          {currentUser?.role !== 'mesero' && (
            <button
              type="button"
              role="tab"
              aria-selected={activeSection === 'inventario'}
              className={`sidebar-nav-item ${activeSection === 'inventario' ? 'active' : ''}`}
              onClick={() => onChangeSection('inventario')}
              title="Inventario & Precios"
            >
              <div className="nav-item-icon">
                <Package size={20} />
              </div>
              <span className="nav-item-label sidebar-collapsible-text">Inventario</span>
              {lowStockCount > 0 && (
                <span className="sidebar-badge alert-stock">{lowStockCount}</span>
              )}
            </button>
          )}

          {/* 4. Caja & Ventas (Oculto para meseros) */}
          {currentUser?.role !== 'mesero' && (
            <button
              type="button"
              role="tab"
              aria-selected={activeSection === 'caja'}
              className={`sidebar-nav-item ${activeSection === 'caja' ? 'active' : ''}`}
              onClick={() => onChangeSection('caja')}
              title="Caja & Ventas"
            >
              <div className="nav-item-icon">
                <Receipt size={20} />
              </div>
              <span className="nav-item-label sidebar-collapsible-text">Caja & Ventas</span>
              {todaySalesCount > 0 && (
                <span className="sidebar-badge secondary-sales">{todaySalesCount}</span>
              )}
            </button>
          )}
        </nav>

        {/* Bloque Inferior: Comandero + Nube + Usuario */}
        <div className="sidebar-footer-box">
          {/* Botón Bloqueo de Comandas Móviles */}
          {currentUser?.role === 'admin' && onToggleServiceLock && (
            <button
              type="button"
              className={`sidebar-footer-item lock-btn ${isServiceOpen ? 'service-open' : 'service-closed'
                }`}
              onClick={onToggleServiceLock}
              title={
                isServiceOpen
                  ? 'Comandero Activo (Clic para Bloquear)'
                  : 'Comandero BLOQUEADO (Clic para Abrir)'
              }
            >
              <div className="footer-item-icon">
                {isServiceOpen ? <Unlock size={17} /> : <Lock size={17} />}
              </div>
              <div className="footer-item-texts sidebar-collapsible-text">
                <span className="footer-item-title">
                  {isServiceOpen ? 'Comandas ON' : 'Comandas OFF'}
                </span>
                <span className="footer-item-sub">
                  {isServiceOpen ? 'Servicio activo' : 'Suspendido'}
                </span>
              </div>
            </button>
          )}

          {/* Tarjeta de Usuario / Perfil */}
          <div className="sidebar-user-card" ref={userCardRef}>
            <div
              className={`sidebar-user-header ${isUserMenuOpen ? 'menu-open' : ''}`}
              onClick={handleUserCardClick}
              title={`Sesión activa: ${currentUser?.name || currentStaff}`}
            >
              <div className={`sidebar-avatar role-${currentUser?.role || 'admin'}`}>
                {currentUser?.role === 'admin' ? (
                  <ShieldCheck size={17} strokeWidth={2.3} />
                ) : (
                  <UserCheck size={17} strokeWidth={2.3} />
                )}
              </div>
              <div className="sidebar-user-info sidebar-collapsible-text">
                <span className="user-name">{currentUser?.name || currentStaff}</span>
                <div className="user-role-row">
                  <span className={`user-role-pill role-${currentUser?.role || 'admin'}`}>
                    {currentUser?.role === 'admin'
                      ? 'ADMINISTRADOR'
                      : currentUser?.role === 'cajero'
                        ? 'CAJERO'
                        : currentUser?.role === 'mesero'
                          ? 'MESERO'
                          : 'TURNO ACTIVO'}
                  </span>
                </div>
              </div>
              <ChevronDown
                size={14}
                className={`user-chevron sidebar-collapsible-text ${isUserMenuOpen ? 'chevron-rotated' : ''}`}
              />
            </div>

            {/* Menú flotante / Desplegable de usuario */}
            {isUserMenuOpen && (
              <div className="sidebar-user-dropdown">
                {currentUser?.role === 'admin' && onOpenUserManagement && (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenUserManagement();
                    }}
                  >
                    <Users size={14} />
                    <span>Gestión de Usuarios</span>
                  </button>
                )}
                {currentUser?.role === 'admin' && onOpenMobileSync && (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenMobileSync();
                    }}
                  >
                    <Smartphone size={14} />
                    <span>App Meseros (APK / WhatsApp)</span>
                  </button>
                )}
                {onLogout && (
                  <button
                    type="button"
                    className="dropdown-item logout"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                  >
                    <LogOut size={14} />
                    <span>Cerrar Sesión</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ================= CONTENEDOR DERECHO ================= */}
      <div className="pos-main-wrapper">
        {/* Header Superior Minimalista (Solo 58px) */}
        <header className="pos-top-bar">
          <div className="pos-top-bar-inner">
            <div className="top-bar-left">
              <div className="breadcrumb-box">
                <span className="breadcrumb-section">{currentInfo.title}</span>
                <span className="breadcrumb-sep">•</span>
                <span className="breadcrumb-sub">{currentInfo.subtitle}</span>
              </div>
            </div>

            <div className="top-bar-right">
              {/* Micro-indicador de Firebase */}
              <button
                type="button"
                className={`top-micro-cloud status-${firebaseStatus}`}
                onClick={onOpenFirebaseSync}
                title={`Base de Datos en la Nube (${firebaseProjectId || 'Firebase'}): ${firebaseStatus === 'connected'
                  ? 'Sincronizado en tiempo real'
                  : firebaseStatus === 'syncing'
                    ? 'Sincronizando...'
                    : 'Desconectado'
                  }`}
              >
                <Cloud size={14} className="micro-cloud-icon" />
                <span className="micro-text">Nube OK</span>
                <span className={`micro-dot dot-${firebaseStatus}`} />
              </button>

              {/* Notificaciones */}
              {onOpenNotifications && (
                <button
                  type="button"
                  className={`top-icon-btn notifications-btn ${unreadNotificationsCount > 0 ? 'has-unread' : ''
                    }`}
                  onClick={onOpenNotifications}
                  title={`Notificaciones (${unreadNotificationsCount} sin leer)`}
                >
                  <Bell size={19} />
                  {unreadNotificationsCount > 0 && (
                    <span className="notifications-badge">
                      {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                    </span>
                  )}
                </button>
              )}

              {/* Sonido */}
              <button
                type="button"
                className="top-icon-btn"
                onClick={handleToggleSound}
                title={soundOn ? 'Silenciar sonidos' : 'Activar sonidos'}
              >
                {soundOn ? <Volume2 size={19} /> : <VolumeX size={19} />}
              </button>

              {/* Tema */}
              <button
                type="button"
                className="top-icon-btn"
                onClick={onToggleTheme}
                title={`Modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
              >
                {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
              </button>

              {/* Salida Rápida */}
              {onLogout && (
                <button
                  type="button"
                  className="top-icon-btn logout-quick-btn"
                  onClick={onLogout}
                  title="Cerrar Sesión"
                >
                  <LogOut size={18} />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Contenido Dinámico de la Pantalla */}
        <div className="pos-content-scrollable">{children}</div>
      </div>
    </div>
  );
};

