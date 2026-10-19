import React, { useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Clock,
  User,
  Coffee,
  Check,
  Send,
  Receipt,
  CreditCard,
  ArrowRightLeft,
  Divide,
  Search,
  MessageSquare,
} from 'lucide-react';
import { Table, Product, OrderItem, ProductCategory } from '../types';
import { CATEGORIES } from '../utils/defaults';
import { formatCurrency } from '../utils/storage';

interface TableDetailModalProps {
  isOpen: boolean;
  table: Table | null;
  products: Product[];
  onClose: () => void;
  onUpdateTable: (updatedTable: Table) => void;
  onOpenCheckout: (table: Table) => void;
  onOpenPreBill: (table: Table) => void;
  onOpenSplitBill: (table: Table) => void;
  onOpenTransfer: (table: Table) => void;
  onShowNotification: (msg: string) => void;
}

export const TableDetailModal: React.FC<TableDetailModalProps> = ({
  isOpen,
  table,
  products,
  onClose,
  onUpdateTable,
  onOpenCheckout,
  onOpenPreBill,
  onOpenSplitBill,
  onOpenTransfer,
  onShowNotification,
}) => {
  if (!isOpen || !table) return null;

  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState('');

  // Recalculate totals helper
  const recalculateTable = (items: OrderItem[], tipPercent: number = table.tipPercentage ?? 10): Table => {
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const tipAmount = Math.round(subtotal * (tipPercent / 100));
    const total = subtotal + tipAmount;

    return {
      ...table,
      items,
      subtotal,
      tipPercentage: tipPercent,
      tipAmount,
      total,
      status: items.length > 0 ? (table.status === 'libre' ? 'ocupada' : table.status) : 'libre',
    };
  };

  // Add product to table
  const handleAddProduct = (product: Product) => {
    if (product.stock <= 0) {
      alert(`El producto "${product.name}" no tiene existencias disponibles en inventario.`);
      return;
    }

    const existingIndex = table.items.findIndex(
      (i) => i.productId === product.id && (!i.notes || i.notes.trim() === '')
    );

    let newItems: OrderItem[];
    if (existingIndex >= 0) {
      newItems = table.items.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      const newItem: OrderItem = {
        id: `ord-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        unitPrice: product.price,
        quantity: 1,
        status: 'pending',
      };
      newItems = [...table.items, newItem];
    }

    const updated = recalculateTable(newItems);
    onUpdateTable(updated);
    onShowNotification(`+1 "${product.name}" agregado a ${table.number}`);
  };

  // Increase quantity
  const handleIncreaseQty = (itemId: string) => {
    const newItems = table.items.map((i) =>
      i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i
    );
    onUpdateTable(recalculateTable(newItems));
  };

  // Decrease quantity
  const handleDecreaseQty = (itemId: string) => {
    const target = table.items.find((i) => i.id === itemId);
    if (!target) return;

    let newItems: OrderItem[];
    if (target.quantity > 1) {
      newItems = table.items.map((i) =>
        i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
      );
    } else {
      newItems = table.items.filter((i) => i.id !== itemId);
    }
    onUpdateTable(recalculateTable(newItems));
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    const item = table.items.find((i) => i.id === itemId);
    if (item && window.confirm(`¿Quitar "${item.productName}" de la comanda?`)) {
      const newItems = table.items.filter((i) => i.id !== itemId);
      onUpdateTable(recalculateTable(newItems));
    }
  };

  // Save item note
  const handleSaveNote = (itemId: string) => {
    const newItems = table.items.map((i) =>
      i.id === itemId ? { ...i, notes: tempNoteText.trim() } : i
    );
    onUpdateTable(recalculateTable(newItems));
    setEditingNoteItemId(null);
    setTempNoteText('');
  };

  // Toggle tip
  const handleToggleTip = (percent: number) => {
    onUpdateTable(recalculateTable(table.items, percent));
  };

  // Send round to Bar / Kitchen
  const handleSendToBar = () => {
    const newItems = table.items.map((i) => ({
      ...i,
      status: 'served' as const,
      sentToBarAt: new Date().toISOString(),
    }));
    onUpdateTable(recalculateTable(newItems));
    onShowNotification(`Comanda de ${table.number} enviada a barra y cocina.`);
  };

  // Filter products for quick add
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container table-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="table-header-left">
            <div className="table-badge-large">
              <span>{table.number}</span>
            </div>
            <div>
              <h2 className="modal-title">Gestión de Cuenta & Comanda</h2>
              <div className="table-header-meta">
                <span>
                  <User size={13} /> {table.patronName || 'Cliente en sala'}
                </span>
                {table.waiter && <span>• Atendido por: {table.waiter}</span>}
                {table.openedAt && (
                  <span>
                    • <Clock size={13} /> Abierta hace{' '}
                    {Math.floor((Date.now() - new Date(table.openedAt).getTime()) / 60000)} min
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="modal-header-actions">
            <button
              type="button"
              className="btn-icon-subtle"
              onClick={onClose}
              title="Cerrar ventana"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Main Split: Left = Active Account Order, Right = Visual Catalog to Add */}
        <div className="table-detail-body">
          {/* LEFT PANEL: ACTIVE ORDER */}
          <div className="order-items-column">
            <div className="column-title-bar">
              <span className="col-title">
                Consumo Actual ({table.items.reduce((s, i) => s + i.quantity, 0)} ítems)
              </span>
              {table.items.some((i) => i.status === 'pending') && (
                <button
                  type="button"
                  className="btn-send-bar"
                  onClick={handleSendToBar}
                  title="Mandar ronda a preparación en barra/cocina"
                >
                  <Send size={13} /> Enviar a Barra
                </button>
              )}
            </div>

            {/* List of Ordered Items */}
            <div className="order-items-scroll">
              {table.items.length === 0 ? (
                <div className="empty-order-placeholder">
                  <Coffee size={36} className="empty-icon" />
                  <p>La cuenta de esta mesa está vacía.</p>
                  <span>Selecciona productos del menú lateral para agregarlos al pedido.</span>
                </div>
              ) : (
                table.items.map((item) => (
                  <div key={item.id} className="order-item-row">
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="order-item-img"
                    />

                    <div className="order-item-details">
                      <div className="item-name-line">
                        <span className="item-name">{item.productName}</span>
                        <span className="item-subtotal">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </span>
                      </div>

                      <div className="item-meta-line">
                        <span className="item-unit-price">
                          {formatCurrency(item.unitPrice)} c/u
                        </span>

                        {item.status === 'served' ? (
                          <span className="item-status-pill served">
                            <Check size={11} /> Servido
                          </span>
                        ) : (
                          <span className="item-status-pill pending">
                            Por despachar
                          </span>
                        )}
                      </div>

                      {/* Notes Section */}
                      {editingNoteItemId === item.id ? (
                        <div className="item-note-edit-box">
                          <input
                            type="text"
                            placeholder="Ej: Leche deslactosada, sin azúcar, poco hielo..."
                            value={tempNoteText}
                            onChange={(e) => setTempNoteText(e.target.value)}
                            className="input-item-note"
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn-note-save"
                            onClick={() => handleSaveNote(item.id)}
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            className="btn-note-cancel"
                            onClick={() => setEditingNoteItemId(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="item-note-display">
                          {item.notes ? (
                            <span
                              className="note-badge"
                              onClick={() => {
                                setEditingNoteItemId(item.id);
                                setTempNoteText(item.notes || '');
                              }}
                              title="Click para editar notas"
                            >
                              <MessageSquare size={11} /> {item.notes}
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn-add-note-inline"
                              onClick={() => {
                                setEditingNoteItemId(item.id);
                                setTempNoteText('');
                              }}
                            >
                              + Agregar nota
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    <div className="order-item-qty-controls">
                      <button
                        type="button"
                        className="btn-qty-mini"
                        onClick={() => handleDecreaseQty(item.id)}
                        title="Disminuir"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="qty-number">{item.quantity}</span>
                      <button
                        type="button"
                        className="btn-qty-mini"
                        onClick={() => handleIncreaseQty(item.id)}
                        title="Aumentar"
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn-qty-delete"
                        onClick={() => handleRemoveItem(item.id)}
                        title="Eliminar producto"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bill Totals Summary */}
            <div className="order-summary-box">
              <div className="summary-line">
                <span className="summary-label">Subtotal Consumo:</span>
                <span className="summary-val">{formatCurrency(table.subtotal)}</span>
              </div>

              {/* Tip Selection */}
              <div className="summary-line tip-line">
                <div className="tip-labels">
                  <span className="summary-label">Propina Voluntaria:</span>
                  <div className="tip-toggle-pills">
                    <button
                      type="button"
                      className={`tip-btn ${table.tipPercentage === 0 ? 'active' : ''}`}
                      onClick={() => handleToggleTip(0)}
                    >
                      0%
                    </button>
                    <button
                      type="button"
                      className={`tip-btn ${table.tipPercentage === 10 ? 'active' : ''}`}
                      onClick={() => handleToggleTip(10)}
                    >
                      10% (Sugerida)
                    </button>
                    <button
                      type="button"
                      className={`tip-btn ${table.tipPercentage === 15 ? 'active' : ''}`}
                      onClick={() => handleToggleTip(15)}
                    >
                      15%
                    </button>
                  </div>
                </div>
                <span className="summary-val">{formatCurrency(table.tipAmount || 0)}</span>
              </div>

              <div className="summary-line total-line">
                <span className="total-label">TOTAL CUENTA:</span>
                <span className="total-val">
                  {formatCurrency(table.total || table.subtotal)}
                </span>
              </div>

              {/* Account Operational Flow Buttons */}
              <div className="order-flow-actions">
                <button
                  type="button"
                  className="btn-flow-action btn-split"
                  onClick={() => onOpenSplitBill(table)}
                  title="Dividir la cuenta entre los comensales"
                  disabled={table.items.length === 0}
                >
                  <Divide size={15} /> Dividir Cuenta
                </button>

                <button
                  type="button"
                  className="btn-flow-action btn-prebill"
                  onClick={() => onOpenPreBill(table)}
                  title="Ver o imprimir pre-cuenta para entregar al cliente"
                  disabled={table.items.length === 0}
                >
                  <Receipt size={15} /> Pre-cuenta
                </button>

                <button
                  type="button"
                  className="btn-flow-action btn-transfer"
                  onClick={() => onOpenTransfer(table)}
                  title="Trasladar cuenta a otra mesa o a la barra"
                  disabled={table.items.length === 0}
                >
                  <ArrowRightLeft size={15} /> Cambiar Mesa
                </button>

                <button
                  type="button"
                  className="btn-flow-action btn-checkout-main"
                  onClick={() => onOpenCheckout(table)}
                  title="Cobrar la cuenta de la mesa y liberar espacio"
                  disabled={table.items.length === 0}
                >
                  <CreditCard size={16} /> Cobrar Cuenta
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: VISUAL MENU TO ADD ITEMS TO TABLE */}
          <div className="menu-picker-column">
            <div className="menu-picker-header">
              <span className="picker-title">Añadir al Pedido</span>
              <div className="picker-search">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar café, cóctel, postre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="picker-search-input"
                />
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="picker-category-chips">
              <button
                type="button"
                className={`category-chip ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                Todos
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span>{cat.icon}</span> <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Visual Product Grid */}
            <div className="picker-products-grid">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="picker-product-card"
                  onClick={() => handleAddProduct(prod)}
                  title={`Agregar ${prod.name} (${formatCurrency(prod.price)})`}
                >
                  <div className="picker-img-wrapper">
                    <img src={prod.image} alt={prod.name} className="picker-product-img" />
                    <span className="picker-price-tag">
                      <span className="picker-price-currency">$</span>
                      <span className="picker-price-val">{(prod.price || 0).toLocaleString('es-CO')}</span>
                    </span>
                    {prod.stock <= prod.minStock && (
                      <span className="picker-stock-tag">Stock: {prod.stock}</span>
                    )}
                  </div>
                  <div className="picker-prod-info">
                    <span className="picker-prod-name">{prod.name}</span>
                    <button type="button" className="btn-quick-add">
                      <Plus size={13} /> Añadir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
