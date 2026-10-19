import ExcelJS from 'exceljs';
import { SaleRecord, Product, Table } from '../types';

export async function exportLaMoliendaReport(
  sales: SaleRecord[],
  products: Product[],
  tables: Table[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'La Molienda Café Bar';
  workbook.lastModifiedBy = 'La Molienda POS';
  workbook.created = new Date();
  workbook.modified = new Date();

  // -------------------------------------------------------------
  // HOJA 1: REGISTRO DE VENTAS & TICKETS
  // -------------------------------------------------------------
  const salesSheet = workbook.addWorksheet('Historial de Ventas', {
    views: [{ showGridLines: true }],
  });

  // Título
  salesSheet.mergeCells('A1:J1');
  const title1 = salesSheet.getCell('A1');
  title1.value = 'LA MOLIENDA CAFÉ BAR — REPORTE GENERAL DE VENTAS Y FACTURACIÓN';
  title1.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  title1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2A1E14' }, // Espresso Dark Brown
  };
  title1.alignment = { vertical: 'middle', horizontal: 'center' };
  salesSheet.getRow(1).height = 32;

  // Subtítulo
  salesSheet.mergeCells('A2:J2');
  const sub1 = salesSheet.getCell('A2');
  sub1.value = `Generado el: ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')} | Total Ventas Registradas: ${sales.length}`;
  sub1.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF715842' } };
  sub1.alignment = { vertical: 'middle', horizontal: 'center' };
  salesSheet.getRow(2).height = 20;

  salesSheet.addRow([]);

  // Cabeceras Ventas
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
  const salesHeaderRow = salesSheet.addRow(salesHeaders);
  salesHeaderRow.height = 24;
  salesHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF7C3A14' }, // Warm Amber Brown
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD5C7B7' } },
      bottom: { style: 'medium', color: { argb: 'FF2A1E14' } },
    };
  });

  // Filas de ventas
  sales.forEach((s) => {
    const dateFormatted = new Date(s.date).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    const row = salesSheet.addRow([
      s.ticketNumber,
      dateFormatted,
      s.tableNumber,
      s.zone.toUpperCase(),
      s.waiter,
      s.subtotal,
      s.tipAmount,
      s.total,
      s.paymentMethod.toUpperCase(),
      s.referenceNumber || '-',
    ]);
    row.height = 20;

    // Formato de moneda para columnas F, G, H
    [6, 7, 8].forEach((colIdx) => {
      const cell = row.getCell(colIdx);
      cell.numFmt = '$#,##0';
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    });
  });

  // Ajuste ancho columnas Hoja 1
  salesSheet.columns = [
    { width: 16 },
    { width: 18 },
    { width: 14 },
    { width: 14 },
    { width: 22 },
    { width: 14 },
    { width: 14 },
    { width: 16 },
    { width: 16 },
    { width: 22 },
  ];

  // -------------------------------------------------------------
  // HOJA 2: INVENTARIO, PRECIOS & COSTOS
  // -------------------------------------------------------------
  const invSheet = workbook.addWorksheet('Inventario & Precios', {
    views: [{ showGridLines: true }],
  });

  invSheet.mergeCells('A1:I1');
  const title2 = invSheet.getCell('A1');
  title2.value = 'LA MOLIENDA CAFÉ BAR — CATÁLOGO DE PRODUCTOS, PRECIOS Y STOCK';
  title2.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  title2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };
  title2.alignment = { vertical: 'middle', horizontal: 'center' };
  invSheet.getRow(1).height = 32;

  invSheet.mergeCells('A2:I2');
  const sub2 = invSheet.getCell('A2');
  sub2.value = `Control de márgenes comerciales y alertas de stock mínimo | Total Referencias: ${products.length}`;
  sub2.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  sub2.alignment = { vertical: 'middle', horizontal: 'center' };
  invSheet.getRow(2).height = 20;

  invSheet.addRow([]);

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
  const invHeaderRow = invSheet.addRow(invHeaders);
  invHeaderRow.height = 24;
  invHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' }, // Deep Emerald Teal
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  products.forEach((p) => {
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
    row.height = 20;

    // Currency for Cost & Price
    [4, 5].forEach((colIdx) => {
      const cell = row.getCell(colIdx);
      cell.numFmt = '$#,##0';
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    });

    // Color alert for status cell
    const statusCell = row.getCell(9);
    statusCell.alignment = { vertical: 'middle', horizontal: 'center' };
    if (p.stock === 0) {
      statusCell.font = { color: { argb: 'FFE11D48' }, bold: true };
    } else if (isLow) {
      statusCell.font = { color: { argb: 'FFD97706' }, bold: true };
    } else {
      statusCell.font = { color: { argb: 'FF059669' } };
    }
  });

  invSheet.columns = [
    { width: 12 },
    { width: 34 },
    { width: 22 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 14 },
    { width: 14 },
    { width: 16 },
  ];

  // -------------------------------------------------------------
  // HOJA 3: CIERRE DE CAJA & ARQUEO FINANCIERO
  // -------------------------------------------------------------
  const cashSheet = workbook.addWorksheet('Cierre de Caja & Arqueo', {
    views: [{ showGridLines: true }],
  });

  cashSheet.mergeCells('A1:E1');
  const title3 = cashSheet.getCell('A1');
  title3.value = 'LA MOLIENDA CAFÉ BAR — CUADRE DE CAJA Y MEDIOS DE PAGO';
  title3.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  title3.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2A1E14' },
  };
  title3.alignment = { vertical: 'middle', horizontal: 'center' };
  cashSheet.getRow(1).height = 32;

  cashSheet.addRow([]);

  // Calculate totals
  const totalCash = sales
    .filter((s) => s.paymentMethod === 'efectivo' && s.status === 'completada')
    .reduce((sum, s) => sum + s.total, 0);

  const totalCard = sales
    .filter((s) => s.paymentMethod === 'tarjeta' && s.status === 'completada')
    .reduce((sum, s) => sum + s.total, 0);

  const totalTransfer = sales
    .filter((s) => s.paymentMethod === 'transferencia' && s.status === 'completada')
    .reduce((sum, s) => sum + s.total, 0);

  const totalMixed = sales
    .filter((s) => s.paymentMethod === 'mixto' && s.status === 'completada')
    .reduce((sum, s) => sum + s.total, 0);

  const totalTips = sales
    .filter((s) => s.status === 'completada')
    .reduce((sum, s) => sum + s.tipAmount, 0);

  const grandTotal = sales
    .filter((s) => s.status === 'completada')
    .reduce((sum, s) => sum + s.total, 0);

  const metrics = [
    ['Total en Efectivo (Caja Física)', totalCash],
    ['Total en Tarjetas Débito / Crédito (Datáfono)', totalCard],
    ['Total en Transferencias (Nequi / Daviplata / QR)', totalTransfer],
    ['Total en Pagos Mixtos', totalMixed],
    ['Total de Propinas Voluntarias Recaudadas', totalTips],
    ['TOTAL RECAUDADO DE VENTAS', grandTotal],
  ];

  cashSheet.addRow(['Concepto de Arqueo', 'Total Acumulado ($)']);
  const headRow = cashSheet.getRow(3);
  headRow.height = 24;
  headRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3A14' } };
  headRow.getCell(2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3A14' } };

  metrics.forEach(([label, val], idx) => {
    const r = cashSheet.addRow([label, val]);
    r.height = 22;
    r.getCell(2).numFmt = '$#,##0';
    if (idx === metrics.length - 1) {
      r.getCell(1).font = { bold: true, size: 11 };
      r.getCell(2).font = { bold: true, size: 11, color: { argb: 'FF059669' } };
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5E6D3' } };
      r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5E6D3' } };
    }
  });

  cashSheet.columns = [{ width: 42 }, { width: 24 }];

  // Descarga en navegador
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `La_Molienda_Reporte_${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
