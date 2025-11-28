/**
 * Premium Tooltip Component
 *
 * A flexible tooltip component with multiple positions and animations.
 * Provides contextual help and information on hover or focus.
 *
 * @example
 * <Tooltip content="This is helpful information" position="top">
 *   <button>Hover me</button>
 * </Tooltip>
 */

"use client";

import { ReactNode, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  disabled?: boolean;
  className?: string;
}

const Tooltip = ({
  content,
  children,
  position = "top",
  delay = 200,
  disabled = false,
  className,
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (disabled) return;

    timeoutRef.current = setTimeout(() => {
      setShouldRender(true);
      // Small delay to allow DOM to render before animation
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
    // Wait for animation to complete before removing from DOM
    setTimeout(() => setShouldRender(false), 200);
  };

  const positionStyles = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowStyles = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-neutral-900 dark:border-t-neutral-700",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-neutral-900 dark:border-b-neutral-700",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-neutral-900 dark:border-l-neutral-700",
    right:
      "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-neutral-900 dark:border-r-neutral-700",
  };

  const animationStyles = {
    top: isVisible ? "animate-slide-in-down" : "opacity-0",
    bottom: isVisible ? "animate-slide-in-up" : "opacity-0",
    left: isVisible ? "animate-slide-in-right" : "opacity-0",
    right: isVisible ? "animate-slide-in-left" : "opacity-0",
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}

      {shouldRender && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={cn(
            "absolute z-50 px-3 py-2 text-sm font-medium text-white bg-neutral-900 dark:bg-neutral-700 rounded-lg shadow-lg pointer-events-none whitespace-nowrap",
            positionStyles[position],
            animationStyles[position],
            className
          )}
        >
          {content}

          {/* Arrow */}
          <div
            className={cn(
              "absolute w-0 h-0 border-4",
              arrowStyles[position]
            )}
          />
        </div>
      )}
    </div>
  );
};

Tooltip.displayName = "Tooltip";

export { Tooltip };
