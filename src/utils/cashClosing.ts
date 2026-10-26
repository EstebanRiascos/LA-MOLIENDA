import { CashClosingSummary } from '../types';

const STORAGE_KEY = 'lamolienda_cash_closing_v1';

// Limpieza de historial antiguo de pruebas
try {
  if (localStorage.getItem('cashClosingHistory')) {
    localStorage.removeItem('cashClosingHistory');
  }
} catch {}

export const getCashClosingHistory = (): CashClosingSummary[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const saveCashClosingHistory = (history: CashClosingSummary[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
};

