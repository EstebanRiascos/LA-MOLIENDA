import React, { useState } from 'react';
import {
  X,
  Divide,
  Users,
  ShoppingBag,
  Plus,
  Minus,
  RotateCcw,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Check,
  CreditCard,
  QrCode,
  Receipt,
  User,
} from 'lucide-react';
import { Table, OrderItem, PaymentMethod, SaleRecord } from '../types';
import { formatCurrency } from '../utils/storage';
import { playSound } from '../utils/sounds';

interface SplitBillModalProps {
  isOpen: boolean;
  table: Table | null;
  ticketConsecutive?: number;
  onClose: () => void;
  onShowNotification: (msg: string) => void;
  onCompletePartialPayment?: (
    saleRecord: SaleRecord,
    tableId: string,
    paidItems: { id: string; quantity: number }[]
  ) => void;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({
  isOpen,
  table,
  ticketConsecutive,
  onClose,
  onShowNotification,
  onCompletePartialPayment,
}) => {
  if (!isOpen || !table) return null;

  // Active panel: 'equal' (N comensales) or 'by_items' (por productos)
  const [activeTab, setActiveTab] = useState<'equal' | 'by_items'>('equal');
  const [tabDirection, setTabDirection] = useState<'right' | 'left'>('right');

  const handleTabChange = (nextTab: 'equal' | 'by_items') => {
    if (nextTab === activeTab) return;
    setTabDirection(nextTab === 'by_items' ? 'right' : 'left');
    setActiveTab(nextTab);
  };

  // ----------------------------------------------------
  // PANEL 1: EQUITATIVE SPLIT
  // ----------------------------------------------------
  const [numPeople, setNumPeople] = useState<number>(table.capacity || 2);
  const [equalCashGiven, setEqualCashGiven] = useState<number | ''>('');

  const accountTotal = table.total || table.subtotal || 0;
  const totalPerPerson = numPeople > 0 ? Math.round(accountTotal / numPeople) : 0;

  const numEqualCash = Number(equalCashGiven) || 0;
  const equalChange =
    equalCashGiven !== '' && numEqualCash >= totalPerPerson
      ? numEqualCash - totalPerPerson
      : null;
  const equalShortage =
    equalCashGiven !== '' && numEqualCash > 0 && numEqualCash < totalPerPerson
      ? totalPerPerson - numEqualCash
      : null;

  // ----------------------------------------------------
  // PANEL 2: BY ITEMS / PRODUCTS SELECTION
  // ----------------------------------------------------
  // Map of itemId -> selected quantity for this person
  const [selectedItemQuantities, setSelectedItemQuantities] = useState<
    Record<string, number>
  >({});
  const [itemCashGiven, setItemCashGiven] = useState<number | ''>('');

  const orderItems: OrderItem[] = table.items || [];

  const handleItemQtyChange = (itemId: string, delta: number, maxQty: number) => {
    setSelectedItemQuantities((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, Math.min(maxQty, current + delta));
      return { ...prev, [itemId]: next };
    });
  };

  const handleSelectAllOfItem = (itemId: string, maxQty: number) => {
    setSelectedItemQuantities((prev) => ({
      ...prev,
      [itemId]: prev[itemId] === maxQty ? 0 : maxQty,
    }));
  };

  const handleClearItemSelection = () => {
    setSelectedItemQuantities({});
    setItemCashGiven('');
  };

  const handleSelectAllItems = () => {
    const allSelected: Record<string, number> = {};
    orderItems.forEach((i) => {
      allSelected[i.id] = i.quantity;
    });
    setSelectedItemQuantities(allSelected);
  };

  const selectedItemsSubtotal = orderItems.reduce((sum, item) => {
    const qty = selectedItemQuantities[item.id] || 0;
    return sum + item.unitPrice * qty;
  }, 0);

  const selectedItemsTotal = selectedItemsSubtotal;

