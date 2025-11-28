/**
 * Premium Card Component
 *
 * A polished, flexible card component with multiple variants and interactive states.
 * Perfect for displaying content in organized, elevated containers.
 *
 * @example
 * <Card variant="elevated" interactive>
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *     <CardDescription>Description</CardDescription>
 *   </CardHeader>
 *   <CardContent>Content goes here</CardContent>
 *   <CardFooter>Footer actions</CardFooter>
 * </Card>
 */

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined" | "ghost";
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "default",
      interactive = false,
      padding = "md",
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "rounded-xl transition-all duration-200 ease-in-out bg-white dark:bg-neutral-800";

    const variantStyles = {
      default: "border border-neutral-200 dark:border-neutral-700",
      elevated:
        "shadow-md hover:shadow-lg border border-neutral-100 dark:border-neutral-700",
      outlined:
        "border-2 border-neutral-300 dark:border-neutral-600 hover:border-primary-500 dark:hover:border-primary-400",
      ghost: "border-none",
    };

    const paddingStyles = {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    };

    const interactiveStyles = interactive
      ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl"
      : "";

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          paddingStyles[padding],
          interactiveStyles,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

// Card Header
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  noBorder?: boolean;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, noBorder = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col space-y-1.5",
          !noBorder && "pb-4 border-b border-neutral-200 dark:border-neutral-700",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = "CardHeader";

// Card Title
export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Component = "h3", children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          "text-2xl font-semibold text-neutral-900 dark:text-neutral-100 leading-none tracking-tight",
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

CardTitle.displayName = "CardTitle";

// Card Description
const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn(
        "text-sm text-neutral-600 dark:text-neutral-400",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
});

CardDescription.displayName = "CardDescription";

// Card Content
const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("pt-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = "CardContent";

// Card Footer
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  noBorder?: boolean;
}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, noBorder = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center",
          !noBorder && "pt-4 border-t border-neutral-200 dark:border-neutral-700",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
