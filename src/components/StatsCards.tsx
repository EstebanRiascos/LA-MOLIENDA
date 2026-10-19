import React from 'react';
import { DollarSign, LayoutGrid, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { SystemStats } from '../types';
import { formatCurrency } from '../utils/storage';

interface StatsCardsProps {
  stats: SystemStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const occupancyRate =
    stats.totalTablesCount > 0
      ? Math.round((stats.activeTablesCount / stats.totalTablesCount) * 100)
      : 0;

  return (
    <div className="kpi-grid">
      {/* 1. Ventas del Día */}
      <div className="kpi-card">
        <div className="kpi-icon-box box-emerald">
          <DollarSign size={22} />
        </div>
        <div className="kpi-content">
          <span className="kpi-label">Ventas de Hoy</span>
          <span className="kpi-value">{formatCurrency(stats.todaySales)}</span>
          <span className="kpi-subtext">{stats.todayOrdersCount} cuentas cobradas</span>
        </div>
      </div>

      {/* 2. Mesas Ocupadas */}
      <div className="kpi-card">
        <div className="kpi-icon-box box-amber">
          <LayoutGrid size={22} />
        </div>
        <div className="kpi-content">
          <span className="kpi-label">Mesas Ocupadas</span>
          <span className="kpi-value">
            {stats.activeTablesCount} / {stats.totalTablesCount}
          </span>
          <span className="kpi-subtext">{occupancyRate}% de ocupación en sala</span>
        </div>
      </div>

      {/* 3. En Cuentas Abiertas */}
      <div className="kpi-card">
        <div className="kpi-icon-box box-blue">
          <Clock size={22} />
        </div>
        <div className="kpi-content">
          <span className="kpi-label">Por Cobrar en Mesas</span>
          <span className="kpi-value">{formatCurrency(stats.openAccountsAmount)}</span>
          <span className="kpi-subtext">Consumo activo sin cerrar</span>
        </div>
      </div>

      {/* 4. Alertas de Stock */}
      <div className="kpi-card">
        <div className={`kpi-icon-box ${stats.lowStockAlertCount > 0 ? 'box-rose' : 'box-cyan'}`}>
          <AlertTriangle size={22} />
        </div>
        <div className="kpi-content">
          <span className="kpi-label">Stock en Alerta</span>
          <span className="kpi-value">
            {stats.lowStockAlertCount}{' '}
            <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>ítems</span>
          </span>
          <span className="kpi-subtext">
            {stats.lowStockAlertCount > 0 ? 'Reponer insumos pronto' : 'Inventario en nivel óptimo'}
          </span>
        </div>
      </div>

      {/* 5. Ticket Promedio */}
      <div className="kpi-card">
        <div className="kpi-icon-box box-purple">
          <TrendingUp size={22} />
        </div>
        <div className="kpi-content">
          <span className="kpi-label">Ticket Promedio</span>
          <span className="kpi-value">{formatCurrency(stats.averageTicket)}</span>
          <span className="kpi-subtext">Promedio por comanda</span>
        </div>
      </div>
    </div>
  );
};
