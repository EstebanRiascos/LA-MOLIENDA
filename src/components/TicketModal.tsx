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
            <img src={laMoliendaLogo} alt="La Molienda" className="receipt-logo" />
            <h2 className="receipt-company">LA MOLIENDA</h2>
            <span className="receipt-tagline">CAFÉ DE ESPECIALIDAD & COCTELERÍA</span>
            <div className="receipt-meta-contact">
              <span>NIT: 901.482.115-4 • Régimen Simple</span>
              <span>Calle 67 # 11-42 • Zona Gourmet</span>
              <span>Tel: (601) 320-4920 • WhatsApp: +57 310 987 6543</span>
              <span className="receipt-wifi">WiFi: LaMolienda_Cafe • Clave: espresso2026</span>
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
            <div className="total-line">
              <span>PROPINA VOLUNTARIA ({tipPercent}%):</span>
              <span>{formatCurrency(tipAmount)}</span>
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
            <div className="simulated-barcode">||| ||||| || ||||||| |||| ||| |||| ||</div>
            <p className="receipt-dev-credit">
              Software POS elaborado por Juan Esteban Riascos Madarriaga &bull; Ing. de Sistemas
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
