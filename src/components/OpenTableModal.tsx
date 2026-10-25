import React, { useState, useEffect } from 'react';
import { X, LayoutGrid, User, Users, CheckCircle, Coffee, Plus, Minus } from 'lucide-react';
import { Table } from '../types';

interface OpenTableModalProps {
  isOpen: boolean;
  tables: Table[];
  preSelectedTable?: Table | null;
  staffList: string[];
  currentStaff: string;
  onClose: () => void;
  onConfirmOpen: (tableId: string, patronName: string, waiter: string, pax: number) => void;
}

export const OpenTableModal: React.FC<OpenTableModalProps> = ({
  isOpen,
  tables,
  preSelectedTable,
  staffList,
  currentStaff,
  onClose,
  onConfirmOpen,
}) => {
  if (!isOpen) return null;

  const openableTables = tables.filter(
    (t) => t.status === 'libre' || t.id === preSelectedTable?.id
  );

  const [selectedTableId, setSelectedTableId] = useState<string>(
    preSelectedTable?.id || openableTables[0]?.id || ''
  );
  const [patronName, setPatronName] = useState(preSelectedTable?.reservationName || '');
  const [waiter, setWaiter] = useState(currentStaff || staffList[0]);
  const [pax, setPax] = useState<number>(
    preSelectedTable?.reservationPax || preSelectedTable?.capacity || 2
  );

  useEffect(() => {
    if (preSelectedTable) {
      setSelectedTableId(preSelectedTable.id);
      setPatronName(preSelectedTable.reservationName || '');
      setPax(preSelectedTable.reservationPax || preSelectedTable.capacity || 2);
    } else {
      const firstAvailable = tables.find((t) => t.status === 'libre');
      setSelectedTableId(firstAvailable?.id || '');
      setPatronName('');
      setPax(firstAvailable?.capacity || 2);
    }
  }, [preSelectedTable, isOpen]);

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTableId) {
      alert('Por favor selecciona una mesa disponible.');
      return;
    }
    onConfirmOpen(selectedTableId, patronName.trim() || 'Cliente en Sala', waiter, pax);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container open-table-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header open-table-modal-header">
          <div className="open-table-header-box">
            <div className="modal-header-icon-badge">
              <LayoutGrid size={18} />
            </div>
            <div className="open-table-title-col">
              <h2 className="modal-title">Abrir Mesa / Asignar Comanda</h2>
              <span className="modal-subtitle">
                Asigna el espacio y comensales para iniciar la atención.
              </span>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="open-table-wrapper">
          <div className="open-table-body">
            {/* SECCIÓN 1: ASIGNACIÓN DE MESA Y RESPONSABLE */}
            <div className="open-table-section-card">
              <div className="section-card-title">
                <div className="section-card-title-left">
                  <LayoutGrid size={14} />
                  <span>1. MESA & MESERO RESPONSABLE</span>
                </div>
                {selectedTable && (
                  <span className="table-zone-pill-mini">
                    {selectedTable.zone.toUpperCase()} • {selectedTable.capacity}p
                  </span>
                )}
              </div>

              <div className="open-table-grid-2col">
                <div className="form-group">
                  <label className="form-label" title="Mesa o Espacio">Mesa o Espacio *</label>
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
                      className="form-select select-table-highlight input-with-padding"
                      required
                    >
                      {openableTables.length === 0 ? (
                        <option value="">No hay mesas disponibles</option>
                      ) : (
                        openableTables.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.number} • {t.zone.toUpperCase()} ({t.capacity}p)
                            {t.status === 'reservada'
                              ? ` [RESERVADA: ${t.reservationName || 'Cliente'}]`
                              : ''}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" title="Atendido por">Atendido por *</label>
                  <div className="input-with-icon">
                    <Coffee size={15} className="input-inner-icon" />
                    <select
                      value={waiter}
                      onChange={(e) => setWaiter(e.target.value)}
                      className="form-select input-with-padding"
                      required
                    >
                      {staffList.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: DATOS DE LA COMANDA */}
            <div className="open-table-section-card">
              <div className="section-card-title">
                <div className="section-card-title-left">
                  <Users size={14} />
                  <span>2. DATOS DE LA COMANDA</span>
                </div>
                <span className="pax-live-summary">
                  {pax} {pax === 1 ? 'comensal' : 'comensales'}
                </span>
              </div>

              {/* Nombre del Cliente */}
              <div className="form-group">
                <div className="form-label-row">
                  <label className="form-label">Nombre del Cliente o Grupo</label>
                  <span className="form-label-hint">Opcional</span>
                </div>
                <div className="input-with-icon">
                  <User size={15} className="input-inner-icon" />
                  <input
                    type="text"
                    placeholder="Ej: Familia Morales, Pareja Terraza, Reunión..."
                    value={patronName}
                    onChange={(e) => setPatronName(e.target.value)}
                    className="form-input input-with-padding"
                    autoFocus
                  />
                </div>
              </div>

              {/* Comensales con Stepper alineado y Presets en cuadrícula 4x2 */}
              <div className="form-group">
                <div className="pax-control-header-row">
                  <label className="form-label">Comensales (Pax)</label>
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
                      <span className="pax-txt">PAX</span>
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
          </div>

          <div className="modal-footer open-table-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-confirm-open"
              disabled={!selectedTableId}
            >
              <CheckCircle size={16} />
              <span>Abrir Comanda & Empezar Pedido</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
