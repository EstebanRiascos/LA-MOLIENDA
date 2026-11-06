import React from 'react';
import { BarChart3, TrendingDown, Users, Building2, CheckCircle2, Wallet } from 'lucide-react';
import { PayrollRecord, RentPayment } from '../types';
import { formatCOP } from '../utils/formatters';

interface ReportsViewProps {
  payrollRecords: PayrollRecord[];
  rentPayments: RentPayment[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  payrollRecords,
  rentPayments,
}) => {
  const totalPayroll = payrollRecords
    .filter((r) => r.status === 'pagado')
    .reduce((acc, curr) => acc + curr.netPaid, 0);

  const totalRent = rentPayments
    .filter((p) => p.status === 'pagado')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const grandTotal = totalPayroll + totalRent;

  const payrollPercentage = grandTotal > 0 ? Math.round((totalPayroll / grandTotal) * 100) : 0;
  const rentPercentage = grandTotal > 0 ? 100 - payrollPercentage : 0;

  const pendingPayroll = payrollRecords
    .filter((r) => r.status === 'pendiente')
    .reduce((acc, curr) => acc + curr.netPaid, 0);

  const pendingRent = rentPayments
    .filter((p) => p.status === 'pendiente')
    .reduce((acc, curr) => acc + curr.amount, 0);

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
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1))',
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
              Resumen total de pagos ejecutados en Nómina de Colaboradores y Canon de Arrendamiento
            </p>
          </div>
        </div>

        {/* Barra de Distribución Porcentual */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', fontSize: '0.76rem', fontWeight: 700 }}>
            <span style={{ color: 'var(--accent-amber)' }}>
              ● Nómina de Personal: {payrollPercentage}% ({formatCOP(totalPayroll)})
            </span>
            <span style={{ color: '#38bdf8' }}>
              ● Arriendo del Local: {rentPercentage}% ({formatCOP(totalRent)})
            </span>
          </div>

          <div className="reports-distribution-bar-wrap">
            <div
              className="report-bar-fill-payroll"
              style={{ width: `${payrollPercentage}%` }}
              title={`Nómina: ${payrollPercentage}%`}
            />
            <div
              className="report-bar-fill-rent"
              style={{ width: `${rentPercentage}%` }}
              title={`Arriendo: ${rentPercentage}%`}
            />
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
            <span className="inv-stat-label">TOTAL NÓMINA PAGADA</span>
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
            <span className="inv-stat-label">TOTAL ARRIENDO PAGADO</span>
            <span className="inv-stat-value" style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
              {formatCOP(totalRent)}
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

      {/* 3. Panel de Pendientes por Liquidar */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
        }}
      >
        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Compromisos Pendientes de Pago (Por Desembolsar)
        </h4>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
              NÓMINA PENDIENTE
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-amber)', display: 'block', margin: '0.3rem 0' }}>
              {formatCOP(pendingPayroll)}
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Liquidaciones registradas en estado pendiente
            </span>
          </div>

          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
            }}
          >
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
              ARRIENDO PENDIENTE
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 800, color: '#38bdf8', display: 'block', margin: '0.3rem 0' }}>
              {formatCOP(pendingRent)}
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Cánones pendientes o por vencer del local
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
