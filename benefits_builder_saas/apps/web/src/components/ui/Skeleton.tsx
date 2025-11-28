/**
 * Premium Skeleton Loader Component
 *
 * Beautiful loading placeholders with shimmer animation.
 * Creates a premium feel while content is loading.
 *
 * @example
 * <Skeleton className="h-4 w-full" />
 * <Skeleton variant="circular" className="h-12 w-12" />
 * <SkeletonCard />
 * <SkeletonTable rows={5} />
 */

import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "rectangular" | "circular" | "text";
  animation?: "pulse" | "shimmer" | "none";
}

const Skeleton = ({
  className,
  variant = "rectangular",
  animation = "shimmer",
  ...props
}: SkeletonProps) => {
  const baseStyles =
    "bg-neutral-200 dark:bg-neutral-700 overflow-hidden relative";

  const variantStyles = {
    rectangular: "rounded-lg",
    circular: "rounded-full",
    text: "rounded h-4",
  };

  const animationStyles = {
    pulse: "animate-pulse",
    shimmer:
      "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
    none: "",
  };

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      {...props}
    />
  );
};

Skeleton.displayName = "Skeleton";

// Preset: Skeleton Card
export interface SkeletonCardProps {
  showImage?: boolean;
  lines?: number;
}

const SkeletonCard = ({ showImage = true, lines = 3 }: SkeletonCardProps) => {
  return (
    <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
      {showImage && <Skeleton className="h-48 w-full mb-4" />}
      <Skeleton className="h-6 w-3/4 mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full mb-2" />
      ))}
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
};

SkeletonCard.displayName = "SkeletonCard";

// Preset: Skeleton Table
export interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

const SkeletonTable = ({ rows = 5, columns = 4 }: SkeletonTableProps) => {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="grid gap-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-t-xl border border-neutral-200 dark:border-neutral-700" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>

      {/* Rows */}
      <div className="border-x border-b border-neutral-200 dark:border-neutral-700 rounded-b-xl">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4 p-4 border-t border-neutral-200 dark:border-neutral-700"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

SkeletonTable.displayName = "SkeletonTable";

// Preset: Skeleton List
export interface SkeletonListProps {
  items?: number;
  showAvatar?: boolean;
}

const SkeletonList = ({ items = 5, showAvatar = true }: SkeletonListProps) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          {showAvatar && (
            <Skeleton variant="circular" className="h-12 w-12 flex-shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

SkeletonList.displayName = "SkeletonList";

// Preset: Skeleton Form
export interface SkeletonFormProps {
  fields?: number;
}

const SkeletonForm = ({ fields = 4 }: SkeletonFormProps) => {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
};

SkeletonForm.displayName = "SkeletonForm";

// Preset: Skeleton Text Block
export interface SkeletonTextProps {
  lines?: number;
}

const SkeletonText = ({ lines = 3 }: SkeletonTextProps) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{
            width: i === lines - 1 ? "60%" : "100%",
          }}
        />
      ))}
    </div>
  );
};

SkeletonText.displayName = "SkeletonText";

export {
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonForm,
  SkeletonText,
};
