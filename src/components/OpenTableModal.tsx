import React, { useState } from 'react';
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

  const freeTables = tables.filter((t) => t.status === 'libre');

  const [selectedTableId, setSelectedTableId] = useState<string>(
    preSelectedTable?.id || freeTables[0]?.id || ''
  );
  const [patronName, setPatronName] = useState('');
  const [waiter, setWaiter] = useState(currentStaff || staffList[0]);
  const [pax, setPax] = useState<number>(preSelectedTable?.capacity || 2);

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
        <div className="modal-header">
          <div className="open-table-header-box">
            <div className="modal-header-icon-badge">
              <LayoutGrid size={20} />
            </div>
            <div>
              <h2 className="modal-title">Abrir Mesa / Asignar Comanda</h2>
              <span className="modal-subtitle">
                Registra la llegada de nuevos comensales para iniciar la toma de pedidos.
              </span>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="open-table-wrapper">
          <div className="open-table-body">
            {/* SECCIÓN 1: ASIGNACIÓN DE MESA Y SERVICIO */}
          <div className="open-table-section-card">
            <div className="section-card-header">
              <div className="section-card-title">
                <LayoutGrid size={14} />
                <span>1. Mesa & Responsable</span>
              </div>
              {selectedTable && (
                <span className="table-zone-pill">
                  {selectedTable.zone.toUpperCase()} • Capacidad: {selectedTable.capacity}p
                </span>
              )}
            </div>

            <div className="form-group-row">
              <div className="form-group flex-1">
                <label className="form-label">Mesa o Espacio *</label>
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
                    {freeTables.length === 0 ? (
                      <option value="">No hay mesas libres</option>
                    ) : (
                      freeTables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.number} ({t.zone.toUpperCase()}) — {t.capacity}p
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="form-group flex-1">
                <label className="form-label">Atendido por *</label>
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

          {/* SECCIÓN 2: DATOS DEL CLIENTE Y COMENSALES */}
          <div className="open-table-section-card">
            <div className="section-card-title">
              <Users size={14} />
              <span>2. Datos de la Comanda</span>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre del Cliente o Grupo (Opcional)</label>
              <div className="input-with-icon">
                <User size={15} className="input-inner-icon" />
                <input
                  type="text"
                  placeholder="Ej: Familia Morales, Pareja Terraza, Reunión..."
                  value={patronName}
                  onChange={(e) => setPatronName(e.target.value)}
                  className="form-input"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Comensales (Pax)</label>
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
        </div>

        <div className="modal-footer">
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
