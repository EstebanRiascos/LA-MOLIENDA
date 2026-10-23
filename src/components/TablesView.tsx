import React, { useState } from 'react';
import {
  Users,
  User,
  Clock,
  Coffee,
  Plus,
  PlusCircle,
  Receipt,
  CreditCard,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Edit2,
  Trash2,
  Filter,
  ChevronDown,
  Sun,
  Wine,
  ShoppingBag,
  LayoutGrid,
  Compass,
  BookmarkCheck,
  Calendar,
  Phone,
} from 'lucide-react';
import { Table, TableZone, TableStatus, Product, UserRole } from '../types';
import { formatCurrency } from '../utils/storage';
import { FloorPlan3DView } from './FloorPlan3DView';

interface TablesViewProps {
  tables: Table[];
  products: Product[];
  onSelectTable: (table: Table) => void;
  onOpenTable: (table?: Table) => void;
  onPreBill: (table: Table) => void;
  onCheckout: (table: Table) => void;
  onTransferTable: (table: Table) => void;
  onQuickAddItem: (tableId: string, productId: string) => void;
  onOpenNewTableForm: () => void;
  onEditTableForm: (table: Table) => void;
  onDeleteTable: (table: Table) => void;
  onReserveTable?: (table?: Table) => void;
  onCancelReservation?: (table: Table) => void;
  onUpdateTables?: (tables: Table[]) => void;
  currentUserRole?: UserRole;
}

