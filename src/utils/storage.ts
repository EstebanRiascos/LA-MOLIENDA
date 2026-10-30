import { Product, Table, SaleRecord, SystemStats, OrderItem } from '../types';
import { DEFAULT_PRODUCTS, DEFAULT_TABLES, DEFAULT_SALES } from './defaults';
import { syncProductsToCloud, syncTablesToCloud, syncSalesToCloud } from './firebaseSync';

const STORAGE_KEY_PRODUCTS = 'lamolienda_products_v3';
const STORAGE_KEY_TABLES = 'lamolienda_tables_v3';
const STORAGE_KEY_SALES = 'lamolienda_sales_v3';
const STORAGE_KEY_THEME = 'lamolienda_theme_v1';
const STORAGE_KEY_STAFF = 'lamolienda_current_staff_v2';
const STORAGE_KEY_STAFF_LIST = 'lamolienda_staff_list_v2';

// Auto-limpieza garantizada de versiones y datos de prueba al iniciar el sistema
try {
  const legacyKeys = [
    'lamolienda_tables_v1',
    'lamolienda_sales_v1',
    'lamolienda_products_v1',
    'lamolienda_tables_prod_v2',
    'lamolienda_tables_prod_v3',
    'lamolienda_tables_prod_v4',
    'lamolienda_sales_prod_v2',
    'lamolienda_products_prod_v2',
    'lamolienda_tables_clean_v1',
    'lamolienda_sales_clean_v1',
    'lamolienda_products_clean_v1',
    'cashClosingHistory',
  ];
  legacyKeys.forEach((key) => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
    }
  });
} catch {}

export const DEFAULT_STAFF_LIST = [
  'Administrador',
];

export function resetAllDataToProduction(): void {
  try {
    const keys = [
      'lamolienda_tables_v1',
      'lamolienda_sales_v1',
      'lamolienda_products_v1',
      'lamolienda_tables_prod_v2',
      'lamolienda_tables_prod_v3',
      'lamolienda_tables_prod_v4',
      'lamolienda_sales_prod_v2',
      'lamolienda_products_prod_v2',
      'lamolienda_tables_clean_v1',
      'lamolienda_sales_clean_v1',
      'lamolienda_products_clean_v1',
      'cashClosingHistory',
      'lamolienda_cash_closing_v1',
      STORAGE_KEY_TABLES,
      STORAGE_KEY_SALES,
      STORAGE_KEY_PRODUCTS,
    ];
    keys.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
    saveStoredProducts(DEFAULT_PRODUCTS);
    saveStoredTables(DEFAULT_TABLES);
    saveStoredSales(DEFAULT_SALES);
  } catch (err) {
    console.error('Error resetting production data:', err);
  }
}

// --- PRODUCTS & RECIPES & INVENTORY ---

/**
 * Calcula el stock disponible para un producto.
 * Si es compuesto (receta), el stock se calcula en base al menor número de porciones
 * que se pueden preparar según las existencias de sus insumos.
 */
export function calculateEffectiveStock(product: Product, allProducts: Product[]): number {
  if (product.isComposite && product.recipe && product.recipe.length > 0) {
    let minBatches = Infinity;
    for (const ing of product.recipe) {
      const ingProd = allProducts.find((p) => p.id === ing.productId);
      if (!ingProd) return 0;
      const qtyNeeded = ing.quantity > 0 ? ing.quantity : 1;
      const batches = Math.floor(ingProd.stock / qtyNeeded);
      if (batches < minBatches) {
        minBatches = batches;
      }
    }
    return minBatches === Infinity ? 0 : Math.max(0, minBatches);
  }
  return product.stock;
}

/**
 * Re-sincroniza el stock de todos los productos compuestos para que reflejen
 * en tiempo real las existencias actuales de sus insumos vinculados.
 */
export function syncCompositeProductsStock(productsList: Product[]): Product[] {
  return productsList.map((prod) => {
    if (prod.isComposite && prod.recipe && prod.recipe.length > 0) {
      return {
        ...prod,
        stock: calculateEffectiveStock(prod, productsList),
      };
    }
    return prod;
  });
}

