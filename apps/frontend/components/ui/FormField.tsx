import React from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  type?: string;
  id: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  readOnly?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  className?: string;
  children?: React.ReactNode;
}

export default function FormField({
  label,
  type = 'text',
  id,
  name,
  placeholder,
  required = false,
  defaultValue,
  readOnly = false,
  value,
  onChange,
  className = '',
  children,
}: FormFieldProps) {
  const inputId = id || name;

  return (
    <div className={cn("mb-4", className)}>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-[var(--ops-text)]">
        {label}
      </label>
      {type === 'select' ? (
        <select
          id={inputId}
          name={name || id}
          required={required}
          defaultValue={defaultValue}
          value={value}
          onChange={onChange as React.ChangeEventHandler<HTMLSelectElement>}
          className="h-10 w-full rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ripnel-accent)]"
        >
          {children}
        </select>
      ) : (
        <input
          type={type}
          id={inputId}
          name={name || id}
          placeholder={placeholder ? `${placeholder}…` : undefined}
          required={required}
          defaultValue={defaultValue}
          readOnly={readOnly}
          value={value}
          onChange={onChange}
          className="h-10 w-full rounded-xl border border-[var(--ops-border-strong)] bg-[var(--ops-field)] px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ripnel-accent)]"
        />
      )}
    </div>
  );
}