export const TablesView: React.FC<TablesViewProps> = ({
  tables,
  products,
  onSelectTable,
  onOpenTable,
  onPreBill,
  onCheckout,
  onTransferTable,
  onOpenNewTableForm,
  onEditTableForm,
  onDeleteTable,
  onReserveTable,
  onCancelReservation,
  onUpdateTables,
  currentUserRole,
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'plan_3d'>('cards');
  const [selectedZone, setSelectedZone] = useState<TableZone | 'todas'>('todas');
  const [selectedStatus, setSelectedStatus] = useState<TableStatus | 'todas'>('todas');

  const filteredTables = tables.filter((t) => {
    const matchesZone = selectedZone === 'todas' || t.zone === selectedZone;
    const matchesStatus = selectedStatus === 'todas' || t.status === selectedStatus;
    return matchesZone && matchesStatus;
  });

  const getZoneInfo = (zone: TableZone) => {
    switch (zone) {
      case 'salon':
        return {
          label: 'Salón Principal',
          icon: <Coffee size={12} className="zone-tag-icon" />,
          watermarkIcon: <Coffee size={100} strokeWidth={1.6} />,
          className: 'zone-salon',
        };
      case 'terraza':
        return {
          label: 'Terraza Exterior',
          icon: <Sun size={12} className="zone-tag-icon" />,
          watermarkIcon: <Sun size={100} strokeWidth={1.6} />,
          className: 'zone-terraza',
        };
      case 'barra':
        return {
          label: 'Barra',
          icon: <Wine size={12} className="zone-tag-icon" />,
          watermarkIcon: <Wine size={100} strokeWidth={1.6} />,
          className: 'zone-barra',
        };
      case 'takeaway':
        return {
          label: 'Para Llevar',
          icon: <ShoppingBag size={12} className="zone-tag-icon" />,
          watermarkIcon: <ShoppingBag size={100} strokeWidth={1.6} />,
          className: 'zone-takeaway',
        };
      default:
        return {
          label: zone,
          icon: <Coffee size={12} className="zone-tag-icon" />,
          watermarkIcon: <Coffee size={100} strokeWidth={1.6} />,
          className: 'zone-salon',
        };
    }
  };

  const getElapsedTime = (openedAt?: string) => {
    if (!openedAt) return null;
    const diffMs = Date.now() - new Date(openedAt).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    }
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  const zonesCount = {
    todas: tables.length,
    salon: tables.filter((t) => t.zone === 'salon').length,
    terraza: tables.filter((t) => t.zone === 'terraza').length,
    barra: tables.filter((t) => t.zone === 'barra').length,
    takeaway: tables.filter((t) => t.zone === 'takeaway').length,
  };

  return (
    <div className="tables-view-container">
      {/* Top Header Mode Switcher: Cards vs 3D Floor Plan */}
      <div className="tables-header-switcher-row">
        <div className="panel-mode-toggle-group">
          <button
            type="button"
            className={`panel-mode-pill ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid size={15} />
            <span>Tarjetas de Mesas</span>
            <span className="panel-count-badge">{tables.length}</span>
          </button>
          <button
            type="button"
            className={`panel-mode-pill ${viewMode === 'plan_3d' ? 'active' : ''}`}
            onClick={() => setViewMode('plan_3d')}
          >
            <Compass size={15} />
            <span>Plano 3D del Local</span>
            <span className="panel-badge-highlight">Plano La Molienda</span>
          </button>
        </div>
      </div>

      {viewMode === 'plan_3d' ? (
        <FloorPlan3DView
          tables={tables}
          products={products}
          onSelectTable={onSelectTable}
          onOpenTable={onOpenTable}
          onPreBill={onPreBill}
          onCheckout={onCheckout}
          onTransferTable={onTransferTable}
          onOpenNewTableForm={onOpenNewTableForm}
          onEditTableForm={onEditTableForm}
          onDeleteTable={onDeleteTable}
          onReserveTable={onReserveTable}
          onUpdateTables={onUpdateTables || (() => {})}
        />
      ) : (
        <>
          {/* Floor & Filter Bar */}
          <div className="tables-filter-bar">
        {/* Zones Tabs */}
        <div className="filter-pill-group">
          <button
            type="button"
            className={`filter-pill-btn ${selectedZone === 'todas' ? 'active' : ''}`}
            onClick={() => setSelectedZone('todas')}
          >
            <span>Todas</span>
            <span className="pill-count">{zonesCount.todas}</span>
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${selectedZone === 'salon' ? 'active' : ''}`}
            onClick={() => setSelectedZone('salon')}
          >
            <Coffee size={13} className="pill-zone-icon icon-salon" />
            <span>Salón (Mesas)</span>
            <span className="pill-count">{zonesCount.salon}</span>
          </button>
          {zonesCount.terraza > 0 && (
            <button
              type="button"
              className={`filter-pill-btn ${selectedZone === 'terraza' ? 'active' : ''}`}
              onClick={() => setSelectedZone('terraza')}
            >
              <Sun size={13} className="pill-zone-icon icon-terraza" />
              <span>Terraza Exterior</span>
              <span className="pill-count">{zonesCount.terraza}</span>
            </button>
          )}
          <button
            type="button"
            className={`filter-pill-btn ${selectedZone === 'barra' ? 'active' : ''}`}
            onClick={() => setSelectedZone('barra')}
          >
            <Wine size={13} className="pill-zone-icon icon-barra" />
            <span>Barra</span>
            <span className="pill-count">{zonesCount.barra}</span>
          </button>
          {zonesCount.takeaway > 0 && (
            <button
              type="button"
              className={`filter-pill-btn ${selectedZone === 'takeaway' ? 'active' : ''}`}
              onClick={() => setSelectedZone('takeaway')}
            >
              <ShoppingBag size={13} className="pill-zone-icon icon-takeaway" />
              <span>Para Llevar</span>
              <span className="pill-count">{zonesCount.takeaway}</span>
            </button>
          )}
        </div>

        {/* Status Filter & Management Controls */}
        <div className="status-filter-group">
          {/* Custom Styled Status Dropdown */}
          <div className="select-status-wrapper">
            <Filter size={13} className="select-status-icon" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="select-status-input"
              aria-label="Filtrar por estado de mesa"
            >
              <option value="todas">Todos los Estados</option>
              <option value="ocupada">Ocupadas (Activas)</option>
              <option value="por_cobrar">Pre-cuenta Entregada</option>
              <option value="reservada">Mesas Reservadas</option>
              <option value="libre">Mesas Libres</option>
            </select>
            <ChevronDown size={14} className="select-status-chevron" />
          </div>

          {/* Abrir Mesa Button */}
          <button
            type="button"
            className="btn-open-table-action"
            onClick={() => onOpenTable()}
            title="Abrir comanda / cuenta en una mesa o barra libre"
          >
            <Plus size={15} strokeWidth={2.6} />
            <span>Abrir Mesa</span>
          </button>

          {/* Reservar Mesa Button */}
          {onReserveTable && (
            <button
              type="button"
              className="btn-reserve-table-action"
              onClick={() => onReserveTable()}
              title="Registrar una nueva reserva de mesa"
            >
              <BookmarkCheck size={15} strokeWidth={2.4} />
              <span>Reservar Mesa</span>
            </button>
          )}

          {/* Add New Table / Bar button (Exclusivo para Administrador) */}
          {currentUserRole === 'admin' && (
            <button
              type="button"
              className="btn-add-table-action"
              onClick={onOpenNewTableForm}
              title="Agregar una nueva mesa, barra o espacio de atención"
            >
              <Plus size={15} strokeWidth={2.6} />
              <span>Nueva Mesa / Barra</span>
            </button>
          )}
        </div>
      </div>

      {/* Tables Floor Grid */}
      <div className="tables-grid">
        {filteredTables.map((table) => {
          const isOccupied = table.status === 'ocupada';
          const isPreBill = table.status === 'por_cobrar';
          const isFree = table.status === 'libre';
          const isReserved = table.status === 'reservada';
          const timeText = getElapsedTime(table.openedAt);
          const zoneInfo = getZoneInfo(table.zone);
          const pendingCount = (table.items || []).filter((i) => (i.status || 'pending') !== 'served').length;

          let cardStatusClass = 'table-card-free';
          if (isOccupied) cardStatusClass = 'table-card-occupied';
          if (isPreBill) cardStatusClass = 'table-card-prebill';
          if (isReserved) cardStatusClass = 'table-card-reserved';

          return (
            <div key={table.id} className={`table-card ${cardStatusClass}`}>
              {/* Subtle Ambient Zone Watermark */}
              <div className={`table-card-watermark ${zoneInfo.className}`} aria-hidden="true">
                {zoneInfo.watermarkIcon}
              </div>

              {/* Card Header */}
              <div className="table-card-header">
                <div className="table-title-box">
                  <span className="table-num">{table.number}</span>
                  <span className={`table-zone-tag ${zoneInfo.className}`}>
                    {zoneInfo.icon}
                    <span>{zoneInfo.label}</span>
                  </span>
                </div>
                <div className="table-badge-status">
                  {isOccupied && (
                    <span className="status-badge status-occupied">
                      <span className="pulsing-dot" /> Ocupada
                    </span>
                  )}
                  {isPreBill && (
                    <span className="status-badge status-prebill">
                      <Receipt size={12} /> Pre-cuenta
                    </span>
                  )}
                  {isReserved && (
                    <span className="status-badge status-reserved">
                      <BookmarkCheck size={12} /> Reservada
                    </span>
                  )}
                  {isFree && (
                    <span className="status-badge status-free">
                      <CheckCircle2 size={12} /> Libre
                    </span>
                  )}
                </div>
              </div>

              {/* Card Info Details */}
              <div className="table-card-body">
                <div className="table-meta-row">
                  <div className="table-meta-left">
                    <span className="table-capacity" title="Capacidad de comensales">
                      <Users size={14} /> {table.capacity} pax
                    </span>

                    {(isOccupied || isPreBill) && timeText && (
                      <span className="table-time" title="Tiempo con la cuenta abierta">
                        <Clock size={14} /> {timeText}
                      </span>
                    )}
                  </div>

                  {/* Card Management Controls (Edit / Delete) - Solo Admin */}
                  {currentUserRole === 'admin' && (
                    <div className="table-card-mgmt-btns">
                      <button
                        type="button"
                        className="btn-card-mgmt edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTableForm(table);
                        }}
                        title={`Editar configuración de ${table.number}`}
                      >
                        <Edit2 size={13} />
                      </button>
                      {isFree && (
                        <button
                          type="button"
                          className="btn-card-mgmt delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTable(table);
                          }}
                          title={`Eliminar ${table.number}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* If Table is Reserved */}
                {isReserved ? (
                  <div className="table-reserved-summary">
                    <div className="reserved-client-row">
                      <span className="reserved-client-name" title="Titular de la reserva">
                        <User size={13} /> {table.reservationName || 'Reserva Apartada'}
                      </span>
                      {table.reservationTime && (
                        <span className="reserved-time-badge" title="Hora de reserva">
                          <Clock size={12} /> {table.reservationTime}
                        </span>
                      )}
                    </div>

                    <div className="reserved-meta-row">
                      <span className="reserved-pax" title="Comensales esperados">
                        <Users size={12} /> {table.reservationPax || table.capacity} pax
                      </span>
                      {table.reservationDate && (
                        <span className="reserved-date" title="Fecha">
                          <Calendar size={12} /> {table.reservationDate}
                        </span>
                      )}
                      {table.reservationPhone && (
                        <span className="reserved-phone" title="Teléfono">
                          <Phone size={12} /> {table.reservationPhone}
                        </span>
                      )}
                    </div>

                    {table.reservationNotes && (
                      <div className="reserved-notes-row" title="Notas especiales">
                        <span>"{table.reservationNotes}"</span>
                      </div>
                    )}
                  </div>
                ) : isOccupied || isPreBill ? (
                  <div className="table-active-order-summary">
                    <div className="order-patron-info">
                      <span className="patron-name">
                        {table.patronName || 'Consumo en Sala'}
                      </span>
                      {table.waiter && (
                        <span className="waiter-assigned">{table.waiter}</span>
                      )}
                    </div>

                    <div className="order-items-preview">
                      <span className="items-count">
                        <Coffee size={13} /> {table.items.reduce((s, i) => s + i.quantity, 0)} productos en comanda
                      </span>
                      <span className="order-total-preview">
                        {formatCurrency(table.total || table.subtotal || 0)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="table-free-placeholder">
                    <span className="free-text">Mesa disponible para recibir clientes</span>
                  </div>
                )}
              </div>

              {/* Card Actions Footer */}
              <div className="table-card-actions">
                {isFree ? (
                  <div className="table-card-free-actions">
                    <button
                      type="button"
                      className="btn-open-table"
                      onClick={() => onOpenTable(table)}
                      title={`Abrir comanda inmediata en ${table.number}`}
                    >
                      <PlusCircle size={15} /> Abrir Mesa
                    </button>
                    {onReserveTable && (
                      <button
                        type="button"
                        className="btn-reserve-table-quick"
                        onClick={() => onReserveTable(table)}
                        title={`Apartar o reservar ${table.number}`}
                      >
                        <BookmarkCheck size={14} /> Reservar
                      </button>
                    )}
                  </div>
                ) : isReserved ? (
                  <div className="table-card-reserved-actions">
                    <button
                      type="button"
                      className="btn-occupy-reserved"
                      onClick={() => onOpenTable(table)}
                      title={`Abrir comanda para la reserva de ${table.reservationName || table.number}`}
                    >
                      <PlusCircle size={15} />
                      <span>Ocupar Mesa</span>
                    </button>

                    <div className="table-quick-buttons">
                      {onReserveTable && (
                        <button
                          type="button"
                          className="btn-icon-subtle edit-reserve"
                          onClick={() => onReserveTable(table)}
                          title="Modificar datos de la reserva"
                        >
                          <Edit2 size={15} />
                        </button>
                      )}
                      {onCancelReservation && (
                        <button
                          type="button"
                          className="btn-icon-subtle cancel-reserve"
                          onClick={() => onCancelReservation(table)}
                          title="Cancelar y liberar reserva"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-manage-account"
                      onClick={() => onSelectTable(table)}
                      title="Gestionar comanda, agregar productos o notas"
                    >
                      <span>Ver / Añadir Pedido</span>
                    </button>

                    <div className="table-quick-buttons">
                      <button
                        type="button"
                        className="btn-icon-subtle"
                        onClick={() => onPreBill(table)}
                        title="Imprimir o ver Pre-cuenta"
                      >
                        <Receipt size={16} />
                      </button>

                      <button
                        type="button"
                        className="btn-icon-subtle"
                        onClick={() => onTransferTable(table)}
                        title="Cambiar o trasladar a otra mesa"
                      >
                        <ArrowRightLeft size={16} />
                      </button>

                      {/* Botón Cobrar (Oculto para Mesero - Solo Caja y Admin) */}
                      {currentUserRole !== 'mesero' && (
                        <button
                          type="button"
                          className="btn-checkout-quick"
                          onClick={() => onCheckout(table)}
                          title={
                            pendingCount > 0
                              ? `No se puede cobrar: Hay ${pendingCount} producto(s) por despachar`
                              : "Cobrar cuenta y cerrar mesa"
                          }
                          disabled={pendingCount > 0}
                        >
                          <CreditCard size={15} />
                          <span>Cobrar</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  )}
</div>
);
};
