import { Employee, PayrollRecord, RentContract, RentPayment } from '../types';
import {
  initialEmployees,
  initialRentContracts,
  initialRentPayments,
  initialPayrollRecords,
} from './initialData';

const KEYS = {
  employees: 'la_molienda_employees',
  payrollRecords: 'la_molienda_payroll_records',
  rentContracts: 'la_molienda_rent_contracts',
  rentPayments: 'la_molienda_rent_payments',
};

export const getStoredEmployees = (): Employee[] => {
  try {
    const raw = localStorage.getItem(KEYS.employees);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading employees from localStorage', e);
  }
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
    if (raw) return JSON.parse(raw);
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
    if (raw) return JSON.parse(raw);
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

