import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Table } from '../types';

interface ReserveTableModalProps {
  isOpen: boolean;
  tables: Table[];
  preSelectedTable?: Table | null;
  onClose: () => void;
  onConfirmReserve: (
    tableId: string,
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
  onConfirmReserve,
}) => {
  if (!isOpen) return null;

  // Filtrar mesas elegibles: Libres (o la mesa actualmente preseleccionada si ya estaba reservada y se está editando)
  const eligibleTables = tables.filter(
    (t) => t.status === 'libre' || t.id === preSelectedTable?.id
  );

  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [reservationDate, setReservationDate] = useState<string>('');
  const [reservationTime, setReservationTime] = useState<string>('');
  const [pax, setPax] = useState<number>(2);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Inicializar estado según preSelectedTable o defaults
  useEffect(() => {
    // Fecha de hoy por defecto en formato YYYY-MM-DD
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Hora sugerida: siguiente hora en punto
    const currentHour = today.getHours();
    const nextHour = (currentHour + 1) % 24;
    const defaultTimeStr = `${String(nextHour).padStart(2, '0')}:00`;

    if (preSelectedTable) {
      setSelectedTableId(preSelectedTable.id);
      setPax(preSelectedTable.reservationPax || preSelectedTable.capacity || 2);
      setCustomerName(preSelectedTable.reservationName || '');
      setCustomerPhone(preSelectedTable.reservationPhone || '');
      setReservationDate(preSelectedTable.reservationDate || todayStr);
      setReservationTime(preSelectedTable.reservationTime || defaultTimeStr);
      setNotes(preSelectedTable.reservationNotes || '');
    } else {
      const firstFree = eligibleTables[0];
      setSelectedTableId(firstFree?.id || '');
      setPax(firstFree?.capacity || 2);
      setCustomerName('');
      setCustomerPhone('');
      setReservationDate(todayStr);
      setReservationTime(defaultTimeStr);
      setNotes('');
    }
    setError('');
  }, [preSelectedTable, isOpen]);

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTableId) {
      setError('Por favor selecciona una mesa o espacio.');
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

    onConfirmReserve(selectedTableId, {
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
                  <span>1. Mesa o Espacio a Reservar</span>
                </div>
                {selectedTable && (
                  <span className="table-zone-pill">
                    {selectedTable.zone.toUpperCase()} • Cap: {selectedTable.capacity}p
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Mesa o Barra *</label>
                <div className="input-with-icon">
                  <LayoutGrid size={15} className="input-inner-icon" />
                  <select
                    value={selectedTableId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedTableId(newId);
                      const found = tables.find((t) => t.id === newId);
                      if (found) setPax(found.capacity);
                    }}
                    className="form-select input-with-padding select-table-highlight"
                    required
                  >
                    {eligibleTables.length === 0 ? (
                      <option value="">No hay mesas libres disponibles</option>
                    ) : (
                      eligibleTables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.number} ({t.zone.toUpperCase()}) — Capacidad: {t.capacity} comensales
                        </option>
                      ))
                    )}
                  </select>
                </div>
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
                      type="text"
                      placeholder="Ej: Familia Morales, Dra. Gómez, Reunión Ejecutiva..."
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="form-input input-with-padding"
                      required
                      autoFocus
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
                <label className="form-label">Número de Comensales (Pax)</label>
                <div className="pax-control-grid">
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

                  <div className="pax-quick-selector">
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((p) => (
                      <button
                        type="button"
                        key={p}
                        className={`btn-cap-pill ${pax === p ? 'active' : ''}`}
                        onClick={() => setPax(p)}
                      >
                        {p} pax
                      </button>
                    ))}
                  </div>
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
          <div className="modal-footer" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-confirm-reserve"
              disabled={!selectedTableId || !customerName.trim()}
            >
              <BookmarkCheck size={16} />
              <span>
                {preSelectedTable?.status === 'reservada'
                  ? 'Guardar Cambios de Reserva'
                  : 'Confirmar Reserva de Mesa'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
