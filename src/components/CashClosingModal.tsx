import React, { useState } from 'react';
import { X, CheckCircle, Printer, DollarSign, AlertCircle, AlertTriangle, Lock, Receipt } from 'lucide-react';
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

  const numCounted = Number(actualCashCounted) || 0;
  const cashDifference = numCounted - totalCash;

  const handlePrint = () => {
    playSound('print');
    window.print();
  };

  const handleCloseShift = () => {
    // Validate counted cash
    if (isNaN(numCounted)) {
      alert('El efectivo contado debe ser un número válido.');
      return;
    }

    // Check for open tables and warn user
    if (openTables.length > 0) {
      const openNames = openTables.map((t) => t.number).join(', ');
      const confirmOpen = window.confirm(
        `⚠️ ATENCIÓN: Hay ${openTables.length} mesa(s) con órdenes pendientes de pago:\n(${openNames})\n\n¿Estás seguro de que deseas cerrar el turno de todas formas dejando estas mesas abiertas?`
      );
      if (!confirmOpen) return;
    } else {
      // Standard confirmation
      if (!window.confirm('¿Confirmar el cierre del turno y registrar el arqueo de caja de la jornada?')) {
        return;
      }
    }

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
          {/* Warning banner if open tables exist */}
          {openTables.length > 0 && (
            <div className="cash-closing-warning-banner">
              <AlertTriangle size={20} className="warning-banner-icon" />
              <div className="warning-banner-text">
                <span className="warning-banner-title">
                  Atención: Hay {openTables.length} mesa(s) con órdenes o consumo sin cobrar
                </span>
                <span className="warning-banner-details">
                  Mesas abiertas: <strong>{openTables.map((t) => t.number).join(', ')}</strong>. Se sugiere cobrar o desocupar estas mesas antes del arqueo.
                </span>
              </div>
            </div>
          )}

          {/* Breakdown cards */}
          <div className="closing-metrics-grid">
            <div className="closing-metric-card">
              <span className="c-lbl">Efectivo en Caja (Sistema):</span>
              <span className="c-val text-emerald">{formatCurrency(totalCash)}</span>
            </div>

            <div className="closing-metric-card">
              <span className="c-lbl">Tarjetas / Datáfono:</span>
              <span className="c-val">{formatCurrency(totalCard)}</span>
            </div>

            <div className="closing-metric-card">
              <span className="c-lbl">Transferencias (QR/Nequi):</span>
              <span className="c-val">{formatCurrency(totalTransfer)}</span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="closing-grand-banner">
            <span>TOTAL FACTURADO EN EL DÍA:</span>
            <span className="grand-val">{formatCurrency(grandTotal)}</span>
          </div>

          {/* Physical Cash Count and Arqueo */}
          <div className="physical-count-box">
            <h3 className="section-title">Arqueo Físico de Efectivo</h3>

            <div className="form-group">
              <label className="form-label">
                Efectivo Contado en Gaveta / Cajón Físico ($) *
              </label>
              <div className="price-input-wrapper">
                <span className="price-prefix">$</span>
                <input
                  type="number"
                  value={actualCashCounted}
                  onChange={(e) =>
                    setActualCashCounted(
                      e.target.value === '' ? '' : parseFloat(e.target.value)
                    )
                  }
                  className="form-input price-input-highlight"
                />
              </div>
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
                <span>✓ Caja Exactamente Cuadrada ($0 de diferencia)</span>
              )}
              {cashDifference > 0 && (
                <span>▲ Sobrante en caja: +{formatCurrency(cashDifference)}</span>
              )}
              {cashDifference < 0 && (
                <span>▼ Faltante en caja: {formatCurrency(cashDifference)}</span>
              )}
            </div>

            <div className="form-group" style={{ marginTop: '0.85rem' }}>
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

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-print-receipt"
            onClick={() => setShowPreview(true)}
            title="Previsualizar comprobante térmico del arqueo antes de imprimir"
          >
            <Printer size={15} />
            <span>Imprimir Arqueo</span>
          </button>
          <button
            type="button"
            className="btn-confirm-payment"
            onClick={handleCloseShift}
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
              >
                <Printer size={15} />
                <span>Imprimir Ticket</span>
                <span className="print-format-badge">80mm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
