import React, { useState } from 'react';
import {
  Plus,
  Search,
  DollarSign,
  CheckCircle2,
  Clock,
  Trash2,
  Calendar,
  X,
  CreditCard,
  Users,
  Check,
} from 'lucide-react';
import { Employee, PayrollRecord } from '../types';
import { formatCOP, formatDate } from '../utils/formatters';

interface PayrollViewProps {
  employees: Employee[];
  payrollRecords: PayrollRecord[];
  onAddRecord: (record: PayrollRecord) => void;
  onDeleteRecord: (id: string) => void;
  onUpdateRecordStatus: (id: string, status: 'pendiente' | 'pagado') => void;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  employees,
  payrollRecords,
  onAddRecord,
  onDeleteRecord,
  onUpdateRecordStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendiente' | 'pagado'>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Record Form State
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [baseAmount, setBaseAmount] = useState<number>(employees[0]?.baseSalary || 0);
  const [bonuses, setBonuses] = useState<number>(0);
  const [deductions, setDeductions] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia' | 'nequi' | 'daviplata'>('transferencia');
  const [status, setStatus] = useState<'pendiente' | 'pagado'>('pagado');
  const [notes, setNotes] = useState('');

  const selectedEmployee = employees.find((e) => e.id === selectedEmpId);

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      setBaseAmount(emp.baseSalary);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const net = Number(baseAmount) + Number(bonuses) - Number(deductions);

    const newRecord: PayrollRecord = {
      id: 'pay-' + Date.now(),
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      periodStart,
      periodEnd,
      paymentDate: status === 'pagado' ? new Date().toISOString().slice(0, 10) : '',
      baseAmount: Number(baseAmount),
      bonuses: Number(bonuses),
      deductions: Number(deductions),
      netPaid: net > 0 ? net : 0,
      status,
      paymentMethod,
      notes,
      createdAt: new Date().toISOString(),
    };

