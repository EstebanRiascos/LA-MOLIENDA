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

export const PRODUCT_IMAGE_PRESETS: { label: string; category: ProductCategory; url: string }[] = [
  {
    label: 'Espresso Doble',
    category: 'cafe',
    url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Cappuccino Latte Art',
    category: 'cafe',
    url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Cold Brew con Hielo',
    category: 'cafe',
    url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Carajillo / Cóctel de Café',
    category: 'cocktails',
    url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Gin Tonic con Romero',
    category: 'cocktails',
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Espresso Martini',
    category: 'cocktails',
    url: 'https://images.unsplash.com/photo-1574056067201-ac83dca60944?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Mojito Menta Clásico',
    category: 'cocktails',
    url: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Aperol Spritz',
    category: 'cocktails',
    url: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Cerveza IPA Artesanal',
    category: 'beers',
    url: 'https://images.unsplash.com/photo-1608278243343-7f212285a73e?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Copa Vino Tinto Malbec',
    category: 'beers',
    url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Croissant Francés',
    category: 'bakery',
    url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Tarta Vasca de Queso',
    category: 'bakery',
    url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Brownie con Helado',
    category: 'bakery',
    url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Tostón Aguacate & Huevo',
    category: 'brunch',
    url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Waffles con Frutos Rojos',
    category: 'brunch',
    url: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Sándwich Artesanal Roast Beef',
    category: 'brunch',
    url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Soda Italiana Silvestre',
    category: 'cold_drinks',
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Limonada de Coco',
    category: 'cold_drinks',
    url: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Tabla de Quesos & Jamones',
    category: 'snacks',
    url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
  },
];

export const DEFAULT_PRODUCTS: Product[] = [];

export const DEFAULT_TABLES: Table[] = [
  // --- SALÓN PRINCIPAL (8 Mesas Cuadradas a 45° + 1 Hacia Baños + 1 Lounge Booth) ---
  { id: 'tbl-salon-1', number: 'Mesa 01', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 26, posY: 56, rotation: 45, shape: 'square' },
  { id: 'tbl-salon-2', number: 'Mesa 02', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 35, posY: 46, rotation: 45, shape: 'square' },
  { id: 'tbl-salon-3', number: 'Mesa 03', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 34, posY: 64, rotation: 45, shape: 'square' },
  { id: 'tbl-salon-4', number: 'Mesa 04', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 45, posY: 46, rotation: 45, shape: 'square' },
  { id: 'tbl-salon-5', number: 'Mesa 05', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 44, posY: 63, rotation: 45, shape: 'square' },
  { id: 'tbl-salon-6', number: 'Mesa 06', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 53, posY: 34, rotation: 45, shape: 'square' },
  { id: 'tbl-salon-7', number: 'Mesa 07', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 54, posY: 48, rotation: 45, shape: 'square' },
  { id: 'tbl-salon-8', number: 'Mesa 08', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 64, posY: 43, rotation: 45, shape: 'square' },
  { id: 'tbl-salon-9', number: 'Mesa 09', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 64, posY: 58, rotation: 45, shape: 'round' },
  { id: 'tbl-salon-10', number: 'Mesa 10 (Lounge)', zone: 'salon', capacity: 6, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 24, posY: 77, rotation: 0, shape: 'booth' },

  // --- BARRAS & COUNTERS DEL PLANO ---
  { id: 'tbl-barra-1', number: 'Barra Cerveza', zone: 'barra', capacity: 5, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 31, posY: 32, rotation: 18, shape: 'bar' },
  { id: 'tbl-barra-2', number: 'Barra Vinos & Café', zone: 'barra', capacity: 5, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 46, posY: 24, rotation: 18, shape: 'bar' },
  { id: 'tbl-barra-3', number: 'Barra Cocineta', zone: 'barra', capacity: 3, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0, posX: 58, posY: 22, rotation: -20, shape: 'bar' },
];

export const DEFAULT_SALES: SaleRecord[] = [];

