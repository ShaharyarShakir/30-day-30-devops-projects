import React, { InputHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, type = "text", ...props }, ref) => {
    return (
      <div className="flex flex-col space-y-1.5 w-full">
        {label && (
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={twMerge(
            clsx(
              "w-full px-3.5 py-2.5 bg-slate-900/60 border rounded-lg text-slate-100 placeholder-slate-500 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:bg-slate-900 focus:border-violet-500/80",
              {
                "border-slate-800": !error,
                "border-red-500/80 focus:ring-red-500/40 focus:border-red-500": error
              }
            ),
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-400 font-medium animate-pulse">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
