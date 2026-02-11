import React from 'react';

export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  label?: string;
  error?: string;
}

export function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
  className = '',
  label,
  error,
}: InputProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-stone-700 mb-1">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        disabled={disabled}
        required={required}
        className={`
          w-full px-4 py-2 
          bg-white border rounded-lg 
          text-stone-900 placeholder-stone-400
          focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : 'border-stone-200'}
        `}
      />
      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
