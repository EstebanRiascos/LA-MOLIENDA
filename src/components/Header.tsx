import React from 'react';
import {
  Coffee,
  LayoutGrid,
  ShoppingBag,
  Package,
  Receipt,
  FileSpreadsheet,
  Sun,
  Moon,
  UserCheck,
  ShieldCheck,
  LogOut,
  Users,
} from 'lucide-react';
import laMoliendaLogo from '../assets/la_molienda_logo.png';
import { SystemUser } from '../types';

export type ActiveSection = 'mesas' | 'pos' | 'inventario' | 'caja';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeSection: ActiveSection;
  onChangeSection: (section: ActiveSection) => void;
  onOpenNewTable?: () => void;
  onOpenNewProduct?: () => void;
  onExportExcel: () => void;
  activeTablesCount: number;
  lowStockCount: number;
  todaySalesCount: number;
  currentStaff: string;
  staffList: string[];
  onChangeStaff: (staff: string) => void;
  currentUser?: SystemUser | null;
  onOpenUserManagement?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  activeSection,
  onChangeSection,
  onOpenNewTable,
  onOpenNewProduct,
  onExportExcel,
  activeTablesCount,
  lowStockCount,
  todaySalesCount,
  currentStaff,
  staffList,
  onChangeStaff,
  currentUser,
  onOpenUserManagement,
  onLogout,
}) => {
  const pillRefs = React.useRef<{ [key in ActiveSection]?: HTMLButtonElement | null }>({});
  const [sliderStyle, setSliderStyle] = React.useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  React.useEffect(() => {
    const updateSlider = () => {
      const activeEl = pillRefs.current[activeSection];
      if (activeEl) {
        setSliderStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          ready: true,
        });
      }
    };

    updateSlider();
    const timer = setTimeout(updateSlider, 40);
    window.addEventListener('resize', updateSlider);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSlider);
    };
  }, [activeSection, activeTablesCount, lowStockCount, todaySalesCount]);

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Brand Section */}
        <div className="brand-section" onClick={() => onChangeSection('mesas')} style={{ cursor: 'pointer' }} title="Ir a Mesas & Cuentas">
          <div className="brand-badge-icon brand-badge-logo" title="La Molienda Café Bar">
            <img src={laMoliendaLogo} alt="La Molienda" className="brand-logo-img" />
          </div>
          <div className="brand-text-col">
            <div className="brand-title">
              <span className="brand-title-text">La Molienda</span>
              <span className="brand-tag-pill">Café & Bar</span>
            </div>
            <span
              className="brand-tagline"
              title="Sistema desarrollado por Juan Esteban Riascos Madarriaga — Ingeniero de Sistemas"
            >
              Sistema POS
            </span>
          </div>
        </div>

        {/* Section Navigation Pills (Segmented Switch with Sliding Indicator) */}
        <div className="header-nav-pills" role="tablist" aria-label="Espacios del sistema">
          {/* Sliding Black & Gold Capsule */}
          {sliderStyle.ready && (
            <div
              className="nav-pill-slider"
              style={{
                transform: `translateX(${sliderStyle.left}px)`,
                width: `${sliderStyle.width}px`,
              }}
            />
          )}

          <button
            ref={(el) => { pillRefs.current['mesas'] = el; }}
            type="button"
            role="tab"
            aria-selected={activeSection === 'mesas'}
            className={`nav-pill ${activeSection === 'mesas' ? 'active' : ''}`}
            onClick={() => onChangeSection('mesas')}
          >
            <LayoutGrid size={16} />
            <span>Mesas & Cuentas</span>
            {activeTablesCount > 0 && (
              <span className="nav-pill-badge">{activeTablesCount}</span>
            )}
          </button>

          <button
            ref={(el) => { pillRefs.current['pos'] = el; }}
            type="button"
            role="tab"
            aria-selected={activeSection === 'pos'}
            className={`nav-pill ${activeSection === 'pos' ? 'active' : ''}`}
            onClick={() => onChangeSection('pos')}
          >
            <ShoppingBag size={16} />
            <span>Punto de Venta (POS)</span>
          </button>

          {/* Inventario & Precios (Oculto para Mesero) */}
          {currentUser?.role !== 'mesero' && (
            <button
              ref={(el) => { pillRefs.current['inventario'] = el; }}
              type="button"
              role="tab"
              aria-selected={activeSection === 'inventario'}
              className={`nav-pill ${activeSection === 'inventario' ? 'active' : ''}`}
              onClick={() => onChangeSection('inventario')}
            >
              <Package size={16} />
              <span>Inventario & Precios</span>
              {lowStockCount > 0 && (
                <span className="nav-pill-badge alert">{lowStockCount}</span>
              )}
            </button>
          )}

          {/* Caja & Ventas (Oculto para Mesero) */}
          {currentUser?.role !== 'mesero' && (
            <button
              ref={(el) => { pillRefs.current['caja'] = el; }}
              type="button"
              role="tab"
              aria-selected={activeSection === 'caja'}
              className={`nav-pill ${activeSection === 'caja' ? 'active' : ''}`}
              onClick={() => onChangeSection('caja')}
            >
              <Receipt size={16} />
              <span>Caja & Ventas</span>
              <span className="nav-pill-badge secondary">{todaySalesCount}</span>
            </button>
          )}
        </div>

        {/* Right Actions */}
        <div className="header-right">
          {/* User Profile & Role Pill */}
          {currentUser && (
            <div className="header-user-badge" title={`Sesión activa: ${currentUser.name} (@${currentUser.username})`}>
              <div className={`user-badge-role ${currentUser.role}`}>
                {currentUser.role === 'admin' ? (
                  <ShieldCheck size={14} />
                ) : (
                  <UserCheck size={14} />
                )}
                <span>{currentUser.role === 'admin' ? 'ADMIN' : currentUser.role.toUpperCase()}</span>
              </div>
              <span className="user-badge-name">{currentUser.name}</span>
            </div>
          )}

          {/* Admin User Management Button */}
          {currentUser?.role === 'admin' && onOpenUserManagement && (
            <button
              type="button"
              className="btn-header-action btn-header-compact btn-header-admin"
              onClick={onOpenUserManagement}
              title="Gestión de Usuarios, Contraseñas y Permisos"
            >
              <Users size={15} />
              <span className="btn-text-desktop">Usuarios</span>
            </button>
          )}

          {/* Export to Excel (Visible para Admin y Cajero) */}
          {currentUser?.role !== 'mesero' && (
            <button
              type="button"
              className="btn-header-action btn-header-compact"
              onClick={onExportExcel}
              title="Exportar Reporte Completo a Excel (.xlsx)"
            >
              <FileSpreadsheet size={15} color="#10b981" />
              <span className="btn-text-desktop">Excel</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            className="btn-icon-circle"
            onClick={onToggleTheme}
            title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Logout / Switch User */}
          {onLogout && (
            <button
              type="button"
              className="btn-icon-circle btn-logout"
              onClick={onLogout}
              title="Cerrar Sesión / Cambiar de Usuario"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
