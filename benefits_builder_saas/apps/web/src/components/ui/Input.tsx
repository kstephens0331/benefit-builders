/**
 * Premium Input Component
 *
 * A fully-featured input component with validation states, icons, and helper text.
 * Supports multiple variants and seamless dark mode.
 *
 * @example
 * <Input
 *   label="Email"
 *   type="email"
 *   placeholder="you@example.com"
 *   helperText="We'll never share your email"
 *   error="Invalid email format"
 * />
 */

import { InputHTMLAttributes, forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  variant?: "default" | "filled" | "outlined";
  inputSize?: "sm" | "md" | "lg";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      success,
      leftIcon,
      rightIcon,
      variant = "default",
      inputSize = "md",
      disabled,
      type = "text",
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const hasError = Boolean(error);
    const hasSuccess = Boolean(success);

    const baseStyles =
      "w-full rounded-lg transition-all duration-200 ease-in-out font-medium placeholder:text-neutral-400 dark:placeholder:text-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2";

    const variantStyles = {
      default:
        "border border-neutral-300 bg-white dark:bg-neutral-800 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100",
      filled:
        "border-none bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100",
      outlined:
        "border-2 border-neutral-300 bg-transparent dark:border-neutral-600 text-neutral-900 dark:text-neutral-100",
    };

    const sizeStyles = {
      sm: cn(
        "text-sm py-2",
        leftIcon ? "pl-9 pr-3" : rightIcon ? "pl-3 pr-9" : "px-3"
      ),
      md: cn(
        "text-base py-2.5",
        leftIcon ? "pl-10 pr-4" : rightIcon ? "pl-4 pr-10" : "px-4"
      ),
      lg: cn(
        "text-lg py-3",
        leftIcon ? "pl-12 pr-5" : rightIcon ? "pl-5 pr-12" : "px-5"
      ),
    };

    const stateStyles = hasError
      ? "border-error-500 focus:ring-error-500 dark:border-error-400 dark:focus:ring-error-400"
      : hasSuccess
      ? "border-success-500 focus:ring-success-500 dark:border-success-400 dark:focus:ring-success-400"
      : "focus:ring-primary-500 dark:focus:ring-primary-400";

    const iconSizeStyles = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6",
    };

    const iconPositionStyles = {
      left: {
        sm: "left-3",
        md: "left-3",
        lg: "left-4",
      },
      right: {
        sm: "right-3",
        md: "right-3",
        lg: "right-4",
      },
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 pointer-events-none",
                iconPositionStyles.left[inputSize]
              )}
            >
              <div className={iconSizeStyles[inputSize]}>{leftIcon}</div>
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            className={cn(
              baseStyles,
              variantStyles[variant],
              sizeStyles[inputSize],
              stateStyles,
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 pointer-events-none",
                iconPositionStyles.right[inputSize]
              )}
            >
              <div className={iconSizeStyles[inputSize]}>{rightIcon}</div>
            </div>
          )}
        </div>

        {(helperText || error || success) && (
          <p
            className={cn(
              "mt-1.5 text-sm",
              error && "text-error-600 dark:text-error-400",
              success && "text-success-600 dark:text-success-400",
              !error && !success && "text-neutral-600 dark:text-neutral-400"
            )}
          >
            {error || success || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
