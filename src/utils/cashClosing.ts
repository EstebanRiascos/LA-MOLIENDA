import { CashClosingSummary } from '../types';

const STORAGE_KEY = 'cashClosingHistory';

export const getCashClosingHistory = (): CashClosingSummary[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const saveCashClosingHistory = (history: CashClosingSummary[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
};
