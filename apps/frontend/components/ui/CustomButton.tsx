import React from 'react';
import { cn } from '@/lib/utils';

interface CustomButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export default function CustomButton({
  children,
  type = 'button',
  onClick,
  className = '',
  disabled = false,
}: CustomButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full h-10 px-4 py-2 rounded-2xl text-sm font-semibold transition-colors",
        "bg-[var(--ripnel-accent)] text-white",
        "hover:bg-[var(--ripnel-accent-hover)]",
        "focus-visible:ring-2 focus-visible:ring-[var(--ripnel-accent)] focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}