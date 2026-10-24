import { Product, Table, SaleRecord, SystemStats } from '../types';
import { DEFAULT_PRODUCTS, DEFAULT_TABLES, DEFAULT_SALES } from './defaults';

const STORAGE_KEY_PRODUCTS = 'lamolienda_products_clean_v1';
const STORAGE_KEY_TABLES = 'lamolienda_tables_clean_v1';
const STORAGE_KEY_SALES = 'lamolienda_sales_clean_v1';
const STORAGE_KEY_THEME = 'lamolienda_theme_v1';
const STORAGE_KEY_STAFF = 'lamolienda_current_staff_v2';
const STORAGE_KEY_STAFF_LIST = 'lamolienda_staff_list_v2';

export const DEFAULT_STAFF_LIST = [
  'Administrador',
];

export function resetAllDataToProduction(): void {
  try {
    localStorage.removeItem('lamolienda_tables_v1');
    localStorage.removeItem('lamolienda_sales_v1');
    localStorage.removeItem('lamolienda_products_v1');
    localStorage.removeItem('lamolienda_tables_prod_v2');
    localStorage.removeItem('lamolienda_tables_prod_v3');
    localStorage.removeItem('lamolienda_tables_prod_v4');
    localStorage.removeItem('lamolienda_sales_prod_v2');
    localStorage.removeItem('lamolienda_products_prod_v2');
    localStorage.removeItem(STORAGE_KEY_TABLES);
    localStorage.removeItem(STORAGE_KEY_SALES);
    localStorage.removeItem(STORAGE_KEY_PRODUCTS);
  } catch (err) {
    console.error('Error resetting production data:', err);
  }
}

// --- PRODUCTS & PRICES ---
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
    return parsed;
  } catch (err) {
    console.error('Error loading products from storage:', err);
    return DEFAULT_PRODUCTS;
  }
}

export function saveStoredProducts(products: Product[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
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

    // Asegurar que cada mesa tenga coordenadas y propiedades del plano
    const synchronized = parsed.map((t, idx) => {
      const defaultMatch = DEFAULT_TABLES.find((d) => d.id === t.id);
      return {
        ...t,
        tipPercentage: t.tipPercentage ?? 0,
        tipAmount: t.tipAmount ?? 0,
        posX: t.posX ?? defaultMatch?.posX ?? 25 + ((idx * 15) % 60),
        posY: t.posY ?? defaultMatch?.posY ?? 40 + Math.floor(idx / 4) * 15,
        rotation: t.rotation ?? defaultMatch?.rotation ?? 0,
        shape: t.shape ?? defaultMatch?.shape ?? 'square',
      };
    });

    return synchronized;
  } catch (err) {
    console.error('Error loading tables from storage:', err);
    return DEFAULT_TABLES;
  }
}

export function saveStoredTables(tables: Table[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(tables));
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
