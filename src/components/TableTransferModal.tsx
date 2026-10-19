import React, { useState } from 'react';
import { X, ArrowRightLeft, Check, AlertCircle } from 'lucide-react';
import { Table } from '../types';

interface TableTransferModalProps {
  isOpen: boolean;
  originTable: Table | null;
  tables: Table[];
  onClose: () => void;
  onConfirmTransfer: (originId: string, destinationId: string) => void;
}

export const TableTransferModal: React.FC<TableTransferModalProps> = ({
  isOpen,
  originTable,
  tables,
  onClose,
  onConfirmTransfer,
}) => {
  if (!isOpen || !originTable) return null;

  const availableTables = tables.filter(
    (t) => t.id !== originTable.id && t.status === 'libre'
  );

  const [destinationId, setDestinationId] = useState<string>(
    availableTables[0]?.id || ''
  );

  const handleConfirm = () => {
    if (!destinationId) {
      alert('Por favor selecciona una mesa de destino libre.');
      return;
    }
    onConfirmTransfer(originTable.id, destinationId);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container transfer-table-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="transfer-header-box">
            <ArrowRightLeft size={22} className="modal-icon-header" />
            <div>
              <h2 className="modal-title">Trasladar Cuenta de Mesa</h2>
              <span className="modal-subtitle">
                Mueve todo el consumo de <strong>{originTable.number}</strong> a otro espacio.
              </span>
            </div>
          </div>
          <button type="button" className="btn-icon-subtle" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="transfer-modal-body">
          <div className="transfer-diagram">
            <div className="diagram-box origin">
              <span className="diagram-lbl">Mesa Origen:</span>
              <strong className="diagram-name">{originTable.number}</strong>
              <span className="diagram-items">{originTable.items.length} productos</span>
            </div>

            <ArrowRightLeft size={24} className="diagram-arrow" />

            <div className="diagram-box destination">
              <span className="diagram-lbl">Mesa Destino:</span>
              <select
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                className="select-dest-table"
              >
                {availableTables.length === 0 ? (
                  <option value="">No hay mesas libres</option>
                ) : (
                  availableTables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.number} ({t.zone.toUpperCase()}) — {t.capacity} pax
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {availableTables.length === 0 && (
            <div className="alert-no-tables">
              <AlertCircle size={16} />
              <span>No hay mesas libres disponibles en ninguna zona en este momento.</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-confirm-transfer"
            onClick={handleConfirm}
            disabled={!destinationId}
          >
            <Check size={16} />
            <span>Confirmar Traslado</span>
          </button>
        </div>
      </div>
    </div>
  );
};