/**
 * Descuenta el inventario tras una venta (comanda completa o cobro parcial).
 * Si un ítem vendido es compuesto (ej: Michelada), descuenta sus ingredientes (ej: Coronita);
 * si es directo, descuenta su stock normal.
 */
export function deductInventoryForSale(currentProducts: Product[], soldItems: OrderItem[]): Product[] {
  let updatedList = currentProducts.map((p) => ({ ...p }));

  soldItems.forEach((soldItem) => {
    const prod = updatedList.find((p) => p.id === soldItem.productId);
    if (!prod) return;

    if (prod.isComposite && prod.recipe && prod.recipe.length > 0) {
      // Producto compuesto: descuenta los insumos asignados
      prod.recipe.forEach((ingredient) => {
        const ingIndex = updatedList.findIndex((p) => p.id === ingredient.productId);
        if (ingIndex !== -1) {
          const qtyNeeded = (ingredient.quantity > 0 ? ingredient.quantity : 1) * soldItem.quantity;
          updatedList[ingIndex] = {
            ...updatedList[ingIndex],
            stock: Math.max(0, updatedList[ingIndex].stock - qtyNeeded),
          };
        }
      });
    } else {
      // Producto simple directo
      const prodIndex = updatedList.findIndex((p) => p.id === prod.id);
      if (prodIndex !== -1) {
        updatedList[prodIndex] = {
          ...updatedList[prodIndex],
          stock: Math.max(0, updatedList[prodIndex].stock - soldItem.quantity),
        };
      }
    }
  });

  return syncCompositeProductsStock(updatedList);
}

export function getStoredProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (!raw) {
      saveStoredProducts(DEFAULT_PRODUCTS);
      return DEFAULT_PRODUCTS;
    }
    const parsed: Product[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      saveStoredProducts(DEFAULT_PRODUCTS);
      return DEFAULT_PRODUCTS;
    }
    return syncCompositeProductsStock(parsed);
  } catch (err) {
    console.error('Error loading products from storage:', err);
    return DEFAULT_PRODUCTS;
  }
}

export function saveStoredProducts(products: Product[]): void {
  try {
    const synced = syncCompositeProductsStock(products);
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(synced));
    syncProductsToCloud(synced);
  } catch (err) {
    console.error('Error saving products:', err);
  }
}

// --- TABLES & ACCOUNTS ---
export function getStoredTables(): Table[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TABLES);
    if (!raw) {
      saveStoredTables(DEFAULT_TABLES);
      return DEFAULT_TABLES;
    }
    const parsed: Table[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveStoredTables(DEFAULT_TABLES);
      return DEFAULT_TABLES;
    }

    // Regla del negocio: 10 mesas ("Mesa 01" a "Mesa 10") y 3 barras ("Barra 1", "Barra 2", "Barra 3"), capacidad 4
    let needsResave = false;
    const validTableIds = new Set(DEFAULT_TABLES.map((d) => d.id));

    if (parsed.length !== DEFAULT_TABLES.length || parsed.some((t) => !validTableIds.has(t.id))) {
      needsResave = true;
    }

    const synchronized: Table[] = DEFAULT_TABLES.map((defTable, idx) => {
      // Buscar si ya existía en localStorage por ID o número
      const existing = parsed.find(
        (t) =>
          t.id === defTable.id ||
          (t.number &&
            (t.number.trim().toLowerCase() === defTable.number.toLowerCase() ||
             t.number.replace(/\s*\(.*?\)/g, '').trim().toLowerCase() === defTable.number.toLowerCase() ||
             (defTable.zone === 'salon' && (t.number.toLowerCase() === `mesa ${idx + 1}`.toLowerCase() || t.number.toLowerCase() === `mesa 0${idx + 1}`.toLowerCase()))))
      );

      const cleanNumber = defTable.number;
      const cleanCapacity = 4;

      if (existing) {
        if (
          existing.number !== cleanNumber ||
          existing.capacity !== cleanCapacity ||
          existing.zone !== defTable.zone
        ) {
          needsResave = true;
        }

        return {
          ...existing,
          id: defTable.id,
          number: cleanNumber,
          zone: defTable.zone,
          capacity: cleanCapacity,
          tipPercentage: existing.tipPercentage ?? 0,
          tipAmount: existing.tipAmount ?? 0,
          posX: existing.posX ?? defTable.posX,
          posY: existing.posY ?? defTable.posY,
          rotation: existing.rotation ?? defTable.rotation,
          shape: defTable.shape || existing.shape || (defTable.zone === 'barra' ? 'bar' : 'square'),
        };
      }

      needsResave = true;
      return { ...defTable };
    });

    if (needsResave) {
      saveStoredTables(synchronized);
    }

    return synchronized;
  } catch (err) {
    console.error('Error loading tables from storage:', err);
    saveStoredTables(DEFAULT_TABLES);
    return DEFAULT_TABLES;
  }
}

