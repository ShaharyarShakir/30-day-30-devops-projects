import React, { HTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          "glass-card p-6 rounded-2xl glow border border-slate-800/80 w-full",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";