  const totalItemsCountSelected = Object.values(selectedItemQuantities).reduce(
    (a, b) => a + b,
    0
  );

  const numItemCash = Number(itemCashGiven) || 0;
  const itemChange =
    itemCashGiven !== '' && numItemCash >= selectedItemsTotal
      ? numItemCash - selectedItemsTotal
      : null;
  const itemShortage =
    itemCashGiven !== '' && numItemCash > 0 && numItemCash < selectedItemsTotal
      ? selectedItemsTotal - numItemCash
      : null;

  // Estados de cobro y método de pago para el comensal
  const [itemPaymentMethod, setItemPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [itemVoucherRef, setItemVoucherRef] = useState('');
  const [itemCustomerName, setItemCustomerName] = useState('');
  const [hasAttemptedItemPay, setHasAttemptedItemPay] = useState(false);

  const handleConfirmPartialPayment = () => {
    if (totalItemsCountSelected === 0) {
      onShowNotification('⚠️ Selecciona al menos un producto para facturar a este comensal.');
      playSound('error');
      return;
    }

    if (itemPaymentMethod === 'efectivo') {
      if (itemCashGiven !== '' && numItemCash < selectedItemsTotal) {
        setHasAttemptedItemPay(true);
        onShowNotification('⚠️ El monto en efectivo recibido es menor al total a pagar.');
        playSound('error');
        return;
      }
    }

    // Si en efectivo no digitó monto, se toma como pago exacto
    const effectiveCash =
      itemPaymentMethod === 'efectivo'
        ? itemCashGiven === '' || numItemCash === 0
          ? selectedItemsTotal
          : numItemCash
        : undefined;

    const effectiveChange =
      itemPaymentMethod === 'efectivo' && effectiveCash
        ? effectiveCash > selectedItemsTotal
          ? effectiveCash - selectedItemsTotal
          : 0
        : undefined;

    const paidItemsList: OrderItem[] = [];
    const paidSummary: { id: string; quantity: number }[] = [];

    orderItems.forEach((it) => {
      const qty = selectedItemQuantities[it.id] || 0;
      if (qty > 0) {
        paidItemsList.push({
          ...it,
          quantity: qty,
          status: 'served',
        });
        paidSummary.push({
          id: it.id,
          quantity: qty,
        });
      }
    });

    const seq = ticketConsecutive ? String(ticketConsecutive).padStart(4, '0') : '0001';
    const saleRecord: SaleRecord = {
      id: `sale-${Date.now()}`,
      ticketNumber: `TK-${new Date().getFullYear()}-${seq}`,
      date: new Date().toISOString(),
      tableNumber: table.number,
      zone: table.zone,
      waiter: table.waiter || 'Caja General',
      patronName: itemCustomerName.trim() || `Comensal ${table.number}`,
      items: paidItemsList,
      subtotal: selectedItemsTotal,
      tipAmount: 0,
      total: selectedItemsTotal,
      paymentMethod: itemPaymentMethod,
      cashReceived: effectiveCash,
      changeGiven: effectiveChange,
      referenceNumber: itemVoucherRef.trim() || undefined,
      status: 'completada',
    };

    if (onCompletePartialPayment) {
      onCompletePartialPayment(saleRecord, table.id, paidSummary);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-container split-bill-modal split-modal-container tab-${activeTab}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="split-header-box">
            <Divide size={22} className="modal-icon-header" />
            <div>
              <h2 className="modal-title">
                Dividir Cuenta — <span className="split-table-badge">{table.number}</span>
              </h2>
              <span className="modal-subtitle">
                Cálculo de pago equitativo o individual por productos consumidos y vueltos.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            title="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="split-modal-body">
          {/* Dual Panel Tabs Switcher */}
          <div className="split-tabs-nav">
            <button
              type="button"
              className={`split-tab-btn ${activeTab === 'equal' ? 'active' : ''}`}
              onClick={() => handleTabChange('equal')}
            >
              <Users size={16} />
              <span>División Equitativa</span>
            </button>
            <button
              type="button"
              className={`split-tab-btn ${activeTab === 'by_items' ? 'active' : ''}`}
              onClick={() => handleTabChange('by_items')}
            >
              <ShoppingBag size={16} />
              <span>Por Productos / Consumo</span>
            </button>
          </div>

          {/* ======================================================= */}
          {/* PANEL 1: DIVISIÓN EQUITATIVA ENTRE N PERSONAS          */}
          {/* ======================================================= */}
          {activeTab === 'equal' && (
            <div
              key="equal"
              className={`split-tab-content split-tab-grid split-tab-slide-${tabDirection}`}
            >
              {/* Left Column: Configuration */}
              <div className="split-col-left">
                {/* Total Account Summary */}
                <div className="split-total-banner">
                  <div>
                    <span className="split-banner-lbl">Total Actual de la Cuenta:</span>
                    <span className="split-banner-val">{formatCurrency(accountTotal)}</span>
                  </div>
                </div>

                {/* Visual Party / Guests Selector Card */}
                <div className="split-people-card">
                  <div className="split-people-header">
                    <div className="split-people-title">
                      <Users size={16} />
                      <span>Dividir cuenta entre:</span>
                    </div>
                    <span className="split-people-badge">
                      {numPeople} {numPeople === 1 ? 'persona' : 'personas'}
                    </span>
                  </div>

                  {/* Main Stepper / Counter */}
                  <div className="split-people-stepper-box">
                    <button
                      type="button"
                      className="btn-stepper-circle btn-stepper-dec"
                      disabled={numPeople <= 1}
                      onClick={() => setNumPeople((prev) => Math.max(1, prev - 1))}
                      title="Quitar una persona"
                    >
                      <Minus size={18} />
                    </button>

                    <div className="split-stepper-center">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={numPeople}
                        onChange={(e) =>
                          setNumPeople(
                            Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1))
                          )
                        }
                        className="split-stepper-input"
                      />
                      <span className="split-stepper-unit">
                        {numPeople === 1 ? 'persona' : 'personas'}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn-stepper-circle btn-stepper-inc"
                      disabled={numPeople >= 50}
                      onClick={() => setNumPeople((prev) => Math.min(50, prev + 1))}
                      title="Agregar una persona"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* Quick Preset Chips */}
                  <div className="split-presets-wrapper">
                    <span className="split-presets-label">Selección rápida:</span>
                    <div className="split-presets-grid">
                      {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`btn-preset-chip ${numPeople === n ? 'active' : ''}`}
                          onClick={() => setNumPeople(n)}
                        >
                          <span className="chip-num">{n}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Result Card & Cash Calculator */}
              <div className="split-col-right">
                {/* Result Card per Person */}
                <div className="split-result-card">
                  <span className="result-card-title">CADA PERSONA DEBE PAGAR:</span>
                  <span className="result-per-person-amount">
                    {formatCurrency(totalPerPerson)}
                  </span>
                </div>

                {/* Cash & Change Calculator for Equitative Share */}
                <div className="split-cash-box">
                  <div className="split-cash-header">
                    <span className="split-cash-label">
                      <Banknote size={15} />
                      <span>Calcular Vueltos / Billete entregado:</span>
                    </span>
                    {equalCashGiven !== '' && (
                      <button
                        type="button"
                        className="btn-link-clear"
                        onClick={() => setEqualCashGiven('')}
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  <div className="price-input-wrapper">
                    <span className="price-prefix">$</span>
                    <input
                      type="number"
                      placeholder="Monto entregado (ej: 50000)"
                      value={equalCashGiven}
                      onChange={(e) =>
                        setEqualCashGiven(
                          e.target.value === '' ? '' : parseFloat(e.target.value)
                        )
                      }
                      className="form-input price-input-highlight"
                    />
                  </div>

                  {/* Quick denomination bill buttons */}
                  <div className="split-denominations-grid">
                    <button
                      type="button"
                      className="btn-split-denom denom-exact"
                      onClick={() => setEqualCashGiven(totalPerPerson)}
                    >
                      Exacto
                    </button>
                    {[10000, 20000, 50000, 100000].map((denom) => (
                      <button
                        key={denom}
                        type="button"
                        className={`btn-split-denom denom-${denom >= 1000 ? `${denom / 1000}k` : denom}`}
                        onClick={() => setEqualCashGiven(denom)}
                      >
                        ${denom >= 1000 ? `${denom / 1000}k` : denom}
                      </button>
                    ))}
                  </div>

                  {/* Live change / shortage badge */}
                  {equalChange !== null && (
                    <div className="split-change-badge change-positive">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle2 size={16} />
                        <span>Vueltos / Cambio:</span>
                      </div>
                      <span className="change-val">{formatCurrency(equalChange)}</span>
                    </div>
                  )}

                  {equalShortage !== null && (
                    <div className="split-change-badge change-negative">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <AlertCircle size={16} />
                        <span>Faltan por pagar:</span>
                      </div>
                      <span className="change-val">{formatCurrency(equalShortage)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* PANEL 2: DIVISIÓN POR PRODUCTOS ESPECÍFICOS             */}
          {/* ======================================================= */}
          {activeTab === 'by_items' && (
            <div
              key="by_items"
              className={`split-tab-content split-tab-grid split-tab-slide-${tabDirection}`}
            >
              {/* Left Column: Items Selection List */}
              <div className="split-col-left">
                {/* Header actions for items */}
                <div className="split-items-header-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <span className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                      Productos de este comensal:
                    </span>
                    <span className="split-items-count-badge">
                      {totalItemsCountSelected}{' '}
                      {totalItemsCountSelected === 1 ? 'producto elegido' : 'productos elegidos'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <button
                      type="button"
                      className="btn-link-action btn-link-select-all"
                      onClick={handleSelectAllItems}
                    >
                      Seleccionar todo
                    </button>
                    {totalItemsCountSelected > 0 && (
                      <button
                        type="button"
                        className="btn-link-action btn-link-clear-all"
                        onClick={handleClearItemSelection}
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>

                {/* Order items selection list inside background card */}
                <div className="split-items-card">
                  {orderItems.length === 0 ? (
                    <div className="empty-split-items-state">
                      <ShoppingBag size={28} opacity={0.4} />
                      <span>Esta mesa no tiene productos activos en su comanda.</span>
                    </div>
                  ) : (
                    <div className="split-items-list">
                      {orderItems.map((item) => {
                        const selQty = selectedItemQuantities[item.id] || 0;
                        const isSelected = selQty > 0;
                        const itemSub = item.unitPrice * selQty;

                        return (
                          <div
                            key={item.id}
                            className={`split-item-row ${isSelected ? 'selected' : ''}`}
                          >
                            <div className="split-item-info">
                              <span className="split-item-name">{item.productName}</span>
                              <span className="split-item-meta">
                                {formatCurrency(item.unitPrice)} c/u • En mesa:{' '}
                                <strong>{item.quantity}</strong>
                                {item.notes ? ` • ${item.notes}` : ''}
                              </span>
                            </div>

                            {/* Quantity controls */}
                            <div className="split-qty-counter">
                              <button
                                type="button"
                                className="btn-qty-step btn-qty-minus"
                                disabled={selQty <= 0}
                                onClick={() => handleItemQtyChange(item.id, -1, item.quantity)}
                                title="Disminuir cantidad"
                              >
                                <Minus size={13} />
                              </button>
                              <span className={`split-qty-display ${selQty > 0 ? 'has-qty' : ''}`}>
                                {selQty}
                              </span>
                              <button
                                type="button"
                                className="btn-qty-step btn-qty-plus"
                                disabled={selQty >= item.quantity}
                                onClick={() => handleItemQtyChange(item.id, 1, item.quantity)}
                                title="Aumentar cantidad"
                              >
                                <Plus size={13} />
                              </button>
                            </div>

                            {/* Quick select full item qty */}
                            {item.quantity > 1 && (
                              <button
                                type="button"
                                className={`btn-quick-full ${selQty === item.quantity ? 'active' : ''}`}
                                onClick={() => handleSelectAllOfItem(item.id, item.quantity)}
                                title="Pagar todo este producto"
                              >
                                Todos ({item.quantity})
                              </button>
                            )}

                            {/* Calculated subtotal for this item */}
                            <div className={`split-item-subtotal ${selQty > 0 ? 'active' : ''}`}>
                              {formatCurrency(itemSub)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>


              </div>

              {/* Right Column: Result Card & Cash Calculator */}
              <div className="split-col-right">
                {/* Result card for this person's selected items */}
                <div className="split-result-card">
                  <span className="result-card-title">
                    TOTAL A PAGAR POR ESTE COMENSAL:
                  </span>
                  <span className="result-per-person-amount">
                    {formatCurrency(selectedItemsTotal)}
                  </span>
                </div>

                {/* Selector de Método de Pago */}
                <div className="split-methods-box">
                  <span className="split-section-lbl">
                    <CreditCard size={13} /> Método de Pago:
                  </span>
                  <div className="split-methods-toggles">
                    <button
                      type="button"
                      className={`split-method-btn ${itemPaymentMethod === 'efectivo' ? 'active' : ''}`}
                      onClick={() => {
                        setItemPaymentMethod('efectivo');
                        setHasAttemptedItemPay(false);
                      }}
                    >
                      <Banknote size={17} />
                      <span>Efectivo</span>
                    </button>

                    <button
                      type="button"
                      className={`split-method-btn ${itemPaymentMethod === 'tarjeta' ? 'active' : ''}`}
                      onClick={() => {
                        setItemPaymentMethod('tarjeta');
                        setHasAttemptedItemPay(false);
                      }}
                    >
                      <CreditCard size={17} />
                      <span>Tarjeta</span>
                    </button>

                    <button
                      type="button"
                      className={`split-method-btn ${itemPaymentMethod === 'transferencia' ? 'active' : ''}`}
                      onClick={() => {
                        setItemPaymentMethod('transferencia');
                        setHasAttemptedItemPay(false);
                      }}
                    >
                      <QrCode size={17} />
                      <span>Transferencia</span>
                    </button>
                  </div>
                </div>

                {/* Cash & Change Calculator for Selected Items */}
                {itemPaymentMethod === 'efectivo' && (
                  <div className="split-cash-box">
                    <div className="split-cash-header">
                      <span className="split-cash-label">
                        <Banknote size={15} />
                        <span>¿Con cuánto billete o efectivo paga?</span>
                      </span>
                      {itemCashGiven !== '' && (
                        <button
                          type="button"
                          className="btn-link-clear"
                          onClick={() => setItemCashGiven('')}
                        >
                          Limpiar
                        </button>
                      )}
                    </div>

                    <div className="price-input-wrapper">
                      <span className="price-prefix">$</span>
                      <input
                        type="number"
                        placeholder="Monto entregado (ej: 50000)"
                        value={itemCashGiven}
                        onChange={(e) =>
                          setItemCashGiven(
                            e.target.value === '' ? '' : parseFloat(e.target.value)
                          )
                        }
                        className={`form-input price-input-highlight ${
                          hasAttemptedItemPay && numItemCash < selectedItemsTotal
                            ? 'input-error animate-shake'
                            : ''
                        }`}
                      />
                    </div>

                    {/* Quick denomination bill buttons */}
                    <div className="split-denominations-grid">
                      <button
                        type="button"
                        className="btn-split-denom denom-exact"
                        disabled={selectedItemsTotal <= 0}
                        onClick={() => setItemCashGiven(selectedItemsTotal)}
                      >
                        Exacto
                      </button>
                      {[10000, 20000, 50000, 100000].map((denom) => (
                        <button
                          key={denom}
                          type="button"
                          className={`btn-split-denom denom-${denom >= 1000 ? `${denom / 1000}k` : denom}`}
                          onClick={() => setItemCashGiven(denom)}
                        >
                          ${denom >= 1000 ? `${denom / 1000}k` : denom}
                        </button>
                      ))}
                    </div>

                    {/* Live change / shortage badge */}
                    {itemChange !== null && (
                      <div className="split-change-badge change-positive">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <CheckCircle2 size={16} />
                          <span>Vueltos / Cambio:</span>
                        </div>
                        <span className="change-val">{formatCurrency(itemChange)}</span>
                      </div>
                    )}

                    {itemShortage !== null && (
                      <div className="split-change-badge change-negative">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <AlertCircle size={16} />
                          <span>Faltan por pagar:</span>
                        </div>
                        <span className="change-val">{formatCurrency(itemShortage)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Card payment voucher field */}
                {itemPaymentMethod === 'tarjeta' && (
                  <div className="split-voucher-card">
                    <div className="split-badge-info">
                      <CreditCard size={15} />
                      <span>Datáfono / Tarjeta Débito o Crédito</span>
                    </div>
                    <div className="split-customer-input-box">
                      <label>N° Voucher / Aprobación (opcional):</label>
                      <input
                        type="text"
                        placeholder="Ej: 004829"
                        value={itemVoucherRef}
                        onChange={(e) => setItemVoucherRef(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Transfer voucher field */}
                {itemPaymentMethod === 'transferencia' && (
                  <div className="split-voucher-card">
                    <div className="split-badge-info">
                      <QrCode size={15} />
                      <span>Transferencia QR Nequi / Daviplata / Bancolombia</span>
                    </div>
                    <div className="split-customer-input-box">
                      <label>N° Comprobante / Celular (opcional):</label>
                      <input
                        type="text"
                        placeholder="Ej: M1234567 / 310..."
                        value={itemVoucherRef}
                        onChange={(e) => setItemVoucherRef(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Optional Customer Name */}
                <div className="split-customer-input-box">
                  <label>
                    <User size={12} /> Nombre de quien paga (opcional):
                  </label>
                  <input
                    type="text"
                    placeholder={`Ej: Carlos (o Comensal ${table.number})`}
                    value={itemCustomerName}
                    onChange={(e) => setItemCustomerName(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            justifyContent: activeTab === 'by_items' ? 'space-between' : 'flex-end',
            alignItems: 'center',
          }}
        >
          {activeTab === 'by_items' ? (
            <>
              <div className="split-footer-summary">
                <span className="split-footer-badge">
                  {totalItemsCountSelected}{' '}
                  {totalItemsCountSelected === 1 ? 'producto elegido' : 'productos elegidos'}
                </span>
                {totalItemsCountSelected > 0 && (
                  <span className="split-footer-total">
                    Total: {formatCurrency(selectedItemsTotal)}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <button type="button" className="btn-cancel" onClick={onClose}>
                  Cerrar
                </button>
                <button
                  type="button"
                  className="btn-confirm-partial-pay"
                  disabled={totalItemsCountSelected === 0}
                  onClick={handleConfirmPartialPayment}
                  title={
                    totalItemsCountSelected === 0
                      ? 'Selecciona al menos un producto para facturar'
                      : `Facturar y cobrar ${formatCurrency(selectedItemsTotal)} a este comensal`
                  }
                >
                  <Receipt size={17} />
                  <span>
                    Confirmar y Facturar{' '}
                    {totalItemsCountSelected > 0 ? `(${formatCurrency(selectedItemsTotal)})` : ''}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
