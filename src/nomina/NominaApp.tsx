import React, { useState, useEffect } from 'react';
import { NominaSidebarLayout, NavSection } from './components/NominaSidebarLayout';
import { PayrollView } from './components/PayrollView';
import { EmployeesView } from './components/EmployeesView';
import { RentView } from './components/RentView';
import { ReportsView } from './components/ReportsView';
import { AmbientBackgroundCanvas } from '../components/AmbientBackgroundCanvas';
import {
  getStoredEmployees,
  saveStoredEmployees,
  getStoredPayrollRecords,
  saveStoredPayrollRecords,
  getStoredRentContracts,
  saveStoredRentContracts,
  getStoredRentPayments,
  saveStoredRentPayments,
} from './utils/nominaStorage';
import {
  syncEmployeesToCloud,
  syncPayrollRecordsToCloud,
  syncRentContractsToCloud,
  syncRentPaymentsToCloud,
} from '../utils/firebaseSync';
import { Employee, PayrollRecord, RentContract, RentPayment } from './types';
import './nomina.css';

interface NominaAppProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onLogout: () => void;
  onOpenFirebaseSync?: () => void;
  firebaseStatus?: string;
}

export const NominaApp: React.FC<NominaAppProps> = ({
  theme,
  onToggleTheme,
  onLogout,
  onOpenFirebaseSync,
  firebaseStatus = 'offline',
}) => {
  // Current active navigation
  const [currentSection, setCurrentSection] = useState<NavSection>('nomina');

  // Core Data States with LocalStorage persistence
  const [employees, setEmployees] = useState<Employee[]>(() => getStoredEmployees());
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(() => getStoredPayrollRecords());
  const [rentContracts, setRentContracts] = useState<RentContract[]>(() => getStoredRentContracts());
  const [rentPayments, setRentPayments] = useState<RentPayment[]>(() => getStoredRentPayments());

  // Escuchar actualizaciones remotas de Firebase en tiempo real
  useEffect(() => {
    const handleRemoteSync = () => {
      setEmployees(getStoredEmployees());
      setPayrollRecords(getStoredPayrollRecords());
      setRentContracts(getStoredRentContracts());
      setRentPayments(getStoredRentPayments());
    };

    window.addEventListener('lamolienda:nomina-synced', handleRemoteSync);
    return () => {
      window.removeEventListener('lamolienda:nomina-synced', handleRemoteSync);
    };
  }, []);

  // Persistir y sincronizar a Firebase ante cambios locales
  useEffect(() => {
    saveStoredEmployees(employees);
    syncEmployeesToCloud(employees);
  }, [employees]);

  useEffect(() => {
    saveStoredPayrollRecords(payrollRecords);
    syncPayrollRecordsToCloud(payrollRecords);
  }, [payrollRecords]);

  useEffect(() => {
    saveStoredRentContracts(rentContracts);
    syncRentContractsToCloud(rentContracts);
  }, [rentContracts]);

  useEffect(() => {
    saveStoredRentPayments(rentPayments);
    syncRentPaymentsToCloud(rentPayments);
  }, [rentPayments]);

  // Handlers for Employees
  const handleAddEmployee = (emp: Employee) => {
    setEmployees((prev) => [emp, ...prev]);
  };

  const handleUpdateEmployee = (emp: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.id === emp.id ? emp : e)));
  };

  const handleDeleteEmployee = (id: string) => {
    if (window.confirm('¿Deseas eliminar este colaborador?')) {
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    }
  };

  // Handlers for Payroll
  const handleAddPayrollRecord = (record: PayrollRecord) => {
    setPayrollRecords((prev) => [record, ...prev]);
  };

  const handleDeletePayrollRecord = (id: string) => {
    if (window.confirm('¿Deseas eliminar este registro de nómina?')) {
      setPayrollRecords((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleUpdatePayrollStatus = (id: string, status: 'pendiente' | 'pagado') => {
    setPayrollRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
  };

  // Handlers for Rent Payments
  const handleAddRentPayment = (payment: RentPayment) => {
    setRentPayments((prev) => [payment, ...prev]);
  };

  const handleDeleteRentPayment = (id: string) => {
    if (window.confirm('¿Deseas eliminar este comprobante de arriendo?')) {
      setRentPayments((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleUpdateRentStatus = (id: string, status: 'pendiente' | 'pagado' | 'vencido') => {
    setRentPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
  };

  const handleUpdateContract = (contract: RentContract) => {
    setRentContracts((prev) =>
      prev.map((c) => (c.id === contract.id ? contract : c))
    );
  };

  const pendingPayrollCount = payrollRecords.filter((r) => r.status === 'pendiente').length;
  const pendingRentCount = rentPayments.filter((p) => p.status === 'pendiente' || p.status === 'vencido').length;

  return (
    <>
      <AmbientBackgroundCanvas />
      <NominaSidebarLayout
        theme={theme}
        onToggleTheme={onToggleTheme}
        activeSection={currentSection}
        onChangeSection={setCurrentSection}
        pendingPayrollCount={pendingPayrollCount}
        pendingRentCount={pendingRentCount}
        onLogout={onLogout}
        onOpenFirebaseSync={onOpenFirebaseSync}
        firebaseStatus={firebaseStatus}
      >
        {currentSection === 'nomina' && (
          <PayrollView
            employees={employees}
            payrollRecords={payrollRecords}
            onAddRecord={handleAddPayrollRecord}
            onDeleteRecord={handleDeletePayrollRecord}
            onUpdateRecordStatus={handleUpdatePayrollStatus}
          />
        )}

        {currentSection === 'empleados' && (
          <EmployeesView
            employees={employees}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
          />
        )}

        {currentSection === 'arriendo' && (
          <RentView
            contracts={rentContracts}
            payments={rentPayments}
            onAddPayment={handleAddRentPayment}
            onDeletePayment={handleDeleteRentPayment}
            onUpdatePaymentStatus={handleUpdateRentStatus}
            onUpdateContract={handleUpdateContract}
          />
        )}

        {currentSection === 'reportes' && (
          <ReportsView
            payrollRecords={payrollRecords}
            rentPayments={rentPayments}
          />
        )}
      </NominaSidebarLayout>
    </>
  );
};
export default NominaApp;
