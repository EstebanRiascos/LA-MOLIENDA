import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Edit2,
  Users,
  CheckCircle,
  CheckCircle2,
  LayoutGrid,
  MapPin,
  Sliders,
  Eye,
} from 'lucide-react';
import { Table, TableZone } from '../types';

interface TableFormModalProps {
  isOpen: boolean;
  table: Table | null;
  existingTables: Table[];
  onClose: () => void;
  onSave: (data: { id?: string; number: string; zone: TableZone; capacity: number }) => void;
}

export const TableFormModal: React.FC<TableFormModalProps> = ({
  isOpen,
  table,
  existingTables,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(table);

  const [number, setNumber] = useState('');
  const [zone, setZone] = useState<TableZone>('salon');
  const [capacity, setCapacity] = useState<number>(4);
  const [error, setError] = useState<string | null>(null);

  // Initialize form
  useEffect(() => {
    if (table) {
      setNumber(table.number);
      setZone(table.zone);
      setCapacity(table.capacity);
      setError(null);
    } else {
      // Suggest automatic name based on default zone
      generateNextNumber('salon');
      setZone('salon');
      setCapacity(4);
      setError(null);
    }
  }, [table, isOpen]);

  const generateNextNumber = (targetZone: TableZone) => {
    const zoneTables = existingTables.filter((t) => t.zone === targetZone);
    let prefix = 'Mesa';
    let nextNum = zoneTables.length + 1;

    if (targetZone === 'salon') {
      prefix = 'Mesa';
      const padded = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
      setNumber(`${prefix} ${padded}`);
    } else if (targetZone === 'terraza') {
      prefix = 'Terraza T';
      setNumber(`${prefix}${nextNum}`);
    } else if (targetZone === 'barra') {
      prefix = 'Barra B';
      setNumber(`${prefix}${nextNum}`);
    } else if (targetZone === 'takeaway') {
      prefix = 'Llevar TK';
      setNumber(`${prefix}${nextNum}`);
    }
  };

  const handleZoneChange = (newZone: TableZone) => {
    setZone(newZone);
    if (!isEditing) {
      generateNextNumber(newZone);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = number.trim();

    if (!cleanNumber) {
      setError('El nombre o número del espacio es obligatorio.');
      return;
    }

    // Check duplicate name
    const isDuplicate = existingTables.some(
      (t) =>
        t.number.toLowerCase() === cleanNumber.toLowerCase() &&
        (!isEditing || t.id !== table?.id)
    );

    if (isDuplicate) {
      setError(`Ya existe una mesa o barra con el nombre "${cleanNumber}".`);
      return;
    }

    if (capacity <= 0 || isNaN(capacity)) {
      setError('La capacidad debe ser de al menos 1 comensal.');
      return;
    }

    onSave({
      id: table?.id,
      number: cleanNumber,
      zone,
      capacity,
    });
  };

  const ZONE_OPTIONS: { id: TableZone; label: string; icon: string; desc: string }[] = [
    {
      id: 'salon',
      label: 'Salón Principal',
      icon: '☕',
      desc: 'Mesas interiores climatizadas',
    },
    {
      id: 'terraza',
      label: 'Terraza Exterior',
      icon: '🌿',
      desc: 'Mesas al aire libre y parasoles',
    },
    {
      id: 'barra',
      label: 'Barra',
      icon: '🍸',
      desc: 'Puestos de barista y coctelería',
    },
    {
      id: 'takeaway',
      label: 'Para Llevar (Takeaway)',
      icon: '🛍️',
      desc: 'Pedidos de mostrador y delivery',
    },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container table-form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="table-form-header-title">
            <div className="modal-icon-badge">
              {isEditing ? <Edit2 size={20} /> : <Plus size={20} />}
            </div>
            <div>
              <h2 className="modal-title">
                {isEditing ? `Editar ${table?.number}` : 'Crear Nueva Mesa o Barra'}
              </h2>
              <span className="modal-subtitle">
                {isEditing
                  ? 'Modifica el nombre, zona de servicio o capacidad de este espacio.'
                  : 'Configura un nuevo espacio físico o punto de atención para comensales.'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="table-form-wrapper">
          <div className="table-form-body">
          {error && <div className="form-error-banner">{error}</div>}

          {/* SECCIÓN 1: ZONA O UBICACIÓN */}
          <div className="table-form-section-card">
            <div className="section-card-title">
              <MapPin size={14} />
              <span>1. Zona o Ubicación del Espacio</span>
            </div>

            <div className="zone-selector-grid">
              {ZONE_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  className={`zone-choice-card ${zone === opt.id ? 'active' : ''}`}
                  onClick={() => handleZoneChange(opt.id)}
                >
                  <span className="zone-choice-icon">{opt.icon}</span>
                  <div className="zone-choice-texts">
                    <span className="zone-choice-name">{opt.label}</span>
                    <span className="zone-choice-desc">{opt.desc}</span>
                  </div>
                  {zone === opt.id && (
                    <CheckCircle2 size={16} className="zone-check-icon" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* SECCIÓN 2: IDENTIFICACIÓN Y CAPACIDAD */}
          <div className="table-form-section-card">
            <div className="section-card-title">
              <Sliders size={14} />
              <span>2. Datos & Capacidad del Espacio</span>
            </div>

            <div className="form-row-two-col">
              {/* Columna Nombre */}
              <div className="form-group flex-1">
                <label className="form-label">Nombre o Número del Espacio *</label>
                <div className="input-with-icon">
                  <LayoutGrid size={15} className="input-inner-icon" />
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => {
                      setNumber(e.target.value);
                      setError(null);
                    }}
                    placeholder="Ej: Mesa 11, Barra 02..."
                    className="form-input input-with-padding"
                    autoFocus
                    required
                  />
                </div>
                <span className="form-hint">
                  Identificador visual único que verán los baristas y meseros.
                </span>
              </div>

              {/* Columna Capacidad */}
              <div className="form-group flex-1">
                <label className="form-label">Capacidad de Comensales *</label>
                <div className="table-capacity-control-box">
                  <div className="capacity-stepper">
                    <button
                      type="button"
                      className="btn-pax-step"
                      onClick={() => setCapacity((c) => Math.max(1, c - 1))}
                      disabled={capacity <= 1}
                      title="Disminuir capacidad"
                    >
                      <Minus size={14} />
                    </button>
                    <div className="pax-count-box">
                      <span className="pax-num">{capacity}</span>
                      <span className="pax-txt">{capacity === 1 ? 'persona' : 'personas'}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-pax-step"
                      onClick={() => setCapacity((c) => Math.min(30, c + 1))}
                      title="Aumentar capacidad"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Atajos integrados en la columna de capacidad */}
                  <div className="pax-quick-selector">
                    {[1, 2, 4, 6, 8, 10].map((p) => (
                      <button
                        type="button"
                        key={p}
                        className={`btn-cap-pill ${capacity === p ? 'active' : ''}`}
                        onClick={() => setCapacity(p)}
                      >
                        {p} pax
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: VISTA PREVIA COMPACTA EN SALA */}
          <div className="table-live-preview-compact">
            <div className="preview-compact-header">
              <Eye size={13} />
              <span>Vista Previa en Sala:</span>
            </div>

            <div className="preview-compact-card">
              <div className="preview-compact-left">
                <div className="preview-name-row">
                  <span className="preview-table-name">{number || 'Nombre del Espacio'}</span>
                  <span className="preview-zone-tag">
                    {ZONE_OPTIONS.find((z) => z.id === zone)?.icon}{' '}
                    {ZONE_OPTIONS.find((z) => z.id === zone)?.label}
                  </span>
                </div>
                <span className="preview-subtext">Mesa disponible para recibir clientes</span>
              </div>

              <div className="preview-compact-right">
                <span className="preview-capacity-badge">
                  <Users size={13} /> {capacity} {capacity === 1 ? 'persona' : 'personas'}
                </span>
                <span className="status-badge status-free">
                  <CheckCircle2 size={12} /> Libre
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-confirm-open">
              <CheckCircle size={16} />
              <span>{isEditing ? 'Guardar Cambios' : 'Crear Espacio'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
