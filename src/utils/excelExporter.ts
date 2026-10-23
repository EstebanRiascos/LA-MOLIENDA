import ExcelJS from 'exceljs';
import laMoliendaLogo from '../assets/la_molienda_logo.png';
import { SaleRecord, Product, Table } from '../types';

/**
 * Convierte el asset de imagen a Base64 puro para incrustar en ExcelJS
 */
async function getLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch(laMoliendaLogo);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('No se pudo cargar el logo para el reporte Excel:', err);
    return null;
  }
}

export interface ExportReportOptions {
  periodLabel?: string;
  filenameSuffix?: string;
  filterSummary?: string;
}

export async function exportLaMoliendaReport(
  sales: SaleRecord[],
  products: Product[],
  _tables: Table[],
  options?: ExportReportOptions
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Juan Esteban Riascos Madarriaga (Ingeniero de Sistemas) - La Molienda Café Bar';
  workbook.lastModifiedBy = 'Juan Esteban Riascos Madarriaga (Ingeniero de Sistemas)';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Cargar imagen del logo de La Molienda
  const logoBase64 = await getLogoBase64();
  let logoId: number | null = null;
  if (logoBase64) {
    logoId = workbook.addImage({
      base64: logoBase64,
      extension: 'png',
    });
  }

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Estilos reutilizables
  const thinBorder = {
    top: { style: 'thin' as const, color: { argb: 'FFE5D9CC' } },
    left: { style: 'thin' as const, color: { argb: 'FFE5D9CC' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFE5D9CC' } },
    right: { style: 'thin' as const, color: { argb: 'FFE5D9CC' } },
  };

  const accountingDoubleBorder = {
    top: { style: 'thin' as const, color: { argb: 'FFB45309' } },
    bottom: { style: 'double' as const, color: { argb: 'FFB45309' } },
    left: { style: 'thin' as const, color: { argb: 'FFE5D9CC' } },
    right: { style: 'thin' as const, color: { argb: 'FFE5D9CC' } },
  };

  // -------------------------------------------------------------
  // HOJA 1: HISTORIAL DE VENTAS & TICKETS
  // -------------------------------------------------------------
  const salesSheet = workbook.addWorksheet('Historial de Ventas', {
    views: [{ showGridLines: true }],
  });

  // Configuración de anchos de columna (Holgados para cero truncamiento)
  salesSheet.columns = [
    { width: 17 }, // Ticket N°
    { width: 23 }, // Fecha / Hora
    { width: 17 }, // Mesa / Canal
    { width: 15 }, // Zona
    { width: 30 }, // Atendido Por
    { width: 17 }, // Subtotal ($)
    { width: 15 }, // Propina ($)
    { width: 19 }, // Total Pagado ($)
    { width: 17 }, // Medio de Pago
    { width: 26 }, // Referencia / Voucher
  ];

  // Cálculos de KPI de ventas
  const completedSales = sales.filter((s) => s.status === 'completada');
  const totalGrand = completedSales.reduce((sum, s) => sum + s.total, 0);
  const totalSub = completedSales.reduce((sum, s) => sum + s.subtotal, 0);
  const totalTips = completedSales.reduce((sum, s) => sum + s.tipAmount, 0);
  const avgTicket = completedSales.length > 0 ? Math.round(totalGrand / completedSales.length) : 0;

  // Alturas de Filas del Masthead
  salesSheet.getRow(1).height = 30;
  salesSheet.getRow(2).height = 24;
  salesSheet.getRow(3).height = 22;
  salesSheet.getRow(4).height = 5; // Golden accent divider line

  // Colorear todo el fondo del Masthead (Filas 1 a 3, Columnas A a J)
  for (let r = 1; r <= 3; r++) {
    const row = salesSheet.getRow(r);
    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c);
      if (c >= 8) {
        // Tarjeta derecha ejecutiva de Período & Filtro (Cols H, I, J)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2A1E14' },
        };
      } else {
        // Bloque institucional (Cols A a G)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1A120B' },
        };
      }
    }
  }

  // Incrustar Logo (Top Left en Celda A1:A3)
  if (logoId !== null) {
    salesSheet.addImage(logoId, {
      tl: { col: 0.18, row: 0.16 },
      ext: { width: 68, height: 68 },
      editAs: 'undefined',
    });
  }

  // Celda A1:A3 (Bloque del Logo con borde sutil)
  salesSheet.mergeCells('A1:A3');
  const aLogoCell = salesSheet.getCell('A1');
  aLogoCell.border = {
    top: { style: 'thin', color: { argb: 'FFB45309' } },
    bottom: { style: 'thin', color: { argb: 'FFB45309' } },
    left: { style: 'thin', color: { argb: 'FFB45309' } },
  };

  // Bloque Central: Nombre y Subtítulo
  salesSheet.mergeCells('B1:G1');
  const sTitle = salesSheet.getCell('B1');
  sTitle.value = 'LA MOLIENDA CAFÉ & BAR';
  sTitle.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFF59E0B' } };
  sTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sTitle.border = { top: { style: 'thin', color: { argb: 'FFB45309' } } };

  salesSheet.mergeCells('B2:G2');
  const sSub = salesSheet.getCell('B2');
  sSub.value = 'REPORTE OFICIAL DE OPERACIONES, VENTAS Y FACTURACIÓN';
  sSub.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  sSub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  salesSheet.mergeCells('B3:G3');
  const sMeta = salesSheet.getCell('B3');
  sMeta.value = `Sistema POS La Molienda • Desarrollado por Ing. Juan Esteban Riascos Madarriaga`;
  sMeta.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FFD6C7B7' } };
  sMeta.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sMeta.border = { bottom: { style: 'thin', color: { argb: 'FFB45309' } } };

  // Tarjeta Ejecutiva Derecha: Período y Filtro Activo (Cols H, I, J)
  const periodText = options?.periodLabel ? options.periodLabel.toUpperCase() : 'CONSOLIDADO GENERAL';

  salesSheet.mergeCells('H1:J1');
  const sCardHead = salesSheet.getCell('H1');
  sCardHead.value = 'PERÍODO SELECCIONADO';
  sCardHead.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FFF59E0B' } };
  sCardHead.alignment = { vertical: 'middle', horizontal: 'center' };
  sCardHead.border = {
    top: { style: 'medium', color: { argb: 'FFD97706' } },
    left: { style: 'medium', color: { argb: 'FFD97706' } },
    right: { style: 'medium', color: { argb: 'FFD97706' } },
  };

  salesSheet.mergeCells('H2:J2');
  const sCardBody = salesSheet.getCell('H2');
  sCardBody.value = periodText;
  sCardBody.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  sCardBody.alignment = { vertical: 'middle', horizontal: 'center' };
  sCardBody.border = {
    left: { style: 'medium', color: { argb: 'FFD97706' } },
    right: { style: 'medium', color: { argb: 'FFD97706' } },
  };

  salesSheet.mergeCells('H3:J3');
  const sCardFoot = salesSheet.getCell('H3');
  sCardFoot.value = `Emisión: ${dateFormatted} ${timeFormatted} • ${completedSales.length} txs`;
  sCardFoot.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FF10B981' } };
  sCardFoot.alignment = { vertical: 'middle', horizontal: 'center' };
  sCardFoot.border = {
    bottom: { style: 'medium', color: { argb: 'FFD97706' } },
    left: { style: 'medium', color: { argb: 'FFD97706' } },
    right: { style: 'medium', color: { argb: 'FFD97706' } },
  };

  // Fila 4: Línea de acento dorado divisoria
  const divRow = salesSheet.getRow(4);
  for (let c = 1; c <= 10; c++) {
    const dCell = divRow.getCell(c);
    dCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD97706' },
    };
  }

  // TARJETAS EJECUTIVAS (KPIs) - Filas 5 y 6
  salesSheet.getRow(5).height = 17;
  salesSheet.getRow(6).height = 25;
  salesSheet.getRow(7).height = 12; // Spacer

  const salesKpis = [
    { rangeTitle: 'A5:B5', rangeVal: 'A6:B6', titleCell: 'A5', valCell: 'A6', label: 'TOTAL RECAUDADO ($)', val: totalGrand, color: 'FF065F46', isCurr: true },
    { rangeTitle: 'C5:D5', rangeVal: 'C6:D6', titleCell: 'C5', valCell: 'C6', label: 'VENTA NETA / SUBTOTAL ($)', val: totalSub, color: 'FF1E293B', isCurr: true },
    { rangeTitle: 'E5:F5', rangeVal: 'E6:F6', titleCell: 'E5', valCell: 'E6', label: 'PROPINAS RECAUDADAS ($)', val: totalTips, color: 'FFB45309', isCurr: true },
    { rangeTitle: 'G5:H5', rangeVal: 'G6:H6', titleCell: 'G5', valCell: 'G6', label: 'TICKET PROMEDIO ($)', val: avgTicket, color: 'FF0369A1', isCurr: true },
    { rangeTitle: 'I5:J5', rangeVal: 'I6:J6', titleCell: 'I5', valCell: 'I6', label: 'VENTAS COMPLETADAS', val: completedSales.length, color: 'FF475569', isCurr: false },
  ];

  salesKpis.forEach((kpi) => {
    salesSheet.mergeCells(kpi.rangeTitle);
    const tc = salesSheet.getCell(kpi.titleCell);
    tc.value = kpi.label;
    tc.font = { name: 'Arial', size: 7.5, bold: true, color: { argb: 'FF7C3A14' } };
    tc.alignment = { vertical: 'middle', horizontal: 'center' };
    tc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF6EC' } };
    tc.border = { top: thinBorder.top, left: thinBorder.left, right: thinBorder.right };

    salesSheet.mergeCells(kpi.rangeVal);
    const vc = salesSheet.getCell(kpi.valCell);
    vc.value = kpi.val;
    vc.font = { name: 'Arial', size: 12, bold: true, color: { argb: kpi.color } };
    vc.alignment = { vertical: 'middle', horizontal: 'center' };
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF6EC' } };
    vc.border = { bottom: thinBorder.bottom, left: thinBorder.left, right: thinBorder.right };
    if (kpi.isCurr) {
      vc.numFmt = '$#,##0';
    }
  });

  // Cabeceras de Tabla (Fila 8)
  const salesHeaders = [
    'Ticket N°',
    'Fecha / Hora',
    'Mesa / Canal',
    'Zona',
    'Atendido Por',
    'Subtotal ($)',
    'Propina ($)',
    'Total Pagado ($)',
    'Medio de Pago',
    'Referencia / Voucher',
  ];
  const sHeadRow = salesSheet.addRow(salesHeaders);
  sHeadRow.height = 25;
  sHeadRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E1E14' }, // Espresso Intenso
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF4A3525' } },
      bottom: { style: 'medium', color: { argb: 'FFB45309' } },
      left: { style: 'thin', color: { argb: 'FF4A3525' } },
      right: { style: 'thin', color: { argb: 'FF4A3525' } },
    };
  });

  // Filas de Datos (Zebra Striping)
  const startRowSales = 9;
  sales.forEach((s, idx) => {
    const isEven = idx % 2 === 0;
    const bgRowColor = isEven ? 'FFFFFFFF' : 'FFFAF6F0';
    const dateFormattedStr = new Date(s.date).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const row = salesSheet.addRow([
      s.ticketNumber,
      dateFormattedStr,
      s.tableNumber,
      s.zone.toUpperCase(),
      s.waiter,
      s.subtotal,
      s.tipAmount,
      s.total,
      s.paymentMethod.toUpperCase(),
      s.referenceNumber || '-',
    ]);
    row.height = 21;

    row.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgRowColor } };
      cell.border = thinBorder;
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF1E130A' } };

      // Alineaciones específicas
      if (colNum === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF7C3A14' } };
      } else if (colNum === 2 || colNum === 3 || colNum === 4 || colNum === 9 || colNum === 10) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNum === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if (colNum === 6 || colNum === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '$#,##0';
      } else if (colNum === 8) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '$#,##0';
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF065F46' } };
      }
    });
  });

  // Fila de Totales Generales al pie de la tabla
  const endRowSales = startRowSales + sales.length;
  salesSheet.mergeCells(`A${endRowSales}:E${endRowSales}`);
  const sTotLabel = salesSheet.getCell(`A${endRowSales}`);
  sTotLabel.value = 'TOTAL GENERAL ACUMULADO:';
  sTotLabel.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF4A2810' } };
  sTotLabel.alignment = { vertical: 'middle', horizontal: 'right' };
  sTotLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF3E7' } };
  sTotLabel.border = accountingDoubleBorder;

  // Subtotal Sum
  const sTotSub = salesSheet.getCell(`F${endRowSales}`);
  sTotSub.value = totalSub;
  sTotSub.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  sTotSub.alignment = { vertical: 'middle', horizontal: 'right' };
  sTotSub.numFmt = '$#,##0';
  sTotSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF3E7' } };
  sTotSub.border = accountingDoubleBorder;

  // Tip Sum
  const sTotTip = salesSheet.getCell(`G${endRowSales}`);
  sTotTip.value = totalTips;
  sTotTip.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFB45309' } };
  sTotTip.alignment = { vertical: 'middle', horizontal: 'right' };
  sTotTip.numFmt = '$#,##0';
  sTotTip.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF3E7' } };
  sTotTip.border = accountingDoubleBorder;

  // Total Pagado Sum
  const sTotGrand = salesSheet.getCell(`H${endRowSales}`);
  sTotGrand.value = totalGrand;
  sTotGrand.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF065F46' } };
  sTotGrand.alignment = { vertical: 'middle', horizontal: 'right' };
  sTotGrand.numFmt = '$#,##0';
  sTotGrand.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF3E7' } };
  sTotGrand.border = accountingDoubleBorder;

  // Celdas finales de la fila total
  [`I${endRowSales}`, `J${endRowSales}`].forEach((cellRef) => {
    const c = salesSheet.getCell(cellRef);
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF3E7' } };
    c.border = accountingDoubleBorder;
  });
  salesSheet.getRow(endRowSales).height = 24;

  // -------------------------------------------------------------
  // HOJA 2: INVENTARIO, PRECIOS & COSTOS
  // -------------------------------------------------------------
  const invSheet = workbook.addWorksheet('Inventario & Precios', {
    views: [{ showGridLines: true }],
  });

  invSheet.columns = [
    { width: 14 }, // Código
    { width: 34 }, // Nombre
    { width: 20 }, // Categoría
    { width: 17 }, // Costo
    { width: 18 }, // Precio Venta
    { width: 18 }, // Margen %
    { width: 15 }, // Stock Actual
    { width: 15 }, // Stock Mínimo
    { width: 17 }, // Estado Stock
  ];

  // Alturas de Filas del Masthead
  invSheet.getRow(1).height = 30;
  invSheet.getRow(2).height = 24;
  invSheet.getRow(3).height = 22;
  invSheet.getRow(4).height = 5; // Golden accent divider line

  // Colorear todo el fondo del Masthead (Filas 1 a 3, Columnas A a I)
  for (let r = 1; r <= 3; r++) {
    const row = invSheet.getRow(r);
    for (let c = 1; c <= 9; c++) {
      const cell = row.getCell(c);
      if (c >= 7) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2A1E14' },
        };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1A120B' },
        };
      }
    }
  }

  // Incrustar Logo (Top Left en Celda A1:A3)
  if (logoId !== null) {
    invSheet.addImage(logoId, {
      tl: { col: 0.18, row: 0.16 },
      ext: { width: 68, height: 68 },
      editAs: 'undefined',
    });
  }

  invSheet.mergeCells('A1:A3');
  const aLogoInv = invSheet.getCell('A1');
  aLogoInv.border = {
    top: { style: 'thin', color: { argb: 'FFB45309' } },
    bottom: { style: 'thin', color: { argb: 'FFB45309' } },
    left: { style: 'thin', color: { argb: 'FFB45309' } },
  };

  invSheet.mergeCells('B1:F1');
  const iTitle = invSheet.getCell('B1');
  iTitle.value = 'LA MOLIENDA CAFÉ & BAR';
  iTitle.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFF59E0B' } };
  iTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  iTitle.border = { top: { style: 'thin', color: { argb: 'FFB45309' } } };

  invSheet.mergeCells('B2:F2');
  const iSub = invSheet.getCell('B2');
  iSub.value = 'CATÁLOGO DE PRODUCTOS, COSTOS DE INSUMO Y STOCK';
  iSub.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  iSub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  invSheet.mergeCells('B3:F3');
  const iMeta = invSheet.getCell('B3');
  iMeta.value = `Control de inventario valorizado • Monitoreo de márgenes de utilidad • Desarrollado por Ing. Juan Esteban Riascos`;
  iMeta.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FFD6C7B7' } };
  iMeta.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  iMeta.border = { bottom: { style: 'thin', color: { argb: 'FFB45309' } } };

  invSheet.mergeCells('G1:I1');
  const iCardHead = invSheet.getCell('G1');
  iCardHead.value = 'CATÁLOGO DE INVENTARIO';
  iCardHead.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FFF59E0B' } };
  iCardHead.alignment = { vertical: 'middle', horizontal: 'center' };
  iCardHead.border = {
    top: { style: 'medium', color: { argb: 'FFD97706' } },
    left: { style: 'medium', color: { argb: 'FFD97706' } },
    right: { style: 'medium', color: { argb: 'FFD97706' } },
  };

  invSheet.mergeCells('G2:I2');
  const iCardBody = invSheet.getCell('G2');
  iCardBody.value = `${products.length} REFERENCIAS ACTIVAS`;
  iCardBody.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  iCardBody.alignment = { vertical: 'middle', horizontal: 'center' };
  iCardBody.border = {
    left: { style: 'medium', color: { argb: 'FFD97706' } },
    right: { style: 'medium', color: { argb: 'FFD97706' } },
  };

  invSheet.mergeCells('G3:I3');
  const iCardFoot = invSheet.getCell('G3');
  iCardFoot.value = `Auditoría: ${dateFormatted} ${timeFormatted}`;
  iCardFoot.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FF10B981' } };
  iCardFoot.alignment = { vertical: 'middle', horizontal: 'center' };
  iCardFoot.border = {
    bottom: { style: 'medium', color: { argb: 'FFD97706' } },
    left: { style: 'medium', color: { argb: 'FFD97706' } },
    right: { style: 'medium', color: { argb: 'FFD97706' } },
  };

  // Fila 4: Línea de acento dorado divisoria
  const divRowInv = invSheet.getRow(4);
  for (let c = 1; c <= 9; c++) {
    const dCell = divRowInv.getCell(c);
    dCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD97706' },
    };
  }

  // Cálculos de KPI de Inventario
  const totalStockVal = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const totalStockCost = products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
  const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  invSheet.getRow(5).height = 17;
  invSheet.getRow(6).height = 25;
  invSheet.getRow(7).height = 12;

  const invKpis = [
    { rangeTitle: 'A5:B5', rangeVal: 'A6:B6', titleCell: 'A5', valCell: 'A6', label: 'VALOR COMERCIAL INVENTARIO', val: totalStockVal, color: 'FF0F766E', isCurr: true },
    { rangeTitle: 'C5:D5', rangeVal: 'C6:D6', titleCell: 'C5', valCell: 'C6', label: 'COSTO TOTAL INSUMOS', val: totalStockCost, color: 'FF475569', isCurr: true },
    { rangeTitle: 'E5:F5', rangeVal: 'E6:F6', titleCell: 'E5', valCell: 'E6', label: 'UNIDADES TOTALES EN STOCK', val: totalStockUnits, color: 'FF1E293B', isCurr: false },
    { rangeTitle: 'G5:G5', rangeVal: 'G6:G6', titleCell: 'G5', valCell: 'G6', label: 'REFERENCIAS', val: products.length, color: 'FF4A2810', isCurr: false },
    { rangeTitle: 'H5:I5', rangeVal: 'H6:I6', titleCell: 'H5', valCell: 'H6', label: 'ALERTAS STOCK BAJO', val: `${lowStockCount} ítems`, color: lowStockCount > 0 ? 'FFE11D48' : 'FF059669', isCurr: false },
  ];

  invKpis.forEach((kpi) => {
    invSheet.mergeCells(kpi.rangeTitle);
    const tc = invSheet.getCell(kpi.titleCell);
    tc.value = kpi.label;
    tc.font = { name: 'Arial', size: 7.5, bold: true, color: { argb: 'FF0F766E' } };
    tc.alignment = { vertical: 'middle', horizontal: 'center' };
    tc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
    tc.border = { top: thinBorder.top, left: thinBorder.left, right: thinBorder.right };

    invSheet.mergeCells(kpi.rangeVal);
    const vc = invSheet.getCell(kpi.valCell);
    vc.value = kpi.val;
    vc.font = { name: 'Arial', size: 12, bold: true, color: { argb: kpi.color } };
    vc.alignment = { vertical: 'middle', horizontal: 'center' };
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
    vc.border = { bottom: thinBorder.bottom, left: thinBorder.left, right: thinBorder.right };
    if (kpi.isCurr) {
      vc.numFmt = '$#,##0';
    }
  });

  const invHeaders = [
    'Código',
    'Nombre del Producto',
    'Categoría',
    'Costo Insumo ($)',
    'Precio de Venta ($)',
    'Margen Utilidad (%)',
    'Stock Actual',
    'Stock Mínimo',
    'Estado Stock',
  ];
  const iHeadRow = invSheet.addRow(invHeaders);
  iHeadRow.height = 25;
  iHeadRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF115E59' } },
      bottom: { style: 'medium', color: { argb: 'FF042F2E' } },
      left: { style: 'thin', color: { argb: 'FF115E59' } },
      right: { style: 'thin', color: { argb: 'FF115E59' } },
    };
  });

  const startRowInv = 9;
  products.forEach((p, idx) => {
    const isEven = idx % 2 === 0;
    const bgRowColor = isEven ? 'FFFFFFFF' : 'FFF9FAFB';
    const margin = p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0;
    const isLow = p.stock <= p.minStock;
    const statusText = p.stock === 0 ? 'AGOTADO' : isLow ? 'STOCK BAJO' : 'NORMAL';

    const row = invSheet.addRow([
      p.code,
      p.name,
      p.category.toUpperCase(),
      p.cost,
      p.price,
      `${margin.toFixed(1)}%`,
      p.stock,
      p.minStock,
      statusText,
    ]);
    row.height = 21;

    row.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgRowColor } };
      cell.border = thinBorder;
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF1E130A' } };

      if (colNum === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F766E' } };
      } else if (colNum === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if (colNum === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNum === 4 || colNum === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '$#,##0';
      } else if (colNum === 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F766E' } };
      } else if (colNum === 7 || colNum === 8) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Arial', size: 9, bold: true };
      } else if (colNum === 9) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        if (p.stock === 0) {
          cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF991B1B' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        } else if (isLow) {
          cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF92400E' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        } else {
          cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF065F46' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        }
      }
    });
  });

  const endRowInv = startRowInv + products.length;
  invSheet.mergeCells(`A${endRowInv}:C${endRowInv}`);
  const iTotLabel = invSheet.getCell(`A${endRowInv}`);
  iTotLabel.value = 'TOTAL INVENTARIO VALORIZADO:';
  iTotLabel.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F766E' } };
  iTotLabel.alignment = { vertical: 'middle', horizontal: 'right' };
  iTotLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
  iTotLabel.border = accountingDoubleBorder;

  const iTotCost = invSheet.getCell(`D${endRowInv}`);
  iTotCost.value = totalStockCost;
  iTotCost.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
  iTotCost.alignment = { vertical: 'middle', horizontal: 'right' };
  iTotCost.numFmt = '$#,##0';
  iTotCost.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
  iTotCost.border = accountingDoubleBorder;

  const iTotPrice = invSheet.getCell(`E${endRowInv}`);
  iTotPrice.value = totalStockVal;
  iTotPrice.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F766E' } };
  iTotPrice.alignment = { vertical: 'middle', horizontal: 'right' };
  iTotPrice.numFmt = '$#,##0';
  iTotPrice.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
  iTotPrice.border = accountingDoubleBorder;

  const iTotUnits = invSheet.getCell(`G${endRowInv}`);
  iTotUnits.value = totalStockUnits;
  iTotUnits.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  iTotUnits.alignment = { vertical: 'middle', horizontal: 'center' };
  iTotUnits.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
  iTotUnits.border = accountingDoubleBorder;

  [`F${endRowInv}`, `H${endRowInv}`, `I${endRowInv}`].forEach((cellRef) => {
    const c = invSheet.getCell(cellRef);
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
    c.border = accountingDoubleBorder;
  });
  invSheet.getRow(endRowInv).height = 24;

  // -------------------------------------------------------------
  // HOJA 3: CIERRE DE CAJA & ARQUEO FINANCIERO
  // -------------------------------------------------------------
  const cashSheet = workbook.addWorksheet('Cierre de Caja & Arqueo', {
    views: [{ showGridLines: true }],
  });

  cashSheet.columns = [
    { width: 44 }, // Concepto
    { width: 18 }, // N° Transacciones
    { width: 24 }, // Total Acumulado ($)
    { width: 16 }, // Participación %
  ];

  // Alturas de Filas del Masthead
  cashSheet.getRow(1).height = 30;
  cashSheet.getRow(2).height = 24;
  cashSheet.getRow(3).height = 22;
  cashSheet.getRow(4).height = 5; // Golden accent divider line

  // Colorear fondo de Filas 1 a 3 (Cols A a D)
  for (let r = 1; r <= 3; r++) {
    const row = cashSheet.getRow(r);
    for (let c = 1; c <= 4; c++) {
      const cell = row.getCell(c);
      if (c === 4) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2A1E14' },
        };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1A120B' },
        };
      }
    }
  }

  // Incrustar Logo (Top Left en Celda A1:A3)
  if (logoId !== null) {
    cashSheet.addImage(logoId, {
      tl: { col: 0.08, row: 0.16 },
      ext: { width: 68, height: 68 },
      editAs: 'undefined',
    });
  }

  cashSheet.mergeCells('B1:C1');
  const cTitle = cashSheet.getCell('B1');
  cTitle.value = 'LA MOLIENDA CAFÉ & BAR';
  cTitle.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFF59E0B' } };
  cTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  cTitle.border = { top: { style: 'thin', color: { argb: 'FFB45309' } } };

  cashSheet.mergeCells('B2:C2');
  const cSub = cashSheet.getCell('B2');
  cSub.value = 'CUADRE DE CAJA, ARQUEO Y MEDIOS DE PAGO';
  cSub.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  cSub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  cashSheet.mergeCells('B3:C3');
  const cMeta = cashSheet.getCell('B3');
  cMeta.value = `Balance de auditoría contable • Desarrollado por Ing. Juan Esteban Riascos`;
  cMeta.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FFD6C7B7' } };
  cMeta.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  cMeta.border = { bottom: { style: 'thin', color: { argb: 'FFB45309' } } };

  // Tarjeta derecha Col D
  const cCardHead = cashSheet.getCell('D1');
  cCardHead.value = 'CORTE FINANCIERO';
  cCardHead.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FFF59E0B' } };
  cCardHead.alignment = { vertical: 'middle', horizontal: 'center' };
  cCardHead.border = {
    top: { style: 'medium', color: { argb: 'FFD97706' } },
    left: { style: 'medium', color: { argb: 'FFD97706' } },
    right: { style: 'medium', color: { argb: 'FFD97706' } },
  };

  const cCardBody = cashSheet.getCell('D2');
  cCardBody.value = options?.periodLabel ? options.periodLabel.toUpperCase() : dateFormatted;
  cCardBody.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  cCardBody.alignment = { vertical: 'middle', horizontal: 'center' };
  cCardBody.border = {
    left: { style: 'medium', color: { argb: 'FFD97706' } },
    right: { style: 'medium', color: { argb: 'FFD97706' } },
  };

  const cCardFoot = cashSheet.getCell('D3');
  cCardFoot.value = `${completedSales.length} transacciones auditadas`;
  cCardFoot.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FF10B981' } };
  cCardFoot.alignment = { vertical: 'middle', horizontal: 'center' };
  cCardFoot.border = {
    bottom: { style: 'medium', color: { argb: 'FFD97706' } },
    left: { style: 'medium', color: { argb: 'FFD97706' } },
    right: { style: 'medium', color: { argb: 'FFD97706' } },
  };

  // Fila 4: Línea de acento dorado divisoria
  const divRowCash = cashSheet.getRow(4);
  for (let c = 1; c <= 4; c++) {
    const dCell = divRowCash.getCell(c);
    dCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD97706' },
    };
  }

  // Totales por medio de pago
  const cashSales = completedSales.filter((s) => s.paymentMethod === 'efectivo');
  const cardSales = completedSales.filter((s) => s.paymentMethod === 'tarjeta');
  const transferSales = completedSales.filter((s) => s.paymentMethod === 'transferencia');
  const mixedSales = completedSales.filter((s) => s.paymentMethod === 'mixto');

  const totalCash = cashSales.reduce((sum, s) => sum + s.total, 0);
  const totalCard = cardSales.reduce((sum, s) => sum + s.total, 0);
  const totalTransfer = transferSales.reduce((sum, s) => sum + s.total, 0);
  const totalMixed = mixedSales.reduce((sum, s) => sum + s.total, 0);

  const cashMetrics = [
    { label: 'Efectivo en Caja Física (Billetes & Monedas)', txs: cashSales.length, val: totalCash },
    { label: 'Tarjetas Débito / Crédito (Datáfono)', txs: cardSales.length, val: totalCard },
    { label: 'Transferencias Digitales (Nequi / Daviplata / QR)', txs: transferSales.length, val: totalTransfer },
    { label: 'Pagos Mixtos / Múltiples Medios', txs: mixedSales.length, val: totalMixed },
    { label: 'Propinas Voluntarias Recaudadas', txs: completedSales.filter((s) => s.tipAmount > 0).length, val: totalTips },
  ];

  const cashHeaders = [
    'Concepto / Medio de Pago',
    'N° Transacciones',
    'Total Acumulado ($)',
    'Participación %',
  ];
  const cHeadRow = cashSheet.addRow(cashHeaders);
  cHeadRow.height = 25;
  cHeadRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E1E14' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF4A3525' } },
      bottom: { style: 'medium', color: { argb: 'FFB45309' } },
      left: { style: 'thin', color: { argb: 'FF4A3525' } },
      right: { style: 'thin', color: { argb: 'FF4A3525' } },
    };
  });

  cashMetrics.forEach((m, idx) => {
    const isEven = idx % 2 === 0;
    const bgRowColor = isEven ? 'FFFFFFFF' : 'FFFAF6F0';
    const percent = totalGrand > 0 ? (m.val / totalGrand) * 100 : 0;

    const row = cashSheet.addRow([
      m.label,
      m.txs,
      m.val,
      `${percent.toFixed(1)}%`,
    ]);
    row.height = 22;

    row.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgRowColor } };
      cell.border = thinBorder;
      cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF1E130A' } };

      if (colNum === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.font = { name: 'Arial', size: 9.5, bold: true };
      } else if (colNum === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNum === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '$#,##0';
        cell.font = { name: 'Arial', size: 10, bold: true };
      } else if (colNum === 4) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF7C3A14' } };
      }
    });
  });

  // Fila Total Cierre de Caja
  const endRowCash = 6 + cashMetrics.length;
  const totCashRow = cashSheet.addRow([
    'TOTAL GENERAL RECAUDADO EN EL TURNO',
    completedSales.length,
    totalGrand,
    '100.0%',
  ]);
  totCashRow.height = 26;
  totCashRow.eachCell((cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF3E7' } };
    cell.border = accountingDoubleBorder;

    if (colNum === 1) {
      cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF4A2810' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    } else if (colNum === 2) {
      cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    } else if (colNum === 3) {
      cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF065F46' } };
      cell.numFmt = '$#,##0';
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    } else if (colNum === 4) {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF065F46' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });

  // Generar y descargar el archivo Excel enriquecido
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const cleanSuffix = (options?.filenameSuffix || `Consolidado_${new Date().toISOString().slice(0, 10)}`)
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_');
  anchor.download = `La_Molienda_Reporte_${cleanSuffix}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
