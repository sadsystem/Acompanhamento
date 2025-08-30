import { useState, useEffect } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  id?: string;
}

export function PhoneInput({ 
  value, 
  onChange, 
  label = "Telefone", 
  placeholder = "(XX) 9 XXXX-XXXX",
  required = false,
  error,
  id = "phone"
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (value) {
      setDisplayValue(formatPhone(value));
    } else {
      setDisplayValue("");
    }
  }, [value]);

  const formatPhone = (phone: string) => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Format: (XX) 9 XXXX-XXXX
    if (digits.length === 0) {
      return "";
    } else if (digits.length <= 2) {
      return `(${digits}`;
    } else if (digits.length <= 3) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatPhone(rawValue);
    
    setDisplayValue(formatted);
    onChange(formatted);
  };

  const handleFocus = () => {
    // Não define mais valor padrão no foco
  };

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>
        {label} {required && <span className="text-red-600">*</span>}
      </Label>
      <Input
        id={id}
        type="tel"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={error ? 'border-red-500 ring-red-500' : ''}
        data-testid={`input-${id}`}
      />
      {error && (
        <span className="text-xs text-red-600" data-testid={`error-${id}`}>
          {error}
        </span>
      )}
    </div>
  );
}
