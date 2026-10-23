import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  PlusCircle,
  Minus,
  Trash2,
  ShoppingBag,
  CreditCard,
  Send,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Product, Table, ProductCategory, OrderItem, UserRole } from '../types';
import { CATEGORIES } from '../utils/defaults';
import { formatCurrency } from '../utils/storage';

interface PosViewProps {
  products: Product[];
  tables: Table[];
  onAddItemsToTable: (tableId: string, items: OrderItem[]) => void;
  onDirectSaleCheckout: (items: OrderItem[], patronName?: string) => void;
  onShowNotification: (msg: string) => void;
  cartItems?: OrderItem[];
  setCartItems?: React.Dispatch<React.SetStateAction<OrderItem[]>>;
  targetTableId?: string;
  setTargetTableId?: (id: string) => void;
  tipPercentage?: number;
  setTipPercentage?: (p: number) => void;
  patronNote?: string;
  setPatronNote?: (note: string) => void;
  currentUserRole?: UserRole;
}

export const PosView: React.FC<PosViewProps> = ({
  products,
  tables,
  onAddItemsToTable,
  onDirectSaleCheckout,
  onShowNotification,
  cartItems: propsCartItems,
  setCartItems: propsSetCartItems,
  targetTableId: propsTargetTableId,
  setTargetTableId: propsSetTargetTableId,
  tipPercentage: propsTipPercentage,
  setTipPercentage: propsSetTipPercentage,
  patronNote: propsPatronNote,
  setPatronNote: propsSetPatronNote,
  currentUserRole,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyInStock, setOnlyInStock] = useState(false);

  // Cart state: synchronized with App if provided
  const [internalCartItems, setInternalCartItems] = useState<OrderItem[]>([]);
  const cartItems = propsCartItems !== undefined ? propsCartItems : internalCartItems;
  const setCartItems = propsSetCartItems !== undefined ? propsSetCartItems : setInternalCartItems;

  const [internalTargetTableId, setInternalTargetTableId] = useState<string>('direct_takeaway');
  const targetTableId = propsTargetTableId !== undefined ? propsTargetTableId : internalTargetTableId;
  const setTargetTableId = propsSetTargetTableId !== undefined ? propsSetTargetTableId : setInternalTargetTableId;

  const [internalTipPercentage, setInternalTipPercentage] = useState<number>(0);
  const tipPercentage = propsTipPercentage !== undefined ? propsTipPercentage : internalTipPercentage;
  const setTipPercentage = propsSetTipPercentage !== undefined ? propsSetTipPercentage : setInternalTipPercentage;

  const [internalPatronNote, setInternalPatronNote] = useState<string>('');
  const patronNote = propsPatronNote !== undefined ? propsPatronNote : internalPatronNote;
  const setPatronNote = propsSetPatronNote !== undefined ? propsSetPatronNote : setInternalPatronNote;

  // Horizontal scroll with mouse wheel for category pills
  const categoryPillsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = categoryPillsRef.current;
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

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStock = !onlyInStock || p.stock > 0;
    return matchesCategory && matchesSearch && matchesStock;
  });

  // Add product to cart
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      onShowNotification(`"${product.name}" no tiene más existencias disponibles en inventario.`);
      return;
    }

    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id);
      if (idx >= 0) {
        return prev.map((item, i) =>
          i === idx ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          productId: product.id,
          productName: product.name,
          productImage: product.image,
          unitPrice: product.price,
          quantity: 1,
          status: 'pending',
        },
      ];
    });

    onShowNotification(`+1 "${product.name}" agregado a la comanda`);
  };

  const handleIncreaseQty = (itemId: string) => {
    const item = cartItems.find((i) => i.id === itemId);
    if (!item) return;
    const prod = products.find((p) => p.id === item.productId);
    if (prod && prod.stock <= 0) {
      onShowNotification(`No hay más existencias disponibles de "${item.productName}".`);
      return;
    }
    setCartItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i))
    );
  };

  const handleDecreaseQty = (itemId: string) => {
    setCartItems((prev) =>
      prev
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleClearCart = () => {
    if (cartItems.length > 0 && window.confirm('¿Vaciar la comanda actual?')) {
      setCartItems([]);
      setTipPercentage(0);
    }
  };

  // Calculations
  const cartSubtotal = cartItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const cartTip = Math.round(cartSubtotal * (tipPercentage / 100));
  const cartTotal = cartSubtotal + cartTip;

  // Dispatch cart: to Table or to Direct Checkout
  const handleDispatchOrder = () => {
    if (cartItems.length === 0) {
      alert('La comanda está vacía. Selecciona productos del menú primero.');
      return;
    }

    if (targetTableId === 'direct_takeaway') {
      if (currentUserRole === 'mesero') {
        onShowNotification('⚠️ Función exclusiva de Caja: Selecciona una mesa de salón/barra para cargar el pedido.');
        return;
      }
      // Venta directa / Llevar
      onDirectSaleCheckout(cartItems, patronNote || 'Venta Rápida / Llevar');
      setCartItems([]);
      setPatronNote('');
      setTipPercentage(0);
    } else {
      // Mandar a mesa
      onAddItemsToTable(targetTableId, cartItems);
      const targetTable = tables.find((t) => t.id === targetTableId);
      onShowNotification(
        `Comanda de ${cartItems.length} ítems cargada exitosamente a ${targetTable?.number || 'la mesa'}`
      );
      setCartItems([]);
      setPatronNote('');
      setTipPercentage(0);
    }
  };

  return (
    <div className="pos-view-container">
      {/* POS Catalog Section (Left / Center) */}
      <div className="pos-catalog-section">
        {/* Search & Stock Filter Bar */}
        <div className="pos-search-bar">
          <div className="pos-search-input-wrapper">
            <Search size={18} className="pos-search-icon" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o ingrediente (ej: Espresso, Gin, Croissant)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pos-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          <label className="pos-stock-filter-toggle">
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
            />
            <span>Solo con Stock</span>
          </label>
        </div>

        {/* Category Pills */}
        <div className="pos-category-pills" ref={categoryPillsRef}>
          <button
            type="button"
            className={`pos-category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            <span>🍽️</span> <span>Todos ({products.length})</span>
          </button>
          {CATEGORIES.map((cat) => {
            const count = products.filter((p) => p.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                className={`pos-category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className="cat-count">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Visual Product Cards Grid */}
        <div className="pos-products-grid">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.stock <= 0;
            const isLowStock = product.stock > 0 && product.stock <= product.minStock;

            return (
              <div
                key={product.id}
                className={`pos-product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                onClick={() => !isOutOfStock && handleAddToCart(product)}
                title={isOutOfStock ? 'Producto Agotado' : `Agregar ${product.name}`}
              >
                {/* Product Image with Price Overlay */}
                <div className="pos-card-img-box">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="pos-card-img"
                    loading="lazy"
                  />
                  <div className="pos-price-badge">
                    <span className="pos-price-currency">$</span>
                    <span className="pos-price-val">{(product.price || 0).toLocaleString('es-CO')}</span>
                  </div>

                  {/* Stock pill */}
                  <div className="pos-stock-pill-wrapper">
                    {isOutOfStock ? (
                      <span className="pos-stock-pill pill-danger">Agotado</span>
                    ) : isLowStock ? (
                      <span className="pos-stock-pill pill-warning">
                        Stock: {product.stock}
                      </span>
                    ) : (
                      <span className="pos-stock-pill pill-normal">
                        Disp: {product.stock}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Details */}
                <div className="pos-card-content">
                  <div className="pos-card-header-row">
                    <span className="pos-prod-code">{product.code}</span>
                    <span className="pos-prod-unit">{product.unit}</span>
                  </div>

                  <h3 className="pos-prod-name">{product.name}</h3>
                  <p className="pos-prod-desc">{product.description}</p>

                  <div className="pos-card-action-row">
                    <button
                      type="button"
                      className={`btn-pos-add ${isOutOfStock ? 'disabled' : ''}`}
                      disabled={isOutOfStock}
                    >
                      <PlusCircle size={15} />
                      <span>Añadir a Comanda</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* POS Active Ticket / Cart Section (Right Side) */}
      <div className="pos-ticket-sidebar">
        <div className="ticket-header">
          <div className="ticket-title-row">
            <ShoppingBag size={20} className="ticket-icon" />
            <h2 className="ticket-title">Comanda Activa</h2>
          </div>
          {cartItems.length > 0 && (
            <button
              type="button"
              className="btn-clear-cart"
              onClick={handleClearCart}
              title="Vaciar comanda"
            >
              Vaciar
            </button>
          )}
        </div>

        {/* Target Destination Selector (Mesa / Takeaway) */}
        <div className="ticket-target-box">
          <label className="target-label">Destino de la Comanda:</label>
          <select
            value={targetTableId}
            onChange={(e) => setTargetTableId(e.target.value)}
            className="target-select-input"
          >
            <option value="direct_takeaway">⚡ Venta Rápida / Para Llevar</option>
            <optgroup label="Mesas y Salón">
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.number} ({t.zone.toUpperCase()}) -{' '}
                  {t.status === 'libre' ? 'Libre' : `Ocupada (${formatCurrency(t.total || 0)})`}
                </option>
              ))}
            </optgroup>
          </select>

          <input
            type="text"
            placeholder="Nombre de cliente o nota rápida..."
            value={patronNote}
            onChange={(e) => setPatronNote(e.target.value)}
            className="target-note-input"
          />
        </div>

        {/* Cart Items List */}
        <div className="ticket-items-list">
          {cartItems.length === 0 ? (
            <div className="empty-cart-state">
              <Coffee size={40} className="empty-cart-icon" />
              <p>No hay productos en esta comanda.</p>
              <span>Haz click sobre cualquier café, cóctel o plato para añadirlo.</span>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="ticket-item-row">
                <img
                  src={item.productImage}
                  alt={item.productName}
                  className="ticket-item-thumb"
                />
                <div className="ticket-item-info">
                  <span className="ticket-item-name">{item.productName}</span>
                  <span className="ticket-item-price">
                    {formatCurrency(item.unitPrice)} c/u
                  </span>
                </div>

                <div className="ticket-item-controls">
                  <button
                    type="button"
                    className="btn-ticket-qty"
                    onClick={() => handleDecreaseQty(item.id)}
                  >
                    <Minus size={12} />
                  </button>
                  <span className="ticket-qty-val">{item.quantity}</span>
                  <button
                    type="button"
                    className="btn-ticket-qty"
                    onClick={() => handleIncreaseQty(item.id)}
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    type="button"
                    className="btn-ticket-del"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Dispatch */}
        <div className="ticket-footer">
          <div className="ticket-summary-line">
            <span>Subtotal:</span>
            <span>{formatCurrency(cartSubtotal)}</span>
          </div>

          <div className="ticket-summary-line grand-total">
            <span>TOTAL:</span>
            <span className="grand-total-amount">{formatCurrency(cartTotal)}</span>
          </div>

          {/* Action button: solid motionless click, pulsing/titilante aura while items are in comanda */}
          <button
            type="button"
            className={`btn-dispatch-order ${cartItems.length > 0 ? 'ready-to-dispatch' : ''}`}
            onClick={handleDispatchOrder}
            disabled={cartItems.length === 0 || (targetTableId === 'direct_takeaway' && currentUserRole === 'mesero')}
          >
            {targetTableId === 'direct_takeaway' ? (
              currentUserRole === 'mesero' ? (
                <>
                  <ShoppingBag size={17} className="dispatch-icon" />
                  <span>Cobro en Caja Requerido</span>
                </>
              ) : (
                <>
                  <CreditCard size={17} className="dispatch-icon" />
                  <span>Cobrar Venta Rápida</span>
                  {cartItems.length > 0 && (
                    <span className="dispatch-badge">
                      {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
                    </span>
                  )}
                </>
              )
            ) : (
              <>
                <Send size={17} className="dispatch-icon" />
                <span>
                  {`Cargar a ${tables.find((t) => t.id === targetTableId)?.number}`}
                </span>
                {cartItems.length > 0 && (
                  <span className="dispatch-badge">
                    {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
