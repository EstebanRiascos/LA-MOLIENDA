import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  DollarSign,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  X,
  CreditCard,
  Phone,
  Check,
  FileCheck,
  Printer,
  Receipt,
  Edit3,
} from 'lucide-react';
import laMoliendaLogo from '../../assets/la_molienda_logo.png';
import { RentContract, RentPayment } from '../types';
import { formatCOP, formatDate } from '../utils/formatters';

interface RentViewProps {
  contracts: RentContract[];
  payments: RentPayment[];
  onAddPayment: (payment: RentPayment) => void;
  onDeletePayment: (id: string) => void;
  onUpdatePaymentStatus: (id: string, status: 'pendiente' | 'pagado' | 'vencido') => void;
  onUpdateContract: (contract: RentContract) => void;
}

export const RentView: React.FC<RentViewProps> = ({
  contracts,
  payments,
  onAddPayment,
  onDeletePayment,
  onUpdatePaymentStatus,
  onUpdateContract,
}) => {
  const currentContract = contracts[0]; // Primary contract
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditContractOpen, setIsEditContractOpen] = useState(false);
  const [receiptToPrint, setReceiptToPrint] = useState<RentPayment | null>(null);

  // Edit Contract Form State
  const [editPropertyName, setEditPropertyName] = useState(currentContract?.propertyName || '');
  const [editMonthlyAmount, setEditMonthlyAmount] = useState<number>(currentContract?.monthlyAmount || 3200000);
  const [editPaymentDueDay, setEditPaymentDueDay] = useState<number>(currentContract?.paymentDueDay || 5);
  const [editLandlordName, setEditLandlordName] = useState(currentContract?.landlordName || '');
  const [editLandlordPhone, setEditLandlordPhone] = useState(currentContract?.landlordPhone || '');
  const [editContractNotes, setEditContractNotes] = useState(currentContract?.notes || '');

  // Structured Bank Details for Contract
  const [editBank, setEditBank] = useState('');
  const [editAccountType, setEditAccountType] = useState<'Ahorros' | 'Corriente'>('Ahorros');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editCustomBank, setEditCustomBank] = useState('');

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
        const numMatch = clean.match(/#?\s*([0-9\-\s]{5,})/);
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
    const numMatch = clean.match(/#?\s*([0-9\-\s]{5,})/);
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
    if (type) parts.push(type === 'Corriente' ? 'Cuenta Corriente' : 'Cuenta de Ahorros');
    if (cleanNum) parts.push(`# ${cleanNum}`);
    return parts.join(' ');
  };

  const handleOpenEditContract = () => {
    if (!currentContract) return;
    setEditPropertyName(currentContract.propertyName || '');
    setEditMonthlyAmount(currentContract.monthlyAmount || 3200000);
    setEditPaymentDueDay(currentContract.paymentDueDay || 5);
    setEditLandlordName(currentContract.landlordName || '');
    setEditLandlordPhone(currentContract.landlordPhone || '');
    setEditContractNotes(currentContract.notes || '');

    const parsedBank = parseExistingBankInfo(currentContract.bankDetails);
    setEditBank(parsedBank.bank);
    setEditAccountType(parsedBank.type);
    setEditAccountNumber(parsedBank.num);
    setEditCustomBank(parsedBank.custom);

    setIsEditContractOpen(true);
  };

  const handleSaveContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentContract) return;

    const calculatedBankDetails = computeBankInfo(
      editBank,
      editAccountType,
      editAccountNumber,
      editCustomBank
    );

    const updated: RentContract = {
      ...currentContract,
      propertyName: editPropertyName.trim() || 'Local Comercial La Molienda',
      monthlyAmount: Number(editMonthlyAmount) || 0,
      paymentDueDay: Number(editPaymentDueDay) || 5,
      landlordName: editLandlordName.trim() || 'Sin especificar',
      landlordPhone: editLandlordPhone.trim(),
      bankDetails: calculatedBankDetails.trim(),
      notes: editContractNotes.trim(),
    };

    onUpdateContract(updated);
    setIsEditContractOpen(false);
  };

  // New Payment Form
  const [periodMonth, setPeriodMonth] = useState('Noviembre 2026');
  const [amount, setAmount] = useState<number>(currentContract?.monthlyAmount || 3200000);
  const [dueDate, setDueDate] = useState('2026-11-05');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'pendiente' | 'pagado'>('pagado');
  const [paymentMethod, setPaymentMethod] = useState<'transferencia' | 'efectivo' | 'consignacion'>('transferencia');
  const [receiptReference, setReceiptReference] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentContract) return;

    const newPayment: RentPayment = {
      id: 'rent-pay-' + Date.now(),
      contractId: currentContract.id,
      propertyName: currentContract.propertyName,
      periodMonth,
      amount: Number(amount),
      dueDate,
      paymentDate: status === 'pagado' ? paymentDate : '',
      status,
      paymentMethod,
      receiptReference,
      notes,
      createdAt: new Date().toISOString(),
    };

    onAddPayment(newPayment);
    setIsModalOpen(false);
    setReceiptReference('');
    setNotes('');
  };

  const pendingPayments = payments.filter((p) => p.status !== 'pagado');
  const paidPayments = payments.filter((p) => p.status === 'pagado');
  const totalPaidRent = paidPayments.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Tarjeta Ficha del Contrato de Arrendamiento */}
      {currentContract && (
        <div className="rent-contract-hero-card">
          <div className="rent-hero-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(2, 132, 199, 0.1))',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Building2 size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {currentContract.propertyName}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                  {currentContract.notes || 'Sede Principal — La Molienda Café Bar'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className={`status-badge ${pendingPayments.length > 0 ? 'pending' : 'paid'}`}>
                {pendingPayments.length > 0 ? (
                  <>
                    <Clock size={13} />
                    <span>{pendingPayments.length} Pendiente(s)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} />
                    <span>Al día en Arriendo</span>
                  </>
                )}
              </span>

              <button
                type="button"
                className="pos-btn-secondary"
                onClick={handleOpenEditContract}
                style={{
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  borderRadius: '10px',
                }}
                title="Editar valores del canon, fechas y datos del arrendador"
              >
                <Edit3 size={14} />
                <span>Editar Información</span>
              </button>
            </div>
          </div>

          <div
            className="rent-hero-details-grid"
            onClick={handleOpenEditContract}
            title="Haz clic para editar la información de arriendo"
            style={{ cursor: 'pointer' }}
          >
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                CANON MENSUAL
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                {formatCOP(currentContract.monthlyAmount)}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                DÍA LÍMITE DE PAGO
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 750, color: 'var(--text-primary)' }}>
                Día {currentContract.paymentDueDay} de cada mes
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                ARRENDADOR / CONTACTO
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                {currentContract.landlordName}
              </span>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Tel. {currentContract.landlordPhone}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                DATOS BANCARIOS PAGO
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {currentContract.bankDetails || 'Consignación o transferencia'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Barra de Herramientas y Botón de Pago */}
      <div className="inventory-toolbar">
        <div className="toolbar-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Historial de Pagos de Arriendo
            </span>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Total abonado: <strong style={{ color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>{formatCOP(totalPaidRent)}</strong>
            </span>
          </div>
        </div>

        <div className="toolbar-right">
          <button
            type="button"
            className="btn-add-product pos-btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Registrar Pago de Arriendo</span>
          </button>
        </div>
      </div>

      {/* 3. Tabla de Pagos de Arriendo */}
      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Periodo (Mes)</th>
              <th style={{ textAlign: 'center' }}>Vencimiento</th>
              <th style={{ textAlign: 'center' }}>Fecha de Pago</th>
              <th style={{ textAlign: 'right' }}>Monto Pagado</th>
              <th style={{ textAlign: 'center' }}>Método</th>
              <th>Comprobante / Aprobación</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No se han registrado pagos de arriendo todavía.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span style={{ fontWeight: 750, color: 'var(--text-primary)' }}>
                      {p.periodMonth}
                    </span>
                    {p.notes && (
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>
                        {p.notes}
                      </span>
                    )}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      <Calendar size={13} style={{ color: 'var(--accent-amber)' }} />
                      <span>{formatDate(p.dueDate)}</span>
                    </div>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: p.paymentDate ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {p.paymentDate ? formatDate(p.paymentDate) : '—'}
                    </span>
                  </td>

                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                    {formatCOP(p.amount)}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <span className={`method-pill ${p.paymentMethod}`}>
                      {p.paymentMethod}
                    </span>
                  </td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <FileCheck size={14} style={{ color: 'var(--accent-emerald)' }} />
                      <span style={{ fontFamily: 'var(--font-mono)' }}>
                        {p.receiptReference || 'Sin ref.'}
                      </span>
                    </div>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <span className={`status-badge ${p.status === 'pagado' ? 'paid' : p.status === 'vencido' ? 'overdue' : 'pending'}`}>
                      {p.status === 'pagado' ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span>Pagado</span>
                        </>
                      ) : p.status === 'vencido' ? (
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
                        onClick={() => setReceiptToPrint(p)}
                        title="Imprimir Comprobante de Arriendo"
                      >
                        <Printer size={14} />
                      </button>

                      <button
                        type="button"
                        className="table-action-btn btn-pay-toggle"
                        onClick={() =>
                          onUpdatePaymentStatus(
                            p.id,
                            p.status === 'pagado' ? 'pendiente' : 'pagado'
                          )
                        }
                        title={p.status === 'pagado' ? 'Marcar como Pendiente' : 'Marcar como Pagado'}
                      >
                        <Check size={14} />
                      </button>

                      <button
                        type="button"
                        className="table-action-btn btn-delete"
                        onClick={() => onDeletePayment(p.id)}
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

      {/* 4. Modal para Registrar Pago de Arriendo */}
      {isModalOpen && (
        <div className="pos-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="pos-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-header">
              <div className="pos-modal-title-group">
                <div className="pos-modal-icon-badge">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="pos-modal-title">Registrar Pago de Arriendo</h3>
                  <p className="pos-modal-subtitle">Control de canon y comprobante mensual</p>
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
                <div className="pos-form-grid-2">
                  <div className="pos-form-group">
                    <label className="pos-form-label">Periodo / Mes</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Noviembre 2026"
                      value={periodMonth}
                      onChange={(e) => setPeriodMonth(e.target.value)}
                      className="pos-form-input"
                    />
                  </div>

                  <div className="pos-form-group">
                    <label className="pos-form-label">Valor del Canon ($)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="pos-form-input"
                    />
                  </div>
                </div>

                <div className="pos-form-grid-2">
                  <div className="pos-form-group">
                    <label className="pos-form-label">Fecha Límite (Vencimiento)</label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="pos-form-input"
                    />
                  </div>

                  <div className="pos-form-group">
                    <label className="pos-form-label">Fecha de Pago Efectuado</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="pos-form-input"
                    />
                  </div>
                </div>

                <div className="pos-form-grid-2">
                  <div className="pos-form-group">
                    <label className="pos-form-label">Método de Pago</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="pos-form-select"
                    >
                      <option value="transferencia">Transferencia Bancaria</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="consignacion">Consignación</option>
                    </select>
                  </div>

                  <div className="pos-form-group">
                    <label className="pos-form-label">Estado</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="pos-form-select"
                    >
                      <option value="pagado">Pagado (Comprobante al día)</option>
                      <option value="pendiente">Pendiente</option>
                    </select>
                  </div>
                </div>

                <div className="pos-form-group">
                  <label className="pos-form-label">Nº Aprobación / Referencia Comprobante</label>
                  <input
                    type="text"
                    placeholder="Ej. Bancolombia Ref: #0928192"
                    value={receiptReference}
                    onChange={(e) => setReceiptReference(e.target.value)}
                    className="pos-form-input"
                  />
                </div>

                <div className="pos-form-group">
                  <label className="pos-form-label">Observaciones Adicionales</label>
                  <input
                    type="text"
                    placeholder="Notas sobre el pago o recibo..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="pos-form-input"
                  />
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
                  <span>Guardar Pago de Arriendo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Editar Ficha / Contrato de Arrendamiento */}
      {isEditContractOpen && (
        <div className="pos-modal-overlay" onClick={() => setIsEditContractOpen(false)}>
          <div
            className="pos-modal-box"
            style={{ maxWidth: '620px', width: '95vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-modal-header">
              <div className="pos-modal-title-group">
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: '#38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Editar Ficha de Arrendamiento
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Modifica el canon mensual, fechas y datos bancarios del arrendador
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setIsEditContractOpen(false)}
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveContract}>
              <div style={{ padding: '1.45rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="pos-form-grid-2">
                  <div className="pos-form-group">
                    <label className="pos-form-label">Canon Mensual ($)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={1000}
                      value={editMonthlyAmount}
                      onChange={(e) => setEditMonthlyAmount(Number(e.target.value))}
                      className="pos-form-input"
                      placeholder="Ej. 3200000"
                    />
                  </div>

                  <div className="pos-form-group">
                    <label className="pos-form-label">Día Límite de Pago de Cada Mes</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={31}
                      value={editPaymentDueDay}
                      onChange={(e) => setEditPaymentDueDay(Number(e.target.value))}
                      className="pos-form-input"
                      placeholder="Ej. 5"
                    />
                  </div>
                </div>

                <div className="pos-form-grid-2">
                  <div className="pos-form-group">
                    <label className="pos-form-label">Arrendador / Inmobiliaria</label>
                    <input
                      type="text"
                      required
                      value={editLandlordName}
                      onChange={(e) => setEditLandlordName(e.target.value)}
                      className="pos-form-input"
                      placeholder="Ej. Inmobiliaria & Propiedades del Café S.A.S."
                    />
                  </div>

                  <div className="pos-form-group">
                    <label className="pos-form-label">Teléfono / Contacto</label>
                    <input
                      type="text"
                      value={editLandlordPhone}
                      onChange={(e) => setEditLandlordPhone(e.target.value)}
                      className="pos-form-input"
                      placeholder="Ej. 310 987 6543"
                    />
                  </div>
                </div>

                {/* Entidad Bancaria / Método de Pago */}
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
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
                        Datos Bancarios para el Pago (Cuenta / Destino)
                      </span>
                    </div>

                    {computeBankInfo(editBank, editAccountType, editAccountNumber, editCustomBank) && (
                      <span
                        className="badge badge-amber"
                        style={{ fontSize: '0.74rem', padding: '0.2rem 0.55rem' }}
                      >
                        {computeBankInfo(editBank, editAccountType, editAccountNumber, editCustomBank)}
                      </span>
                    )}
                  </div>

                  <div className="pos-form-grid-2">
                    <div className="pos-form-group">
                      <label className="pos-form-label">Banco o Billetera</label>
                      <select
                        value={editBank}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditBank(val);
                          if (val === 'Efectivo') {
                            setEditAccountNumber('');
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
                    {(editBank === 'Nequi' ||
                      editBank === 'Daviplata' ||
                      editBank === 'Dale!' ||
                      editBank === 'Movii') && (
                      <div className="pos-form-group">
                        <label className="pos-form-label">Número de Celular / Cuenta</label>
                        <input
                          type="text"
                          placeholder="Ej. 310 123 4567"
                          value={editAccountNumber}
                          onChange={(e) => setEditAccountNumber(e.target.value)}
                          className="pos-form-input"
                        />
                      </div>
                    )}

                    {/* Si es Efectivo */}
                    {editBank === 'Efectivo' && (
                      <div className="pos-form-group" style={{ justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          💵 Pago entregado en efectivo directamente.
                        </span>
                      </div>
                    )}

                    {/* Si es banco tradicional */}
                    {editBank &&
                      editBank !== 'Efectivo' &&
                      editBank !== 'Nequi' &&
                      editBank !== 'Daviplata' &&
                      editBank !== 'Dale!' &&
                      editBank !== 'Movii' &&
                      editBank !== 'Otro' && (
                        <div className="pos-form-group">
                          <label className="pos-form-label">Tipo de Cuenta</label>
                          <select
                            value={editAccountType}
                            onChange={(e) =>
                              setEditAccountType(e.target.value as 'Ahorros' | 'Corriente')
                            }
                            className="pos-form-select"
                          >
                            <option value="Ahorros">Cuenta de Ahorros</option>
                            <option value="Corriente">Cuenta Corriente</option>
                          </select>
                        </div>
                      )}

                    {/* Si seleccionó Otro */}
                    {editBank === 'Otro' && (
                      <div className="pos-form-group">
                        <label className="pos-form-label">Nombre del Banco / Entidad</label>
                        <input
                          type="text"
                          placeholder="Ej. Banco Caja Social, Itaú..."
                          value={editCustomBank}
                          onChange={(e) => setEditCustomBank(e.target.value)}
                          className="pos-form-input"
                        />
                      </div>
                    )}
                  </div>

                  {/* Número de cuenta para bancos tradicionales y para Otro */}
                  {editBank &&
                    editBank !== 'Efectivo' &&
                    editBank !== 'Nequi' &&
                    editBank !== 'Daviplata' &&
                    editBank !== 'Dale!' &&
                    editBank !== 'Movii' && (
                      <div className="pos-form-grid-2">
                        {editBank === 'Otro' && (
                          <div className="pos-form-group">
                            <label className="pos-form-label">Tipo de Cuenta</label>
                            <select
                              value={editAccountType}
                              onChange={(e) =>
                                setEditAccountType(e.target.value as 'Ahorros' | 'Corriente')
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
                            editBank !== 'Otro' ? 'full-width' : ''
                          }`}
                        >
                          <label className="pos-form-label">Número de Cuenta Bancaria</label>
                          <input
                            type="text"
                            placeholder="Ej. 104-582910-12"
                            value={editAccountNumber}
                            onChange={(e) => setEditAccountNumber(e.target.value)}
                            className="pos-form-input"
                          />
                        </div>
                      </div>
                    )}
                </div>

                <div className="pos-form-group">
                  <label className="pos-form-label">Inmueble / Sede Comercial</label>
                  <input
                    type="text"
                    required
                    value={editPropertyName}
                    onChange={(e) => setEditPropertyName(e.target.value)}
                    className="pos-form-input"
                    placeholder="Ej. Local Comercial La Molienda – Sede Principal"
                  />
                </div>

                <div className="pos-form-group">
                  <label className="pos-form-label">Observaciones / Detalles del Contrato</label>
                  <input
                    type="text"
                    value={editContractNotes}
                    onChange={(e) => setEditContractNotes(e.target.value)}
                    className="pos-form-input"
                    placeholder="Ej. Contrato a 2 años con opción de renovación. Incluye local y zona exterior."
                  />
                </div>
              </div>

              <div className="pos-modal-footer">
                <button
                  type="button"
                  className="pos-btn-secondary"
                  onClick={() => setIsEditContractOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="pos-btn-primary">
                  <Check size={16} />
                  <span>Guardar Información</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal de Recibo / Comprobante de Arriendo */}
      {receiptToPrint && (
        <div className="pos-modal-overlay" onClick={() => setReceiptToPrint(null)}>
          <div
            className="pos-modal-box"
            style={{
              maxWidth: '540px',
              width: '95vw',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(245, 158, 11, 0.15)',
              border: '1.5px solid var(--border-color)',
              background: 'var(--bg-card)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal (No se imprime) */}
            <div className="pos-modal-header" style={{ padding: '1.15rem 1.45rem' }}>
              <div className="pos-modal-title-group">
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: 'var(--accent-amber)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Comprobante de Arriendo
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {receiptToPrint.periodMonth} • Vista de Impresión y Control
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setReceiptToPrint(null)}
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenedor del Recibo con aspecto de Tarjeta Física */}
            <div
              style={{
                padding: '1.25rem',
                background: 'rgba(0, 0, 0, 0.25)',
                maxHeight: '68vh',
                overflowY: 'auto',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              {/* Papel del Recibo como Tarjeta */}
              <div
                id="printable-rent-receipt"
                className="receipt-paper"
                style={{
                  background: '#ffffff',
                  color: '#111111',
                  padding: '1.75rem 1.4rem',
                  fontFamily: `'JetBrains Mono', 'Courier New', Courier, monospace`,
                  fontSize: '0.76rem',
                  lineHeight: 1.45,
                  borderRadius: '14px',
                  boxShadow: '0 10px 35px rgba(0, 0, 0, 0.22), 0 2px 6px rgba(0, 0, 0, 0.12)',
                  border: '1px solid #e2e8f0',
                  width: '100%',
                  maxWidth: '440px',
                }}
              >
                {/* Encabezado de Marca */}
                <div className="receipt-brand-header">
                  <img
                    src={laMoliendaLogo}
                    alt="La Molienda"
                    style={{ width: '48px', height: '48px', objectFit: 'contain', marginBottom: '4px' }}
                  />
                  <span className="receipt-company" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#000000', letterSpacing: '0.06em' }}>
                    LA MOLIENDA
                  </span>
                  <span className="receipt-tagline" style={{ fontSize: '0.7rem', color: '#444444', fontWeight: 600 }}>
                    Café Bar & Gastronomía • Administración
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#666666' }}>
                    NIT: 901.452.889-1 • Régimen Común
                  </span>
                </div>

                <div className="receipt-divider-dashed" />

                {/* Título Oficial del Documento */}
                <div style={{ textAlign: 'center', margin: '0.35rem 0' }}>
                  <strong style={{ fontSize: '0.85rem', letterSpacing: '0.05em', color: '#000000', display: 'block' }}>
                    COMPROBANTE DE PAGO DE ARRIENDO
                  </strong>
                  <span style={{ fontSize: '0.68rem', color: '#555555' }}>
                    CONTROL DE CANON COMERCIAL
                  </span>
                </div>

                <div className="receipt-divider-solid" />

                {/* Bloque de Información del Documento */}
                <div className="receipt-info-block">
                  <div className="info-line">
                    <span>Nº Comprobante:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>
                      ARR-{receiptToPrint.id.slice(-6).toUpperCase()}
                    </strong>
                  </div>
                  <div className="info-line">
                    <span>Fecha de Emisión:</span>
                    <span>{new Date().toLocaleDateString('es-CO')} {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="info-line">
                    <span>Periodo Liquidado:</span>
                    <strong style={{ textTransform: 'uppercase' }}>{receiptToPrint.periodMonth}</strong>
                  </div>
                </div>

                <div className="receipt-divider-dashed" />

                {/* Datos del Inmueble y Partes del Contrato */}
                <div className="receipt-info-block">
                  <div style={{ fontWeight: 800, fontSize: '0.72rem', color: '#000000', marginBottom: '0.2rem' }}>
                    DATOS DEL CONTRATO E INMUEBLE:
                  </div>
                  <div className="info-line">
                    <span>Inmueble:</span>
                    <span style={{ textAlign: 'right', fontWeight: 600, maxWidth: '65%' }}>
                      {receiptToPrint.propertyName}
                    </span>
                  </div>
                  <div className="info-line">
                    <span>Arrendador:</span>
                    <span style={{ textAlign: 'right', fontWeight: 600, maxWidth: '65%' }}>
                      {currentContract?.landlordName || 'Propietario Inmueble'}
                    </span>
                  </div>
                  {currentContract?.landlordPhone && (
                    <div className="info-line">
                      <span>Tel. Arrendador:</span>
                      <span>{currentContract.landlordPhone}</span>
                    </div>
                  )}
                  {currentContract?.bankDetails && (
                    <div className="info-line">
                      <span>Cuenta Destino:</span>
                      <span style={{ textAlign: 'right', fontSize: '0.68rem', maxWidth: '65%' }}>
                        {currentContract.bankDetails}
                      </span>
                    </div>
                  )}
                  <div className="info-line">
                    <span>Arrendatario:</span>
                    <span style={{ textAlign: 'right' }}>La Molienda Café Bar</span>
                  </div>
                </div>

                <div className="receipt-divider-solid" />

                {/* Detalle y Liquidación del Pago */}
                <div className="receipt-info-block">
                  <div style={{ fontWeight: 800, fontSize: '0.72rem', color: '#000000', marginBottom: '0.2rem' }}>
                    CONTROL DE LIQUIDACIÓN Y PAGO:
                  </div>
                  <div className="info-line">
                    <span>Fecha Límite / Venc.:</span>
                    <span>{formatDate(receiptToPrint.dueDate)}</span>
                  </div>
                  <div className="info-line">
                    <span>Fecha Pago Efectivo:</span>
                    <strong style={{ color: receiptToPrint.paymentDate ? '#000000' : '#888888' }}>
                      {receiptToPrint.paymentDate ? formatDate(receiptToPrint.paymentDate) : 'Pendiente'}
                    </strong>
                  </div>
                  <div className="info-line">
                    <span>Método de Pago:</span>
                    <strong style={{ textTransform: 'uppercase' }}>
                      {receiptToPrint.paymentMethod}
                    </strong>
                  </div>
                  <div className="info-line">
                    <span>Ref. Transacción:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {receiptToPrint.receiptReference || 'Sin referencia'}
                    </span>
                  </div>
                  <div className="info-line">
                    <span>Estado de la Obligación:</span>
                    <strong style={{ color: receiptToPrint.status === 'pagado' ? '#047857' : '#b45309', textTransform: 'uppercase' }}>
                      {receiptToPrint.status === 'pagado' ? '● PAGADO Y PAZ Y SALVO' : '○ PENDIENTE DE PAGO'}
                    </strong>
                  </div>
                </div>

                <div className="receipt-divider-solid" />

                {/* Desglose Financiero */}
                <div className="receipt-totals-block" style={{ margin: '0.4rem 0' }}>
                  <div className="total-line info-line">
                    <span>Canon Mensual Pactado:</span>
                    <span>{formatCOP(currentContract?.monthlyAmount || receiptToPrint.amount)}</span>
                  </div>
                  <div
                    className="grand-total-line info-line"
                    style={{
                      fontSize: '0.98rem',
                      fontWeight: 900,
                      borderTop: '1px solid #000000',
                      borderBottom: '1px solid #000000',
                      padding: '0.35rem 0',
                      margin: '0.3rem 0',
                    }}
                  >
                    <span>MONTO TOTAL PAGADO:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCOP(receiptToPrint.amount)}</span>
                  </div>
                  <div className="total-line info-line" style={{ fontSize: '0.7rem', color: '#444444' }}>
                    <span>Saldo Restante del Periodo:</span>
                    <span>
                      {formatCOP(Math.max(0, (currentContract?.monthlyAmount || receiptToPrint.amount) - receiptToPrint.amount))}
                    </span>
                  </div>
                </div>

                {receiptToPrint.notes && (
                  <>
                    <div className="receipt-divider-dashed" />
                    <div style={{ fontSize: '0.68rem', color: '#333333' }}>
                      <strong>Observaciones:</strong> {receiptToPrint.notes}
                    </div>
                  </>
                )}

                <div className="receipt-divider-dashed" style={{ margin: '0.85rem 0 0.5rem 0' }} />

                {/* SECCIÓN DE FIRMAS EN TARJETAS CON ESPACIO GENEROSO */}
                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  {/* TARJETA 1: ARRENDADOR / RECEPTOR */}
                  <div
                    style={{
                      border: '1.5px dashed #94a3b8',
                      borderRadius: '10px',
                      padding: '0.9rem 1.15rem',
                      background: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.74rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        FIRMA ARRENDADOR / RECEPTOR
                      </strong>
                      <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>● QUIEN RECIBE</span>
                    </div>

                    {/* Espacio amplio de 75px para firmar con bolígrafo */}
                    <div
                      style={{
                        height: '75px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ borderBottom: '1.5px solid #334155', width: '100%' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.68rem', color: '#334155' }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Nombre / Razón Social: </span>
                        <strong>{currentContract?.landlordName || 'Inmobiliaria & Propiedades del Café S.A.S.'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                        <span>C.C. / NIT: ____________________________</span>
                        <span>Fecha: _____ / _____ / _________</span>
                      </div>
                    </div>
                  </div>

                  {/* TARJETA 2: ARRENDATARIO / PAGADOR */}
                  <div
                    style={{
                      border: '1.5px dashed #94a3b8',
                      borderRadius: '10px',
                      padding: '0.9rem 1.15rem',
                      background: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.74rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        FIRMA ARRENDATARIO (PAGADOR)
                      </strong>
                      <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>● QUIEN PAGA</span>
                    </div>

                    {/* Espacio amplio de 75px para firmar con bolígrafo */}
                    <div
                      style={{
                        height: '75px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ borderBottom: '1.5px solid #334155', width: '100%' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.68rem', color: '#334155' }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Establecimiento: </span>
                        <strong>Administración La Molienda Café Bar</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                        <span>Entregado por: ________________________</span>
                        <span>Fecha: _____ / _____ / _________</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="receipt-divider-dashed" style={{ margin: '1rem 0 0.5rem 0' }} />

                {/* Pie Legal y Constancia */}
                <div className="receipt-footer" style={{ textAlign: 'center', fontSize: '0.62rem', color: '#666666' }}>
                  <span className="thanks-msg" style={{ fontSize: '0.68rem', fontWeight: 800, color: '#000000' }}>
                    *** CONSTANCIA OFICIAL DE CANON ***
                  </span>
                  <span>
                    Este documento certifica el cumplimiento de la obligación mensual de arrendamiento comercial del establecimiento.
                  </span>
                  <span style={{ fontSize: '0.58rem', color: '#888888', marginTop: '3px' }}>
                    Sistema de Gestión La Molienda • Nómina & Arriendo
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones del Modal (No se imprimen) */}
            <div
              className="pos-modal-footer"
              style={{
                padding: '1rem 1.45rem',
                borderTop: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
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
                title="Imprimir ticket / comprobante de arriendo"
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
