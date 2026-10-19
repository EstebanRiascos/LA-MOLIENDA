import React, { useState } from 'react';
import { X, CheckCircle, Printer, DollarSign, AlertCircle, Lock } from 'lucide-react';
import { SaleRecord } from '../types';
import { formatCurrency } from '../utils/storage';

interface CashClosingModalProps {
  isOpen: boolean;
  sales: SaleRecord[];
  currentStaff: string;
  onClose: () => void;
  onConfirmCloseShift: (summaryNote: string) => void;
}

export const CashClosingModal: React.FC<CashClosingModalProps> = ({
  isOpen,
  sales,
  currentStaff,
  onClose,
  onConfirmCloseShift,
}) => {
  if (!isOpen) return null;

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

  const totalTips = todaySales.reduce((sum, s) => sum + s.tipAmount, 0);
  const grandTotal = todaySales.reduce((sum, s) => sum + s.total, 0);

  const [actualCashCounted, setActualCashCounted] = useState<number | ''>(totalCash);
  const [closingNote, setClosingNote] = useState('');

  const numCounted = Number(actualCashCounted) || 0;
  const cashDifference = numCounted - totalCash;

  const handlePrint = () => {
    window.print();
  };

  const handleCloseShift = () => {
    if (
      window.confirm(
        '¿Confirmar el cierre del turno y registrar el arqueo de caja de la jornada?'
      )
    ) {
      onConfirmCloseShift(closingNote);
    }
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
          <button type="button" className="btn-icon-subtle" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="cash-close-body">
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

            <div className="closing-metric-card">
              <span className="c-lbl">Total Propinas:</span>
              <span className="c-val text-amber">{formatCurrency(totalTips)}</span>
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
          <button type="button" className="btn-print-receipt" onClick={handlePrint}>
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
    </div>
  );
};
