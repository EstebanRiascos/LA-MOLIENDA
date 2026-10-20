export type ProductCategory =
  | 'cafe'
  | 'cocktails'
  | 'beers'
  | 'bakery'
  | 'brunch'
  | 'cold_drinks'
  | 'snacks';

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
  closedAt: string;
  cashier: string;
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  totalTips: number;
  totalSales: number;
  salesCount: number;
}
