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
