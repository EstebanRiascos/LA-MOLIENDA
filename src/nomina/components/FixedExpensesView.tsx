import React, { useState } from 'react';
import {
  Zap,
  FileText,
  Sparkles,
  DollarSign,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  X,
  CreditCard,
  Check,
  FileCheck,
  Printer,
  Receipt,
  Search,
  Building,
  ShieldCheck,
  Droplet,
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
  expenses: FixedExpenseItem[];
  onAddExpense: (expense: FixedExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateExpenseStatus: (id: string, status: ExpensePaymentStatus) => void;
}

interface CategoryPreset {
  title: string;
  subCategory: string;
  defaultProvider: string;
}

const PRESETS: Record<FixedExpenseCategory, CategoryPreset[]> = {
  servicios_publicos: [
    { title: 'Energía Eléctrica', subCategory: 'Energía', defaultProvider: 'EPM / Operador de Energía' },
    { title: 'Agua y Alcantarillado', subCategory: 'Acueducto', defaultProvider: 'Aguas Locales / EPM' },
    { title: 'Gas Natural / Propano', subCategory: 'Gas', defaultProvider: 'Empresa de Gas' },
    { title: 'Internet Fibra Óptica & Wi-Fi', subCategory: 'Telecomunicaciones', defaultProvider: 'Claro / Tigo / Movistar' },
    { title: 'Plan Móvil Corporativo', subCategory: 'Telefonía', defaultProvider: 'Operador Móvil' },
  ],
  permisos_legales: [
    { title: 'Sayco & Acinpro (Derechos de Autor)', subCategory: 'Sayco & Acinpro', defaultProvider: 'Organización Sayco Acinpro' },
    { title: 'Inspección de Bomberos (Seguridad)', subCategory: 'Bomberos', defaultProvider: 'Cuerpo de Bomberos Voluntarios' },
    { title: 'Renovación Matrícula Mercantil', subCategory: 'Cámara de Comercio', defaultProvider: 'Cámara de Comercio' },
    { title: 'Concepto Sanitario & Fumigación', subCategory: 'Sanidad', defaultProvider: 'Secretaría de Salud / Empresa Certificada' },
    { title: 'Impuesto de Industria y Comercio (ICA)', subCategory: 'Impuestos Locales', defaultProvider: 'Alcaldía Municipal' },
  ],
  aseo_dotacion: [
    { title: 'Químicos Desengrasantes & Cafetera', subCategory: 'Químicos Cafetera', defaultProvider: 'Distribuidor Especializado de Café' },
    { title: 'Papel Institucional & Servilletas', subCategory: 'Papelería Institucional', defaultProvider: 'Distribuidora de Desechables' },
    { title: 'Bolsas de Basura & Canecas', subCategory: 'Bolsas y Residuos', defaultProvider: 'Proveedor de Aseo' },
    { title: 'Insumos de Limpieza y Desinfección', subCategory: 'Limpieza General', defaultProvider: 'Distribuidora de Aseo' },
    { title: 'Dotación, Delantales y Gorros', subCategory: 'Dotación Personal', defaultProvider: 'Proveedor de Dotaciones' },
  ],
};

const CATEGORY_META: Record<
  FixedExpenseCategory,
  { label: string; shortLabel: string; icon: string; color: string; bg: string }
> = {
  servicios_publicos: {
    label: '💡 Servicios Públicos (Esenciales)',
    shortLabel: 'Servicios Públicos',
    icon: '💡',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
  },
  permisos_legales: {
    label: '🧾 Derechos y Permisos Comerciales (Normativa Colombia)',
    shortLabel: 'Derechos & Permisos',
    icon: '🧾',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
  },
  aseo_dotacion: {
    label: '🧹 Insumos de Aseo y Dotación Operativa',
    shortLabel: 'Aseo & Dotación',
    icon: '🧹',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
  },
};

export const FixedExpensesView: React.FC<FixedExpensesViewProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receiptToPrint, setReceiptToPrint] = useState<FixedExpenseItem | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<'all' | FixedExpenseCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ExpensePaymentStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State for creating a new expense
  const now = new Date();
  const currentMonthName = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  const formattedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);
  const todayStr = now.toISOString().split('T')[0];

  const [formCategory, setFormCategory] = useState<FixedExpenseCategory>('servicios_publicos');
  const [formSubCategory, setFormSubCategory] = useState('Energía');
  const [formTitle, setFormTitle] = useState('Energía Eléctrica');
  const [formProvider, setFormProvider] = useState('EPM / Operador de Energía');
  const [formPeriodMonth, setFormPeriodMonth] = useState(formattedMonth);
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDueDate, setFormDueDate] = useState(todayStr);
  const [formPaymentDate, setFormPaymentDate] = useState(todayStr);
  const [formStatus, setFormStatus] = useState<ExpensePaymentStatus>('pendiente');
  const [formPaymentMethod, setFormPaymentMethod] = useState<ExpensePaymentMethod>('transferencia');
  const [formReceiptRef, setFormReceiptRef] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const handleSelectPreset = (preset: CategoryPreset) => {
    setFormTitle(preset.title);
    setFormSubCategory(preset.subCategory);
    if (!formProvider || formProvider === 'EPM / Operador de Energía' || formProvider === 'Proveedor de Aseo') {
      setFormProvider(preset.defaultProvider);
    }
  };

  const handleCategoryChange = (cat: FixedExpenseCategory) => {
    setFormCategory(cat);
    const defaultPreset = PRESETS[cat][0];
    if (defaultPreset) {
      setFormTitle(defaultPreset.title);
      setFormSubCategory(defaultPreset.subCategory);
      setFormProvider(defaultPreset.defaultProvider);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAmount || Number(formAmount) <= 0) {
      alert('Por favor ingresa un título y un monto válido.');
      return;
    }

    const newExpense: FixedExpenseItem = {
      id: 'fix-exp-' + Date.now(),
      category: formCategory,
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

    // Reset Form
    setFormAmount('');
    setFormReceiptRef('');
    setFormNotes('');
    setFormStatus('pendiente');
  };

  // Calculations for KPI Summary
  const paidExpenses = expenses.filter((e) => e.status === 'pagado');
  const pendingExpenses = expenses.filter((e) => e.status === 'pendiente' || e.status === 'vencido');

  const totalPaid = paidExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPending = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

  const totalServicesPaid = paidExpenses
    .filter((e) => e.category === 'servicios_publicos')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalPermitsPaid = paidExpenses
    .filter((e) => e.category === 'permisos_legales')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalSuppliesPaid = paidExpenses
    .filter((e) => e.category === 'aseo_dotacion')
    .reduce((sum, e) => sum + e.amount, 0);

  // Filtered List
  const filteredExpenses = expenses.filter((item) => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
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
      {/* 1. Tarjeta Hero / Ficha de Servicios y Gastos Fijos */}
      <div className="rent-contract-hero-card">
        <div className="rent-hero-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.1))',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: 'var(--accent-amber)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Zap size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Gastos Fijos Operativos del Negocio
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                💡 Servicios Públicos • 🧾 Normativa Comercial & Permisos • 🧹 Insumos de Aseo & Dotación
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={`status-badge ${pendingExpenses.length > 0 ? 'pending' : 'paid'}`}>
              {pendingExpenses.length > 0 ? (
                <>
                  <Clock size={13} />
                  <span>{pendingExpenses.length} Factura(s) Pendiente(s)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} />
                  <span>Al día en Servicios y Gastos</span>
                </>
              )}
            </span>

            <button
              type="button"
              className="pos-btn-primary"
              onClick={() => setIsModalOpen(true)}
              style={{
                padding: '0.55rem 1.15rem',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                borderRadius: '10px',
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Registrar Gasto / Factura</span>
            </button>
          </div>
        </div>

        {/* 2. Mini Resumen Comparativo de Categorías */}
        <div className="rent-hero-grid">
          <div className="rent-hero-stat">
            <span className="stat-label">💡 SERVICIOS PÚBLICOS PAGADOS</span>
            <span className="stat-val" style={{ color: '#f59e0b' }}>
              {formatCOP(totalServicesPaid)}
            </span>
          </div>

          <div className="rent-hero-stat">
            <span className="stat-label">🧾 PERMISOS & NORMATIVA PAGADOS</span>
            <span className="stat-val" style={{ color: '#38bdf8' }}>
              {formatCOP(totalPermitsPaid)}
            </span>
          </div>

          <div className="rent-hero-stat">
            <span className="stat-label">🧹 ASEO & DOTACIÓN PAGADOS</span>
            <span className="stat-val" style={{ color: '#10b981' }}>
              {formatCOP(totalSuppliesPaid)}
            </span>
          </div>

          <div className="rent-hero-stat">
            <span className="stat-label">TOTAL PENDIENTE POR PAGAR</span>
            <span className="stat-val" style={{ color: totalPending > 0 ? '#fb7185' : 'var(--text-muted)' }}>
              {formatCOP(totalPending)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Barra de Filtros y Búsqueda */}
      <div className="payroll-history-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Filtros de Categoría */}
          <button
            type="button"
            className={`method-pill ${categoryFilter === 'all' ? 'transferencia' : ''}`}
            onClick={() => setCategoryFilter('all')}
            style={{
              cursor: 'pointer',
              border: categoryFilter === 'all' ? '1.5px solid var(--accent-amber)' : '1px solid var(--border-color)',
              background: categoryFilter === 'all' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-input)',
              color: categoryFilter === 'all' ? 'var(--accent-amber)' : 'var(--text-secondary)',
              fontWeight: 700,
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.78rem',
            }}
          >
            Todos ({expenses.length})
          </button>

          <button
            type="button"
            className="method-pill"
            onClick={() => setCategoryFilter('servicios_publicos')}
            style={{
              cursor: 'pointer',
              border: categoryFilter === 'servicios_publicos' ? '1.5px solid #f59e0b' : '1px solid var(--border-color)',
              background: categoryFilter === 'servicios_publicos' ? 'rgba(245, 158, 11, 0.18)' : 'var(--bg-input)',
              color: categoryFilter === 'servicios_publicos' ? '#f59e0b' : 'var(--text-secondary)',
              fontWeight: 700,
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.78rem',
            }}
          >
            💡 Servicios Públicos ({expenses.filter((e) => e.category === 'servicios_publicos').length})
          </button>

          <button
            type="button"
            className="method-pill"
            onClick={() => setCategoryFilter('permisos_legales')}
            style={{
              cursor: 'pointer',
              border: categoryFilter === 'permisos_legales' ? '1.5px solid #38bdf8' : '1px solid var(--border-color)',
              background: categoryFilter === 'permisos_legales' ? 'rgba(56, 189, 248, 0.18)' : 'var(--bg-input)',
              color: categoryFilter === 'permisos_legales' ? '#38bdf8' : 'var(--text-secondary)',
              fontWeight: 700,
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.78rem',
            }}
          >
            🧾 Derechos & Permisos ({expenses.filter((e) => e.category === 'permisos_legales').length})
          </button>

          <button
            type="button"
            className="method-pill"
            onClick={() => setCategoryFilter('aseo_dotacion')}
            style={{
              cursor: 'pointer',
              border: categoryFilter === 'aseo_dotacion' ? '1.5px solid #10b981' : '1px solid var(--border-color)',
              background: categoryFilter === 'aseo_dotacion' ? 'rgba(16, 185, 129, 0.18)' : 'var(--bg-input)',
              color: categoryFilter === 'aseo_dotacion' ? '#10b981' : 'var(--text-secondary)',
              fontWeight: 700,
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.78rem',
            }}
          >
            🧹 Aseo & Dotación ({expenses.filter((e) => e.category === 'aseo_dotacion').length})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Filtro por Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="pos-form-select"
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              width: 'auto',
              borderRadius: '10px',
            }}
          >
            <option value="all">Estado: Todos</option>
            <option value="pagado">Estado: Pagados</option>
            <option value="pendiente">Estado: Pendientes</option>
            <option value="vencido">Estado: Vencidos</option>
          </select>

          {/* Buscador */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Buscar gasto o proveedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pos-form-input"
              style={{
                paddingLeft: '30px',
                paddingTop: '0.35rem',
                paddingBottom: '0.35rem',
                fontSize: '0.78rem',
                borderRadius: '10px',
              }}
            />
          </div>
        </div>
      </div>

      {/* 4. Tabla de Facturas y Gastos Fijos */}
      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Categoría / Concepto</th>
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
                  No se encontraron facturas o gastos fijos registrados.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => {
                const meta = CATEGORY_META[exp.category];
                return (
                  <tr key={exp.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            background: meta.bg,
                            fontSize: '1rem',
                            flexShrink: 0,
                          }}
                        >
                          {meta.icon}
                        </span>
                        <div>
                          <span style={{ fontWeight: 750, color: 'var(--text-primary)', display: 'block' }}>
                            {exp.title}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {meta.shortLabel} • {exp.subCategory}
                          </span>
                        </div>
                      </div>
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
                          title="Imprimir Comprobante de Gasto"
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Modal para Registrar Gasto / Factura */}
      {isModalOpen && (
        <div className="pos-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="pos-modal-box"
            style={{ maxWidth: '640px', width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-modal-header">
              <div className="pos-modal-title-group">
                <div className="pos-modal-icon-badge">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="pos-modal-title">Registrar Gasto Fijo / Factura</h3>
                  <p className="pos-modal-subtitle">Control de servicios, permisos e insumos de aseo</p>
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
              {/* Selector de Categoría Principal */}
              <div className="pos-form-group" style={{ marginBottom: '1rem' }}>
                <label className="pos-form-label" style={{ fontWeight: 800 }}>
                  Categoría Principal del Gasto
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.45rem' }}>
                  {(['servicios_publicos', 'permisos_legales', 'aseo_dotacion'] as FixedExpenseCategory[]).map((cat) => {
                    const meta = CATEGORY_META[cat];
                    const isSelected = formCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategoryChange(cat)}
                        style={{
                          textAlign: 'left',
                          padding: '0.65rem 0.95rem',
                          borderRadius: '10px',
                          border: isSelected ? `2px solid ${meta.color}` : '1.5px solid var(--border-color)',
                          background: isSelected ? meta.bg : 'var(--bg-input)',
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontWeight: isSelected ? 800 : 500,
                          fontSize: '0.84rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{meta.label}</span>
                        {isSelected && <Check size={16} style={{ color: meta.color }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sugerencias Rápidas (Chips de Presets) */}
              <div className="pos-form-group" style={{ marginBottom: '1rem' }}>
                <label className="pos-form-label" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Sugerencias Rápidas para esta categoría (Clic para autocompletar):
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {PRESETS[formCategory].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        background: formTitle === p.title ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-input)',
                        color: formTitle === p.title ? 'var(--accent-amber)' : 'var(--text-secondary)',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        fontWeight: formTitle === p.title ? 700 : 500,
                      }}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Título y Subcategoría */}
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
                    placeholder="Ej. EPM, Sayco Acinpro, Distribuidora..."
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
                  placeholder="Detalles adicionales, número de cuenta del contrato, etc."
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

      {/* 6. Modal de Comprobante Imprimible de Gasto */}
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
            {/* Cabecera del Modal */}
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
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: 'var(--accent-amber)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
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

            {/* Hoja de Impresión del Comprobante */}
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
              {/* Encabezado */}
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
                  COMPROBANTE DE EGRESO
                </div>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#333333' }}>
                  N° {receiptToPrint.id.toUpperCase().replace('FIX-EXP-', 'EXP-')}
                </div>
              </div>

              <div className="receipt-divider-dashed" />

              {/* Datos del Comprobante */}
              <div style={{ fontSize: '0.74rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', margin: '0.65rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>Categoría:</strong></span>
                  <span>{CATEGORY_META[receiptToPrint.category].shortLabel}</span>
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

              {/* Total Destacado */}
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

              {/* Firmas */}
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

            {/* Footer con botones de Acción */}
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
                title="Imprimir ticket o PDF"
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
