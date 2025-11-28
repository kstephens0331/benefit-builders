/**
 * Premium Badge Component
 *
 * A versatile badge component for displaying status, labels, and indicators.
 * Features smooth animations and consistent styling across variants.
 *
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning" size="lg">Pending</Badge>
 * <Badge variant="error" dot>Urgent</Badge>
 */

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "error"
    | "info";
  size?: "sm" | "md" | "lg";
  dot?: boolean;
  outline?: boolean;
  rounded?: boolean;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      dot = false,
      outline = false,
      rounded = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center font-medium transition-all duration-200 ease-in-out";

    const variantStyles = {
      default: outline
        ? "border border-neutral-300 text-neutral-700 dark:border-neutral-600 dark:text-neutral-300"
        : "bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200",
      primary: outline
        ? "border border-primary-500 text-primary-700 dark:text-primary-400"
        : "bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300",
      secondary: outline
        ? "border border-accent-500 text-accent-700 dark:text-accent-400"
        : "bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-300",
      success: outline
        ? "border border-success-500 text-success-700 dark:text-success-400"
        : "bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300",
      warning: outline
        ? "border border-warning-500 text-warning-700 dark:text-warning-400"
        : "bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300",
      error: outline
        ? "border border-error-500 text-error-700 dark:text-error-400"
        : "bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-300",
      info: outline
        ? "border border-blue-500 text-blue-700 dark:text-blue-400"
        : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    };

    const sizeStyles = {
      sm: "text-xs px-2 py-0.5 gap-1",
      md: "text-sm px-2.5 py-1 gap-1.5",
      lg: "text-base px-3 py-1.5 gap-2",
    };

    const shapeStyles = rounded ? "rounded-full" : "rounded-md";

    const dotColors = {
      default: "bg-neutral-400",
      primary: "bg-primary-500",
      secondary: "bg-accent-500",
      success: "bg-success-500",
      warning: "bg-warning-500",
      error: "bg-error-500",
      info: "bg-blue-500",
    };

    return (
      <span
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          shapeStyles,
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              "inline-block rounded-full animate-pulse",
              size === "sm" && "w-1.5 h-1.5",
              size === "md" && "w-2 h-2",
              size === "lg" && "w-2.5 h-2.5",
              dotColors[variant]
            )}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
