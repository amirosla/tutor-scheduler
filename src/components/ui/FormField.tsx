import React from 'react';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-slate-700"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-slate-400">{hint}</p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className = '', ...props }: InputProps) {
  return (
    <input
      className={`
        w-full px-3 py-2 text-sm rounded-xl border transition-colors
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
        placeholder:text-slate-400
        ${error
          ? 'border-red-300 bg-red-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
        }
        ${className}
      `}
      {...props}
    />
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ error, className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`
        w-full px-3 py-2 text-sm rounded-xl border transition-colors resize-none
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
        placeholder:text-slate-400
        ${error
          ? 'border-red-300 bg-red-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
        }
        ${className}
      `}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function Select({ error, className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={`
        w-full px-3 py-2 text-sm rounded-xl border transition-colors
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
        bg-white cursor-pointer
        ${error
          ? 'border-red-300 bg-red-50'
          : 'border-slate-200 hover:border-slate-300'
        }
        ${className}
      `}
      {...props}
    >
      {children}
    </select>
  );
}
