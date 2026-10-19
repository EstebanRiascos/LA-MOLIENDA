import React, { useState, useEffect } from 'react';
import { Product, Table, TableZone, SaleRecord, OrderItem, SystemStats } from './types';
import {
  getStoredProducts,
  saveStoredProducts,
  getStoredTables,
  saveStoredTables,
  getStoredSales,
  saveStoredSales,
  getStoredTheme,
  saveStoredTheme,
  getStoredCurrentStaff,
  saveStoredCurrentStaff,
  getStoredStaffList,
  calculateSystemStats,
} from './utils/storage';
import { DEFAULT_TABLES, DEFAULT_PRODUCTS } from './utils/defaults';
import { exportLaMoliendaReport } from './utils/excelExporter';

import { Header, ActiveSection } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { TablesView } from './components/TablesView';
import { PosView } from './components/PosView';
import { InventoryView } from './components/InventoryView';
import { SalesHistoryView } from './components/SalesHistoryView';

import { TableDetailModal } from './components/TableDetailModal';
import { PaymentModal } from './components/PaymentModal';
import { TicketModal } from './components/TicketModal';
import { ProductFormModal } from './components/ProductFormModal';
import { OpenTableModal } from './components/OpenTableModal';
import { SplitBillModal } from './components/SplitBillModal';
import { TableTransferModal } from './components/TableTransferModal';
import { CashClosingModal } from './components/CashClosingModal';
import { TableFormModal } from './components/TableFormModal';

