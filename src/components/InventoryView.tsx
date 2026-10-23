import React, { useState } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  TrendingUp,
  DollarSign,
  Layers,
  ArrowUpDown,
  Check,
  X,
} from 'lucide-react';
import { Product, ProductCategory, UserRole } from '../types';
import { CATEGORIES } from '../utils/defaults';
import { formatCurrency } from '../utils/storage';

interface InventoryViewProps {
  products: Product[];
  onOpenNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onQuickUpdatePrice: (productId: string, newPrice: number) => void;
  onQuickUpdateCost?: (productId: string, newCost: number) => void;
  onQuickAdjustStock: (productId: string, delta: number) => void;
  onShowNotification: (msg: string) => void;
  currentUserRole?: UserRole;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  onOpenNewProduct,
  onEditProduct,
  onDeleteProduct,
  onQuickUpdatePrice,
  onQuickUpdateCost,
  onQuickAdjustStock,
  onShowNotification,
  currentUserRole,
}) => {
  const isAdmin = currentUserRole === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'normal' | 'low' | 'out'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'cost' | 'stock' | 'margin'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Inline price editing state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPriceValue, setTempPriceValue] = useState<string>('');

  // Inline cost editing state
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [tempCostValue, setTempCostValue] = useState<string>('');

  // Inventory KPI calculations
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const totalCostValue = products.reduce((sum, p) => sum + p.cost * p.stock, 0);
  const averageMargin =
    products.length > 0
      ? products.reduce(
          (sum, p) => sum + (p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0),
          0
        ) / products.length
      : 0;
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = p.stock > 0 && p.stock <= p.minStock;
    if (stockFilter === 'out') matchesStock = p.stock === 0;
    if (stockFilter === 'normal') matchesStock = p.stock > p.minStock;

    return matchesCategory && matchesSearch && matchesStock;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let result = 0;
    if (sortBy === 'name') result = a.name.localeCompare(b.name);
    if (sortBy === 'price') result = a.price - b.price;
    if (sortBy === 'cost') result = a.cost - b.cost;
    if (sortBy === 'stock') result = a.stock - b.stock;
    if (sortBy === 'margin') {
      const marginA = a.price > 0 ? ((a.price - a.cost) / a.price) * 100 : 0;
      const marginB = b.price > 0 ? ((b.price - b.cost) / b.price) * 100 : 0;
      result = marginA - marginB;
    }
    return sortAsc ? result : -result;
  });

  const handleStartEditPrice = (product: Product) => {
    setEditingPriceId(product.id);
    setTempPriceValue(product.price.toString());
  };

  const handleSavePrice = (productId: string) => {
    const num = parseFloat(tempPriceValue);
    if (!isNaN(num) && num >= 0) {
      onQuickUpdatePrice(productId, num);
      onShowNotification('Precio de venta actualizado con éxito.');
    }
    setEditingPriceId(null);
  };

  const handleStartEditCost = (product: Product) => {
    setEditingCostId(product.id);
    setTempCostValue(product.cost.toString());
  };

  const handleSaveCost = (productId: string) => {
    const num = parseFloat(tempCostValue);
    if (!isNaN(num) && num >= 0) {
      if (onQuickUpdateCost) {
        onQuickUpdateCost(productId, num);
      }
      onShowNotification('Costo de insumo actualizado con éxito.');
    }
    setEditingCostId(null);
  };

  return (
    <div className="inventory-view-container">
      {/* Inventory KPI Summary Bar */}
      <div className="inventory-stats-strip">
        <div className="inv-stat-card">
          <div className="inv-stat-icon icon-blue">
            <Package size={20} />
          </div>
          <div className="inv-stat-text">
            <span className="inv-stat-label">Total Referencias</span>
            <span className="inv-stat-value">{products.length} productos</span>
          </div>
        </div>

        <div className="inv-stat-card">
          <div className="inv-stat-icon icon-emerald">
            <DollarSign size={20} />
          </div>
          <div className="inv-stat-text">
            <span className="inv-stat-label">Valor en Inventario (Venta)</span>
            <span className="inv-stat-value">{formatCurrency(totalValue)}</span>
          </div>
        </div>

        <div className="inv-stat-card">
          <div className="inv-stat-icon icon-purple">
            <TrendingUp size={20} />
          </div>
          <div className="inv-stat-text">
            <span className="inv-stat-label">Margen Bruto Promedio</span>
            <span className="inv-stat-value">{isAdmin ? `${averageMargin.toFixed(1)}%` : '••••'}</span>
          </div>
        </div>

        <div className="inv-stat-card">
          <div className={`inv-stat-icon ${lowStockCount > 0 ? 'icon-rose' : 'icon-cyan'}`}>
            <AlertTriangle size={20} />
          </div>
          <div className="inv-stat-text">
            <span className="inv-stat-label">Alertas de Stock Bajo</span>
            <span className="inv-stat-value">{lowStockCount} ítems</span>
          </div>
        </div>
      </div>

      {/* Control & Filter Toolbar */}
      <div className="inventory-toolbar">
        <div className="toolbar-left">
          {/* Search Input */}
          <div className="inv-search-wrapper">
            <Search size={16} className="inv-search-icon" />
            <input
              type="text"
              placeholder="Buscar por código, nombre o ingrediente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="inv-search-input"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="inv-select"
          >
            <option value="all">Todas las Categorías</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>

          {/* Stock Filter Dropdown */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="inv-select"
          >
            <option value="all">Todo el Inventario</option>
            <option value="normal">🟢 Stock Adecuado</option>
            <option value="low">🟡 Stock Bajo / Alerta</option>
            <option value="out">🔴 Agotados</option>
          </select>
        </div>

        <div className="toolbar-right">
          {/* Add Product Button (Solo Admin) */}
          {isAdmin && (
            <button
              type="button"
              className="btn-add-product"
              onClick={onOpenNewProduct}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Nuevo Producto</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Inventory & Prices Table */}
      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Imagen</th>
              <th onClick={() => { setSortBy('name'); setSortAsc(!sortAsc); }} className="sortable-th">
                <span className="th-sort-wrapper">
                  <span>Producto / Código</span>
                  <ArrowUpDown size={13} />
                </span>
              </th>
              <th className="th-center">Categoría</th>
              <th onClick={() => { setSortBy('cost'); setSortAsc(!sortAsc); }} className="sortable-th th-center">
                <span className="th-sort-wrapper">
                  <span>Costo Insumo ($)</span>
                  <ArrowUpDown size={13} />
                </span>
              </th>
              <th onClick={() => { setSortBy('price'); setSortAsc(!sortAsc); }} className="sortable-th th-center">
                <span className="th-sort-wrapper">
                  <span>Precio de Venta ($)</span>
                  <ArrowUpDown size={13} />
                </span>
              </th>
              <th onClick={() => { setSortBy('margin'); setSortAsc(!sortAsc); }} className="sortable-th th-center">
                <span className="th-sort-wrapper">
                  <span>Margen (%)</span>
                  <ArrowUpDown size={13} />
                </span>
              </th>
              <th onClick={() => { setSortBy('stock'); setSortAsc(!sortAsc); }} className="sortable-th th-center" style={{ minWidth: '120px' }}>
                <span className="th-sort-wrapper">
                  <span>Stock Actual</span>
                  <ArrowUpDown size={13} />
                </span>
              </th>
              {isAdmin && <th className="th-center">Ajuste Rápido</th>}
              {isAdmin && <th style={{ width: '100px' }} className="th-center">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {sortedProducts.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 7} className="inv-empty-cell">
                  No se encontraron productos que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              sortedProducts.map((product) => {
                const margin =
                  product.price > 0
                    ? ((product.price - product.cost) / product.price) * 100
                    : 0;
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= product.minStock;

                return (
                  <tr key={product.id} className={isOutOfStock ? 'row-out-of-stock' : ''}>
                    {/* Image Thumbnail */}
                    <td className="td-img">
                      <div className="product-thumb-box">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="product-thumb"
                          loading="lazy"
                        />
                      </div>
                    </td>

                    {/* Product Name & Code */}
                    <td className="td-name">
                      <span className="prod-name-title">{product.name}</span>
                      <div className="prod-code-sub">
                        <span className="code-badge">{product.code}</span>
                        <span className="unit-badge">{product.unit}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="td-category">
                      <span className="category-tag">
                        {CATEGORIES.find((c) => c.id === product.category)?.icon}{' '}
                        {CATEGORIES.find((c) => c.id === product.category)?.label}
                      </span>
                    </td>

                    {/* Cost */}
                    <td className="td-cost">
                      {!isAdmin ? (
                        <span className="cost-amount" style={{ color: 'var(--text-muted)' }} title="Dato confidencial para Administrador">••••</span>
                      ) : editingCostId === product.id ? (
                        <div className="inline-price-edit">
                          <input
                            type="number"
                            value={tempCostValue}
                            onChange={(e) => setTempCostValue(e.target.value)}
                            className="input-inline-price"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveCost(product.id);
                              if (e.key === 'Escape') setEditingCostId(null);
                            }}
                          />
                          <button
                            type="button"
                            className="btn-inline-save"
                            onClick={() => handleSaveCost(product.id)}
                            title="Guardar nuevo costo"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn-inline-cancel"
                            onClick={() => setEditingCostId(null)}
                            title="Cancelar"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="cost-display-box"
                          onClick={() => handleStartEditCost(product)}
                          title="Click para editar el costo de insumo"
                        >
                          <span className="cost-amount">{formatCurrency(product.cost)}</span>
                          <Edit2 size={12} className="edit-hint-icon" />
                        </div>
                      )}
                    </td>

                    {/* Sale Price - Editable inline for Admin only! */}
                    <td className="td-price">
                      {!isAdmin ? (
                        <div className="price-display-box" style={{ cursor: 'default' }}>
                          <span className="sale-price-highlight">
                            {formatCurrency(product.price)}
                          </span>
                        </div>
                      ) : editingPriceId === product.id ? (
                        <div className="inline-price-edit">
                          <input
                            type="number"
                            value={tempPriceValue}
                            onChange={(e) => setTempPriceValue(e.target.value)}
                            className="input-inline-price"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSavePrice(product.id);
                              if (e.key === 'Escape') setEditingPriceId(null);
                            }}
                          />
                          <button
                            type="button"
                            className="btn-inline-save"
                            onClick={() => handleSavePrice(product.id)}
                            title="Guardar nuevo precio"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn-inline-cancel"
                            onClick={() => setEditingPriceId(null)}
                            title="Cancelar"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="price-display-box"
                          onClick={() => handleStartEditPrice(product)}
                          title="Click para editar el precio de venta"
                        >
                          <span className="sale-price-highlight">
                            {formatCurrency(product.price)}
                          </span>
                          <Edit2 size={12} className="edit-hint-icon" />
                        </div>
                      )}
                    </td>

                    {/* Margin */}
                    <td className="td-margin">
                      {!isAdmin ? (
                        <span style={{ color: 'var(--text-muted)' }} title="Dato confidencial para Administrador">••••</span>
                      ) : (
                        <div
                          className={`margin-chip ${
                            margin >= 60 ? 'chip-high' : margin >= 35 ? 'chip-mid' : 'chip-low'
                          }`}
                          title={`Margen Bruto: ${margin.toFixed(1)}% | Ganancia neta: ${formatCurrency(
                            product.price - product.cost
                          )} por unidad`}
                        >
                          <span className="margin-chip-val">{margin.toFixed(1)}%</span>
                          <div className="margin-chip-track">
                            <div
                              className="margin-chip-fill"
                              style={{ width: `${Math.min(100, Math.max(0, margin))}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Stock level */}
                    <td className="td-stock">
                      <div
                        className={`stock-level-box ${
                          isOutOfStock ? 'stock-status-out' : isLowStock ? 'stock-status-low' : 'stock-status-normal'
                        }`}
                      >
                        <div className="stock-numbers">
                          <span
                            className={`current-stock-val ${
                              isOutOfStock ? 'val-red' : isLowStock ? 'val-amber' : 'val-green'
                            }`}
                          >
                            {product.stock}
                          </span>
                          <span className="min-stock-sub">/ mín {product.minStock}</span>
                        </div>
                        <div className="stock-progress-bar">
                          <div
                            className={`stock-progress-fill ${
                              isOutOfStock ? 'fill-red' : isLowStock ? 'fill-yellow' : 'fill-green'
                            }`}
                            style={{
                              width: isOutOfStock
                                ? '100%'
                                : isLowStock
                                ? `${Math.max(25, Math.min(75, Math.round((product.stock / (product.minStock || 5)) * 60)))}%`
                                : `${Math.min(100, Math.max(50, Math.round((product.stock / (product.minStock * 2 || 10)) * 100)))}%`,
                            }}
                          />
                        </div>
                        {product.reservedStock && product.reservedStock > 0 ? (
                          <div
                            className={`stock-in-progress-pill ${isOutOfStock ? 'pill-alert-out' : ''}`}
                            title={`${product.reservedStock} unidad(es) seleccionada(s) en comanda activa o mesas`}
                          >
                            <span className="in-progress-dot" />
                            <span>{product.reservedStock} en curso</span>
                          </div>
                        ) : null}
                      </div>
                    </td>

                    {/* Quick Adjust buttons (Solo Admin) */}
                    {isAdmin && (
                      <td className="td-adjust">
                        <div className="quick-adjust-group">
                          <button
                            type="button"
                            className="btn-adjust minus"
                            onClick={() => onQuickAdjustStock(product.id, -1)}
                            disabled={product.stock <= 0}
                            title="Restar 1 al stock"
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            className="btn-adjust plus"
                            onClick={() => onQuickAdjustStock(product.id, +1)}
                            title="Sumar 1 al stock"
                          >
                            +1
                          </button>
                        </div>
                      </td>
                    )}

                    {/* Actions (Solo Admin puede editar ficha completa o borrar producto) */}
                    {isAdmin && (
                      <td className="td-actions">
                        <div className="row-actions-group">
                          <button
                            type="button"
                            className="btn-row-action"
                            onClick={() => onEditProduct(product)}
                            title="Editar detalles completos del producto"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn-row-action danger"
                            onClick={() => onDeleteProduct(product.id)}
                            title="Eliminar producto"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
