import React, { useState } from 'react';
import {
  Zap,
  Sparkles,
  Droplets,
  Flame,
  Wifi,
  Smartphone,
  Coffee,
  Layers,
  Trash2,
  Shirt,
  DollarSign,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  CreditCard,
  Check,
  FileCheck,
  Printer,
  Receipt,
  Search,
  Building,
} from 'lucide-react';
import laMoliendaLogo from '../../assets/la_molienda_logo.png';
import {
  FixedExpenseCategory,
  FixedExpenseItem,
  ExpensePaymentStatus,
  ExpensePaymentMethod,
} from '../types';
import { formatCOP, formatDate } from '../utils/formatters';

interface FixedExpensesViewProps {
  category: FixedExpenseCategory; // 'servicios_publicos' | 'aseo_dotacion'
  expenses: FixedExpenseItem[];
  onAddExpense: (expense: FixedExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateExpenseStatus: (id: string, status: ExpensePaymentStatus) => void;
}

interface CategoryPreset {
  id: string;
  title: string;
  subCategory: string;
  defaultProvider: string;
  shortDesc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const PRESETS: Record<FixedExpenseCategory, CategoryPreset[]> = {
  servicios_publicos: [
    {
      id: 'energia',
      title: 'Energía Eléctrica',
      subCategory: 'Energía',
      defaultProvider: 'EPM / Operador de Energía',
      shortDesc: 'Luz y potencia del local',
      icon: Zap,
    },
    {
      id: 'agua',
      title: 'Agua y Alcantarillado',
      subCategory: 'Acueducto',
      defaultProvider: 'Aguas Locales / EPM',
      shortDesc: 'Acueducto y saneamiento',
      icon: Droplets,
    },
    {
      id: 'gas',
      title: 'Gas Natural / Propano',
      subCategory: 'Gas',
      defaultProvider: 'Empresa de Gas',
      shortDesc: 'Cocina y calentador',
      icon: Flame,
    },
    {
      id: 'internet',
      title: 'Internet & Wi-Fi',
      subCategory: 'Telecomunicaciones',
      defaultProvider: 'Claro / Tigo / Movistar',
      shortDesc: 'Fibra óptica clientes/POS',
      icon: Wifi,
    },
    {
      id: 'movil',
      title: 'Plan Móvil Corporativo',
      subCategory: 'Telefonía',
      defaultProvider: 'Operador Móvil',
      shortDesc: 'Línea de pedidos/WhatsApp',
      icon: Smartphone,
    },
  ],
  aseo_dotacion: [
    {
      id: 'quimicos',
      title: 'Químicos & Cafetera',
      subCategory: 'Químicos Cafetera',
      defaultProvider: 'Distribuidor Especializado de Café',
      shortDesc: 'Desengrasante y lanzaderas',
      icon: Coffee,
    },
    {
      id: 'papel',
      title: 'Papel & Servilletas',
      subCategory: 'Papelería Institucional',
      defaultProvider: 'Distribuidora de Desechables',
      shortDesc: 'Higiénico jumbo y toallas',
      icon: Layers,
    },
    {
      id: 'bolsas',
      title: 'Bolsas & Residuos',
      subCategory: 'Bolsas y Residuos',
      defaultProvider: 'Proveedor de Aseo',
      shortDesc: 'Código de colores y canecas',
      icon: Trash2,
    },
    {
      id: 'limpieza',
      title: 'Limpieza General',
      subCategory: 'Limpieza General',
      defaultProvider: 'Distribuidora de Aseo',
      shortDesc: 'Cloro, desinfectante, trapero',
      icon: Sparkles,
    },
    {
      id: 'dotacion',
      title: 'Dotación & Delantales',
      subCategory: 'Dotación Personal',
      defaultProvider: 'Proveedor de Dotaciones',
      shortDesc: 'Uniformes, gorros, delantales',
      icon: Shirt,
    },
  ],
};

const CATEGORY_CONFIG: Record<
  FixedExpenseCategory,
  {
    title: string;
    subtitle: string;
    badgeLabel: string;
    btnLabel: string;
    modalTitle: string;
    modalSubtitle: string;
    voucherTitle: string;
    icon: typeof Zap;
    color: string;
    bg: string;
    border: string;
  }
> = {
  servicios_publicos: {
    title: 'Servicios Públicos (Esenciales)',
    subtitle: 'Control y liquidación de energía eléctrica, agua, gas y telecomunicaciones',
    badgeLabel: 'Servicios Públicos',
    btnLabel: 'Registrar Factura de Servicio',
    modalTitle: 'Registrar Factura de Servicio Público',
    modalSubtitle: 'Control de fechas límite, periodos y comprobantes de servicios',
    voucherTitle: 'COMPROBANTE DE SERVICIOS PÚBLICOS',
    icon: Zap,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.35)',
  },
  aseo_dotacion: {
    title: 'Insumos de Aseo y Dotación Operativa',
    subtitle: 'Control de compras de químicos de cafetera, papel, bolsas y dotación',
    badgeLabel: 'Aseo & Dotación',
    btnLabel: 'Registrar Gasto de Aseo / Dotación',
    modalTitle: 'Registrar Compra de Aseo o Dotación',
    modalSubtitle: 'Control de compras de limpieza, desinfección y dotación del personal',
    voucherTitle: 'COMPROBANTE DE ASEO Y DOTACIÓN',
    icon: Sparkles,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.35)',
  },
};

