import React, { useState } from 'react';
import { X, Divide, Users, Check, Copy } from 'lucide-react';
import { Table } from '../types';
import { formatCurrency } from '../utils/storage';

interface SplitBillModalProps {
  isOpen: boolean;
  table: Table | null;
  onClose: () => void;
  onShowNotification: (msg: string) => void;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({
  isOpen,
  table,
  onClose,
  onShowNotification,
}) => {
  if (!isOpen || !table) return null;

  const [numPeople, setNumPeople] = useState<number>(table.capacity || 2);
  const [includeTip, setIncludeTip] = useState(true);

  const subtotal = table.subtotal;
  const tipAmount = includeTip ? Math.round(subtotal * 0.1) : 0;
  const grandTotal = subtotal + tipAmount;

  const subtotalPerPerson = numPeople > 0 ? Math.round(subtotal / numPeople) : 0;
  const tipPerPerson = numPeople > 0 ? Math.round(tipAmount / numPeople) : 0;
  const totalPerPerson = numPeople > 0 ? Math.round(grandTotal / numPeople) : 0;

  const handleCopyBreakdown = () => {
    const text = `La Molienda - ${table.number}
Total cuenta: ${formatCurrency(grandTotal)}
Dividido entre: ${numPeople} personas
Monto por persona: ${formatCurrency(totalPerPerson)} (Consumo: ${formatCurrency(
      subtotalPerPerson
    )} + Propina: ${formatCurrency(tipPerPerson)})`;

    navigator.clipboard.writeText(text);
    onShowNotification('Cálculo de división copiado al portapapeles.');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container split-bill-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="split-header-box">
            <Divide size={22} className="modal-icon-header" />
            <div>
              <h2 className="modal-title">Dividir Cuenta — {table.number}</h2>
              <span className="modal-subtitle">
                Cálculo equitativo del valor a pagar por cada comensal.
              </span>
            </div>
          </div>
          <button type="button" className="btn-icon-subtle" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="split-modal-body">
          {/* Total Account Summary */}
          <div className="split-total-banner">
            <div>
              <span className="split-banner-lbl">Total Actual de la Cuenta:</span>
              <span className="split-banner-val">{formatCurrency(grandTotal)}</span>
            </div>
            <label className="split-tip-toggle">
              <input
                type="checkbox"
                checked={includeTip}
                onChange={(e) => setIncludeTip(e.target.checked)}
              />
              <span>Incluir 10% Propina</span>
            </label>
          </div>

          {/* Number of People Buttons */}
          <div className="split-people-selection">
            <label className="form-label">Dividir entre cuántas personas:</label>
            <div className="people-buttons-grid">
              {[2, 3, 4, 5, 6, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`btn-people-num ${numPeople === n ? 'active' : ''}`}
                  onClick={() => setNumPeople(n)}
                >
                  <Users size={15} />
                  <span>{n} personas</span>
                </button>
              ))}
            </div>

            <div className="custom-people-input-row">
              <span className="form-label-mini">O cantidad personalizada:</span>
              <input
                type="number"
                min="1"
                max="30"
                value={numPeople}
                onChange={(e) => setNumPeople(parseInt(e.target.value, 10) || 1)}
                className="input-custom-people"
              />
            </div>
          </div>

          {/* Result Card per Person */}
          <div className="split-result-card">
            <span className="result-card-title">CADA PERSONA DEBE PAGAR:</span>
            <span className="result-per-person-amount">
              {formatCurrency(totalPerPerson)}
            </span>
            <div className="result-details-row">
              <span>Consumo: {formatCurrency(subtotalPerPerson)}</span>
              {includeTip && <span>• Propina sugerida: {formatCurrency(tipPerPerson)}</span>}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="btn-copy-split"
            onClick={handleCopyBreakdown}
          >
            <Copy size={15} />
            <span>Copiar para WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