    onAddRecord(newRecord);
    setIsModalOpen(false);
    setBonuses(0);
    setDeductions(0);
    setNotes('');
  };

  const filteredRecords = payrollRecords.filter((record) => {
    const matchesSearch = record.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPaid = payrollRecords
    .filter((r) => r.status === 'pagado')
    .reduce((acc, curr) => acc + curr.netPaid, 0);

  const totalPending = payrollRecords
    .filter((r) => r.status === 'pendiente')
    .reduce((acc, curr) => acc + curr.netPaid, 0);

  const activeEmployeesCount = employees.filter((e) => e.isActive).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Barrita de Métricas / KPIs */}
      <div className="inventory-stats-strip">
        <div className="inv-stat-card">
          <div className="inv-stat-icon icon-emerald">
            <CheckCircle2 size={20} />
          </div>
          <div className="inv-stat-text">
            <span className="inv-stat-label">TOTAL NÓMINA PAGADA</span>
            <span className="inv-stat-value" style={{ color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
              {formatCOP(totalPaid)}
            </span>
          </div>
        </div>

        <div className="inv-stat-card">
          <div className="inv-stat-icon icon-amber">
            <Clock size={20} />
          </div>
          <div className="inv-stat-text">
            <span className="inv-stat-label">PAGOS PENDIENTES</span>
            <span className="inv-stat-value" style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
              {formatCOP(totalPending)}
            </span>
          </div>
        </div>

        <div className="inv-stat-card">
          <div className="inv-stat-icon icon-blue">
            <Users size={20} />
          </div>
          <div className="inv-stat-text">
            <span className="inv-stat-label">COLABORADORES ACTIVOS</span>
            <span className="inv-stat-value" style={{ fontFamily: 'var(--font-mono)' }}>
              {activeEmployeesCount} {activeEmployeesCount === 1 ? 'persona' : 'personas'}
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
              placeholder="Buscar por colaborador..."
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
            <option value="todos">Todos los estados</option>
            <option value="pagado">Solo Pagados</option>
            <option value="pendiente">Solo Pendientes</option>
          </select>
        </div>

        <div className="toolbar-right">
          <button
            type="button"
            className="btn-add-product pos-btn-primary"
            onClick={() => {
              if (employees.length > 0) {
                handleSelectEmployee(employees[0].id);
              }
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Registrar Pago de Nómina</span>
          </button>
        </div>
      </div>

      {/* 3. Tabla de Liquidaciones de Nómina */}
      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Periodo Liquidado</th>
              <th style={{ textAlign: 'right' }}>Salario Base</th>
              <th style={{ textAlign: 'right' }}>Bonos / Extra</th>
              <th style={{ textAlign: 'right' }}>Deducciones</th>
              <th style={{ textAlign: 'right' }}>Neto Pagado</th>
              <th style={{ textAlign: 'center' }}>Método</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No se encontraron registros de nómina con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {record.employeeName}
                      </span>
                      {record.notes && (
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {record.notes}
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      <Calendar size={13} style={{ color: 'var(--accent-amber)' }} />
                      <span>{formatDate(record.periodStart)} al {formatDate(record.periodEnd)}</span>
                    </div>
                  </td>

                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {formatCOP(record.baseAmount)}
                  </td>

                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: record.bonuses > 0 ? '#34d399' : 'var(--text-muted)' }}>
                    +{formatCOP(record.bonuses)}
                  </td>

                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: record.deductions > 0 ? '#fb7185' : 'var(--text-muted)' }}>
                    -{formatCOP(record.deductions)}
                  </td>

                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {formatCOP(record.netPaid)}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <span className={`method-pill ${record.paymentMethod}`}>
                      {record.paymentMethod}
                    </span>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <span className={`status-badge ${record.status === 'pagado' ? 'paid' : 'pending'}`}>
                      {record.status === 'pagado' ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span>Pagado</span>
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
                        className="table-action-btn btn-pay-toggle"
                        onClick={() =>
                          onUpdateRecordStatus(
                            record.id,
                            record.status === 'pagado' ? 'pendiente' : 'pagado'
                          )
                        }
                        title={record.status === 'pagado' ? 'Marcar como Pendiente' : 'Marcar como Pagado'}
                      >
                        <Check size={14} />
                      </button>

                      <button
                        type="button"
                        className="table-action-btn btn-delete"
                        onClick={() => onDeleteRecord(record.id)}
                        title="Eliminar este registro"
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

      {/* 4. Modal para Registrar Pago de Nómina */}
      {isModalOpen && (
        <div className="pos-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="pos-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-header">
              <div className="pos-modal-title-group">
                <div className="pos-modal-icon-badge">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="pos-modal-title">Registrar Pago de Nómina</h3>
                  <p className="pos-modal-subtitle">Liquidación de salario o turno para colaborador</p>
                </div>
              </div>
              <button
                type="button"
                className="pos-modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                title="Cerrar modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="pos-modal-body">
                {/* Seleccionar Colaborador */}
                <div className="pos-form-group">
                  <label className="pos-form-label">Colaborador</label>
                  <select
                    value={selectedEmpId}
                    onChange={(e) => handleSelectEmployee(e.target.value)}
                    className="pos-form-select"
                    required
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} — {emp.role} ({emp.paymentType})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Periodo de Liquidación */}
                <div className="pos-form-grid-2">
                  <div className="pos-form-group">
                    <label className="pos-form-label">Inicio Periodo</label>
                    <input
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      className="pos-form-input"
                      required
                    />
                  </div>
                  <div className="pos-form-group">
                    <label className="pos-form-label">Fin Periodo</label>
                    <input
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      className="pos-form-input"
                      required
                    />
                  </div>
                </div>

                {/* Montos: Base, Bonos, Deducciones */}
                <div className="pos-form-grid-2">
                  <div className="pos-form-group">
                    <label className="pos-form-label">Salario Base ($)</label>
                    <input
                      type="number"
                      value={baseAmount}
                      onChange={(e) => setBaseAmount(Number(e.target.value))}
                      className="pos-form-input"
                      min={0}
                      required
                    />
                  </div>

                  <div className="pos-form-group">
                    <label className="pos-form-label">Bonos / Horas Extra ($)</label>
                    <input
                      type="number"
                      value={bonuses}
                      onChange={(e) => setBonuses(Number(e.target.value))}
                      className="pos-form-input"
                      min={0}
                    />
                  </div>
                </div>

                <div className="pos-form-grid-2">
                  <div className="pos-form-group">
                    <label className="pos-form-label">Deducciones ($)</label>
                    <input
                      type="number"
                      value={deductions}
                      onChange={(e) => setDeductions(Number(e.target.value))}
                      className="pos-form-input"
                      min={0}
                    />
                  </div>

                  <div className="pos-form-group">
                    <label className="pos-form-label">Método de Pago</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="pos-form-select"
                    >
                      <option value="transferencia">Transferencia Bancaria</option>
                      <option value="nequi">Nequi</option>
                      <option value="daviplata">Daviplata</option>
                      <option value="efectivo">Efectivo en Caja</option>
                    </select>
                  </div>
                </div>

                <div className="pos-form-group">
                  <label className="pos-form-label">Estado de Liquidación</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="pos-form-select"
                  >
                    <option value="pagado">Pagado (Desembolso realizado)</option>
                    <option value="pendiente">Pendiente (Por desembolsar)</option>
                  </select>
                </div>

                <div className="pos-form-group">
                  <label className="pos-form-label">Notas u Observaciones</label>
                  <input
                    type="text"
                    placeholder="Ej. Quincena completa + turno dominical..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="pos-form-input"
                  />
                </div>

                {/* Total Neto a Pagar en Vivo */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.15rem',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1.5px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    TOTAL NETO A PAGAR:
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: 'var(--accent-amber)',
                    }}
                  >
                    {formatCOP(Math.max(0, Number(baseAmount) + Number(bonuses) - Number(deductions)))}
                  </span>
                </div>
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
                  <Plus size={16} />
                  <span>Guardar Liquidación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
