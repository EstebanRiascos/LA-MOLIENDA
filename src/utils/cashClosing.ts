import { CashClosingSummary } from '../types';
import { syncCashClosingsToCloud } from './firebaseSync';

const STORAGE_KEY = 'lamolienda_cash_closing_v1';

// Limpieza de historial antiguo de pruebas
try {
  if (localStorage.getItem('cashClosingHistory')) {
    localStorage.removeItem('cashClosingHistory');
  }
} catch {}

export const getCashClosingHistory = (): CashClosingSummary[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveCashClosingHistory = (history: CashClosingSummary[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    syncCashClosingsToCloud(history);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lamolienda:cash-closings-changed', { detail: history })
      );
    }
  } catch (err) {
    console.error('Error al guardar historial de cierres de caja:', err);
  }
};

