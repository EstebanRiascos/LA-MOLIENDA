export type ProductCategory =
  | 'cafe'
  | 'cocktails'
  | 'beers'
  | 'bakery'
  | 'brunch'
  | 'cold_drinks'
  | 'snacks';

export interface RecipeIngredient {
  productId: string;
  productName?: string;
  quantity: number; // Cantidad del insumo a descontar (ej: 1 unidad de Coronita)
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: number; // Precio de Venta al público
  cost: number; // Costo base de insumos
  stock: number; // Cantidad disponible
  minStock: number; // Umbral de alerta de stock bajo
  reservedStock?: number; // Cantidad seleccionada en comandas activas o mesas
  originalStock?: number; // Stock base en bodega
  unit: 'unidad' | 'copa' | 'botella' | 'porción' | 'trago';
  image: string; // URL o base64
  available: boolean;
  isComposite?: boolean; // true si es un producto preparado/receta (descuenta stock de sus insumos)
  recipe?: RecipeIngredient[]; // Insumos que se descuentan al venderse
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  unitPrice: number;
  quantity: number;
  notes?: string; // Ej: "Leche de almendras", "Sin azúcar", "Poco hielo", "Doble shot"
  sentToBarAt?: string;
  status: 'pending' | 'preparing' | 'served';
}

export type TableZone = 'salon' | 'terraza' | 'barra' | 'takeaway';

export type TableStatus = 'libre' | 'ocupada' | 'por_cobrar' | 'reservada';

export interface Table {
  id: string;
  number: string; // Ej: "Mesa 1", "Mesa 2", "Terraza 1", "Barra 1", "Takeaway 1"
  zone: TableZone;
  capacity: number;
  status: TableStatus;
  openedAt?: string; // ISO date string
  patronName?: string; // Nombre del cliente o grupo
  waiter?: string; // Mesero/Barista asignado
  items: OrderItem[];
  subtotal: number;
  taxRate?: number; // Impuesto opcional (ej: 0.08)
  tipPercentage?: number; // 0, 10, 15
  tipAmount?: number;
  total: number;
  // Campos de Reserva de Mesa
  reservationGroupId?: string; // Identificador compartido cuando varias mesas se reservan en conjunto
  reservationName?: string;
  reservationPhone?: string;
  reservationDate?: string; // YYYY-MM-DD
  reservationTime?: string; // HH:mm
  reservationPax?: number;
  reservationNotes?: string;
  // Propiedades opcionales para el Plano 3D / Arquitectónico
  posX?: number; // Coordenada X porcentual (0 - 100)
  posY?: number; // Coordenada Y porcentual (0 - 100)
  rotation?: number; // Ángulo de rotación en grados (ej: 0, 45, 90)
  shape?: 'square' | 'round' | 'bar' | 'booth';
}

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';

export interface SaleRecord {
  id: string;
  ticketNumber: string; // Ej: "LM-2026-0001"
  date: string; // ISO string
  tableNumber: string;
  zone: TableZone;
  waiter: string;
  patronName?: string;
  customerDocument?: string;
  items: OrderItem[];
  subtotal: number;
  discount?: number;
  tipAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  changeGiven?: number;
  referenceNumber?: string; // Voucher de tarjeta o comprobante de transferencia
  status: 'completada' | 'anulada';
}

export interface SystemStats {
  todaySales: number;
  todayOrdersCount: number;
  activeTablesCount: number;
  totalTablesCount: number;
  openAccountsAmount: number;
  lowStockAlertCount: number;
  averageTicket: number;
}

export interface CashClosingSummary {
  id: string;
  closedAt: string;
  cashier: string;
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  totalMixed?: number;
  totalTips: number;
  totalSales: number;
  salesCount: number;
  actualCashCounted: number;
  cashDifference: number;
  note?: string;
}

export type UserRole = 'admin' | 'cajero' | 'mesero';

export interface SystemUser {
  id: string;
  username: string; // ej: "admin"
  name: string; // ej: "Administrador Principal"
  role: UserRole;
  password?: string; // Para administradores o acceso con credenciales
  pin?: string; // 4 dígitos numéricos para acceso rápido o táctil (ej: "1234")
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export type NotificationType = 'prebill' | 'order' | 'table' | 'inventory' | 'system';

export interface AppNotification {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  tableName?: string;
  tableId?: string;
}

// Re-export Nomina and Arriendo types
export * from '../nomina/types';


