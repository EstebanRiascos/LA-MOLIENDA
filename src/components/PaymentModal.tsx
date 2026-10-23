import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  Receipt,
  User,
  Coffee,
  DollarSign,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { Table, PaymentMethod, SaleRecord, OrderItem } from '../types';
import { formatCurrency } from '../utils/storage';

interface PaymentModalProps {
  isOpen: boolean;
  table: Table | null;
  directItems?: OrderItem[];
  directPatronName?: string;
  onClose: () => void;
  onCompletePayment: (saleRecord: SaleRecord, freedTableId?: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  table,
  directItems,
  directPatronName,
  onClose,
  onCompletePayment,
}) => {
  if (!isOpen) return null;

  const items: OrderItem[] = table ? table.items : directItems || [];
  const tableTitle = table ? table.number : 'Venta Rápida / Llevar';
  const tableZone = table ? table.zone : 'takeaway';
  const waiterName = table?.waiter || 'Caja General';
  const initialPatronName = table?.patronName || directPatronName || '';

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  // States
  const [tipPercentage, setTipPercentage] = useState<number>(table?.tipPercentage ?? 0);
  const [customTip, setCustomTip] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [voucherReference, setVoucherReference] = useState('');
  const [clientName, setClientName] = useState(initialPatronName);
  const [clientDocument, setClientDocument] = useState('');
  const [hasAttemptedPay, setHasAttemptedPay] = useState(false);

  // Mixed payment states
  const [mixedCashAmount, setMixedCashAmount] = useState<number | ''>('');
  const [mixedCardAmount, setMixedCardAmount] = useState<number | ''>('');

  // Calculations
  const calculatedTip =
    customTip !== ''
      ? Number(customTip) || 0
      : Math.round(subtotal * (tipPercentage / 100));

  const grandTotal = subtotal + calculatedTip;

  const numCash = Number(cashReceived) || 0;
  const changeGiven = numCash > grandTotal ? numCash - grandTotal : 0;
  const cashShortage = numCash < grandTotal && numCash > 0 ? grandTotal - numCash : 0;

  const handleQuickCash = (amount: number) => {
    setCashReceived(amount);
    setHasAttemptedPay(false);
  };

  const handleExactCash = () => {
    setCashReceived(grandTotal);
    setHasAttemptedPay(false);
  };

  const isPaymentValid = () => {
    if (items.length === 0) return false;
    if (paymentMethod === 'efectivo') {
      return numCash >= grandTotal && numCash > 0;
    }
    if (paymentMethod === 'mixto') {
      const numMixedCash = Number(mixedCashAmount) || 0;
      const numMixedCard = Number(mixedCardAmount) || 0;
      return (numMixedCash + numMixedCard) >= grandTotal;
    }
    return true; // Tarjeta / Datáfono y QR / Transferencia cubren el total
  };

  const handleConfirm = () => {
    if (items.length === 0) {
      alert('No hay productos en esta cuenta.');
      return;
    }

    // Si el pago no está completo, activamos los anuncios en rojo y bloqueamos
    if (!isPaymentValid()) {
      setHasAttemptedPay(true);
      return;
    }

    const saleRecord: SaleRecord = {
      id: `sale-${Date.now()}`,
      ticketNumber: `TK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      tableNumber: tableTitle,
      zone: tableZone,
      waiter: waiterName,
      patronName: clientName.trim() || 'Cliente General',
      customerDocument: clientDocument.trim() || undefined,
      items,
      subtotal,
      tipAmount: calculatedTip,
      total: grandTotal,
      paymentMethod,
      cashReceived: paymentMethod === 'efectivo' ? numCash : undefined,
      changeGiven: paymentMethod === 'efectivo' ? changeGiven : undefined,
      referenceNumber: voucherReference.trim() || undefined,
      status: 'completada',
    };

    onCompletePayment(saleRecord, table?.id);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container payment-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="payment-header-title-box">
            <div className="payment-icon-badge">
              <CreditCard size={22} />
            </div>
            <div>
              <h2 className="modal-title">Cobro & Facturación de Cuenta</h2>
              <span className="payment-sub-tag">
                {tableTitle} • Atendido por: {waiterName}
              </span>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="payment-modal-body">
          {/* LEFT COLUMN: Consumption Items Summary & Customer Info */}
          <div className="payment-col-summary">
            <span className="payment-col-title">Resumen de Consumo ({items.length} ítems)</span>

            <div className="payment-items-scroll">
              {items.map((i) => (
                <div key={i.id} className="payment-item-row">
                  <span className="pi-qty">{i.quantity}x</span>
                  <div className="pi-details">
                    <span className="pi-name">{i.productName}</span>
                    {i.notes && <span className="pi-note">({i.notes})</span>}
                  </div>
                  <span className="pi-total">{formatCurrency(i.unitPrice * i.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="payment-financial-breakdown">
              <div className="pay-break-row">
                <span>Subtotal Consumo:</span>
                <span className="pay-break-val">{formatCurrency(subtotal)}</span>
              </div>

              {/* Tip Selection */}
              <div className="pay-tip-section">
                <span className="tip-title-lbl">Propina del Servicio:</span>
                <div className="tip-pill-selector">
                  <button
                    type="button"
                    className={`btn-tip-pill ${tipPercentage === 0 && customTip === '' ? 'active' : ''}`}
                    onClick={() => {
                      setTipPercentage(0);
                      setCustomTip('');
                    }}
                  >
                    0%
                  </button>
                  <button
                    type="button"
                    className={`btn-tip-pill ${tipPercentage === 10 && customTip === '' ? 'active' : ''}`}
                    onClick={() => {
                      setTipPercentage(10);
                      setCustomTip('');
                    }}
                  >
                    10% (Sugerida)
                  </button>
                  <button
                    type="button"
                    className={`btn-tip-pill ${tipPercentage === 15 && customTip === '' ? 'active' : ''}`}
                    onClick={() => {
                      setTipPercentage(15);
                      setCustomTip('');
                    }}
                  >
                    15%
                  </button>
                </div>
                <div className="pay-tip-amount-row">
                  <span>Monto propina:</span>
                  <span className="tip-val">{formatCurrency(calculatedTip)}</span>
                </div>
              </div>

              {/* GRAND TOTAL */}
              <div className="pay-grand-total-row">
                <span className="grand-label">TOTAL A COBRAR:</span>
                <span className="grand-value">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Optional Customer Billing Info */}
            <div className="customer-info-box">
              <div className="form-group">
                <label className="form-label-mini">Nombre del Cliente / Razón Social:</label>
                <input
                  type="text"
                  placeholder="Ej: Laura Gómez..."
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="form-input-mini"
                />
              </div>
              <div className="form-group">
                <label className="form-label-mini">Cédula / NIT (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ej: 1020304050"
                  value={clientDocument}
                  onChange={(e) => setClientDocument(e.target.value)}
                  className="form-input-mini"
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Payment Method & Cash Calculations */}
          <div className="payment-col-methods">
            <span className="payment-col-title">Método de Pago</span>

            {/* Method Tabs */}
            <div className="payment-methods-grid">
              <button
                type="button"
                className={`pm-btn ${paymentMethod === 'efectivo' ? 'active' : ''}`}
                onClick={() => {
                  setPaymentMethod('efectivo');
                  setHasAttemptedPay(false);
                }}
              >
                <Banknote size={20} />
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                className={`pm-btn ${paymentMethod === 'tarjeta' ? 'active' : ''}`}
                onClick={() => {
                  setPaymentMethod('tarjeta');
                  setHasAttemptedPay(false);
                }}
              >
                <CreditCard size={20} />
                <span>Datáfono / Tarjeta</span>
              </button>

              <button
                type="button"
                className={`pm-btn ${paymentMethod === 'transferencia' ? 'active' : ''}`}
                onClick={() => {
                  setPaymentMethod('transferencia');
                  setHasAttemptedPay(false);
                }}
              >
                <QrCode size={20} />
                <span>QR / Transferencia</span>
              </button>

              <button
                type="button"
                className={`pm-btn ${paymentMethod === 'mixto' ? 'active' : ''}`}
                onClick={() => {
                  setPaymentMethod('mixto');
                  setHasAttemptedPay(false);
                }}
              >
                <Layers size={20} />
                <span>Pago Dividido</span>
              </button>
            </div>

            {/* CASH PAYMENT SECTION */}
            {paymentMethod === 'efectivo' && (
              <div className="cash-calculator-panel">
                <div className="form-group">
                  <label className="form-label">Efectivo Recibido ($)</label>
                  <div className="cash-input-wrapper">
                    <span className="cash-symbol">$</span>
                    <input
                      type="number"
                      step="500"
                      min="0"
                      value={cashReceived}
                      onChange={(e) => {
                        setCashReceived(e.target.value === '' ? '' : parseFloat(e.target.value));
                        if (hasAttemptedPay) setHasAttemptedPay(false);
                      }}
                      className={`cash-input-large ${hasAttemptedPay && numCash < grandTotal ? 'input-error animate-shake' : ''}`}
                      placeholder={grandTotal.toString()}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Quick denomination chips */}
                <div className="quick-cash-chips">
                  <button
                    type="button"
                    className="btn-cash-chip exact"
                    onClick={handleExactCash}
                  >
                    Exacto ({formatCurrency(grandTotal)})
                  </button>
                  <button
                    type="button"
                    className="btn-cash-chip"
                    onClick={() => handleQuickCash(20000)}
                  >
                    $ 20.000
                  </button>
                  <button
                    type="button"
                    className="btn-cash-chip"
                    onClick={() => handleQuickCash(50000)}
                  >
                    $ 50.000
                  </button>
                  <button
                    type="button"
                    className="btn-cash-chip"
                    onClick={() => handleQuickCash(100000)}
                  >
                    $ 100.000
                  </button>
                </div>

                {/* Change or Shortage Display */}
                <div
                  className={`change-result-box ${
                    numCash >= grandTotal
                      ? 'box-change'
                      : (hasAttemptedPay && numCash < grandTotal) || (numCash > 0 && numCash < grandTotal)
                      ? 'box-shortage'
                      : ''
                  }`}
                >
                  {numCash >= grandTotal ? (
                    <div>
                      <span className="change-lbl">PAGO CUBIERTO — CAMBIO / VUELTOS A ENTREGAR:</span>
                      <span className="change-val">{formatCurrency(changeGiven)}</span>
                    </div>
                  ) : hasAttemptedPay && numCash === 0 ? (
                    <div className="payment-alert-card animate-shake">
                      <div className="alert-badge-row">
                        <AlertCircle size={15} className="alert-icon-warning" />
                        <span>Falta ingresar el dinero recibido</span>
                      </div>
                      <p className="alert-desc">
                        Digita el efectivo entregado por el cliente o pulsa <strong>Exacto ({formatCurrency(grandTotal)})</strong>.
                      </p>
                    </div>
                  ) : numCash > 0 ? (
                    <div className="payment-alert-card">
                      <div className="alert-badge-row">
                        <AlertCircle size={15} className="alert-icon-warning" />
                        <span>{hasAttemptedPay ? 'Efectivo insuficiente' : 'Faltante por cubrir'}</span>
                      </div>
                      <div className="alert-amount-row">
                        <span>Faltante por cobrar:</span>
                        <span className="alert-missing-val">{formatCurrency(grandTotal - numCash)}</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="change-lbl">Ingresa el valor entregado por el cliente</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CARD PAYMENT SECTION */}
            {paymentMethod === 'tarjeta' && (
              <div className="card-payment-panel">
                <div className="card-instruction-box">
                  <CreditCard size={32} className="card-inst-icon" />
                  <p>Pasa la tarjeta por el datáfono e ingresa el código de aprobación de la transacción.</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Número de Voucher / Aprobación Datáfono:</label>
                  <input
                    type="text"
                    placeholder="Ej: DAT-99214 o Redeban #1234"
                    value={voucherReference}
                    onChange={(e) => setVoucherReference(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
            )}

            {/* TRANSFER PAYMENT SECTION */}
            {paymentMethod === 'transferencia' && (
              <div className="transfer-payment-panel">
                <div className="transfer-instruction-box">
                  <QrCode size={32} className="qr-inst-icon" />
                  <p>
                    Acepta transferencias por <strong>Bancolombia QR</strong>, <strong>Nequi</strong> o <strong>Daviplata</strong>.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Comprobante / Número de Aprobación QR:</label>
                  <input
                    type="text"
                    placeholder="Ej: NEQUI-M4819 o Cód. Transacción"
                    value={voucherReference}
                    onChange={(e) => setVoucherReference(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
            )}

            {/* MIXED PAYMENT SECTION */}
            {paymentMethod === 'mixto' && (
              <div className="mixed-payment-panel">
                <div className="form-group">
                  <label className="form-label">Monto pagado en Efectivo ($):</label>
                  <input
                    type="number"
                    value={mixedCashAmount}
                    onChange={(e) => {
                      setMixedCashAmount(e.target.value === '' ? '' : parseFloat(e.target.value));
                      if (hasAttemptedPay) setHasAttemptedPay(false);
                    }}
                    className="form-input"
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Monto pagado en Tarjeta / Transferencia ($):</label>
                  <input
                    type="number"
                    value={mixedCardAmount}
                    onChange={(e) => {
                      setMixedCardAmount(e.target.value === '' ? '' : parseFloat(e.target.value));
                      if (hasAttemptedPay) setHasAttemptedPay(false);
                    }}
                    className="form-input"
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Referencia / Comprobante Electrónico:</label>
                  <input
                    type="text"
                    placeholder="Voucher tarjeta o comprobante"
                    value={voucherReference}
                    onChange={(e) => setVoucherReference(e.target.value)}
                    className="form-input"
                  />
                </div>

                {/* Mixed status calculation */}
                {(((Number(mixedCashAmount) || 0) + (Number(mixedCardAmount) || 0) > 0) || hasAttemptedPay) && (
                  <div
                    className={`change-result-box ${
                      (Number(mixedCashAmount) || 0) + (Number(mixedCardAmount) || 0) >= grandTotal
                        ? 'box-change'
                        : 'box-shortage'
                    }`}
                    style={{ marginTop: '0.65rem' }}
                  >
                    {(Number(mixedCashAmount) || 0) + (Number(mixedCardAmount) || 0) >= grandTotal ? (
                      <div>
                        <span className="change-lbl">PAGO DIVIDIDO CUBIERTO:</span>
                        <span className="change-val">
                          {formatCurrency(
                            (Number(mixedCashAmount) || 0) + (Number(mixedCardAmount) || 0)
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className={`payment-alert-card ${hasAttemptedPay ? 'animate-shake' : ''}`}>
                        <div className="alert-badge-row">
                          <AlertCircle size={15} className="alert-icon-warning" />
                          <span>Monto dividido insuficiente</span>
                        </div>
                        <div className="alert-amount-row">
                          <span>Faltante por cubrir:</span>
                          <span className="alert-missing-val">
                            {formatCurrency(
                              grandTotal -
                                ((Number(mixedCashAmount) || 0) + (Number(mixedCardAmount) || 0))
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Confirm Payment Button */}
            <div className="payment-confirm-action-box">
              <button
                type="button"
                className="btn-confirm-payment"
                onClick={handleConfirm}
              >
                <CheckCircle2 size={18} />
                <span>Confirmar Pago & Cerrar Cuenta</span>
              </button>
              {hasAttemptedPay && !isPaymentValid() && (
                <div className="payment-blocked-notice animate-shake">
                  <AlertCircle size={14} className="alert-icon-warning" />
                  <span>Por favor registra el pago completo antes de cerrar la cuenta</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
