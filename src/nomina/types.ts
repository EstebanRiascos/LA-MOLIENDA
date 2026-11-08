export type PaymentPeriodType = 'quincenal' | 'mensual' | 'diario' | 'por_turno';

export interface Employee {
  id: string;
  name: string;
  document: string;
  phone: string;
  role: string;
  paymentType: PaymentPeriodType;
  baseSalary: number;
  isActive: boolean;
  startDate: string;
  bankInfo?: string;
  notes?: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  baseAmount: number;
  bonuses: number;
  deductions: number;
  netPaid: number;
  status: 'pendiente' | 'pagado';
  paymentMethod: 'efectivo' | 'transferencia' | 'nequi' | 'daviplata';
  notes?: string;
  createdAt: string;
}

export interface RentContract {
  id: string;
  propertyName: string;
  landlordName: string;
  landlordPhone: string;
  monthlyAmount: number;
  paymentDueDay: number;
  bankDetails?: string;
  notes?: string;
}

export interface RentPayment {
  id: string;
  contractId: string;
  propertyName: string;
  periodMonth: string; // Ej: "Noviembre 2026"
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: 'pendiente' | 'pagado' | 'vencido';
  paymentMethod?: 'transferencia' | 'efectivo' | 'consignacion';
  receiptReference?: string;
  notes?: string;
  createdAt: string;
}

export type FixedExpenseCategory = 'servicios_publicos' | 'permisos_legales' | 'aseo_dotacion';
export type ExpensePaymentStatus = 'pendiente' | 'pagado' | 'vencido';
export type ExpensePaymentMethod = 'efectivo' | 'transferencia' | 'nequi' | 'daviplata' | 'tarjeta';

export interface FixedExpenseItem {
  id: string;
  category: FixedExpenseCategory;
  subCategory: string;
  title: string;
  periodMonth: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: ExpensePaymentStatus;
  paymentMethod?: ExpensePaymentMethod;
  receiptReference?: string;
  provider?: string;
  notes?: string;
  createdAt: string;
}

