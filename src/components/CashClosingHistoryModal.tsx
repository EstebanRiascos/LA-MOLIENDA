import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  History,
  Printer,
  Search,
  Calendar,
  User,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  CreditCard,
  QrCode,
  Banknote,
  RotateCcw,
  Filter,
} from 'lucide-react';
import { CashClosingSummary } from '../types';
import { getCashClosingHistory } from '../utils/cashClosing';
import { formatCurrency } from '../utils/storage';
import { playSound } from '../utils/sounds';

interface CashClosingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashClosingHistoryModal: React.FC<CashClosingHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [history, setHistory] = useState<CashClosingSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [customDate, setCustomDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'balanced' | 'diff' | 'shortage' | 'surplus'>('all');
  const [cashierFilter, setCashierFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<CashClosingSummary | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHistory(getCashClosingHistory());
      setSelectedRecord(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleRemoteUpdate = () => {
      setHistory(getCashClosingHistory());
    };
    window.addEventListener('lamolienda:cash-closings-changed', handleRemoteUpdate);
    return () => window.removeEventListener('lamolienda:cash-closings-changed', handleRemoteUpdate);
  }, [isOpen]);

  // Extraer lista única de cajeros
  const uniqueCashiers = useMemo(() => {
    return Array.from(new Set(history.map((h) => h.cashier).filter(Boolean)));
  }, [history]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateFilter('all');
    setCustomDate('');
    setStatusFilter('all');
    setCashierFilter('all');
  };

  const isFilterActive =
    searchQuery.trim() !== '' ||
    dateFilter !== 'all' ||
    customDate !== '' ||
    statusFilter !== 'all' ||
    cashierFilter !== 'all';

  const filteredHistory = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOfWeek = startOfToday - 7 * 86400000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return history.filter((item) => {
      const itemDate = new Date(item.closedAt);
      const itemTime = itemDate.getTime();
      const diff = item.cashDifference ?? ((item.actualCashCounted ?? item.totalCash) - item.totalCash);
      const isBalanced = diff === 0;
      const isSurplus = diff > 0;
      const isShortage = diff < 0;

      // 1. Filtro de Fecha
      if (dateFilter === 'today') {
        if (itemTime < startOfToday) return false;
      } else if (dateFilter === 'yesterday') {
        if (itemTime < startOfYesterday || itemTime >= startOfToday) return false;
      } else if (dateFilter === 'week') {
        if (itemTime < startOfWeek) return false;
      } else if (dateFilter === 'month') {
        if (itemTime < startOfMonth) return false;
      } else if (dateFilter === 'custom' && customDate) {
        const itemYMD = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;
        if (itemYMD !== customDate) return false;
      }

      // 2. Filtro de Estado de Cuadre
      if (statusFilter === 'balanced' && !isBalanced) return false;
      if (statusFilter === 'diff' && isBalanced) return false;
      if (statusFilter === 'shortage' && !isShortage) return false;
      if (statusFilter === 'surplus' && !isSurplus) return false;

      // 3. Filtro por Cajero
      if (cashierFilter !== 'all' && item.cashier !== cashierFilter) return false;

      // 4. Búsqueda de Texto Multicriterio Inteligente
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cleanQ = q.replace(/[\$\.,\s]/g, '');

        const cashierMatch = item.cashier.toLowerCase().includes(q);
        const noteMatch = (item.note || '').toLowerCase().includes(q);

        const dateCo = itemDate.toLocaleDateString('es-CO');
        const dateHyphen = dateCo.replace(/\//g, '-');
        const dateIso = itemDate.toISOString().slice(0, 10);
        const monthLong = itemDate.toLocaleDateString('es-CO', { month: 'long' }).toLowerCase();
        const monthShort = itemDate.toLocaleDateString('es-CO', { month: 'short' }).toLowerCase();
        const weekday = itemDate.toLocaleDateString('es-CO', { weekday: 'long' }).toLowerCase();
        const timeStr = itemDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }).toLowerCase();

        const dateMatch =
          dateCo.includes(q) ||
          dateHyphen.includes(q) ||
          dateIso.includes(q) ||
          monthLong.includes(q) ||
          monthShort.includes(q) ||
          weekday.includes(q) ||
          timeStr.includes(q);

        let statusMatch = false;
        if (isBalanced && (q.includes('cuadr') || q.includes('ok') || q.includes('exacto') || q.includes('cero'))) {
          statusMatch = true;
        }
        if (!isBalanced && (q.includes('descuadr') || q.includes('diferencia') || q.includes('alerta'))) {
          statusMatch = true;
        }
        if (isShortage && (q.includes('faltan') || q.includes('menos') || q.includes('perdida'))) {
          statusMatch = true;
        }
        if (isSurplus && (q.includes('sobran') || q.includes('mas') || q.includes('exced'))) {
          statusMatch = true;
        }

        let amountMatch = false;
        if (cleanQ.length >= 2 && !isNaN(Number(cleanQ))) {
          const salesStr = Math.round(item.totalSales).toString();
          const cashStr = Math.round(item.actualCashCounted ?? item.totalCash).toString();
          const diffStr = Math.abs(Math.round(diff)).toString();
          amountMatch = salesStr.includes(cleanQ) || cashStr.includes(cleanQ) || diffStr.includes(cleanQ);
        }

        if (!cashierMatch && !noteMatch && !dateMatch && !statusMatch && !amountMatch) {
          return false;
        }
      }

      return true;
    });
  }, [history, searchQuery, dateFilter, customDate, statusFilter, cashierFilter]);

  const totalFilteredSales = useMemo(() => {
    return filteredHistory.reduce((sum, h) => sum + (h.totalSales || 0), 0);
  }, [filteredHistory]);

  const balancedCount = useMemo(() => {
    return filteredHistory.filter((h) => {
      const diff = h.cashDifference ?? ((h.actualCashCounted ?? h.totalCash) - h.totalCash);
      return diff === 0;
    }).length;
  }, [filteredHistory]);

  const discrepancyCount = filteredHistory.length - balancedCount;

  const handlePrint = () => {
    playSound('print');
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container cash-history-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '920px', width: '95%', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="cash-close-head-box">
            <History size={22} className="modal-icon-header" />
            <div>
              <h2 className="modal-title">Historial de Cierres de Turno & Arqueos</h2>
              <span className="modal-subtitle">
                Auditoría histórica de jornadas, cajeros y cuadres de caja
              </span>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar de Búsqueda y Filtros Avanzados */}
        <div className="cash-history-toolbar">
          <div className="cash-history-filters-main">
            {/* Input de Búsqueda */}
            <div className="cash-history-search-box">
              <Search size={15} className="cash-history-search-icon" />
              <input
                type="text"
                placeholder="Buscar por cajero, fecha, hora, monto u observación..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="cash-history-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="cash-history-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Borrar texto de búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Grupo de Selectores */}
            <div className="cash-history-select-group">
              {/* Filtro Período */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="cash-history-select"
                title="Filtrar por período"
              >
                <option value="all">📅 Todas las fechas</option>
                <option value="today">Hoy</option>
                <option value="yesterday">Ayer</option>
                <option value="week">Últimos 7 días</option>
                <option value="month">Este mes</option>
                <option value="custom">Día específico...</option>
              </select>

              {/* Input de Fecha Específica */}
              {dateFilter === 'custom' && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="cash-history-date-input"
                  title="Seleccionar fecha específica"
                />
              )}

              {/* Filtro de Estado de Cuadre */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="cash-history-select"
                title="Filtrar por estado de cuadre"
              >
                <option value="all">⚖️ Todos los estados</option>
                <option value="balanced">✓ Solo Cuadrados ($0)</option>
                <option value="diff">⚠️ Con Descuadre</option>
                <option value="shortage">▼ Solo Faltantes</option>
                <option value="surplus">▲ Solo Sobrantes</option>
              </select>

              {/* Filtro por Cajero */}
              {uniqueCashiers.length > 1 && (
                <select
                  value={cashierFilter}
                  onChange={(e) => setCashierFilter(e.target.value)}
                  className="cash-history-select"
                  title="Filtrar por responsable"
                >
                  <option value="all">👤 Todos los cajeros</option>
                  {uniqueCashiers.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              {/* Botón Limpiar Filtros */}
              {isFilterActive && (
                <button
                  type="button"
                  className="btn-cash-history-reset"
                  onClick={handleResetFilters}
                  title="Restablecer todos los filtros"
                >
                  <RotateCcw size={13} />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>

          {/* Tira Resumen y Estadísticas de la Búsqueda */}
          <div className="cash-history-meta-bar">
            <div className="cash-history-meta-chips">
              <span className="cash-history-pill">
                <strong>{filteredHistory.length}</strong> {filteredHistory.length === 1 ? 'cierre' : 'cierres'}
                {filteredHistory.length !== history.length && ` (de ${history.length})`}
              </span>

              {filteredHistory.length > 0 && (
                <>
                  <span className="cash-history-pill pill-sales">
                    Total Facturado: <strong>{formatCurrency(totalFilteredSales)}</strong>
                  </span>

                  {discrepancyCount === 0 ? (
                    <span className="cash-history-pill pill-balanced">
                      ✓ Todos Cuadrados
                    </span>
                  ) : (
                    <span className="cash-history-pill pill-alert">
                      ⚠️ {discrepancyCount} con Descuadre
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content List */}
        <div className="cash-history-body" style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 200px)', padding: '1rem' }}>
          {filteredHistory.length === 0 ? (
            <div className="cash-history-empty-state">
              <History size={44} className="empty-icon text-muted" />
              <h3>No se encontraron registros de cierre</h3>
              <p>
                {isFilterActive
                  ? 'No hay cierres que coincidan con los filtros o el texto de búsqueda ingresado.'
                  : 'Los arqueos y cierres de turno que guardes en la caja aparecerán aquí con su comprobante térmico.'}
              </p>
              {isFilterActive && (
                <button
                  type="button"
                  className="btn-empty-reset"
                  onClick={handleResetFilters}
                >
                  <RotateCcw size={14} />
                  <span>Restablecer filtros de búsqueda</span>
                </button>
              )}
            </div>
          ) : (
            <div className="cash-history-list">
              {filteredHistory.map((item) => {
                const diff = item.cashDifference ?? ((item.actualCashCounted ?? item.totalCash) - item.totalCash);
                const isBalanced = diff === 0;
                const isSurplus = diff > 0;

                return (
                  <div
                    key={item.id}
                    className={`cash-history-card ${isBalanced ? 'card-balanced' : 'card-discrepancy'}`}
                  >
                    <div className="history-card-header">
                      <div className="header-meta">
                        <span className="history-date">
                          <Calendar size={14} />
                          {new Date(item.closedAt).toLocaleString('es-CO', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                        <span className="history-cashier">
                          <User size={14} />
                          Responsable: <strong>{item.cashier}</strong>
                        </span>
                      </div>

                      <div className="header-actions">
                        <button
                          type="button"
                          className="btn-history-ticket"
                          onClick={() => setSelectedRecord(item)}
                          title="Ver o reimprimir comprobante térmico de este cierre"
                        >
                          <Printer size={14} />
                          <span>Ver Comprobante</span>
                        </button>
                      </div>
                    </div>

                    {/* Grid de Métricas Principales (Total, Efectivo, Tarjetas, QR) */}
                    <div className="history-card-grid">
                      <div className="history-grid-col">
                        <span className="h-lbl">Total Facturado</span>
                        <span className="h-val text-emerald">{formatCurrency(item.totalSales)}</span>
                        <span className="h-sub">{item.salesCount} ventas</span>
                      </div>

                      <div className="history-grid-col">
                        <span className="h-lbl">Efectivo en Gaveta</span>
                        <span className="h-val">{formatCurrency(item.actualCashCounted ?? item.totalCash)}</span>
                        <span className="h-sub">Sistema: {formatCurrency(item.totalCash)}</span>
                      </div>

                      <div className="history-grid-col">
                        <span className="h-lbl">Datáfono / Tarjetas</span>
                        <span className="h-val">{formatCurrency(item.totalCard || 0)}</span>
                        <span className="h-sub">Vouchers bancarios</span>
                      </div>

                      <div className="history-grid-col">
                        <span className="h-lbl">QR / Transferencias</span>
                        <span className="h-val">{formatCurrency(item.totalTransfer || 0)}</span>
                        <span className="h-sub">Nequi / Daviplata</span>
                      </div>
                    </div>

                    {/* Tira de Verificación de Cuadre de TODOS los Medios de Pago */}
                    <div className="history-methods-strip">
                      <div className="history-method-chips-left">
                        {/* Estado Efectivo */}
                        <span
                          className={`history-method-chip ${
                            isBalanced
                              ? 'diff-balanced'
                              : isSurplus
                              ? 'diff-surplus'
                              : 'diff-shortage'
                          }`}
                        >
                          <Banknote size={13} />
                          {isBalanced && '✓ Efectivo Cuadrado ($0)'}
                          {isSurplus && `▲ Efectivo Sobrante: +${formatCurrency(diff)}`}
                          {!isBalanced && !isSurplus && `▼ Efectivo Faltante: ${formatCurrency(diff)}`}
                        </span>

                        {/* Estado Datáfono */}
                        <span className="history-method-chip chip-card">
                          <CreditCard size={13} />
                          {(item.totalCard || 0) > 0
                            ? `✓ Datáfono Cuadrado (${formatCurrency(item.totalCard || 0)})`
                            : 'Datáfono: $0'}
                        </span>

                        {/* Estado Transferencias */}
                        <span className="history-method-chip chip-transfer">
                          <QrCode size={13} />
                          {(item.totalTransfer || 0) > 0
                            ? `✓ QR/Nequi Cuadrado (${formatCurrency(item.totalTransfer || 0)})`
                            : 'QR/Nequi: $0'}
                        </span>
                      </div>

                      {/* Estado Global de la Jornada */}
                      <span
                        className={`history-method-chip chip-global ${
                          isBalanced ? 'global-balanced' : 'global-alert'
                        }`}
                      >
                        {isBalanced ? (
                          <>
                            <CheckCircle2 size={13} />
                            <span>Jornada 100% Cuadrada</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={13} />
                            <span>Descuadre en Efectivo</span>
                          </>
                        )}
                      </span>
                    </div>

                    {item.note && (
                      <div className="history-card-note">
                        <span className="note-title">Observaciones:</span>
                        <span className="note-body">{item.note}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Ticket Térmico de Cierre Seleccionado */}
      {selectedRecord && (
        <div
          className="modal-backdrop closing-preview-backdrop"
          onClick={() => setSelectedRecord(null)}
          style={{ zIndex: 1100 }}
        >
          <div
            className="modal-container ticket-modal-wrapper"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ticket-modal-header no-print">
              <div>
                <h3 className="modal-title">Comprobante de Arqueo Guardado</h3>
                <span className="modal-subtitle">
                  Ticket térmico oficial de cierre de turno (80mm)
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedRecord(null)}
                title="Cerrar ticket"
              >
                <X size={18} />
              </button>
            </div>

            <div className="receipt-paper" id="printable-receipt">
              <div className="receipt-brand-header">
                <svg
                  viewBox="0 0 500 500"
                  className="receipt-logo"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label="La Molienda Logo"
                >
                  <g className="receipt-logo-paths" fillRule="evenodd">
                    <path d="M 225.14 58.61 L 224.94 19.36 L 275.06 19.36 L 274.86 58.61 A 193 193 0 0 1 324.17 71.82 L 343.62 37.73 L 387.02 62.79 L 367.22 96.68 A 193 193 0 0 1 403.32 132.78 L 437.21 112.98 L 462.27 156.38 L 428.18 175.83 A 193 193 0 0 1 441.39 225.14 L 480.64 224.94 L 480.64 275.06 L 441.39 274.86 A 193 193 0 0 1 428.18 324.17 L 462.27 343.62 L 437.21 387.02 L 403.32 367.22 A 193 193 0 0 1 367.22 403.32 L 387.02 437.21 L 343.62 462.27 L 324.17 428.18 A 193 193 0 0 1 274.86 441.39 L 275.06 480.64 L 224.94 480.64 L 225.14 441.39 A 193 193 0 0 1 175.83 428.18 L 156.38 462.27 L 112.98 437.21 L 132.78 403.32 A 193 193 0 0 1 96.68 367.22 L 62.79 387.02 L 37.73 343.62 L 71.82 324.17 A 193 193 0 0 1 58.61 274.86 L 19.36 275.06 L 19.36 224.94 L 58.61 225.14 A 193 193 0 0 1 71.82 175.83 L 37.73 156.38 L 62.79 112.98 L 96.68 132.78 A 193 193 0 0 1 132.78 96.68 L 112.98 62.79 L 156.38 37.73 L 175.83 71.82 A 193 193 0 0 1 225.14 58.61 Z M 413 250 A 163 163 0 1 0 87 250 A 163 163 0 1 0 413 250 Z" />
                    <path d="M 241 142 C 172 154, 166 210, 167 250 C 168 290, 174 346, 241 358 C 246 358, 248 354, 248 349 C 248 344, 258 310, 258 304 C 258 290, 246 265, 242 250 C 238 235, 226 210, 227 195 C 228 185, 236 150, 238 145 C 239 142, 240 142, 241 142 Z" fillRule="nonzero" />
                    <path d="M 259 142 C 260 145, 262 147, 262 152 C 262 165, 252 185, 245 195 C 238 205, 254 235, 258 250 C 262 265, 274 290, 274 304 C 274 318, 254 348, 252 353 C 252 357, 255 358, 259 358 C 326 346, 332 290, 333 250 C 334 210, 328 154, 259 142 Z" fillRule="nonzero" />
                  </g>
                </svg>
                <h2 className="receipt-company">LA MOLIENDA</h2>
                <span className="receipt-tagline">CAFÉ DE ESPECIALIDAD &amp; COCTELERÍA</span>
                <div className="receipt-meta-contact">
                  <span>NIT: 1000859878-8 • Régimen Simple</span>
                </div>
              </div>

              <div className="receipt-divider-dashed" />
              <div className="closing-print-title">ARQUEO DE CAJA / CIERRE DE TURNO</div>
              <div className="receipt-divider-dashed" />

              <div className="receipt-info-block">
                <div className="info-line">
                  <span>FECHA / HORA:</span>
                  <span>{new Date(selectedRecord.closedAt).toLocaleString('es-CO')}</span>
                </div>
                <div className="info-line">
                  <span>RESPONSABLE:</span>
                  <strong>{selectedRecord.cashier}</strong>
                </div>
                <div className="info-line">
                  <span>VENTAS DEL TURNO:</span>
                  <strong>{selectedRecord.salesCount} ventas</strong>
                </div>
              </div>

              <div className="receipt-divider-solid" />
              <div className="closing-print-section">VENTAS POR MEDIO DE PAGO</div>
              <div className="receipt-totals-block">
                <div className="receipt-total-row">
                  <span>EFECTIVO:</span>
                  <span>{formatCurrency(selectedRecord.totalCash)}</span>
                </div>
                <div className="receipt-total-row">
                  <span>TARJETA / DATÁFONO:</span>
                  <span>{formatCurrency(selectedRecord.totalCard)}</span>
                </div>
                <div className="receipt-total-row">
                  <span>TRANSFERENCIA / QR:</span>
                  <span>{formatCurrency(selectedRecord.totalTransfer)}</span>
                </div>
                {selectedRecord.totalMixed !== undefined && selectedRecord.totalMixed > 0 && (
                  <div className="receipt-total-row">
                    <span>PAGO DIVIDIDO:</span>
                    <span>{formatCurrency(selectedRecord.totalMixed)}</span>
                  </div>
                )}
                <div className="receipt-divider-dashed" />
                <div className="receipt-total-row receipt-grand-total">
                  <span>TOTAL FACTURADO:</span>
                  <span className="grand-price">{formatCurrency(selectedRecord.totalSales)}</span>
                </div>
              </div>

              <div className="receipt-divider-solid" />
              <div className="closing-print-section">ARQUEO FÍSICO DE EFECTIVO</div>
              <div className="receipt-totals-block">
                <div className="receipt-total-row">
                  <span>EFECTIVO EN SISTEMA:</span>
                  <span>{formatCurrency(selectedRecord.totalCash)}</span>
                </div>
                <div className="receipt-total-row">
                  <span>EFECTIVO CONTADO:</span>
                  <span>{formatCurrency(selectedRecord.actualCashCounted ?? selectedRecord.totalCash)}</span>
                </div>
                <div className="receipt-divider-dashed" />
                <div className="receipt-total-row receipt-grand-total">
                  <span>
                    {(selectedRecord.cashDifference ?? 0) === 0
                      ? 'CAJA CUADRADA:'
                      : (selectedRecord.cashDifference ?? 0) > 0
                      ? 'SOBRANTE:'
                      : 'FALTANTE:'}
                  </span>
                  <span className="grand-price">
                    {(selectedRecord.cashDifference ?? 0) > 0 ? '+' : ''}
                    {formatCurrency(selectedRecord.cashDifference ?? 0)}
                  </span>
                </div>
              </div>

              {selectedRecord.note && selectedRecord.note.trim() && (
                <>
                  <div className="receipt-divider-dashed" />
                  <div className="closing-print-section">OBSERVACIONES</div>
                  <div className="closing-print-note">{selectedRecord.note.trim()}</div>
                </>
              )}

              <div className="receipt-divider-dashed" />
              <div className="closing-print-signs">
                <div className="closing-sign-line">Firma del responsable ({selectedRecord.cashier})</div>
              </div>

              <div className="receipt-footer">
                <p className="footer-notice">DOCUMENTO INTERNO DE CONTROL - NO ES FACTURA</p>
              </div>
            </div>

            <div className="ticket-modal-actions ticket-modal-single-action no-print">
              <button
                type="button"
                className="btn-print-receipt"
                onClick={handlePrint}
                title="Imprimir ticket térmico en 80mm"
              >
                <Printer size={15} />
                <span>Imprimir</span>
                <span className="print-format-badge">80mm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
