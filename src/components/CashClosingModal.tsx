import React, { useState } from 'react';
import { X, CheckCircle, Printer, DollarSign, AlertCircle, AlertTriangle, Lock, Receipt, Banknote, CreditCard, QrCode } from 'lucide-react';
import { SaleRecord, CashClosingSummary, Table } from '../types';
import { formatCurrency } from '../utils/storage';
import { getCashClosingHistory, saveCashClosingHistory } from '../utils/cashClosing';
import { playSound } from '../utils/sounds';

interface CashClosingModalProps {
  isOpen: boolean;
  sales: SaleRecord[];
  tables?: Table[];
  currentStaff: string;
  onClose: () => void;
  onConfirmCloseShift: (summary: CashClosingSummary) => void;
}

export const CashClosingModal: React.FC<CashClosingModalProps> = ({
  isOpen,
  sales,
  tables = [],
  currentStaff,
  onClose,
  onConfirmCloseShift,
}) => {
  if (!isOpen) return null;

  const [showPreview, setShowPreview] = useState(false);

  // Detect open tables with active orders
  const openTables = tables.filter(
    (t) => t.status === 'ocupada' || t.status === 'por_cobrar' || (t.items && t.items.length > 0)
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter(
    (s) => s.status === 'completada' && s.date.slice(0, 10) === todayStr
  );

  const totalCash = todaySales
    .filter((s) => s.paymentMethod === 'efectivo')
    .reduce((sum, s) => sum + s.total, 0);

  const totalCard = todaySales
    .filter((s) => s.paymentMethod === 'tarjeta')
    .reduce((sum, s) => sum + s.total, 0);

  const totalTransfer = todaySales
    .filter((s) => s.paymentMethod === 'transferencia')
    .reduce((sum, s) => sum + s.total, 0);

  const totalMixed = todaySales
    .filter((s) => s.paymentMethod === 'mixto')
    .reduce((sum, s) => sum + s.total, 0);

  const grandTotal = todaySales.reduce((sum, s) => sum + s.total, 0);

  const [actualCashCounted, setActualCashCounted] = useState<number | ''>(totalCash);
  const [closingNote, setClosingNote] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showWarningOpenTablesModal, setShowWarningOpenTablesModal] = useState(false);
  const [showStandardConfirmModal, setShowStandardConfirmModal] = useState(false);

  const numCounted = Number(actualCashCounted) || 0;
  const cashDifference = numCounted - totalCash;

  const handlePrint = () => {
    playSound('print');
    window.print();
  };

  const handleOpenConfirmation = () => {
    if (actualCashCounted === '' || isNaN(Number(actualCashCounted))) {
      setValidationError('Por favor ingresa un monto numérico válido para el efectivo contado.');
      return;
    }
    setValidationError('');

    if (openTables.length > 0) {
      setShowWarningOpenTablesModal(true);
    } else {
      setShowStandardConfirmModal(true);
    }
  };

  const executeShiftClose = () => {
    setShowWarningOpenTablesModal(false);
    setShowStandardConfirmModal(false);

    // Build comprehensive summary object
    const summary: CashClosingSummary = {
      id: `close-${Date.now()}`,
      closedAt: new Date().toISOString(),
      cashier: currentStaff,
      totalCash,
      totalCard,
      totalTransfer,
      totalMixed,
      totalTips: 0,
      totalSales: grandTotal,
      salesCount: todaySales.length,
      actualCashCounted: numCounted,
      cashDifference,
      note: closingNote.trim(),
    };

    // Persist summary in local storage (newest first)
    const history = getCashClosingHistory();
    saveCashClosingHistory([summary, ...history]);

    // Notify parent
    onConfirmCloseShift(summary);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container cash-closing-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="cash-close-head-box">
            <Lock size={22} className="modal-icon-header" />
            <div>
              <h2 className="modal-title">Cierre de Caja & Arqueo del Turno</h2>
              <span className="modal-subtitle">
                Fecha: {new Date().toLocaleDateString('es-CO')} • Responsable: {currentStaff}
              </span>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        <div className="cash-close-body">
          {/* Warning banner if open tables exist (Decorado premium) */}
          {openTables.length > 0 && (
            <div className="cash-closing-warning-banner">
              <div className="warning-card-accent-bar" />
              <div className="warning-banner-icon-box">
                <AlertTriangle size={20} className="warning-banner-icon" />
              </div>
              <div className="warning-banner-text">
                <div className="warning-banner-header-row">
                  <span className="warning-banner-title">
                    Atención: Hay {openTables.length} mesa(s) con órdenes o consumo sin cobrar
                  </span>
                  <span className="warning-badge-pill">PENDIENTE</span>
                </div>
                <div className="warning-banner-details">
                  <div className="warning-tables-chips-list">
                    <span className="warning-details-intro">Mesas abiertas:</span>
                    {openTables.map((t) => (
                      <span key={t.id} className="warning-table-chip">
                        {t.number}
                      </span>
                    ))}
                  </div>
                  <span className="warning-details-hint">
                    Se sugiere cobrar o desocupar estas mesas antes de realizar el arqueo.
                  </span>
                </div>
              </div>
              <div className="warning-card-watermark">
                <AlertTriangle size={72} />
              </div>
            </div>
          )}

          {/* Grand Total de la Jornada (Informativo consolidado) */}
          <div className="closing-grand-banner">
            <div className="grand-banner-left">
              <span className="grand-title">TOTAL FACTURADO EN EL DÍA:</span>
              <span className="grand-subtitle">
                Consolidado de todas las ventas ({todaySales.length} órdenes)
              </span>
            </div>
            <span className="grand-val">{formatCurrency(grandTotal)}</span>
          </div>

          {/* Breakdown cards por canal con decoración visual premium */}
          <div className="closing-metrics-grid">
            {/* 1. Tarjeta de Efectivo */}
            <div className="closing-metric-card closing-metric-cash highlight-cash-card">
              <div className="metric-card-accent-bar bar-cash" />
              <div className="metric-card-header">
                <span className="c-lbl">Efectivo en Caja (Sistema):</span>
                <div className="metric-icon-badge cash-badge" title="Dinero físico en caja">
                  <Banknote size={15} />
                </div>
              </div>
              <span className="c-val text-cash">{formatCurrency(totalCash)}</span>
              <div className="card-sub-pill-row">
                <span className="c-badge-pill pill-cash">A ARQUEAR</span>
                <span className="c-sub">Billetes en gaveta</span>
              </div>
              <div className="metric-card-watermark watermark-cash">
                <Banknote size={54} />
              </div>
            </div>

            {/* 2. Tarjeta de Tarjetas / Datáfono */}
            <div className="closing-metric-card closing-metric-card-pay">
              <div className="metric-card-accent-bar bar-card" />
              <div className="metric-card-header">
                <span className="c-lbl">Tarjetas / Datáfono:</span>
                <div className="metric-icon-badge card-badge" title="Pagos con tarjeta / datáfono">
                  <CreditCard size={15} />
                </div>
              </div>
              <span className="c-val text-card">{formatCurrency(totalCard)}</span>
              <div className="card-sub-pill-row">
                <span className="c-badge-pill pill-card">VOUCHERS</span>
                <span className="c-sub">En cuenta bancaria</span>
              </div>
              <div className="metric-card-watermark watermark-card">
                <CreditCard size={54} />
              </div>
            </div>

            {/* 3. Tarjeta de Transferencias (QR/Nequi) */}
            <div className="closing-metric-card closing-metric-transfer">
              <div className="metric-card-accent-bar bar-transfer" />
              <div className="metric-card-header">
                <span className="c-lbl">Transferencias (QR/Nequi):</span>
                <div className="metric-icon-badge transfer-badge" title="Transferencias QR / Nequi / Bancolombia">
                  <QrCode size={15} />
                </div>
              </div>
              <span className="c-val text-transfer">{formatCurrency(totalTransfer)}</span>
              <div className="card-sub-pill-row">
                <span className="c-badge-pill pill-transfer">DIGITAL</span>
                <span className="c-sub">En cuenta bancaria</span>
              </div>
              <div className="metric-card-watermark watermark-transfer">
                <QrCode size={54} />
              </div>
            </div>
          </div>

          {/* Physical Cash Count and Arqueo */}
          <div className="physical-count-box">
            <div className="physical-count-header">
              <h3 className="section-title">Arqueo Físico de Efectivo en Gaveta</h3>
              <p className="section-desc">
                Ingresa únicamente el dinero físico (monedas y billetes) contado en el cajón de la caja.
              </p>
            </div>

            <div className="form-group">
              <div className="count-label-split">
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Efectivo Contado en Gaveta ($) *
                </label>
                <div className="target-cash-tag">
                  Esperado en efectivo: <strong>{formatCurrency(totalCash)}</strong>
                </div>
              </div>

              <div className="price-input-wrapper" style={{ marginTop: '0.45rem' }}>
                <span className="price-prefix">$</span>
                <input
                  type="number"
                  value={actualCashCounted}
                  placeholder={`Ej: ${totalCash}`}
                  onChange={(e) => {
                    setValidationError('');
                    setActualCashCounted(
                      e.target.value === '' ? '' : parseFloat(e.target.value)
                    );
                  }}
                  className="form-input price-input-highlight"
                />
              </div>
              {validationError && (
                <div className="cash-input-error-msg">
                  <AlertCircle size={14} />
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            {/* Difference indicator */}
            <div
              className={`difference-badge ${
                cashDifference === 0
                  ? 'diff-balanced'
                  : cashDifference > 0
                  ? 'diff-surplus'
                  : 'diff-shortage'
              }`}
            >
              {cashDifference === 0 && (
                <span>✓ Caja Exactamente Cuadrada ($0 de diferencia en efectivo)</span>
              )}
              {cashDifference > 0 && (
                <span>▲ Sobrante en efectivo: +{formatCurrency(cashDifference)}</span>
              )}
              {cashDifference < 0 && (
                <span>▼ Faltante en efectivo: {formatCurrency(cashDifference)}</span>
              )}
            </div>

            {/* Aclaración de pagos electrónicos */}
            {(totalCard > 0 || totalTransfer > 0) && (
              <div className="electronic-reassurance-note">
                <span>
                  💳 <strong>No contar en gaveta:</strong> Los <strong>{formatCurrency(totalCard)}</strong> de datáfono y <strong>{formatCurrency(totalTransfer)}</strong> de transferencias ya están en el banco y no forman parte del efectivo físico.
                </span>
              </div>
            )}

            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label className="form-label">Observaciones del Cierre de Caja:</label>
              <textarea
                rows={2}
                placeholder="Novedades del turno, retiro de caja menor, base inicial..."
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                className="form-textarea"
              />
            </div>
          </div>
        </div>

        <div className="modal-footer cash-closing-footer">
          <button type="button" className="btn-cancel btn-closing-cancel" onClick={onClose}>
            <X size={15} />
            <span>Cancelar</span>
          </button>
          <button
            type="button"
            className="btn-print-receipt btn-closing-print"
            onClick={() => setShowPreview(true)}
            title="Previsualizar comprobante térmico del arqueo antes de imprimir"
          >
            <Printer size={15} />
            <span>Imprimir</span>
            <span className="print-format-badge">80mm</span>
          </button>
          <button
            type="button"
            className="btn-confirm-payment btn-closing-submit"
            onClick={handleOpenConfirmation}
          >
            <CheckCircle size={16} />
            <span>Guardar & Cerrar Turno</span>
          </button>
        </div>
      </div>

      {/* MODAL DE PREVISUALIZACIÓN DEL ARQUEO (TICKET TÉRMICO 80mm) */}
      {showPreview && (
        <div
          className="modal-backdrop closing-preview-backdrop"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="modal-container ticket-modal-wrapper"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Ticket Modal */}
            <div className="ticket-modal-header no-print">
              <div>
                <h3 className="modal-title">Previsualización de Arqueo</h3>
                <span className="modal-subtitle">
                  Comprobante térmico para cierre de turno (80mm)
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowPreview(false)}
                title="Cerrar previsualización"
              >
                <X size={18} />
              </button>
            </div>

            {/* Hoja de papel térmico (id="printable-receipt" para impresión 80mm) */}
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
                  <span>{new Date().toLocaleString('es-CO')}</span>
                </div>
                <div className="info-line">
                  <span>RESPONSABLE:</span>
                  <strong>{currentStaff}</strong>
                </div>
                <div className="info-line">
                  <span>VENTAS DEL DÍA:</span>
                  <strong>{todaySales.length} ventas</strong>
                </div>
              </div>

              <div className="receipt-divider-solid" />

              <div className="closing-print-section">VENTAS POR MEDIO DE PAGO</div>
              <div className="receipt-totals-block">
                <div className="receipt-total-row">
                  <span>EFECTIVO:</span>
                  <span>{formatCurrency(totalCash)}</span>
                </div>
                <div className="receipt-total-row">
                  <span>TARJETA / DATÁFONO:</span>
                  <span>{formatCurrency(totalCard)}</span>
                </div>
                <div className="receipt-total-row">
                  <span>TRANSFERENCIA / QR:</span>
                  <span>{formatCurrency(totalTransfer)}</span>
                </div>
                {totalMixed > 0 && (
                  <div className="receipt-total-row">
                    <span>PAGO DIVIDIDO:</span>
                    <span>{formatCurrency(totalMixed)}</span>
                  </div>
                )}
                <div className="receipt-divider-dashed" />
                <div className="receipt-total-row receipt-grand-total">
                  <span>TOTAL FACTURADO:</span>
                  <span className="grand-price">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              <div className="receipt-divider-solid" />

              <div className="closing-print-section">ARQUEO FÍSICO DE EFECTIVO</div>
              <div className="receipt-totals-block">
                <div className="receipt-total-row">
                  <span>EFECTIVO EN SISTEMA:</span>
                  <span>{formatCurrency(totalCash)}</span>
                </div>
                <div className="receipt-total-row">
                  <span>EFECTIVO CONTADO:</span>
                  <span>{formatCurrency(numCounted)}</span>
                </div>
                <div className="receipt-divider-dashed" />
                <div className="receipt-total-row receipt-grand-total">
                  <span>
                    {cashDifference === 0
                      ? 'CAJA CUADRADA:'
                      : cashDifference > 0
                      ? 'SOBRANTE:'
                      : 'FALTANTE:'}
                  </span>
                  <span className="grand-price">
                    {cashDifference > 0 ? '+' : ''}
                    {formatCurrency(cashDifference)}
                  </span>
                </div>
              </div>

              {closingNote.trim() && (
                <>
                  <div className="receipt-divider-dashed" />
                  <div className="closing-print-section">OBSERVACIONES</div>
                  <div className="closing-print-note">{closingNote.trim()}</div>
                </>
              )}

              <div className="receipt-divider-dashed" />

              <div className="closing-print-signs">
                <div className="closing-sign-line">Firma del responsable ({currentStaff})</div>
              </div>

              <div className="receipt-footer">
                <p className="footer-notice">DOCUMENTO INTERNO DE CONTROL - NO ES FACTURA</p>
              </div>
            </div>

            {/* Acciones del pie de la Previsualización */}
            <div className="ticket-modal-actions no-print">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowPreview(false)}
              >
                Volver al Arqueo
              </button>
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
      {/* MODAL PERSONALIZADO: ADVERTENCIA DE MESAS ABIERTAS */}
      {showWarningOpenTablesModal && (
        <div
          className="modal-backdrop custom-closing-confirm-backdrop"
          onClick={() => setShowWarningOpenTablesModal(false)}
          style={{ zIndex: 1200 }}
        >
          <div
            className="modal-container custom-closing-confirm-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del aviso */}
            <div className="custom-closing-confirm-header">
              <div className="warning-shield-glow">
                <AlertTriangle size={30} className="glow-warning-icon" />
              </div>
              <div className="header-titles">
                <h3 className="confirm-main-title">Mesas con Consumo Pendiente</h3>
                <span className="confirm-main-subtitle">
                  Se detectaron <strong>{openTables.length} mesas</strong> con órdenes abiertas sin facturar
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowWarningOpenTablesModal(false)}
                title="Cerrar aviso"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo del aviso */}
            <div className="custom-closing-confirm-body">
              <p className="confirm-intro-text">
                Si cierras el turno ahora, estas mesas permanecerán abiertas en el salón para el siguiente turno, pero su dinero <strong>no ingresará al arqueo actual</strong> de caja:
              </p>

              {/* Lista interactiva de mesas abiertas con sus montos */}
              <div className="open-tables-visual-grid">
                {openTables.map((table) => {
                  const tableTotal =
                    table.total ||
                    (table.items || []).reduce(
                      (acc, it) => acc + it.unitPrice * it.quantity,
                      0
                    );
                  return (
                    <div key={table.id} className="open-table-badge-item">
                      <div className="table-badge-left">
                        <span className="table-badge-num">{table.number}</span>
                        <span className="table-badge-zone">{table.zone.toUpperCase()}</span>
                      </div>
                      <div className="table-badge-right">
                        <span className="table-badge-items">
                          {(table.items || []).length} ítems
                        </span>
                        <span className="table-badge-total">
                          {formatCurrency(tableTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="confirm-recommendation-banner">
                <AlertCircle size={16} className="recom-icon" />
                <span>
                  <strong>Recomendación:</strong> Se aconseja regresar, solicitar la cuenta a los clientes y facturar todas las mesas antes de cerrar la jornada.
                </span>
              </div>
            </div>

            {/* Botones de acción mejorados */}
            <div className="custom-closing-confirm-footer">
              <button
                type="button"
                className="btn-confirm-return-tables"
                onClick={() => setShowWarningOpenTablesModal(false)}
              >
                <span>Volver y Cobrar Mesas</span>
              </button>

              <button
                type="button"
                className="btn-confirm-force-close"
                onClick={executeShiftClose}
                title="Cerrar el turno dejando las mesas abiertas para la siguiente jornada"
              >
                <CheckCircle size={16} />
                <span>Forzar Cierre de Turno</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PERSONALIZADO: CONFIRMACIÓN ESTÁNDAR CUANDO TODO ESTÁ AL DÍA */}
      {showStandardConfirmModal && (
        <div
          className="modal-backdrop custom-closing-confirm-backdrop"
          onClick={() => setShowStandardConfirmModal(false)}
          style={{ zIndex: 1200 }}
        >
          <div
            className="modal-container custom-closing-confirm-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
          >
            <div className="custom-closing-confirm-header">
              <div className="success-shield-glow">
                <CheckCircle size={28} className="glow-success-icon" />
              </div>
              <div className="header-titles">
                <h3 className="confirm-main-title">Confirmar Cierre de Turno</h3>
                <span className="confirm-main-subtitle">
                  Todas las mesas están al día. Revisa los datos finales:
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowStandardConfirmModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="custom-closing-confirm-body">
              <div className="standard-confirm-summary-list">
                <div className="summary-row">
                  <span>Cajero Responsable:</span>
                  <strong>{currentStaff}</strong>
                </div>
                <div className="summary-row">
                  <span>Total Facturado:</span>
                  <strong className="text-emerald">{formatCurrency(grandTotal)}</strong>
                </div>
                <div className="summary-row">
                  <span>Efectivo Físico Contado:</span>
                  <strong>{formatCurrency(numCounted)}</strong>
                </div>
                <div className="summary-row">
                  <span>Estado del Arqueo:</span>
                  <strong
                    className={
                      cashDifference === 0
                        ? 'text-emerald'
                        : cashDifference > 0
                        ? 'text-amber'
                        : 'text-rose'
                    }
                  >
                    {cashDifference === 0
                      ? '✓ Caja Cuadrada ($0)'
                      : cashDifference > 0
                      ? `▲ Sobrante: +${formatCurrency(cashDifference)}`
                      : `▼ Faltante: ${formatCurrency(cashDifference)}`}
                  </strong>
                </div>
              </div>
            </div>

            <div className="custom-closing-confirm-footer">
              <button
                type="button"
                className="btn-confirm-return-tables"
                onClick={() => setShowStandardConfirmModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-confirm-save-shift"
                onClick={executeShiftClose}
              >
                <CheckCircle size={16} />
                <span>Confirmar y Guardar Turno</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