export const App: React.FC = () => {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getStoredTheme());

  // Active section pill
  const [activeSection, setActiveSection] = useState<ActiveSection>('mesas');
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');

  const handleSectionChange = (newSec: ActiveSection) => {
    if (newSec === activeSection) return;
    const order: ActiveSection[] = ['mesas', 'pos', 'inventario', 'caja'];
    const oldIdx = order.indexOf(activeSection);
    const newIdx = order.indexOf(newSec);
    setSlideDirection(newIdx >= oldIdx ? 'right' : 'left');
    setActiveSection(newSec);
  };

  // Core data states
  const [products, setProducts] = useState<Product[]>(() => getStoredProducts());
  const [tables, setTables] = useState<Table[]>(() => getStoredTables());
  const [sales, setSales] = useState<SaleRecord[]>(() => getStoredSales());

  // Staff state
  const [currentStaff, setCurrentStaff] = useState<string>(() => getStoredCurrentStaff());
  const [staffList] = useState<string[]>(() => getStoredStaffList());

  // Notification state
  const [notification, setNotification] = useState<string | null>(null);

  // Modal states
  const [activeTableDetail, setActiveTableDetail] = useState<Table | null>(null);
  const [isTableDetailOpen, setIsTableDetailOpen] = useState(false);

  const [paymentTable, setPaymentTable] = useState<Table | null>(null);
  const [directPaymentItems, setDirectPaymentItems] = useState<OrderItem[] | null>(null);
  const [directPatronName, setDirectPatronName] = useState<string>('');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const [ticketSaleRecord, setTicketSaleRecord] = useState<SaleRecord | null>(null);
  const [ticketTable, setTicketTable] = useState<Table | null>(null);
  const [isTicketOpen, setIsTicketOpen] = useState(false);

  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isOpenTableModalOpen, setIsOpenTableModalOpen] = useState(false);
  const [preSelectedOpenTable, setPreSelectedOpenTable] = useState<Table | null>(null);

  const [splitBillTable, setSplitBillTable] = useState<Table | null>(null);
  const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);

  const [transferOriginTable, setTransferOriginTable] = useState<Table | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const [isCashClosingOpen, setIsCashClosingOpen] = useState(false);

  // Table management states
  const [isTableFormOpen, setIsTableFormOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  // Theme synchronization
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveStoredTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 3800);
  };

  // Staff switch
  const handleChangeStaff = (staff: string) => {
    setCurrentStaff(staff);
    saveStoredCurrentStaff(staff);
    showNotification(`Turno activo asignado a: ${staff}`);
  };

  // System Stats live calculation
  const stats: SystemStats = calculateSystemStats(tables, sales, products);

  // --- TABLE OPERATIONS ---
  const handleOpenNewTableForm = () => {
    setEditingTable(null);
    setIsTableFormOpen(true);
  };

  const handleEditTableForm = (table: Table) => {
    setEditingTable(table);
    setIsTableFormOpen(true);
  };

  const handleSaveTableForm = (data: {
    id?: string;
    number: string;
    zone: TableZone;
    capacity: number;
  }) => {
    if (data.id) {
      // Edit existing table
      const updated = tables.map((t) =>
        t.id === data.id
          ? {
              ...t,
              number: data.number,
              zone: data.zone,
              capacity: data.capacity,
            }
          : t
      );
      setTables(updated);
      saveStoredTables(updated);
      showNotification(`Espacio "${data.number}" actualizado correctamente.`);
    } else {
      // Create new table
      const newTable: Table = {
        id: `tbl-${data.zone}-${Date.now()}`,
        number: data.number,
        zone: data.zone,
        capacity: data.capacity,
        status: 'libre',
        items: [],
        subtotal: 0,
        total: 0,
      };
      const updated = [...tables, newTable];
      setTables(updated);
      saveStoredTables(updated);
      showNotification(`Nuevo espacio "${data.number}" agregado con éxito.`);
    }
    setIsTableFormOpen(false);
    setEditingTable(null);
  };

  const handleDeleteTable = (table: Table) => {
    if (table.status !== 'libre') {
      alert(
        `No puedes eliminar "${table.number}" porque tiene una cuenta activa o pre-cuenta. Debes cobrar o cancelar la cuenta primero.`
      );
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar permanentemente el espacio "${table.number}"?`
    );
    if (!confirmed) return;

    const updated = tables.filter((t) => t.id !== table.id);
    setTables(updated);
    saveStoredTables(updated);
    showNotification(`Espacio "${table.number}" eliminado del sistema.`);
  };

  const handleResetDefaultTables = () => {
    const hasActiveTables = tables.some((t) => t.status !== 'libre');
    if (hasActiveTables) {
      alert(
        'Hay mesas con cuentas activas. No se puede restablecer la distribución hasta cobrar o cerrar todas las cuentas.'
      );
      return;
    }
    const confirmed = window.confirm(
      '¿Deseas restablecer la distribución original de 16 mesas y barras? Se perderán las modificaciones personalizadas.'
    );
    if (!confirmed) return;

    setTables(DEFAULT_TABLES);
    saveStoredTables(DEFAULT_TABLES);
    showNotification('Distribución de mesas restablecida a valores predeterminados.');
  };

  const handleOpenTableModal = (table?: Table) => {
    setPreSelectedOpenTable(table || null);
    setIsOpenTableModalOpen(true);
  };

  const handleConfirmOpenTable = (
    tableId: string,
    patronName: string,
    waiter: string,
    pax: number
  ) => {
    const updated = tables.map((t) =>
      t.id === tableId
        ? {
            ...t,
            status: 'ocupada' as const,
            openedAt: new Date().toISOString(),
            patronName,
            waiter,
            capacity: pax,
            items: [],
            subtotal: 0,
            tipPercentage: 10,
            tipAmount: 0,
            total: 0,
          }
        : t
    );
    setTables(updated);
    saveStoredTables(updated);
    setIsOpenTableModalOpen(false);

    const opened = updated.find((t) => t.id === tableId);
    if (opened) {
      setActiveTableDetail(opened);
      setIsTableDetailOpen(true);
    }
    showNotification(`Mesa ${opened?.number} abierta para ${patronName}.`);
  };

  const handleSelectTable = (table: Table) => {
    setActiveTableDetail(table);
    setIsTableDetailOpen(true);
  };

  const handleUpdateTable = (updatedTable: Table) => {
    const updated = tables.map((t) => (t.id === updatedTable.id ? updatedTable : t));
    setTables(updated);
    saveStoredTables(updated);
    setActiveTableDetail(updatedTable);
  };

  const handleTransferTable = (table: Table) => {
    setTransferOriginTable(table);
    setIsTransferModalOpen(true);
  };

  const handleConfirmTransfer = (originId: string, destinationId: string) => {
    const origin = tables.find((t) => t.id === originId);
    const dest = tables.find((t) => t.id === destinationId);
    if (!origin || !dest) return;

    const updated = tables.map((t) => {
      if (t.id === destinationId) {
        return {
          ...t,
          status: 'ocupada' as const,
          openedAt: origin.openedAt || new Date().toISOString(),
          patronName: origin.patronName,
          waiter: origin.waiter,
          items: origin.items,
          subtotal: origin.subtotal,
          tipPercentage: origin.tipPercentage,
          tipAmount: origin.tipAmount,
          total: origin.total,
        };
      }
      if (t.id === originId) {
        return {
          ...t,
          status: 'libre' as const,
          openedAt: undefined,
          patronName: undefined,
          waiter: undefined,
          items: [],
          subtotal: 0,
          tipPercentage: 10,
          tipAmount: 0,
          total: 0,
        };
      }
      return t;
    });

    setTables(updated);
    saveStoredTables(updated);
    setIsTransferModalOpen(false);
    if (isTableDetailOpen) setIsTableDetailOpen(false);
    showNotification(`Cuenta trasladada con éxito de ${origin.number} a ${dest.number}.`);
  };

  // --- PRE-BILL / TICKET PREVIEW ---
  const handlePreBill = (table: Table) => {
    const updated = tables.map((t) =>
      t.id === table.id ? { ...t, status: 'por_cobrar' as const } : t
    );
    setTables(updated);
    saveStoredTables(updated);

    const currentT = updated.find((t) => t.id === table.id) || table;
    setTicketSaleRecord(null);
    setTicketTable(currentT);
    setIsTicketOpen(true);
  };

  const handleSplitBill = (table: Table) => {
    setSplitBillTable(table);
    setIsSplitBillOpen(true);
  };

  // --- CHECKOUT & PAYMENTS ---
  const handleCheckoutTable = (table: Table) => {
    setPaymentTable(table);
    setDirectPaymentItems(null);
    setDirectPatronName('');
    setIsPaymentOpen(true);
    if (isTableDetailOpen) setIsTableDetailOpen(false);
  };

  const handleDirectSaleCheckout = (items: OrderItem[], patronName?: string) => {
    setPaymentTable(null);
    setDirectPaymentItems(items);
    setDirectPatronName(patronName || 'Venta Rápida / Llevar');
    setIsPaymentOpen(true);
  };

  const handleCompletePayment = (saleRecord: SaleRecord, freedTableId?: string) => {
    // 1. Save Sale record
    const updatedSales = [saleRecord, ...sales];
    setSales(updatedSales);
    saveStoredSales(updatedSales);

    // 2. Deduct inventory stock for sold items
    const updatedProducts = products.map((prod) => {
      const soldItem = saleRecord.items.find((i) => i.productId === prod.id);
      if (soldItem) {
        const newStock = Math.max(0, prod.stock - soldItem.quantity);
        return { ...prod, stock: newStock };
      }
      return prod;
    });
    setProducts(updatedProducts);
    saveStoredProducts(updatedProducts);

    // 3. Free up table if table sale
    if (freedTableId) {
      const updatedTables = tables.map((t) =>
        t.id === freedTableId
          ? {
              ...t,
              status: 'libre' as const,
              openedAt: undefined,
              patronName: undefined,
              waiter: undefined,
              items: [],
              subtotal: 0,
              tipPercentage: 10,
              tipAmount: 0,
              total: 0,
            }
          : t
      );
      setTables(updatedTables);
      saveStoredTables(updatedTables);
    }

    // 4. Close payment modal & Open Receipt for Printing
    setIsPaymentOpen(false);
    setTicketSaleRecord(saleRecord);
    setTicketTable(null);
    setIsTicketOpen(true);

    showNotification(
      `Venta ${saleRecord.ticketNumber} registrada exitosamente (${saleRecord.paymentMethod.toUpperCase()}).`
    );
  };

  // --- POS TO TABLE DISPATCH ---
  const handleAddItemsToTable = (tableId: string, newItems: OrderItem[]) => {
    const updated = tables.map((t) => {
      if (t.id === tableId) {
        const mergedItems = [...t.items];
        newItems.forEach((ni) => {
          const existIdx = mergedItems.findIndex(
            (i) => i.productId === ni.productId && (!i.notes || i.notes.trim() === '')
          );
          if (existIdx >= 0) {
            mergedItems[existIdx].quantity += ni.quantity;
          } else {
            mergedItems.push(ni);
          }
        });

        const subtotal = mergedItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
        const tipAmount = Math.round(subtotal * ((t.tipPercentage || 10) / 100));
        const total = subtotal + tipAmount;

        return {
          ...t,
          status: 'ocupada' as const,
          openedAt: t.openedAt || new Date().toISOString(),
          waiter: t.waiter || currentStaff,
          items: mergedItems,
          subtotal,
          tipAmount,
          total,
        };
      }
      return t;
    });

    setTables(updated);
    saveStoredTables(updated);
  };

  // --- INVENTORY OPERATIONS ---
  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setIsProductFormOpen(true);
  };

  const handleEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setIsProductFormOpen(true);
  };

  const handleSaveProduct = (prod: Product) => {
    let updated: Product[];
    const exists = products.some((p) => p.id === prod.id);
    if (exists) {
      updated = products.map((p) => (p.id === prod.id ? prod : p));
      showNotification(`Producto "${prod.name}" actualizado.`);
    } else {
      updated = [prod, ...products];
      showNotification(`Nuevo producto "${prod.name}" registrado en catálogo.`);
    }
    setProducts(updated);
    saveStoredProducts(updated);
    setIsProductFormOpen(false);
  };

  const handleDeleteProduct = (productId: string) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    if (window.confirm(`¿Estás seguro de eliminar el producto "${target.name}"?`)) {
      const updated = products.filter((p) => p.id !== productId);
      setProducts(updated);
      saveStoredProducts(updated);
      showNotification(`Producto "${target.name}" eliminado del catálogo.`);
    }
  };

  const handleQuickUpdatePrice = (productId: string, newPrice: number) => {
    const updated = products.map((p) => (p.id === productId ? { ...p, price: newPrice } : p));
    setProducts(updated);
    saveStoredProducts(updated);
  };

  const handleQuickAdjustStock = (productId: string, delta: number) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        const newStock = Math.max(0, p.stock + delta);
        return { ...p, stock: newStock };
      }
      return p;
    });
    setProducts(updated);
    saveStoredProducts(updated);
  };

  // --- SALES HISTORY & CASH CLOSING ---
  const handleViewSaleTicket = (sale: SaleRecord) => {
    setTicketSaleRecord(sale);
    setTicketTable(null);
    setIsTicketOpen(true);
  };

  const handleConfirmCloseShift = (summaryNote: string) => {
    setIsCashClosingOpen(false);
    showNotification('Arqueo de caja y cierre de turno registrados con éxito.');
  };

  // --- EXPORT TO EXCEL ---
  const handleExportExcel = async () => {
    try {
      await exportLaMoliendaReport(sales, products, tables);
      showNotification('Reporte oficial de La Molienda descargado en Excel (.xlsx).');
    } catch (err: any) {
      alert(`Error al generar reporte Excel: ${err.message}`);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <Header
        theme={theme}
        onToggleTheme={handleToggleTheme}
        activeSection={activeSection}
        onChangeSection={handleSectionChange}
        onOpenNewTable={() => handleOpenTableModal()}
        onOpenNewProduct={handleOpenNewProduct}
        onExportExcel={handleExportExcel}
        activeTablesCount={stats.activeTablesCount}
        lowStockCount={stats.lowStockAlertCount}
        todaySalesCount={stats.todayOrdersCount}
        currentStaff={currentStaff}
        staffList={staffList}
        onChangeStaff={handleChangeStaff}
      />

      {/* Main Content Area */}
      <main className="app-main">
        {/* Floating Toast Notification */}
        {notification && (
          <div className="toast-notification">
            <span className="toast-check">✓</span>
            <span>{notification}</span>
          </div>
        )}

        {/* Top KPI Statistics Strip */}
        <StatsCards stats={stats} />

        {/* Section 1: Mesas & Cuentas (Floor map & Live orders) */}
        {activeSection === 'mesas' && (
          <div key="mesas" className={`view-slider-container ${slideDirection === 'right' ? 'slide-from-right' : 'slide-from-left'}`}>
            <TablesView
              tables={tables}
              products={products}
              onSelectTable={handleSelectTable}
              onOpenTable={(t) => handleOpenTableModal(t)}
              onPreBill={handlePreBill}
              onCheckout={handleCheckoutTable}
              onTransferTable={handleTransferTable}
              onQuickAddItem={(tableId, prodId) => {
                const prod = products.find((p) => p.id === prodId);
                if (prod) {
                  handleAddItemsToTable(tableId, [
                    {
                      id: `quick-${Date.now()}`,
                      productId: prod.id,
                      productName: prod.name,
                      productImage: prod.image,
                      unitPrice: prod.price,
                      quantity: 1,
                      status: 'pending',
                    },
                  ]);
                }
              }}
              onOpenNewTableForm={handleOpenNewTableForm}
              onEditTableForm={handleEditTableForm}
              onDeleteTable={handleDeleteTable}
              onResetDefaultTables={handleResetDefaultTables}
            />
          </div>
        )}

        {/* Section 2: Punto de Venta (POS) & Menú Visual */}
        {activeSection === 'pos' && (
          <div key="pos" className={`view-slider-container ${slideDirection === 'right' ? 'slide-from-right' : 'slide-from-left'}`}>
            <PosView
              products={products}
              tables={tables}
              onAddItemsToTable={handleAddItemsToTable}
              onDirectSaleCheckout={handleDirectSaleCheckout}
              onShowNotification={showNotification}
            />
          </div>
        )}

        {/* Section 3: Gestión de Inventario & Precios */}
        {activeSection === 'inventario' && (
          <div key="inventario" className={`view-slider-container ${slideDirection === 'right' ? 'slide-from-right' : 'slide-from-left'}`}>
            <InventoryView
              products={products}
              onOpenNewProduct={handleOpenNewProduct}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProduct}
              onQuickUpdatePrice={handleQuickUpdatePrice}
              onQuickAdjustStock={handleQuickAdjustStock}
              onShowNotification={showNotification}
            />
          </div>
        )}

        {/* Section 4: Caja, Arqueo & Historial de Ventas */}
        {activeSection === 'caja' && (
          <div key="caja" className={`view-slider-container ${slideDirection === 'right' ? 'slide-from-right' : 'slide-from-left'}`}>
            <SalesHistoryView
              sales={sales}
              onViewSaleTicket={handleViewSaleTicket}
              onOpenCashClosing={() => setIsCashClosingOpen(true)}
              onExportExcel={handleExportExcel}
            />
          </div>
        )}
      </main>

      {/* MODALS */}

      {/* 1. Table Order Detail Drawer */}
      <TableDetailModal
        isOpen={isTableDetailOpen}
        table={activeTableDetail}
        products={products}
        onClose={() => setIsTableDetailOpen(false)}
        onUpdateTable={handleUpdateTable}
        onOpenCheckout={handleCheckoutTable}
        onOpenPreBill={handlePreBill}
        onOpenSplitBill={handleSplitBill}
        onOpenTransfer={handleTransferTable}
        onShowNotification={showNotification}
      />

      {/* 2. Checkout / Payment Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        table={paymentTable}
        directItems={directPaymentItems || undefined}
        directPatronName={directPatronName}
        onClose={() => setIsPaymentOpen(false)}
        onCompletePayment={handleCompletePayment}
      />

      {/* 3. Thermal Receipt / Pre-bill Modal */}
      <TicketModal
        isOpen={isTicketOpen}
        onClose={() => setIsTicketOpen(false)}
        saleRecord={ticketSaleRecord}
        table={ticketTable}
      />

      {/* 4. Product & Price Form Modal */}
      <ProductFormModal
        isOpen={isProductFormOpen}
        onClose={() => setIsProductFormOpen(false)}
        onSave={handleSaveProduct}
        initialData={editingProduct}
      />

      {/* 5. Open Table Modal */}
      <OpenTableModal
        isOpen={isOpenTableModalOpen}
        tables={tables}
        preSelectedTable={preSelectedOpenTable}
        staffList={staffList}
        currentStaff={currentStaff}
        onClose={() => setIsOpenTableModalOpen(false)}
        onConfirmOpen={handleConfirmOpenTable}
      />

      {/* 6. Split Bill Modal */}
      <SplitBillModal
        isOpen={isSplitBillOpen}
        table={splitBillTable}
        onClose={() => setIsSplitBillOpen(false)}
        onShowNotification={showNotification}
      />

      {/* 7. Table Transfer Modal */}
      <TableTransferModal
        isOpen={isTransferModalOpen}
        originTable={transferOriginTable}
        tables={tables}
        onClose={() => setIsTransferModalOpen(false)}
        onConfirmTransfer={handleConfirmTransfer}
      />

      {/* 8. Cash Register Closing Modal */}
      <CashClosingModal
        isOpen={isCashClosingOpen}
        sales={sales}
        currentStaff={currentStaff}
        onClose={() => setIsCashClosingOpen(false)}
        onConfirmCloseShift={handleConfirmCloseShift}
      />

      {/* 9. Table / Bar Add & Edit Modal */}
      <TableFormModal
        isOpen={isTableFormOpen}
        table={editingTable}
        existingTables={tables}
        onClose={() => {
          setIsTableFormOpen(false);
          setEditingTable(null);
        }}
        onSave={handleSaveTableForm}
      />
    </div>
  );
};

export default App;
