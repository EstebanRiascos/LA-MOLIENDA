import React, { useState } from 'react';
import {
  Users,
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
} from 'lucide-react';
import { Table, TableZone, TableStatus, Product } from '../types';
import { formatCurrency } from '../utils/storage';

interface TablesViewProps {
  tables: Table[];
  products: Product[];
  onSelectTable: (table: Table) => void;
  onOpenTable: (table: Table) => void;
  onPreBill: (table: Table) => void;
  onCheckout: (table: Table) => void;
  onTransferTable: (table: Table) => void;
  onQuickAddItem: (tableId: string, productId: string) => void;
  onOpenNewTableForm: () => void;
  onEditTableForm: (table: Table) => void;
  onDeleteTable: (table: Table) => void;
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
}) => {
  const [selectedZone, setSelectedZone] = useState<TableZone | 'todas'>('todas');
  const [selectedStatus, setSelectedStatus] = useState<TableStatus | 'todas'>('todas');

  const filteredTables = tables.filter((t) => {
    const matchesZone = selectedZone === 'todas' || t.zone === selectedZone;
    const matchesStatus = selectedStatus === 'todas' || t.status === selectedStatus;
    return matchesZone && matchesStatus;
  });

  const getZoneLabel = (zone: TableZone) => {
    switch (zone) {
      case 'salon':
        return 'Salón Principal';
      case 'terraza':
        return 'Terraza Exterior';
      case 'barra':
        return 'Barra Café & Bar';
      case 'takeaway':
        return 'Para Llevar';
      default:
        return zone;
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
      {/* Floor & Filter Bar */}
      <div className="tables-filter-bar">
        {/* Zones Tabs */}
        <div className="filter-pill-group">
          <button
            type="button"
            className={`filter-pill-btn ${selectedZone === 'todas' ? 'active' : ''}`}
            onClick={() => setSelectedZone('todas')}
          >
            <span>Todas las Zonas</span>
            <span className="pill-count">{zonesCount.todas}</span>
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${selectedZone === 'salon' ? 'active' : ''}`}
            onClick={() => setSelectedZone('salon')}
          >
            <span>Salón Principal</span>
            <span className="pill-count">{zonesCount.salon}</span>
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${selectedZone === 'terraza' ? 'active' : ''}`}
            onClick={() => setSelectedZone('terraza')}
          >
            <span>Terraza Exterior</span>
            <span className="pill-count">{zonesCount.terraza}</span>
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${selectedZone === 'barra' ? 'active' : ''}`}
            onClick={() => setSelectedZone('barra')}
          >
            <span>Barra Café & Bar</span>
            <span className="pill-count">{zonesCount.barra}</span>
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${selectedZone === 'takeaway' ? 'active' : ''}`}
            onClick={() => setSelectedZone('takeaway')}
          >
            <span>Para Llevar</span>
            <span className="pill-count">{zonesCount.takeaway}</span>
          </button>
        </div>

        {/* Status Filter & Management Controls */}
        <div className="status-filter-group">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="select-status-input"
          >
            <option value="todas">Todos los Estados</option>
            <option value="ocupada">Ocupadas (Activas)</option>
            <option value="por_cobrar">Pre-cuenta Entregada</option>
            <option value="libre">Mesas Libres</option>
          </select>

          {/* Add New Table / Bar button */}
          <button
            type="button"
            className="btn-add-table-pill"
            onClick={onOpenNewTableForm}
            title="Agregar una nueva mesa, barra o espacio de atención"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Nueva Mesa / Barra</span>
          </button>
        </div>
      </div>

      {/* Tables Floor Grid */}
      <div className="tables-grid">
        {filteredTables.map((table) => {
          const isOccupied = table.status === 'ocupada';
          const isPreBill = table.status === 'por_cobrar';
          const isFree = table.status === 'libre';
          const timeText = getElapsedTime(table.openedAt);

          let cardStatusClass = 'table-card-free';
          if (isOccupied) cardStatusClass = 'table-card-occupied';
          if (isPreBill) cardStatusClass = 'table-card-prebill';

          return (
            <div key={table.id} className={`table-card ${cardStatusClass}`}>
              {/* Card Header */}
              <div className="table-card-header">
                <div className="table-title-box">
                  <span className="table-num">{table.number}</span>
                  <span className="table-zone-tag">{getZoneLabel(table.zone)}</span>
                </div>
                <div className="table-header-right-group">
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
                    {isFree && (
                      <span className="status-badge status-free">
                        <CheckCircle2 size={12} /> Libre
                      </span>
                    )}
                  </div>

                  {/* Card Management Controls (Edit / Delete) */}
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
                </div>
              </div>

              {/* Card Info Details */}
              <div className="table-card-body">
                <div className="table-meta-row">
                  <span className="table-capacity" title="Capacidad de comensales">
                    <Users size={14} /> {table.capacity} pax
                  </span>

                  {(isOccupied || isPreBill) && timeText && (
                    <span className="table-time" title="Tiempo con la cuenta abierta">
                      <Clock size={14} /> {timeText}
                    </span>
                  )}
                </div>

                {/* If Table has active consumption */}
                {isOccupied || isPreBill ? (
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
                  <button
                    type="button"
                    className="btn-table-action btn-open-table"
                    onClick={() => onOpenTable(table)}
                  >
                    <PlusCircle size={15} /> Abrir Mesa / Comanda
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-table-action btn-manage-account"
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

                      <button
                        type="button"
                        className="btn-checkout-quick"
                        onClick={() => onCheckout(table)}
                        title="Cobrar cuenta y cerrar mesa"
                      >
                        <CreditCard size={15} />
                        <span>Cobrar</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
