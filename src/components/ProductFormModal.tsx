import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Check, CheckCircle, DollarSign, Upload, Link2, PackagePlus, Edit2, RotateCcw } from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { CATEGORIES } from '../utils/defaults';
import { formatCurrency } from '../utils/storage';
import laMoliendaLogo from '../assets/la_molienda_logo.png';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  initialData?: Product | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  if (!isOpen) return null;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('cafe');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>(0);
  const [cost, setCost] = useState<number | ''>(0);
  const [stock, setStock] = useState<number | ''>(10);
  const [minStock, setMinStock] = useState<number | ''>(5);
  const [unit, setUnit] = useState<Product['unit']>('copa');
  const [image, setImage] = useState('');
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');

  useEffect(() => {
    if (initialData) {
      setCode(initialData.code);
      setName(initialData.name);
      setCategory(initialData.category);
      setDescription(initialData.description);
      setPrice(initialData.price);
      setCost(initialData.cost);
      setStock(initialData.stock);
      setMinStock(initialData.minStock);
      setUnit(initialData.unit);
      setImage(initialData.image || '');
    } else {
      setCode(`PRD-${Math.floor(100 + Math.random() * 900)}`);
      setName('');
      setCategory('cafe');
      setDescription('');
      setPrice(12000);
      setCost(3500);
      setStock(30);
      setMinStock(8);
      setUnit('copa');
      setImage('');
    }
  }, [initialData, isOpen]);

  const numPrice = Number(price) || 0;
  const numCost = Number(cost) || 0;
  const profitMargin = numPrice > 0 ? ((numPrice - numCost) / numPrice) * 100 : 0;
  const unitProfit = numPrice - numCost;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor ingresa el nombre del producto.');
      return;
    }

    const savedProduct: Product = {
      id: initialData?.id || `prod-${Date.now()}`,
      code: code.trim() || `PRD-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      category,
      description: description.trim(),
      price: Number(price) || 0,
      cost: Number(cost) || 0,
      stock: Number(stock) || 0,
      minStock: Number(minStock) || 0,
      unit,
      image: image.trim() || laMoliendaLogo,
      available: true,
      updatedAt: new Date().toISOString(),
    };

    onSave(savedProduct);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container product-form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="product-header-box">
            <div className="modal-header-icon-badge">
              {initialData ? <Edit2 size={20} /> : <PackagePlus size={20} />}
            </div>
            <div>
              <h2 className="modal-title">
                {initialData ? 'Editar Producto & Precio' : 'Registrar Nuevo Producto'}
              </h2>
              <p className="modal-subtitle">
                Configura el precio de venta, costo de insumos, imagen y control de inventario.
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        {/* Form Body & Footer */}
        <form onSubmit={handleSubmit} className="product-form-wrapper">
          <div className="product-form-body">
            <div className="form-two-columns">
            {/* LEFT COLUMN: Data Fields & Pricing */}
            <div className="form-col-data">
              <div className="form-group-row">
                <div className="form-group flex-1">
                  <label className="form-label">Código / Referencia *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="form-input"
                    placeholder="Ej: CAF-08, CKT-09"
                  />
                </div>

                <div className="form-group flex-2">
                  <label className="form-label">Categoría *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="form-select"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del Producto / Cóctel / Bebida *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input name-input"
                  placeholder="Ej: Carajillo La Molienda, Cappuccino Latte Art..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción & Notas de Sabor</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-textarea"
                  placeholder="Ingredientes clave, tipo de preparación, notas aromáticas..."
                />
              </div>

              {/* PRICING & MARGIN SECTION */}
              <div className="pricing-financial-box">
                <div className="pricing-box-title">
                  <DollarSign size={16} /> Definición de Precios & Rentabilidad
                </div>

                <div className="pricing-grid">
                  <div className="form-group">
                    <label className="form-label price-label">
                      Precio de Venta al Público ($) *
                    </label>
                    <div className="price-input-wrapper">
                      <span className="price-prefix">$</span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="100"
                        value={price}
                        onChange={(e) =>
                          setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                        }
                        className="form-input price-input-highlight"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Costo Insumo / Preparación ($)</label>
                    <div className="price-input-wrapper">
                      <span className="price-prefix cost-prefix">$</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={cost}
                        onChange={(e) =>
                          setCost(e.target.value === '' ? '' : parseFloat(e.target.value))
                        }
                        className="form-input cost-input-highlight"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Profit Margin Preview Bar */}
                <div className="profit-margin-calc-bar">
                  <div className="margin-indicator">
                    <span className="margin-lbl">Margen de Ganancia:</span>
                    <span
                      className={`margin-value ${
                        profitMargin >= 60
                          ? 'text-green'
                          : profitMargin >= 35
                          ? 'text-amber'
                          : 'text-red'
                      }`}
                    >
                      {profitMargin.toFixed(1)}%
                    </span>
                  </div>

                  <div className="profit-unit-indicator">
                    <span className="margin-lbl">Ganancia por Unidad:</span>
                    <span className="unit-profit-val">{formatCurrency(unitProfit)}</span>
                  </div>
                </div>
              </div>

              {/* INVENTORY & STOCK */}
              <div className="inventory-levels-row">
                <div className="form-group flex-1">
                  <label className="form-label">Stock Actual *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={stock}
                    onChange={(e) =>
                      setStock(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                    className="form-input"
                    placeholder="0"
                  />
                </div>

                <div className="form-group flex-1">
                  <label className="form-label">Alerta Stock Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={minStock}
                    onChange={(e) =>
                      setMinStock(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                    className="form-input"
                    placeholder="5"
                  />
                </div>

                <div className="form-group flex-1">
                  <label className="form-label">Unidad de Venta</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="form-select"
                  >
                    <option value="copa">Copa / Vaso</option>
                    <option value="unidad">Unidad</option>
                    <option value="porción">Porción / Plato</option>
                    <option value="botella">Botella</option>
                    <option value="trago">Trago / Shot</option>
                  </select>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Image Selector & Live Preview */}
            <div className="form-col-image">
              <label className="form-label">Fotografía del Producto *</label>

              {/* Live Preview Card */}
              <div className="image-live-preview-box">
                <img
                  src={image || laMoliendaLogo}
                  alt={name || 'Vista previa'}
                  className="preview-img"
                  style={{
                    objectFit: image ? 'cover' : 'contain',
                    background: image ? 'transparent' : '#14100c',
                    padding: image ? 0 : '1.5rem',
                  }}
                />
                <div className="preview-cost-overlay" title="Costo Insumo / Preparación">
                  <span className="preview-cost-label">Costo Insumo:</span>
                  <span className="preview-cost-currency">$</span>
                  <span className="preview-cost-val">{(numCost || 0).toLocaleString('es-CO')}</span>
                </div>
                <div className="preview-price-overlay" title="Precio de Venta al Público">
                  <span className="preview-price-currency">$</span>
                  <span className="preview-price-val">{(numPrice || 0).toLocaleString('es-CO')}</span>
                </div>
                <div className="preview-name-overlay">{name || 'Nombre del Producto'}</div>
              </div>

              {image && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => setImage('')}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)',
                      borderRadius: '6px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                    title="Quitar foto y usar logo oficial de La Molienda"
                  >
                    <RotateCcw size={12} />
                    <span>Usar logo oficial por defecto</span>
                  </button>
                </div>
              )}

              {/* Selector Tabs: Upload / URL */}
              <div className="img-tabs-bar" style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className={`img-tab-btn ${imageTab === 'upload' ? 'active' : ''}`}
                  onClick={() => setImageTab('upload')}
                >
                  <Upload size={13} /> Subir Archivo
                </button>
                <button
                  type="button"
                  className={`img-tab-btn ${imageTab === 'url' ? 'active' : ''}`}
                  onClick={() => setImageTab('url')}
                >
                  <Link2 size={13} /> Enlace URL
                </button>
              </div>

              {/* URL Input */}
              {imageTab === 'url' && (
                <div className="image-url-box">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="form-input"
                  />
                  <p className="url-hint">Ingresa la dirección web de una imagen de alta resolución.</p>
                </div>
              )}

              {/* File Upload */}
              {imageTab === 'upload' && (
                <div className="image-upload-box">
                  <label className="upload-dropzone">
                    <Upload size={24} className="upload-icon" />
                    <span>Haz click para subir una foto desde tu equipo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden-file-input"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-confirm-open">
              <CheckCircle size={16} />
              <span>{initialData ? 'Guardar Cambios' : 'Registrar Producto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
