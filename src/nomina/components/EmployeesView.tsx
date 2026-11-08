import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Trash2,
  Edit2,
  Phone,
  CreditCard,
  Calendar,
  X,
  FileText,
  Search,
  Building2,
} from 'lucide-react';
import { Employee, PaymentPeriodType } from '../types';
import { formatCOP, formatDate } from '../utils/formatters';
import laMoliendaLogo from '../../assets/la_molienda_logo.png';

interface EmployeesViewProps {
  employees: Employee[];
  onAddEmployee: (emp: Employee) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Barista');
  const [paymentType, setPaymentType] = useState<PaymentPeriodType>('quincenal');
  const [baseSalary, setBaseSalary] = useState<number>(800000);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  // Structured Bank State
  const [selectedBank, setSelectedBank] = useState('');
  const [accountType, setAccountType] = useState<'Ahorros' | 'Corriente'>('Ahorros');
  const [accountNumber, setAccountNumber] = useState('');
  const [customBankName, setCustomBankName] = useState('');

  const parseExistingBankInfo = (raw?: string) => {
    if (!raw || !raw.trim()) {
      return { bank: '', type: 'Ahorros' as 'Ahorros' | 'Corriente', num: '', custom: '' };
    }
    const clean = raw.trim();
    if (/efectivo/i.test(clean)) {
      return { bank: 'Efectivo', type: 'Ahorros' as 'Ahorros' | 'Corriente', num: '', custom: '' };
    }
    if (/nequi/i.test(clean)) {
      const num = clean.replace(/nequi/gi, '').replace(/[#:\-]/g, '').trim();
      return { bank: 'Nequi', type: 'Ahorros' as 'Ahorros' | 'Corriente', num, custom: '' };
    }
    if (/daviplata/i.test(clean)) {
      const num = clean.replace(/daviplata/gi, '').replace(/[#:\-]/g, '').trim();
      return { bank: 'Daviplata', type: 'Ahorros' as 'Ahorros' | 'Corriente', num, custom: '' };
    }
    if (/dale!?/i.test(clean)) {
      const num = clean.replace(/dale!?/gi, '').replace(/[#:\-]/g, '').trim();
      return { bank: 'Dale!', type: 'Ahorros' as 'Ahorros' | 'Corriente', num, custom: '' };
    }
    if (/movii/i.test(clean)) {
      const num = clean.replace(/movii/gi, '').replace(/[#:\-]/g, '').trim();
      return { bank: 'Movii', type: 'Ahorros' as 'Ahorros' | 'Corriente', num, custom: '' };
    }

    const standardBanks = [
      'Bancolombia',
      'Davivienda',
      'Banco de Bogotá',
      'BBVA Colombia',
      'BBVA',
      'Banco Agrario',
      'Nu Colombia',
      'Banco Falabella',
      'Scotiabank Colpatria',
      'Banco de Occidente',
      'Banco Popular',
      'Banco AV Villas',
      'Lulo Bank',
    ];

    for (const b of standardBanks) {
      if (new RegExp(b, 'i').test(clean)) {
        const isCorriente = /corriente/i.test(clean);
        const matchedBank = b === 'BBVA' ? 'BBVA Colombia' : b;
        const numMatch = clean.match(/#?\s*([0-9\-\s]{6,})/);
        const num = numMatch ? numMatch[1].trim() : '';
        return {
          bank: matchedBank,
          type: (isCorriente ? 'Corriente' : 'Ahorros') as 'Ahorros' | 'Corriente',
          num,
          custom: '',
        };
      }
    }

    const isCorriente = /corriente/i.test(clean);
    const numMatch = clean.match(/#?\s*([0-9\-\s]{6,})/);
    const num = numMatch ? numMatch[1].trim() : '';
    const custom = clean.replace(/#.*$/, '').replace(/ahorros|corriente/gi, '').trim();
    return {
      bank: 'Otro',
      type: (isCorriente ? 'Corriente' : 'Ahorros') as 'Ahorros' | 'Corriente',
      num,
      custom: custom || clean,
    };
  };

  const computeBankInfo = (
    bank: string,
    type: 'Ahorros' | 'Corriente',
    num: string,
    custom: string
  ) => {
    if (!bank) return '';
    if (bank === 'Efectivo') return 'Pago en Efectivo';

    const cleanNum = num.trim();
    const bankTitle = bank === 'Otro' ? (custom.trim() || 'Otro Banco') : bank;

    if (bank === 'Nequi' || bank === 'Daviplata' || bank === 'Dale!' || bank === 'Movii') {
      return cleanNum ? `${bankTitle} # ${cleanNum}` : bankTitle;
    }

    const parts = [bankTitle];
    if (type) parts.push(type);
    if (cleanNum) parts.push(`# ${cleanNum}`);
    return parts.join(' ');
  };

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setName('');
    setDocument('');
    setPhone('');
    setRole('Barista');
    setPaymentType('quincenal');
    setBaseSalary(800000);
    setStartDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setSelectedBank('Bancolombia');
    setAccountType('Ahorros');
    setAccountNumber('');
    setCustomBankName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setDocument(emp.document);
    setPhone(emp.phone);
    setRole(emp.role);
    setPaymentType(emp.paymentType);
    setBaseSalary(emp.baseSalary);
    setStartDate(emp.startDate);
    setNotes(emp.notes || '');

    const parsed = parseExistingBankInfo(emp.bankInfo);
    setSelectedBank(parsed.bank);
    setAccountType(parsed.type);
    setAccountNumber(parsed.num);
    setCustomBankName(parsed.custom);

    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalBankInfo = computeBankInfo(selectedBank, accountType, accountNumber, customBankName);

    if (editingEmployee) {
      onUpdateEmployee({
        ...editingEmployee,
        name,
        document,
        phone,
        role,
        paymentType,
        baseSalary: Number(baseSalary),
        bankInfo: finalBankInfo,
        startDate,
        notes,
      });
    } else {
      onAddEmployee({
        id: 'emp-' + Date.now(),
        name,
        document,
        phone,
        role,
        paymentType,
        baseSalary: Number(baseSalary),
        isActive: true,
        startDate,
        bankInfo: finalBankInfo,
        notes,
      });
    }

    setIsModalOpen(false);
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.document.includes(searchTerm)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Toolbar de Búsqueda y Botón Nuevo */}
      <div className="inventory-toolbar">
        <div className="toolbar-left">
          <div className="inv-search-wrapper">
            <Search size={16} className="inv-search-icon" />
            <input
              type="text"
              placeholder="Buscar colaborador por nombre, cargo o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="inv-search-input"
            />
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Total equipo: <strong style={{ color: 'var(--text-primary)' }}>{employees.length}</strong>
          </span>
        </div>

        <div className="toolbar-right">
          <button
            type="button"
            className="btn-add-product pos-btn-primary"
            onClick={handleOpenAdd}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Nuevo Colaborador</span>
          </button>
        </div>
      </div>

      {/* 2. Grilla de Tarjetas de Colaboradores */}
      <div className="employees-cards-grid">
        {filteredEmployees.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '3rem',
              textAlign: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-muted)',
            }}
          >
            No se encontraron colaboradores con el término de búsqueda.
          </div>
        ) : (
          filteredEmployees.map((emp) => (
            <div key={emp.id} className="employee-card-item">
              <div>
                <div className="employee-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div className="employee-avatar-badge">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="employee-card-name">{emp.name}</h4>
                      <span className="employee-card-role-pill">{emp.role}</span>
                    </div>
                  </div>

                  <span className={`status-badge ${emp.isActive ? 'paid' : 'overdue'}`}>
                    {emp.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="employee-card-details" style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <FileText size={13} style={{ color: 'var(--accent-amber)' }} />
                    <span>C.C. {emp.document}</span>
                  </div>

                  {emp.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Phone size={13} style={{ color: 'var(--accent-emerald)' }} />
                      <span>{emp.phone}</span>
                    </div>
                  )}

                  {emp.bankInfo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <CreditCard size={13} style={{ color: '#38bdf8' }} />
                      <span style={{ wordBreak: 'break-all' }}>{emp.bankInfo}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                    <span>Ingreso: {formatDate(emp.startDate)}</span>
                  </div>
                </div>
              </div>

              <div className="employee-card-footer">
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                    Tarifa Base ({emp.paymentType})
                  </span>
                  <span className="employee-card-salary-val">
                    {formatCOP(emp.baseSalary)}
                  </span>
                </div>

                <div className="action-buttons-cell">
                  <button
                    type="button"
                    className="table-action-btn"
                    onClick={() => handleOpenEdit(emp)}
                    title="Editar datos del colaborador"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    className="table-action-btn btn-delete"
                    onClick={() => onDeleteEmployee(emp.id)}
                    title="Eliminar colaborador"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 3. Modal Formulario de Colaborador */}
      {isModalOpen && (
        <div className="pos-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="pos-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-header">
              <div className="pos-modal-title-group">
                <div className="pos-modal-icon-badge">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="pos-modal-title">
                    {editingEmployee ? 'Editar Colaborador' : 'Nuevo Colaborador'}
                  </h3>
                  <p className="pos-modal-subtitle">
                    Datos del equipo de trabajo de La Molienda
                  </p>
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

            <form onSubmit={handleSubmit}>
              <div className="pos-modal-body">
                <div className="pos-form-group">
                  <label className="pos-form-label">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pos-form-input"
                  />
                </div>

                <div className="pos-form-grid-2">
                  <div className="pos-form-group">
                    <label className="pos-form-label">Documento (C.C.)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 1098765432"
                      value={document}
                      onChange={(e) => setDocument(e.target.value)}
                      className="pos-form-input"
                    />
                  </div>

                  <div className="pos-form-group">
                    <label className="pos-form-label">Teléfono / Celular</label>
                    <input
                      type="text"
                      placeholder="Ej. 310 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pos-form-input"
                    />
                  </div>
                </div>

                <div className="pos-form-grid-2">
                  <div className="pos-form-group">
                    <label className="pos-form-label">Cargo / Rol</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="pos-form-select"
                    >
                      <option value="Barista">Barista</option>
                      <option value="Mesero">Mesero</option>
                      <option value="Cajero">Cajero</option>
                      <option value="Cocinero">Cocinero</option>
                      <option value="Administrador">Administrador</option>
                      <option value="Seguridad / Logística">Seguridad / Logística</option>
                    </select>
                  </div>

                  <div className="pos-form-group">
                    <label className="pos-form-label">Modalidad de Pago</label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value as any)}
                      className="pos-form-select"
                    >
                      <option value="quincenal">Quincenal</option>
                      <option value="mensual">Mensual</option>
                      <option value="por_turno">Por Turno / Jornada</option>
                      <option value="diario">Diario</option>
                    </select>
                  </div>
                </div>

                <div className="pos-form-grid-2">
                  <div className="pos-form-group">
                    <label className="pos-form-label">Salario o Tarifa Base ($)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(Number(e.target.value))}
                      className="pos-form-input"
                    />
                  </div>

                  <div className="pos-form-group">
                    <label className="pos-form-label">Fecha de Inicio</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="pos-form-input"
                    />
                  </div>
                </div>

                {/* Sección de Datos Bancarios / Método de Pago */}
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building2 size={16} style={{ color: 'var(--accent-amber)' }} />
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          color: 'var(--text-primary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Entidad Bancaria / Método de Pago
                      </span>
                    </div>

                    {computeBankInfo(selectedBank, accountType, accountNumber, customBankName) && (
                      <span
                        className="badge badge-amber"
                        style={{ fontSize: '0.74rem', padding: '0.2rem 0.55rem' }}
                      >
                        {computeBankInfo(selectedBank, accountType, accountNumber, customBankName)}
                      </span>
                    )}
                  </div>

                  <div className="pos-form-grid-2">
                    <div className="pos-form-group">
                      <label className="pos-form-label">Banco o Billetera</label>
                      <select
                        value={selectedBank}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedBank(val);
                          if (val === 'Efectivo') {
                            setAccountNumber('');
                          }
                        }}
                        className="pos-form-select"
                      >
                        <option value="">-- Sin cuenta registrada --</option>
                        <option value="Bancolombia">Bancolombia</option>
                        <option value="Nequi">Nequi</option>
                        <option value="Daviplata">Daviplata</option>
                        <option value="Davivienda">Davivienda</option>
                        <option value="Banco de Bogotá">Banco de Bogotá</option>
                        <option value="BBVA Colombia">BBVA Colombia</option>
                        <option value="Banco Agrario">Banco Agrario</option>
                        <option value="Nu Colombia">Nu Colombia</option>
                        <option value="Banco Falabella">Banco Falabella</option>
                        <option value="Scotiabank Colpatria">Scotiabank Colpatria</option>
                        <option value="Banco de Occidente">Banco de Occidente</option>
                        <option value="Banco Popular">Banco Popular</option>
                        <option value="Banco AV Villas">Banco AV Villas</option>
                        <option value="Lulo Bank">Lulo Bank</option>
                        <option value="Dale!">Dale!</option>
                        <option value="Movii">Movii</option>
                        <option value="Efectivo">Pago en Efectivo</option>
                        <option value="Otro">Otro Banco / Entidad</option>
                      </select>
                    </div>

                    {/* Si es billetera digital (Nequi, Daviplata, etc.) */}
                    {(selectedBank === 'Nequi' ||
                      selectedBank === 'Daviplata' ||
                      selectedBank === 'Dale!' ||
                      selectedBank === 'Movii') && (
                      <div className="pos-form-group">
                        <label className="pos-form-label">Número de Celular / Cuenta</label>
                        <input
                          type="text"
                          placeholder="Ej. 310 123 4567"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          className="pos-form-input"
                        />
                      </div>
                    )}

                    {/* Si es Efectivo */}
                    {selectedBank === 'Efectivo' && (
                      <div className="pos-form-group" style={{ justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          💵 Pago entregado en efectivo directamente.
                        </span>
                      </div>
                    )}

                    {/* Si es banco tradicional */}
                    {selectedBank &&
                      selectedBank !== 'Efectivo' &&
                      selectedBank !== 'Nequi' &&
                      selectedBank !== 'Daviplata' &&
                      selectedBank !== 'Dale!' &&
                      selectedBank !== 'Movii' &&
                      selectedBank !== 'Otro' && (
                        <div className="pos-form-group">
                          <label className="pos-form-label">Tipo de Cuenta</label>
                          <select
                            value={accountType}
                            onChange={(e) =>
                              setAccountType(e.target.value as 'Ahorros' | 'Corriente')
                            }
                            className="pos-form-select"
                          >
                            <option value="Ahorros">Cuenta de Ahorros</option>
                            <option value="Corriente">Cuenta Corriente</option>
                          </select>
                        </div>
                      )}

                    {/* Si seleccionó Otro */}
                    {selectedBank === 'Otro' && (
                      <div className="pos-form-group">
                        <label className="pos-form-label">Nombre del Banco / Entidad</label>
                        <input
                          type="text"
                          placeholder="Ej. Banco Caja Social, Itaú..."
                          value={customBankName}
                          onChange={(e) => setCustomBankName(e.target.value)}
                          className="pos-form-input"
                        />
                      </div>
                    )}
                  </div>

                  {/* Número de cuenta para bancos tradicionales y para Otro */}
                  {selectedBank &&
                    selectedBank !== 'Efectivo' &&
                    selectedBank !== 'Nequi' &&
                    selectedBank !== 'Daviplata' &&
                    selectedBank !== 'Dale!' &&
                    selectedBank !== 'Movii' && (
                      <div className="pos-form-grid-2">
                        {selectedBank === 'Otro' && (
                          <div className="pos-form-group">
                            <label className="pos-form-label">Tipo de Cuenta</label>
                            <select
                              value={accountType}
                              onChange={(e) =>
                                setAccountType(e.target.value as 'Ahorros' | 'Corriente')
                              }
                              className="pos-form-select"
                            >
                              <option value="Ahorros">Cuenta de Ahorros</option>
                              <option value="Corriente">Cuenta Corriente</option>
                            </select>
                          </div>
                        )}
                        <div
                          className={`pos-form-group ${
                            selectedBank !== 'Otro' ? 'full-width' : ''
                          }`}
                        >
                          <label className="pos-form-label">Número de Cuenta Bancaria</label>
                          <input
                            type="text"
                            placeholder="Ej. 104-582910-12"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            className="pos-form-input"
                          />
                        </div>
                      </div>
                    )}
                </div>

                <div className="pos-form-group">
                  <label className="pos-form-label">Notas Adicionales</label>
                  <input
                    type="text"
                    placeholder="Observaciones de horario o contrato..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="pos-form-input"
                  />
                </div>
              </div>

              <div className="pos-modal-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginRight: 'auto' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={laMoliendaLogo}
                      alt="La Molienda POS"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.15 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.2px' }}>
                      La Molienda POS
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      Gestión de Colaboradores
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="pos-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="pos-btn-primary">
                  <span>{editingEmployee ? 'Actualizar Colaborador' : 'Crear Colaborador'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
