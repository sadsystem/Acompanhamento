// Hora de Brasília (independe do relógio do dispositivo)
export function nowInBrazil(): Date {
  const local = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  return new Date(local);
}

export function toDateRefBR(d?: Date): string {
  const x = d ?? nowInBrazil();
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Função para calcular período de dias atrás
export function getDateRangeBR(daysBack: number): { from: string; to: string } {
  const today = nowInBrazil();
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - daysBack);
  
  return {
    from: toDateRefBR(fromDate),
    to: toDateRefBR(today)
  };
}

// Período padrão para dashboard (últimos 7 dias)
export function getDefaultDashboardPeriod(): { from: string; to: string } {
  return getDateRangeBR(7);
}

export function formatDateTimeBR(d?: Date): string {
  const x = d ?? nowInBrazil();
  const dd = String(x.getDate()).padStart(2, '0');
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const yy = x.getFullYear();
  const hh = String(x.getHours()).padStart(2, '0');
  const mi = String(x.getMinutes()).padStart(2, '0');
  const ss = String(x.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${mi}:${ss}`;
}

export function formatDateTimeBRdash(d?: Date): string {
  const dt = formatDateTimeBR(d);
  const [date, time] = dt.split(' ');
  return `${date} - ${time}`;
}

// Converter data YYYY-MM-DD para DD-MM-YYYY
export function formatDateBR(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}-${month}-${year}`;
}
