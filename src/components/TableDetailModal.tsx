import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Clock,
  User,
  Coffee,
  Check,
  Receipt,
  CreditCard,
  ArrowRightLeft,
  Divide,
  Search,
  MessageSquare,
} from 'lucide-react';
import { Table, Product, OrderItem, ProductCategory, UserRole } from '../types';
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
  currentUserRole?: UserRole;
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
  currentUserRole,
}) => {
  if (!isOpen || !table) return null;

  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState('');

  // Horizontal scroll with mouse wheel for category chips
  const categoryChipsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = categoryChipsRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Recalculate totals helper
  const recalculateTable = (items: OrderItem[]): Table => {
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const total = subtotal;

    return {
      ...table,
      items,
      subtotal,
      tipPercentage: 0,
      tipAmount: 0,
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

  // Cycle item status: pending -> preparing -> served -> pending
  const handleCycleItemStatus = (itemId: string) => {
    const nextStatusMap: Record<OrderItem['status'], OrderItem['status']> = {
      pending: 'preparing',
      preparing: 'served',
      served: 'pending',
    };

    const labelMap: Record<OrderItem['status'], string> = {
      pending: 'Por despachar',
      preparing: 'En preparación',
      served: 'Servido',
    };

    let updatedName = '';
    let updatedLabel = '';

    const newItems = table.items.map((i) => {
      if (i.id === itemId) {
        const current = i.status || 'pending';
        const nextStatus = nextStatusMap[current] || 'pending';
        updatedName = i.productName;
        updatedLabel = labelMap[nextStatus];
        return {
          ...i,
          status: nextStatus,
          sentToBarAt: nextStatus === 'served' ? (i.sentToBarAt || new Date().toISOString()) : i.sentToBarAt,
        };
      }
      return i;
    });

    onUpdateTable(recalculateTable(newItems));
    if (updatedName) {
      onShowNotification(`"${updatedName}" ahora está: ${updatedLabel}`);
    }
  };

  // Mark all items as served
  const handleMarkAllAsServed = () => {
    const newItems = table.items.map((i) => ({
      ...i,
      status: 'served' as const,
      sentToBarAt: i.sentToBarAt || new Date().toISOString(),
    }));
    onUpdateTable(recalculateTable(newItems));
    onShowNotification('Todos los productos han sido marcados como "Servidos".');
  };

  const pendingDispatchCount = table.items.filter(
    (i) => (i.status || 'pending') !== 'served'
  ).length;
  const hasPendingDispatch = pendingDispatchCount > 0;

  // Filter products for quick add
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatElapsedTime = (openedAt?: string) => {
    if (!openedAt) return '';
    const totalMins = Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000);
    if (totalMins < 1) return 'Recién abierta';
    if (totalMins < 60) return `Abierta hace ${totalMins} min`;
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours < 24) return `Abierta hace ${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `Abierta hace ${days}d ${remainingHours > 0 ? `${remainingHours}h` : ''}`;
  };

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
                <span className="table-meta-chip meta-chip-patron">
                  <User size={12} />
                  <span>{table.patronName || 'Cliente en sala'}</span>
                </span>
                {table.waiter && (
                  <span className="table-meta-chip meta-chip-waiter">
                    <Coffee size={12} />
                    <span>Atendido por: <strong>{table.waiter}</strong></span>
                  </span>
                )}
                {table.openedAt && (
                  <span className="table-meta-chip meta-chip-time">
                    <Clock size={12} />
                    <span>{formatElapsedTime(table.openedAt)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="modal-header-actions">
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              title="Cerrar comanda"
            >
              <X size={18} />
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
                    <div className="order-item-main-content">
                      {/* 1. Thumbnail */}
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="order-item-img"
                      />

                      {/* 2. Product Name & Notes */}
                      <div className="order-item-info-col">
                        <span className="item-name">{item.productName}</span>

                        {/* Notes Section Badge or Add Button */}
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
                      </div>

                      {/* 3. Status & Unit Price Column */}
                      <div className="order-item-meta-col">
                        <button
                          type="button"
                          className={`item-status-pill ${item.status || 'pending'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCycleItemStatus(item.id);
                          }}
                          title="Click para cambiar estado (Por despachar → En preparación → Servido)"
                        >
                          {item.status === 'served' ? (
                            <>
                              <Check size={11} /> Servido
                            </>
                          ) : item.status === 'preparing' ? (
                            <>
                              <Coffee size={11} /> En preparación
                            </>
                          ) : (
                            <>
                              <Clock size={11} /> Por despachar
                            </>
                          )}
                        </button>
                        <span className="item-unit-price">
                          {formatCurrency(item.unitPrice)} c/u
                        </span>
                      </div>

                      {/* 4. Quantity Stepper */}
                      <div className="order-item-qty-stepper">
                        <button
                          type="button"
                          className="btn-qty-mini btn-qty-minus"
                          onClick={() => handleDecreaseQty(item.id)}
                          title="Disminuir"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="qty-number">{item.quantity}</span>
                        <button
                          type="button"
                          className="btn-qty-mini btn-qty-plus"
                          onClick={() => handleIncreaseQty(item.id)}
                          title="Aumentar"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* 5. Subtotal Total Price */}
                      <div className="order-item-subtotal-col">
                        <span className="item-subtotal-label">Subtotal</span>
                        <span className="item-subtotal">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </span>
                      </div>

                      {/* 6. Delete Action */}
                      <div className="order-item-del-col">
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

                    {/* Expandable Note Editor Bar */}
                    {editingNoteItemId === item.id && (
                      <div className="item-note-expanded-row">
                        <MessageSquare size={13} className="note-row-icon" />
                        <input
                          type="text"
                          placeholder="Nota especial: Ej. Leche deslactosada, sin azúcar, poco hielo..."
                          value={tempNoteText}
                          onChange={(e) => setTempNoteText(e.target.value)}
                          className="input-item-note"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNote(item.id);
                            if (e.key === 'Escape') setEditingNoteItemId(null);
                          }}
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
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Bill Totals Summary */}
            <div className="order-summary-box">
              <div className="summary-line total-line">
                <div className="total-label-box">
                  <span className="total-label">Total Cuenta:</span>
                  <span className="total-sublabel">
                    {table.items.reduce((s, i) => s + i.quantity, 0)}{' '}
                    {table.items.reduce((s, i) => s + i.quantity, 0) === 1
                      ? 'producto consumido'
                      : 'productos consumidos'}
                  </span>
                </div>
                <span className="total-val">
                  {formatCurrency(table.total || table.subtotal)}
                </span>
              </div>

              {/* Banner de alerta si hay productos pendientes por despachar */}
              {hasPendingDispatch && (
                <div className="pending-dispatch-banner">
                  <div className="pending-dispatch-info">
                    <Clock size={16} className="pending-dispatch-icon" />
                    <div>
                      <strong>{pendingDispatchCount} producto(s) por despachar</strong>
                      <span className="pending-dispatch-sub">
                        Debes servir todos los productos antes de poder cobrar la cuenta.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-mark-all-served"
                    onClick={handleMarkAllAsServed}
                    title="Marcar todos los productos de esta mesa como Servidos"
                  >
                    <Check size={13} /> Servir todo
                  </button>
                </div>
              )}

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

                {/* Botón Cobrar (Oculto para Meseros - Cobro exclusivo en Caja) */}
                {currentUserRole !== 'mesero' && (
                  <button
                    type="button"
                    className="btn-flow-action btn-checkout-main"
                    onClick={() => {
                      if (hasPendingDispatch) {
                        onShowNotification(
                          `⚠️ No se puede cobrar: Hay ${pendingDispatchCount} producto(s) por despachar.`
                        );
                        return;
                      }
                      onOpenCheckout(table);
                    }}
                    title={
                      hasPendingDispatch
                        ? `No se puede cobrar: Hay ${pendingDispatchCount} producto(s) pendientes por despachar`
                        : "Cobrar la cuenta de la mesa y liberar espacio"
                    }
                    disabled={table.items.length === 0 || hasPendingDispatch}
                  >
                    <CreditCard size={16} /> Cobrar Cuenta
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: VISUAL MENU TO ADD ITEMS TO TABLE */}
          <div className="menu-picker-column">
            <div className="menu-picker-header">
              <div className="picker-title-box">
                <span className="picker-title">Añadir al Pedido</span>
                <span className="picker-count-badge">{filteredProducts.length}</span>
              </div>
              <div className="picker-search">
                <Search size={14} className="picker-search-icon" />
                <input
                  type="text"
                  placeholder="Buscar café, cóctel, postre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="picker-search-input"
                />
              </div>
            </div>

            {/* Category Filter Chips with visual slider */}
            <div className="picker-category-chips" ref={categoryChipsRef}>
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
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="picker-product-img"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <span className="picker-price-tag">
                      <span className="picker-price-currency">$</span>
                      <span className="picker-price-val">{(prod.price || 0).toLocaleString('es-CO')}</span>
                    </span>
                    {prod.stock <= prod.minStock && (
                      <span className="picker-stock-tag">
                        {prod.stock <= 0 ? 'Agotado' : `Stock: ${prod.stock}`}
                      </span>
                    )}
                  </div>
                  <div className="picker-prod-info">
                    <span className="picker-prod-name">{prod.name}</span>
                    <button
                      type="button"
                      className={`btn-quick-add ${prod.stock <= prod.minStock ? 'btn-low-stock' : ''}`}
                    >
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
