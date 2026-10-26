import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  BookmarkCheck,
  LayoutGrid,
  User,
  Phone,
  Calendar,
  Clock,
  Users,
  Minus,
  Plus,
  FileText,
  AlertCircle,
  Check,
  Trash2,
} from 'lucide-react';
import { Table } from '../types';

interface ReserveTableModalProps {
  isOpen: boolean;
  tables: Table[];
  preSelectedTable?: Table | null;
  onClose: () => void;
  onCancelReservation?: (table: Table) => void;
  onConfirmReserve: (
    tableIds: string[],
    reservationData: {
      name: string;
      phone?: string;
      date: string;
      time: string;
      pax: number;
      notes?: string;
    }
  ) => void;
}

export const ReserveTableModal: React.FC<ReserveTableModalProps> = ({
  isOpen,
  tables,
  preSelectedTable,
  onClose,
  onCancelReservation,
  onConfirmReserve,
}) => {
  if (!isOpen) return null;

  // Mesas del mismo grupo de reserva (si se está editando una reserva conjunta)
  const groupTableIds = preSelectedTable?.reservationGroupId
    ? tables
        .filter((t) => t.reservationGroupId === preSelectedTable.reservationGroupId)
        .map((t) => t.id)
    : preSelectedTable
    ? [preSelectedTable.id]
    : [];

  // Filtrar mesas elegibles: Libres (o las mesas de la reserva que se está editando)
  const eligibleTables = tables.filter(
    (t) => t.status === 'libre' || groupTableIds.includes(t.id)
  );

  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [reservationDate, setReservationDate] = useState<string>('');
  const [reservationTime, setReservationTime] = useState<string>('');
  const [pax, setPax] = useState<number>(2);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const wasOpenRef = useRef(false);
  const customerInputRef = useRef<HTMLInputElement>(null);

  // Inicializar estado ÚNICAMENTE al abrir el modal para no resetear lo que el usuario escribe
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      const currentHour = today.getHours();
      const nextHour = (currentHour + 1) % 24;
      const defaultTimeStr = `${String(nextHour).padStart(2, '0')}:00`;

      if (preSelectedTable) {
        setSelectedTableIds(
          preSelectedTable.status === 'reservada' ? groupTableIds : [preSelectedTable.id]
        );
        setPax(preSelectedTable.reservationPax || preSelectedTable.capacity || 2);
        setCustomerName(preSelectedTable.reservationName || '');
        setCustomerPhone(preSelectedTable.reservationPhone || '');
        setReservationDate(preSelectedTable.reservationDate || todayStr);
        setReservationTime(preSelectedTable.reservationTime || defaultTimeStr);
        setNotes(preSelectedTable.reservationNotes || '');
      } else {
        const firstFree = eligibleTables[0];
        setSelectedTableIds(firstFree ? [firstFree.id] : []);
        setPax(firstFree?.capacity || 2);
        setCustomerName('');
        setCustomerPhone('');
        setReservationDate(todayStr);
        setReservationTime(defaultTimeStr);
        setNotes('');
      }
      setError('');

      setTimeout(() => {
        customerInputRef.current?.focus();
      }, 60);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, preSelectedTable]);

  const selectedTables = eligibleTables.filter((t) => selectedTableIds.includes(t.id));
  const totalCapacity = selectedTables.reduce((sum, t) => sum + (t.capacity || 0), 0);

  const toggleTable = (id: string) => {
    const next = selectedTableIds.includes(id)
      ? selectedTableIds.filter((x) => x !== id)
      : [...selectedTableIds, id];
    setSelectedTableIds(next);
    // Sugerir comensales = capacidad total de las mesas elegidas
    const cap = eligibleTables
      .filter((t) => next.includes(t.id))
      .reduce((sum, t) => sum + (t.capacity || 0), 0);
    if (cap > 0) setPax(Math.min(30, cap));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTableIds.length === 0) {
      setError('Por favor selecciona al menos una mesa o espacio.');
      return;
    }
    if (!customerName.trim()) {
      setError('El nombre del cliente o titular de la reserva es obligatorio.');
      return;
    }
    if (!reservationDate) {
      setError('Selecciona la fecha de la reserva.');
      return;
    }
    if (!reservationTime) {
      setError('Selecciona la hora de la reserva.');
      return;
    }

    onConfirmReserve(selectedTableIds, {
      name: customerName.trim(),
      phone: customerPhone.trim() || undefined,
      date: reservationDate,
      time: reservationTime,
      pax: Math.max(1, pax),
      notes: notes.trim() || undefined,
    });
  };

  // Atajos para hora
  const setQuickTime = (minutesFromNow: number) => {
    const d = new Date(Date.now() + minutesFromNow * 60 * 1000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    setReservationTime(`${hh}:${mm}`);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container reserve-table-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="modal-header">
          <div className="reserve-table-header-box">
            <div className="modal-header-icon-badge">
              <BookmarkCheck size={20} />
            </div>
            <div>
              <h2 className="modal-title">
                {preSelectedTable?.status === 'reservada'
                  ? `Editar Reserva — ${preSelectedTable.number}`
                  : 'Reservar Mesa / Espacio'}
              </h2>
              <span className="modal-subtitle">
                Aparta una mesa con fecha, hora y datos de contacto del cliente.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            title="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleSubmit} className="reserve-table-wrapper">
          <div className="reserve-table-body">
            {error && (
              <div className="reserve-error-banner">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* SECCIÓN 1: MESA Y ESPACIO */}
            <div className="reserve-section-card">
              <div className="section-card-header">
                <div className="section-card-title">
                  <LayoutGrid size={14} />
                  <span>1. Mesa(s) o Espacio a Reservar</span>
                </div>
                {selectedTables.length > 0 && (
                  <span className="table-zone-pill">
                    {selectedTables.length} {selectedTables.length === 1 ? 'mesa' : 'mesas'} • Cap: {totalCapacity}p
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Selecciona una o varias mesas para unirlas en la misma reserva *
                </label>
                {eligibleTables.length === 0 ? (
                  <div className="reserve-tables-empty">No hay mesas libres disponibles</div>
                ) : (
                  <div className="reserve-tables-multi-grid">
                    {eligibleTables.map((t) => {
                      const isSel = selectedTableIds.includes(t.id);
                      return (
                        <button
                          type="button"
                          key={t.id}
                          className={`reserve-table-chip ${isSel ? 'selected' : ''}`}
                          onClick={() => toggleTable(t.id)}
                          title={`${t.number} (${t.zone.toUpperCase()}) — Capacidad: ${t.capacity}`}
                        >
                          <span className="rtc-check">{isSel && <Check size={12} />}</span>
                          <span className="rtc-name">{t.number}</span>
                          <span className="rtc-meta">
                            {t.zone.toUpperCase()} · {t.capacity}p
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN 2: DATOS DEL CLIENTE */}
            <div className="reserve-section-card">
              <div className="section-card-title">
                <User size={14} />
                <span>2. Datos del Cliente / Titular</span>
              </div>

              <div className="form-group-row">
                <div className="form-group flex-2">
                  <label className="form-label">Nombre del Cliente o Grupo *</label>
                  <div className="input-with-icon">
                    <User size={15} className="input-inner-icon" />
                    <input
                      ref={customerInputRef}
                      type="text"
                      placeholder="Ej: Familia Morales, Dra. Gómez, Reunión Ejecutiva..."
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="form-input input-with-padding"
                      required
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </div>

                <div className="form-group flex-1">
                  <label className="form-label">Teléfono / WhatsApp</label>
                  <div className="input-with-icon">
                    <Phone size={15} className="input-inner-icon" />
                    <input
                      type="tel"
                      placeholder="Ej: 312 456 7890"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="form-input input-with-padding"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: FECHA, HORA Y COMENSALES */}
            <div className="reserve-section-card">
              <div className="section-card-title">
                <Clock size={14} />
                <span>3. Fecha, Hora & Comensales</span>
              </div>

              <div className="form-group-row">
                <div className="form-group flex-1">
                  <label className="form-label">Fecha de la Reserva *</label>
                  <div className="input-with-icon">
                    <Calendar size={15} className="input-inner-icon" />
                    <input
                      type="date"
                      value={reservationDate}
                      onChange={(e) => setReservationDate(e.target.value)}
                      className="form-input input-with-padding"
                      required
                    />
                  </div>
                </div>

                <div className="form-group flex-1">
                  <label className="form-label">Hora Estimada *</label>
                  <div className="input-with-icon">
                    <Clock size={15} className="input-inner-icon" />
                    <input
                      type="time"
                      value={reservationTime}
                      onChange={(e) => setReservationTime(e.target.value)}
                      className="form-input input-with-padding"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Atajos de hora rápida */}
              <div className="quick-time-chips">
                <span className="quick-time-label">Sugerir:</span>
                <button
                  type="button"
                  className="btn-quick-time"
                  onClick={() => setQuickTime(30)}
                >
                  En 30 min
                </button>
                <button
                  type="button"
                  className="btn-quick-time"
                  onClick={() => setQuickTime(60)}
                >
                  En 1 hora
                </button>
                <button
                  type="button"
                  className="btn-quick-time"
                  onClick={() => setReservationTime('19:00')}
                >
                  7:00 PM
                </button>
                <button
                  type="button"
                  className="btn-quick-time"
                  onClick={() => setReservationTime('20:00')}
                >
                  8:00 PM
                </button>
              </div>

              {/* Selector de Comensales */}
              <div className="form-group" style={{ marginTop: '0.65rem' }}>
                <div className="pax-control-header-row">
                  <label className="form-label">Número de Comensales (Pax)</label>
                  <div className="pax-stepper">
                    <button
                      type="button"
                      className="btn-pax-step"
                      onClick={() => setPax((p) => Math.max(1, p - 1))}
                      disabled={pax <= 1}
                      title="Menos comensales"
                    >
                      <Minus size={14} />
                    </button>
                    <div className="pax-count-box">
                      <span className="pax-num">{pax}</span>
                      <span className="pax-txt">pax</span>
                    </div>
                    <button
                      type="button"
                      className="btn-pax-step"
                      onClick={() => setPax((p) => Math.min(30, p + 1))}
                      title="Más comensales"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="pax-quick-selector">
                  {[1, 2, 3, 4, 5, 6, 8].map((p) => (
                    <button
                      type="button"
                      key={p}
                      className={`btn-cap-pill ${pax === p ? 'active' : ''}`}
                      onClick={() => setPax(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: NOTAS Y OCASIÓN ESPECIAL */}
            <div className="reserve-section-card">
              <div className="section-card-title">
                <FileText size={14} />
                <span>4. Notas / Ocasión Especial (Opcional)</span>
              </div>

              <div className="form-group">
                <input
                  type="text"
                  placeholder="Ej: Cumpleaños, traer pastel, mesa junto a la ventana, cliente VIP..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Footer de Acciones con diseño edge-to-edge y botones centrados */}
          <div className="modal-footer" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            {preSelectedTable?.status === 'reservada' && onCancelReservation && (
              <button
                type="button"
                className="btn-remove-reservation"
                onClick={() => onCancelReservation(preSelectedTable)}
                title="Quitar la reserva y dejar la mesa libre"
              >
                <Trash2 size={15} />
                <span>
                  {groupTableIds.length > 1 ? 'Quitar reserva (todas)' : 'Quitar reserva'}
                </span>
              </button>
            )}
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-confirm-reserve"
              disabled={selectedTableIds.length === 0 || !customerName.trim()}
            >
              <BookmarkCheck size={16} />
              <span>
                {preSelectedTable?.status === 'reservada'
                  ? 'Guardar Cambios de Reserva'
                  : selectedTableIds.length > 1
                  ? `Confirmar Reserva de ${selectedTableIds.length} Mesas`
                  : 'Confirmar Reserva de Mesa'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
