import React, { ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", isLoading, children, disabled, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(
          clsx(
            "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
            {
              // Variants
              "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-500/10 active:scale-[0.98]":
                variant === "primary",
              "bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700/50":
                variant === "secondary",
              "bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-500/10":
                variant === "danger",
              "hover:bg-slate-800/50 text-slate-300 hover:text-white": variant === "ghost",
              "border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white":
                variant === "outline",
              // Sizes
              "px-3 py-1.5 text-xs": size === "sm",
              "px-4 py-2 text-sm": size === "md",
              "px-6 py-3 text-base": size === "lg"
            },
            className
          )
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
