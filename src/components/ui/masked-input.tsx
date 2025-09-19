import { forwardRef, useState, useEffect } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask: 'currency' | 'number';
  value?: string;
  onChange?: (value: string) => void;
}

const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, mask, value = '', onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(value);

    // 🔧 CORREÇÃO: Atualizar displayValue quando value prop muda
    useEffect(() => {
      if (value !== displayValue) {
        if (mask === 'currency') {
          setDisplayValue(formatCurrency(value));
        } else if (mask === 'number') {
          setDisplayValue(formatNumber(value));
        } else {
          setDisplayValue(value);
        }
      }
    }, [value, mask]);

    const formatCurrency = (value: string) => {
      const numericValue = value.replace(/\D/g, '');
      if (!numericValue) return '';

      const number = parseInt(numericValue, 10) / 100;
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
      }).format(number);
    };

    const formatNumber = (value: string) => {
      const numericValue = value.replace(/\D/g, '');
      if (!numericValue) return '';

      return new Intl.NumberFormat('pt-BR').format(parseInt(numericValue, 10));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      let formattedValue = '';
      let rawValue = '';

      if (mask === 'currency') {
        formattedValue = formatCurrency(inputValue);
        rawValue = inputValue.replace(/\D/g, '');
      } else if (mask === 'number') {
        formattedValue = formatNumber(inputValue);
        rawValue = inputValue.replace(/\D/g, '');
      }

      setDisplayValue(formattedValue);
      onChange?.(rawValue);
    };

    return (
      <Input
        {...props}
        ref={ref}
        className={cn("", className)}
        value={displayValue}
        onChange={handleInputChange}
      />
    );
  }
);

MaskedInput.displayName = "MaskedInput";

export { MaskedInput };