import React, { useState } from 'react';
import {
  Search,
  Receipt,
  FileSpreadsheet,
  Lock,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  DollarSign,
  Coffee,
  Eye,
} from 'lucide-react';
import { SaleRecord, PaymentMethod } from '../types';
import { formatCurrency } from '../utils/storage';

interface SalesHistoryViewProps {
  sales: SaleRecord[];
  onViewSaleTicket: (sale: SaleRecord) => void;
  onOpenCashClosing: () => void;
  onExportExcel: () => void;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  sales,
  onViewSaleTicket,
  onOpenCashClosing,
  onExportExcel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'all'>('today');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');

  const todayStr = new Date().toISOString().slice(0, 10);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Filter sales
  const filteredSales = sales.filter((s) => {
    // Date filter
    let matchesDate = true;
    if (dateFilter === 'today') matchesDate = s.date.slice(0, 10) === todayStr;
    if (dateFilter === 'week') matchesDate = s.date >= oneWeekAgo;

    // Payment method
    const matchesPayment = paymentFilter === 'all' || s.paymentMethod === paymentFilter;

    // Search query
    const matchesSearch =
      searchQuery === '' ||
      s.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tableNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.waiter.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.patronName && s.patronName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesDate && matchesPayment && matchesSearch;
  });

  // Calculate totals from filtered
  const totalAmount = filteredSales.reduce((sum, s) => sum + s.total, 0);

  const totalCash = filteredSales
    .filter((s) => s.paymentMethod === 'efectivo')
    .reduce((sum, s) => sum + s.total, 0);

  const totalCard = filteredSales
    .filter((s) => s.paymentMethod === 'tarjeta')
    .reduce((sum, s) => sum + s.total, 0);

  const totalTransfer = filteredSales
    .filter((s) => s.paymentMethod === 'transferencia')
    .reduce((sum, s) => sum + s.total, 0);

  const getPaymentBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'efectivo':
        return (
          <span className="method-badge badge-cash">
            <Banknote size={12} /> Efectivo
          </span>
        );
      case 'tarjeta':
        return (
          <span className="method-badge badge-card">
            <CreditCard size={12} /> Tarjeta
          </span>
        );
      case 'transferencia':
        return (
          <span className="method-badge badge-transfer">
            <QrCode size={12} /> Transferencia
          </span>
        );
      case 'mixto':
        return <span className="method-badge badge-mixed">Mixto</span>;
      default:
        return <span className="method-badge">{method}</span>;
    }
  };

  return (
    <div className="sales-history-view-container">
      {/* Financial Summary KPIs */}
      <div className="sales-kpi-strip">
        <div className="sales-kpi-card highlight-green">
          <span className="kpi-mini-lbl">Total Facturado</span>
          <span className="kpi-mini-val">{formatCurrency(totalAmount)}</span>
          <span className="kpi-mini-sub">{filteredSales.length} transacciones</span>
        </div>

        <div className="sales-kpi-card">
          <span className="kpi-mini-lbl">En Efectivo (Caja)</span>
          <span className="kpi-mini-val">{formatCurrency(totalCash)}</span>
          <span className="kpi-mini-sub">Dinero en gaveta</span>
        </div>

        <div className="sales-kpi-card">
          <span className="kpi-mini-lbl">Datáfono / Tarjetas</span>
          <span className="kpi-mini-val">{formatCurrency(totalCard)}</span>
          <span className="kpi-mini-sub">Vouchers bancarios</span>
        </div>

        <div className="sales-kpi-card">
          <span className="kpi-mini-lbl">QR / Transferencias</span>
          <span className="kpi-mini-val">{formatCurrency(totalTransfer)}</span>
          <span className="kpi-mini-sub">Nequi / Daviplata</span>
        </div>
      </div>

      {/* Control Bar: Filters & Actions */}
      <div className="sales-toolbar">
        <div className="toolbar-left">
          {/* Date Filter Tabs */}
          <div className="sales-date-tabs">
            <button
              type="button"
              className={`sales-tab-btn ${dateFilter === 'today' ? 'active' : ''}`}
              onClick={() => setDateFilter('today')}
            >
              Hoy
            </button>
            <button
              type="button"
              className={`sales-tab-btn ${dateFilter === 'week' ? 'active' : ''}`}
              onClick={() => setDateFilter('week')}
            >
              Últimos 7 Días
            </button>
            <button
              type="button"
              className={`sales-tab-btn ${dateFilter === 'all' ? 'active' : ''}`}
              onClick={() => setDateFilter('all')}
            >
              Histórico Completo
            </button>
          </div>

          {/* Payment Method Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="sales-filter-select"
          >
            <option value="all">Todos los Medios de Pago</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Datáfono / Tarjeta</option>
            <option value="transferencia">QR / Transferencia</option>
            <option value="mixto">Pago Dividido</option>
          </select>

          {/* Search Input */}
          <div className="sales-search-box">
            <Search size={15} className="sales-search-icon" />
            <input
              type="text"
              placeholder="Buscar por ticket, mesa o cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sales-search-input"
            />
          </div>
        </div>

        <div className="toolbar-right">
          {/* Cierre de Caja Button */}
          <button
            type="button"
            className="btn-cash-closing-action"
            onClick={onOpenCashClosing}
            title="Realizar arqueo de caja y cuadre del turno"
          >
            <Lock size={15} />
            <span>Cierre de Caja</span>
          </button>

          {/* Export to Excel */}
          <button
            type="button"
            className="btn-export-excel-action"
            onClick={onExportExcel}
            title="Exportar informe de ventas a Excel (.xlsx)"
          >
            <FileSpreadsheet size={15} color="#10b981" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="sales-table-wrapper">
        <table className="sales-table">
          <thead>
            <tr>
              <th>Ticket N°</th>
              <th>Fecha & Hora</th>
              <th>Mesa / Canal</th>
              <th>Atendido Por</th>
              <th>Cliente</th>
              <th>Productos Vendidos</th>
              <th>Método de Pago</th>
              <th>Propina</th>
              <th>Total Pagado</th>
              <th>Ticket</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={10} className="sales-empty-cell">
                  No se registran ventas para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => {
                const dateObj = new Date(sale.date);
                const timeStr = dateObj.toLocaleTimeString('es-CO', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const dateStr = dateObj.toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: 'short',
                });
                const totalUnits = sale.items.reduce((s, i) => s + i.quantity, 0);

                return (
                  <tr key={sale.id}>
                    <td className="td-ticket-num">
                      <span className="ticket-code-badge">{sale.ticketNumber}</span>
                    </td>
                    <td className="td-date">
                      <span>{dateStr}</span>
                      <span className="td-time">{timeStr}</span>
                    </td>
                    <td className="td-table-dest">
                      <strong>{sale.tableNumber}</strong>
                    </td>
                    <td className="td-waiter">{sale.waiter}</td>
                    <td className="td-client">{sale.patronName || 'Cliente en sala'}</td>
                    <td className="td-items-summary">
                      <span
                        className="items-tag"
                        title={sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                      >
                        {totalUnits} ítems ({sale.items.length} refs)
                      </span>
                    </td>
                    <td className="td-method">{getPaymentBadge(sale.paymentMethod)}</td>
                    <td className="td-tip">
                      {formatCurrency(sale.tipAmount)}
                    </td>
                    <td className="td-total-paid">
                      <span className="paid-val">{formatCurrency(sale.total)}</span>
                    </td>
                    <td className="td-actions">
                      <button
                        type="button"
                        className="btn-view-ticket"
                        onClick={() => onViewSaleTicket(sale)}
                        title="Ver e imprimir ticket de venta"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
