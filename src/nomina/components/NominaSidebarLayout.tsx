import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  Building2,
  Zap,
  Sparkles,
  BarChart3,
  Sun,
  Moon,
  ShieldCheck,
  LogOut,
  Cloud,
} from 'lucide-react';
import laMoliendaLogo from '../../assets/la_molienda_logo.png';

export type NavSection =
  | 'nomina'
  | 'empleados'
  | 'arriendo'
  | 'servicios_publicos'
  | 'aseo_dotacion'
  | 'reportes';

interface NominaSidebarLayoutProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeSection: NavSection;
  onChangeSection: (section: NavSection) => void;
  pendingPayrollCount: number;
  pendingRentCount: number;
  pendingServicesCount?: number;
  pendingSuppliesCount?: number;
  children: React.ReactNode;
  onLogout?: () => void;
  onOpenFirebaseSync?: () => void;
  firebaseStatus?: string;
}

export const NominaSidebarLayout: React.FC<NominaSidebarLayoutProps> = ({
  theme,
  onToggleTheme,
  activeSection,
  onChangeSection,
  pendingPayrollCount,
  pendingRentCount,
  pendingServicesCount = 0,
  pendingSuppliesCount = 0,
  children,
  onLogout,
  onOpenFirebaseSync,
  firebaseStatus = 'connected',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('collapsed') === '1') return false;
    return localStorage.getItem('lamolienda_admin_sidebar_expanded') !== 'false';
  });

  const handleToggleExpand = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    localStorage.setItem('lamolienda_admin_sidebar_expanded', String(next));
  };

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'nomina':
        return {
          title: 'Control y Pago de Nómina',
          subtitle: 'Liquidación de salarios, turnos, bonos y deducciones al personal',
        };
      case 'empleados':
        return {
          title: 'Gestión de Colaboradores',
          subtitle: 'Ficha de empleados, tarifas salariales y cuentas bancarias',
        };
      case 'arriendo':
        return {
          title: 'Gestión y Pago de Arriendo',
          subtitle: 'Seguimiento al canon de arrendamiento y obligaciones mensuales',
        };
      case 'servicios_publicos':
        return {
          title: 'Servicios Públicos (Esenciales)',
          subtitle: 'Control y pago de energía eléctrica, agua, gas y telecomunicaciones',
        };
      case 'aseo_dotacion':
        return {
          title: 'Insumos de Aseo & Dotación',
          subtitle: 'Control de químicos para cafetera, papel institucional, bolsas y dotación operativa',
        };
      case 'reportes':
        return {
          title: 'Resumen Financiero y Gastos Fijos',
          subtitle: 'Consolidado global de egresos operativos (Nómina, Arriendo, Servicios y Aseo)',
        };
      default:
        return { title: 'La Molienda', subtitle: 'Administración Independiente' };
    }
  };

  const currentInfo = getSectionTitle();

  return (
    <div className={`pos-sidebar-shell ${isExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      {/* ================= BARRA LATERAL ================= */}
      <aside className="pos-sidebar-aside">
        {/* Bloque Superior: Marca y Toggle al hacer click en el logo */}
        <div className="sidebar-brand-box">
          <div
            className="sidebar-brand-clickable"
            onClick={handleToggleExpand}
            title={isExpanded ? 'Colapsar barra lateral' : 'Expandir barra lateral'}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggleExpand();
              }
            }}
          >
            <div className="sidebar-logo-frame">
              <img src={laMoliendaLogo} alt="La Molienda" className="sidebar-logo-img" />
            </div>
            <div className="sidebar-brand-text sidebar-collapsible-text">
              <span className="brand-name">La Molienda</span>
              <span className="brand-sub">Nómina & Arriendo</span>
            </div>
          </div>
        </div>

        {/* Navegación Principal */}
        <nav className="sidebar-nav-list" role="tablist">
          {/* 1. Nómina y Turnos */}
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'nomina'}
            className={`sidebar-nav-item ${activeSection === 'nomina' ? 'active' : ''}`}
            onClick={() => onChangeSection('nomina')}
            title="Nómina y Turnos"
          >
            <div className="nav-item-icon">
              <Users size={24} />
            </div>
            <span className="nav-item-label sidebar-collapsible-text">Nómina y Turnos</span>
            {pendingPayrollCount > 0 && (
              <span className="sidebar-badge active-tables">{pendingPayrollCount}</span>
            )}
          </button>

          {/* 2. Colaboradores */}
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'empleados'}
            className={`sidebar-nav-item ${activeSection === 'empleados' ? 'active' : ''}`}
            onClick={() => onChangeSection('empleados')}
            title="Colaboradores (Equipo)"
          >
            <div className="nav-item-icon">
              <UserCheck size={24} />
            </div>
            <span className="nav-item-label sidebar-collapsible-text">Colaboradores</span>
          </button>

          {/* 3. Control de Arriendo */}
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'arriendo'}
            className={`sidebar-nav-item ${activeSection === 'arriendo' ? 'active' : ''}`}
            onClick={() => onChangeSection('arriendo')}
            title="Control de Arriendo"
          >
            <div className="nav-item-icon">
              <Building2 size={24} />
            </div>
            <span className="nav-item-label sidebar-collapsible-text">Control de Arriendo</span>
            {pendingRentCount > 0 && (
              <span className="sidebar-badge alert-stock">{pendingRentCount}</span>
            )}
          </button>

          {/* 4. Servicios Públicos */}
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'servicios_publicos'}
            className={`sidebar-nav-item ${activeSection === 'servicios_publicos' ? 'active' : ''}`}
            onClick={() => onChangeSection('servicios_publicos')}
            title="Servicios Públicos (Esenciales)"
          >
            <div className="nav-item-icon">
              <Zap size={24} />
            </div>
            <span className="nav-item-label sidebar-collapsible-text">Servicios Públicos</span>
            {pendingServicesCount > 0 && (
              <span className="sidebar-badge alert-stock">{pendingServicesCount}</span>
            )}
          </button>

          {/* 5. Aseo & Dotación */}
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'aseo_dotacion'}
            className={`sidebar-nav-item ${activeSection === 'aseo_dotacion' ? 'active' : ''}`}
            onClick={() => onChangeSection('aseo_dotacion')}
            title="Insumos de Aseo & Dotación"
          >
            <div className="nav-item-icon">
              <Sparkles size={24} />
            </div>
            <span className="nav-item-label sidebar-collapsible-text">Aseo & Dotación</span>
            {pendingSuppliesCount > 0 && (
              <span className="sidebar-badge alert-stock">{pendingSuppliesCount}</span>
            )}
          </button>

          {/* 6. Resumen y Gastos */}
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'reportes'}
            className={`sidebar-nav-item ${activeSection === 'reportes' ? 'active' : ''}`}
            onClick={() => onChangeSection('reportes')}
            title="Resumen & Gastos"
          >
            <div className="nav-item-icon">
              <BarChart3 size={24} />
            </div>
            <span className="nav-item-label sidebar-collapsible-text">Resumen & Gastos</span>
          </button>
        </nav>

        {/* Bloque Inferior: Tema y Cierre de Sesión */}
        <div className="sidebar-footer-box">
          {/* Botón de Cambio de Tema */}
          <button
            type="button"
            className="sidebar-footer-item"
            onClick={onToggleTheme}
            title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
          >
            <div className="footer-item-icon">
              {theme === 'dark' ? (
                <Sun size={22} style={{ color: '#f59e0b' }} />
              ) : (
                <Moon size={22} style={{ color: '#64748b' }} />
              )}
            </div>
            <div className="footer-item-texts sidebar-collapsible-text">
              <span className="footer-item-title">
                {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
              </span>
              <span className="footer-item-sub">Apariencia visual</span>
            </div>
          </button>

          {/* Botón de Cerrar Sesión */}
          {onLogout && (
            <button
              type="button"
              className="sidebar-footer-item"
              onClick={onLogout}
              title="Cerrar Sesión del Administrador"
            >
              <div className="footer-item-icon">
                <LogOut size={22} style={{ color: '#ef4444' }} />
              </div>
              <div className="footer-item-texts sidebar-collapsible-text">
                <span className="footer-item-title" style={{ color: '#ef4444' }}>
                  Cerrar Sesión
                </span>
                <span className="footer-item-sub">Salir del sistema</span>
              </div>
            </button>
          )}
        </div>
      </aside>

      {/* ================= CONTENEDOR DERECHO ================= */}
      <div className="pos-main-wrapper">
        {/* Header Superior Minimalista (58px) */}
        <header className="pos-top-bar">
          <div className="pos-top-bar-inner">
            <div className="top-bar-left">
              <div className="breadcrumb-box">
                <span className="breadcrumb-section">{currentInfo.title}</span>
                <span className="breadcrumb-sep">•</span>
                <span className="breadcrumb-sub">{currentInfo.subtitle}</span>
              </div>
            </div>

            <div className="top-bar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Indicador de Base de Datos / Nube Activa */}
              <div
                className={`top-micro-cloud status-${firebaseStatus}`}
                title={`Base de Datos en la Nube (${firebaseStatus === 'connected' ? 'la-molienda-pos' : 'Firebase'}): ${
                  firebaseStatus === 'connected'
                    ? 'Conectado y sincronizado en tiempo real'
                    : firebaseStatus === 'syncing'
                    ? 'Sincronizando datos...'
                    : 'Modo Local (Offline)'
                }`}
              >
                <Cloud size={14} className="micro-cloud-icon" />
                <span className="micro-text">
                  {firebaseStatus === 'connected'
                    ? 'Nube Activa'
                    : firebaseStatus === 'syncing'
                    ? 'Sincronizando...'
                    : 'Modo Local'}
                </span>
                <span
                  className={`micro-dot ${
                    firebaseStatus === 'connected'
                      ? 'dot-connected'
                      : firebaseStatus === 'syncing'
                      ? 'dot-syncing'
                      : 'dot-disconnected'
                  }`}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Contenido Dinámico de la Pantalla */}
        <div className="pos-content-scrollable">
          <div style={{ maxWidth: '1600px', margin: '0 auto', width: '100%', padding: '0.5rem 0' }}>
            {children}
          </div>
        </div>

        {/* Pie de Página Institucional */}
        <footer className="app-system-footer">
          <div className="footer-content">
            <div className="footer-left">
              <span className="footer-status-indicator" title="Sistema operando normalmente" />
              <span className="footer-app-label">La Molienda Nómina & Arriendo</span>
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
              <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
                Módulo Integrado
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export const SidebarLayout = NominaSidebarLayout;
