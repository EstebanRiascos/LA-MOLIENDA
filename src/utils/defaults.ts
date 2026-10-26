import { Product, Table, SaleRecord, ProductCategory } from '../types';

export const CATEGORIES: { id: ProductCategory; label: string; icon: string }[] = [
  { id: 'cafe', label: 'Café & Especialidad', icon: '☕' },
  { id: 'cocktails', label: 'Cócteles de Autor', icon: '🍸' },
  { id: 'beers', label: 'Cervezas & Vinos', icon: '🍺' },
  { id: 'bakery', label: 'Panadería & Repostería', icon: '🥐' },
  { id: 'brunch', label: 'Desayunos & Brunch', icon: '🥑' },
  { id: 'cold_drinks', label: 'Bebidas Frías & Sodas', icon: '🍹' },
  { id: 'snacks', label: 'Tapas & Picadas', icon: '🧀' },
];

export const PRODUCT_IMAGE_PRESETS: { label: string; category: ProductCategory; url: string }[] = [];

export const DEFAULT_PRODUCTS: Product[] = [];

export const DEFAULT_TABLES: Table[] = [
  // --- SALÓN PRINCIPAL (10 Mesas de 4 personas) ---
  { id: 'tbl-salon-1', number: 'Mesa 01', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 26, posY: 56, rotation: 45, shape: 'square' },
  { id: 'tbl-salon-2', number: 'Mesa 02', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 35, posY: 46, rotation: 45, shape: 'square' },
  { id: 'tbl-salon-3', number: 'Mesa 03', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 34, posY: 64, rotation: 45, shape: 'square' },
  { id: 'tbl-salon-4', number: 'Mesa 04', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 45, posY: 46, rotation: 45, shape: 'square' },
  { id: 'tbl-salon-5', number: 'Mesa 05', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 44, posY: 63, rotation: 45, shape: 'square' },
  { id: 'tbl-salon-6', number: 'Mesa 06', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 53, posY: 34, rotation: 45, shape: 'square' },
  { id: 'tbl-salon-7', number: 'Mesa 07', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 54, posY: 48, rotation: 45, shape: 'square' },
  { id: 'tbl-salon-8', number: 'Mesa 08', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 64, posY: 43, rotation: 45, shape: 'square' },
  { id: 'tbl-salon-9', number: 'Mesa 09', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 64, posY: 58, rotation: 45, shape: 'round' },
  { id: 'tbl-salon-10', number: 'Mesa 10', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 24, posY: 77, rotation: 0, shape: 'booth' },

  // --- BARRAS (3 Barras Predeterminadas) ---
  { id: 'tbl-barra-1', number: 'Barra 1', zone: 'barra', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 31, posY: 32, rotation: 18, shape: 'bar' },
  { id: 'tbl-barra-2', number: 'Barra 2', zone: 'barra', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 46, posY: 24, rotation: 18, shape: 'bar' },
  { id: 'tbl-barra-3', number: 'Barra 3', zone: 'barra', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 58, posY: 22, rotation: -20, shape: 'bar' },
];

export const DEFAULT_SALES: SaleRecord[] = [];

