import React from 'react';

interface CustomButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  className?: string;
}

export default function CustomButton({
  children,
  type = 'button',
  onClick,
  className = '',
}: CustomButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`w-full py-2 px-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${className}`}
    >
      {children}
    </button>
  );
}