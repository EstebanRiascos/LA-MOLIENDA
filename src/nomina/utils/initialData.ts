import { Employee, RentContract, RentPayment, PayrollRecord } from '../types';

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

export const initialRentPayments: RentPayment[] = [
  {
    id: 'pay-rent-1',
    contractId: 'rent-1',
    propertyName: 'Local Comercial La Molienda - Sede Principal',
    periodMonth: 'Octubre 2026',
    amount: 3200000,
    dueDate: '2026-10-05',
    paymentDate: '2026-10-04',
    status: 'pagado',
    paymentMethod: 'transferencia',
    receiptReference: 'TR-98234120',
    notes: 'Pagado puntualmente vía Bancolombia',
    createdAt: '2026-10-04T10:00:00Z'
  },
  {
    id: 'pay-rent-2',
    contractId: 'rent-1',
    propertyName: 'Local Comercial La Molienda - Sede Principal',
    periodMonth: 'Noviembre 2026',
    amount: 3200000,
    dueDate: '2026-11-05',
    paymentDate: '',
    status: 'pendiente',
    paymentMethod: 'transferencia',
    receiptReference: '',
    notes: 'Pendiente de pago antes del día 5',
    createdAt: '2026-11-01T08:00:00Z'
  }
];

export const initialPayrollRecords: PayrollRecord[] = [];

