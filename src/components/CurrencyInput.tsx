import { useState, useEffect, forwardRef } from "react";
import { Input } from "@/components/ui/input";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, placeholder = "R$ 0,00", className, disabled }, ref) => {
    const [displayValue, setDisplayValue] = useState("");

    // Função para formatar valor como moeda brasileira
    const formatCurrency = (val: string): string => {
      // Remove tudo que não é dígito
      const numbers = val.replace(/\D/g, "");
      
      // Se não há números, retorna R$ 0,00
      if (numbers === "") return "R$ 0,00";
      
      // Converte para centavos (divide por 100)
      const amount = parseInt(numbers) / 100;
      
      // Formata como moeda brasileira
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    // Função para extrair valor numérico do display
    const extractNumericValue = (displayVal: string): string => {
      const numbers = displayVal.replace(/\D/g, "");
      return numbers;
    };

    // Atualiza display quando value prop muda
    useEffect(() => {
      if (value === "" || value === "0") {
        setDisplayValue("R$ 0,00");
      } else {
        // Se value já é um número, formata
        const numericValue = value.replace(/\D/g, "");
        if (numericValue) {
          setDisplayValue(formatCurrency(numericValue));
        }
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Remove formatação atual para trabalhar apenas com números
      const currentNumbers = displayValue.replace(/\D/g, "");
      const newNumbers = inputValue.replace(/\D/g, "");
      
      // Se o usuário está digitando (adicionando números)
      if (newNumbers.length > currentNumbers.length) {
        // Adiciona o novo dígito
        const updatedNumbers = newNumbers;
        const formatted = formatCurrency(updatedNumbers);
        setDisplayValue(formatted);
        onChange(updatedNumbers);
      } else if (newNumbers.length < currentNumbers.length) {
        // Se o usuário está apagando
        if (newNumbers === "") {
          setDisplayValue("R$ 0,00");
          onChange("0");
        } else {
          const formatted = formatCurrency(newNumbers);
          setDisplayValue(formatted);
          onChange(newNumbers);
        }
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Permite apenas números, backspace, delete, tab, escape, enter
      const allowedKeys = [
        "Backspace", "Delete", "Tab", "Escape", "Enter",
        "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"
      ];
      
      if (allowedKeys.includes(e.key)) {
        return;
      }
      
      // Permite apenas números
      if (!/\d/.test(e.key)) {
        e.preventDefault();
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Seleciona todo o texto quando foca
      e.target.select();
    };

    const handleBlur = () => {
      // Garante que sempre há um valor válido
      if (displayValue === "R$ 0,00" || displayValue === "") {
        setDisplayValue("R$ 0,00");
        onChange("0");
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        style={{ textAlign: "left" }}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
