import { useState, useEffect, forwardRef } from "react";
import { Input } from "@/components/ui/input";

interface PercentageInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const PercentageInput = forwardRef<HTMLInputElement, PercentageInputProps>(
  ({ value, onChange, placeholder = "0%", className, disabled }, ref) => {
    const [displayValue, setDisplayValue] = useState("");

    // Função para formatar valor como porcentagem
    const formatPercentage = (val: string): string => {
      // Remove tudo que não é dígito
      const numbers = val.replace(/\D/g, "");
      
      // Se não há números, retorna 0%
      if (numbers === "") return "0%";
      
      // Converte para número e formata
      const percentage = parseInt(numbers);
      
      // Limita a 100%
      const limitedPercentage = Math.min(percentage, 100);
      
      return `${limitedPercentage}%`;
    };

    // Atualiza display quando value prop muda
    useEffect(() => {
      if (value === "" || value === "0") {
        setDisplayValue("0%");
      } else {
        // Se value já é um número, formata
        const numericValue = value.replace(/\D/g, "");
        if (numericValue) {
          setDisplayValue(formatPercentage(numericValue));
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
        const formatted = formatPercentage(updatedNumbers);
        setDisplayValue(formatted);
        onChange(updatedNumbers);
      } else if (newNumbers.length < currentNumbers.length) {
        // Se o usuário está apagando
        if (newNumbers === "") {
          setDisplayValue("0%");
          onChange("0");
        } else {
          const formatted = formatPercentage(newNumbers);
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
      if (displayValue === "0%" || displayValue === "") {
        setDisplayValue("0%");
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

PercentageInput.displayName = "PercentageInput";
