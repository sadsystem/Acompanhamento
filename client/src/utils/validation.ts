export function digitsOnly(s: string): string {
  return s.replace(/\D+/g, "");
}

export function maskCPF(s: string): string {
  const d = digitsOnly(s).slice(0, 11);
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, dg) => 
    `${a}.${b}.${c}${dg ? '-' + dg : ''}`
  );
}

export function validateCPF(cpf: string): boolean {
  const d = digitsOnly(cpf);
  
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) {
    return false;
  }
  
  const calc = (base: string, factor: number): number => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += parseInt(base[i]) * (factor - i);
    }
    const rest = sum % 11;
    return (rest < 2) ? 0 : 11 - rest;
  };
  
  const d1 = calc(d.slice(0, 9), 10);
  const d2 = calc(d.slice(0, 10), 11);
  
  return d.endsWith(String(d1) + String(d2));
}

export function maskPhone(s: string): string {
  const d = digitsOnly(s).slice(0, 11);
  
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, a, b, c) => 
      c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : a ? `(${a}` : ''
    );
  } else {
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) => 
      c ? `(${a}) ${b}-${c}` : `(${a}) ${b}`
    );
  }
}

export function validatePhone(phone: string): boolean {
  const d = digitsOnly(phone);
  return d.length >= 10 && d.length <= 11;
}
