import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Layers,
  Compass,
  RotateCw,
  Plus,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Edit3,
  Check,
  Move,
  Coffee,
  Wine,
  Beer,
  Clock,
  Users,
  Receipt,
  CreditCard,
  ArrowRight,
  Sparkles,
  Sliders,
  X,
  Sun,
  Moon,
  Tag,
  Eye,
  EyeOff,
  Armchair,
  CornerDownRight,
  ChevronRight,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { Table, Product, TableZone } from '../types';
import { formatCurrency } from '../utils/storage';
import { DEFAULT_TABLES } from '../utils/defaults';

interface FloorPlan3DViewProps {
  tables: Table[];
  products: Product[];
  onSelectTable: (table: Table) => void;
  onOpenTable: (table: Table) => void;
  onPreBill: (table: Table) => void;
  onCheckout: (table: Table) => void;
  onTransferTable: (table: Table) => void;
  onOpenNewTableForm: () => void;
  onEditTableForm: (table: Table) => void;
  onDeleteTable: (table: Table) => void;
  onUpdateTables: (tables: Table[]) => void;
}

type CameraPreset = 'isometric' | 'salon' | 'bars' | 'cad2d';

export const FloorPlan3DView: React.FC<FloorPlan3DViewProps> = ({
  tables,
  products,
  onSelectTable,
  onOpenTable,
  onPreBill,
  onCheckout,
  onTransferTable,
  onOpenNewTableForm,
  onEditTableForm,
  onDeleteTable,
  onUpdateTables,
}) => {
  // Camera & view states
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [activePreset, setActivePreset] = useState<CameraPreset>('isometric');
  const [tiltAngle, setTiltAngle] = useState<number>(50); // Grados de inclinación X
  const [rotationAngle, setRotationAngle] = useState<number>(-22); // Grados de rotación Z
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Ambiance and layer toggles
  const [lightingMode, setLightingMode] = useState<'night' | 'day'>('night');
  const [showZoneLabels, setShowZoneLabels] = useState<boolean>(true);
  const [showChairs, setShowChairs] = useState<boolean>(true);
  const [showMeasurements, setShowMeasurements] = useState<boolean>(true);

  // Edit & Selection states
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);

  // Dragging table state (Edit mode)
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [initialTablePos, setInitialTablePos] = useState<{ posX: number; posY: number } | null>(null);

  // Orbit camera dragging state (3D view)
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const [orbitStartPos, setOrbitStartPos] = useState<{ x: number; y: number } | null>(null);
  const [orbitStartAngles, setOrbitStartAngles] = useState<{ tilt: number; rot: number } | null>(null);

  const planRef = useRef<HTMLDivElement>(null);
  const viewportWrapperRef = useRef<HTMLDivElement>(null);

  const selectedTable = tables.find((t) => t.id === selectedTableId) || null;

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 1.9));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(Number((prev - 0.15).toFixed(2)), 0.65));

  // Camera presets
  const applyCameraPreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    if (preset === 'cad2d') {
      setIs3DMode(false);
      setTiltAngle(0);
      setRotationAngle(0);
      setZoomLevel(1);
    } else {
      setIs3DMode(true);
      if (preset === 'isometric') {
        setTiltAngle(50);
        setRotationAngle(-22);
        setZoomLevel(1);
      } else if (preset === 'salon') {
        setTiltAngle(44);
        setRotationAngle(18);
        setZoomLevel(1.1);
      } else if (preset === 'bars') {
        setTiltAngle(56);
        setRotationAngle(-52);
        setZoomLevel(1.15);
      }
    }
  };

  const handleResetView = () => {
    applyCameraPreset('isometric');
  };

  // Restablecer a distribución original del plano PDF
  const handleResetToBlueprint = () => {
    if (window.confirm('¿Deseas restablecer la posición de todas las mesas a la distribución original del plano de La Molienda?')) {
      const reset = tables.map((t) => {
        const defaultMatch = DEFAULT_TABLES.find((d) => d.id === t.id);
        if (defaultMatch && defaultMatch.posX !== undefined && defaultMatch.posY !== undefined) {
          return {
            ...t,
            posX: defaultMatch.posX,
            posY: defaultMatch.posY,
            rotation: defaultMatch.rotation ?? 45,
            shape: defaultMatch.shape ?? 'square',
          };
        }
        return t;
      });
      onUpdateTables(reset);
    }
  };

  // Rotar mesa en modo edición
  const handleRotateTable = (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = tables.map((t) => {
      if (t.id === tableId) {
        const currentRot = t.rotation || 0;
        const newRot = (currentRot + 45) % 360;
        return { ...t, rotation: newRot };
      }
      return t;
    });
    onUpdateTables(updated);
  };

  // -------------------------------------------------------------
  // MOUSE ORBIT INTERACTION (Rotate 3D scene smoothly with mouse)
  // -------------------------------------------------------------
  const handleMouseDownViewport = (e: React.MouseEvent) => {
    // Solo orbitar si no se está arrastrando una mesa y no es click secundario
    if (isEditMode || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.floorplan-3d-table') || target.closest('.floorplan-table-hud') || target.closest('button')) {
      return;
    }

    setIsOrbiting(true);
    setOrbitStartPos({ x: e.clientX, y: e.clientY });
    setOrbitStartAngles({ tilt: tiltAngle, rot: rotationAngle });
  };

  const handleWheelViewport = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // -------------------------------------------------------------
  // DRAG AND DROP TABLES (Edit mode)
  // -------------------------------------------------------------
  const handleMouseDownTable = (table: Table, e: React.MouseEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggingTableId(table.id);
    setSelectedTableId(table.id);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setInitialTablePos({
      posX: table.posX ?? 50,
      posY: table.posY ?? 50,
    });
  };

  // Global mousemove handler for both orbiting and table dragging
  useEffect(() => {
    const onWindowMouseMove = (e: MouseEvent) => {
      // 1. Orbiting scene
      if (isOrbiting && orbitStartPos && orbitStartAngles && is3DMode) {
        const deltaX = e.clientX - orbitStartPos.x;
        const deltaY = e.clientY - orbitStartPos.y;

        const newRot = Math.round(orbitStartAngles.rot + deltaX * 0.45);
        const newTilt = Math.round(Math.max(12, Math.min(78, orbitStartAngles.tilt - deltaY * 0.35)));

        setRotationAngle(newRot);
        setTiltAngle(newTilt);
        return;
      }

      // 2. Dragging table
      if (draggingTableId && dragStartPos && initialTablePos && planRef.current) {
        const rect = planRef.current.getBoundingClientRect();
        const deltaXPixels = e.clientX - dragStartPos.x;
        const deltaYPixels = e.clientY - dragStartPos.y;

        const scaleCompensation = 1 / zoomLevel;
        const deltaXPercent = (deltaXPixels / rect.width) * 100 * scaleCompensation;
        const deltaYPercent = (deltaYPixels / rect.height) * 100 * scaleCompensation;

        let newPosX = Math.round(initialTablePos.posX + deltaXPercent);
        let newPosY = Math.round(initialTablePos.posY + deltaYPercent);

        newPosX = Math.max(5, Math.min(95, newPosX));
        newPosY = Math.max(10, Math.min(90, newPosY));

        const updated = tables.map((t) =>
          t.id === draggingTableId
            ? {
                ...t,
                posX: newPosX,
                posY: newPosY,
              }
            : t
        );
        onUpdateTables(updated);
      }
    };

    const onWindowMouseUp = () => {
      if (isOrbiting) {
        setIsOrbiting(false);
        setOrbitStartPos(null);
        setOrbitStartAngles(null);
      }
      if (draggingTableId) {
        setDraggingTableId(null);
        setDragStartPos(null);
        setInitialTablePos(null);
      }
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [
    isOrbiting,
    orbitStartPos,
    orbitStartAngles,
    is3DMode,
    draggingTableId,
    dragStartPos,
    initialTablePos,
    zoomLevel,
    tables,
    onUpdateTables,
  ]);

  // Elapsed time formatter
  const getElapsedTime = (openedAt?: string) => {
    if (!openedAt) return null;
    const diffMs = Date.now() - new Date(openedAt).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Metrics
  const freeCount = tables.filter((t) => t.status === 'libre').length;
  const occupiedCount = tables.filter((t) => t.status === 'ocupada').length;
  const prebillCount = tables.filter((t) => t.status === 'por_cobrar').length;
  const totalSalonSales = tables.reduce((sum, t) => sum + (t.total || 0), 0);
  const totalCapacity = tables.reduce((sum, t) => sum + (t.capacity || 0), 0);

  return (
    <div className={`floorplan-view-container ${lightingMode}-mode`}>
      {/* ======================================================== */}
      {/* 1. TOP ARCHITECTURAL CONTROL BAR                         */}
      {/* ======================================================== */}
      <div className="floorplan-toolbar">
        {/* Left: Camera Angle Presets */}
        <div className="toolbar-btn-group camera-presets">
          <button
            type="button"
            className={`floorplan-tab-btn ${is3DMode && activePreset === 'isometric' ? 'active' : ''}`}
            onClick={() => applyCameraPreset('isometric')}
            title="Vista isométrica general completa (3D)"
          >
            <Compass size={15} />
            <span>Isométrica 3D</span>
          </button>

          <button
            type="button"
            className={`floorplan-tab-btn ${is3DMode && activePreset === 'salon' ? 'active' : ''}`}
            onClick={() => applyCameraPreset('salon')}
            title="Enfoque en mesas del salón y escenario"
          >
            <Coffee size={14} />
            <span>Salón & Tarima</span>
          </button>

          <button
            type="button"
            className={`floorplan-tab-btn ${is3DMode && activePreset === 'bars' ? 'active' : ''}`}
            onClick={() => applyCameraPreset('bars')}
            title="Enfoque en las barras de cerveza, vino y café"
          >
            <Wine size={14} />
            <span>Barras & Cocina</span>
          </button>

          <button
            type="button"
            className={`floorplan-tab-btn ${!is3DMode ? 'active' : ''}`}
            onClick={() => applyCameraPreset('cad2d')}
            title="Vista cenital plana tipo plano técnico CAD 2D"
          >
            <Layers size={14} />
            <span>Plano 2D CAD</span>
          </button>
        </div>

        {/* Center: Lighting & Visual Layer Toggles */}
        <div className="toolbar-center-toggles">
          {/* Day / Night Mood Toggle */}
          <button
            type="button"
            className={`toolbar-toggle-pill ${lightingMode === 'night' ? 'pill-active' : ''}`}
            onClick={() => setLightingMode(lightingMode === 'night' ? 'day' : 'night')}
            title={lightingMode === 'night' ? 'Cambiar a iluminación de día' : 'Cambiar a iluminación nocturna Café-Bar'}
          >
            {lightingMode === 'night' ? <Moon size={14} className="text-amber" /> : <Sun size={14} className="text-amber" />}
            <span>{lightingMode === 'night' ? 'Noche Café-Bar' : 'Luz de Día'}</span>
          </button>

          {/* Zone Labels Toggle */}
          <button
            type="button"
            className={`toolbar-toggle-pill ${showZoneLabels ? 'pill-active' : ''}`}
            onClick={() => setShowZoneLabels(!showZoneLabels)}
            title="Mostrar u ocultar nombres de áreas y barras"
          >
            <Tag size={13} />
            <span>Zonas</span>
          </button>

          {/* Chairs Toggle */}
          <button
            type="button"
            className={`toolbar-toggle-pill ${showChairs ? 'pill-active' : ''}`}
            onClick={() => setShowChairs(!showChairs)}
            title="Mostrar u ocultar sillas 3D"
          >
            <Armchair size={13} />
            <span>Sillas</span>
          </button>
        </div>

        {/* Right: Edit Mode, Zoom, and Actions */}
        <div className="toolbar-actions-right">
          {/* Edit mode toggle */}
          <button
            type="button"
            className={`floorplan-mode-btn ${isEditMode ? 'edit-active' : ''}`}
            onClick={() => {
              setIsEditMode(!isEditMode);
              if (isEditMode) setSelectedTableId(null);
            }}
          >
            {isEditMode ? <Check size={15} /> : <Move size={14} />}
            <span>{isEditMode ? 'Listo' : 'Editar & Mover'}</span>
          </button>

          {/* Zoom controls */}
          <div className="zoom-btn-group">
            <button
              type="button"
              className="zoom-btn"
              onClick={handleZoomOut}
              title="Alejar vista"
            >
              <ZoomOut size={14} />
            </button>
            <span className="zoom-label">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              className="zoom-btn"
              onClick={handleZoomIn}
              title="Acercar vista"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              className="zoom-btn"
              onClick={handleResetView}
              title="Restablecer ángulo y zoom"
            >
              <Maximize2 size={13} />
            </button>
          </div>

          {/* Reset to blueprint */}
          <button
            type="button"
            className="btn-blueprint-reset"
            onClick={handleResetToBlueprint}
            title="Restablecer todas las mesas a las coordenadas del plano original PDF"
          >
            <RefreshCw size={13} />
            <span>Plano Original</span>
          </button>

          {/* Add Table Button */}
          <button
            type="button"
            className="btn-add-table-action"
            onClick={onOpenNewTableForm}
          >
            <Plus size={15} strokeWidth={2.6} />
            <span>Nueva Mesa</span>
          </button>
        </div>
      </div>

      {/* Orbit Tip Banner when in 3D */}
      {is3DMode && !isEditMode && (
        <div className="floorplan-orbit-hint animate-fade-in">
          <Compass size={13} className="orbit-icon" />
          <span>Haz clic y arrastra con el mouse para girar el plano libremente en 3D. Usa la rueda para hacer zoom.</span>
        </div>
      )}

      {/* Edit Mode Instruction Banner */}
      {isEditMode && (
        <div className="floorplan-orbit-hint edit-banner animate-fade-in">
          <Sparkles size={14} className="orbit-icon text-amber" />
          <span>Modo Edición activo: Arrastra las mesas para reubicarlas. Haz clic en el ícono de giro para rotar 45°.</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MAIN 3D ARCHITECTURAL VIEWPORT                        */}
      {/* ======================================================== */}
      <div
        ref={viewportWrapperRef}
        className={`floorplan-viewport-wrapper ${isOrbiting ? 'is-orbiting' : ''}`}
        onMouseDown={handleMouseDownViewport}
        onWheel={handleWheelViewport}
      >
        {/* Ambient Stage Glows / Spotlights */}
        <div className="stage-lighting-cone" />
        <div className="bar-lighting-cone" />

        <div
          className={`floorplan-viewport ${is3DMode ? 'is-3d' : 'is-2d'}`}
          style={{
            transform: is3DMode
              ? `scale(${zoomLevel}) perspective(1400px) rotateX(${tiltAngle}deg) rotateZ(${rotationAngle}deg)`
              : `scale(${zoomLevel})`,
            transition: isOrbiting || draggingTableId ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* THE ARCHITECTURAL 3D DIORAMA CARD */}
          <div ref={planRef} className="architectural-floor-card">
            {/* Soft architectural floor parquet texture */}
            <div className="floor-texture-grid" />

            {/* SVG ARCHITECTURAL & 3D EXTRUSION BLUEPRINT */}
            <svg
              className="architectural-svg-layer"
              viewBox="0 0 1000 700"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Parquet Wood Floor Pattern */}
                <pattern id="parquetPattern" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="40" height="40" fill="#24170e" />
                  <line x1="0" y1="0" x2="40" y2="0" stroke="rgba(201, 164, 100, 0.08)" strokeWidth="1" />
                  <line x1="0" y1="20" x2="40" y2="20" stroke="rgba(201, 164, 100, 0.08)" strokeWidth="1" />
                  <line x1="0" y1="0" x2="0" y2="40" stroke="rgba(201, 164, 100, 0.08)" strokeWidth="1" />
                  <line x1="20" y1="0" x2="20" y2="40" stroke="rgba(201, 164, 100, 0.08)" strokeWidth="1" />
                </pattern>

                {/* Wood Counter Gradient */}
                <linearGradient id="barWoodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5a3416" />
                  <stop offset="50%" stopColor="#3d210c" />
                  <stop offset="100%" stopColor="#221105" />
                </linearGradient>

                {/* Counter Brass Trim */}
                <linearGradient id="brassTrim" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fae4bb" />
                  <stop offset="50%" stopColor="#c9a464" />
                  <stop offset="100%" stopColor="#8c6523" />
                </linearGradient>

                {/* Stage Platform Gradient */}
                <linearGradient id="stageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3d281a" />
                  <stop offset="100%" stopColor="#1e120a" />
                </linearGradient>

                {/* Kitchen / Cocina Tile Gradient */}
                <linearGradient id="kitchenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2a2723" />
                  <stop offset="100%" stopColor="#181614" />
                </linearGradient>

                {/* Under-counter Amber LED glow filter */}
                <filter id="amberLedGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* ---------------------------------------------------- */}
              {/* FLOOR PODIUM SHADOW & BASEBOARD (ESTABLISHMENT BASE) */}
              {/* ---------------------------------------------------- */}
              {/* Deep 3D Podium Drop Shadow */}
              <path
                d="M 170 470 
                   L 170 380 
                   L 140 380 
                   L 140 300 
                   L 240 260 
                   L 370 215 
                   Q 388 220 405 200 
                   L 530 155 
                   L 645 105 
                   L 715 80 
                   L 790 80 
                   L 830 150 
                   L 830 260 
                   L 810 290 
                   Q 770 360 740 400 
                   Q 690 480 610 490 
                   Q 520 540 440 540 
                   Q 360 620 280 630 
                   Q 200 630 175 560 
                   L 175 470 
                   Z"
                transform="translate(8, 22)"
                fill="rgba(0, 0, 0, 0.65)"
                filter="blur(14px)"
              />

              {/* Podium Side Skirt (3D Wood Rim Elevation) */}
              <path
                d="M 170 470 
                   L 170 380 
                   L 140 380 
                   L 140 300 
                   L 240 260 
                   L 370 215 
                   Q 388 220 405 200 
                   L 530 155 
                   L 645 105 
                   L 715 80 
                   L 790 80 
                   L 830 150 
                   L 830 260 
                   L 810 290 
                   Q 770 360 740 400 
                   Q 690 480 610 490 
                   Q 520 540 440 540 
                   Q 360 620 280 630 
                   Q 200 630 175 560 
                   L 175 470 
                   Z"
                transform="translate(0, 10)"
                fill="#150d08"
                stroke="#4a2c14"
                strokeWidth="3"
              />

              {/* The Actual Restaurant Floor Surface */}
              <path
                d="M 170 470 
                   L 170 380 
                   L 140 380 
                   L 140 300 
                   L 240 260 
                   L 370 215 
                   Q 388 220 405 200 
                   L 530 155 
                   L 645 105 
                   L 715 80 
                   L 790 80 
                   L 830 150 
                   L 830 260 
                   L 810 290 
                   Q 770 360 740 400 
                   Q 690 480 610 490 
                   Q 520 540 440 540 
                   Q 360 620 280 630 
                   Q 200 630 175 560 
                   L 175 470 
                   Z"
                fill="url(#parquetPattern)"
                stroke="#c9a464"
                strokeWidth="2.5"
                className="blueprint-floor-podium"
              />

              {/* Warm Ambient Floor Lighting Halos (Pendant Lights above tables) */}
              {lightingMode === 'night' && (
                <g className="lighting-halos-group" pointerEvents="none">
                  {/* Stage warm spotlight */}
                  <circle cx="190" cy="320" r="75" fill="rgba(245, 158, 11, 0.16)" filter="blur(16px)" />
                  {/* Beer bar under-counter amber strip */}
                  <rect x="240" y="220" width="130" height="25" rx="10" fill="rgba(245, 158, 11, 0.22)" filter="blur(10px)" />
                  {/* Wine bar under-counter amber strip */}
                  <rect x="410" y="160" width="125" height="25" rx="10" fill="rgba(245, 158, 11, 0.22)" filter="blur(10px)" />
                  {/* Table pools of warm light */}
                  <circle cx="260" cy="392" r="48" fill="rgba(251, 191, 36, 0.12)" filter="blur(14px)" />
                  <circle cx="350" cy="322" r="48" fill="rgba(251, 191, 36, 0.12)" filter="blur(14px)" />
                  <circle cx="340" cy="448" r="48" fill="rgba(251, 191, 36, 0.12)" filter="blur(14px)" />
                  <circle cx="450" cy="322" r="48" fill="rgba(251, 191, 36, 0.12)" filter="blur(14px)" />
                  <circle cx="440" cy="441" r="48" fill="rgba(251, 191, 36, 0.12)" filter="blur(14px)" />
                  <circle cx="530" cy="238" r="48" fill="rgba(251, 191, 36, 0.12)" filter="blur(14px)" />
                  <circle cx="540" cy="336" r="48" fill="rgba(251, 191, 36, 0.12)" filter="blur(14px)" />
                  <circle cx="640" cy="301" r="48" fill="rgba(251, 191, 36, 0.12)" filter="blur(14px)" />
                  <circle cx="640" cy="406" r="48" fill="rgba(251, 191, 36, 0.12)" filter="blur(14px)" />
                  <circle cx="240" cy="539" r="65" fill="rgba(251, 191, 36, 0.14)" filter="blur(18px)" />
                </g>
              )}

              {/* ---------------------------------------------------- */}
              {/* 3D EXTRUDED PERIMETER WALLS (ARCHITECTURAL RELIEF)   */}
              {/* ---------------------------------------------------- */}
              {/* Upper angled back wall extrusion */}
              <polygon
                points="140,300 240,260 370,215 530,155 645,105 715,80 715,64 645,89 530,139 370,199 240,244 140,284"
                fill="#2b1a0e"
                stroke="#c9a464"
                strokeWidth="1.5"
              />
              {/* Wall Cap Top Rim with Brass Trim */}
              <polyline
                points="140,284 240,244 370,199 530,139 645,89 715,64"
                stroke="url(#brassTrim)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />

              {/* ---------------------------------------------------- */}
              {/* 1. TARIMA (ELEVATED 3D STAGE PLATFORM)               */}
              {/* ---------------------------------------------------- */}
              <g className="arch-feature-tarima">
                {/* 3D Stage riser front shadow */}
                <polygon
                  points="148,362 235,325 242,333 155,370"
                  fill="#180e07"
                />
                {/* Stage Surface */}
                <polygon
                  points="145,355 228,320 240,332 157,367"
                  fill="url(#stageGrad)"
                  stroke="url(#brassTrim)"
                  strokeWidth="2.5"
                />
                {/* Diagonal planks */}
                <line x1="165" y1="362" x2="230" y2="330" stroke="rgba(201, 164, 100, 0.35)" strokeWidth="1" />
                <line x1="175" y1="357" x2="235" y2="326" stroke="rgba(201, 164, 100, 0.35)" strokeWidth="1" />

                {/* Stage Front Step */}
                <polygon
                  points="155,370 238,335 241,340 158,375"
                  fill="#331e11"
                  stroke="#c9a464"
                  strokeWidth="1"
                />

                {showZoneLabels && (
                  <text
                    x="170"
                    y="346"
                    fill="#dfc28d"
                    fontSize="11"
                    fontWeight="850"
                    letterSpacing="2.5"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
                  >
                    TARIMA
                  </text>
                )}
              </g>

              {/* ---------------------------------------------------- */}
              {/* 2. BARRA DE CERVEZA (3D COUNTER & STOOLS)            */}
              {/* ---------------------------------------------------- */}
              <g className="arch-feature-beerbar">
                {/* Under-counter warm LED amber glow line */}
                <line
                  x1="240"
                  y1="235"
                  x2="365"
                  y2="190"
                  stroke="#f59e0b"
                  strokeWidth="4"
                  filter="url(#amberLedGlow)"
                  opacity={lightingMode === 'night' ? 0.9 : 0.4}
                />

                {/* Counter 3D Front Facet */}
                <polygon
                  points="240,225 365,180 375,195 250,240"
                  fill="#1b0f07"
                />

                {/* Counter Top Surface (Rich Polished Mahogany & Brass) */}
                <polygon
                  points="240,220 365,175 375,190 250,235"
                  fill="url(#barWoodGrad)"
                  stroke="url(#brassTrim)"
                  strokeWidth="2.5"
                />

                {/* Beer Tap Tower Icon / Silhouette on Counter */}
                <rect x="300" y="196" width="6" height="12" fill="#c9a464" rx="1" />
                <circle cx="303" cy="194" r="3" fill="#f59e0b" />

                {showZoneLabels && (
                  <text
                    x="256"
                    y="214"
                    fill="#dfc28d"
                    fontSize="9.5"
                    fontWeight="750"
                    letterSpacing="1.2"
                  >
                    BARRA DE CERVEZA
                  </text>
                )}

                {/* 5 Bar Stools along Beer Bar */}
                {showChairs && (
                  <g className="beer-stools-group">
                    {[
                      { cx: 268, cy: 246 },
                      { cx: 290, cy: 236 },
                      { cx: 312, cy: 226 },
                      { cx: 334, cy: 216 },
                      { cx: 356, cy: 206 },
                    ].map((s, idx) => (
                      <g key={`bstool-${idx}`}>
                        <circle cx={s.cx} cy={s.cy + 3} r="6.5" fill="rgba(0,0,0,0.5)" filter="blur(2px)" />
                        <circle cx={s.cx} cy={s.cy} r="6.5" fill="#3a2213" stroke="#c9a464" strokeWidth="1.5" />
                        <circle cx={s.cx} cy={s.cy} r="3.5" fill="#1e1107" />
                      </g>
                    ))}
                  </g>
                )}
              </g>

              {/* Curved Connection / Barista Niche between bars */}
              <path
                d="M 365 175 Q 388 165 405 155 L 415 170 Q 396 182 375 190 Z"
                fill="url(#barWoodGrad)"
                stroke="url(#brassTrim)"
                strokeWidth="2"
              />

              {/* ---------------------------------------------------- */}
              {/* 3. BARRA DE VINOS & CAFÉ (ALTURA = 1.15 M.)          */}
              {/* ---------------------------------------------------- */}
              <g className="arch-feature-winebar">
                {/* Under-counter warm LED strip */}
                <line
                  x1="405"
                  y1="170"
                  x2="525"
                  y2="125"
                  stroke="#f59e0b"
                  strokeWidth="4"
                  filter="url(#amberLedGlow)"
                  opacity={lightingMode === 'night' ? 0.9 : 0.4}
                />

                {/* Counter Front Skirt */}
                <polygon
                  points="405,160 525,115 535,130 415,175"
                  fill="#1b0f07"
                />

                {/* Counter Surface */}
                <polygon
                  points="405,155 525,110 535,125 415,170"
                  fill="url(#barWoodGrad)"
                  stroke="url(#brassTrim)"
                  strokeWidth="2.5"
                />

                {/* Espresso Machine Graphic */}
                <rect x="465" y="132" width="14" height="10" fill="#2d2926" stroke="#c9a464" strokeWidth="1" rx="2" />
                <circle cx="472" cy="137" r="2" fill="#ef4444" />

                {showZoneLabels && (
                  <>
                    <text
                      x="422"
                      y="148"
                      fill="#dfc28d"
                      fontSize="9.5"
                      fontWeight="750"
                      letterSpacing="1.2"
                    >
                      BARRA DE VINOS & CAFÉ
                    </text>
                    {showMeasurements && (
                      <text x="435" y="102" fill="rgba(223, 194, 141, 0.65)" fontSize="8.5" fontWeight="600">
                        ALTURA = 1.15 M.
                      </text>
                    )}
                  </>
                )}

                {/* 5 Bar Stools along Wine & Coffee Bar */}
                {showChairs && (
                  <g className="wine-stools-group">
                    {[
                      { cx: 428, cy: 182 },
                      { cx: 450, cy: 172 },
                      { cx: 472, cy: 162 },
                      { cx: 494, cy: 152 },
                      { cx: 516, cy: 142 },
                    ].map((s, idx) => (
                      <g key={`wstool-${idx}`}>
                        <circle cx={s.cx} cy={s.cy + 3} r="6.5" fill="rgba(0,0,0,0.5)" filter="blur(2px)" />
                        <circle cx={s.cx} cy={s.cy} r="6.5" fill="#3a2213" stroke="#c9a464" strokeWidth="1.5" />
                        <circle cx={s.cx} cy={s.cy} r="3.5" fill="#1e1107" />
                      </g>
                    ))}
                  </g>
                )}
              </g>

              {/* ---------------------------------------------------- */}
              {/* 4. COCINETA (CURVED AUXILIARY BAR COUNTER)           */}
              {/* ---------------------------------------------------- */}
              <g className="arch-feature-cocineta">
                {/* Curved counter */}
                <path
                  d="M 555 105 Q 575 145 615 175 L 600 185 Q 562 150 542 115 Z"
                  fill="url(#barWoodGrad)"
                  stroke="url(#brassTrim)"
                  strokeWidth="2.2"
                />

                {showZoneLabels && (
                  <text x="618" y="145" fill="#dfc28d" fontSize="9.5" fontWeight="750" letterSpacing="1">
                    COCINETA
                  </text>
                )}

                {/* 3 Cocineta stools */}
                {showChairs && (
                  <g className="cocineta-stools">
                    {[
                      { cx: 550, cy: 155 },
                      { cx: 568, cy: 178 },
                      { cx: 590, cy: 198 },
                    ].map((s, idx) => (
                      <g key={`cstool-${idx}`}>
                        <circle cx={s.cx} cy={s.cy + 2.5} r="6.5" fill="rgba(0,0,0,0.5)" filter="blur(2px)" />
                        <circle cx={s.cx} cy={s.cy} r="6.5" fill="#3a2213" stroke="#c9a464" strokeWidth="1.5" />
                        <circle cx={s.cx} cy={s.cy} r="3.5" fill="#1e1107" />
                      </g>
                    ))}
                  </g>
                )}
              </g>

              {/* ---------------------------------------------------- */}
              {/* 5. COCINA (BACK KITCHEN ZONE)                        */}
              {/* ---------------------------------------------------- */}
              <g className="arch-feature-kitchen">
                <rect
                  x="645"
                  y="60"
                  width="70"
                  height="85"
                  rx="6"
                  fill="url(#kitchenGrad)"
                  stroke="#5a422d"
                  strokeWidth="2"
                  strokeDasharray="5 3"
                />
                <rect x="655" y="70" width="50" height="18" rx="2" fill="#38332d" stroke="#c9a464" strokeWidth="1" />
                <text x="662" y="83" fill="#c9a464" fontSize="8" fontWeight="700">PREP</text>

                {showZoneLabels && (
                  <text x="654" y="118" fill="#dfc28d" fontSize="10.5" fontWeight="850" letterSpacing="1.5">
                    COCINA
                  </text>
                )}
              </g>

              {/* ---------------------------------------------------- */}
              {/* 6. SALIDA A BAÑO (BATHROOM HALLWAY CORRIDOR)         */}
              {/* ---------------------------------------------------- */}
              <g className="arch-feature-bathroom">
                <line x1="830" y1="150" x2="830" y2="260" stroke="#785333" strokeWidth="3.5" />
                
                {/* Bathroom glowing cyan guide arrow */}
                <line x1="680" y1="230" x2="800" y2="230" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="6 3" />
                <polygon points="795,225 808,230 795,235" fill="#38bdf8" />

                {showZoneLabels && (
                  <text
                    x="818"
                    y="180"
                    fill="#38bdf8"
                    fontSize="11"
                    fontWeight="750"
                    transform="rotate(90 818 180)"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
                  >
                    Salida a Baño →
                  </text>
                )}
              </g>

              {/* ---------------------------------------------------- */}
              {/* 7. ACCESO PRINCIPAL (ENTRANCE HALLWAY)               */}
              {/* ---------------------------------------------------- */}
              <g className="arch-feature-entrance">
                {/* Welcome Doormat */}
                <rect x="145" y="475" width="28" height="50" rx="3" fill="#1a110a" stroke="#c9a464" strokeWidth="1.5" />
                <text x="149" y="504" fill="#dfc28d" fontSize="7" fontWeight="bold" transform="rotate(-90 149 504)">BIENVENIDO</text>

                {/* Entry Arrow */}
                <line x1="85" y1="500" x2="165" y2="500" stroke="#38bdf8" strokeWidth="2.5" />
                <polygon points="155,495 168,500 155,505" fill="#38bdf8" />

                {showZoneLabels && (
                  <text
                    x="80"
                    y="488"
                    fill="#38bdf8"
                    fontSize="10.5"
                    fontWeight="750"
                    letterSpacing="0.5"
                  >
                    Acceso Principal →
                  </text>
                )}
              </g>

              {/* ---------------------------------------------------- */}
              {/* 8. SILLÓN EN L / CURVED BOOTH (ZONA LOUNGE M-10)     */}
              {/* ---------------------------------------------------- */}
              <g className="arch-feature-lounge">
                {/* Lounge curved backrest shadow */}
                <path
                  d="M 178 520 L 178 610 Q 220 610 290 580 L 278 555 Q 225 572 205 572 L 205 520 Z"
                  fill="rgba(0,0,0,0.6)"
                  filter="blur(4px)"
                />
                {/* Luxury tufted leather curved bench */}
                <path
                  d="M 175 515 L 175 605 Q 215 605 285 575 L 275 550 Q 220 568 200 568 L 200 515 Z"
                  fill="linear-gradient(135deg, #4d2811 0%, #281408 100%)"
                  stroke="#c9a464"
                  strokeWidth="2"
                />
                {/* Tufted cushion accent lines */}
                <line x1="187" y1="535" x2="198" y2="535" stroke="#c9a464" strokeWidth="1" opacity="0.6" />
                <line x1="187" y1="555" x2="198" y2="555" stroke="#c9a464" strokeWidth="1" opacity="0.6" />
                <line x1="187" y1="575" x2="198" y2="575" stroke="#c9a464" strokeWidth="1" opacity="0.6" />
                <line x1="220" y1="586" x2="228" y2="578" stroke="#c9a464" strokeWidth="1" opacity="0.6" />
                <line x1="245" y1="577" x2="252" y2="569" stroke="#c9a464" strokeWidth="1" opacity="0.6" />

                {showZoneLabels && (
                  <text x="210" y="555" fill="#dfc28d" fontSize="9.5" fontWeight="750" letterSpacing="1">
                    ZONA LOUNGE
                  </text>
                )}
              </g>
            </svg>

            {/* ==================================================== */}
            {/* 3. DYNAMIC 3D TABLES WITH UPRIGHT BILLBOARD CARDS    */}
            {/* ==================================================== */}
            <div className="tables-layer-surface">
              {tables.map((table) => {
                const posX = table.posX ?? 50;
                const posY = table.posY ?? 50;
                const rotation = table.rotation ?? 45;
                const isOccupied = table.status === 'ocupada';
                const isPreBill = table.status === 'por_cobrar';
                const isFree = table.status === 'libre';
                const isSelected = selectedTableId === table.id;
                const isHovered = hoveredTableId === table.id;
                const isDragging = draggingTableId === table.id;
                const elapsedTime = getElapsedTime(table.openedAt);

                let statusColorClass = 'status-free';
                if (isOccupied) statusColorClass = 'status-occupied';
                if (isPreBill) statusColorClass = 'status-prebill';

                // Counter-tilt for Upright 3D Billboard Card:
                // Cancels camera pitch & yaw so labels are ALWAYS facing the viewer, 100% horizontal and razor sharp!
                const billboardTransform = is3DMode
                  ? `translateZ(${isSelected || isHovered ? 26 : 18}px) rotateZ(${-rotationAngle}deg) rotateX(${-tiltAngle}deg)`
                  : 'none';

                return (
                  <div
                    key={table.id}
                    className={`floorplan-3d-table ${statusColorClass} ${table.shape || 'square'} ${
                      isSelected ? 'table-selected' : ''
                    } ${isDragging ? 'table-dragging' : ''} ${isEditMode ? 'in-edit-mode' : ''}`}
                    style={{
                      left: `${posX}%`,
                      top: `${posY}%`,
                    }}
                    onMouseDown={(e) => handleMouseDownTable(table, e)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isEditMode) {
                        setSelectedTableId(table.id);
                      } else {
                        if (isFree) {
                          onOpenTable(table);
                        } else {
                          setSelectedTableId(table.id);
                        }
                      }
                    }}
                    onMouseEnter={() => setHoveredTableId(table.id)}
                    onMouseLeave={() => setHoveredTableId(null)}
                  >
                    {/* ---------------------------------------------- */}
                    {/* A. 3D FURNITURE (TABLE SURFACE & CHAIRS ON FLOOR) */}
                    {/* ---------------------------------------------- */}
                    <div
                      className="table-furniture-base"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                      }}
                    >
                      {/* Chairs arranged at 45° around table */}
                      {showChairs && table.shape !== 'bar' && table.shape !== 'booth' && (
                        <div className="table-chairs-ring" aria-hidden="true">
                          <div className="chair-seat chair-north">
                            <span className="chair-back-arc" />
                          </div>
                          <div className="chair-seat chair-east">
                            <span className="chair-back-arc" />
                          </div>
                          <div className="chair-seat chair-south">
                            <span className="chair-back-arc" />
                          </div>
                          <div className="chair-seat chair-west">
                            <span className="chair-back-arc" />
                          </div>
                        </div>
                      )}

                      {/* Physical Table Surface */}
                      <div className="table-physical-top">
                        <div className="table-wood-grain" />
                        {/* Table center beverage / centerpiece icon if occupied */}
                        {isOccupied && (
                          <div className="table-center-icon">
                            {table.zone === 'barra' ? <Beer size={11} /> : <Coffee size={11} />}
                          </div>
                        )}
                        {/* Live pulsating radar ring when occupied */}
                        {isOccupied && <div className="table-live-pulse-ring" />}
                      </div>
                    </div>

                    {/* ---------------------------------------------- */}
                    {/* B. UPRIGHT 3D BILLBOARD CARD (FACES CAMERA)    */}
                    {/* ---------------------------------------------- */}
                    <div
                      className="table-billboard-badge"
                      style={{
                        transform: billboardTransform,
                      }}
                    >
                      <div className="badge-header-row">
                        <span className="badge-tbl-num">
                          {table.number.replace('Mesa ', 'M-')}
                        </span>
                        {isFree && (
                          <span className="badge-cap-tag">
                            <Users size={9} />
                            {table.capacity}p
                          </span>
                        )}
                      </div>

                      {/* Status indicator row */}
                      {isOccupied && (
                        <div className="badge-live-row">
                          <span className="badge-live-amount">
                            {formatCurrency(table.total)}
                          </span>
                          {elapsedTime && (
                            <span className="badge-live-time">
                              <Clock size={8} />
                              {elapsedTime}
                            </span>
                          )}
                        </div>
                      )}

                      {isPreBill && (
                        <div className="badge-live-row">
                          <span className="badge-prebill-tag">Pre-cuenta</span>
                          <span className="badge-live-amount">
                            {formatCurrency(table.total)}
                          </span>
                        </div>
                      )}

                      {isFree && !isEditMode && (
                        <span className="badge-free-label">Libre</span>
                      )}
                    </div>

                    {/* ---------------------------------------------- */}
                    {/* C. EDIT MODE HANDLES (ROTATE & EDIT DATA)      */}
                    {/* ---------------------------------------------- */}
                    {isEditMode && isSelected && (
                      <div className="table-edit-handles" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="handle-btn btn-rotate"
                          onClick={(e) => handleRotateTable(table.id, e)}
                          title="Girar orientación de la mesa 45°"
                        >
                          <RotateCw size={12} />
                        </button>
                        <button
                          type="button"
                          className="handle-btn btn-edit-data"
                          onClick={() => onEditTableForm(table)}
                          title="Editar nombre, capacidad o zona"
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. FLOATING HUD ACTION DRAWER FOR SELECTED TABLE         */}
        {/* ======================================================== */}
        {selectedTable && !isEditMode && (
          <div className="floorplan-table-hud animate-slide-up">
            <div className="hud-header">
              <div className="hud-title-box">
                <span className="hud-table-title">{selectedTable.number}</span>
                <span className={`hud-badge ${selectedTable.status}`}>
                  {selectedTable.status === 'ocupada' && '● Ocupada'}
                  {selectedTable.status === 'por_cobrar' && '● Pre-cuenta'}
                  {selectedTable.status === 'libre' && '● Libre'}
                </span>
                <span className="hud-zone-tag">
                  {selectedTable.zone === 'salon' && <Coffee size={12} />}
                  {selectedTable.zone === 'barra' && <Wine size={12} />}
                  <span>{selectedTable.zone === 'salon' ? 'Salón' : 'Barra'}</span>
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn hud-close-btn"
                onClick={() => setSelectedTableId(null)}
                title="Cerrar panel"
              >
                <X size={15} />
              </button>
            </div>

            <div className="hud-body">
              {selectedTable.status === 'libre' ? (
                <div className="hud-free-state">
                  <p className="hud-info-text">
                    Mesa disponible con capacidad para <strong>{selectedTable.capacity} personas</strong>.
                  </p>
                  <button
                    type="button"
                    className="btn-hud-action btn-open-primary"
                    onClick={() => {
                      onOpenTable(selectedTable);
                      setSelectedTableId(null);
                    }}
                  >
                    <Plus size={15} />
                    <span>Abrir Mesa & Comenzar Pedido</span>
                  </button>
                </div>
              ) : (
                <div className="hud-occupied-state">
                  <div className="hud-metrics-row">
                    <div className="metric-box">
                      <span className="metric-lbl">Total Cuenta</span>
                      <span className="metric-val price-highlight">
                        {formatCurrency(selectedTable.total)}
                      </span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-lbl">Tiempo</span>
                      <span className="metric-val">
                        <Clock size={11} /> {getElapsedTime(selectedTable.openedAt) || '0m'}
                      </span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-lbl">Atiende</span>
                      <span className="metric-val text-truncate">
                        {selectedTable.waiter || 'General'}
                      </span>
                    </div>
                  </div>

                  {/* Items summary */}
                  {selectedTable.items && selectedTable.items.length > 0 && (
                    <div className="hud-items-preview">
                      <span className="hud-items-title">
                        Consumo actual ({selectedTable.items.reduce((s, i) => s + i.quantity, 0)} items):
                      </span>
                      <div className="hud-items-list">
                        {selectedTable.items.slice(0, 3).map((item) => (
                          <div key={item.id} className="hud-item-row">
                            <span className="item-qty">{item.quantity}x</span>
                            <span className="item-name">{item.productName}</span>
                            <span className="item-price">
                              {formatCurrency(item.unitPrice * item.quantity)}
                            </span>
                          </div>
                        ))}
                        {selectedTable.items.length > 3 && (
                          <span className="hud-more-items">
                            +{selectedTable.items.length - 3} productos más...
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="hud-action-buttons">
                    <button
                      type="button"
                      className="hud-btn btn-go-pos"
                      onClick={() => onSelectTable(selectedTable)}
                    >
                      <Receipt size={14} />
                      <span>Ver Comanda / Agregar</span>
                    </button>
                    <button
                      type="button"
                      className="hud-btn btn-prebill"
                      onClick={() => onPreBill(selectedTable)}
                    >
                      <Coffee size={14} />
                      <span>Pre-cuenta</span>
                    </button>
                    <button
                      type="button"
                      className="hud-btn btn-checkout"
                      onClick={() => onCheckout(selectedTable)}
                    >
                      <CreditCard size={14} />
                      <span>Cobrar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 5. FOOTER STATS & ARCHITECTURAL LEGEND                   */}
      {/* ======================================================== */}
      <div className="floorplan-footer-legend">
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-dot dot-free" />
            <span>Mesa Libre ({freeCount})</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot dot-occupied" />
            <span>Mesa Ocupada ({occupiedCount})</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot dot-prebill" />
            <span>Pre-cuenta ({prebillCount})</span>
          </div>
          <div className="legend-divider" />
          <div className="legend-item">
            <span className="architectural-tag">🏛️ Plano Arquitectónico La Molienda</span>
          </div>
        </div>

        <div className="legend-counters">
          <span>
            Venta Salón: <strong className="text-amber">{formatCurrency(totalSalonSales)}</strong>
          </span>
          <span className="legend-pipe">|</span>
          <span>
            Capacidad: <strong>{totalCapacity} comensales</strong>
          </span>
          <span className="legend-pipe">|</span>
          <span>
            Total Espacios: <strong>{tables.length}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