export const FixedExpensesView: React.FC<FixedExpensesViewProps> = ({
  category,
  expenses,
  onAddExpense,
  onDeleteExpense,
}) => {
  const config = CATEGORY_CONFIG[category];
  const presets = PRESETS[category] || [];
  const CategoryIcon = config.icon;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receiptToPrint, setReceiptToPrint] = useState<FixedExpenseItem | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | ExpensePaymentStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const now = new Date();
  const currentMonthName = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  const formattedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);
  const todayStr = now.toISOString().split('T')[0];

  const defaultPreset = presets[0];
  const [formSubCategory, setFormSubCategory] = useState(defaultPreset?.subCategory || 'General');
  const [formTitle, setFormTitle] = useState(defaultPreset?.title || '');
  const [formProvider, setFormProvider] = useState(defaultPreset?.defaultProvider || '');
  const [formPeriodMonth, setFormPeriodMonth] = useState(formattedMonth);
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDueDate, setFormDueDate] = useState(todayStr);
  const [formPaymentDate, setFormPaymentDate] = useState(todayStr);
  const [formStatus, setFormStatus] = useState<ExpensePaymentStatus>('pendiente');
  const [formPaymentMethod, setFormPaymentMethod] = useState<ExpensePaymentMethod>('transferencia');
  const [formReceiptRef, setFormReceiptRef] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const handleOpenModal = () => {
    const first = presets[0];
    if (first) {
      setFormTitle(first.title);
      setFormSubCategory(first.subCategory);
      setFormProvider(first.defaultProvider);
    }
    setFormPeriodMonth(formattedMonth);
    setFormAmount('');
    setFormDueDate(todayStr);
    setFormPaymentDate(todayStr);
    setFormStatus('pendiente');
    setFormReceiptRef('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleSelectPreset = (preset: CategoryPreset) => {
    setFormTitle(preset.title);
    setFormSubCategory(preset.subCategory);
    setFormProvider(preset.defaultProvider);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAmount || Number(formAmount) <= 0) {
      alert('Por favor ingresa un concepto y un monto válido.');
      return;
    }

    const newExpense: FixedExpenseItem = {
      id: 'fix-exp-' + Date.now(),
      category,
      subCategory: formSubCategory.trim() || 'General',
      title: formTitle.trim(),
      periodMonth: formPeriodMonth.trim() || formattedMonth,
      amount: Number(formAmount),
      dueDate: formDueDate || todayStr,
      paymentDate: formStatus === 'pagado' ? (formPaymentDate || todayStr) : undefined,
      status: formStatus,
      paymentMethod: formStatus === 'pagado' ? formPaymentMethod : undefined,
      receiptReference: formReceiptRef.trim() || undefined,
      provider: formProvider.trim() || undefined,
      notes: formNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    onAddExpense(newExpense);
    setIsModalOpen(false);
  };

  // Only consider items of this category
  const categoryExpenses = expenses.filter((e) => e.category === category);

  const paidExpenses = categoryExpenses.filter((e) => e.status === 'pagado');
  const pendingExpenses = categoryExpenses.filter((e) => e.status === 'pendiente' || e.status === 'vencido');

  const totalPaid = paidExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPending = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Filtered List
  const filteredExpenses = categoryExpenses.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchProvider = item.provider?.toLowerCase().includes(q);
      const matchRef = item.receiptReference?.toLowerCase().includes(q);
      const matchSub = item.subCategory?.toLowerCase().includes(q);
      const matchPeriod = item.periodMonth?.toLowerCase().includes(q);
      if (!matchTitle && !matchProvider && !matchRef && !matchSub && !matchPeriod) return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Barrita de Métricas / KPIs */}
      <div className="inventory-stats-strip">
        <div className="inv-stat-card">
          <div className="inv-stat-icon icon-emerald">
            <CheckCircle2 size={20} />
          </div>
          <div className="inv-stat-text">
            <span className="inv-stat-label">TOTAL {config.badgeLabel.toUpperCase()} PAGADO</span>
            <span className="inv-stat-value" style={{ color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
              {formatCOP(totalPaid)}
            </span>
          </div>
        </div>

        <div className="inv-stat-card">
          <div className={`inv-stat-icon ${totalPending > 0 ? 'icon-rose' : 'icon-amber'}`}>
            <Clock size={20} />
          </div>
          <div className="inv-stat-text">
            <span className="inv-stat-label">PAGOS PENDIENTES</span>
            <span className="inv-stat-value" style={{ color: totalPending > 0 ? '#fb7185' : 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
              {formatCOP(totalPending)}
            </span>
          </div>
        </div>

        <div className="inv-stat-card">
          <div className="inv-stat-icon icon-blue">
            <CategoryIcon size={20} />
          </div>
          <div className="inv-stat-text">
            <span className="inv-stat-label">REGISTROS EN HISTORIAL</span>
            <span className="inv-stat-value" style={{ fontFamily: 'var(--font-mono)' }}>
              {categoryExpenses.length} {categoryExpenses.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Barra de Herramientas y Filtros */}
      <div className="inventory-toolbar">
        <div className="toolbar-left">
          <div className="inv-search-wrapper">
            <Search size={16} className="inv-search-icon" />
            <input
              type="text"
              placeholder={`Buscar en ${config.badgeLabel}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="inv-search-input"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="inv-select"
          >
            <option value="all">Todos los estados</option>
            <option value="pagado">Solo Pagados</option>
            <option value="pendiente">Solo Pendientes</option>
            <option value="vencido">Solo Vencidos</option>
          </select>
        </div>

        <div className="toolbar-right">
          <button
            type="button"
            className="btn-add-product pos-btn-primary"
            onClick={handleOpenModal}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{config.btnLabel}</span>
          </button>
        </div>
      </div>

      {/* 3. Tabla de Registros */}
      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Concepto / Detalle</th>
              <th>Proveedor / Entidad</th>
              <th style={{ textAlign: 'center' }}>Periodo</th>
              <th style={{ textAlign: 'center' }}>Vencimiento</th>
              <th style={{ textAlign: 'right' }}>Monto</th>
              <th style={{ textAlign: 'center' }}>Método / Ref</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No se encontraron registros de {config.badgeLabel}.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => (
                <tr key={exp.id}>
                  <td>
                    <span style={{ fontWeight: 750, color: 'var(--text-primary)', display: 'block' }}>
                      {exp.title}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Subcategoría: {exp.subCategory}
                    </span>
                    {exp.notes && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                        Nota: {exp.notes}
                      </div>
                    )}
                  </td>

                  <td>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {exp.provider || 'Sin especificar'}
                    </span>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {exp.periodMonth}
                    </span>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      <Clock size={13} style={{ color: 'var(--accent-amber)' }} />
                      <span>{formatDate(exp.dueDate)}</span>
                    </div>
                  </td>

                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                    {formatCOP(exp.amount)}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    {exp.paymentMethod ? (
                      <div>
                        <span className={`method-pill ${exp.paymentMethod}`}>
                          {exp.paymentMethod}
                        </span>
                        {exp.receiptReference && (
                          <span style={{ display: 'block', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            #{exp.receiptReference}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <span className={`status-badge ${exp.status === 'pagado' ? 'paid' : exp.status === 'vencido' ? 'overdue' : 'pending'}`}>
                      {exp.status === 'pagado' ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span>Pagado</span>
                        </>
                      ) : exp.status === 'vencido' ? (
                        <>
                          <AlertTriangle size={13} />
                          <span>Vencido</span>
                        </>
                      ) : (
                        <>
                          <Clock size={13} />
                          <span>Pendiente</span>
                        </>
                      )}
                    </span>
                  </td>

                  <td>
                    <div className="action-buttons-cell">
                      <button
                        type="button"
                        className="table-action-btn btn-print"
                        onClick={() => setReceiptToPrint(exp)}
                        title="Imprimir Comprobante"
                      >
                        <Printer size={14} />
                      </button>

                      <button
                        type="button"
                        className="table-action-btn btn-delete"
                        onClick={() => {
                          if (window.confirm(`¿Deseas eliminar el registro "${exp.title}"?`)) {
                            onDeleteExpense(exp.id);
                          }
                        }}
                        title="Eliminar registro"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Modal para Registrar Gasto */}
      {isModalOpen && (
        <div className="pos-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="pos-modal-box"
            style={{ maxWidth: '640px', width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-modal-header">
              <div className="pos-modal-title-group">
                <div className="pos-modal-icon-badge" style={{ background: config.bg, color: config.color }}>
                  <CategoryIcon size={20} />
                </div>
                <div>
                  <h3 className="pos-modal-title">{config.modalTitle}</h3>
                  <p className="pos-modal-subtitle">{config.modalSubtitle}</p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn pos-modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                title="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="pos-modal-body">
              {/* Selector Visual de Conceptos Frecuentes */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                  <label className="pos-form-label" style={{ margin: 0, fontWeight: 800, fontSize: '0.82rem' }}>
                    Concepto / Tipo de {category === 'servicios_publicos' ? 'Servicio' : 'Insumo'}
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Haz clic para autocompletar
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '0.55rem',
                  }}
                >
                  {presets.map((p) => {
                    const isSelected = formTitle === p.title;
                    const PresetIcon = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPreset(p)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0.65rem 0.8rem',
                          borderRadius: '12px',
                          border: isSelected
                            ? `2px solid ${config.color}`
                            : '1.5px solid var(--border-color)',
                          background: isSelected
                            ? (category === 'servicios_publicos' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)')
                            : 'var(--bg-input)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.18s ease',
                          boxShadow: isSelected ? `0 2px 8px ${config.color}22` : 'none',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: isSelected ? config.color : 'rgba(255, 255, 255, 0.08)',
                            color: isSelected ? '#ffffff' : config.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.18s ease',
                          }}
                        >
                          <PresetIcon size={17} />
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span
                            style={{
                              display: 'block',
                              fontSize: '0.8rem',
                              fontWeight: isSelected ? 800 : 650,
                              color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                              lineHeight: 1.2,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {p.title}
                          </span>
                          <span
                            style={{
                              display: 'block',
                              fontSize: '0.68rem',
                              color: 'var(--text-muted)',
                              marginTop: '0.15rem',
                              lineHeight: 1.15,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {p.shortDesc}
                          </span>
                        </div>

                        {isSelected && (
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: config.color,
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Check size={11} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Concepto y Proveedor */}
              <div className="pos-form-grid-2">
                <div className="pos-form-group">
                  <label className="pos-form-label">Concepto / Nombre del Gasto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Factura Energía Eléctrica"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="pos-form-input"
                  />
                </div>

                <div className="pos-form-group">
                  <label className="pos-form-label">Proveedor / Entidad Emisora</label>
                  <input
                    type="text"
                    placeholder="Ej. EPM, Claro, Distribuidora..."
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value)}
                    className="pos-form-input"
                  />
                </div>
              </div>

              {/* Periodo y Monto */}
              <div className="pos-form-grid-2">
                <div className="pos-form-group">
                  <label className="pos-form-label">Periodo / Mes *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Noviembre 2026"
                    value={formPeriodMonth}
                    onChange={(e) => setFormPeriodMonth(e.target.value)}
                    className="pos-form-input"
                  />
                </div>

                <div className="pos-form-group">
                  <label className="pos-form-label">Monto a Pagar ($ COP) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="Ej. 350000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value ? Number(e.target.value) : '')}
                    className="pos-form-input"
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Fechas */}
              <div className="pos-form-grid-2">
                <div className="pos-form-group">
                  <label className="pos-form-label">Fecha Límite (Vencimiento) *</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="pos-form-input"
                  />
                </div>

                <div className="pos-form-group">
                  <label className="pos-form-label">Estado de la Factura *</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ExpensePaymentStatus)}
                    className="pos-form-select"
                  >
                    <option value="pendiente">Pendiente de Pago</option>
                    <option value="pagado">Pagado</option>
                    <option value="vencido">Vencido</option>
                  </select>
                </div>
              </div>

              {/* Campos condicionales si está PAGADO */}
              {formStatus === 'pagado' && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: 'var(--accent-emerald)',
                      textTransform: 'uppercase',
                      display: 'block',
                      marginBottom: '0.65rem',
                    }}
                  >
                    Detalles del Desembolso / Pago Efectuado
                  </span>

                  <div className="pos-form-grid-2">
                    <div className="pos-form-group">
                      <label className="pos-form-label">Fecha en que se Pagó</label>
                      <input
                        type="date"
                        value={formPaymentDate}
                        onChange={(e) => setFormPaymentDate(e.target.value)}
                        className="pos-form-input"
                      />
                    </div>

                    <div className="pos-form-group">
                      <label className="pos-form-label">Método de Pago</label>
                      <select
                        value={formPaymentMethod}
                        onChange={(e) => setFormPaymentMethod(e.target.value as ExpensePaymentMethod)}
                        className="pos-form-select"
                      >
                        <option value="transferencia">Transferencia Bancaria</option>
                        <option value="efectivo">Efectivo en Caja</option>
                        <option value="nequi">Nequi</option>
                        <option value="daviplata">Daviplata</option>
                        <option value="tarjeta">Tarjeta Débito/Crédito</option>
                      </select>
                    </div>
                  </div>

                  <div className="pos-form-group" style={{ marginTop: '0.65rem' }}>
                    <label className="pos-form-label">N° de Comprobante / Referencia de Pago</label>
                    <input
                      type="text"
                      placeholder="Ej. TR-98234120 o Ref 48192"
                      value={formReceiptRef}
                      onChange={(e) => setFormReceiptRef(e.target.value)}
                      className="pos-form-input"
                    />
                  </div>
                </div>
              )}

              {/* Observaciones */}
              <div className="pos-form-group">
                <label className="pos-form-label">Notas u Observaciones (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Detalles adicionales, número de contrato, etc."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="pos-form-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="pos-modal-footer">
                <button
                  type="button"
                  className="pos-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="pos-btn-primary">
                  Guardar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal de Comprobante Imprimible */}
      {receiptToPrint && (
        <div className="pos-modal-overlay" onClick={() => setReceiptToPrint(null)}>
          <div
            className="pos-modal-box"
            style={{
              maxWidth: '520px',
              width: '95vw',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
              border: '1.5px solid var(--border-color)',
              background: 'var(--bg-card)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="pos-modal-header no-print"
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(0, 0, 0, 0.3))',
                borderBottom: '1px solid var(--border-color)',
                padding: '1rem 1.25rem',
              }}
            >
              <div className="pos-modal-title-group">
                <div
                  className="pos-modal-icon-badge"
                  style={{
                    background: config.bg,
                    color: config.color,
                    border: `1px solid ${config.border}`,
                  }}
                >
                  <Printer size={18} />
                </div>
                <div>
                  <h3 className="pos-modal-title" style={{ fontSize: '1.05rem' }}>
                    Comprobante de Egreso Operativo
                  </h3>
                  <p className="pos-modal-subtitle" style={{ fontSize: '0.74rem' }}>
                    Soporte oficial de pago y liquidación de gasto
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn pos-modal-close-btn"
                onClick={() => setReceiptToPrint(null)}
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className="pos-modal-body print-voucher-page"
              id="rent-receipt-sheet"
              style={{
                padding: '1.5rem',
                background: '#ffffff',
                color: '#1a1a1a',
                fontFamily: "'Courier New', Courier, monospace",
                lineHeight: 1.35,
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '0.85rem' }}>
                <img
                  src={laMoliendaLogo}
                  alt="La Molienda"
                  style={{
                    width: '64px',
                    height: 'auto',
                    margin: '0 auto 0.4rem auto',
                    display: 'block',
                    filter: 'grayscale(100%) contrast(150%)',
                  }}
                />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 900, margin: '0 0 0.15rem 0', color: '#000000', letterSpacing: '0.5px' }}>
                  LA MOLIENDA CAFÉ BAR
                </h2>
                <div style={{ fontSize: '0.72rem', color: '#444444' }}>
                  NIT: 901.482.103-1 • Régimen Simple
                </div>
                <div style={{ fontSize: '0.72rem', color: '#444444' }}>
                  Sede Principal • Armenia, Quindío, Colombia
                </div>

                <div className="receipt-divider-dashed" style={{ margin: '0.65rem 0' }} />

                <div
                  style={{
                    display: 'inline-block',
                    background: '#000000',
                    color: '#ffffff',
                    padding: '0.2rem 0.75rem',
                    fontWeight: 900,
                    fontSize: '0.78rem',
                    letterSpacing: '0.8px',
                    borderRadius: '3px',
                    marginBottom: '0.35rem',
                  }}
                >
                  {config.voucherTitle}
                </div>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#333333' }}>
                  N° {receiptToPrint.id.toUpperCase().replace('FIX-EXP-', 'EXP-')}
                </div>
              </div>

              <div className="receipt-divider-dashed" />

              <div style={{ fontSize: '0.74rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', margin: '0.65rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>Categoría:</strong></span>
                  <span>{config.badgeLabel}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>Concepto:</strong></span>
                  <span style={{ fontWeight: 800 }}>{receiptToPrint.title}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>Proveedor:</strong></span>
                  <span>{receiptToPrint.provider || 'Sin especificar'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>Periodo:</strong></span>
                  <span style={{ fontWeight: 800 }}>{receiptToPrint.periodMonth}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>Vencimiento:</strong></span>
                  <span>{formatDate(receiptToPrint.dueDate)}</span>
                </div>
                {receiptToPrint.paymentDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>Fecha de Pago:</strong></span>
                    <span>{formatDate(receiptToPrint.paymentDate)}</span>
                  </div>
                )}
                {receiptToPrint.paymentMethod && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>Método:</strong></span>
                    <span style={{ textTransform: 'uppercase' }}>{receiptToPrint.paymentMethod}</span>
                  </div>
                )}
                {receiptToPrint.receiptReference && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>Referencia/Soporte:</strong></span>
                    <span style={{ fontFamily: 'monospace' }}>#{receiptToPrint.receiptReference}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>Estado:</strong></span>
                  <span style={{ fontWeight: 900, textTransform: 'uppercase' }}>{receiptToPrint.status}</span>
                </div>
              </div>

              <div className="receipt-divider-dashed" />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '1rem',
                  fontWeight: 900,
                  borderTop: '1px solid #000',
                  borderBottom: '1px solid #000',
                  padding: '0.45rem 0',
                  margin: '0.65rem 0',
                }}
              >
                <span>MONTO TOTAL:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {formatCOP(receiptToPrint.amount)}
                </span>
              </div>

              {receiptToPrint.notes && (
                <div style={{ fontSize: '0.7rem', color: '#444', margin: '0.45rem 0' }}>
                  <strong>Observaciones:</strong> {receiptToPrint.notes}
                </div>
              )}

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flex: 1, textAlign: 'center', borderTop: '1px solid #000', paddingTop: '0.35rem', fontSize: '0.7rem' }}>
                  <strong>AUTORIZADO POR</strong>
                  <div style={{ fontSize: '0.64rem', color: '#666' }}>Administración La Molienda</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', borderTop: '1px solid #000', paddingTop: '0.35rem', fontSize: '0.7rem' }}>
                  <strong>RECIBIDO / PAGADO</strong>
                  <div style={{ fontSize: '0.64rem', color: '#666' }}>Firma o Comprobante</div>
                </div>
              </div>
            </div>

            <div
              className="pos-modal-footer no-print"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                borderTop: '1px solid var(--border-color)',
                background: 'var(--bg-modal-footer)',
              }}
            >
              <button
                type="button"
                className="pos-btn-secondary"
                onClick={() => setReceiptToPrint(null)}
              >
                Cerrar
              </button>

              <button
                type="button"
                className="btn-print-receipt"
                onClick={() => window.print()}
                title="Imprimir comprobante"
              >
                <Printer size={15} />
                <span>Imprimir Comprobante</span>
                <span className="print-format-badge">80mm / Carta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedExpensesView;
