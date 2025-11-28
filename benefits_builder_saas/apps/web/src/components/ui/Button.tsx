/**
 * Premium Button Component
 *
 * A highly polished, accessible button component with multiple variants,
 * sizes, loading states, and smooth animations.
 *
 * @example
 * <Button variant="primary" size="lg" loading={isLoading}>
 *   Save Changes
 * </Button>
 */

import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      icon,
      iconPosition = "left",
      fullWidth = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

    const variantStyles = {
      primary:
        "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm hover:shadow-md",
      secondary:
        "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus:ring-neutral-500 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700",
      outline:
        "border-2 border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus:ring-primary-500 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800",
      ghost:
        "text-neutral-700 hover:bg-neutral-100 focus:ring-neutral-500 dark:text-neutral-300 dark:hover:bg-neutral-800",
      danger:
        "bg-error-600 text-white hover:bg-error-700 focus:ring-error-500 shadow-sm hover:shadow-md",
      success:
        "bg-success-600 text-white hover:bg-success-700 focus:ring-success-500 shadow-sm hover:shadow-md",
    };

    const sizeStyles = {
      xs: "text-xs px-2.5 py-1.5 gap-1",
      sm: "text-sm px-3 py-2 gap-1.5",
      md: "text-base px-4 py-2.5 gap-2",
      lg: "text-lg px-6 py-3 gap-2.5",
      xl: "text-xl px-8 py-4 gap-3",
    };

    const widthStyles = fullWidth ? "w-full" : "";

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          widthStyles,
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
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
        {!loading && icon && iconPosition === "left" && icon}
        {children}
        {!loading && icon && iconPosition === "right" && icon}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
