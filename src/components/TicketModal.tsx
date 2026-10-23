import React from 'react';
import { X, Printer, Check, Coffee, Sparkles } from 'lucide-react';
import { SaleRecord, Table } from '../types';
import { formatCurrency } from '../utils/storage';
import laMoliendaLogo from '../assets/la_molienda_logo.png';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleRecord?: SaleRecord | null;
  table?: Table | null;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  onClose,
  saleRecord,
  table,
}) => {
  if (!isOpen || (!saleRecord && !table)) return null;

  const isCompletedSale = !!saleRecord;
  const items = saleRecord ? saleRecord.items : table?.items || [];
  const titleNumber = saleRecord ? saleRecord.tableNumber : table?.number || 'Mesa';
  const waiter = saleRecord ? saleRecord.waiter : table?.waiter || 'Barista';
  const patron = saleRecord?.patronName || table?.patronName || 'Cliente';
  const subtotal = saleRecord ? saleRecord.subtotal : table?.subtotal || 0;
  const tipAmount = saleRecord ? saleRecord.tipAmount : table?.tipAmount || 0;
  const tipPercent = subtotal > 0 && tipAmount > 0 ? Math.round((tipAmount / subtotal) * 100) : (table?.tipPercentage ?? 0);
  const total = saleRecord ? saleRecord.total : table?.total || subtotal + tipAmount;
  const dateStr = saleRecord?.date
    ? new Date(saleRecord.date).toLocaleString('es-CO')
    : new Date().toLocaleString('es-CO');

  const ticketCode = saleRecord?.ticketNumber || `PRE-${new Date().getTime().toString().slice(-6)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container ticket-modal-wrapper"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ticket-modal-header no-print">
          <div>
            <h3 className="modal-title">
              {isCompletedSale ? 'Comprobante de Venta' : 'Pre-cuenta de Consumo'}
            </h3>
            <span className="modal-subtitle">
              {isCompletedSale
                ? 'Factura simplificada para el cliente'
                : 'Ticket de revisión previo al pago'}
            </span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Cerrar ticket">
            <X size={18} />
          </button>
        </div>

        {/* THERMAL RECEIPT CONTAINER */}
        <div className="receipt-paper" id="printable-receipt">
          {/* Logo & Header */}
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
            <span className="receipt-tagline">CAFÉ DE ESPECIALIDAD & COCTELERÍA</span>
            <div className="receipt-meta-contact">
              <span>NIT: 901.482.115-4 • Régimen Simple</span>
              <span>Calle 67 # 11-42 • Zona Gourmet</span>
              <span>Tel: (601) 320-4920 • WhatsApp: +57 310 987 6543</span>
            </div>
          </div>

          <div className="receipt-divider-dashed" />

          {/* Ticket Information */}
          <div className="receipt-info-block">
            <div className="info-line">
              <span>{isCompletedSale ? 'TICKET VENTA:' : 'PRE-CUENTA:'}</span>
              <strong>{ticketCode}</strong>
            </div>
            <div className="info-line">
              <span>UBICACIÓN:</span>
              <strong>{titleNumber}</strong>
            </div>
            <div className="info-line">
              <span>FECHA / HORA:</span>
              <span>{dateStr}</span>
            </div>
            <div className="info-line">
              <span>ATENDIDO POR:</span>
              <span>{waiter}</span>
            </div>
            <div className="info-line">
              <span>CLIENTE:</span>
              <span>{patron}</span>
            </div>
          </div>

          <div className="receipt-divider-dashed" />

          {/* Items Header */}
          <div className="receipt-items-head">
            <span className="head-qty">CANT</span>
            <span className="head-desc">DESCRIPCIÓN</span>
            <span className="head-total">TOTAL</span>
          </div>
          <div className="receipt-divider-solid" />

          {/* Items List */}
          <div className="receipt-items-list">
            {items.map((i) => (
              <div key={i.id} className="receipt-item-entry">
                <div className="entry-row">
                  <span className="entry-qty">{i.quantity}</span>
                  <span className="entry-name">{i.productName}</span>
                  <span className="entry-amount">
                    {formatCurrency(i.unitPrice * i.quantity)}
                  </span>
                </div>
                {i.notes && <div className="entry-note">Nota: {i.notes}</div>}
              </div>
            ))}
          </div>

          <div className="receipt-divider-solid" />

          {/* Totals */}
          <div className="receipt-totals-block">
            <div className="total-line">
              <span>SUBTOTAL:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="receipt-divider-dashed" />
            <div className="total-line grand-total-line">
              <span>TOTAL A PAGAR:</span>
              <span className="grand-price">{formatCurrency(total)}</span>
            </div>

            {/* Payment specifics if completed sale */}
            {isCompletedSale && saleRecord && (
              <div className="receipt-payment-details">
                <div className="total-line">
                  <span>MEDIO DE PAGO:</span>
                  <strong style={{ textTransform: 'uppercase' }}>
                    {saleRecord.paymentMethod}
                  </strong>
                </div>
                {saleRecord.paymentMethod === 'efectivo' && (
                  <>
                    <div className="total-line">
                      <span>EFECTIVO RECIBIDO:</span>
                      <span>{formatCurrency(saleRecord.cashReceived || 0)}</span>
                    </div>
                    <div className="total-line">
                      <span>CAMBIO / VUELTOS:</span>
                      <span>{formatCurrency(saleRecord.changeGiven || 0)}</span>
                    </div>
                  </>
                )}
                {saleRecord.referenceNumber && (
                  <div className="total-line">
                    <span>REF / VOUCHER:</span>
                    <span>{saleRecord.referenceNumber}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="receipt-divider-dashed" />

          {/* Footer message */}
          <div className="receipt-footer">
            <p className="thanks-msg">¡GRACIAS POR TU VISITA!</p>
            <p className="follow-msg">Síguenos en Instagram: @lamolienda.cafebar</p>
            <p className="footer-notice">
              {isCompletedSale
                ? 'DOCUMENTO EQUIVALENTE A FACTURA DE VENTA'
                : 'ESTE DOCUMENTO NO ES FACTURA DE VENTA - PRE-CUENTA DE CONTROL'}
            </p>
            <p className="receipt-dev-credit">
              Software POS desarrollado por Juan Esteban Riascos Madarriaga &bull; Ing. de Sistemas
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="ticket-modal-actions no-print">
          <button type="button" className="btn-modal-cancel" onClick={onClose}>
            Cerrar
          </button>
          <button type="button" className="btn-print-receipt" onClick={handlePrint}>
            <Printer size={15} />
            <span>Imprimir Ticket</span>
            <span className="print-format-badge">80mm</span>
          </button>
        </div>
      </div>
    </div>
  );
};
