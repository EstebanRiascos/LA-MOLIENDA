import React, { useState } from 'react';
import {
  Search,
  Receipt,
  FileSpreadsheet,
  Lock,
  History,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  DollarSign,
  Coffee,
  Eye,
  CalendarDays,
  Filter,
} from 'lucide-react';
import { SaleRecord, PaymentMethod } from '../types';
import { formatCurrency } from '../utils/storage';
import { ExportReportOptions } from '../utils/excelExporter';
import { CashClosingHistoryModal } from './CashClosingHistoryModal';

export type DateFilterPreset =
  | 'today'
  | 'yesterday'
  | 'month'
  | 'custom_day'
  | 'range'
  | 'week'
  | 'all';

interface SalesHistoryViewProps {
  sales: SaleRecord[];
  onViewSaleTicket: (sale: SaleRecord) => void;
  onOpenCashClosing: () => void;
  onExportExcel: (filteredSales?: SaleRecord[], options?: ExportReportOptions) => void;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  sales,
  onViewSaleTicket,
  onOpenCashClosing,
  onExportExcel,
}) => {
  // Timezone-accurate helpers based on browser's local time (Colombia)
  const getLocalDateString = (dateInput: string | Date = new Date()): string => {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getLocalMonthString = (dateInput: string | Date = new Date()): string => {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  };

  const todayStr = getLocalDateString();
  const currentMonthStr = getLocalMonthString();

  const [searchQuery, setSearchQuery] = useState('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>('today');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedSingleDate, setSelectedSingleDate] = useState<string>(todayStr);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return getLocalDateString(d);
  });
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');

  // Currently applied filter state
  const [appliedFilter, setAppliedFilter] = useState<{
    preset: DateFilterPreset;
    month: string;
    singleDate: string;
    startDate: string;
    endDate: string;
  }>({
    preset: 'today',
    month: currentMonthStr,
    singleDate: todayStr,
    startDate: (() => {
      const d = new Date();
      d.setDate(1);
      return getLocalDateString(d);
    })(),
    endDate: todayStr,
  });

  const handleSelectPreset = (preset: DateFilterPreset) => {
    setDateFilter(preset);
    if (preset === 'today' || preset === 'yesterday' || preset === 'week' || preset === 'all') {
      setAppliedFilter((prev) => ({ ...prev, preset }));
    }
  };

  const handleApplyFilter = () => {
    setAppliedFilter({
      preset: dateFilter,
      month: selectedMonth,
      singleDate: selectedSingleDate,
      startDate: startDate,
      endDate: endDate,
    });
  };

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Filter sales based on currently APPLIED filter
  const filteredSales = sales.filter((s) => {
    const saleDateStr = getLocalDateString(s.date);
    const saleMonthStr = getLocalMonthString(s.date);

    // Date filter
    let matchesDate = true;
    if (appliedFilter.preset === 'today') {
      matchesDate = saleDateStr === todayStr;
    } else if (appliedFilter.preset === 'yesterday') {
      const yesterday = getLocalDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
      matchesDate = saleDateStr === yesterday;
    } else if (appliedFilter.preset === 'month') {
      matchesDate = saleMonthStr === appliedFilter.month;
    } else if (appliedFilter.preset === 'custom_day') {
      matchesDate = saleDateStr === appliedFilter.singleDate;
    } else if (appliedFilter.preset === 'range') {
      if (appliedFilter.startDate && appliedFilter.endDate) {
        matchesDate = saleDateStr >= appliedFilter.startDate && saleDateStr <= appliedFilter.endDate;
      } else if (appliedFilter.startDate) {
        matchesDate = saleDateStr >= appliedFilter.startDate;
      } else if (appliedFilter.endDate) {
        matchesDate = saleDateStr <= appliedFilter.endDate;
      }
    } else if (appliedFilter.preset === 'week') {
      matchesDate = s.date >= oneWeekAgo;
    } else if (appliedFilter.preset === 'all') {
      matchesDate = true;
    }

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

  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
  };

  const formatMonthDisplay = (mStr: string) => {
    if (!mStr) return '';
    const [year, month] = mStr.split('-');
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${monthNames[mIdx] || month} ${year}`;
  };

  // Build individualized Excel export metadata from applied filter
  const getFilterDetails = (): ExportReportOptions => {
    let periodLabel = '';
    let filenameSuffix = '';

    switch (appliedFilter.preset) {
      case 'today':
        periodLabel = `Ventas de Hoy (${formatDisplayDate(todayStr)})`;
        filenameSuffix = `Dia_${todayStr}`;
        break;
      case 'yesterday': {
        const yStr = getLocalDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
        periodLabel = `Ventas de Ayer (${formatDisplayDate(yStr)})`;
        filenameSuffix = `Ayer_${yStr}`;
        break;
      }
      case 'month':
        periodLabel = `Mes de ${formatMonthDisplay(appliedFilter.month)}`;
        filenameSuffix = `Mes_${appliedFilter.month}`;
        break;
      case 'custom_day':
        periodLabel = `Día ${formatDisplayDate(appliedFilter.singleDate)}`;
        filenameSuffix = `Dia_${appliedFilter.singleDate}`;
        break;
      case 'range':
        periodLabel = `Del ${formatDisplayDate(appliedFilter.startDate)} al ${formatDisplayDate(appliedFilter.endDate)}`;
        filenameSuffix = `Rango_${appliedFilter.startDate}_a_${appliedFilter.endDate}`;
        break;
      case 'week':
        periodLabel = 'Últimos 7 Días';
        filenameSuffix = `Ultimos_7_Dias_${todayStr}`;
        break;
      case 'all':
        periodLabel = 'Historial Consolidado Completo';
        filenameSuffix = `Historico_Completo_${todayStr}`;
        break;
    }

    let filterSummary = `${filteredSales.length} transacciones registradas`;
    if (paymentFilter !== 'all') {
      const pLabel = {
        efectivo: 'Efectivo',
        tarjeta: 'Datáfono / Tarjeta',
        transferencia: 'QR / Transferencia',
        mixto: 'Pago Mixto',
      }[paymentFilter] || paymentFilter;
      filterSummary += ` • Método: ${pLabel}`;
      filenameSuffix += `_${paymentFilter}`;
    }
    if (searchQuery.trim()) {
      filterSummary += ` • Búsqueda: "${searchQuery.trim()}"`;
    }

    return { periodLabel, filenameSuffix, filterSummary };
  };

  const handleExportClick = () => {
    if (filteredSales.length === 0) {
      const confirmEmpty = window.confirm(
        'No hay ventas que coincidan con el filtro actual. ¿Deseas descargar el reporte vacío para este período?'
      );
      if (!confirmEmpty) return;
    }
    const options = getFilterDetails();
    onExportExcel(filteredSales, options);
  };

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
      <div className="sales-toolbar-section">
        <div className="sales-toolbar">
          <div className="toolbar-left">
            {/* Primary Date Filter Tabs */}
            <div className="sales-date-tabs">
              <button
                type="button"
                className={`sales-tab-btn ${dateFilter === 'today' ? 'active' : ''}`}
                onClick={() => handleSelectPreset('today')}
              >
                Hoy
              </button>
              <button
                type="button"
                className={`sales-tab-btn ${dateFilter === 'yesterday' ? 'active' : ''}`}
                onClick={() => handleSelectPreset('yesterday')}
              >
                Ayer
              </button>
              <button
                type="button"
                className={`sales-tab-btn ${dateFilter === 'month' ? 'active' : ''}`}
                onClick={() => handleSelectPreset('month')}
              >
                Mes
              </button>
              <button
                type="button"
                className={`sales-tab-btn ${dateFilter === 'custom_day' ? 'active' : ''}`}
                onClick={() => handleSelectPreset('custom_day')}
              >
                Día
              </button>
              <button
                type="button"
                className={`sales-tab-btn ${dateFilter === 'range' ? 'active' : ''}`}
                onClick={() => handleSelectPreset('range')}
              >
                Rango
              </button>
              <button
                type="button"
                className={`sales-tab-btn ${dateFilter === 'week' ? 'active' : ''}`}
                onClick={() => handleSelectPreset('week')}
              >
                7 Días
              </button>
              <button
                type="button"
                className={`sales-tab-btn ${dateFilter === 'all' ? 'active' : ''}`}
                onClick={() => handleSelectPreset('all')}
              >
                Historial
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
            {/* Historial de Cierres Button */}
            <button
              type="button"
              className="btn-cash-history-action"
              onClick={() => setIsHistoryModalOpen(true)}
              title="Ver registros anteriores de arqueos y turnos cerrados"
            >
              <History size={15} />
              <span>Historial Cierres</span>
            </button>

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

            {/* Export to Excel Individualized */}
            <button
              type="button"
              className="btn-export-excel-action"
              onClick={handleExportClick}
              title={`Descargar reporte Excel individualizado con este filtro (${getFilterDetails().periodLabel})`}
            >
              <FileSpreadsheet size={15} color="#10b981" />
              <span>Exportar Excel ({filteredSales.length})</span>
            </button>
          </div>
        </div>

        {/* Secondary Date Range Controls when month, custom_day or range is selected */}
        {(dateFilter === 'month' || dateFilter === 'custom_day' || dateFilter === 'range') && (
          <div className="sales-secondary-date-bar">
            {dateFilter === 'month' && (
              <div className="sales-custom-date-box">
                <CalendarDays size={15} className="icon-cal-picker" />
                <span className="date-input-lbl">Seleccionar Mes:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                  className="sales-input-date"
                />
                <button
                  type="button"
                  className="btn-apply-filter"
                  onClick={handleApplyFilter}
                  title="Aplicar mes y filtrar la tabla"
                >
                  <Filter size={14} />
                  <span>Aplicar Filtro</span>
                </button>
              </div>
            )}

            {dateFilter === 'custom_day' && (
              <div className="sales-custom-date-box">
                <CalendarDays size={15} className="icon-cal-picker" />
                <span className="date-input-lbl">Fecha Específica:</span>
                <input
                  type="date"
                  value={selectedSingleDate}
                  onChange={(e) => setSelectedSingleDate(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                  className="sales-input-date"
                />
                <button
                  type="button"
                  className="btn-apply-filter"
                  onClick={handleApplyFilter}
                  title="Aplicar fecha y filtrar la tabla"
                >
                  <Filter size={14} />
                  <span>Aplicar Filtro</span>
                </button>
              </div>
            )}

            {dateFilter === 'range' && (
              <div className="sales-custom-date-box range-group">
                <CalendarDays size={15} className="icon-cal-picker" />
                <span className="date-input-lbl">Desde:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                  className="sales-input-date"
                />
                <span className="date-input-lbl">Hasta:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                  className="sales-input-date"
                />
                <button
                  type="button"
                  className="btn-apply-filter"
                  onClick={handleApplyFilter}
                  title="Aplicar rango de fechas y filtrar la tabla"
                >
                  <Filter size={14} />
                  <span>Aplicar Filtro</span>
                </button>
              </div>
            )}

            <div className="sales-active-filter-tag">
              <span>Filtro activo: <strong>{getFilterDetails().periodLabel}</strong></span>
            </div>
          </div>
        )}
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
              <th>Total Pagado</th>
              <th>Ticket</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={9} className="sales-empty-cell">
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
      {/* Historial de Cierres Modal */}
      <CashClosingHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </div>
  );
};
