import React from 'react';
import {
  Coffee,
  LayoutGrid,
  ShoppingBag,
  Package,
  Receipt,
  FileSpreadsheet,
  Plus,
  Sun,
  Moon,
  UserCheck,
} from 'lucide-react';
import laMoliendaLogo from '../assets/la_molienda_logo.png';

export type ActiveSection = 'mesas' | 'pos' | 'inventario' | 'caja';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeSection: ActiveSection;
  onChangeSection: (section: ActiveSection) => void;
  onOpenNewTable: () => void;
  onOpenNewProduct: () => void;
  onExportExcel: () => void;
  activeTablesCount: number;
  lowStockCount: number;
  todaySalesCount: number;
  currentStaff: string;
  staffList: string[];
  onChangeStaff: (staff: string) => void;
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
            <span className="brand-tagline">
              Sistema POS &bull; Control de Mesas
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
        </div>

        {/* Right Actions */}
        <div className="header-right">
          {/* Quick Staff Selector */}
          <div className="header-staff-selector" title="Personal activo en turno">
            <UserCheck size={15} className="staff-icon" />
            <select
              value={currentStaff}
              onChange={(e) => onChangeStaff(e.target.value)}
              className="staff-select-input"
            >
              {staffList.map((staff) => (
                <option key={staff} value={staff}>
                  {staff}
                </option>
              ))}
            </select>
          </div>

          {/* Export to Excel */}
          <button
            type="button"
            className="btn-header-action btn-header-compact"
            onClick={onExportExcel}
            title="Exportar Reporte Completo a Excel (.xlsx)"
          >
            <FileSpreadsheet size={15} color="#10b981" />
            <span className="btn-text-desktop">Excel</span>
          </button>

          {/* Primary Action Button depending on section */}
          {activeSection === 'inventario' ? (
            <button
              type="button"
              className="btn-header-action btn-header-primary"
              onClick={onOpenNewProduct}
              title="Registrar nuevo producto en el catálogo"
            >
              <span className="btn-primary-icon-wrap">
                <Plus size={15} strokeWidth={2.6} />
              </span>
              <span className="btn-text-primary-action">Nuevo Producto</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-header-action btn-header-primary"
              onClick={onOpenNewTable}
              title="Abrir comanda / cuenta en una mesa o barra"
            >
              <span className="btn-primary-icon-wrap">
                <Plus size={15} strokeWidth={2.6} />
              </span>
              <span className="btn-text-primary-action">Abrir Mesa</span>
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
        </div>
      </div>
    </header>
  );
};
