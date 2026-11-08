import { Employee, PayrollRecord, RentContract, RentPayment, FixedExpenseItem } from '../types';
import {
  initialEmployees,
  initialRentContracts,
  initialRentPayments,
  initialPayrollRecords,
  initialFixedExpenses,
} from './initialData';

const KEYS = {
  employees: 'la_molienda_employees',
  payrollRecords: 'la_molienda_payroll_records',
  rentContracts: 'la_molienda_rent_contracts',
  rentPayments: 'la_molienda_rent_payments',
  fixedExpenses: 'la_molienda_fixed_expenses',
};

export const getStoredEmployees = (): Employee[] => {
  try {
    const raw = localStorage.getItem(KEYS.employees);
    if (raw) {
      const parsed: Employee[] = JSON.parse(raw);
      // Depurar colaboradores demo antiguos si aún persisten en caché local
      const hasOldDemo = parsed.some(
        (e) =>
          e.id === 'emp-1' ||
          e.id === 'emp-2' ||
          e.id === 'emp-3' ||
          e.name === 'Carlos Andrés Mendoza' ||
          e.name === 'Valentina Restrepo' ||
          e.name === 'Julián David Gómez'
      );
      if (!hasOldDemo && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading employees from localStorage', e);
  }
  saveStoredEmployees(initialEmployees);
  return initialEmployees;
};

export const saveStoredEmployees = (employees: Employee[]): void => {
  try {
    localStorage.setItem(KEYS.employees, JSON.stringify(employees));
  } catch (e) {
    console.error('Error saving employees to localStorage', e);
  }
};

export const getStoredPayrollRecords = (): PayrollRecord[] => {
  try {
    const raw = localStorage.getItem(KEYS.payrollRecords);
    if (raw) {
      const parsed: PayrollRecord[] = JSON.parse(raw);
      // Depurar registros demo
      const hasOldDemo = parsed.some(
        (p) =>
          p.id === 'pay-rec-1' ||
          p.id === 'pay-rec-2' ||
          p.employeeName === 'Carlos Andrés Mendoza' ||
          p.employeeName === 'Valentina Restrepo'
      );
      if (hasOldDemo) {
        const cleaned = parsed.filter(
          (p) =>
            p.id !== 'pay-rec-1' &&
            p.id !== 'pay-rec-2' &&
            p.employeeName !== 'Carlos Andrés Mendoza' &&
            p.employeeName !== 'Valentina Restrepo'
        );
        saveStoredPayrollRecords(cleaned);
        return cleaned;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error loading payroll records from localStorage', e);
  }
  return initialPayrollRecords;
};

export const saveStoredPayrollRecords = (records: PayrollRecord[]): void => {
  try {
    localStorage.setItem(KEYS.payrollRecords, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving payroll records to localStorage', e);
  }
};

export const getStoredRentContracts = (): RentContract[] => {
  try {
    const raw = localStorage.getItem(KEYS.rentContracts);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading rent contracts from localStorage', e);
  }
  return initialRentContracts;
};

export const saveStoredRentContracts = (contracts: RentContract[]): void => {
  try {
    localStorage.setItem(KEYS.rentContracts, JSON.stringify(contracts));
  } catch (e) {
    console.error('Error saving rent contracts to localStorage', e);
  }
};

export const getStoredRentPayments = (): RentPayment[] => {
  try {
    const raw = localStorage.getItem(KEYS.rentPayments);
    if (raw) {
      const parsed: RentPayment[] = JSON.parse(raw);
      // Depurar pagos de arriendo demo antiguos si persisten en caché local
      const hasOldDemo = parsed.some(
        (p) => p.id === 'pay-rent-1' || p.id === 'pay-rent-2' || p.receiptReference === 'TR-98234120'
      );
      if (hasOldDemo) {
        const cleaned = parsed.filter(
          (p) => p.id !== 'pay-rent-1' && p.id !== 'pay-rent-2' && p.receiptReference !== 'TR-98234120'
        );
        saveStoredRentPayments(cleaned);
        return cleaned;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error loading rent payments from localStorage', e);
  }
  return initialRentPayments;
};

export const saveStoredRentPayments = (payments: RentPayment[]): void => {
  try {
    localStorage.setItem(KEYS.rentPayments, JSON.stringify(payments));
  } catch (e) {
    console.error('Error saving rent payments to localStorage', e);
  }
};

export const getStoredFixedExpenses = (): FixedExpenseItem[] => {
  try {
    const raw = localStorage.getItem(KEYS.fixedExpenses);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading fixed expenses from localStorage', e);
  }
  return initialFixedExpenses;
};

export const saveStoredFixedExpenses = (expenses: FixedExpenseItem[]): void => {
  try {
    localStorage.setItem(KEYS.fixedExpenses, JSON.stringify(expenses));
  } catch (e) {
    console.error('Error saving fixed expenses to localStorage', e);
  }
};

