import { useState, useEffect } from "react";
import { maskCPF, validateCPF } from "../../utils/validation";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

interface CPFInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  id?: string;
}

export function CPFInput({ 
  value, 
  onChange, 
  label = "CPF", 
  placeholder = "000.000.000-00",
  required = false,
  error,
  id = "cpf"
}: CPFInputProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    setDisplayValue(maskCPF(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCPF(e.target.value);
    setDisplayValue(masked);
    onChange(masked);
    
    // Validate only if CPF appears complete
    if (masked.length === 14) {
      const valid = validateCPF(masked);
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
        type="text"
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
          CPF inválido
        </span>
      )}
      <p className="text-xs text-gray-600">Digite apenas os números do CPF</p>
    </div>
  );
}
