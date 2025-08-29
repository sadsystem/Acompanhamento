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
  placeholder = "(87) 9 XXXX-XXXX",
  required = false,
  error,
  id = "phone"
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (value) {
      setDisplayValue(formatPhone(value));
    } else {
      setDisplayValue("(87) 9 ");
    }
  }, [value]);

  const formatPhone = (phone: string) => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Always ensure it starts with 879
    let cleanDigits = digits;
    if (!cleanDigits.startsWith('879')) {
      cleanDigits = '879' + cleanDigits.substring(cleanDigits.startsWith('87') ? 2 : 0);
    }
    
    // Format: (87) 9 XXXX-XXXX
    if (cleanDigits.length <= 3) {
      return "(87) 9 ";
    } else if (cleanDigits.length <= 7) {
      return `(87) 9 ${cleanDigits.slice(3)}`;
    } else {
      return `(87) 9 ${cleanDigits.slice(3, 7)}-${cleanDigits.slice(7, 11)}`;
    }
  };

  const validatePEPhone = (phone: string): boolean => {
    const phoneRegex = /^\(87\) 9 \d{4}-\d{4}$/;
    return phoneRegex.test(phone);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatPhone(rawValue);
    
    setDisplayValue(formatted);
    onChange(formatted);
    
    // Validate phone
    if (formatted.length >= 15) {
      const valid = validatePEPhone(formatted);
      setIsValid(valid);
    } else {
      setIsValid(null);
    }
  };

  const handleFocus = () => {
    if (!displayValue || displayValue === "(87) 9 ") {
      const defaultValue = "(87) 9 ";
      setDisplayValue(defaultValue);
      onChange(defaultValue);
    }
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
        className={`
          ${error ? 'border-red-500 ring-red-500' : ''}
          ${isValid === true ? 'border-green-500' : ''}
          ${isValid === false ? 'border-red-500' : ''}
        `}
        data-testid={`input-${id}`}
      />
      {error && (
        <span className="text-xs text-red-600" data-testid={`error-${id}`}>
          {error}
        </span>
      )}
      {isValid === false && !error && (
        <span className="text-xs text-red-600" data-testid={`validation-error-${id}`}>
          Telefone inválido
        </span>
      )}
    </div>
  );
}
