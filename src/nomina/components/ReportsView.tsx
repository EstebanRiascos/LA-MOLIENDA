import React from 'react';
import {
  BarChart3,
  TrendingDown,
  Users,
  Building2,
  CheckCircle2,
  Wallet,
  Zap,
  Sparkles,
  Clock,
} from 'lucide-react';
import { PayrollRecord, RentPayment, FixedExpenseItem } from '../types';
import { formatCOP } from '../utils/formatters';

interface ReportsViewProps {
  payrollRecords: PayrollRecord[];
  rentPayments: RentPayment[];
  fixedExpenses?: FixedExpenseItem[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  payrollRecords,
  rentPayments,
  fixedExpenses = [],
}) => {
  // Pagados por categoría
  const totalPayroll = payrollRecords
    .filter((r) => r.status === 'pagado')
    .reduce((acc, curr) => acc + curr.netPaid, 0);

  const totalRent = rentPayments
    .filter((p) => p.status === 'pagado')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalServices = fixedExpenses
    .filter((e) => e.status === 'pagado' && e.category === 'servicios_publicos')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalSupplies = fixedExpenses
    .filter((e) => e.status === 'pagado' && e.category === 'aseo_dotacion')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const grandTotal = totalPayroll + totalRent + totalServices + totalSupplies;

  // Porcentajes de distribución
  const calcPct = (amount: number) => (grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0);

  const payrollPct = calcPct(totalPayroll);
  const rentPct = calcPct(totalRent);
  const servicesPct = calcPct(totalServices);
  const suppliesPct = calcPct(totalSupplies);

  // Pendientes de desembolso
  const pendingPayroll = payrollRecords
    .filter((r) => r.status === 'pendiente')
    .reduce((acc, curr) => acc + curr.netPaid, 0);

  const pendingRent = rentPayments
    .filter((p) => p.status === 'pendiente' || p.status === 'vencido')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const pendingServices = fixedExpenses
    .filter((e) => (e.status === 'pendiente' || e.status === 'vencido') && e.category === 'servicios_publicos')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const pendingSupplies = fixedExpenses
    .filter((e) => (e.status === 'pendiente' || e.status === 'vencido') && e.category === 'aseo_dotacion')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const grandPending = pendingPayroll + pendingRent + pendingServices + pendingSupplies;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Tarjeta Consolidada Principal */}
      <div className="reports-consolidated-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.1))',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: 'var(--accent-amber)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Wallet size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Consolidado de Egresos Fijos Operativos
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              Resumen total de pagos ejecutados en Nómina, Arriendo, Servicios Públicos y Aseo & Dotación
            </p>
          </div>
        </div>

        {/* Leyenda y Barra de Distribución Porcentual */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.65rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span style={{ color: 'var(--accent-amber)' }}>
              ● Nómina: {payrollPct}% ({formatCOP(totalPayroll)})
            </span>
            <span style={{ color: '#38bdf8' }}>
              ● Arriendo: {rentPct}% ({formatCOP(totalRent)})
            </span>
            <span style={{ color: '#f59e0b' }}>
              ● Servicios: {servicesPct}% ({formatCOP(totalServices)})
            </span>
            <span style={{ color: '#10b981' }}>
              ● Aseo & Dotación: {suppliesPct}% ({formatCOP(totalSupplies)})
            </span>
          </div>

          <div className="reports-distribution-bar-wrap" style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden' }}>
            {payrollPct > 0 && (
              <div
                className="report-bar-fill-payroll"
                style={{ width: `${payrollPct}%` }}
                title={`Nómina: ${payrollPct}% (${formatCOP(totalPayroll)})`}
              />
            )}
            {rentPct > 0 && (
              <div
                className="report-bar-fill-rent"
                style={{ width: `${rentPct}%` }}
                title={`Arriendo: ${rentPct}% (${formatCOP(totalRent)})`}
              />
            )}
            {servicesPct > 0 && (
              <div
                className="report-bar-fill-services"
                style={{ width: `${servicesPct}%` }}
                title={`Servicios Públicos: ${servicesPct}% (${formatCOP(totalServices)})`}
              />
            )}
            {suppliesPct > 0 && (
              <div
                className="report-bar-fill-supplies"
                style={{ width: `${suppliesPct}%` }}
                title={`Aseo & Dotación: ${suppliesPct}% (${formatCOP(totalSupplies)})`}
              />
            )}
            {grandTotal === 0 && (
              <div
                style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-muted)' }}
              >
                Sin egresos pagados registrados
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Barrita de Métricas Comparativas */}
      <div className="inventory-stats-strip">
        <div className="inv-stat-card">
          <div className="inv-stat-icon icon-amber">
            <Users size={20} />
          </div>
          <div className="inv-stat-text">
            <span className="inv-stat-label">NÓMINA PAGADA</span>
            <span className="inv-stat-value" style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
              {formatCOP(totalPayroll)}
            </span>
          </div>
        </div>

        <div className="inv-stat-card">
          <div className="inv-stat-icon icon-blue">
            <Building2 size={20} />
          </div>
          <div className="inv-stat-text">
            <span className="inv-stat-label">ARRIENDO PAGADO</span>
            <span className="inv-stat-value" style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
              {formatCOP(totalRent)}
            </span>
          </div>
        </div>

        <div className="inv-stat-card">
          <div className="inv-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Zap size={20} />
          </div>
          <div className="inv-stat-text">
            <span className="inv-stat-label">SERVICIOS PÚBLICOS</span>
            <span className="inv-stat-value" style={{ color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
              {formatCOP(totalServices)}
            </span>
          </div>
        </div>

        <div className="inv-stat-card">
          <div className="inv-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Sparkles size={20} />
          </div>
          <div className="inv-stat-text">
            <span className="inv-stat-label">ASEO & DOTACIÓN</span>
            <span className="inv-stat-value" style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>
              {formatCOP(totalSupplies)}
            </span>
          </div>
        </div>

        <div className="inv-stat-card">
          <div className="inv-stat-icon icon-rose">
            <TrendingDown size={20} />
          </div>
          <div className="inv-stat-text">
            <span className="inv-stat-label">TOTAL EGRESOS FIJOS</span>
            <span className="inv-stat-value" style={{ color: '#fb7185', fontFamily: 'var(--font-mono)' }}>
              {formatCOP(grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Panel de Compromisos Pendientes por Liquidar */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Compromisos Pendientes de Pago (Por Desembolsar)
            </h4>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              Obligaciones operativas pendientes de liquidación
            </p>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1rem',
              fontWeight: 900,
              color: grandPending > 0 ? '#fb7185' : 'var(--accent-emerald)',
              background: grandPending > 0 ? 'rgba(251, 113, 133, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              padding: '0.35rem 0.85rem',
              borderRadius: '8px',
            }}
          >
            Total Pendiente: {formatCOP(grandPending)}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '0.85rem',
          }}
        >
          {/* Nómina Pendiente */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
              NÓMINA PENDIENTE
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-amber)', display: 'block', margin: '0.2rem 0' }}>
              {formatCOP(pendingPayroll)}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Liquidaciones de personal
            </span>
          </div>

          {/* Arriendo Pendiente */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
            }}
          >
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
              ARRIENDO PENDIENTE
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', display: 'block', margin: '0.2rem 0' }}>
              {formatCOP(pendingRent)}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Canon del local
            </span>
          </div>

          {/* Servicios Pendientes */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
              💡 SERVICIOS PENDIENTES
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 800, color: '#f59e0b', display: 'block', margin: '0.2rem 0' }}>
              {formatCOP(pendingServices)}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Energía, agua, gas, internet
            </span>
          </div>

          {/* Aseo Pendiente */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
            }}
          >
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
              🧹 ASEO & DOTACIÓN PENDIENTE
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 800, color: '#10b981', display: 'block', margin: '0.2rem 0' }}>
              {formatCOP(pendingSupplies)}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Químicos cafetera, dotación
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
