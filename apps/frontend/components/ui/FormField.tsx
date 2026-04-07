import React from 'react';

interface FormFieldProps {
  label: string;
  type: string;
  id: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  readOnly?: boolean;
  children?: React.ReactNode;
}

export default function FormField({
  label,
  type,
  id,
  placeholder,
  required = false,
  defaultValue,
  readOnly = false,
  children,
}: FormFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {type === 'select' ? (
        <select
          id={id}
          name={id}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required={required}
          defaultValue={defaultValue}
        >
          {children}
        </select>
      ) : (
        <input
          type={type}
          id={id}
          name={id}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder={placeholder}
          required={required}
          defaultValue={defaultValue}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}