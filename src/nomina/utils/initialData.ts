import { Employee, RentContract, RentPayment, PayrollRecord } from '../types';

export const initialEmployees: Employee[] = [
  {
    id: 'emp-1',
    name: 'Carlos Andrés Mendoza',
    document: '1.098.452.112',
    phone: '312 456 7890',
    role: 'Barista Principal',
    paymentType: 'quincenal',
    baseSalary: 850000,
    isActive: true,
    startDate: '2026-02-01',
    bankInfo: 'Bancolombia Ahorros # 104-582910-12',
    notes: 'Turno tarde y noche'
  },
  {
    id: 'emp-2',
    name: 'Valentina Restrepo',
    document: '1.143.892.401',
    phone: '320 889 1234',
    role: 'Atención y Servicio / Mesera',
    paymentType: 'quincenal',
    baseSalary: 750000,
    isActive: true,
    startDate: '2026-03-15',
    bankInfo: 'Nequi 3208891234',
    notes: 'Turno fines de semana y festivos'
  },
  {
    id: 'emp-3',
    name: 'Julián David Gómez',
    document: '1.088.223.901',
    phone: '315 765 4321',
    role: 'Cajero / Administrador',
    paymentType: 'quincenal',
    baseSalary: 950000,
    isActive: true,
    startDate: '2026-01-10',
    bankInfo: 'Daviplata 3157654321',
    notes: 'Apertura y cierre de caja'
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

export const initialPayrollRecords: PayrollRecord[] = [
  {
    id: 'pay-rec-1',
    employeeId: 'emp-1',
    employeeName: 'Carlos Andrés Mendoza',
    periodStart: '2026-10-16',
    periodEnd: '2026-10-31',
    paymentDate: '2026-10-31',
    baseAmount: 850000,
    bonuses: 50000,
    deductions: 0,
    netPaid: 900000,
    status: 'pagado',
    paymentMethod: 'transferencia',
    notes: 'Quincena 2 de Octubre + Bono puntualidad',
    createdAt: '2026-10-31T18:00:00Z'
  },
  {
    id: 'pay-rec-2',
    employeeId: 'emp-2',
    employeeName: 'Valentina Restrepo',
    periodStart: '2026-10-16',
    periodEnd: '2026-10-31',
    paymentDate: '2026-10-31',
    baseAmount: 750000,
    bonuses: 35000,
    deductions: 0,
    netPaid: 785000,
    status: 'pagado',
    paymentMethod: 'nequi',
    notes: 'Quincena 2 de Octubre',
    createdAt: '2026-10-31T18:30:00Z'
  }
];