export function saveStoredTables(tables: Table[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(tables));
    syncTablesToCloud(tables);
  } catch (err) {
    console.error('Error saving tables:', err);
  }
}

// --- SALES HISTORY ---
export function getStoredSales(): SaleRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SALES);
    if (!raw) {
      saveStoredSales(DEFAULT_SALES);
      return DEFAULT_SALES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      saveStoredSales(DEFAULT_SALES);
      return DEFAULT_SALES;
    }
    return parsed;
  } catch (err) {
    console.error('Error loading sales from storage:', err);
    return DEFAULT_SALES;
  }
}

export function saveStoredSales(sales: SaleRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(sales));
    syncSalesToCloud(sales);
  } catch (err) {
    console.error('Error saving sales:', err);
  }
}

// --- THEME ---
export function getStoredTheme(): 'dark' | 'light' {
  try {
    const theme = localStorage.getItem(STORAGE_KEY_THEME);
    return theme === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function saveStoredTheme(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  } catch {}
}

// --- STAFF ---
export function getStoredCurrentStaff(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_STAFF) || DEFAULT_STAFF_LIST[0];
  } catch {
    return DEFAULT_STAFF_LIST[0];
  }
}

export function saveStoredCurrentStaff(staff: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_STAFF, staff);
  } catch {}
}

export function getStoredStaffList(): string[] {
  try {
    if (localStorage.getItem('lamolienda_staff_list_v1')) {
      localStorage.removeItem('lamolienda_staff_list_v1');
      localStorage.removeItem('lamolienda_current_staff_v1');
      saveStoredStaffList(DEFAULT_STAFF_LIST);
      return DEFAULT_STAFF_LIST;
    }

    const raw = localStorage.getItem(STORAGE_KEY_STAFF_LIST);
    if (!raw) {
      saveStoredStaffList(DEFAULT_STAFF_LIST);
      return DEFAULT_STAFF_LIST;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_STAFF_LIST;
  }
}

export function saveStoredStaffList(list: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_STAFF_LIST, JSON.stringify(list));
  } catch {}
}

// --- SYSTEM STATS CALCULATOR ---
export function calculateSystemStats(
  tables: Table[],
  sales: SaleRecord[],
  products: Product[]
): SystemStats {
  // Today's date filter (YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySalesRecords = sales.filter(
    (s) => s.status === 'completada' && s.date.slice(0, 10) === todayStr
  );

  const todaySales = todaySalesRecords.reduce((sum, s) => sum + s.total, 0);
  const todayOrdersCount = todaySalesRecords.length;

  const activeTables = tables.filter((t) => t.status === 'ocupada' || t.status === 'por_cobrar');
  const activeTablesCount = activeTables.length;
  const totalTablesCount = tables.length;

  const openAccountsAmount = activeTables.reduce((sum, t) => sum + (t.total || t.subtotal || 0), 0);

  const lowStockAlertCount = products.filter((p) => p.stock <= p.minStock).length;

  const averageTicket = todayOrdersCount > 0 ? Math.round(todaySales / todayOrdersCount) : 0;

  return {
    todaySales,
    todayOrdersCount,
    activeTablesCount,
    totalTablesCount,
    openAccountsAmount,
    lowStockAlertCount,
    averageTicket,
  };
}

// --- CURRENCY FORMATTER ---
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}
