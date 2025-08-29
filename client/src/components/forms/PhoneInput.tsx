import { useState, useEffect } from "react";
import { maskPhone, validatePhone } from "../../utils/validation";
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
  placeholder = "(11) 99999-9999",
  required = false,
  error,
  id = "phone"
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    setDisplayValue(maskPhone(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskPhone(e.target.value);
    setDisplayValue(masked);
    onChange(masked);
    
    // Validate if phone appears complete
    if (masked.length >= 14) {
      const valid = validatePhone(masked);
      setIsValid(valid);
    } else {
      setIsValid(null);
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
