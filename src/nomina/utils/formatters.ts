export const formatCOP = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    return new Date(dateStr).toLocaleDateString('es-CO');
  } catch {
    return dateStr;
  }
};

