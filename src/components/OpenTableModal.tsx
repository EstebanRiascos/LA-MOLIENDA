import React, { useState } from 'react';
import { X, LayoutGrid, User, Users, CheckCircle } from 'lucide-react';
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
            <LayoutGrid size={22} className="modal-icon-header" />
            <div>
              <h2 className="modal-title">Abrir Mesa / Asignar Comanda</h2>
              <span className="modal-subtitle">
                Registra la llegada de nuevos comensales para iniciar la toma de pedidos.
              </span>
            </div>
          </div>
          <button type="button" className="btn-icon-subtle" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="open-table-form">
          <div className="form-group">
            <label className="form-label">Seleccionar Mesa o Espacio *</label>
            <select
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(e.target.value)}
              className="form-select select-table-highlight"
              required
            >
              {freeTables.length === 0 ? (
                <option value="">No hay mesas libres en este momento</option>
              ) : (
                freeTables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.number} ({t.zone.toUpperCase()}) — Capacidad: {t.capacity} personas
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="form-group-row">
            <div className="form-group flex-2">
              <label className="form-label">Nombre del Cliente o Grupo</label>
              <div className="input-with-icon">
                <User size={15} className="input-inner-icon" />
                <input
                  type="text"
                  placeholder="Ej: Familia Morales, Pareja Terraza..."
                  value={patronName}
                  onChange={(e) => setPatronName(e.target.value)}
                  className="form-input"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group flex-1">
              <label className="form-label">Comensales (Pax)</label>
              <div className="input-with-icon">
                <Users size={15} className="input-inner-icon" />
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={pax}
                  onChange={(e) => setPax(parseInt(e.target.value, 10) || 1)}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Atendido por (Barista / Mesero) *</label>
            <select
              value={waiter}
              onChange={(e) => setWaiter(e.target.value)}
              className="form-select"
              required
            >
              {staffList.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
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
