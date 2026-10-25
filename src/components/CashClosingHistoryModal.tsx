import React, { useState, useEffect } from 'react';
import { X, History, Printer, Search, Calendar, User, DollarSign, CheckCircle2, AlertTriangle, AlertCircle, Trash2 } from 'lucide-react';
import { CashClosingSummary } from '../types';
import { getCashClosingHistory, saveCashClosingHistory } from '../utils/cashClosing';
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
  const [selectedRecord, setSelectedRecord] = useState<CashClosingSummary | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHistory(getCashClosingHistory());
      setSelectedRecord(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredHistory = history.filter((item) => {
    const q = searchQuery.toLowerCase();
    const cashierMatch = item.cashier.toLowerCase().includes(q);
    const dateMatch = new Date(item.closedAt).toLocaleDateString('es-CO').includes(q);
    const noteMatch = (item.note || '').toLowerCase().includes(q);
    return cashierMatch || dateMatch || noteMatch;
  });

  const handleDeleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Seguro que deseas eliminar este registro de cierre del historial?')) {
      const updated = history.filter((h) => h.id !== id);
      setHistory(updated);
      saveCashClosingHistory(updated);
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
    }
  };

  const handlePrint = () => {
    playSound('print');
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container cash-history-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh' }}
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

        {/* Search Bar */}
        <div className="cash-history-toolbar">
          <div className="sales-search-box" style={{ flex: 1 }}>
            <Search size={15} className="sales-search-icon" />
            <input
              type="text"
              placeholder="Buscar por cajero, fecha (DD/MM/AAAA) u observación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sales-search-input"
            />
          </div>
          <span className="cash-history-count-badge">
            {filteredHistory.length} {filteredHistory.length === 1 ? 'cierre registrado' : 'cierres registrados'}
          </span>
        </div>

        {/* Content List */}
        <div className="cash-history-body" style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 160px)', padding: '1rem' }}>
          {filteredHistory.length === 0 ? (
            <div className="cash-history-empty-state">
              <History size={48} className="empty-icon text-muted" />
              <h3>No hay registros de cierre de turno</h3>
              <p>
                {searchQuery
                  ? 'No se encontraron cierres que coincidan con la búsqueda.'
                  : 'Los arqueos y cierres de turno que guardes en la caja aparecerán aquí con su comprobante térmico.'}
              </p>
            </div>
          ) : (
            <div className="cash-history-list">
              {filteredHistory.map((item) => {
                const diff = item.cashDifference ?? ((item.actualCashCounted ?? item.totalCash) - item.totalCash);
                const isBalanced = diff === 0;
                const isSurplus = diff > 0;

                return (
                  <div key={item.id} className="cash-history-card">
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
                        <button
                          type="button"
                          className="btn-history-delete"
                          onClick={(e) => handleDeleteRecord(item.id, e)}
                          title="Eliminar este arqueo del historial"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="history-card-grid">
                      <div className="history-grid-col">
                        <span className="h-lbl">Total Facturado</span>
                        <span className="h-val text-emerald">{formatCurrency(item.totalSales)}</span>
                        <span className="h-sub">{item.salesCount} transacciones</span>
                      </div>

                      <div className="history-grid-col">
                        <span className="h-lbl">Efectivo Sistema</span>
                        <span className="h-val">{formatCurrency(item.totalCash)}</span>
                        <span className="h-sub">Registrado en ventas</span>
                      </div>

                      <div className="history-grid-col">
                        <span className="h-lbl">Efectivo Físico</span>
                        <span className="h-val">
                          {formatCurrency(item.actualCashCounted ?? item.totalCash)}
                        </span>
                        <span className="h-sub">Contado en gaveta</span>
                      </div>

                      <div className="history-grid-col">
                        <span className="h-lbl">Estado Arqueo</span>
                        <span
                          className={`history-diff-badge ${
                            isBalanced
                              ? 'diff-balanced'
                              : isSurplus
                              ? 'diff-surplus'
                              : 'diff-shortage'
                          }`}
                        >
                          {isBalanced && '✓ Caja Cuadrada ($0)'}
                          {isSurplus && `▲ Sobrante: +${formatCurrency(diff)}`}
                          {!isBalanced && !isSurplus && `▼ Faltante: ${formatCurrency(diff)}`}
                        </span>
                        <span className="h-sub">
                          {isBalanced ? 'Sin descuadre' : isSurplus ? 'Superávit en gaveta' : 'Diferencia a favor'}
                        </span>
                      </div>
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

            <div className="ticket-modal-footer no-print">
              <button
                type="button"
                className="btn-print-receipt"
                onClick={handlePrint}
                title="Imprimir ticket térmico en 80mm"
              >
                <Printer size={16} />
                <span>Imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
