import { Employee, RentContract, RentPayment, PayrollRecord, FixedExpenseItem } from '../types';

export const initialEmployees: Employee[] = [
  {
    id: 'emp_user_admin_01',
    name: 'Andres',
    document: '',
    phone: '',
    role: 'Administrador',
    paymentType: 'quincenal',
    baseSalary: 0,
    isActive: true,
    startDate: '2026-01-01',
    bankInfo: '',
    notes: 'Administrador del sistema POS'
  },
  {
    id: 'emp_user_1792944906423_4dd9',
    name: 'Jorge',
    document: '',
    phone: '',
    role: 'Administrador',
    paymentType: 'quincenal',
    baseSalary: 0,
    isActive: true,
    startDate: '2026-01-01',
    bankInfo: '',
    notes: 'Administrador del sistema POS'
  },
  {
    id: 'emp_user_1792944953509_se0z',
    name: 'Majo',
    document: '',
    phone: '',
    role: 'Mesera / Atención',
    paymentType: 'quincenal',
    baseSalary: 0,
    isActive: true,
    startDate: '2026-01-01',
    bankInfo: '',
    notes: 'Atención y Servicio / Mesera'
  }
];

export const initialRentContracts: RentContract[] = [
  {
    id: 'rent-1',
    propertyName: 'Local Comercial La Molienda - Sede Principal',
    landlordName: 'Inmobiliaria & Propiedades del Café S.A.S.',
    landlordPhone: '310 987 6543',
    monthlyAmount: 3200000,
    paymentDueDay: 5,
    bankDetails: 'Bancolombia Cuenta Corriente # 230-001928-88',
    notes: 'Contrato a 2 años con opción de renovación. Incluye local y zona exterior de mesas.'
  }
];

export const initialRentPayments: RentPayment[] = [];

export const initialPayrollRecords: PayrollRecord[] = [];

export const initialFixedExpenses: FixedExpenseItem[] = [];

